


// Define a regular expression pattern that matches the URL structure
// The pattern matches "upload" followed by two groups of numbers separated by slashes
const urlPattern = /\/upload\/\d+\/\d+$/;

// Check if the current URL matches the pattern
if (urlPattern.test(currentURL)) {

  console.log("URL is upload. Running the code...");




  // Create a Leaflet map and set the initial view
  var map = L.map('map-upload', {
    worldCopyJump: true,
    zoomControl: false, // default zoom control is on the left top.
    maxBounds: [
      [-90, -Infinity],
      [90, Infinity]
    ],
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




  var basemapsSwitcher = new L.basemapsSwitcher([
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
  ], { position: 'bottomleft' }).addTo(map);




  // Add the event listener to stop click event propagation
  basemapsSwitcher.getContainer().addEventListener('click', (e) => {
    e.stopPropagation();
  });

  
  var markerIcon = L.icon({
    iconUrl: '/static/img/markers/u-14.png',
    iconSize: [15, 15],
    // Add any additional icon options you need
  });



  var nearpoint = L.layerGroup(); // Create a layer group for markers

  map.on('zoomend', function () {
    var zoomLevel = map.getZoom();
    console.log(zoomLevel);

    if (zoomLevel > 6) {
      var northEast = map.getBounds().getNorthEast();
      var southWest = map.getBounds().getSouthWest();
      var apiUrl = `/api/internal/locations?query=box:${southWest.lat.toFixed(3)},${southWest.lng.toFixed(3)},${northEast.lat.toFixed(3)},${northEast.lng.toFixed(3)}`;

      console.log(apiUrl);

      fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
          nearpoint.clearLayers(); // Clear previous markers from the layer group
          var results = data.results;
          results.forEach(result => {
            var lat = parseFloat(result.lat).toFixed(3);
            var lng = parseFloat(result.lng).toFixed(3);
            var marker = L.marker([lat, lng], { icon: markerIcon, zIndexOffset: -1000 });

            marker.on('click', function (e) {
              onMarkerClick(e); // Call a new function when a marker is clicked
            });

            nearpoint.addLayer(marker); // Add marker to the layer group
          });

          if (!map.hasLayer(nearpoint)) {
            map.addLayer(nearpoint); // Add the layer group to the map if not already added
          }
        })
        .catch(error => {
          console.log('API Error:', error);
        });
    } else {
      if (map.hasLayer(nearpoint)) {
        map.removeLayer(nearpoint); // Remove the layer group from the map when zoom level is <= 6
      }
    }
  });






  function onMarkerClick(e) {
    // You can either copy the entire content of your existing map click event here,
    // or you could call the existing map click event handler passing the event as a parameter.
    map.fireEvent('click', e); // This will trigger the map click event handler.
  }






  //Geocoding plugin and search
  // Create a custom icon
  var searchIcon = L.icon({
    iconUrl: '/static/img/markers/q-14.png',
    iconSize: [15, 15], // size of the icon
  });
  // Initialize the geocoder control
  var geocoder = L.Control.geocoder({
    defaultMarkGeocode: false
  }).on('markgeocode', function (e) {
    // Remove any existing markers
    if (this._marker) {
      map.removeLayer(this._marker);
    }

    // Create and add a new marker on the map
    this._marker = L.marker(e.geocode.center, { icon: searchIcon }).bindPopup(e.geocode.name).addTo(map);

    // Zoom and center the map to the found location
    map.setView(e.geocode.center, 6);
  }).addTo(map);



  //Update coordinate box.
  // Function to check if coordinates are valid
  function validCoordinates(lat, lng) {
    var latValid = lat && !isNaN(lat) && lat >= -90 && lat <= 90;
    var lngValid = lng && !isNaN(lng) && lng >= -180 && lng <= 180;
    return latValid && lngValid;
  }

  // Function to handle map clicks
  function onMapClick(e) {
    var lat = e.latlng.lat.toFixed(3);
    var lng = e.latlng.lng.toFixed(3);

    if (validCoordinates(lat, lng)) {
      jQuery('#input-map-coords').val(lat + ',' + lng);
    } else {
      jQuery('#input-map-coords').val('');
    }
  }
  // Attach the click event to the map
  map.on('click', onMapClick);


  let marker;

  map.on('click', async function (e) {

    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    // Make a request to the OSM Nominatim API to get the address information
    const nominatimResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`);
    
    const nominatimData = await nominatimResponse.json();
    console.log(nominatimResponse);

    const country = nominatimData.address.country || '';
    const street = nominatimData.address.road || '';
    const postalCode = nominatimData.address.postcode || '';
    const fullAddress = nominatimData.display_name || '';


    const state = nominatimData.address.county || nominatimData.address.town || nominatimData.address.state || '';
    const city = nominatimData.address.province || nominatimData.address.municipality || nominatimData.address.city || nominatimData.address.region || nominatimData.address.state || '';

    jQuery('#loc-title').val(state + ', ' + city);

    // Remove previous marker, if any
    if (marker) {
      map.removeLayer(marker);
    }


    // Create a custom icon
    var customIcon = L.icon({
      iconUrl: '/static/js/img/marker-icon.png',
      iconSize: [15, 15], // size of the icon
    });

    // Create new marker with custom icon and add to map
    marker = L.marker(e.latlng, { icon: customIcon }).addTo(map);


    // Make a request to the GeoNames API to get elevation data
    const elevationResponse = await fetch(`https://secure.geonames.org/srtm1JSON?lat=${e.latlng.lat}&lng=${e.latlng.lng}&username=onrcrpk`);
    const elevationData = await elevationResponse.json();

    // Display elevation data from GeoNames API
    if (elevationData && elevationData.srtm1) {
      const elevation = elevationData.srtm1;

      jQuery('#loc-elevation').val(elevation);
    }

    // Store the current marker
    var currentMarker;

    // Function to add a marker on the map
    function addMarker(lat, lng) {
      if (currentMarker) {
        map.removeLayer(currentMarker);
      }
      currentMarker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

    }


    // Add a click event listener to the map
    map.on('click', function (e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;
      addMarker(lat, lng);
    });
    /* timePicker is from https://github.com/perifer/timePicker */
    jQuery('#recording-time').timePicker({ step: 30 });
    jQuery('#recording-date').Zebra_DatePicker({ direction: false, readonly_element: false, format: 'Y-m-d' });


  });

// Add this event listener somewhere in your code
document.getElementById('map-coords-display').addEventListener('click', function() {
  var coordsInput = document.getElementById('input-map-coords').value;
  var coordsArray = coordsInput.split(',');

  if (coordsArray.length === 2) {
    var lat = parseFloat(coordsArray[0].trim());
    var lng = parseFloat(coordsArray[1].trim());

    if (validCoordinates(lat, lng)) {
      var latlng = L.latLng(lat, lng);
      var syntheticEvent = { latlng: latlng };
      map.fireEvent('click', syntheticEvent);
    } else {
      alert('Invalid coordinates! Please enter valid coordinates.');
    }
  } else {
    alert('Invalid format! Please enter coordinates in the format: latitude,longitude');
  }
});




} else {
  console.log("URL does not upload. Skipping the code...");
}



