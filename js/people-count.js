(function () {
	var himki = {};
	var metropolis = {};
	var shuka = {};

  d3.csv("./data/visitors.csv", function(error, data) {
    if (error) throw error;
    preParceDann("dt","%Y-%m-%d",["age", "customers_cnt", "gender", "hour"], data);

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

    // минимальное и максимальное значение даты 
    himki['minMaxDate'] = getMinMaxDate(himki.values);
    metropolis['minMaxDate'] = getMinMaxDate(shuka.values);
    shuka['minMaxDate'] = getMinMaxDate(metropolis.values);
    console.dir(himki.minMaxDate);
  });

  function getMinMaxDate (data) {
    return d3.extent(data, function(d) { 
    	return d.dt; 
    });
  }

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