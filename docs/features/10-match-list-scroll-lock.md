# Feature 10 — Match Schedule scroll lock

Status: **built** (`feat/match-list-scroll-lock`). Size: S.

## What & why

`rMl()` re-renders the match list on every 15 s and 30 s poll and ended with an
unconditional re-centre on the current match:

```js
el.innerHTML = html;
if(scrollId){ requestAnimationFrame(()=>{
  document.getElementById(scrollId)?.scrollIntoView({behavior:'smooth',block:'center'});
}); }
```

So scrolling the list to look at another match was futile — the next poll dragged you
back, within 15 seconds, every time.

Now: following the current match stays the default, but once you scroll it out of view
the list **holds position**. It re-arms when you scroll the current match back into view,
and a **⇩ Current** button in the panel header jumps straight back to it.

## What the implementation had to account for

- **`#panel-m` is the scroll container, not `#ml`.** `#ml` has `overflow-y:auto` in CSS
  but nothing constrains its height, so it never scrolls — at runtime `#panel-m` was
  `scrollHeight 8570 / clientHeight 140` while `#ml` was 8507/8507. The listener, the
  position save/restore, and the visibility maths all target `#panel-m`.
- **`.panel-m` sets `scroll-behavior:smooth`**, so a plain `scrollTop = n` *animates* and
  reading it straight back returns the old value. Restores use
  `scrollTo({top, behavior:'instant'})`.
- **The header row lives inside the scroll container**, so it scrolled away with the list.
  `#panel-m` is what scrolls, so the only way to pin something inside it is
  `position:sticky`. A first pass made the whole header sticky, but a full-width bar
  sliding over the rows is distracting — and the "Match Schedule" title wasn't earning
  its space. The title is now **removed** and `#panel-m-hdr` is a **zero-height sticky
  strip** (`height:0; pointer-events:none; overflow:visible`) that lets just the button
  overhang and collapses to nothing whenever the button is hidden.
  `toggleBracket()`'s `pTitle` references went with the title.
- **Replacing `#ml.innerHTML` does not itself reset `scrollTop`** — verified 2000 → 2000
  across a render. The jump was entirely the `scrollIntoView`. The explicit restore is
  kept anyway as a cheap guard for when the list shrinks and the browser clamps.

## Design

`mlFollow` is a single boolean, defaulting to **true**.

It deliberately isn't pure geometry. On first paint the current match is often row 30 of
48 in an unscrolled list — "not visible" — which would read as *scrolled away* and
suppress the initial centring. So it starts `true` and is re-evaluated only on user
scroll:

- `scroll` on `#panel-m`, debounced 120 ms → `mlFollow = currentMatchVisible()`
- programmatic scrolls emit scroll events too, and mid-animation the row isn't visible
  yet — which would flip the flag and flicker the button. `mlSuppressUntil`
  (`Date.now()+600`, covering the smooth-scroll animation) makes the handler ignore
  scrolls it caused itself.

`currentMatchVisible()` compares `getBoundingClientRect()` of the target row and the
panel — viewport space, so it's correct regardless of `offsetParent`.

The jump target is the existing `scrollId` that `rMl()` already computes (the active
match, falling back to our first unplayed match), remembered between renders as
`mlScrollId` so the scroll handler can test it.

The button is hidden unless there's a target, we're not following, and we're not in
bracket view — `toggleBracket()` hides `#panel-m-title` but *not* its wrapper, so the
button would otherwise survive into bracket mode; `toggleBracket()` now calls
`updateMlJumpBtn()` on both transitions.

## Verification

Driven through a 48-row mid-event state. Every transition asserted:

| Step | scroll | follow | button | current visible |
|---|---|---|---|---|
| current match centred | 2906 | true | hidden | true |
| scrolled away | 205 | false | **shown** | false |
| poll while away | **205 (held)** | false | shown | false |
| scrolled back | 2906 | **true** | hidden | true |
| poll while following | 2906 | true | hidden | true |

Plus: the jump button restores follow and arms suppression; bracket view hides the button
and exiting restores it; an event with no active match (`mlScrollId` null) never shows it.
Confirmed visually that the sticky header and button stay pinned mid-scroll.

**Not verified in-harness:** the rAF + smooth-scroll delivery itself. The Browser pane
doesn't render, so `requestAnimationFrame` never fires and native scroll events aren't
dispatched. The targeting logic was proven instead with an instant `scrollIntoView`
(landed exactly on the row, `visible: true`). This is unchanged from the original code,
which used the same rAF + smooth pattern.

## Follow-ups

- `rRank()` centres the Rankings panel on our own team the same way
  (`panel.scrollTop = rowTop - panelH/2 + …`) and has the identical annoyance. Not
  addressed here.
