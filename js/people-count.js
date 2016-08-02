(function () {
	var himki = {};
	var metropolis = {};
	var shuka = {};

  // загружаем данные
  d3.csv("./data/visitors.csv", function(error, data) {
    if (error) throw error;

    // тк значения данных приходят в строковом виде, преобразуем соответствующие 
    // значения полей в числа и даду  
    preParceDann("dt","%Y-%m-%d-%H",["age", "customers_cnt", "gender", "hour"], data);

    // разбиваем данные на категории по торговым центрам
    var dataGroup = d3.nest()
          .key(function(d) { return d.tid; })
          .entries(data);      
    dataGroup.forEach(function (shop) {
    	shop.key == "Himki" ? himki.values = shop.values :
    		shop.key == "Shuka" ? shuka.values = shop.values :
	    		shop.key == "Metropolis" ? metropolis.values = shop.values : null;
    });

    // минимальное и максимальное значение даты торговых центров
    himki['minMaxDate'] = getMinMaxDate(himki.values);
    metropolis['minMaxDate'] = getMinMaxDate(shuka.values);
    shuka['minMaxDate'] = getMinMaxDate(metropolis.values);

    // преобразование данных с попошью библиотеки crossfilter
    var dataCross = crossfilter(himki.values);

    // dimension по дате
    var dateByDay = dataCross.dimension(function(d) { return d.dt; });    
    // var all = dataCross.groupAll();

    // создаем группы по дням
    var daysGroup = dateByDay.group(d3.time.day)
    // считаем количество людей посетивших торговый центр за день
      .reduce(reduceAdd, reduceRemove, reduceInitial);
     
    // создаем группы по часам
    var hoursGroup = dateByDay.group(d3.time.hour)
    // считаем количество людей посетивших торговый центр за час
      .reduce(reduceAdd, reduceRemove, reduceInitial);

    function reduceAdd(p, v) {
      p += v.customers_cnt;
      return p;
    }

    function reduceRemove(p, v) {
      p -= v.customers_cnt;
      return p;
    }

    function reduceInitial() {
      return 0;
    }

    // максимальное посещение в день
    var maxPeopleInDay = d3.max(daysGroup.top(Infinity), function (d) { return d.value; });
    // максимальное посещение за час
    var maxPeopleInHour = d3.max(hoursGroup.top(Infinity), function (d) { return d.value; });
  
    // создаем график 
    var chart = dc.barChart("#peopleCount");

    chart
      .width(1000)
      .height(300)
      .x(d3.time.scale([new Date(himki.minMaxDate[0]), new Date(himki.minMaxDate[1])]))
      .y(d3.scale.linear().domain([0, maxPeopleInDay]))
      .xUnits(d3.time.days)
      .elasticX(true)
      .xAxisPadding(1)
      .yAxisLabel("Количество людей")
      .dimension(dateByDay)
      .group(daysGroup)
      .margins({top: 100, left: 80, right: 10, bottom: 30})
      .transitionDuration(1500)
      .colors('red')
      .centerBar(true)
      .barPadding(1)
      .label(function(d) { 
        return d.y; }
        )
      .filterHandler(function(dimension, filter){
        // обработка фильтра
        // debugger
        //   var newFilter = filter + 10;
        //   dimension.filter(newFilter);
        //   return newFilter; // set the actual filter value to the new value
      })
      .renderlet(function(chart){

        // smooth the rendering through event throttling
        // dc.events.trigger(function(){
        //     // focus some other chart to the range selected by user on this chart
        //     chart.focus(chart.filter());
        // });
      });
    
    // pipe chart
    // dimension по полу
    var ringChart    = dc.pieChart("#ringChart");
    var dateByGender = dataCross.dimension(function(d) { return d.gender; });
    var genderGroup  = dateByGender.group().reduceCount();

    ringChart
      .width(200)
      .height(200)
      .dimension(dateByGender)
      .group(genderGroup)
      .label(function(d) { 
        var result;
        if (d.key == 1) {
          result = 'Мужчин: ' + d.value;
        } else {
          result = 'Женщин: ' + d.value;
        }
        return result;
      });
      // .x(d3.scale.linear().domain([0,10]))
      // .elasticY(true);
    // end pipe chart

    dc.renderAll();
  });


  function getMinMaxDate(data) {
    return d3.extent(data, function(d) { 
      return d.dt; 
    });
  }

  // функция преобразования форматов данных
  function preParceDann(dateColumn, dateFormat, usedNumColumns, data){
    var parse = d3.time.format(dateFormat).parse;
		data.forEach(function(d) {
      d.dt += '-' + d.hour;
	    d[dateColumn] = parse(d[dateColumn]);
	    for (var i = 0, len = usedNumColumns.length; i < len; i += 1) {
	          d[usedNumColumns[i]] = +d[usedNumColumns[i]];
	    }
	  });
	}

})();