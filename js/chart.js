var Chart = (function() {
  var selectShop, timeChart, sexChart, ageChart;
  var shops = {
    himki: {name: 'ТРЦ Мега Химки'}, 
    metropolis: {name: 'ТРЦ Метрополис'},
    shuka: {name: 'ТРЦ Щука'}
  };

  function init (shop) {
    selectShop = shops[shop];
    // загружаем данные
    d3.csv("./data/visitors.csv", dataLoad);
  }

  function dataLoad(error, data) {
    if (error) throw error;

    // тк значения данных приходят в строковом виде, преобразуем соответствующие 
    // значения полей в числа и даду  
    preParceData("dt","%Y-%m-%d-%H",["age", "customers_cnt", "gender", "hour"], data);

    // разбиваем данные на категории по торговым центрам
    var dataGroup = d3.nest()
          .key(function(d) { return d.tid; })
          .entries(data);      
    dataGroup.forEach(function(shop) {
      shop.key == "Himki" ? shops.himki.values = shop.values :
        shop.key == "Shuka" ? shops.shuka.values = shop.values :
          shop.key == "Metropolis" ? shops.metropolis.values = shop.values : null;
    });

    // минимальное и максимальное значение даты торговых центров
    shops.himki['minMaxDate'] = getMinMaxDate(shops.himki.values);
    shops.metropolis['minMaxDate'] = getMinMaxDate(shops.shuka.values);
    shops.shuka['minMaxDate'] = getMinMaxDate(shops.metropolis.values);
    setShopData();
  }

  function setShopData () {
    // преобразование данных с попошью библиотеки crossfilter
    var dataCross = crossfilter(selectShop.values);
    var all = dataCross.groupAll();
    
    // общее количество людей
    var totalPeople = all.reduceSum(function(d) {
      return +d.customers_cnt;
    }).value();

    // для удобства вотприятия используем формат 000,000
    var formatNumber = d3.format(',d');
    // отображение общего количества людей за месяц
    d3.select(".filter-count").text(formatNumber(totalPeople));
    // отображение  выбранного ТЦ
    d3.select(".shop-name").text(selectShop.name);

    // вывод текста общее количество людей 
    dc.dataCount('.dc-data-count')
      .dimension(dataCross)
      .group(all);

    // отображение периода времени
    showRangeDate(selectShop.minMaxDate);

    createTimeChartData(dataCross);
    createSexChartData(dataCross);
    createAgeChartData(dataCross);
  }

  function rerenderCharts(chart, date, group) {
    // меняем ось Y только в timeChart графике и сбрасываем фильтр
    if (typeof(chart.y) == 'function') {
      chart.y(d3.scale.linear().domain([0, selectShop.maxPeopleInDay + 5000]));
      dc.filterAll();
    } 
    chart
      .dimension(date)
      .group(group)
      .redraw();
  }

  function createTimeChartData(dataCross) {
    // dimension по дате
    var dateByDay = dataCross.dimension(function(d) { return d.dt; });    
    
    // создаем группы по дням
    var daysGroup = dateByDay.group(d3.time.day)
    // считаем количество людей посетивших торговый центр за день
      .reduceSum(function(d) {
        return +d.customers_cnt;
      });

    // максимальное посещение в день
    selectShop['maxPeopleInDay'] = d3.max(daysGroup.top(Infinity), function(d) { return d.value;});
    
    // создаем или обновляем созданные график по времени
    timeChart ? rerenderCharts(timeChart, dateByDay, daysGroup) : createTimeChart(dateByDay, daysGroup);
  }

  function createTimeChart(dateByDay, daysGroup) {
    var that = this;
    that.dateByDay = dateByDay;
    that.daysGroup = daysGroup;
    timeChart = dc.barChart("#timeChart");

    timeChart
      .width(1200)
      .height(200)
      .x(d3.time.scale().domain([new Date(selectShop.minMaxDate[0]), new Date(selectShop.minMaxDate[1])]))
      .y(d3.scale.linear().domain([0, selectShop.maxPeopleInDay + 5000]))
      .xUnits(d3.time.days)
      .margins({top: 10, left: 50, right: 10, bottom: 40})
      .elasticX(true)
      // начало координат +1 день
      .xAxisPadding(1)
      .yAxisLabel("Количество людей")
      .dimension(dateByDay)
      .group(daysGroup)
      .transitionDuration(1500)
      .controlsUseVisibility(true)
      .colors('#ffb80d')
      .renderLabel(true)
      .filterHandler(function(dimension, filter) {
        var rangeDate = filter[0];
        if (rangeDate && rangeDate[0]) {
          showRangeDate(rangeDate);
          dimension.filter(rangeDate);

          return filter; 
        } 
      })
      .on('renderlet', function(chart){
        // поворот текста на 45 градусов для оси Х 
        chart.selectAll('g.x text')
          .attr('transform', 'translate(-10,10) rotate(315)');
      });
      timeChart.render();
  }

  function createSexChartData(dataCross) {
    // dimension по полу
    var dateByGender = dataCross.dimension(function(d) { return d.gender; });

    // делим на группы ж/м и подсчитываем общее количество каждой группы.
    var genderGroup = dateByGender.group().reduceSum(function(d) {
      return +d.customers_cnt;
    });

    // создаем или обновляем созданные график по полу
    sexChart ? rerenderCharts(sexChart, dateByGender, genderGroup) : createSexChart(dateByGender, genderGroup);
  }

  function createSexChart(dateByGender, genderGroup) {
    sexChart = dc.pieChart("#sexChart");

    // цвета графика sexChart
    var colorSexChart = d3.scale.ordinal().range(['#4682b4', '#ffc0cb']);

    sexChart
      .width(210)
      .height(225)
      .dimension(dateByGender)
      .group(genderGroup)
      // внешний отступ uрафика
      .externalRadiusPadding(10)
      // сдвиг чата по y
      .cy(105)
      .colors(colorSexChart)
      .legend(dc.legend()
        .x(45).y(205)
        .horizontal(true)
        // размер легенды
        .itemHeight(15)
        .legendText(function(d, i) { 
          var result;
          result = d.name == 1 ? 'Мужчин' : 'Женщин';
          return result;
        })
      )
      .label(function(d) { 
        var result;
        if (d.key == 1) {
          result = d.value;
        } else {
          result = d.value;
        }
        return result;
      })
      .title(function(d) {
        return ;
      })
      .render();
  }

  function createAgeChartData(dataCross) {
    // dimension по возрасту
    var dateByAge = dataCross.dimension(function(d) { return d.age; });
    
    // делим на группы по возрасту и подсчитываем общее количество каждой группы.
    var ageGroup  = dateByAge.group().reduceSum(function(d) {
      return +d.customers_cnt;
    });

     // создаем или обновляем созданные график по возрасту
    ageChart ? rerenderCharts(ageChart, dateByAge, ageGroup) : createAgeChart(dateByAge, ageGroup);
  }

  function createAgeChart(dateByAge, ageGroup){
    ageChart = dc.pieChart("#ageChart");
    
    // цвета графика ageChart
    var colorАgeChart = d3.scale.ordinal().range(['#c4af1a', '#ffa500', '#ff0000', '#a52a2a']);

    ageChart
      .width(210)
      .height(285)
      .dimension(dateByAge)
      .group(ageGroup)
      // внешний отступ графика
      .externalRadiusPadding(10)
      // сдвиг чата по y
      .cy(105)
      .colors(colorАgeChart)
      .innerRadius(30)
      .legend(dc.legend()
        .x(70).y(205)
        // размер легенды
        .itemHeight(15)
        .legendText(function(d, i) { 
          var result;
          if (d.name == 1) {
            result = 'от 18 до 24';
          } else if (d.name == 2) {
            result = 'oт 25 до 35';
          } else if (d.name == 3) {
            result = 'oт 36 до 45';
          } else if (d.name == 4) {
            result = 'oт 46 до 55';
          }
          return result;
        })
      )
      .label(function(d) { 
        var result;
        if (d.key == 1) {
          result = d.value;
        } else if (d.key == 2) {
          result = d.value;
        } else if (d.key == 3) {
          result = d.value;
        } else if (d.key == 4) {
          result = d.value;
        }
        return result;
      })
      .title(function(d) {
        return ;
      })
    .render();
  }
  
 function showRangeDate(timeArr) {
    var startData = d3.select('.dataStart');
    var endData = d3.select('.dataEnd');
    var formatTime = d3.time.format("%d/%m/%Y %H:%M:%S");
    var start = formatTime(timeArr[0]);
    var end = formatTime(timeArr[1]);
    startData.text(start);
    endData.text(end);
  }

  function getMinMaxDate(data) {
    return d3.extent(data, function(d) { 
      return d.dt; 
    });
  }

  // функция преобразования форматов данных
  function preParceData(dateColumn, dateFormat, usedNumColumns, data){
    var parse = d3.time.format(dateFormat).parse;
    data.forEach(function(d) {
      d.hour ? d.dt += '-' + d.hour : null;
	    d[dateColumn] = parse(d[dateColumn]);
	    for (var i = 0, len = usedNumColumns.length; i < len; i += 1) {
	          d[usedNumColumns[i]] = +d[usedNumColumns[i]];
	    }
	  });
	}
  
  return {
    createCharts: function (shop) {
      if (!shops[shop].values) {
        init(shop);
      } else {
        selectShop = shops[shop];
        setShopData();
      }
    }
  };
})();