(function () {
  var legend, 
    map,
    closeTooltip,
    mapRange,
    mapBrew,
    popup,
    createdLayer,
    shopsData,
    selectedShop,
    moscowData,
    regionLayer;

  init();

  function init () {
    L.mapbox.accessToken = 'pk.eyJ1Ijoic2VyZ2V5NzMiLCJhIjoiY2lyM3JhYnAxMDAyeGh5bnFmczh3cTRseiJ9.KVe54Q2NCigy3J0j3didAA';
    // подложка mapbox
    map = L.mapbox.map('map', 'mapbox.dark')
      .setView([55.87685, 37.43729], 11);

    // данные по ТЦ
    shopsData = [
      {coords: [55.911161, 37.396753], title: 'ТРЦ Мега Химки', name: 'himki'},
      {coords: [55.823328, 37.496942], title: 'ТРЦ Метрополис', name: 'metropolis'},
      {coords: [55.809588, 37.464794], title: 'ТРЦ Щука', name: 'shuka'}
    ];

    // цвет численности людей
    mapBrew = [
      'rgb(255,255,204)',
      'rgb(217,240,163)',
      'rgb(173,221,142)',
      'rgb(120,198,121)',
      'rgb(65,171,93)',
      'rgb(35,132,67)',
      'rgb(0,90,50)'
    ],
    
    // диапазон плотности людей для легенды
    mapRange = [ 5000, 1000, 800, 500, 300, 100, 0 ]; 

    // легенда
    legend = L.mapbox.legendControl({position: 'bottomleft'}).addLegend(createLegend()).addTo(map);
    
    // popup с данными о регионе
    popup = new L.Popup({ autoPan: false, className: 'statsPopup' });

    // значение по умолчанию  отображения географии людей
    createdLayer = 'home';

    // ТЦ по умолчанию 
    selectedShop = 'himki';

    createGeoJsonLayer();

    // загружаем данные о регионах 
    d3.queue()
      .defer(d3.json, '/data/moscow.json')
      .await(ready);

    // добавление торговых центров на карту
    createShopMarker(shopsData);
    setEventOnRegionLayer();
  }

  function createGeoJsonLayer () {
     // добавляем регионы на карту
    regionLayer = L.geoJson(null, {
      style: getStyle,
      onEachFeature: onEachFeature
    });
    map.addLayer(regionLayer);
  }

  function setEventOnRegionLayer() {
    d3.selectAll("input[type=radio][name=styleStates]")
      .on("change", function() {
        var elem = d3.select(this);
        createdLayer = elem.property("value");
        updateLayer();
      });
  }

  function updateLayer () {
    map.removeLayer(regionLayer);
    createGeoJsonLayer();
    regionLayer.addData(moscowData);
  }

  // стиль регионов
  function getStyle(feature) {
    return {
      weight: 2,
      opacity: 0.1,
      color: 'black',
      fillOpacity: 0.85,
      fillColor: getDensityColor(feature.properties[selectedShop][createdLayer])
    };
  }

  // получить цвет в зависимости от количества людей
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
      mousemove: mousemove,
      mouseout: mouseout
    });
  }

  // показываем popup с данными региона
  function mousemove(e) {    
    var layer = e.target;

    // данные для popup
    var popupData = {
      regionName: e.target.feature.properties.name,
      peopleHome: e.target.feature.properties[selectedShop].home,
      peopleWork: e.target.feature.properties[selectedShop].work
    };

    // устанавливаем координаты относительно которых быдет открыт popup
    popup.setLatLng(e.latlng);

    var popContent = L.mapbox.template(d3.select('#popup-template').text(), popupData);
    popup.setContent(popContent);

    if (!popup._map) popup.openOn(map);
    window.clearTimeout(closeTooltip);

    // стиль при наведении
    layer.setStyle({
      weight: 2,
      opacity: 0.3,
      fillOpacity: 1
    });

    if (!L.Browser.ie && !L.Browser.opera) {
      layer.bringToFront();
    }
  }

  //закрываем popup
  function mouseout(e) {
    regionLayer.resetStyle(e.target);
    closeTooltip = window.setTimeout(function() {
      map.closePopup( popup ); 
    }, 100);
  }

  function ready(error, map) {
    if (error) return console.dir(error);
    moscowData = topojson.feature(map, map.objects.moscowAfterSimplify).features;

    // layer.eachLayer(function(e){
    // })
    // createLegend();

    // Отображение географии проживания и работы посетителей по каждому ТЦ в виде тепловой карты
    d3.csv('./data/geoLivingWorkingMos.csv', function(error, data) { 
      preParceData('dt','%Y-%m-%d',['zid_oktmo','gender', 'age', 'customers_cnt_home', 'customers_cnt_work'], data);

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
      var metropolisObj = getSumPeopleByOktmo(metropolisData);
      var shukaObj = getSumPeopleByOktmo(shukaData);
      
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

      // максимальное значение проживающих в одном регионе 
      var h = 0;
      var w = 0;
      for(key in himkiObj) {
        himkiObj[key].home > h ? h = himkiObj[key].home : null 
        himkiObj[key].home > w ? w = himkiObj[key].work : null 
      }
      console.log(`максимально прроживают: ` + h)
      console.log(`максимально работают: ` + w)
      // end

      // добавляем данные о проживании и работе людей к геоданным 
      moscowData.forEach(function (regionData) {
        var region = regionData.properties;
        var code = region.oktmoCode;
        region['himki'] = himkiObj[region.oktmoCode];
        region['metropolis'] = metropolisObj[region.oktmoCode];
        region['shuka'] = shukaObj[region.oktmoCode];
      });

      regionLayer.addData(moscowData);
    });
  }

  function createLegend() {
    var grades = [].slice.call(mapRange).reverse(), // creates a copy of ranges and reverses it
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

    return '<span><b>Плотность населеня :</span></b><br>' + labels.join('<br>');
  }

  // function createLegend () {
  //   var CLASS_COUNT = 10;
  //   var startColor = 'white';
  //   var endColor = 'red';
  //   var gradient = d3.interpolateRgb(startColor, endColor);
  //   var svg = d3.select('.legend').append('svg')
  //     .attr('width', '100')
  //     .attr('heigth', '200');
  // }

  function createShopMarker (shops) {
    var shopsGeoJson = shops.map(function (shop) {
      var propObj = {
        title: shop.title,
        'marker-color': '#f5f5f5',
        'name': shop.name,
        'marker-symbol': 'shop',
        'marker-size': 'small'
      };
      
      if( shop.name == selectedShop) {
        propObj['marker-size'] = 'large',
        propObj['marker-color'] = '#ffb90f'
      }

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: shop.coords.reverse()
        },
        properties: propObj
      };
    });

    // добавили слой с торговыми центрами
    var shopLayer = L.mapbox.featureLayer(shopsGeoJson).addTo(map);

    // показываем название ТЦ при наведении
    shopLayer.on('mouseover', function(e) {      
      e.layer.openPopup();
    });
    
    shopLayer.on('mouseout', function(e) {
      e.layer.closePopup();
    });

    // при клике выбираем тц
    shopLayer.on('click', function(e) {    
      var that = this;
      // стиль выбранного маркера
      var defaultMarkerStyle = {
        'marker-color':'#f5f5f5',
        'marker-size':'small'
      };

      // стиль выбранного маркера
      var selectMarkerStyle = {
        'marker-color': '#ffb90f',
        'marker-size': 'large'
      };

      for(marker in that._layers ) {
        var layer = that._layers[marker];
        if(layer.feature.properties['marker-size'] != 'small') { 
          setMarkerStyle(layer, defaultMarkerStyle);
        }
      }
      
      setMarkerStyle(e.layer, selectMarkerStyle);
      selectedShop = e.layer.feature.properties.name;
      updateLayer();
    });
  }

  function setMarkerStyle (markerLayer, stylesObj) {
    for(key in stylesObj) {
      markerLayer.feature.properties[key] = stylesObj[key];
    }
    markerLayer.setIcon(L.mapbox.marker.icon( markerLayer.feature.properties));
  }

  // функция преобразования форматов данных
  function preParceData(dateColumn, dateFormat, usedNumColumns, data) {
    var parse = d3.time.format(dateFormat).parse;
    data.forEach(function(d) {
      d[dateColumn] = parse(d[dateColumn]);
      for (var i = 0, len = usedNumColumns.length; i < len; i += 1) {
            d[usedNumColumns[i]] = +d[usedNumColumns[i]];
      }
    });
  }

  // map.on('click', function(e) {
  //   alert(e.latlng);
  // });
})();