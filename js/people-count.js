(function () {
  d3.csv("./data/visitors.csv", function(error, data) {
    if (error) throw error;
    preParceDann("dt","%Y-%m-%d",["age", "customers_cnt", "gender", "hour"], data);

    // разбиваем данные на категории по торговым центрам
    var dataGroup = d3.nest()
          .key(function(d) { return d.tid; })
          .entries(data);
    console.dir(dataGroup);

  });


  // функция преобразования форматов данных
  function preParceDann(dateColumn, dateFormat, usedNumColumns, data){
	  var parse = d3.timeParse(dateFormat);
		data.forEach(function(d) {
	    d[dateColumn] = parse(d[dateColumn]);
	    for (var i = 0, len = usedNumColumns.length; i < len; i += 1) {
	          d[usedNumColumns[i]] = +d[usedNumColumns[i]];
	    }
	  });
	}

})();