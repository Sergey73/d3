var Region = (function () {
  var moscowData,
    regionLayer;

  function init() {
    if(moscowData) return moscowData;
    d3.queue()
      .defer(d3.json, '/data/moscow.json')
      .await(ready);
  }

  function ready(error, map) {
    if (error) return console.dir(error);
    moscowData = topojson.feature(map, map.objects.moscowAfterSimplify).features;

    d3.csv('./data/geoLivingWorkingMos.csv', function(error, data) { 
      // парсинг данных 
      preParceData('dt','%Y-%m-%d',['zid_oktmo','gender', 'age', 'customers_cnt_home', 'customers_cnt_work'], data);

      // преобразование данных с попошью библиотеки crossfilter
      var geoDataCross = crossfilter(data);
      var allGeoData = geoDataCross.groupAll();
      
      // dimension по торговым центрам
      var dataByRegion = geoDataCross.dimension(function(d) { return d.tid;}); 

      // создаем данные по ТЦ
      var himkiData = createShopArr(dataByRegion, 'Himki', dataByRegion);
      var metropolisData = createShopArr(dataByRegion, 'Metropolis', dataByRegion);
      var shukaData = createShopArr(dataByRegion, 'Shuka', dataByRegion);
      
      // получаем сумму работающих людей и сумму живущих людей по каждому региону
      var himkiObj = getSumPeopleByOktmo(himkiData);
      var metropolisObj = getSumPeopleByOktmo(metropolisData);
      var shukaObj = getSumPeopleByOktmo(shukaData);
      
      // // максимальное значение проживающих в одном регионе 
      // var h = 0;
      // var w = 0;
      // var e = []
      // for(key in himkiObj) {
      //   e.push(himkiObj[key].work)
      //   e.sort(function (a,b) {return a-b})
      //   himkiObj[key].home > h ? h = himkiObj[key].home : null 
      //   himkiObj[key].home > w ? w = himkiObj[key].work : null 
      // }
      // debugger
      // console.log(`максимально прроживают: ` + h)
      // console.log(`максимально работают: ` + w)
      // // end

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

  function createShopArr(dimensionData, shop, dataByRegion) {
    dimensionData.filter(shop);
    var result = dataByRegion.top(Infinity);
    dimensionData.filter(null);
    return result;
  }

  function getSumPeopleByOktmo (data) {
    var sumPeople = {};
    var shopCross = crossfilter(data);
    var allShopData = shopCross.groupAll();

    var dataByOktmoCode = shopCross.dimension(function(d) { return d.zid_oktmo;});
    var regionGroup = dataByOktmoCode.group()
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

  return {
    createRegions: function (layer) {
      if (!moscowData) {
        regionLayer = layer;
        moscowData = init();
      } else {
        layer.addData(moscowData);
      }
    }
  };

})();