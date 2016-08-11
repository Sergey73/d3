(function () {
  L.mapbox.accessToken = 'pk.eyJ1Ijoic2VyZ2V5NzMiLCJhIjoiY2lyM3JhYnAxMDAyeGh5bnFmczh3cTRseiJ9.KVe54Q2NCigy3J0j3didAA';
  // подложка mapbox
  var map = L.mapbox.map('map', 'mapbox.dark')
    .setView([55.87685, 37.43729], 11);

  // color reference from color brewer
    mapBrew = ['rgb(255,255,204)','rgb(217,240,163)','rgb(173,221,142)','rgb(120,198,121)','rgb(65,171,93)','rgb(35,132,67)','rgb(0,90,50)'],
    // population density range used for choropleth and legend
    mapRange = [ 5000, 1000, 800, 500, 300, 100, 0 ]; 

  // map legend for population density
  var legend = L.mapbox.legendControl( { position: "bottomleft" } ).addLegend( getLegendHTML() ).addTo(map);
    // popup for displaying state census details
  var popup = new L.Popup({ autoPan: false, className: 'statsPopup' });
    // layer for each state feature from geojson
  var closeTooltip;

  // добавляем регионы на карту
  var layer = L.geoJson(null, {
    style: getStyle,
    onEachFeature: onEachFeature
  });
  map.addLayer(layer);

  // стиль регионов
  function getStyle(feature) {
    return {
      weight: 2,
      opacity: 0.1,
      color: 'black',
      fillOpacity: 0.85,
      fillColor: getDensityColor(feature.properties.people.home)
    };
  }

  // получить цвет в зависимости от количества проживания
  function getDensityColor(d) {
    var colors = [].slice.call(mapBrew).reverse(); // creates a copy of the mapBrew array and reverses it
    var range = mapRange;

    return  d > range[0] ? colors[0] :
        d > range[1] ? colors[1] :
        d > range[2] ? colors[2] :
        d > range[3] ? colors[3] :
        d > range[4] ? colors[4] :
        d > range[5] ? colors[5] :
        colors[6];
  }

  function onEachFeature(feature, layer) {
    layer.on({
      mousemove: mousemove
      // mouseout: mouseout,
      //click: zoomToFeature
    });
  }

  function mousemove(e) {    
    var layer = e.target;
  }


  // загружаем данные
  d3.queue()
    .defer(d3.json, "/data/moscow.json")
    .await(ready);

  function ready(error, map) {
    if (error) return console.dir(error);
    var moscowData = topojson.feature(map, map.objects.moscowAfterSimplify).features;

    // layer.eachLayer(function(e){
    // })
    // createLegend();

    // Отображение географии проживания и работы посетителей по каждому ТЦ в виде тепловой карты
    d3.csv("./data/geoLivingWorkingMos.csv", function(error, data) { 
      preParceData("dt","%Y-%m-%d",['zid_oktmo','gender', 'age', 'customers_cnt_home', 'customers_cnt_work'], data);

      // преобразование данных с попошью библиотеки crossfilter
      var geoDataCross = crossfilter(data);
      var allGeoData = geoDataCross.groupAll();
      
      // dimension по торговым центрам
      var dataByRegion = geoDataCross.dimension(function(d) { return d.tid;}); 

      // создаем данные по ТЦ
      var himkiData = createShopArr(dataByRegion, 'Himki');
      var metropolisData = createShopArr(dataByRegion, 'Metropolis');
      var shukaData = createShopArr(dataByRegion, 'Shuka');
      
      function createShopArr(dimensionData, shop) {
        dimensionData.filter(shop);
        var result = dataByRegion.top(Infinity);
        dimensionData.filter(null);
        return result;
      }


      var himkiObj = getSumPeopleByOktmo(himkiData);
      
      function getSumPeopleByOktmo (data) {
        var sumPeople = {};
        var shopCross = crossfilter(data);
        var allShopData = geoDataCross.groupAll();

        var dataByRegion = shopCross.dimension(function(d) { return d.zid_oktmo;});
        var regionGroup = dataByRegion.group()
          .reduceSum(function(d){
            if (!sumPeople[d.zid_oktmo]) {
              sumPeople[d.zid_oktmo] = { work: 0, home: 0 };
            } 
            sumPeople[d.zid_oktmo]['home'] += d.customers_cnt_home;
            sumPeople[d.zid_oktmo]['work'] += d.customers_cnt_work;

            return +d.customers_cnt_home;
          });
          // вызвать, иначе reduceSum не сработает
          regionGroup.top(1);
        return sumPeople;
      }

      // максимальное значение в регионе 
      var a = 0;
      for(key in himkiObj) {
        himkiObj[key].home > a ? a = himkiObj[key].home : null 
      }
      // end

      moscowData.forEach(function (regionData) {
        var region = regionData.properties;
        var code = region.oktmoCode;
        region['people'] = himkiObj[region.oktmoCode];
      });

      layer.addData(moscowData);

      // // создаем группы по дням
      // var daysGroup = dateByDay.group(d3.time.day)
      // // считаем количество людей посетивших торговый центр за день
      //   .reduceSum(function(d) {
      //   return +d.customers_cnt;
      // });
    });
  }

  function getLegendHTML() {
    var grades = Array.prototype.slice.call(mapRange).reverse(), // creates a copy of ranges and reverses it
      labels = [],
      from, to;
    // color reference from color brewer
    var brew = mapBrew;

    for (var i = 0; i < grades.length; i++) {
      from = grades[i];
      to = grades[i + 1];

      labels.push(
        '<i style="background:' + brew[i] + '"></i> ' +
        from + (to ? '&ndash;' + to : '+'));
    }

    return '<span>People per square km</span><br>' + labels.join('<br>');
  }

  // function createLegend () {
  //   var CLASS_COUNT = 10;
  //   var startColor = "white";
  //   var endColor = "red";
  //   var gradient = d3.interpolateRgb(startColor, endColor);
  //   var svg = d3.select(".legend").append('svg')
  //     .attr('width', '100')
  //     .attr('heigth', '200');
  // }

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

    // функция преобразования форматов данных
  function preParceData(dateColumn, dateFormat, usedNumColumns, data){
    var parse = d3.time.format(dateFormat).parse;
    data.forEach(function(d) {
      d[dateColumn] = parse(d[dateColumn]);
      for (var i = 0, len = usedNumColumns.length; i < len; i += 1) {
            d[usedNumColumns[i]] = +d[usedNumColumns[i]];
      }
    });
  }

  map.on('click', function(e) {
    alert(e.latlng);
  });
})();