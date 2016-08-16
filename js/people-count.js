(function () {
	var himki = {};
	var metropolis = {};
	var shuka = {};

  // загружаем данные
  d3.csv("./data/visitors.csv", function(error, data) {
    if (error) throw error;

    // тк значения данных приходят в строковом виде, преобразуем соответствующие 
    // значения полей в числа и даду  
    preParceData("dt","%Y-%m-%d-%H",["age", "customers_cnt", "gender", "hour"], data);

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
        return d.customers_cnt;
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

    // 
    var startData = d3.select('.dataStart');
    var endData = d3.select('.dataEnd');
    function x (timeArr) {
      var formatTime = d3.time.format("%d %B %Y %H:%M:%S");
      var start = formatTime(timeArr[0]);
      var end = formatTime(timeArr[1]);
      startData.text(start);
      endData.text(end);
    }

    chart
      .width(1200)
      .height(200)
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
      .colors('#ffb80d')
      .centerBar(true)
      .brushOn(true)
      // .barPadding(0.5)
      // .clipPadding(10)     
      .renderLabel(true)

      // my значение
      // .label(function(d) { 
      //   return d.y; }
      // )
      // end my значение

      // my обработка фильтра
      .filterHandler(function(dimension, filter) {
        filter[0] && filter[0][0] ? x(filter[0]) : null;
        // обработка фильтра
        //   var newFilter = filter + 10;
        //   dimension.filter(newFilter);
        //   return newFilter; // set the actual filter value to the new value
        dimension.filter(filter[0]); // perform filtering
        return filter; // return the actual filter value
      })
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
    var genderGroup = dateByGender.group().reduceSum(function(d) {
      return +d.customers_cnt;
    });

    // цвета графика sexChart
    var colorSexChart = d3.scale.ordinal().range(['#4682b4', '#ffc0cb']);

    sexChart
      .width(210)
      .height(225)
      .dimension(dateByGender)
      .group(genderGroup)
      // внешний отступ крафика
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
      });
  // end sex chart

  // age chart
    var ageChart = dc.pieChart("#ageChart");
    
    // dimension по возрасту
    var dateByAge = dataCross.dimension(function(d) { return d.age; });
    
    // делим на группы по возрасту и подсчитываем общее количество каждой группы.
    var ageGroup  = dateByAge.group().reduceSum(function(d) {
      return +d.customers_cnt;
    });

    // цвета графика sexChart
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
        // .horizontal(true)
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
      });
  // age end chart
    dc.renderAll();
  });
  
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

})();