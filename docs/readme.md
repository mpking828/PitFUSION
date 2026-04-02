
# PitFusion

A simple selfhosted html file that Fuses together Nexus and TheBlueAlliance into a usable Pit Display for FRC teams.




## Acknowledgements

 - [Nexus](hhttps://frc.nexus/)
 - [The Blue Alliance ](https://thebluealliance.com/)
 - [ Pulse - Pit Display](https://pulsefrc.app/)



## Features

- Livestream display (Dropdown shows all available Livestreams)
- Queuing Status
- Queue Now Warning with countdown till next match
- Bumper Color reminder
- Current event rankings
- Current event Team Statistics
- Nexus announcements and Parts requests
- Match Schedule
- Playoff Bracket display mode


## Deployment

Obtain the nessacary API keys:
 - [Nexus API page](https://frc.nexus/api)
 - [The Blue Alliance API Docs](https://www.thebluealliance.com/apidocs)

Edit the .html file, and update the following section with your team number, the event code, your Nexus API Key, and your TBA API Key.
```bash
// ============================================================
// CONFIGURE HERE
// ============================================================
const TEAM_NUMBER = '88';
const EVENT_KEY   = '026mabos';  //Format 2026mabos
const NEXUS_KEY   = 'YOUR_NEXUS_KEY';
const TBA_KEY     = 'YOUR_TBA_KEY';
// ============================================================
```


## Screenshots

![App Screenshot](https://dummyimage.com/468x300?text=App+Screenshot+Here)
![Alt text](/relative/path/to/img.jpg?raw=true "Optional Title")

