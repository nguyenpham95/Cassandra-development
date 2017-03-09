var app = angular.module("app")
// .controller("laboratoryController", ["$scope", "$http", "$rootScope", "$window", "printService", 'FileSaver', 'Blob', '$location', '$interval', 'dsp', 'socket', '$timeout', function ($scope, $http, $rootScope, $window, printService, FileSaver, Blob, $location, $interval, dsp, socket, $timeout) {
.controller("laboratoryController", ["$scope", "$http", "$rootScope", "$window", "printService", 'FileSaver', 'Blob', '$location', '$interval', 'dsp', '$timeout', function ($scope, $http, $rootScope, $window, printService, FileSaver, Blob, $location, $interval, dsp, $timeout) {

  console.log("laboratory");


  $scope.local_server = {
    name: "Local server",
    link: "http://localhost:2000",
  };
  $scope.express_server = {
    name: "Cassandra express server",
    link: "http://localhost:8081",
  };

  var socket = io.connect($scope.local_server.link);

  var red_code = "#f05b4f";
  var orange_code = "#d17905";
  var green_code = "#8BC34A";

  if ($window.localStorage["cassandra_userInfo"]) {
    $scope.userInfo = JSON.parse($window.localStorage["cassandra_userInfo"]);
  };

  jQuery(window).on("resize", function() {
    var vw = jQuery(window).width();
    if (vw < 1000) {
      jQuery(".lab_view").css("padding-top","10px");
      jQuery(".feature-block").css("padding","0px");
    } else {
      jQuery(".lab_view").css("padding-top","90px");
      jQuery(".feature-block").css("padding","0px 0px 0px 10px;");
    };
  });

  $scope.status_pool = ["Normal", "Brady", "Tarchy", "AF", "Arryth", "Ische", "Stroke", "Deadly"];
  var colors_pool = [green_code, orange_code, red_code];

  var initiate_variables = function() {
    $scope.data_pointer = 0;
    $scope.sampling_frequency = 80;    // 100 points per 1,000ms

    $scope.heart_rate = "---";
    $scope.variability = "---";
    $scope.tmag = "---";
    $scope.std_val = "---";
    $scope.health = "-----";

    $scope.heart_rate_condition = 0;
    $scope.variability_condition = 0;
    $scope.health_condition = 0;
    $scope.tmag_condition = 0;
    $scope.std_condition = 0;

    $scope.heart_rate_color       = colors_pool[$scope.heart_rate_condition];
    $scope.variability_color      = colors_pool[$scope.variability_condition];
    $scope.health_color           = colors_pool[$scope.health_condition];
    $scope.tmag_color             = colors_pool[$scope.tmag_condition];
    $scope.std_color              = colors_pool[$scope.std_condition];

    $scope.statistics_count = [0, 0, 0];
  };
  var initiate_window_settings = function() {
    $scope.plot_speed = 40;             // 50 points per 1,000ms
    $scope.tick_speed = Math.floor(1000 / $scope.plot_speed);
    $scope.chart_pointer = 0;
    $scope.window_span = 4;             // in seconds
    $scope.window_leng = $scope.plot_speed * $scope.window_span;
  };
  var preprocess_signal = function(smooth_options, down_sampling_value, should_normalized, data) {
    if (smooth_options) {
      data = dsp.moving_average(smooth_options[0], smooth_options[1], data);
    };
    if (down_sampling_value) {
      data = dsp.down_sampling(down_sampling_value, data);
    };
    if (should_normalized) {
      data = dsp.perform_normalization(data);
    };
    return data;
  };

  initiate_variables();
  initiate_window_settings();



  var random_data = function(number_of_point, scale) {
    var data = [];
    for (i = 0; i < number_of_point; i++) {
      data.push(Math.random() * scale);
    };
    return data;
  };
  var create_chart_options = function(x_axis_ops, y_axis_ops, high_val, low_val) {
    var obj = {
      showPoint: false,
      showArea: false,
      fullWidth: true,
      // high: dsp.find_max(ecg_bin),
      // low: dsp.find_min(ecg_bin),
      high: high_val,
      low: low_val,
      axisX: {
        showGrid: x_axis_ops[0],
        showLabel: x_axis_ops[1],
      },
      axisY: {
        showGrid: y_axis_ops[0],
        showLabel: y_axis_ops[1],
      },
      chartPadding: {
        right: 20,
        bottom: 0
      },
    };
    return obj;
  };
  var chart_data = {
    series: [
      random_data($scope.window_leng, 800),
      //dsp.create_threshold($scope.window_leng, dsp.cal_mean(ecg_bin) + 1.5 * dsp.cal_std(ecg_bin)),
    ]
  };
  $scope.initiateChart = function(max_val, min_val) {
    $scope.chart = new Chartist.Line('.ct-chart', chart_data, create_chart_options([true, false], [true, true], max_val, min_val));
    // $scope.chart_fecg = new Chartist.Line('.fecg-chart', chart_data, create_chart_options([false, false], [false, false], dsp.find_max(ecg_bin), dsp.find_min(ecg_bin)));
    // $scope.chart.on('draw', function(context) {
    //   // First we want to make sure that only do something when the draw event is for bars. Draw events do get fired for labels and grids too.
    //   if(context.type === 'line') {
    //     // With the Chartist.Svg API we can easily set an attribute on our bar that just got drawn
    //     context.element.attr({
    //       // Now we set the style attribute on our bar to override the default color of the bar. By using a HSL colour we can easily set the hue of the colour dynamically while keeping the same saturation and lightness. From the context we can also get the current value of the bar. We use that value to calculate a hue between 0 and 100 degree. This will make our bars appear green when close to the maximum and red when close to zero.
    //       style: 'stroke: ' + $scope.health_color
    //     });
    //   }
    // });
    // $scope.chart_fecg.on('draw', function(context) {
    //   // First we want to make sure that only do something when the draw event is for bars. Draw events do get fired for labels and grids too.
    //   if(context.type === 'line') {
    //     // With the Chartist.Svg API we can easily set an attribute on our bar that just got drawn
    //     context.element.attr({
    //       // Now we set the style attribute on our bar to override the default color of the bar. By using a HSL colour we can easily set the hue of the colour dynamically while keeping the same saturation and lightness. From the context we can also get the current value of the bar. We use that value to calculate a hue between 0 and 100 degree. This will make our bars appear green when close to the maximum and red when close to zero.
    //       style: 'stroke: ' + $scope.health_color
    //     });
    //   }
    // });
  };

  var perform_diagnosis_for_these_features = function(hr, hrv, std, tp) {
    if (std > 60 && tp > 90) {
      $scope.health_condition = 2;
      $scope.statistics_count[2] += 1;
      $scope.health = "ST Elevate";
      // $scope.health = "Danger";
      return;
    };
    if (std < -40 && tp < -20) {
      $scope.health_condition = 2;
      $scope.statistics_count[2] += 1;
      $scope.health = "NSTEMI";
      // $scope.health = "Danger";
      return;
    };
    if (hrv > 20 && hr < 90) {
      $scope.health_condition = 1;
      $scope.statistics_count[1] += 1;
      $scope.health = "PVC";
      // $scope.health = "Caution";
      return;
    };
    if (hrv > 12) {
      $scope.health_condition = 2;
      $scope.statistics_count[2] += 1;
      $scope.health = "Arrythmia";
      // $scope.health = "Caution";
      return;
    };
    if (std < -26) {
      $scope.health_condition = 1;
      $scope.statistics_count[1] += 1;
      $scope.health = "ST Deviate";
      // $scope.health = "Caution";
      return;
    };
    if (std > -40 && std < 40 && tp < -20) {
      $scope.health_condition = 1;
      $scope.statistics_count[1] += 1;
      $scope.health = "T inverted";
      // $scope.health = "Caution";
      return;
    };
    if (std > -40 && std < 40 && tp > 140) {
      $scope.health_condition = 1;
      $scope.statistics_count[1] += 1;
      $scope.health = "T peaked";
      // $scope.health = "Caution";
      return;
    };
    if (hr > 120) {
      $scope.health_condition = 1;
      $scope.statistics_count[1] += 1;
      $scope.health = "Tarchy";
      // $scope.health = "Caution";
      return;
    };
    if (hr < 50) {
      $scope.health_condition = 1;
      $scope.statistics_count[1] += 1;
      $scope.health = "Brady";
      // $scope.health = "Caution";
      return;
    };
    $scope.health_condition = 0;
    $scope.statistics_count[0] += 1;
    $scope.health = "Normal";
  };

  var ecg_bin;

  var ecg_storage;

  if ($window.localStorage["cassandra_command_lab_to_run_this_signal"]) {
    $scope.link = $window.localStorage["cassandra_command_lab_to_run_this_signal"];
    $window.localStorage.removeItem("cassandra_command_lab_to_run_this_signal");
    $http({
      method: "GET",
      url: $scope.link
    }).then(function successCallback(response) {
      ecg_bin = response.data.split('\r\n');
      $scope.sampling_frequency = ecg_bin[0];
      ecg_bin.splice(0, 1);
      ecg_storage = ecg_bin;
      if ($scope.sampling_frequency > 40) {
        $scope.down_sampling_value = Math.floor($scope.sampling_frequency / $scope.plot_speed);
        for (i = 0; i < ecg_bin.length; i ++) {
          ecg_bin[i] = ecg_bin[i] * 1000;
        };
        var value = Math.abs(dsp.find_min(ecg_bin));
        for (i = 0; i < ecg_bin.length; i ++) {
          ecg_bin[i] = ecg_bin[i] + value;
        };
        ecg_bin = preprocess_signal([10, 1500], $scope.down_sampling_value, null, ecg_bin);
        var chart_max_value = dsp.find_max(ecg_bin);
        var chart_min_value = dsp.find_min(ecg_bin);
        $scope.initiateChart(chart_max_value, chart_min_value);
      } else {
        var chart_max_value = dsp.find_max(ecg_bin);
        chart_max_value = chart_max_value * 1.4;
        var chart_min_value = dsp.find_min(ecg_bin);
        $scope.initiateChart(chart_max_value, chart_min_value);
      };
    }, function errorCallback(response) {
      alert("No entry found!");
    });
    // socket.emit("get_this_record_from_server", $scope.link);
    // socket.on("server_retrieve_and_send_back_this_record", function(response) {
    //   ecg_bin = response;
    //   console.log(ecg_bin);
    //   $scope.sampling_frequency = ecg_bin[0];
    //   ecg_bin.splice(0, 1);
    //   if ($scope.sampling_frequency > 40) {
    //     $scope.down_sampling_value = $scope.sampling_frequency / $scope.plot_speed;
    //     for (i = 0; i < ecg_bin.length; i ++) {
    //       ecg_bin[i] = ecg_bin[i] * 1000;
    //     };
    //     var value = Math.abs(dsp.find_min(ecg_bin));
    //     for (i = 0; i < ecg_bin.length; i ++) {
    //       ecg_bin[i] = ecg_bin[i] + value;
    //     };
    //     ecg_bin = preprocess_signal([10, 1500], $scope.down_sampling_value, null, ecg_bin);
    //     var chart_max_value = dsp.find_max(ecg_bin);
    //     var chart_min_value = dsp.find_min(ecg_bin);
    //     $scope.initiateChart(chart_max_value, chart_min_value);
    //   } else {
    //     // ecg_bin = dsp.magnify_maximum(ecg_bin);
    //     // console.log(dsp.cal_std(ecg_bin) + dsp.cal_mean(ecg_bin));
    //     var chart_max_value = dsp.find_max(ecg_bin);
    //     chart_max_value = chart_max_value * 1.4;
    //     var chart_min_value = dsp.find_min(ecg_bin);
    //     $scope.initiateChart(chart_max_value, chart_min_value);
    //   };
    // });
    // socket.on("get_this_record_from_server_failed", function(err) {
    //   alert("Read record failed!");
    // });
  } else {
    ecg_bin = [226,335,224,312,225,303,241,263,282,228,439,585,397,33,161,179,315,229,336,
      235,334,245,334,272,293,343,267,376,283,285,408,273,330,252,203,200,148,189,133,201,145,208,
      191,187,226,172,248,176,258,181,260,187,257,213,244,221,231,260,197,281,201,283,210,286,192,
      278,204,281,228,232,405,576,500,33,119,163,292,231,296,293,262,320,248,348,248,370,259,394,
      279,416,316,399,341,301,274,183,214,142,198,135,206,143,207,169,218,227,187,245,189,254,185,
      262,186,259,200,256,209,254,208,244,222,245,253,215,295,228,269,199,291,255,217,317,728,216,
      69,124,250,226,289,255,280,312,239,334,237,360,257,334,357,321,392,311,402,272,332,204,235,
      149,203,162,182,191,168,224,167,243,174,241,174,252,208,224,239,206,259,192,274,193,284,197,
      290,210,209,294,217,300,219,338,224,311,240,265,249,276,215,352,463,688,74,131,176,280,228,
      294,245,305,250,294,305,260,332,246,385,267,402,291,393,301,361,303,227,228,151,210,139,209,
      145,215,165,224,190,207,222,184,251,191,263,185,263,191,274,196,277,201,271,210,273,210,268,
      221,255,237,252,284,212,329,222,308,229,250,240,252,255,244,263,295,669,342,96,125,247,248,294,
      264,284,307,266,341,239,363,249,378,271,401,315,310,403,266,369,212,238,175,177,182,155,208,
      148,229,164,236,175,248,207,226,227,210,252,201,258,201,274,196,284,202,292,201,289,240,239,
      285,215,307,209,315,233,306,256,261,247,242,286,212,310,232,558,659,187,46,167,267,227,344,
      235,350,256,342,289,330,319,324,335,348,371,265,362,296,362,315,354,378,351,413,328,444,291,
      396,234,263,182,215,179,199,200,191,231,179,248,186,266,193,277,199,275,209,277,225,250,249,
      245,263,223,288,213,316,222,339,233,322,237,307,239,282,256,268,273,400,741,393,83,96,246,223,
      352,245,373,264,370,287,361,311,359,347,349,392,345,422,329,442,295,388,224,269,168,224,150,
      215,179,209,208,213,224,204,257,189,275,198,276,208,263,232,253,251,238,263,223,294,215,311,
      218,334,230,336,219,311,227,301,238,289,248,289,557,639,170,54,225,211,338,240,357,256,362,
      270,354,298,344,335,302,396,297,444,302,447,294,402,249,270,199,200,199,186,204,175,228,175,
      245,183,260,188,271,197,277,207,271,224,255,239,258,236,303,250,261,272,238,304,219,314,213,
      474,642,438,61,178,229,276,300,254,335,249,352,247,372,255,387,275,401,325,404,360,385,383,
      332,347,238,248,169,217,148,219,149,229,165,243,182,252,200,254,229,248,240,235,257,220,276,
      201,295,205,294,216,268,262,240,287,242,307,226,307,213,311,218,305,232,351,517,735,174,70,
      198,224,331,239,371,260,372,271,364,300,345,368,324,411,314,460,322,467,310,407,245,266,198,
      194,187,181,204,168,234,170,251,183,265,196,273,220,256,235,246,252,220,280,215,284,210,303,
      212,316,218,327,238,314,242,282,260,254,288,222,314,237,556,658,332,25,174,197,329,256,326,
      293,308,318,301,348,291,376,286,418,292,454,330,452,330,411,295,258,224,172,217,147,223,155,
      235,173,245,192,245,216,243,233,237,254,229,254,221,278,211,289,208,300,212,308,219,304,245,
      255,298,252,322,235,319,217,316,218,317,226,307,383,720,393,79,156,213,327,227,354,245,362,
      259,349,280,347,303,344,358,334,409,320,449,299,429,255,320,193,231,177,188,200,177,218,173,
      248,180,254,188,272,201,273,216,267,240,258,244,232,266,207,289,207,303,209,308,216,311,224,
      302,240,317,259,261,291,230,293,220,307,216,338,374,770,208,116,156,273,246,302,278,297,308,
      277,339,257,351,261,381,268,424,300,439,322,405,360,326,259,229,210,177,203,161,217,161,234,
      168,248,180,261,192,270,202,264,218,255,235,238,248,237,263,213,294,209,307,220,304,231,313,
      251,287,251,259,265,248,286,226,315,310,762,405,100,87,236,248,298,293,308,323,287,351,256,
      389,261,416,298,436,344,438,373,406,372,333,293,217,222,160,209,149,216,159,236,172,254,190,
      264,209,261,220,249,232,232,256,213,283,203,300,220,288,234,278,245,273,278,265,287,224,304,
      213,315,221,322,248,549,721,227,56,156,238,270,314,253,360,254,377,255,384,271,396,294,408,
      334,434,351,412,402,308,358,214,246,153,217,142,220,160,230,178,236,200,234,218,229,238,219,
      259,215,269,202,286,201,293,213,295,235,268,253,252,278,260,302,225,306,213,319,224,303,234,
      334,498,755,208,65,177,225,292,247,348,247,367,249,370,253,391,271,402,313,415,351,418,380,
      375,373,274,273,192,225,154,212,150,220,158,238,173,252,193,258,216,238,243,206,290,222,302,
      239,273,282,253,286,229,295,222,306,219,322,225,472,675,385,63,143,231,242,305,239,361,242,
      370,249,377,269,359,350,336,407,324,462,313,446,289,350,213,230,172,208,178,186,197,189,219,
      188,242,190,260,190,278,201,276,215,272,222,257,256,237,267,225,294,216,315,218,315,240,333,
      257,272,261,259,280,228,306,221,432,551,705,78,129,158,296,242,316,299,292,325,277,369,262,
      390,263,417,309,438,329,443,385,351,365,232,259,160,216,145,216,152,229,163,238,179,238,211,
      239,229,245,251,217,270,214,276,210,292,207,299,216,302,224,294,255,274,292,238,300,219,300,
      215,317,223,301,276,625,668,149,92,189,275,248,333,240,347,244,362,250,376,261,396,285,417,
      311,427,392,402,387,344,328,221,240,154,218,145,217,153,231,179,232,215,220,240,215,268,199,
      280,201,290,206,291,206,296,214,290,228,283,243,272,289,257,296,226,302,218,314,215,312,217,
      478,676,548,59,143,222,243,317,242,346,243,360,243,380,258,385,300,380,382,374,424,361,440,
      310,378,216,253,158,216,147,215,169,211,212,202,235,197,262,193,275,201,285,219,267,232,258,
      253,227,272,227,293,214,315,222,337,234,283,254,264,269,242,294,221,510,667,447,36,170,223,
      281,267,287,309,265,352,248,361,256,390,265,418,334,426,380,417,390,347,327,229,237,156,215,
      144,219,151,228,168,232,202,229,239,212,255,210,273,200,291,211,285,217,284,240,272,250,264,
      278,246,274,224,288,212,313,215,311,408,769,436,54,129,202,288,245,336,240,365,250,352,279,330,
      333,328,395,334,450,340,468,321,437,256,278,196,204,178,181,193,175,221,167,240,178,260,190,273
      ,214,268,225,252,236,240,263,211,293,210,315,223,323,219,293,234,285,249,252,297,239,625,721,283,
      16,175,193,321,250,320,297,305,318,292,348,275,375,283,422,320,448,322,473,326,437,265,286,191,
      193,193,155,208,151,227,162,241,176,258,192,266,218,251,246,240,252,232,264,228,285,231,305,222,
      302,209,295,211,296,218,300,224,435,717,543,76,98,254,221,332,236,357,257,347,275,355,294,350,351,
      352,410,353,446,347,459,302,382,214,251,154,212,145,211,166,210,189,212,214,219,234,214,258,211,
      274,207,283,208,300,214,307,240,297,270,250,268,239,282,227,219,323,234,360,251,349,300,322,352,
      288,400,297,459,331,468,348,423,307,257,238,156,209,148,222,160,236,186,234,213,224,242,220,255,
      213,272,206,287,207,298,227,304,234,260,254,237,269,220,292,208,405,626,543,74,151,215,249,270,
      240,326,240,349,239,364,247,383,258,400,286,428,330,414,374,351,331,246,238,168,220,149,223,156,
      238,174,246,190,252,216,247,232,227,258,212,292,201,296,211,308,212,280,220,280,224,267,252,241,
      444,654,347,44,198,194,314,229,337,255,333,276,324,309,312,340,305,374,304,424,306,434,301,411,
      253,306,193,223,182,188,202,197,222,199,233,196,252,192,272,195,282,204,276,221,270,233,268,239,
      253,294,239,310,228,290,211,302,211,303,211,312,318,734,347,112,140,237,289,258,347,238,366,245,
      372,250,381,270,387,332,384,381,372,388,362,377,284,288,203,237,163,225,156,238,174,245,196,246,
      232,232,250,220,265,210,276,205,281,203,297,214,281,240,265,261,251,278,239,297,231,320,231,330,
      218,318,226,297,255,276,281,403,733,266,107,136,270,222,337,234,360,247,363,256,361,272,348,300,
      347,347,335,378,295,419,272,386,228,281,186,228,173,216,201,199,237,198,256,196,263,194,282,200,
      279,206,267,218,270,223,267,238,273,237,251,253,242,275,230,293,231,309,231,325,217,322,216,313,
      224,292,241,363,589,476,100,112,264,222,339,244,359,273,327,288,309,325,326,364,299,397,285,432,
      287,432,282,385,248,243,208,193,204,169,229,167,251,186,248,221,236,232,229,251,214,267,205,273,
      199,294,208,286,234,279,249,268,280,264,280,234,289,217,319,216,319,218,437,572,647,81,107,167,280,268,307,315,308,353,288,370,273,396,273,424,310,427,345,408,363,368,340,272,249,196,221,162,223,161,236,172,250,205,239,224,239,241,226,259,214,268,203,287,209,293,222,280,236,274,259,275,280,231,294,216,321,216,318,228,491,661,354,56,154,226,255,326,246,369,248,378,254,381,262,399,270,303,385,312,415,299,412,269,357,206,261,162,225,161,222,183,231,208,233,226,225,244,213,257,199,263,237,231,251,216,266,211,290,209,303,220,325,238,285,245,242,278,229,296,231,523,623,232,62,216,235,285,281,294,319,280,336,269,369,261,398,270,419,296,424,323,399,360,334,303,228,181,264,192,276,210,275,222,269,230,256,248,236,281,219,291,221,296,227,331,221,317,214,308,234,300,239,288,329,603,544,96,158,191,318,229,351,258,357,278,337,323,287,357,280,393,283,434,291,440,296,411,265,290,215,196,202,177,211,167,242,173,254,183,255,207,252,221,260,224,245,241,257,239,235,272,219,286,210,313,223,328,227,285,260,249,281,222,302,237,616,554,154,95,215,255,281,305,250,355,243,382,267,379,303,349,358,351,401,331,428,309,421,257,319,184,234,162,215,172,201,205,203,227,193,244,192,260,193,278,204,282,217,255,234,247,253,242,271,226,298,230,323,220,306,216,312,227,309,253,313,514,735,237,43,159,210,350,260,369,288,357,304,324,366,305,395,304,433,299,459,309,455,305,405,242,283,188,223,170,204,189,201,206,201,243,192,259,190,272,195,278,193,280,215,259,238,249,249,231,290,217,308,227,317,222,304,219,308,223,304,240,330,535,725,176,69,179,220,303,243,348,244,366,255,376,273,363,331,347,398,306,453,316,448,307,378,239,253,187,194,196,167,212,172,233,173,253,183,266,192,275,215,254,232,262,233,243,242,233,267,244,264,229,301,232,305,212,306,216,299,249,252,302,519,745,175,104,146,285,225,350,245,363,264,361,282,357,303,332,377,320,427,317,460,312,448,277,341,211,216,187,184,194,182,216,170,240,177,260,187,272,207,261,221,255,236,258,252,233,272,213,296,213,325,218,312,210,305,242,267,254,260,274,408,733,221,103,134,287,226,343,256,336,276,340,297,319,342,279,393,298,435,314,451,311,453,279,370,208,254,163,222,164,216,181,217,198,214,241,199,260,194,278,201,284,204,286,221,279,230,263,265,237,276,228,303,215,333,224,335,220,313,233,299,239,297,266,260,573,567,172,73,242,229,297,289,265,346,248,362,247,374,258,397,285,410,326,423,371,389,374,315,290,217,226,166,216,152,228,178,226,210,218,224,218,245,206,272,199,282,201,284,207,287,216,285,231,271,243,236,268,220,301,215,318,217,333,231,333,234,280,253,263,266,243,300,257,623,540,145,226,289,265,335,252,374,246,378,265,368,293,350,412,284,446,311,439,335,386,278,260,211,186,194,167,206,162,232,169,253,192,256,209,257,241,226,254,220,270,220,296,233,291,263,267,298,247,292,231,304,223,315,221,315,270,684,575,153,51,216,227,335,280,318,318,290,346,274,376,273,400,283,433,305,458,320,455,330,385,296,224,226,169,208,152,219,155,238,168,251,192,254,218,252,236,229,259,200,286,205,288,215,288,226,281,237,258,280,241,295,237,323,228,324,216,316,227,306,236,293,324,637,564,80,116,177,349,281,310,335,285,389,268,421,297,438,363,395,382,333,335,189,232,187,196,193,189,218,178,243,183,260,189,270,205,264,225,244,245,230,265,221,273,210,293,210,306,214,308,225,296,250,263,277,245,326,228,320,220,313,241,298,251,258,372,605,523,55,167,185,326,229,341,259,329,301,290,321,281,355,275,383,283,414,306,434,297,433,271,340,215,240,183,206,182,198,200,188,239,179,264,189,274,205,256,237,238,249,225,268,203,297,208,291,227,283,243,270,261,255,280,239,305,228,304,221,322,229,335,236,316,242,290,262,258,285,245,481,642,278,52,220,204,327,237,337,256,332,290,287,351,255,374,262,407,279,426,311,421,339,340,306,240,235,181,216,157,221,156,234,164,246,178,257,195,263,209,262,227,252,244,232,272,210,283,204,294,204,304,222,295,239,271,265,262,289,243,322,222,309,218,320,221,316,232,358,485,741,166,67,194,219,329,242,373,247,380,254,382,263,380,306,382,356,369,419,337,431,312,409,246,292,182,229,155,215,177,210,217,193,234,199,248,195,270,194,283,204,277,217,270,226,262,258,239,285,218,314,227,299,253,296,287,245,295,219,306,215,316,223,408,619,631,97,96,197,248,310,254,363,249,373,260,383,274,387,316,383,360,369,419,337,429,303,385,227,270,174,212,174,206,177,214,216,195,239,199,260,192,274,199,281,207,264,224,252,243,240,256,237,271,228,290,215,315,217,326,247,296,248,272,254,255,266,246,290,296,700,414,111,99,255,235,319,268,315,294,307,322,291,350,265,393,267,426,302,423,353,361,382,280,289,194,237,150,225,166,228,178,232,211,230,226,222,240,209,259,202,275,203,285,202,293,212,288,226,277,232,248,290,217,298,224,329,220,315,217,304,238,291,257,262,478,659,279,54,208,210,331,241,346,263,356,267,348,310,296,347,282,398,282,439,292,446,300,401,265,280,225,176,257,184,274,193,282,216,277,227,259,256,240,252,235,268,218,306,211,315,217,317,223,337,241,315,247,280,266,234,304,221,317,336,755,257,100,105,260,262,296,283,288,328,268,357,259,372,257,407,281,423,344,420,374,394,352,315,275,226,213,177,203,163,219,163,236,172,254,189,258,202,270,212,268,218,254,231,242,252,227,261,226,284,212,311,212,317,217,335,230,332,230,312,238,298,231,302,248,346,583,681,149,54,206,217,341,241,369,249,376,258,382,271,392,311,367,377,377,416,370,413,347,394,254,284,192,225,149,217,149,228,165,239,194,237,213,228,251,202,268,200,278,199,287,199,289,210,287,227,280,239,291,255,282,282,265,292,237,290,223,314,217,315,233,545,690,238,63,167,251,266,302,270,339,256,381,250,386,259,396,273,422,307,432,374,410,384,329,329,234,239,165,212,147,224,153,236,166,253,182,257,203,248,238,241,254,226,266,220,274,207,298,205,302,207,308,212,309,224,298,238,287,261,279,277,244,306,221,320,218,320,228,373,605,577,114,106,251,221,336,244,355,275,313,296,293,328,288,362,293,403,293,451,296,448,284,400,231,271,182,222,173,206,193,189,227,184,245,184,266,193,281,199,286,215,273,229,262,254,232,266,225,286,219,296,213,314,210,312,221,328,227,325,249,322,245,299,247,271,268,239,295,221,406,553,564,68,173,183,314,226,340,245,348,265,251,350,255,357,271,393,281,436,298,448,333,419,300,294,233,190,206,153,218,153,231,170,244,185,245,220,236,241,231,250,218,257,224,270,213,269,220,293,213,300,212,315,216,315,223,308,240,300,267,271,272,242,286,225,316,220,327,266,696,555,119,95,199,291,251,349,247,378,250,380,276,355,342,348,386,304,442,316,457,306,422,263,296,198,220,170,197,187,186,213,182,239,178,252,185,272,194,279,210,270,232,245,255,216,273,214,292,209,310,216,313,226,301,253,282,298,247,291,229,293,232,303,219,462,635,571,58,125,215,259,306,274,327,266,356,257,387,256,397,270,417,304,433,360,407,385,356,358,231,256,165,215,143,219,151,232,163,243,189,242,224,237,242,228,242,224,258,222,259,210,278,206,294,204,303,212,300,231,275,268,260,285,255,320,237,316,217,313,215,317,219,321,275,709,507,124,94,221,256,370,262,378,294,391,345,401,377,368,384,313,304,211,231,159,216,149,225,155,240,173,245,202,241,240,229,245,218,274,210,281,205,289,206,300,215,300,231,265,248,258,265,257,291,242,306,234,343,218,318,216,318,220,317,230,306,273,603,611,124,124,194,277,236,339,232,359,251,340,272,332,303,306,377,302,405,298,447,288,425,263,325,207,236,175,198,183,185,207,187,231,183,261,185,273,194,280,194,279,208,276,220,259,250,243,266,224,294,210,309,218,303,227,303,241,307,266,282,285,228,291,223,306,220,313,298,723,435,118,120,230,268,264,308,260,338,257,363,251,379,265,405,277,427,313,449,340,437,354,371,281,242,212,188,195,166,211,158,230,168,249,179,263,187,271,198,270,213,266,236,255,248,237,267,212,301,209,306,218,318,225,308,264,299,261,261,271,231,309,221,308,225,478,612,566,49,136,170,308,252,335,298,328,308,308,344,285,374,282,404,294,439,314,460,309,439,282,320,228,209,198,155,215,155,233,161,249,177,253,208,255,219,239,250,220,267,210,277,207,293,206,296,207,312,221,308,233,300,247,289,288,243,309,227,317,218,321,222,319,318,703,459,82,118,208,279,249,341,249,371,247,379,270,366,303,371,337,369,384,372,408,335,412,271,322,189,240,153,224,155,226,181,222,210,211,248,189,263,192,274,201,282,211,279,227,252,252,245,264,235,280,212,300,209,311,215,320,223,320,260,302,261,268,265,241,302,225,299,279,763,284,84,200,226,305,236,330,233,345,239,365,245,374,263,385,285,395,333,398,365,347,401,271,307,190,235,149,219,148,228,169,221,196,228,217,225,236,225,254,216,271,206,279,198,284,200,290,208,294,222,297,225,280,244,269,255,258,286,258,293,219,314,213,321,224,312,239,492,678,463,51,140,207,267,292,259,348,254,362,250,383,255,401,272,410,331,411,371,376,419,302,375,213,257,160,206,170,207,190,200,222,190,243,183,265,193,275,201,280,219,256,240,251,255,230,270,214,302,211,315,213,322,220,332,247,328,247,292,261,265,267,242,307,269,655,634,183,33,209,206,335,277,289,349,258,387,259,399,267,400,327,399,355,395,423,347,428,250,306,186,227,166,199,186,203,208,181,243,182,261,185,272,195,280,200,281,211,277,224,290,304,228,342,229,336,222,318,230,310,245,295,271,441,760,282,88,136,259,226,344,236,362,243,364,251,375,271,360,328,352,375,351,408,334,414,295,377,240,263,164,227,150,221,159,231,179,237,199,239,223,234,237,228,244,235,255,225,270,206,291,203,297,206,302,214,302,226,286,241,299,239,278,258,272,283,268,281,241,295,227,317,223,304,271,523,686,218,105,181,275,237,340,238,347,263,323,324,268,353,268,388,275,430,295,448,288,434,274,356,219,245,185,210,178,202,191,192,234,181,251,184,267,194,277,205,276,221,265,246,251,258,227,274,209,294,209,309,213,314,228,314,233,308,240,289,298,258,304,222,310,216,317,217,321,242,549,683,253,70,174,247,270,310,266,338,258,364,252,376,257,395,272,421,306,437,331,433,352,385,314,256,244,185,211,152,208,159,226,168,245,176,256,184,271,196,271,212,269,229,263,233,247,262,224,284,207,306,211,315,222,322,236,327,245,311,252,270,281,240,296,238,300,283,655,631,179,34,209,207,347,244,353,281,338,296,320,363,290,390,295,428,304,460,310,459,320,396,253,252,213,186,197,165,208,171,223,179,237,183,260,185,276,202,272,222,246,240,234,255,228,271,211,307,212,289,231,281,245,272,266,244,297,237,332,226,329,217,317,216,315,225,314,259,579,662,197,89,181,278,255,331,256,366,245,372,256,354,302,355,338,357,372,342,429,313,427,274,343,204,251,164,223,158,207,195,205,227,190,243,192,257,192,273,193,281,200,270,227,265,231,243,245,232,268,224,287,213,310,216,318,221,324,228,323,254,308,274,274,255,250,295,228,311,232,559,629,266,28,183,193,326,237,353,338,253,364,250,380,274,388,303,354,386,367,412,339,417,282,345,203,248,155,216,161,206,196,190,221,190,244,184,265,194,269,219,260,236,227,262,218,280,212,292,212,298,210,300,226,294,256,277,300,245,308,224,305,220,324,224,307,238,486,689,374,54,114,216,259,313,273,355,261,372,261,380,262,398,305,405,354,404,393,386,424,307,372,225,262,163,219,144,216,171,220,193,226,212,224,235,220,261,201,274,203,278,206,286,210,278,232,268,248,259,269,234,288,229,306,222,331,237,329,230,290,267,253,282,233,315,311,718,468,118,94,245,240,316,284,293,378,343,405,372,394,356,344,268,235,217,179,203,157,221,160,236,176,251,190,255,200,254,226,249,240,246,252,232,262,222,279,216,284,212,300,219,304,226,299,240,271,278,247,327,230,319,224,313,233,305,247,289,445,715,279,68,169,218,305,263,294,292,272,348,252,370,260,388,269,408,332,411,338,415,342,361,277,244,221,187,195,177,207,178,223,179,240,182,257,190,269,206,264,212,268,224,264,226,271,234,262,261,235,272,223,299,214,304,229,300,254,289,275,258,293,235,292,222,304,220,301,272,645,530,116,83,212,263,262,343,250,376,260,371,266,375,304,360,355,365,399,350,420,334,411,268,328,194,226,166,197,182,180,205,192,226,183,253,192,258,201,270,216,255,238,248,242,244,257,240,267,233,288,225,308,225,316,225,321,240,341,244,312,236];
    ecg_storage = ecg_bin;
    ecg_bin = preprocess_signal([10, 1500], 2, null, ecg_bin);
    $scope.initiateChart(dsp.find_max(ecg_bin), dsp.find_min(ecg_bin));
  };

  var hrv_data = [],
      hrh_data = [],
      hrvh_data = [],
      stdh_data = [],
      th_data = [];



  $scope.updateChart = function(chart_data) {
    $scope.chart.update(chart_data);
    // $scope.chart_fecg.update(chart_data);
  };
  $scope.updateChartData = function(index, value) {
    if (index < $scope.window_leng - 2) {
      chart_data.series[0][index] = value;
      chart_data.series[0][index + 1] = null;
    } else {
      // When reaching the end of the window_leng
      // update the value
      chart_data.series[0][index] = value;
      // Then perform diagnosis
      var t0 = performance.now();
      heart_rate_interval_tasks_handle();
      variability_interval_tasks_handle();
      health_interval_tasks_handle();
      t_and_std_interval_tasks_handle();

      // var package_to_server = {
      //   number_of_samples: $scope.window_leng,
      //   tick_interval: $scope.window_span
      // };
      // socket.emit("get_sample_ecg_data", package_to_server);

      chart_data.series[0][0] = null;
      var t1 = performance.now();
      console.log(Math.floor((t1 - t0) * 100) / 100 + "ms");
    };
  };



  var chart_update_interval_tasks_handle = function() {
    var value = ecg_bin[$scope.data_pointer];

    if ($scope.chart_pointer == $scope.window_leng) {
      $scope.chart_pointer = 0;
    };

    $scope.updateChartData($scope.chart_pointer, value);
    $scope.updateChart(chart_data);

    $scope.data_pointer += 1;
    $scope.chart_pointer += 1;
  };
  var stop_all_intervals_and_timeouts = function() {

    // chart draw interval
    if ($scope.chart_update_interval != null) {
      $interval.cancel($scope.chart_update_interval);
    };
    $scope.chart_update_interval = null;

    // heart rate interval
    if ($scope.heart_rate_interval != null) {
      $interval.cancel($scope.heart_rate_interval);
    };
    $scope.heart_rate_interval = null;

    // variability interval
    if ($scope.variability_interval != null) {
      $interval.cancel($scope.variability_interval);
    };
    $scope.variability_interval = null;

    // health interval
    if ($scope.health_interval != null) {
      $interval.cancel($scope.health_interval);
    };
    $scope.health_interval = null;

    // chart update timeout interval
    if ($scope.chart_update_timeout != null) {
      $timeout.cancel($scope.chart_update_timeout);
    };
    $scope.chart_update_timeout = null;
  };

  var animate_blinking = function() {
    jQuery(".blinking").animate({
      "opacity": 0.6
    }, 1000, function() {
      jQuery(".blinking").animate({
        "opacity": 1
      }, 1000, function() {
        animate_blinking();
      });
    });
  };
  var scroll_to_bottom_of_message_box = function() {
    console.log(jQuery("#div_chat_content").height());
    jQuery("#div_chat_content").animate({ scrollTop: jQuery(this).height() }, 400);
  };

  animate_blinking();

  var update_colors =  function() {
    $scope.heart_rate_color       = colors_pool[$scope.heart_rate_condition];
    $scope.variability_color      = colors_pool[$scope.variability_condition];
    $scope.health_color           = colors_pool[$scope.health_condition];
    $scope.tmag_color             = colors_pool[$scope.tmag_condition];
    $scope.std_color              = colors_pool[$scope.std_condition];
  };

  $scope.chat_messages = [];

  $scope.insert_chat_message = function(content) {
    var chat_message = {
      name: "Me",
      style: "color:" + green_code,
      content: content,
      time: new Date()
    };
    $scope.chat_messages.push(chat_message);
    $scope.message_content = "";
    scroll_to_bottom_of_message_box();
  };

  $scope.chart_update_interval = $interval(function() {
    if ($scope.data_pointer < ecg_bin.length) {
      chart_update_interval_tasks_handle();
    } else {
      // $scope.data_pointer = 0;
      // chart_update_interval_tasks_handle();
      stop_all_intervals_and_timeouts();
    };
  }, $scope.tick_speed);

  var heart_rate_interval_tasks_handle = function() {
    // var fs   = 50;
    // var data = chart_data.series[0];
    // socket.emit("calculate_heart_rate", [fs, data]);
    var fs   = 50;
    var data = chart_data.series[0];
    var heart_rates = dsp.calculate_heart_rates(fs, data);
    for (i = 0; i < heart_rates.length; i++) {
      hrv_data.push(heart_rates[i]);
      hrh_data.push(heart_rates[i]);
    };
    $scope.heart_rate = Math.round(dsp.cal_mean(heart_rates));
    if ($scope.heart_rate < 60) {
      $scope.heart_rate_condition = 1;
      update_colors();
    } else {
      if ($scope.heart_rate < 100) {
        $scope.heart_rate_condition = 0;
        update_colors();
      } else {
        if ($scope.heart_rate < 120) {
          $scope.heart_rate_condition = 1;
          update_colors();
        } else {
          $scope.heart_rate_condition = 2;
          update_colors();
        };
      };
    };
  };
  var variability_interval_tasks_handle = function() {
    // socket.emit("calculate_hrv", { values: hrv_data });

    var value = dsp.cal_std(hrv_data);
    value = (Math.floor(value * 100) / 100).toFixed(2);
    hrvh_data.push(value);
    $scope.variability = value;
    if (value < 10) {
      $scope.variability_condition = 0;
    } else {
      if (value < 20) {
        $scope.variability_condition = 1;
      } else {
        $scope.variability_condition = 2;
      }
    }
    update_colors();
    hrv_data = [];
  };
  var t_and_std_interval_tasks_handle = function() {
    var fs   = 50;
    var data = chart_data.series[0];
    var qrs_locs = dsp.qrs_detect(fs, data);
    var result = dsp.t_peaks_detect(fs, data, qrs_locs);
    // var result = dsp.t_peaks_detect(fs, data);
    t_peaks = result[0];
    t_locs = result[1];
    var std_results = dsp.std_detect(fs, data, qrs_locs, t_locs);
    var t_peak = Math.round(dsp.cal_mean(t_peaks));
    var std_val = Math.round(dsp.cal_mean(std_results));
    // Push data into heathcare bin
    for (ali = 0; ali < t_peaks.length; ali++) {
      th_data.push(t_peaks[ali]);
    };
    for (ali = 0; ali < std_results.length; ali++) {
      stdh_data.push(std_results[ali]);
    };
    // End of healthcare bin
    // Handle t peak
    $scope.tmag = t_peak;
    if (t_peak < -10) {
      $scope.tmag_condition = 2;
    } else {
      if (t_peak > 110) {
        $scope.tmag_condition = 1;
      } else {
        $scope.tmag_condition = 0;
      };
    };
    // Hanlde std value
    $scope.std_val = std_val;
    if (std_val < -40) {
      $scope.std_condition = 2;
    } else {
      if (std_val < -20) {
        $scope.std_condition = 1;
      } else {
        if (std_val > 40) {
          $scope.std_condition = 2;
        } else {
          $scope.std_condition = 0;
        };
      }

    };
    update_colors();
  };
  var health_interval_tasks_handle = function() {
    var mean_hr = dsp.cal_mean(hrh_data);
    var mean_hrv = dsp.cal_mean(hrvh_data);
    var mean_t = dsp.cal_mean(th_data);
    var mean_std = dsp.cal_mean(stdh_data);

    perform_diagnosis_for_these_features(mean_hr, mean_hrv, mean_std, mean_t);

    update_colors();
    hrh_data = [];
    hrvh_data = [];
    stdh_data = [];
    th_data = [];
  };

  var using_intervals_to_diagnose = function(hr, vari, heal) {
    if (hr) {
      $scope.heart_rate_interval = $interval(function() {
        heart_rate_interval_tasks_handle();
      }, hr);
    };
    if (vari) {
      $scope.variability_interval = $interval(function () {
        variability_interval_tasks_handle();
      }, vari);
    };
    if (heal) {
      $scope.health_interval = $interval(function () {
        health_interval_tasks_handle();
      }, heal);
    };
  };

  //using_intervals_to_diagnose(2000, 2000, 2000);



  socket.on("diag_server-welcome-new-user", function(data) {
    var chat_message = {
      name: "Server",
      style: "color:" + red_code,
      content: "Hello there, group conversation goes here. Enjoy :)",
      //content: "Hello",
      time: new Date()
    };
    $scope.chat_messages.push(chat_message);
  });

  socket.on("sample_ecg_sent_from_server", function(data) {
    console.log("Data received from server");
    if (data.length > 0) {
      ecg_storage = ecg_storage.concat(data);
      data = preprocess_signal([10, 1500], 2, null, data);
      ecg_bin = ecg_bin.concat(data);
    };
  });

  socket.on("save_record_to_server_failed", function(response) {
    alert(response);
  });

  socket.on("save_record_to_server_successed", function(response) {
    alert("Record saved successfully!");
    var record = response;
    if ($window.localStorage["cassandra_records"]) {
      $scope.records = JSON.parse($window.localStorage["cassandra_records"]);
    } else {
      $scope.records = [];
    };
    record.record_data.data = [];
    $scope.records.push(record);
    $window.localStorage["cassandra_records"] = JSON.stringify($scope.records);
  });

  var transform_statistics = function(array) {
    var total = array[0] + array[1] + array[2];
    array[0] = Math.floor(array[0] / total * 100);
    array[1] = Math.floor(array[1] / total * 100);
    array[2] = 100 - array[0] - array[1];
    return array;
  };
  $scope.save_this_record = function() {
    for (var loop = 0; loop < ecg_storage.length; loop++) {
      ecg_storage[loop] = ecg_storage[loop] / 1000;
    };
    $scope.record_name = "Normal and healthy ECG";
    $scope.record_description = "My ECG while resting with some light coffee and music";
    $scope.new_record = {
      name: $scope.record_name,
      date: new Date(),
      data_link: $scope.local_server.link + "\\bin\\saved-records\\" + $scope.record_name.split(' ').join('_') + ".txt",
      description: $scope.record_description,
      clinical_symptoms: {
        chest_pain: false,
        shortness_of_breath: false,
        severe_sweating: false,
        dizziness: false,
      },
      statistics: transform_statistics($scope.statistics_count),
      send_to_doctor: false,
      record_data: {
        sampling_frequency: $scope.sampling_frequency,
        data: ecg_storage
      }
    };

    socket.emit("save_this_record_to_server", $scope.new_record);

    // $http({
    //   method: "POST",
    //   url: $scope.local_server.link + "/save_this_record",
    //   data: $scope.new_record
    // }).then(function successCallback(response) {
    //
    // }, function errorCallback(response) {
    //
    // });

  };
}]);
