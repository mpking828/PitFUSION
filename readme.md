
# PitFusion

A simple selfhosted html file that Fuses together Nexus and TheBlueAlliance into a usable Pit Display for FRC teams.




## Acknowledgements

 - [Nexus](hhttps://frc.nexus/)
 - [The Blue Alliance ](https://thebluealliance.com/)
 - [ Pulse - Pit Display](https://pulsefrc.app/)
 - [Team 88 TJ²](https://www.tj2.org/)



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
- Logo support — automatically tries to load logo.png, logo.jpg, logo.jpeg, logo.svg, or logo.webp from the same directory as the HTML file. If found, it appears above the PitFusion wordmark


## Deployment

### One time setup
#### Edit PitFusion.html file
Obtain the nessacary API keys:
 - [Nexus API page](https://frc.nexus/api)
 - [The Blue Alliance API Docs](https://www.thebluealliance.com/apidocs)

Edit the PitFusion.html file, and update the following section with your Nexus API Key and your TBA API Key.  This section is about 1/3 of the way down the file.
```bash
// ============================================================
// CONFIGURE HERE
// ============================================================
const NEXUS_KEY   = 'YOUR_NEXUS_KEY';
const TBA_KEY     = 'YOUR_TBA_KEY';
// ============================================================
```
#### Install Python
To install Python on Windows
- Download the installer from Python.org https://www.python.org/downloads/
- Run the installer accepting the defaults.
> [!NOTE]
> The Microsoft Store version now provides Python Manager, so you can use that instead.  Just type python from a windows command prompt, and it will prompt you to install it.

### Add a logo
Logo support — automatically tries to load logo.png, logo.jpg, logo.jpeg, logo.svg, or logo.webp from the same directory as the HTML file. If found, it appears above the PitFusion wordmark

## Launching 
  1. Launch a windows command prompt
  2. Navigate to the folder where you have the PitFusion.html file.
  3. Run the following command:
  ```bash
python -m http.server 8080
```
This will start a python HTTP server on port 8080 and serve any file in that directory.  You may be prompted by Windows to allow it access to the network.

4. Launch a webbrowser and navigate to http://localhost:8080/PitFusion.html

> [!NOTE]
> After the file has been launched in a webbrowser, you no longer need to keep the python webserver running.  However it's probably best to keep it running if you reload the webpage.
## Screenshots

![Main Screen](docs/MainScreen1.png?raw=true)
![Bracket View](docs/BracketView1.png?raw=true)
![Team View](docs/TeamView1.png?raw=true)
![Alerts View](docs/AlertsView1.png?raw=true)

