(function () {
	L.mapbox.accessToken = 'pk.eyJ1Ijoic2VyZ2V5NzMiLCJhIjoiY2lyM3JhYnAxMDAyeGh5bnFmczh3cTRseiJ9.KVe54Q2NCigy3J0j3didAA';
	var map = L.mapbox.map('map', 'mapbox.streets')
	    .setView([55.87685, 37.43729], 11);

	// markers
	var metropolis = createMarker({coords: [37.496942, 55.823328], title: 'ТРЦ Метрополис'}).addTo(map);
	var himki = createMarker({coords: [37.396753, 55.911161], title: 'ТРЦ Мега Химки'}).addTo(map);
	var shuka = createMarker({coords: [37.464794, 55.809588], title: 'ТРЦ Щука'}).addTo(map);
	// end markers

	function createMarker (obj) {
		return L.mapbox.featureLayer({
		    type: 'Feature',
		    geometry: {
		        type: 'Point',
		        coordinates: obj.coords
		    },
		    properties: {
		        title: obj.title,
		        'marker-color': '#f86767'
		    }
		});
	}

	map.on('click', function(e) {
		alert(e.latlng);
	});
})();