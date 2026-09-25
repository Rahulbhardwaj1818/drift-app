# Drift weather app

Drift is a responsive, single-page weather dashboard with:

Built by Rahul Kumar.

- Live current conditions and a 7-day forecast
- City, airport, and country search via Open-Meteo geocoding
- Current-location lookup via the browser Geolocation API
- Celsius/Fahrenheit switching
- Light/dark theme toggle
- Interactive radar map with recent-frame timeline and playback
- Satellite imagery layer with recenter control
- Animated cloud atmosphere above the dashboard
- Location-aware weather headlines with refresh and source links
- Installable PWA for Android and desktop browsers
- Hourly precipitation, sunrise/sunset, UV, wind, humidity, pressure, and visibility
- Loading, empty-result, and network-error states
- Last searched location stored in local storage

## Run locally

Serve this folder from any static web server. For example:

```powershell
py -m http.server 4173 --directory .
```

Then open `http://127.0.0.1:4173/`.

## Install on Android or PC

Open the live app in Chrome or Edge, then use the browser menu and choose **Install app** or **Add to Home screen**. The app includes a manifest and service worker, so it opens like a standalone app and keeps the interface shell available offline. It is a PWA, not yet a Play Store APK.

The app calls the public Open-Meteo forecast/geocoding endpoints and RainViewer radar endpoint directly from the browser. The Vercel function at `/api/news` reads GDELT DOC article search with a Google News RSS fallback, keeping news requests same-origin and keyless. Map imagery is provided by Leaflet, OpenStreetMap/CARTO, and Esri World Imagery.
