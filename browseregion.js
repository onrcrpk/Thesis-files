

// Define the expected URL path
const expectedPath2 = "/explore";

// Check if the current URL contains the expected path
if (currentURL.includes(expectedPath2)) {
    console.log("URL is correct. Running the code...");




    // Create a Leaflet map and set the initial view
    var map = L.map('browseregion', {
        worldCopyJump: true,
        zoomControl: false, // default zoom control is on the left top.
        maxBounds: [
            [-90, -Infinity],
            [90, Infinity]
        ],
        wheelPxPerZoomLevel: 120 // Default is 60, double it to decrease sensitivity
    }).setView([35, 15], 2);


    L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.addControl(new L.Control.Fullscreen({ position: 'topright' }));

    var pixel_ratio = parseInt(window.devicePixelRatio) || 1;
    var max_zoom = 16;
    var tile_size = 512;

    var gbifTileURL = 'https://tile.gbif.org/3857/omt/{z}/{x}/{y}@{r}x.png?style=gbif-geyser'.replace('{r}', pixel_ratio);


    // Define a single tile layer for GBIF
    var gbifTileLayer = L.tileLayer(gbifTileURL, {
        attribution: 'Tiles &copy; GBIF',
        maxZoom: 17, 
        opacity: 1
    });




    new L.basemapsSwitcher([
        {
            layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
            }).setOpacity(1).addTo(map),
            maxZoom: 17,
            icon: '/static/js/img/terrain.jpeg', 
            name: 'WorldStreet'
        },
        {
            layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
            }).setOpacity(1),
            icon: '/static/js/img/topo.jpg', 
            name: 'Topo'
        },
        {
            layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
            }).setOpacity(0.9),
            maxZoom: 21,
            icon: '/static/js/img/satellite.jpg', 
            name: 'Satellite'
        },
        {
            layer: L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors)'
            }),
            icon: '/static/js/img/osm.png', 
            name: 'OSM'
        },
        {
            layer: gbifTileLayer,
            icon: '/static/js/img/geyser.png', 
            name: 'GBIF'
        },
    ], { position: 'bottomleft' }).addTo(map);



    // 1. Variable Declarations and Initial Settings
    // Variables and settings
    var markers = L.markerClusterGroup({
        spiderfyOnMaxZoom: !1,
        removeOutsideVisibleBounds: !0,
        showCoverageOnHover: !1,
        zoomToBoundsOnClick: !1
    });
    var isLoadingData = !1,
        rectanglesGroup = new L.LayerGroup(),
        drawnItems = new L.FeatureGroup(),
        fetchedData = null,
        drawnBounds = null;
    let toggleState = "species";
    var maxSpeciesCount = 0,
        maxRecordingsCount = 0,
        toggleControl = L.control({ position: "topright" });
    const BASE_API_URL = "https://xeno-canto.org/api/internal/region-results";


    // Configuration for the drawing controls on the map
    var drawControl = new L.Control.Draw({
        position: 'topleft', // Adding position property here
        draw: {
            polyline: false,
            polygon: false,
            circle: false,
            marker: false,
            circlemarker: false,
            rectangle: {
                shapeOptions: {},
            }
        },
        edit: {
            featureGroup: drawnItems,
            edit: false,
            remove: false
        }
    });

    // Adding the control to the map
    map.addControl(drawControl);



    // 2. Event Listeners and Handlers
    // Event listeners and controls initialization
    map.on(L.Draw.Event.CREATED, handleLayerCreation);
    map.on('zoomend', handleZoomEnd);
    map.on('boxzoomend', handleBoxZoomEnd);




    let currentAudioElement = null; // Declare this at the beginning of your script

    markers.on('clusterclick', function (event) {
        let childMarkers = event.layer.getAllChildMarkers();
        console.log(childMarkers);

        let div = document.createElement('div');

        childMarkers.forEach(marker => {
            let a = document.createElement('a');
            a.href = '#';
            a.textContent = marker.options.title || 'No Title';
            a.setAttribute('data-id', marker.options.id);

            a.onclick = function (e) {
                e.preventDefault();
                const recordingId = a.getAttribute('data-id');

                fetch(`https://xeno-canto.org/api/internal/ajax-player?nr=${recordingId}`)
                    .then(response => response.json())
                    .then(data => {
                        const contentContainer = document.createElement("div");
                        contentContainer.style.width = "200px";
                        contentContainer.style.height = "210px";
                        contentContainer.style.overflow = "hidden";

                        contentContainer.innerHTML = data.content;

                        const audioFilePath = contentContainer.querySelector('.jp-type-single').dataset.xcFilepath;
                        const audioUrl = `https:${audioFilePath}`;
                        const audioElement = new Audio(audioUrl);

                        currentAudioElement = audioElement;

                        const playButton = contentContainer.querySelector('.jp-play');
                        const pauseButton = contentContainer.querySelector('.jp-pause');
                        const progressBar = contentContainer.querySelector('.jp-play-bar');

                        playButton.addEventListener('click', () => {
                            audioElement.play();
                            pauseButton.style.display = "";
                            playButton.style.display = "none";
                        });

                        pauseButton.addEventListener('click', () => {
                            audioElement.pause();
                            playButton.style.display = "";
                            pauseButton.style.display = "none";
                        });

                        audioElement.addEventListener('timeupdate', () => {
                            const percent = (audioElement.currentTime / audioElement.duration) * 100;
                            progressBar.style.width = `${percent}%`;
                        });

                        audioElement.addEventListener('canplaythrough', function () {
                            contentContainer.querySelector('.jp-seek-bar').addEventListener('click', function (event) {
                                const offsetX = event.pageX - this.getBoundingClientRect().left;
                                const clickedValuePercentage = (offsetX / this.offsetWidth) * 100;
                                const newTime = (clickedValuePercentage / 100) * audioElement.duration;
                                if (!isNaN(newTime) && newTime >= 0 && newTime <= audioElement.duration) {
                                    audioElement.currentTime = newTime;
                                }
                            });
                        });

                        const popup = L.popup({ autoPan: false })
                            .setLatLng(marker.getLatLng())
                            .setContent(contentContainer)
                            .openOn(event.layer._map);

                        popup.on('remove', function () {
                            if (currentAudioElement) {
                                currentAudioElement.pause();
                                currentAudioElement.currentTime = 0;
                            }
                        });

                    })
                    .catch(error => console.error('Error:', error));
            };

            div.appendChild(a);
            div.appendChild(document.createElement('br'));
        });

        event.layer.bindPopup(div, { autoPan: false }).openPopup();
    });





    map.addLayer(drawnItems);








    // 3. Data Fetching and Loading
    // Update the legend to show a "Loading" state
    function updateLegendToLoading() {
        jQuery(".info.legend").html("Loading...");
        isLoadingData = true;
    }

    function constructApiUrl(bounds, query) {
        let apiUrl = `${BASE_API_URL}?yn=${bounds._northEast.lat}&xe=${bounds._northEast.lng}&ys=${bounds._southWest.lat}&xw=${bounds._southWest.lng}`;
        if (query) {
            apiUrl += `&query=${encodeURIComponent(query)}`;
        }
        console.log(apiUrl);
        return apiUrl;

    }

    // Disable filter query until user draw a box.
    jQuery('#filter-form input').attr('disabled', 'disabled');

    // Handle creation of a new drawn layer on the map
    function handleLayerCreation(event) {
        var layer = event.layer;
        drawnBounds = layer.getBounds();
        drawnItems.addLayer(layer);

        // Zoom to the drawn bounds every time a box is drawn
        map.fitBounds(drawnBounds);

        // Update the HTML content to display a loading message
        jQuery('#region-results').html('<p>Querying database...</p>');
        updateLegendToLoading();

        // Fetch data for the drawn bounds
        fetchDataAndCreateGrid(constructApiUrl(layer.getBounds()));
        drawnItems.clearLayers();
    }




    // Handle the end of a zoom event
    function handleZoomEnd() {
        if (isLoadingData) {
            updateLegendToLoading();
        } else {
            if (fetchedData) {
                processDataAndCreateGrid(fetchedData);
            }
            updateVisibilityBasedOnZoom(map.getZoom());
        }
    }

    // Handle the end of a box zoom event
    function handleBoxZoomEnd(e) {

        // Update the HTML content to display a loading message
        jQuery('#region-results').html('<p>Querying database...</p>');

        drawnBounds = e.boxZoomBounds;



        updateLegendToLoading();

        let layer = L.rectangle([drawnBounds.getSouthWest(), drawnBounds.getNorthEast()]);
        drawnItems.addLayer(layer);

        fetchDataAndCreateGrid(constructApiUrl(drawnBounds));
        drawnItems.clearLayers();
    }

    // Fetch the data from the provided URL and create a grid on the map
    function fetchDataAndCreateGrid(apiUrl) {
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                isLoadingData = false; // Reset the loading state
                fetchedData = data;
                processDataAndCreateGrid(data);
                jQuery(".info.legend").show();
                // Construct a URL for exploring the selected region and query.
                var northEastLat = parseFloat(drawnBounds._northEast.lat).toFixed(3);
                var northEastLng = parseFloat(drawnBounds._northEast.lng).toFixed(3);
                var southWestLat = parseFloat(drawnBounds._southWest.lat).toFixed(3);
                var southWestLng = parseFloat(drawnBounds._southWest.lng).toFixed(3);
                var url = `https://xeno-canto.org/explore?query=${encodeURIComponent('box:' + southWestLat + ',' + southWestLng + ',' + northEastLat + ',' + northEastLng)}`;



                // Enable the input elements within the 'filter-form' element.
                jQuery('#filter-form input').removeAttr('disabled');
                var noteMore = '';
                if (data.summary.recordings > data.markers.length) {
                    noteMore = '(only the first ' + data.markers.length + ' recordings are shown on the map)';
                }

                // Update the HTML content of the 'region-results' element to display the summary information and the additional note.
                jQuery('#region-').html(`<p><a href="${url}">${data.summary.recordings} Recordings from ${data.summary.species} species</a> ${noteMore} found in the selected region</p>`);
            })

            .catch(error => {
                console.error('Error fetching data:', error);
                isLoadingData = false; // Reset the loading state even if there's an error
            });
    }

    jQuery('#filter-form').submit(function (event) {
        event.preventDefault(); // Prevent the default form submission
        var query = jQuery(this).find('input').val(); // Get the query from the input field
        if (drawnBounds) {
            var apiUrl = constructApiUrl(drawnBounds, query); // Construct the API URL with the bounds and the new query
            fetchDataAndCreateGrid(apiUrl); // Fetch the data and update the map
            // Update the HTML content to display a loading message
            jQuery('#region-results').html('<p>Querying database...</p>');
        } else {
            // Handle the case when there is no drawnBounds
        }
    });




    // 4. Grid Visualization and Processing
    // Create markers and calculate counts for the grid based on fetched data
    function createMarkersAndCalculateGridCounts(data, gridSize) {
        const gridCounts = {};
        let maxSpeciesCount = 0;
        let maxRecordingsCount = 0;
        let currentAudioElement = null; // Ensure this is declared globally

        function bindPopupContentOnClick(marker, id) {
            marker.on('click', function (e) {
                fetch(`https://xeno-canto.org/api/internal/ajax-player?nr=${id}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data && data.content) {
                            const contentContainer = document.createElement("div");
                            contentContainer.style.width = "200px";
                            contentContainer.style.height = "210px";
                            contentContainer.style.overflow = "hidden";

                            const scalingContainer = document.createElement("div");
                            scalingContainer.style.transform = "scale(1)";
                            scalingContainer.style.transformOrigin = "top left";
                            scalingContainer.innerHTML = data.content;

                            contentContainer.appendChild(scalingContainer);

                            const audioFilePath = scalingContainer.querySelector('.jp-type-single').dataset.xcFilepath;
                            const audioUrl = `https:${audioFilePath}`;
                            const audioElement = new Audio(audioUrl);

                            currentAudioElement = audioElement;

                            const playButton = scalingContainer.querySelector('.jp-play');
                            const pauseButton = scalingContainer.querySelector('.jp-pause');
                            const progressBar = scalingContainer.querySelector('.jp-play-bar');

                            playButton.addEventListener('click', () => {
                                audioElement.play();
                                pauseButton.style.display = "";
                                playButton.style.display = "none";
                            });

                            pauseButton.addEventListener('click', () => {
                                audioElement.pause();
                                playButton.style.display = "";
                                pauseButton.style.display = "none";
                            });

                            audioElement.addEventListener('timeupdate', () => {
                                const percent = (audioElement.currentTime / audioElement.duration) * 100;
                                progressBar.style.width = `${percent}%`;
                            });

                            audioElement.addEventListener('canplaythrough', function () {
                                scalingContainer.querySelector('.jp-seek-bar').addEventListener('click', function (event) {
                                    const offsetX = event.pageX - this.getBoundingClientRect().left;
                                    const clickedValuePercentage = (offsetX / this.offsetWidth) * 100;
                                    const newTime = (clickedValuePercentage / 100) * audioElement.duration;
                                    if (!isNaN(newTime) && newTime >= 0 && newTime <= audioElement.duration) {
                                        audioElement.currentTime = newTime;
                                    }
                                });
                            });

                            marker.bindPopup(contentContainer).openPopup();
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching popup content:', error);
                    });
            });

            marker.on('popupclose', function () {
                if (currentAudioElement) {
                    currentAudioElement.pause();
                    currentAudioElement.currentTime = 0;
                }
            });
        }



        data.markers.forEach(markerData => {
            const markerIcon = L.icon({
                iconUrl: '/static/js/img/marker-icon.png', // Adjust the URL to the correct path
                iconSize: [15, 15],
            });

            const marker = L.marker([markerData.lat, markerData.lon], {
                icon: markerIcon,
                title: markerData.title,
                id: markerData.id
            });

            bindPopupContentOnClick(marker, markerData.id);

            markers.addLayer(marker);
            const gridLat = Math.floor(markerData.lat / gridSize) * gridSize;
            const gridLng = Math.floor(markerData.lon / gridSize) * gridSize;

            const gridKey = `${gridLat},${gridLng}`;
            const species = markerData.title.split(":")[1]?.trim();

            if (!gridCounts[gridKey]) {
                gridCounts[gridKey] = {
                    species: new Set(),
                    recordings: 0
                };
            }
            if (species) {
                gridCounts[gridKey].species.add(species);
            }
            gridCounts[gridKey].recordings++;
            maxRecordingsCount = Math.max(maxRecordingsCount, gridCounts[gridKey].recordings); // Track the maximum recording count
        });

        for (let gridKey in gridCounts) {
            if (toggleState === 'species') {
                maxSpeciesCount = Math.max(maxSpeciesCount, gridCounts[gridKey].species.size);
            } else {
                maxRecordingsCount = Math.max(maxRecordingsCount, gridCounts[gridKey].recordings);
            }
        }

        return { gridCounts, maxSpeciesCount, maxRecordingsCount };
    }

    // Generate rectangles for the grids based on fetched data
    function generateRectanglesForGrids(data, gridCounts, maxSpeciesCount, maxRecordingsCount, gridSize) {

        const currentZoom = map.getZoom();

        if (currentZoom <= 1 && drawnBounds) {
            rectanglesGroup.clearLayers();

            let totalSpecies = 0;
            let totalRecordings = 0;

            for (let key in gridCounts) {
                totalSpecies += gridCounts[key].species.size;
                totalRecordings += gridCounts[key].recordings;
            }

            const color = toggleState === 'species'
                ? getColor(totalSpecies, maxSpeciesCount * Object.keys(gridCounts).length)
                : getColor(totalRecordings, maxSpeciesCount * Object.keys(gridCounts).length);

            let rectangle = L.rectangle(
                [drawnBounds.getSouthWest(), drawnBounds.getNorthEast()],
                { color: color, weight: 1 }
            ).bindTooltip(`${data.markers.length} recordings from ${new Set(data.markers.map(m => m.title.split(":")[1]?.trim())).size} species`);
            rectanglesGroup.addLayer(rectangle);

            map.addLayer(rectanglesGroup);
            return;
        }

        for (let gridKey in gridCounts) {
            const [gridLat, gridLng] = gridKey.split(',').map(Number);
            const speciesCount = gridCounts[gridKey].species.size;
            const recordingsCount = gridCounts[gridKey].recordings;

            const color = toggleState === 'species'
                ? getColor(speciesCount, maxSpeciesCount, 'species')
                : getColor(recordingsCount, maxRecordingsCount, 'recordings'); // Use maxRecordingsCount for recordings

            const rectangle = L.rectangle(
                [[gridLat, gridLng], [gridLat + (gridSize / 2), gridLng + gridSize]],
                {
                    color: color,
                    weight: 1.2,
                    fillOpacity: 0.7
                }
            );

            rectangle.bindTooltip(`${recordingsCount} recordings from ${speciesCount} species`);
            rectangle.on('mouseover', function (e) {
                e.target.openTooltip();
            });
            rectangle.on('mouseout', function (e) {
                e.target.closeTooltip();
            });

            rectanglesGroup.addLayer(rectangle);
        }
    }

    // Process fetched data to create the grid visualization on the map
    function processDataAndCreateGrid(data) {
        const zoomLevel = map.getZoom();
        const gridSize = getGridSizeForZoom(zoomLevel);

        markers.clearLayers();
        rectanglesGroup.clearLayers();

        const { gridCounts, maxSpeciesCount, maxRecordingsCount } = createMarkersAndCalculateGridCounts(data, gridSize);

        const maxCount = toggleState === 'species' ? maxSpeciesCount : maxRecordingsCount;

        // Calculate total recordings and total species across all grid cells
        let totalSpecies = new Set();
        let totalRecordings = 0;

        for (let key in gridCounts) {
            totalRecordings += gridCounts[key].recordings;
            gridCounts[key].species.forEach(species => totalSpecies.add(species));
        }

        jQuery(".info.legend").html(getLegendContent(maxCount, totalRecordings, totalSpecies.size));

        generateRectanglesForGrids(data, gridCounts, maxSpeciesCount, maxRecordingsCount, gridSize);

        map.addLayer(rectanglesGroup);
        updateVisibilityBasedOnZoom(map.getZoom());
    }




    function updateVisibilityBasedOnZoom(zoom) {
        const toggleButton = document.getElementById('toggle-btn');

        // For zoom level 1:
        if (zoom === 1) {
            rectanglesGroup.addTo(map); // Show grid
            hideLegend(); // Hide legend
            map.removeLayer(markers); // Hide markers
            toggleButton.style.display = 'none'; // Hide button
        }
        // For zoom level between 1 and 6 (exclusive) OR 6 and 13 (exclusive):
        else if ((zoom > 1 && zoom < 10)) {
            rectanglesGroup.addTo(map); // Show grid
            if (drawnBounds) {
                showLegend(); // Show legend
                toggleButton.style.display = 'block'; // Show button
            } else {
                hideLegend(); // Hide legend
                toggleButton.style.display = 'none'; // Hide button
            }
            map.removeLayer(markers); // Hide markers
        }
        // For zoom level 13 and above:
        else if (zoom >= 10) {
            map.addLayer(markers); // Show markers
            rectanglesGroup.removeFrom(map); // Hide grid
            hideLegend(); // Hide legend
            toggleButton.style.display = 'none'; // Hide button
        }
        // For any other cases (this may be redundant but kept for clarity):
        else {
            rectanglesGroup.addTo(map); // Show grid
            hideLegend(); // Hide legend
            map.removeLayer(markers); // Hide markers
            toggleButton.style.display = 'none'; // Hide button
        }
    }



    // 5. Utility Functions
    // Determine the grid size based on current zoom level
    function getGridSizeForZoom(zoom) {
        console.log(zoom);
        if (zoom <= 1 && drawnBounds) {
            const widthInDegrees = drawnBounds.getEast() - drawnBounds.getWest();
            return widthInDegrees;
        }
        if (zoom >= 6 && zoom <= 9) return 0.25;
        if (zoom >= 2) return 1;
    }



    // Determine the color based on the ratio of current count to the max count
    function getColor(count, maxCount) {
        const fraction = count / maxCount;

        if (fraction <= 0.2) return '#74A9CF';
        if (fraction <= 0.4) return '#2B8CBE';
        if (fraction <= 0.6) return '#FED976'; 
        if (fraction <= 0.8) return '#FB6A4A';
        return '#E31A1C';
    }

    // Function to show the legend
    function showLegend() {
        jQuery(".info.legend").show();
    }

    // Function to hide the legend
    function hideLegend() {
        jQuery(".info.legend").hide();
    }

    // Toggle between the display states (species or recordings)
    function toggleDisplayState() {
        if (toggleState === 'species') {
            toggleState = 'recordings';
            this.innerHTML = "Switch to Species";
        } else {
            toggleState = 'species';
            this.innerHTML = "Switch to Recordings";
        }

        if (fetchedData) {
            processDataAndCreateGrid(fetchedData);
        }
    }


    // 6. Controls and Legends
    // Toggle control button to switch between display states
    toggleControl.onAdd = function (e) {
        var t = L.DomUtil.create("div", "toggle-control");
        t.innerHTML = '<button id="toggle-btn" style="display: none;">Switch to Recordings</button>';

        // Move the event listener code inside this function, after the button is added to the DOM
        var toggleBtn = t.querySelector("#toggle-btn");
        toggleBtn.addEventListener("click", toggleDisplayState);

        toggleBtn.addEventListener("mousedown", function () {
            map.doubleClickZoom.disable();
        });

        toggleBtn.addEventListener("mouseup", function () {
            setTimeout(() => map.doubleClickZoom.enable(), 10);
        });

        return t;
    };
    toggleControl.addTo(map);

    toggleControl.addTo(map);
    document.getElementById('toggle-btn').addEventListener('click', toggleDisplayState);

    // Legend control on the map
    var legend = L.control({ position: 'topright' });
    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'info legend');
        //div.innerHTML = getLegendContent(0); // Initially assume maxCount as 0
        return div;
    };

    function getLegendContent(maxCount, totalRecordings, totalSpecies) {
        if (!maxCount || maxCount === 0) {
            return "Loading...";
        }

        const grades = [
            0,
            Math.round(0.2 * maxCount),
            Math.round(0.4 * maxCount),
            Math.round(0.6 * maxCount),
            Math.round(0.8 * maxCount)
        ];

        let labels = [];

        const gridSizeInDegrees = getGridSizeForZoom(map.getZoom());
        const gridSizeInKm = gridSizeInDegrees * 111;
        const gridSizeAreaInKm2 = Math.pow(gridSizeInKm, 2);

        // Add the totals after the grid size based on the toggle state
        if (toggleState === 'species') {
            labels.push(`Total Species: ${totalSpecies}`);
        } else {
            labels.push(`Total Recordings: ${totalRecordings}`);
        }

        labels.push('<strong>' + (toggleState === 'species'
            ? 'Number of species'
            : 'Number of recordings') + '</strong>');

        for (let i = 0; i < grades.length; i++) {
            if (i < grades.length - 1) {
                labels.push(
                    `<i style="background:${getColor(grades[i] + 1, maxCount)}"></i> ${grades[i]
                    }${grades[i + 1] ? ' &ndash; ' + (grades[i + 1] - 1) : '+'}`
                );
            } else {
                labels.push(
                    `<i style="background:${getColor(grades[i] + 1, maxCount)}"></i> ${grades[i]
                    } - ${maxCount}`
                );
            }
        }

        labels.push(`<div class="grid-size-info">Grid size: ~${gridSizeInKm.toFixed(2)} km (~${gridSizeAreaInKm2.toFixed(2)} km²)</div>`);


        return labels.join('<br>');
    }


    legend.addTo(map);

    // Initial visibility update based on current zoom level
    updateVisibilityBasedOnZoom(map.getZoom());

    document.addEventListener('DOMContentLoaded', (event) => {
        // Select the rectangle drawing button
        var drawButton = document.querySelector('.leaflet-draw-draw-rectangle');

        if (drawButton) {
            drawButton.title = '';

            // Set the button to be a flex container
            drawButton.style.display = 'flex';
            drawButton.style.alignItems = 'center';

            // Create an img element for the icon
            var icon = document.createElement('img');
            icon.src = '../static/img/draw.png'; // Adjusted the path to your icon file
            icon.alt = 'Draw Icon'; // Set an alternative text for the icon
            icon.style.width = '16px'; // Reduce the width of the icon
            icon.style.height = '16px'; // Reduce the height of the icon
            icon.style.display = 'inline-block';
            icon.style.marginRight = '4px'; // Adjust the space to the right of the icon
            drawButton.appendChild(icon);

            // Add the text to the button
            var text = document.createElement('span');
            text.textContent = 'Draw bounding box';
            text.style.display = 'inline-block';
            drawButton.appendChild(text);

            // Adjust styles to ensure the text and icon fit within the button
            drawButton.style.fontSize = '10px'; // Reduce the font size
            drawButton.style.padding = '3px 6px'; // Reduce the padding
            drawButton.style.width = 'auto';
            drawButton.style.whiteSpace = 'normal';
            drawButton.style.backgroundImage = 'none';
        }
    });








} else {
    // The URL does not contain "/species", so you can break or take any other action
    console.log("URL is not region. Breaking...");
    // You can add code here to handle the case where the URL is not correct.
}



