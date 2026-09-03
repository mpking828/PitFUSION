import { proxy, onRequestOptions } from '../_proxy.js';

export { onRequestOptions };

// Only used for videos.list (liveStreamingDetails) — 1 quota unit/call.
export const onRequestGet = (context) =>
  proxy(context, {
    upstream: 'https://www.googleapis.com/youtube/v3',
    query: { key: context.env.YOUTUBE_API_KEY },
    cacheSeconds: 60,
  });
