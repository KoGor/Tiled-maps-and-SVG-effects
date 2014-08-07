var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	stamenUrl = 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png',
	attrib = '&copy; Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> | <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	main = L.tileLayer(stamenUrl, {maxZoom: 18, attribution: attrib}),
	map = new L.Map('map', {
		layers: [main],
		center: [55.7501, 37.6687],
		zoom: 11 
	}),
	overlay = L.tileLayer(osmUrl).addTo(map);
	overlay.getContainer().style.display = "none";
	main.getContainer().style.filter = "url(#sepia)";

//Convert Leaflet geometries to D3 geometries
function projectPoint(x, y) {
	var point = map.latLngToLayerPoint(new L.LatLng(y, x));
	this.stream.point(point.x, point.y);
};

//Initialize SVG layer in Leaflet (works for leaflet-0.7.3)
map._initPathRoot()

var transform = d3.geo.transform({point: projectPoint}),
	path = d3.geo.path().projection(transform);

var svg = d3.select(".leaflet-overlay-pane").select("svg"),
	// add "leaflet-zoom-hide" class to SVG container for turning off zoom
	defs = svg.append("defs"),
	filterBlur = defs.append("filter").attr("id", "blur"),
	filterGrayscale = defs.append("filter").attr("id", "grayscale"),
	clipPath = defs.append("mask").attr("id", "clipMask");

//Blur filter params
filterBlur.append("feGaussianBlur").attr("stdDeviation", 2);
filterGrayscale.append("feColorMatrix").attr("type", "saturate").attr("values", 0);

//Leaflet.draw stuff
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
	draw: {
		position: 'topleft',
		polygon: {
			title: 'Draw a sexy polygon!',
			allowIntersection: false,
			drawError: {
				color: '#b00b00',
				timeout: 1000
			},
			shapeOptions: {
				color: '#fff',
				weight: 10,
				opacity: 0.8,
				fill: false
			},
			showArea: true
		},
		rectangle: {
			shapeOptions: {
				color: '#fff',
				weight: 10,
				opacity: 0.8,
				fill: false
			}
		},		
		polyline: false,
		marker: false,
		circle: false
	},
	edit: {
		featureGroup: drawnItems
	}
});

map.addControl(drawControl);

map.on('draw:created', function (e) {
	var type = e.layerType,
	layer = e.layer;

	drawnItems.addLayer(layer);

	var geoJSONlayer = layer.toGeoJSON();
	geoJSONlayer.properties.id = 'l' + layer._leaflet_id;

	clipPath.append("path")
	  .attr("id", 'l' + layer._leaflet_id)
	  .datum(geoJSONlayer)
	  .attr("d", path)
	  .attr("fill", "white")
	  .attr("opacity", 0.95); //change opacity to control masking

	clip();
});

map.on('draw:deleted', function (e) {
	var layers = e.layers;
	layers.eachLayer(function (layer) {
		clipPath.select("#l" + layer._leaflet_id).remove();
	});
	clip();
});

map.on('draw:edited', function (e) {
	var layers = e.layers;
	layers.eachLayer(function (layer) {
		var geoJSONlayer = layer.toGeoJSON();

		clipPath.select("#l" + layer._leaflet_id)
		  .datum(geoJSONlayer)
		  .attr("d", path);
	});
	clip();
});

//Clipping or masking change code accordingly
function clip() {
	var clippingPaths =  clipPath.selectAll("path");
	clippingPaths.attr("d", path);

	if (clippingPaths.size() > 0) {
		overlay.getContainer().style.display = "inline";
		overlay.getContainer().style.mask = 'url(#clipMask)';
	} else {
		overlay.getContainer().style.display = "none";
		overlay.getContainer().style.mask = 'none';
	};
};

//Some extra controls

var filterDropdown = L.Control.extend({
	options: {
		position: 'topright'
	},
	
	onAdd: function (map) {
    	// create the control container with a particular class name
		var container = L.DomUtil.create('div', 'dropdown-control');
		
		// ... initialize other DOM elements, add listeners, etc.
		container.innerHTML = '<label>filter: <select><option selected>none</option><option>grayscale</option><option>saturate</option><option>hue_rotate</option><option>luminance_mask</option></select></label>';
		L.DomEvent
		.on(container.firstChild.firstElementChild, 'change', function(e) {
			var filterStyle = main.getContainer().style.filter;
			if (this.value != 'none') {
				overlay.getContainer().style.filter = 'url(#'+ this.value + ')';
			} else { overlay.getContainer().style.filter = 'none';};
		});
		
		return container;
    }
});
	
map.addControl(new filterDropdown());

var patternDropdown = L.Control.extend({
	options: {
		position: 'topright'
	},
	
	onAdd: function (map) {
		// create the control container with a particular class name
		var container = L.DomUtil.create('div', 'dropdown-control');

		// ... initialize other DOM elements, add listeners, etc.
		container.innerHTML = '<label>pattern: <select><option selected>none</option><option>diagonalHatch</option><option>diagonalHash</option></select></label>';
		L.DomEvent
		.on(container.firstChild.firstElementChild, 'change', function(e) {
			if (this.value != 'none') {
				drawControl.setDrawingOptions({
					polygon: {
						shapeOptions: {
							color: '#fff',
							weight: 10,
							opacity: 0.8,
							fill: true,
							fillOpacity: 0.5,
							fillColor: 'url(#'+ this.value + ')'
						},
					},				
					rectangle: {
						shapeOptions: {
							color: '#fff',
							weight: 10,
							opacity: 0.8,
							fill: true,
							fillOpacity: 0.5,
							fillColor: 'url(#'+ this.value + ')'
						}
					}
				})
			} else {
				drawControl.setDrawingOptions({
					polygon: {
						shapeOptions: {
							color: '#fff',
							fill: false
						},
						showArea: true
					},
					rectangle: {
						shapeOptions: {
							color: '#fff',
							weight: 10,
							opacity: 0.8,
							fill: false
						}
					} 	        	
				});
			};
		});

		return container;
	}
});

map.addControl(new patternDropdown());

var blurControl = L.Control.extend({
	options: {
		position: 'topright'
	},
	
	onAdd: function (map) {
        // create the control container with a particular class name
        var container = L.DomUtil.create('div', 'blur-control');
        
        // ... initialize other DOM elements, add listeners, etc.
        container.innerHTML = '<label><input type="checkbox" name="blur" value="clear">BLUR</label>';
        L.DomEvent
        .on(container.firstChild.firstElementChild, 'change', function(e) {
        	if (this.value == 'clear') {
        		svg.selectAll("g").selectAll('path').attr("filter", "url(#blur)");
        		this.value = 'blured';
        	} else {
        		svg.selectAll("g").selectAll('path').attr("filter", "none");
        		this.value = 'clear';
        	};
        	clip();
        });
        
        return container;
    }
});
	
map.addControl(new blurControl());

//Update on move and viewreset
map.on('move', clip);
map.on('viewreset', clip);
