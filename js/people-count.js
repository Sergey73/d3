(function () {
	var himki = {};
	var metropolis = {};
	var shuka = {};

  d3.csv("./data/visitors.csv", function(error, data) {
    if (error) throw error;
    preParceDann("dt","%Y-%m-%d-%H",["age", "customers_cnt", "gender", "hour"], data);

    // разбиваем данные на категории по торговым центрам
    var dataGroup = d3.nest()
          .key(function(d) { return d.tid; })
          .entries(data);
    console.dir(dataGroup);
    dataGroup.forEach(function (shop) {
    	shop.key == "Himki" ? himki.values = shop.values :
    		shop.key == "Shuka" ? shuka.values = shop.values :
	    		shop.key == "Metropolis" ? metropolis.values = shop.values : null;
    });

    // минимальное и максимальное значение даты торговых центров
    himki['minMaxDate'] = getMinMaxDate(himki.values);
    // metropolis['minMaxDate'] = getMinMaxDate(shuka.values);
    // shuka['minMaxDate'] = getMinMaxDate(metropolis.values);

    var himkiDate = crossfilter(himki.values);
    // var all = himkiDate.groupAll();

    // упорядочиваем значения от большего к меньшему по полю dt
    var date = himkiDate.dimension(function(d) { return d.dt; });
    var dates = date.group(d3.time.day);
    // dates.groupId = "dates";

    var people = himkiDate.dimension(function(d) { return d.customers_cnt; });
    var peoples = people.group(Math.floor);

    // упорядочиваем значения от большего к меньшему по полю dt
    var hour = himkiDate.dimension(function(d) { return d.hour; });
    var hours = hour.group(Math.floor);
    // hours.groupId = "hours";
    var chart = dc.barChart("#peopleCount");
    chart
      .width(800)
      .height(800)
      .x(d3.time.scale().domain([new Date(himki.minMaxDate[0]), new Date(himki.minMaxDate[1])]))
      .xUnits(d3.time.month)
      // .gap(5)
      .dimension(peoples)
      .group(dates)
     // .x(d3.scale.linear().domain(himki.minMaxDate))
      // .x(d3.time.scale().domain(himki.minMaxDate))
    //    .round(d3.time.month.round)
    // .elasticY(true);
      .brushOn(true)
      // .yAxisLabel("This is the Y Axis!")
      .on('renderlet', function(chart) {
          chart.selectAll('rect').on("click", function(d) {
              console.log("click!", d);
          });
      });
      chart.render();

    // console.dir(date);

    // var chart = dc.barChart("#peopleCount");
    // d3.csv("./data/morley.csv", function(error, experiments) {

    //   experiments.forEach(function(x) {
    //     x.Speed = +x.Speed;
    //   });

    //   var ndx                 = crossfilter(experiments),
    //       runDimension        = ndx.dimension(function(d) {return +d.Run;}),
    //       speedSumGroup       = runDimension.group().reduceSum(function(d) {return d.Speed * d.Run / 1000;});

    //   chart
    //     .width(768)
    //     .height(480)
    //     .x(d3.scale.linear().domain([6,20]))
    //     .brushOn(false)
    //     .yAxisLabel("This is the Y Axis!")
    //     .dimension(runDimension)
    //     .group(speedSumGroup)
    //     .on('renderlet', function(chart) {
    //         chart.selectAll('rect').on("click", function(d) {
    //             console.log("click!", d);
    //         });
    //     });
    //     chart.render();
    // });






  });

  function getMinMaxDate (data) {
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