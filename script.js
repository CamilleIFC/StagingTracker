
document.addEventListener('DOMContentLoaded', function () {
    var maxBounds = [
        [-90, -195],
        [90, 195]
    ];
    var mymap = L.map('map', {
        center: [10, -0],
        zoom: 1.5,
        noWrap: false,
        maxBounds: maxBounds,
        maxBoundsViscosity: 0.85,
        minZoom: 1.5
    });

    const osmLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors',
        noWrap: false
    }).addTo(mymap);


    var apiKeyweather = '55915385cd68325e3e3b68dcd1fd80f7';


    function createLayer(layerType) {
        return L.tileLayer(`https://tile.openweathermap.org/map/${layerType}/{z}/{x}/{y}.png?appid=${apiKeyweather}`, {
            opacity: 1,
            maxZoom: 19,
        });
    }

    var currentLayer = createLayer('none');
    currentLayer.addTo(mymap);

    document.getElementById('layerSelect').addEventListener('change', function(e) {
        var selectedLayer = e.target.value;
        if (currentLayer) {
            mymap.removeLayer(currentLayer);
        }
        currentLayer = createLayer(selectedLayer);
        currentLayer.addTo(mymap);
    });

    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    const buttonImage = document.getElementById("changeMapBtn");
    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
    }).addTo(mymap);

    let flightMarkers = [];
    let routePolyline;
    let segmentPolyline;

    async function onMarkerClick(e) {
        const flightId = e.target.flightId;
        removeExistingPolyline();
        removeExistingFlightPlan();
        removeFlightInfoInTextSection();
        const flightInfo = await fetchFlightInfo(flightId);
        if (flightInfo) {
            showFlightInfoInTextSection(flightInfo);
            const route = await fetchFlightRoute(flightId);
            if (route) {
                displayRoutePolyline(route, e.latlng);
            }
        }
        console.log("Flight ID clicked:", e.target.flightId);
    }

    
    async function removeExistingPolyline() {
        if (routePolyline) {
            mymap.removeLayer(routePolyline);
            routePolyline = null;
        }
        if (segmentPolyline) {
            mymap.removeLayer(segmentPolyline);
            segmentPolyline = null;
        }
    }

    async function removeExistingFlightPlan() {
        if (flightPlanPolyline) {
            mymap.removeLayer(flightPlanPolyline);
            routePolyline = null;
        }
    }

    function removeFlightInfoInTextSection() {
        const textSection = document.getElementById('text-section');
        textSection.innerHTML = '';
    }

    

    async function fetchFlightInfo(flightId) {
        const apiKey = '16g9z0yzub3dszefdibss5455tytdhkr';
        const sessionId = 'd2666fb6-c7c9-443a-905a-d0a8876214b3';
        const flightApiUrl = `https://api.infiniteflight.com/public/v2/sessions/${sessionId}/flights/${flightId}?apikey=${apiKey}`;
    
        try {
            const response = await fetch(flightApiUrl);
            const data = await response.json();
    
            if (data.errorCode === 0) {
                return data.result;
            } else {
                console.error('Error fetching flight info:', data);
                return null;
            }
        } catch (error) {
            console.error('Error fetching flight info:', error);
            return null;
        }
    }

    async function fetchFlightRoute(flightId) {
        const apiKey = '16g9z0yzub3dszefdibss5455tytdhkr';
        const sessionId = 'd2666fb6-c7c9-443a-905a-d0a8876214b3';
        const routeApiUrl = `https://api.infiniteflight.com/public/v2/sessions/${sessionId}/flights/${flightId}/route?apikey=${apiKey}`;
    
        try {
            const response = await fetch(routeApiUrl);
            const data = await response.json();
    
            if (data.errorCode === 0) {
                return data.result;
            } else {
                console.error('Error fetching flight route:', data);
                return null;
            }
        } catch (error) {
            console.error('Error fetching flight route:', error);
            return null;
        }
    }

    async function fetchFlightPlan(flightId) {
        const apiKey = '16g9z0yzub3dszefdibss5455tytdhkr';
        const sessionId = 'd2666fb6-c7c9-443a-905a-d0a8876214b3';
        const flightPlanApiURL = `https://api.infiniteflight.com/public/v2/sessions/${sessionId}/flights/${flightId}/flightplan?apikey=${apiKey}`;
    
        try {
            const response = await fetch(flightPlanApiURL, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            const data = await response.json();
    
            if (data.errorCode === 0) {
                return data.result;
            } else {
                console.error('Error Fetching Flight Plan, Sorry...', data);
                return null;
            }
        } catch (error) {
            console.error('Error fetching flight plan:', error);
            return null;
        }
    }

    let flightPlanPolyline;

    function displayFlightPlanPolyline(flightPlan) {
        if (!flightPlan || !flightPlan.flightPlanItems) return;
    
        const coordinates = flightPlan.flightPlanItems
            .map(item => [item.location.latitude, item.location.longitude])
            .filter(coord => coord[0] !== 0 && coord[1] !== 0); // Ignore invalid coordinates
    
        if (flightPlanPolyline) {
            mymap.removeLayer(flightPlanPolyline);
        }
    
        flightPlanPolyline = L.polyline(coordinates, {
            color: 'red',
            dashArray: '5, 10',
            weight: 2,
            opacity: 0.7
        }).addTo(mymap);
    
        mymap.fitBounds(flightPlanPolyline.getBounds()); // Adjust map view to fit polyline
    }
    
    

    async function showFlightInfoInTextSection(flightInfo) {
        const { username, callsign, altitude, speed, aircraftId, flightId } = flightInfo;
        const roundedAltitude = Math.round(altitude);
        const roundedSpeed = Math.round(speed);
        const aircraftType = aircraftTypes[aircraftId] || "IDK, it's broken";
    
        const textSection = document.getElementById('text-section');
    
        let flightStatus = '';
        let flightStatusColor = '';
        if (speed < 40) {
            if (altitude > 7000) {
                flightStatus = 'Paused';
                flightStatusColor = 'orange';
            } else {
                flightStatus = 'On Ground';
                flightStatusColor = 'red';
            }
        } else {
            flightStatus = 'In Flight';
            flightStatusColor = 'hsl(120, 100%, 50%)';
        }
        const flightPlan = await fetchFlightPlan(flightId);
        let waypointsInfo = '<p><b>Route:</b> ';
        if (flightPlan && flightPlan.result && flightPlan.result.waypoints) {
            if (flightPlan.result.waypoints.length > 1) {
                waypointsInfo += `<span style="color: orange;">${flightPlan.result.waypoints[0]} → ${flightPlan.result.waypoints[flightPlan.result.waypoints.length - 1]}</span></p>`;
                displayFlightPlanPolyline(flightPlan.result); 
            } else {
                waypointsInfo += `<span style="color: orange;">${flightPlan.result.waypoints[0]}</span></p>`;
            }
        } else {
            waypointsInfo += 'No flight plan available.</p>';
        }
    
        const flightInfoContent = `
            <h2>Flight Information</h2>
            <p><b>Username:   </b> ${username || 'No Username :('}</p>
            <p><b>Callsign:   </b> ${callsign}</p>
            <p><b>Aircraft Type:   </b> ${aircraftType}</p>
            <p><b>Altitude:   </b> <span>${roundedAltitude} feet</span></p>
            <p><b>Speed:   </b> ${roundedSpeed} knots</p>
            <p><b>Flight Status:   </b> <span style="color: ${flightStatusColor};">${flightStatus}</span></p>
            ${waypointsInfo}
        `;
    
        textSection.innerHTML = flightInfoContent;
    
        const downloadGPXButton = document.createElement('button');
        downloadGPXButton.textContent = 'Download GPX';
        downloadGPXButton.classList.add('btnStyle');
        downloadGPXButton.addEventListener('click', () => {
            downloadGPX(flightInfo);
        });
        textSection.appendChild(downloadGPXButton);
    
        const downloadKMLButton = document.createElement('button');
        downloadKMLButton.textContent = 'Download KML';
        downloadKMLButton.classList.add('btnStyle');
        downloadKMLButton.addEventListener('click', () => {
            downloadKML(flightInfo);
        });
        textSection.appendChild(downloadKMLButton);
    }
    
    
    
    

    async function downloadGPX(flightInfo) {
        const flightId = flightInfo.flightId;
        const route = await fetchFlightRoute(flightId);
        if (route) {
            const gpxData = generateGPX(route);
            const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
            const link = document.createElement('a');
            const shortenedLastReport = flightInfo.lastReport.slice(0, 10);
            link.href = window.URL.createObjectURL(blob);
            link.download = flightInfo.username + '_' + shortenedLastReport + '.gpx';
            link.click();
        } else {
            console.error('Error downloading GPX: Route data is missing.');
        }
    }
    
    function generateGPX(route, username, date) {
        let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1" creator="Your Application Name" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
      <metadata>
        <name>${username} - ${date}</name>
        <desc>Flight Route GPX</desc>
      </metadata>
      <trk>
        <name>${username} - ${date}</name>
        <desc>Flight Route GPX</desc>
        <trkseg>
    `;
        route.forEach(point => {
            gpxContent += `      <trkpt lat="${point.latitude}" lon="${point.longitude}">
            <ele>${point.altitude}/3.2808</ele>
            <time>${point.date}</time>
          </trkpt>
    `;
        });
        gpxContent += `    </trkseg>
      </trk>
    </gpx>`;
        return gpxContent;
    }


    async function downloadKML(flightInfo) {
        const flightId = flightInfo.flightId;
        const route = await fetchFlightRoute(flightId);
        if (route) {
            const currentDate = new Date().toISOString();
            const kmlData = generateKML(route, flightInfo.username, currentDate);
            const blob = new Blob([kmlData], { type: 'application/vnd.google-earth.kml+xml' });
            const link = document.createElement('a');
            const shortenedLastReport = flightInfo.lastReport.slice(0, 10);
            link.href = window.URL.createObjectURL(blob);
            link.download = flightInfo.username + '_' + shortenedLastReport + '.kml';
            link.click();
        } else {
            console.error('Error downloading KML: Route data is missing.');
        }
    }
    
    

    function generateKML(route, username, date) {
        let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://www.opengis.net/kml/2.2">
          <Document>
            <name>${username} - ${date}</name>
            <description>Flight Route KML</description>
            <Style id="line-ffa500-240-nodesc-normal">
              <LineStyle>
                <color>ff00a5ff</color>
                <width>2</width>
              </LineStyle>
            </Style>
            <Placemark>
              <styleUrl>#line-ffa500-240-nodesc-normal</styleUrl>
              <LineString>
                <extrude>1</extrude>
                <tessellate>1</tessellate>
                <altitudeMode>absolute</altitudeMode>
                <coordinates>
        `;
        route.forEach(point => {
            kmlContent += `          ${point.longitude},${point.latitude},${point.altitude}/3.2808\n`;
        });
        kmlContent += `        </coordinates>
              </LineString>
            </Placemark>
          </Document>
        </kml>`;
        return kmlContent;
    }
    

    
    function displayRoutePolyline(route, clickedMarkerLatLng) {
        if (!route || route.length === 0) return;
    
        const coordinates = route.map(point => [point.latitude, point.longitude]);
    
        if (routePolyline) {
            mymap.removeLayer(routePolyline);
        }
    
        routePolyline = L.polyline(coordinates, {
            color: 'white',
            weight: 3,
            opacity: 0.8,
            smoothFactor: 1
        }).addTo(mymap);
    
        // Ensure the last point is properly aligned with the clicked marker
        if (clickedMarkerLatLng) {
            routePolyline.addLatLng(clickedMarkerLatLng);
        }
    
        mymap.fitBounds(routePolyline.getBounds()); // Adjust view to fit the polyline
    }
    
    
    async function showFlightInfoInTextSection(flightInfo) {
        const { username, callsign, altitude, speed, aircraftId, flightId } = flightInfo;
        const roundedAltitude = Math.round(altitude);
        const roundedSpeed = Math.round(speed);
        const aircraftType = aircraftTypes[aircraftId] || 'Unknownn';
    
        const textSection = document.getElementById('text-section');
    
        let flightStatus = '';
        let flightStatusColor = '';
        if (speed < 40) {
            if (altitude > 7000) {
                flightStatus = 'Paused';
                flightStatusColor = 'orange'; // Choose a color to represent "Paused"
            } else {
                flightStatus = 'On Ground';
                flightStatusColor = 'red';
            }
        } else {
            flightStatus = 'In Flight';
            flightStatusColor = 'hsl(0, 0.00%, 100.00%)';
        }
    
        const flightPlan = await fetchFlightPlan(flightId);
        let waypointsInfo = '<p><b>Route:</b> ';
        if (flightPlan && flightPlan.waypoints) {
            if (flightPlan.waypoints.length > 1) {
                waypointsInfo += `<span style="color: pink;">${flightPlan.waypoints[0]} → ${flightPlan.waypoints[flightPlan.waypoints.length - 1]}</span></p>`;
                displayFlightPlanPolyline(flightPlan); 
            } else {
                waypointsInfo += `<span style="color: pink;">${flightPlan.waypoints[0]}</span></p>`;
            }
        } else {
            waypointsInfo += 'No flight plan available.</p>';
        }
    
        const flightInfoContent = `
            <h2>Flight Information</h2>
            <p><b>Username:   </b> ${username || 'No Username :('}</p>
            <p><b>Callsign:   </b> ${callsign}</p>
            <p><b>Aircraft Type:   </b> ${aircraftType}</p>
            <p><b>Altitude:   </b> <span>${roundedAltitude} feet</span></p>
            <p><b>Speed:   </b> ${roundedSpeed} knots</p>
            <p><b>Flight Status:   </b> <span style="color: ${flightStatusColor};">${flightStatus}</span></p>
            ${waypointsInfo}
        `;
    
        textSection.innerHTML = flightInfoContent;
    
        const downloadGPXButton = document.createElement('button');
        downloadGPXButton.textContent = 'Download GPX';
        downloadGPXButton.classList.add('btnStyle');
        downloadGPXButton.addEventListener('click', () => {
            downloadGPX(flightInfo);
        });
        textSection.appendChild(downloadGPXButton);
    
        const downloadKMLButton = document.createElement('button');
        downloadKMLButton.textContent = 'Download KML';
        downloadKMLButton.classList.add('btnStyle');
        downloadKMLButton.addEventListener('click', () => {
            downloadKML(flightInfo);
        });
        textSection.appendChild(downloadKMLButton);
    }
    
    
    



    
    function getMarkerIconUrl(flightInfo) {
        console.log("Flight Username:", flightInfo.username);
        const currentMapStyle = getCurrentMapStyle();
        const { username } = flightInfo;
        const planeType = flightInfo.aircraftId;
    
        if (planeType === '206884f9-38a8-4118-a920-a7dcbd166c47') {
            console.log("Using C172.png for specific aircraft ID");
            return "static/C172.png";
        } else if (planeType === 'f11ed126-bce8-46ef-9265-69191c354575') {
            console.log("Using A380.png for specific aircraft ID");
            return "static/A380.png";
        } else if (planeType === 'ef677903-f8d3-414f-a190-233b2b855d46') {
            console.log("Using C172.png for specific aircraft ID");
            return "static/C172.png";
        } else if (planeType === 'c82da702-ea61-4399-921c-34f35f3ca5c4' || planeType === 'de510d3d-04f8-46e0-8d65-55b888f33129' || planeType === '9759c19f-8f18-40f5-80d1-03a272f98a3b') {
            console.log("Using 747.png for specific aircraft ID");
            return "static/747.png";
        } else if (planeType === '0a3edb21-d515-4619-8392-aef51b952ac9') {
            console.log("Using F18.png for specific aircraft ID");
            return "static/F18.png";
        } else if (planeType === '7bd8096f-8eae-47b9-8e1a-38dabd2c59c4') {
            console.log("Using F16.png for specific aircraft ID");
            return "static/F16.png";
        } else if (planeType === 'bec63a00-a483-4427-a076-0f76dba0ee97' || '8290107b-d728-4fc3-b36e-0224c1780bac' || 'e258f6d4-4503-4dde-b25c-1fb9067061e2' || '6925c030-a868-49cc-adc8-7025537c51ca') {
            console.log("Using 777.png for specific aircraft ID");
            return "static/777.png";
        } else if (planeType === '982dd974-5be7-4369-90c6-bd92863632ba' || '2c2f162e-a7d9-4ebd-baf4-859aed36165a' || 'a266b67f-03e3-4f8c-a2bb-b57cfd4b12f3' || 'd7434d84-555a-4d9b-93a7-53c77cf846ea') {
            console.log("Using A320.png for specific aircraft ID");
            return "static/A320.png";
        } else if (planeType === '8a62f1d0-bca9-494c-bc01-1fb8b7255f76') {
            console.log("Using Spitfire.png for specific aircraft ID");
            return "static/Spitfire.png";
        } else {
            console.log("Using plane.png");
            return "static/plane.png";
        }
    }
    


    function getCurrentMapStyle() {
        if (mymap.hasLayer(osmLayer)) {
            return 'osm';
        } else if (mymap.hasLayer(satelliteLayer)) {
            return 'satellite';
        } else if (mymap.hasLayer(darkLayer)) {
            return 'dark';
        }
        return 'osm';
    }

    function zoomToLocation(e) {
        const latlng = e.geocode.center;
        mymap.flyTo(latlng, 14, {
            animate: true,
            duration: 1,
        });

        removeExistingPolyline();
        removeExistingFlightPlan();
        removeFlightInfoInTextSection();
    }

    function createFlightMarker(flight) {
        const { latitude, longitude, track, username, callsign, altitude, speed } = flight;
        let iconSize = [40, 40]; 
        const iconUrl = getMarkerIconUrl(flight); // Get the default icon based on aircraft type
    
        // Determine flight status
        let flightStatus = '';
        if (speed < 40) {
            if (altitude > 7000) {
                flightStatus = 'Paused';
            } else {
                flightStatus = 'On Ground';
            }
        } else {
            flightStatus = 'In Flight';
        }
    
        // If the flight is paused, change the icon to circle.png
        const markerIconUrl = flightStatus === 'Paused' ? "static/circle.png" : iconUrl;
    
        // Adjust icon size based on specific aircraft IDs if necessary
        if (flight.aircraftId === 'ef677903-f8d3-414f-a190-233b2b855d46') {
            iconSize = [28, 26];
        } else if (flight.aircraftId === 'e258f6d4-4503-4dde-b25c-1fb9067061e2') {
            iconSize = [33, 40];
        } else if (flight.aircraftId === '0a3edb21-d515-4619-8392-aef51b952ac9' || '7bd8096f-8eae-47b9-8e1a-38dabd2c59c4') {
            iconSize = [30, 34];
        }
    
        const marker = L.marker([latitude, longitude], {
            icon: L.divIcon({
                className: 'custom-marker',
                iconSize: iconSize,
                iconAnchor: [15, 15],
                html: `<img src="${markerIconUrl}" style="width: 100%; height: 100%; transform: rotate(${track}deg);">`
            }),
        }).on('click', onMarkerClick);
    
        marker.flightId = flight.flightId;
        marker.flightInfo = { username, callsign, altitude, speed, track, aircraftId: flight.aircraftId };
        marker.addTo(mymap);
        flightMarkers.push(marker);
    }
    
    

    function addFlightMarkers(flights) {
        const openPopup = mymap._popup;

        flightMarkers.forEach(marker => marker.remove());
        flightMarkers = [];

        flights.forEach(flight => {
            createFlightMarker(flight);
        });

        if (openPopup) {
            openPopup.openOn(mymap);
        }
    }

    async function fetchFlights() {
        const apiKey = '16g9z0yzub3dszefdibss5455tytdhkr';
        const sessionId = 'd2666fb6-c7c9-443a-905a-d0a8876214b3';
        const apiUrl = `https://api.infiniteflight.com/public/v2/sessions/${sessionId}/flights?apikey=${apiKey}`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            const flights = data.result;
            addFlightMarkers(flights);
        } catch (error) {
            console.error('Error fetching flights:', error);
        }
    }

    function clearRouteOnMapClick() {
        removeExistingPolyline();
        removeExistingFlightPlan();
        removeFlightInfoInTextSection();
    }

    setInterval(fetchFlights, 5000);

    geocoder.on('markgeocode', zoomToLocation);

    mymap.on('click', clearRouteOnMapClick);

    fetchFlights();
});











const aircraftTypes = {
    '81d9ccd4-9c03-493a-811e-8fad3e57bd05': 'A-10',
    '876b428a-3ee2-46cd-9d8c-2c59424dfcb5': 'AC-130',
    '710c84ae-6fdc-4c4a-ac3b-4031c3036e98': 'Airbus A220-300',
    '982dd974-5be7-4369-90c6-bd92863632ba': 'Airbus A318',
    '2c2f162e-a7d9-4ebd-baf4-859aed36165a': 'Airbus A319',
    'a266b67f-03e3-4f8c-a2bb-b57cfd4b12f3': 'Airbus A320',
    'd7434d84-555a-4d9b-93a7-53c77cf846ea': 'Airbus A321',
    'f580ad00-b7c7-4813-9dbc-c4a8c655cc46': 'Airbus A330-200F',
    '6af2c9f8-abd8-4872-a9bc-4e79fd84fe77': 'Airbus A330-300',
    '474810ee-503c-44f2-a305-c176ec8cc431': 'Airbus A330-900',
    '8b00fd70-d825-4c30-a52e-3a27a3a1a157': 'Airbus A340-600',
    '230ec095-5e36-4637-ba2f-68831b31e891': 'Airbus A350',
    'f11ed126-bce8-46ef-9265-69191c354575': 'Airbus A380',
    '341820c8-ed7e-4824-9f53-f7489231fe26': 'Boeing 717-200',
    '37a10f45-248b-43c5-b2c3-d168fdb5004d': 'Boeing 737 MAX8',
    '2ec6f8cd-fdb9-464f-87c2-808f778fdb1d': 'Boeing 737-700',
    'f60a537d-5f83-4b68-8f66-b5f76d1e1775': 'Boeing 737-800',
    '64568366-b72c-47bd-8bf6-6fdb81b683f9': 'Boeing 737-900',
    'c82da702-ea61-4399-921c-34f35f3ca5c4': 'Boeing 747-200',
    'de510d3d-04f8-46e0-8d65-55b888f33129': 'Boeing 747-400',
    '9759c19f-8f18-40f5-80d1-03a272f98a3b': 'Boeing 747-8',
    'e94ec915-3368-4bcc-bc78-2c5ad3cfbabb': 'Boeing 747-AF1',
    '0d49ce9e-446a-4d12-b651-6983afdeeb40': 'Boeing 747-SCA',
    '3ee45d20-1984-4d95-a753-3696e35cdf77': 'Boeing 747-SOFIA',
    'ed29f26b-774e-471e-a23a-ecb9b6f5da74': 'Boeing 757-200',
    '3828d120-d5b9-475b-b368-a94aad264b07': 'Boeing 767-300',
    'bec63a00-a483-4427-a076-0f76dba0ee97': 'Boeing 777-200ER',
    '8290107b-d728-4fc3-b36e-0224c1780bac': 'Boeing 777-200LR',
    'e258f6d4-4503-4dde-b25c-1fb9067061e2': 'Boeing 777-300ER',
    '6925c030-a868-49cc-adc8-7025537c51ca': 'Boeing 777F',
    '61084cae-8aac-4da4-a7df-396ec6d9c870': 'Boeing 787-10',
    'c1ae3647-f56a-4dc4-9007-cc8b1a2697a5': 'Boeing 787-8',
    '0c039044-1a57-48db-99c1-7570a6bf2b00': 'Boeing 787-9',
    '3098345e-1152-4441-96ec-40a71179a24f': 'Bombardier Dash 8-Q400',
    '7b6e1658-42ab-4fc3-81ec-706445346d46': 'C-130H',
    '33d26fc7-ae7d-4c5d-9e0d-d6cba93d4913': 'C-130J',
    'e0e1900e-0e63-4700-b508-5e2efe120ce5': 'C-130J-30',
    '2b1249c8-11d8-4fa6-9aae-a99eff451225': 'C-17',
    'ef677903-f8d3-414f-a190-233b2b855d46': 'Cessna 172',
    '206884f9-38a8-4118-a920-a7dcbd166c47': 'Cessna 208',
    '8e316ed6-9296-472a-93f8-4b6ab74b9121': 'Challenger 350',
    'e92bc6db-a9e6-4137-a93c-a7423715b799': 'Cirrus SR22 GTS',
    'b3907f6b-c8cf-427b-94fb-1f9365d990df': 'CRJ-1000',
    '24364e52-3788-487f-9f98-00f38b1f459c': 'CRJ-200',
    '8f34680a-a4ad-4f21-91e9-3a932ab03ca4': 'CRJ-700',
    '958486b0-1ef4-4efd-bee0-ea94e96f6c96': 'CRJ-900',
    '8bafde46-7e6e-44c5-800f-917237c49d75': 'CubCrafters XCub',
    '693c3fab-307d-4467-aa40-0a4d569841a9': 'DC-10',
    'e59fa7b4-b708-4480-aebd-26659a4f312b': 'DC-10F',
    'af055734-aaed-44ad-a2d0-5b9046f29d0d': 'E175',
    '7de22dcf-91dd-4932-b225-533298873df2': 'E190',
    '9bbe741a-6fbe-415b-9eb1-00d45083c7a4': 'F-14',
    '7bd8096f-8eae-47b9-8e1a-38dabd2c59c4': 'F-16',
    '849366e1-cb11-4d72-9034-78b11cd026b0': 'F-22',
    '0a3edb21-d515-4619-8392-aef51b952ac9': 'F/A-18E Super Hornet',
    'b1e726b0-be58-4a9b-88e5-e40bc40a1f9a': 'MD-11',
    '3f78766a-30c8-4d65-95ae-ebc2fb758aac': 'MD-11F',
    '9769c825-0f89-4faf-abb1-9dd473321ede': 'P-38',
    '61bd47dc-e12b-4912-9d91-719e1f9298d7': 'Space Shuttle',
    '8a62f1d0-bca9-494c-bc01-1fb8b7255f76': 'Spitfire',
    '3f17ca35-b384-4391-aa5e-5beececb0612': 'TBM-930'
};