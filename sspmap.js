
// Get the current URL
const currentURL = window.location.href;

// Define the expected URL path
const expectedPath = "/species";

// Check if the current URL contains the expected path
if (currentURL.includes(expectedPath)) {

    console.log("URL is correct. Running the code...");


    // Create a Leaflet map and set the initial view
    var map = L.map('sspmap', {
        worldCopyJump: true,
        zoomControl: false, // default zoom control is on the left top.
        maxBounds: [
            [-90, -Infinity],
            [90, Infinity]
        ],
        wheelPxPerZoomLevel: 120 // Default is 60, try doubling to decrease sensitivity
    }).setView([35, 15], 2);


    L.control.scale({ metric: true, imperial: true, position: 'bottomright' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.addControl(new L.Control.Fullscreen({ position: 'topright' }));

    var pixel_ratio = parseInt(window.devicePixelRatio) || 1;
    var max_zoom = 16;
    var tile_size = 512;

    var gbifTileURL = 'https://tile.gbif.org/3857/omt/{z}/{x}/{y}@{r}x.png?style=gbif-geyser'.replace('{r}', pixel_ratio);


    // Define a single tile layer for GBIF
    var gbifTileLayer = L.tileLayer(gbifTileURL, {
        attribution: 'Tiles &copy; GBIF',
        maxZoom: 17, // Adjust maxZoom as needed
        opacity: 1
    });




    new L.basemapsSwitcher([
        {
            layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
            }).setOpacity(1).addTo(map),
            maxZoom: 17,
            icon: '/static/js/img/terrain.jpeg', // Correct path to the icon
            name: 'WorldStreet'
        },
        {
            layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
            }).setOpacity(1),
            icon: '/static/js/img/topo.jpg', // Correct path to the icon
            name: 'Topo'
        },
        {
            layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
            }).setOpacity(0.9),
            maxZoom: 21,
            icon: '/static/js/img/satellite.jpg', // Correct path to the icon
            name: 'Satellite'
        },
        {
            layer: L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors)'
            }),
            icon: '/static/js/img/osm.png', // Correct path to the icon
            name: 'OSM'
        },
        {
            layer: gbifTileLayer,
            icon: '/static/js/img/geyser.png', // Correct path to the icon
            name: 'GBIF'
        },
    ], { position: 'topleft' }).addTo(map);

    // Assuming your map control has an id or class to select it.
    let controlElement = document.querySelector('.leaflet-control-basemapsSwitcher');

    controlElement.addEventListener('mouseenter', function () {
        controlElement.style.display = 'flex';
        controlElement.style.flexDirection = 'column';
    });

    controlElement.addEventListener('mouseleave', function () {
        controlElement.style.flexDirection = ''; // Reset to default or 'row' if you want to set it explicitly.
    });


    let orderedSubspeciesList = [];


    async function fetchData() {
        // Get the current URL
        const url = new URL(window.location.href);

        // Extract the pathname from the URL
        const pathname = url.pathname;

        // Split the pathname by "/" to get the parts
        const parts = pathname.split('/');

        // Ensure the pathname has the expected format
        if (parts.length !== 3 || parts[1] !== 'species') {
            console.error('Invalid URL format');
            return;
        }

        // Get the genus and species from the URL
        const genusSpecies = parts[2].split('-');
        const genus = genusSpecies[0];
        const species = genusSpecies[1];

        // Extract the subspecies from the query parameter
        const query = url.searchParams.get('query');
        const subspeciesMatch = /ssp:"([^"]+)"/.exec(query);
        const subspecies = subspeciesMatch ? subspeciesMatch[1] : null;

        console.log('Extracted Genus:', genus);
        console.log('Extracted Species:', species);
        console.log('Extracted Subspecies:', subspecies);

        // Get the filter value from the form
        const filterForm = document.getElementById('filter-form');
        const filterValue = filterForm ? filterForm.elements.query.value : null;

        updateGeoJSONLayer(genus, species, map);

        const iocData = await fetchJSON('/static/js/ioc.json');
        orderedSubspeciesList = iocData?.[genus]?.[`${genus} ${species}`];


        if (!orderedSubspeciesList) {
            console.error('Could not find subspecies list for', genus, species);
            return;
        }




        try {
            const data = await fetchAPIData(genus, species, subspecies, filterValue); // Pass the filter value to your function

            recordings = data?.recordings
                .map(record => ({
                    ...record,
                    ssp: record.ssp ? record.ssp.toLowerCase() : record.ssp,
                    lat: parseFloat(record.lat),
                    lng: parseFloat(record.lng),
                }))
                .filter(record => {
                    if (!isValidCoordinate(record.lat, record.lng)) {
                        return false;
                    }
                    return true;
                });
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }



    async function fetchJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error(`Failed to fetch ${url}`, error);
        }
    }




    async function fetchAPIData(genus, species, subspecies, filter) {
        let apiUrl;

        if (subspecies !== null) {
            apiUrl = `https://xeno-canto.org/api/2/recordings?query=${genus}%20${species}+ssp:"${subspecies}"&page=1`;
        } else {
            apiUrl = `https://xeno-canto.org/api/2/recordings?query=${genus}%20${species}&page=1`;
        }

        // Append the filter value to the API URL
        if (filter) {
            apiUrl = apiUrl.replace('&page=1', `+${filter}&page=1`);
        }

        console.log(apiUrl);

        try {
            const initialData = await fetchJSON(apiUrl);
            if (!initialData) {
                return; // No data available
            }

            const numPages = initialData.numPages;
            console.log('Total number of pages:', numPages);

            // Fetch and process data page by page
            for (let page = 1; page <= numPages; page++) {
                const pageUrl = `${apiUrl}&page=${page}`;
                const data = await fetchJSON(pageUrl);
                if (data) {
                    console.log('Fetching page:', page);

                    let recordings = data.recordings
                        .map(record => ({
                            ...record,
                            ssp: record.ssp ? record.ssp.toLowerCase() : record.ssp,
                            lat: parseFloat(record.lat),
                            lng: parseFloat(record.lng),
                        }))
                        .filter(record => {
                            if (!isValidCoordinate(record.lat, record.lng)) {
                                return false;
                            }
                            return true;
                        });

                    // Modify the ssp values of recordings based on the presence in orderedSubspeciesList
                    recordings = recordings.map(record => {
                        // If ssp is empty or not present in orderedSubspeciesList, treat it as empty
                        if (!record.ssp || !orderedSubspeciesList.includes(record.ssp)) {
                            return {
                                ...record,
                                ssp: ""
                            };
                        }
                        return record;
                    });


                    if (!orderedSubspeciesList || orderedSubspeciesList.length === 0) {
                        console.error('Could not find subspecies list for', genus, species);
                        // Handle monotypic species case here
                        orderedSubspeciesList = ['monotypic'];
                        // Modify recordings to set a default ssp value
                        recordings = recordings.map(record => ({
                            ...record,
                            ssp: 'monotypic'
                        }));

                    }

                    plotData(recordings);
                }
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    }




    async function updateGeoJSONLayer(genus, species, map) {
        const formattedSpecies = `${genus} ${species}`;
        const zipFilename = `http://localhost/static/js/${formattedSpecies.replace(/\s+/g, '_')}.geojson.zip`;

        console.log("Trying to fetch Zip Filename:", zipFilename); // Debugging line

        // Fetch the zipped file
        const response = await fetch(zipFilename);
        const zipBlob = await response.blob();

        const JSZip = window.JSZip;

        // Use JSZip to unzip the file
        const zip = new JSZip();
        await zip.loadAsync(zipBlob);

        let geoJsonContent;

        const files = zip.filter((relativePath, file) => file.name.endsWith('.geojson'));

        if (files.length === 0) {
            console.error('No .geojson file found in the zip.');
            return;
        }

        const geoJsonFile = files[0];
        console.log("File in ZIP:", geoJsonFile.name);

        geoJsonContent = await geoJsonFile.async('string');

        // Parse the GeoJSON content
        const geojsonData = JSON.parse(geoJsonContent);

        if (window.geoJsonLayer) {
            map.removeLayer(window.geoJsonLayer);
        }

        // Function to assign colors based on the 'season' property
        function styleFeature(feature) {
            let season = feature.properties.season.toString(); // Convert season to string
            let fillColor, strokeColor;


            switch (season) {
                case '1':
                    fillColor = '#AD7FA8'; // Resident: Purple
                    strokeColor = '#5C3566';
                    break;
                case '2':
                    fillColor = '#EF2929'; // Breeding: Red
                    strokeColor = '#A40000';
                    break;
                case '3':
                    fillColor = '#729FCF'; // Non-breeding: Blue
                    strokeColor = '#204A87';
                    break;
                case '4':
                    fillColor = '#CEE94F'; // Passage: Yellow
                    strokeColor = '#C4A000';
                    break;
                case '5':
                    fillColor = '#FCAF3E'; // Uncertain: Orange
                    strokeColor = '#CE5C00';
                    break;
                default:
                    fillColor = '#FFFFFF'; // White for any other value
                    strokeColor = '#000000';
            }

            return {
                fillColor: fillColor,
                fillOpacity: 0.49, // Adjust the opacity of the filled area (0 is fully transparent, 1 is fully opaque)
                weight: 0.5,
                opacity: 1, // Adjust the opacity of the stroke (border) (0 is fully transparent, 1 is fully opaque)
                color: strokeColor, // Border color based on 'season'
            };
        }

        // Adding the GeoJSON layer with styles applied based on the 'season' property
        window.geoJsonLayer = L.geoJson(geojsonData, { style: styleFeature }).addTo(map);

        adjustMapViewGeojson();
    }



    function adjustMapViewGeojson() {
        if (window.geoJsonLayer) {
            const bounds = window.geoJsonLayer.getBounds();

            if (bounds.isValid()) {
                map.fitBounds(bounds);
            } else {
                console.warn('No valid bounds for the GeoJSON layer.');
            }
        } else {
            console.warn('No GeoJSON layer to fit bounds to.');
        }
    }




    function plotData(recordings) {

        // Group valid recordings by coordinates
        const groupedRecordings = groupRecordingsByCoordinates(recordings);

        // Iterate over valid grouped recordings
        Object.entries(groupedRecordings).forEach(([key, group]) => {
            const [lat, lng] = key.split(',').map(Number);

            // Modify zIndexOffset calculation based on whether the ssp is valid
            const zIndexOffset = group.some((recording) => recording.ssp && orderedSubspeciesList.includes(recording.ssp))
                ? 1000
                : 0;
            const subspeciesFrequency = calculateSubspeciesFrequency(group);
            const pieData = preparePieData(subspeciesFrequency, group.length);

            // Sort, create canvas, draw pie chart, create Leaflet marker, and add it to map
            drawPieChartAndCreateMarker(lat, lng, pieData, zIndexOffset, group);
        });

    }



    function groupRecordingsByCoordinates(recordings) {
        return recordings.reduce((groups, recording) => {
            const lat = parseFloat(recording.lat);
            const lng = parseFloat(recording.lng);

            const key = `${lat},${lng}`;
            groups[key] = groups[key] || [];
            groups[key].push(recording);

            return groups;
        }, {});
    }

    function isValidCoordinate(lat, lng) {
        return (
            !isNaN(lat) &&
            lat >= -90 &&
            lat <= 90 &&
            !isNaN(lng) &&
            lng >= -180 &&
            lng <= 180
        );
    }



    function calculateSubspeciesFrequency(group) {
        return group.reduce((freq, recording) => {
            const subspecies = recording.ssp || "not specified";
            freq[subspecies] = (freq[subspecies] || 0) + 1;
            return freq;
        }, {});
    }


    function preparePieData(subspeciesFrequency, totalRecordings) {
        const pieData = Object.entries(subspeciesFrequency).map(([subspecies, count]) => {
            return {
                ssp: subspecies,
                color: getColor(subspecies),
                value: count / totalRecordings
            };
        });

        return pieData.sort((a, b) => {
            if (a.ssp === 'not specified') return 1;
            if (b.ssp === 'not specified') return -1;
            return 0;
        });
    }



    function createMarkerIcon(canvas) {
        return L.divIcon({
            className: "pie-chart-marker",
            html: `<img src="${canvas.toDataURL()}" width="15" height="15" />`,
        });
    }

    let currentAudioElement = null; // Declare this at the beginning of your script

    function handlePopupContent(e, id) {
        fetch(`https://xeno-canto.org/api/internal/ajax-player?nr=${id}`)
            .then(response => response.json())
            .then(data => {
                const contentContainer = document.createElement('div');
                contentContainer.innerHTML = data.content;

                contentContainer.style.width = "200px";
                contentContainer.style.height = "230px";
                contentContainer.style.overflow = "hidden";

                const audioFilePath = contentContainer.querySelector('.jp-type-single').dataset.xcFilepath;
                const audioUrl = `https:${audioFilePath}`;
                const audioElement = new Audio(audioUrl);

                currentAudioElement = audioElement;

                const playButton = contentContainer.querySelector('.jp-play');
                const pauseButton = contentContainer.querySelector('.jp-pause');
                const stopButton = contentContainer.querySelector('.jp-stop');
                const progressBar = contentContainer.querySelector('.jp-play-bar');

                // Adding event listeners for play, pause, and stop buttons
                playButton.addEventListener('click', handlePlay);
                pauseButton.addEventListener('click', handlePause);
                stopButton.addEventListener('click', handleStop);

                function handlePlay() {
                    audioElement.play();
                    pauseButton.style.display = "";
                    playButton.style.display = "none";
                }

                function handlePause() {
                    audioElement.pause();
                    playButton.style.display = "";
                    pauseButton.style.display = "none";
                }

                function handleStop() {
                    audioElement.pause();
                    audioElement.currentTime = 0;
                    playButton.style.display = "";
                    pauseButton.style.display = "none";
                }

                audioElement.addEventListener('timeupdate', updateTime);
                function updateTime() {
                    const percent = (audioElement.currentTime / audioElement.duration) * 100;
                    progressBar.style.width = `${percent}%`;
                }

                audioElement.addEventListener('canplaythrough', enableSeekBar);
                function enableSeekBar() {
                    contentContainer.querySelector('.jp-seek-bar').addEventListener('click', seekAudio);
                }

                function seekAudio(event) {
                    const offsetX = event.pageX - this.getBoundingClientRect().left;
                    const clickedValuePercentage = (offsetX / this.offsetWidth) * 100;
                    const newTime = (clickedValuePercentage / 100) * audioElement.duration;
                    if (!isNaN(newTime) && newTime >= 0 && newTime <= audioElement.duration) {
                        audioElement.currentTime = newTime;
                    }
                }

                e.popup.setContent(contentContainer);
            })
            .catch(error => {
                console.error('Error fetching data: ', error);
                e.popup.setContent("Failed to load content");
            });
    }

    // Handling the cleanup when popup closes
    map.on('popupclose', function () {
        if (currentAudioElement) {
            currentAudioElement.pause();
            currentAudioElement.currentTime = 0;
        }
    });







    function createPopupContent(group, marker) {
        if (group.length === 1) {
            marker.on('popupopen', e => handlePopupContent(e, group[0].id))
                .bindPopup("Loading content...");
        } else {
            // Function to create the list content for the popup
            const createListContent = () => {
                const listContainer = document.createElement("ul");
                listContainer.style.listStyleType = "none"; // Remove bullet points

                group.forEach(item => {
                    const listItem = document.createElement("li");

                    const colorCircle = document.createElement("span"); // Creating a new span to hold the color
                    colorCircle.style.backgroundColor = getColor(item.ssp); // Setting the background color based on subspecies
                    colorCircle.style.display = "inline-block";
                    colorCircle.style.width = "10px";
                    colorCircle.style.height = "10px";
                    colorCircle.style.borderRadius = "50%";
                    colorCircle.style.marginRight = "5px";

                    const link = document.createElement("a");
                    link.href = "#";
                    link.textContent = `${item.id}: ${item.en} (${item.rec})`; // Formatted as requested
                    link.style.fontSize = "11px"; // Adjust the font size here
                    link.onclick = () => handlePopupContent({ popup: marker.getPopup() }, item.id);

                    listItem.appendChild(colorCircle); // Appending the color circle to the list item
                    listItem.appendChild(link);
                    listContainer.appendChild(listItem);
                });

                return listContainer;
            };

            // Set initial content as the list
            marker.bindPopup(createListContent());

            // Update content each time the popup is opened
            marker.on('popupopen', () => {
                marker.getPopup().setContent(createListContent());
            });
        }
    }



    // Assuming markerGroup is a global variable or it is accessible in this scope
    function adjustMapViewRecordings() {
        if (markerGroup.getLayers().length > 0) { // Check if there are markers to show
            const groupBounds = markerGroup.getBounds(); // Get bounds of all markers
            map.fitBounds(groupBounds); // Fit map to bounds
        }
    }

    function drawPieChartAndCreateMarker(lat, lng, pieData, zIndexOffset, group) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 17;
        drawPieChart(canvas, pieData);

        const marker = L.marker([lat, lng], {
            icon: createMarkerIcon(canvas), zIndexOffset
        });

        createPopupContent(group, marker);

        marker.addTo(markerGroup);
        //adjustMapViewRecordings(); // Call the function to adjust the map view
    }

    function drawPieChart(canvas, pieData) {
        const ctx = canvas.getContext("2d");
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 1; // Adjust as needed

        // Calculate the total value by summing up all values in pieData
        const totalValue = pieData.reduce((total, slice) => total + slice.value, 0);

        let startAngle = -Math.PI / 2;

        pieData.forEach((slice) => {
            const sliceAngle = (slice.value / totalValue) * 2 * Math.PI;

            // Draw the pie slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath(); // Close the path
            ctx.fillStyle = slice.color;
            ctx.fill();

            // Draw a darker border around the slice
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.lineWidth = 2;
            ctx.strokeStyle = darkenColor(slice.color);
            ctx.stroke();

            startAngle += sliceAngle;
        });
    }


    function darkenColor(color) {
        // Check if the color is the "not specified" color
        if (color === "hsl(52, 12%, 87%)") {
            return "hsl(47, 13%, 50%)"; // Return a darker gray for the border
        }

        const hsl = color.match(/\d+/g); // Assumes the color is already in hsl format
        const lightness = Math.max(parseInt(hsl[2]) - 15, 0); // Reduces lightness by 15%, ensuring it doesn't go below 0
        return `hsl(${hsl[0]}, ${hsl[1]}%, ${lightness}%)`;
    }





    function getColor(subspecies) {
        if (subspecies === "not specified") return "hsl(52, 12%, 87%)"; // lightgray

        if (subspecies === "monotypic") return "hsl(0, 100%, 50%)"; // red


        const index = orderedSubspeciesList.findIndex(item => item.toLowerCase() === subspecies.toLowerCase());

        if (index === -1) {
            return "hsl(0, 0%, 75%)";  // black
        }

        const totalSubspecies = orderedSubspeciesList.length;

        const colorScale = [
            { h: 0, s: 100, l: 50 },    // red
            { h: 25, s: 100, l: 35 },   // Brownish-Orange
            { h: 30, s: 100, l: 50 },   // orange
            { h: 60, s: 100, l: 50 },   // yellow
            { h: 100, s: 100, l: 39 },   // green
            { h: 195, s: 100, l: 50 },   // blue
            { h: 240, s: 100, l: 35 },   // dark blue
        ];


        const segment = (totalSubspecies - 1) / (colorScale.length - 1);
        const lowerIndex = Math.floor(index / segment);
        const upperIndex = Math.min(lowerIndex + 1, colorScale.length - 1);
        const t = (index - lowerIndex * segment) / segment;

        if (!colorScale[lowerIndex] || !colorScale[upperIndex]) {
            console.error('Color scale index out of bounds:', { lowerIndex, upperIndex, colorScale });
            return;
        }

        const h = colorScale[lowerIndex].h + (colorScale[upperIndex].h - colorScale[lowerIndex].h) * t;
        const s = colorScale[lowerIndex].s + (colorScale[upperIndex].s - colorScale[lowerIndex].s) * t;
        const l = colorScale[lowerIndex].l + (colorScale[upperIndex].l - colorScale[lowerIndex].l) * t;

        return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;


    }



    // Add event listeners to the buttons
    document.getElementById('zoom-to-marker').addEventListener('click', zoomToMarkerBounds);
    document.getElementById('zoom-to-range').addEventListener('click', zoomToRangeBounds);

    // Function to zoom to marker bounds
    function zoomToMarkerBounds() {
        const bounds = markerGroup.getBounds();

        if (bounds.isValid()) {
            map.fitBounds(bounds);
        } else {
            console.warn('No markers to fit bounds to.');
        }
    }

    // Function to zoom to range bounds
    function zoomToRangeBounds() {
        if (window.geoJsonLayer) {
            const rangeBounds = window.geoJsonLayer.getBounds();

            if (rangeBounds.isValid()) {
                map.fitBounds(rangeBounds);
            } else {
                console.warn('No valid bounds for the GeoJSON layer.');
            }
        } else {
            console.warn('No GeoJSON layer to fit bounds to.');
        }
    }


    // Attach event listeners to the buttons
    document.getElementById('toggleMarkerButton').addEventListener('click', toggleMarkersVisibility);
    document.getElementById('toggleLayerButton').addEventListener('click', toggleGeoJSONLayerVisibility);

    // Define a variable to track visibility states
    let markersVisible = true;
    let GeoJSONLayerVisible = true;

    // Function to toggle markers visibility
    function toggleMarkersVisibility() {
        if (markersVisible) {
            // Hide markers by removing them from the map
            markerGroup.eachLayer((layer) => {
                map.removeLayer(layer);
            });
        } else {
            // Show markers by adding them to the map
            markerGroup.eachLayer((layer) => {
                map.addLayer(layer);
            });
        }
        markersVisible = !markersVisible;
    }


    // Function to toggle KMZ layer visibility
    function toggleGeoJSONLayerVisibility() {
        if (GeoJSONLayerVisible) {
            // Hide the KMZ layer
            if (window.geoJsonLayer) {
                map.removeLayer(window.geoJsonLayer);
            }
        } else {
            // Show the KMZ layer
            if (window.geoJsonLayer) {
                window.geoJsonLayer.addTo(map);
            }
        }
        GeoJSONLayerVisible = !GeoJSONLayerVisible;
    }



    let markerGroup = L.featureGroup().addTo(map);  // A FeatureGroup to hold all the markers


    document.addEventListener('DOMContentLoaded', () => {
        fetchData();
    });




} else {

    // The URL does not contain "/species", so you can break or take any other action
    console.log("URL is not species. Breaking...");

}


