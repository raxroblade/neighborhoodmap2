// Declare function contain object info as a storage for json items
function locationInfo(info) {
	var self = this;
	self.name = info.name;
	self.location = info.location;
	self.photo = info.photos;
	self.contact = info.contact;
	self.id = info.id;
	self.categories = info.categories;
	self.address = info.location.formattedAddress;
}

function ViewModel() {
	var self = this;
	// Constructor creates a new map - only center and zoom are defined.
	self.map = new google.maps.Map(document.getElementById('map'), {
		center: {
			lat: 32.7761827,
			lng: -96.7995296
		},
		zoom: 11
	});
	self.infowindow = new google.maps.InfoWindow({
		content: document.getElementById('popupinfo')
	});
	// declare infowindow instances **
	self.largeInfowindow = new google.maps.InfoWindow();
	self.bounds = new google.maps.LatLngBounds();
	//
	autocomplete = new google.maps.places.Autocomplete((document.getElementById('places-search')), {
		types: ['(cities)']
	});
	self.places = new google.maps.places.PlacesService(self.map);
	google.maps.event.addListener(autocomplete, 'place_changed', searchBoxPlaces);
	// Using google street view
	self.streetViewService = new google.maps.StreetViewService();
	// defined radius for 50 miles
	self.radius = 50;
	// define the location array using knockout observable array
	self.locations = ko.observableArray([]);
	// define markers for each location using knockout obseravble array
	self.markers = ko.observableArray([]);
	// define filter input text using knockout observable function
	self.filter = ko.observable();
	// self.cityName = document.getElementById('places-search').value;
	// Declare object for Wiki
	self.wikiHeader = ko.observable(false);
	self.wikiErrors = ko.observable(false);
	self.wikiArray = ko.observableArray(false);
	// Declare object for NY time
	self.newsHeader = ko.observable(false);
	self.newsErrors = ko.observable(false);
	self.newsArray = ko.observableArray(false);

	function searchBoxPlaces() {
		var markers = self.markers();
		console.log(markers);
		//console.log(self.markers());
		var place = autocomplete.getPlace();
		if (place.length == 0) {
			window.alert('We did not find any places matching that search!');
		}
		var cityName = place.address_components[0].long_name;
		var url = "https://api.foursquare.com/v2/venues/search?client_id=NQM5SU1P2NFO2T05ICZFQBZDSZPHOGEDSSY2ABR4YOL1BZ43&client_secret=2ESR3ZZPIGATWXAIZ4UF5P2EPHHAITWVA4WEWYLNEGRINBRE&v=20180323&limit=5&near=" + cityName + "&query=bank";
		var fourSquareRequesttimeout = setTimeout(function() {
			self.wikiErrors("Wiki is currently under DDOS mode- site is not responding ");
		}, 8000);
		// getJson information from foursquare api
		$.getJSON(url, function(data) {
			// listLocation will hold the array value of 
			//each mapped object and its object property value >>(function items)
			var listLocations = $.map(data.response.venues, function(items) {
				return new locationInfo(items);
				//console.log(locationInfo);
			});
			//using knock out to store locations
			self.locations(listLocations);
			//console.log(self.locations);
			clearTimeout(fourSquareRequesttimeout);
		}).error(function(e) {
			$(".mapErrorHandling").show();
		});
		// Third party api Wiki for information in the city you selected or typed.
		self.wikiHeader(true);
		self.wikiErrors("");
		self.wikiArray.removeAll();
		var WikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + cityName + '&format=json&callback=wikiCallback';
		var WikiRequesttimeout = setTimeout(function() {
			self.wikiErrors("Wiki is currently under DDOS mode- site is not responding ");
		}, 8000);
		$.ajax({
			url: WikiUrl,
			dataType: "jsonp",
			success: function(response) {
				var ListArticle = response[1];
				ListArticle.forEach(function(article) {
					var url = 'http://en.wikipedia.org/wiki/' + article;
					self.wikiArray.push({
						url: url,
						article: article
					});
				});
				// this wikirequest time out has issue.	
				clearTimeout(WikiRequesttimeout);
			}
		});
	}
	// Create marker Object function which we will pass in a knockout location array property
	// when function is called to create a marker object location  
	self.markerOjbectCreated = function(location) {
		let marker = new google.maps.Marker({
			map: self.map,
			position: location.location,
			title: location.name,
			id: location.id,
			desc: location.desc,
			animation: google.maps.Animation.Drop,
			
		});
		return marker;
	};
	// creating object function allows to binding between the list and pop up info window
	self.selectedLocation = function(clickedLocation) {
		console.log(clickedLocation);
		if (clickedLocation instanceof locationInfo) {
			for (let i = 0; i < self.markers().length; i++) {
				// if the clicked name is matching with marker name then set it to marker
				if (clickedLocation.name == self.markers()[i].title) {
					clickedLocation = self.markers()[i];
				}
			}
		}
		console.log(clickedLocation);
		// Force marker unbounce
		self.toggleUnbounce(self.markers());
		//Marker bounce when venues's name clicked
		self.toggleBounce(clickedLocation);
		// Then popup window will opened up
		self.map.setZoom(13);
		self.populateInfoWindow(clickedLocation, self.largeInfowindow);
	};

	// Populate markers on map with this OF
	self.displayMarkersLocation = function(markers) {
		//console.log(markers);
		for (var i = 0; i < markers.length; i++) {
			markers[i].setMap(self.map);
			self.bounds.extend(markers[i].position);
		}
		self.map.fitBounds(self.bounds);
	};
	// when a filter click it will just show the markers being filter
	self.showMarker = function(marker) {
		marker.setMap(self.map);
		self.bounds.extend(marker.position);
		self.map.fitBounds(self.bounds);
	};
	// Hide markers
	self.hideMarkers = function(markers) {
		for (var i = 0; i < markers.length; i++) {
			markers[i].setMap(null);
		}
	};
	// Marker Bouncing Function
	self.toggleBounce = function(marker) {
		if (marker.getAnimation() !== null) {
			marker.setAnimation(null);
		} else {
			marker.setAnimation(google.maps.Animation.BOUNCE);
		}
	};
	// Marker unbounce Function
	self.toggleUnbounce = function(markers) {
		for (let i = 0; i < markers.length; i++) {
			if (markers[i].getAnimation() !== null) {
				markers[i].setAnimation(null);
			}
		}
	};
	self.populateInfoWindow = function(marker, infowindow) {
		// first we need to check to make sure the infowindow is not already opened on this marker.
		if (infowindow.marker != marker) { // if info window not set to marker then
			infowindow.setContent(''); // then use setContent function to html div and pass in marker title
			infowindow.marker = marker; //  set infowindow marker to marker
			// then use open method to open it
			// make sure the marker property is cleared if the infowindow is closed.
			// why? is it going to display on next window?
			infowindow.addListener('closeclick', function() {
				self.toggleUnbounce(self.markers());
				infowindow.setMarker = null; // using setMarker function to null to clear marker info.
			});
			// we need to instancitate the streetViewService method from google maps 
			// if we can't find exact location then define radius of 50 meter nearby area
			let streetViewService = new google.maps.StreetViewService();
			//let radius = 50;
			// In case the status is OK, which means the pano was found, compute the
			// position of the streetview image, then calculate the heading, then get a
			// panorama from that and set the options
			let getStreetView = function(data, status) {
				if (status == google.maps.StreetViewStatus.OK) {
					let nearStreetViewLocation = data.location.latLng; // load geometry library
					let heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);
					infowindow.setContent('<div>' + '<h3>' + marker.title + '</h3>' + '</div>' + '<div id="pano"></div>' + '<div>' + '<p>' + marker.address + '</p>' + '<p>' + marker.desc + '</p>' + '</div>');
					let panoramaOptions = { // set panarama option
						position: nearStreetViewLocation,
						pov: {
							heading: heading,
							pitch: 30
						}
					};
					let panorama = new google.maps.StreetViewPanorama( // create panarama image and pass it into id pano
						document.getElementById('pano'), panoramaOptions);
				} else {
					infowindow.setContent('<div>' + '<h3>' + marker.title + '</h3>' + '</div>' + '<div>No Street View Found</div>');
				}
			};
			// Use streetview service to get the closest streetview image within
			// 50 meters of the markers position, pass into this function with marker position
			// radius and function getStreetView to the getPanoramaByLocation function.
			self.streetViewService.getPanoramaByLocation(marker.position, self.radius, getStreetView);
			// Open the infowindow on the correct marker.
			infowindow.open(self.map, marker);
		}
	};
	// Removed the previous markers and only show the current search markers.
	self.clearMarkers = function(markers) {
		let bounds = self.bounds;
		for (var i = 0; i < markers.length; i++) {
			if (markers[i]) {
				markers[i].setMap(null);
			}
		}
		self.markers.splice(0, 5);
	};
	// Text filtering items
	self.filteredBank = ko.computed(function() {
		var filter = self.filter();
		var startsWith = false;
		if (!filter) {
			self.displayMarkersLocation(self.markers());
			return self.locations();
		} else {
			self.hideMarkers(self.markers());
			return ko.utils.arrayFilter(self.markers(), function(marker) {
				startsWith = marker.title.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
				if (startsWith) {
					self.showMarker(marker);
					console.log(marker);
					return true;
				}
			});
		}
	}, self);
	self.mapLoading = ko.computed(function() {
		var locations = self.locations();
		//console.log(locations);
		let markers = self.markers();
		//console.log(markers);
		let largeInfowindow = self.largeInfowindow;
		let bounds = self.bounds;
		let clickMarkerWindow = function(marker, largeInfowindow) {
			marker.addListener('click', function() {
				self.toggleUnbounce(self.markers());
				self.toggleBounce(this);
				self.map.fitBounds(self.bounds);
				self.populateInfoWindow(this, largeInfowindow);
			});
		};
		self.clearMarkers(markers);
		// now we use knock out array to create array when the map is loading
		for (let i = 0; i < locations.length; i++) {
			var marker = self.markerOjbectCreated(locations[i]);
			// store markers in knockout marker arrray
			self.markers().push(marker);
			// allow popup window to open when marker is clicking with OF defined aboveed
			clickMarkerWindow(marker, largeInfowindow);
			// recenter bound map to that location 
			bounds.extend(self.markers()[i].position);
			self.map.setCenter(self.markers()[i].position);
			self.map.setZoom(13);
		}
		// Extend map to cover all markers 
		self.map.fitBounds(self.bounds);
		//console.log(self.markers());
		$(window).resize(function() {
			google.maps.event.addDomListener(window, 'resize', function() {
				self.map.fitBounds(bounds);
			});
		});
	}, self);
	// call maploading object.
	self.mapLoading();
}
// Call back funtion to load initMap 
function initMap() {
	ko.applyBindings(new ViewModel());
}
// Google Map Error Handler
function mapErrorHandling() {
	$(".mapErrorHandling").show();
}
























