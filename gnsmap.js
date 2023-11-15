
// Define the expected URL path
const expectedPath3 = "/genus";

// Check if the current URL contains the expected path
if (currentURL.includes(expectedPath3)) {
  console.log("URL is correct. Running the code...");




  // Create a Leaflet map and set the initial view
  var map = L.map('gnsmap', {
    worldCopyJump: true,
    zoomControl: false, // default zoom control is on the left top.
    worldCopyJump: true, // Enable world copy jump
    wheelPxPerZoomLevel: 120 // Default is 60, try doubling to decrease sensitivity
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
    maxZoom: 17, // Adjust maxZoom as needed
    opacity: 1
  });




  new L.basemapsSwitcher([
    {
      layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
      }).setOpacity(1).addTo(map),
      maxZoom: 17,
      icon: '/static/js/img/terrain.jpeg', // Correct path to the icon
      name: 'WorldStreet'
    },
    {
      layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
      }).setOpacity(0.9),
      icon: '/static/js/img/topo.jpg', // Correct path to the icon
      name: 'Topographic'
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

controlElement.addEventListener('mouseenter', function() {
    controlElement.style.display = 'flex';
    controlElement.style.flexDirection = 'column';
});

controlElement.addEventListener('mouseleave', function() {
    controlElement.style.flexDirection = ''; // Reset to default or 'row' if you want to set it explicitly.
});


  let geojsonLayer; // Declare the variable at the top level
  // Initialize map here (assuming 'map' is already defined)
  let legend;
  const markerGroup = L.layerGroup();







  // Function to load the GeoJSON based on the genus in the URL
  function loadGenusFromUrl() {
    const path = window.location.pathname; // Get the path from the URL
    const pathParts = path.split('/'); // Split the path into parts

    // Find the position of "genus" in the parts, and get the value after it
    const genusIndex = pathParts.indexOf('genus');
    if (genusIndex !== -1 && genusIndex + 1 < pathParts.length) {
      const selectedValue = pathParts[genusIndex + 1]; // Get the genus value
      // Update the URL construction based on the working path
      const selectedGeoJSONUrl = `http://localhost/static/js/${selectedValue.toLowerCase()}.geojson.zip`;
      loadGeoJSON(selectedGeoJSONUrl); // Load the GeoJSON
    }
  }

  // Execute the function when the page loads
  window.onload = loadGenusFromUrl;










  // Add a click event listener to the button to toggle the layer visibility
  document.getElementById('toggleLayerButton').addEventListener('click', function () {
    if (geojsonLayer && map.hasLayer(geojsonLayer)) {
      // Layer is currently visible, so remove it
      map.removeLayer(geojsonLayer);
    } else {
      // Layer is not visible, so add it back to the map
      geojsonLayer.addTo(map);
      geojsonLayer.bringToBack();


    }
  });

  // Add an event listener to the button to toggle the marker layer visibility
  document.getElementById('toggleMarkerButton').addEventListener('click', function () {
    if (markerLayer && map.hasLayer(markerLayer)) {
      // Marker layer is currently visible, so remove it
      map.removeLayer(markerLayer);
    } else {
      // Marker layer is not visible, so add it back to the map
      markerLayer.addTo(map);
    }
  });





















  let markerLayer = L.layerGroup();



  // Function to fetch data for a specific page
  function fetchDataForPage(selectedGenus, page) {
    const apiUrl = `https://xeno-canto.org/api/2/recordings?query=gen:"=${selectedGenus}"&page=${page}`;
    console.log(apiUrl);
    return fetch(apiUrl).then(response => response.json());
  }

  // Function to get the maximum number of pages
  function getMaxPages(selectedGenus) {
    const apiUrl = `https://xeno-canto.org/api/2/recordings?query=gen:"=${selectedGenus}"&page=1`;
    return fetch(apiUrl)
      .then(response => response.json())
      .then(data => data.numPages);
  }

  // Function to check if coordinates are valid
  function isValidCoordinates(lat, lon) {
    lat = parseFloat(lat);
    lon = parseFloat(lon);

    return !isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  }

  const colorScale = [
    { h: 0, s: 100, l: 50 },    // red
    { h: 29, s: 100, l: 35 },   // Brownish-Orange
    { h: 30, s: 100, l: 50 },   // orange
    { h: 60, s: 100, l: 50 },   // yellow
    { h: 100, s: 100, l: 39 },   // green
    { h: 195, s: 100, l: 50 },   // blue
    { h: 240, s: 100, l: 35 },   // purple
  ];



  // Function to map species to a color based on their position within the genus
  function mapSpeciesToColor(species, genus, genusMap) {
    if (genusMap[genus]) {
      const speciesList = genusMap[genus];

      // Creating full species name by combining genus and species
      const fullSpeciesName = `${genus} ${species}`.toLowerCase();
      const speciesIndex = speciesList.findIndex(s => s.toLowerCase() === fullSpeciesName);

      if (speciesIndex >= 0) {
        const totalSpecies = speciesList.length;
        const segment = (totalSpecies - 1) / (colorScale.length - 1);
        const lowerIndex = Math.floor(speciesIndex / segment);
        const upperIndex = Math.min(lowerIndex + 1, colorScale.length - 1);
        const t = (speciesIndex - lowerIndex * segment) / segment;

        const h = colorScale[lowerIndex].h + (colorScale[upperIndex].h - colorScale[lowerIndex].h) * t;
        const s = colorScale[lowerIndex].s + (colorScale[upperIndex].s - colorScale[lowerIndex].s) * t;
        const l = colorScale[lowerIndex].l + (colorScale[upperIndex].l - colorScale[lowerIndex].l) * t;

        return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
      }
    }

    console.log(`Species with default color (grey): ${species}`);
    return 'hsl(0, 0%, 75%)'; // Default to grey for species not found
  }




  // Function to get genus from the URL
  function getGenusFromURL() {
    const path = window.location.pathname; // Get the current URL path
    const pathParts = path.split('/'); // Split the path into parts

    // Check if the path includes 'genus'
    const genusIndex = pathParts.indexOf('genus');
    if (genusIndex !== -1 && genusIndex + 1 < pathParts.length) {
      return pathParts[genusIndex + 1]; // Return the part after 'genus'
    }

    return null;
  }

  // Call your function with the genus from the URL
  const genus = getGenusFromURL();
  if (genus) {
    fetchAndDisplayMarkers(genus);
  } else {
    console.error('Genus not found in URL');
  }

  function getDarkerHSLColor(h, s, l, reductionAmount = 15) {
    return `hsl(${h}, ${s}%, ${Math.max(l - reductionAmount, 0)}%)`;
}


  const markers = [];
  // Function to create a circle marker with the same size and style
  function createCircleMarker(lat, lng, color) {
    const radius = 6.5; // Set the desired radius
    const hslMatch = color.match(/hsl\((\d+), (\d+)%, (\d+)%\)/);
    const borderColor = hslMatch ? getDarkerHSLColor(...hslMatch.slice(1, 4)) : 'black';

    const marker = L.circleMarker([lat, lng], {
        radius: radius,
        fillColor: color,
        color: borderColor,
        weight: 2,
        fillOpacity: 1,
    });

    return marker;
}


// Helper function to group recordings by location
function groupRecordingsByLocation(recordings) {
  const locationMap = new Map();
  recordings.forEach((item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lng);
    if (!isNaN(lat) && !isNaN(lng) && isValidCoordinates(lat, lng)) {
      const key = `${lat},${lng}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, []);
      }
      locationMap.get(key).push(item);
    }
  });
  return locationMap;
}
let currentAudioElement = null; // Declare this at the beginning of your script

function handlePopupContent(e, id, originalContent) {
    fetch(`https://xeno-canto.org/api/internal/ajax-player?nr=${id}`)
        .then(response => response.json())
        .then(data => {
            const contentContainer = document.createElement("div");
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
            
            stopButton.addEventListener('click', () => {
                audioElement.pause();
                audioElement.currentTime = 0;
                playButton.style.display = "";
                pauseButton.style.display = "none";
            });
            
            audioElement.addEventListener('timeupdate', () => {
                const percent = (audioElement.currentTime / audioElement.duration) * 100;
                progressBar.style.width = `${percent}%`;
            });
            
            e.popup.setContent(contentContainer);
            
            audioElement.addEventListener('canplaythrough', function () {
                contentContainer.querySelector('.jp-seek-bar').addEventListener('click', function (event) {
                    var offsetX = event.pageX - this.getBoundingClientRect().left;
                    var clickedValuePercentage = (offsetX / this.offsetWidth) * 100;
                    var newTime = (clickedValuePercentage / 100) * audioElement.duration;
                    if (!isNaN(newTime) && newTime >= 0 && newTime <= audioElement.duration) {
                        audioElement.currentTime = newTime;
                    }
                });
            });
        })
        .catch(error => {
            console.error('Error fetching data: ', error);
            e.popup.setContent("Failed to load content");
        });
    
    e.target.once('popupclose', function() {
        e.popup.setContent(originalContent);
        if (currentAudioElement) {
            currentAudioElement.pause();
            currentAudioElement.currentTime = 0;
        }
    });
}


  // Function to fetch data from the API and add markers to the map for all pages
  async function fetchAndDisplayMarkers(selectedGenus) {
    // Show the loading message

    // Fetch the genusioc.json file here
    fetch('/static/js/genusioc.json')
      .then(response => response.json())
      .then(genusMap => {
        if (genusMap[selectedGenus]) {
          if (markerLayer) {
            markerLayer.clearLayers(); // Clear existing markers if they exist
          } else {
            markerLayer = L.layerGroup(); // Initialize markerLayer if it doesn't exist
          }

          
          getMaxPages(selectedGenus).then(async (maxPages) => {
            for (let page = 1; page <= maxPages; page++) {
              const data = await fetchDataForPage(selectedGenus, page);
        
              // Group recordings by location
              const locationMap = groupRecordingsByLocation(data.recordings);
        
              locationMap.forEach((recordings, key) => {
                const [lat, lng] = key.split(',').map(coord => parseFloat(coord));
                const color = mapSpeciesToColor(recordings[0].sp, selectedGenus, genusMap);
        
                // Create a circle marker
                const marker = createCircleMarker(lat, lng, color);
                marker.addTo(markerLayer);
        
                // Generate popup content
// Generate popup content
if (recordings.length > 1) {
  let popupContent = '';
  recordings.forEach((item, index) => {
    const color = mapSpeciesToColor(item.sp, selectedGenus, genusMap); // get marker color
    popupContent += `<div style="display: flex; align-items: center;">
                       <span style="display: inline-block; width: 14px; height: 14px; margin-right: 5px; background-color: ${color}; border-radius: 50%;"></span>
                       <a href="#" class="species-link" data-id="${item.id}">
                         <b>ID: ${item.id}</b> - ${item.en}
                       </a>
                     </div>`;
  });
  marker.bindPopup(popupContent);
  
  marker.on('popupopen', (e) => {
    const originalContent = e.popup.getContent();
    e.popup._contentNode.querySelectorAll('.species-link').forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const id = event.currentTarget.getAttribute('data-id');
        handlePopupContent(e, id, originalContent);
      });
    });
  });
} else {
                  marker.on('popupopen', (e) => {
                    handlePopupContent(e, recordings[0].id);
                  });
                  marker.bindPopup("Loading content...");
                }
              });
        
              // Add the marker layer to the map
              if (!map.hasLayer(markerLayer)) {
                markerLayer.addTo(map);
              }
            }
          });
        }
      });
  }







  // Function to load and add GeoJSON data to the map from a ZIP archive
  function loadGeoJSON(geoJSONZipUrl) {
    fetch(geoJSONZipUrl)
      .then(response => response.arrayBuffer())
      .then(data => {
        // Create a JSZip instance and load the ZIP data
        const zip = new JSZip();
        return zip.loadAsync(data);
      })
      .then(zip => {
        // Assuming there's only one GeoJSON file in the ZIP archive
        const geoJSONFile = Object.values(zip.files)[0];

        // Read the GeoJSON file and parse it
        return geoJSONFile.async('string');
      })
      .then(geoJSONString => JSON.parse(geoJSONString))
      .then(data => {
        // Calculate the maximum "speciescou" value
        const maxSpeciesCount = Math.max(
          ...data.features.map(feature => feature.properties.speciescou)
        );

        // Create a color scale from light purple to a high-contrast shade of purple
        const colorScale = chroma.scale(['#f2e8ff', '#6e00c2']).domain([0, maxSpeciesCount]);

        function getColor(speciescou) {
          const color = colorScale(speciescou).hex();
          return color;
        }


  

        // Function to style the GeoJSON features
        function style(feature) {
          return {
            fillColor: getColor(feature.properties.speciescou),
            weight: 0.5,
            opacity: 0.2,
            color: 'black',
            dashArray: '1',
            fillOpacity: 0.75
          };
        }

        // Remove the existing GeoJSON layer (if any)
        if (geojsonLayer) {
          map.removeLayer(geojsonLayer);
        }

        // Create the GeoJSON layer
        geojsonLayer = L.geoJSON(data, {
          style: style,
          onEachFeature: function (feature, layer) {
            // Add a pop-up with speciescou value
            layer.bindPopup('Species Count: ' + feature.properties.speciescou);
          }
        });

        // Add the GeoJSON layer to the map
        geojsonLayer.addTo(map);

        // Check if the marker layer exists and add it back to the map
        if (markerLayer) {
          markerLayer.addTo(map);
        }

        // Fit the map bounds to the GeoJSON layer
        map.fitBounds(geojsonLayer.getBounds());

      });

  }



































} else {
  // The URL does not contain "/species", so you can break or take any other action
  console.log("URL is not genus. Breaking...");
  // You can add code here to handle the case where the URL is not correct.
}
