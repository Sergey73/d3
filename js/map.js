(function () {
  L.mapbox.accessToken = 'pk.eyJ1Ijoic2VyZ2V5NzMiLCJhIjoiY2lyM3JhYnAxMDAyeGh5bnFmczh3cTRseiJ9.KVe54Q2NCigy3J0j3didAA';
  // подложка mapbox
  var map = L.mapbox.map('map', 'mapbox.dark')
    .setView([55.87685, 37.43729], 11);

  var layer = L.geoJson(null, {style: { color: 'green', weight: 1}});
  map.addLayer(layer);
  // загружаем данные
  d3.queue()
    .defer(d3.json, "/data/moscow.json")
    .await(ready);

  function ready(error, map) {
    if (error) return console.dir(error);

    var moscowData = topojson.feature(map, map.objects.moscowAfterSimplify);
    layer.addData(moscowData);

    // layer.eachLayer(function(e){
    // })
    createLegend();

      // Отображение географии проживания и работы посетителей по каждому ТЦ в виде тепловой карты
    d3.csv("./data/geoLivingWorkingMos.csv", function(error, data) { 
      preParceDann("dt","%Y-%m-%d",['zid_oktmo','gender', 'age', 'customers_cnt_home', 'customers_cnt_work'], data);

      // преобразование данных с попошью библиотеки crossfilter
      var geoDataCross = crossfilter(data);
      var allGeoData = geoDataCross.groupAll();
      
      var dataByRegion = geoDataCross.dimension(function(d) { return d.zid_oktmo;}); 
      // var geoHimki = dataByShops.filter('Himki');
      var regionGroup = dataByRegion.group();
      debugger

      // // создаем группы по дням
      // var daysGroup = dateByDay.group(d3.time.day)
      // // считаем количество людей посетивших торговый центр за день
      //   .reduceSum(function(d) {
      //   return +d.customers_cnt;
      // });
    });
  }

  function createLegend () {
    var CLASS_COUNT = 10;
    var startColor = "white";
    var endColor = "red";
    var gradient = d3.interpolateRgb(startColor, endColor);
    var svg = d3.select(".legend").append('svg')
      .attr('width', '100')
      .attr('heigth', '200');
  }

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