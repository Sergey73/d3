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
    var all = dataCross.groupAll();

    // общее количество людей
    var totalPeople = all.reduceSum(function(d){
      return +d.customers_cnt;
    });

    // всего людей за месяц
    d3.select("#total").text(totalPeople.value());

    // вывод текста общее количество людей 
    dc.dataCount('.dc-data-count')
      .dimension(dataCross)
      .group(all);


    // dimension по дате
    var dateByDay = dataCross.dimension(function(d) { return d.dt; });    
    // создаем группы по дням
    var daysGroup = dateByDay.group(d3.time.day)
    // считаем количество людей посетивших торговый центр за день
      // .reduce(reduceAdd, reduceRemove, reduceInitial);
      .reduceSum(function(d) {
      return +d.customers_cnt;
    });
    // создаем группы по часам
    var hoursGroup = dateByDay.group(d3.time.hour)
    // считаем количество людей посетивших торговый центр за час
      // .reduce(reduceAdd, reduceRemove, reduceInitial);

    // function reduceAdd(p, v) {
    //   p += v.customers_cnt;
    //   return p;
    // }

    // function reduceRemove(p, v) {
    //   p -= v.customers_cnt;
    //   return p;
    // }

    // function reduceInitial() {
    //   return 0;
    // }

    // максимальное посещение в день
    var maxPeopleInDay = d3.max(daysGroup.top(Infinity), function (d) { return d.value; });
    // максимальное посещение за час
    var maxPeopleInHour = d3.max(hoursGroup.top(Infinity), function (d) { return d.value; });

    // создаем график по времени 
    var chart = dc.barChart("#peopleCount");

    chart
      .width(800)
      .height(300)
      .x(d3.time.scale([new Date(himki.minMaxDate[0]), new Date(himki.minMaxDate[1])]))
      .y(d3.scale.linear().domain([0, maxPeopleInDay + 1000]))
      .margins({top: 10, left: 80, right: 10, bottom: 40})
      .xUnits(d3.time.days)
      .elasticX(true)
      .xAxisPadding(1)
      .yAxisLabel("Количество людей")
      .dimension(dateByDay)
      .group(daysGroup)
      .transitionDuration(1500)
      .colors('red')
      .centerBar(true)
      .brushOn(true)
      .barPadding(1)
      .clipPadding(10)     
      .renderLabel(true)

      // my значение
      // .label(function(d) { 
      //   return d.y; }
      // )
      // end my значение

      // my обработка фильтра
      // .filterHandler(function(dimension, filter){
      //   // обработка фильтра
      //   //   var newFilter = filter + 10;
      //   //   dimension.filter(newFilter);
      //   //   return newFilter; // set the actual filter value to the new value
      // })
      // end my обработка фильтра

      .renderlet(function(chart){
        // поворот текста на 45 градусов для оси Х 
        chart.selectAll('g.x text')
          .attr('transform', 'translate(-10,10) rotate(315)');
       

        // // поворот текста для значений 
        // chart.selectAll('.barLabel')
        //   .attr({
        //     'transform': 
        //       function(d){ 
        //       var x = this.getAttribute('x');
        //       var y = this.getAttribute('y');
        //       return "rotate(90," + x +"," + y + ")";
        //     },
        //     'x': function() {
        //       return this.getAttribute('x') - 15;
        //     },
        //     'y': function() {
        //       return +this.getAttribute('y') + 4;
        //     }
        // });

        // smooth the rendering through event throttling
        // dc.events.trigger(function(){
        //     // focus some other chart to the range selected by user on this chart
        //     chart.focus(chart.filter());
        // });
      });
    

  // sex chart
    var sexChart    = dc.pieChart("#sexChart");
    
    // dimension по полу
    var dateByGender = dataCross.dimension(function(d) { return d.gender; });
    
    // my
    // фильтруем по значению 2 (женщины)    
    // var e =dateByGender.filter("2");
    // считаем общее количество женщин
    // var x = dataCross.groupAll().reduceCount().value();
    // очищаем группу
    // dateByGender.filterAll();
    // end my 

    // делим на группы ж/м и подсчитываем общее количество каждой группы.
    var genderGroup  = dateByGender.group().reduceSum(function(d) {
      return +d.customers_cnt;
    });

    sexChart
      .width(100)
      .height(100)
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
  // end sex chart

  // age chart
    var ageChart    = dc.pieChart("#ageChart");
    
    // dimension по возрасту
    var dateByAge = dataCross.dimension(function(d) { return d.age; });
    
    // делим на группы по возрасту и подсчитываем общее количество каждой группы.
    var ageGroup  = dateByAge.group().reduceSum(function(d) {
      return +d.customers_cnt;
    });

    ageChart
      .width(200)
      .height(200)
      .dimension(dateByAge)
      .group(ageGroup)
      .label(function(d) { 
        var result;
        if (d.key == 1) {
          result = 'от 18 до 24 : ' + d.value;
        } else if (d.key == 2) {
          result = 'oт 25 до 35: ' + d.value;
        } else if (d.key == 3) {
          result = 'oт 36 до 45: ' + d.value;
        } else if (d.key == 4) {
          result = 'oт 46 до 55: ' + d.value;
        }
        return result;
      });
  // age end chart
    dc.renderAll();
  });
  
  // Отображение географии проживания и работы посетителей по каждому ТЦ в виде тепловой карты
  d3.csv("./data/geoLivingWorking.csv", function(error, data) { 
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

  function getMinMaxDate(data) {
    return d3.extent(data, function(d) { 
      return d.dt; 
    });
  }

  // функция преобразования форматов данных
  function preParceDann(dateColumn, dateFormat, usedNumColumns, data){
    var parse = d3.time.format(dateFormat).parse;
    data.forEach(function(d) {
      d.hour ? d.dt += '-' + d.hour : null;
	    d[dateColumn] = parse(d[dateColumn]);
	    for (var i = 0, len = usedNumColumns.length; i < len; i += 1) {
	          d[usedNumColumns[i]] = +d[usedNumColumns[i]];
	    }
	  });
	}

})();