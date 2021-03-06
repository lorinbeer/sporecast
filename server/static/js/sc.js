

/**
 * @type {Object}
 */
var sc = {};


/******************************************************************************/


/**
 * @type {Object} UA namespace.
 */
sc.ua = {};


/**
 * @return {boolean}
 */
sc.ua.getPlatform = function() {
  return window.device ? window.device.platform.toLowerCase() : 'desktop';
};


/**
 * @return {boolean}
 */
sc.ua.isSimulator = function() {
  return window.device && window.device.model &&
         (window.device.model == 'x86_64' ||  // ios simulator
          window.device.model == 'simulator');  // whatever on droid
};


/**
 * @type {boolean}
 */
sc.ua.IS_ANDROID =
    window.navigator.userAgent.toLowerCase().indexOf('android') !== -1;


/**
 * @type {boolean}
 */
sc.ua.IS_IOS =
    window.navigator.userAgent.toLowerCase().indexOf('iphone') !== -1 ||
    window.navigator.userAgent.toLowerCase().indexOf('ipad') !== -1;


/**
 * @type {boolean}
 */
sc.ua.IS_CORDOVA = typeof cordova !== 'undefined';


/**
 * The running app, and not the simulator.
 * @type {boolean}
 */
sc.ua.IS_APP = window.location.protocol === 'file:' &&
                sc.ua.IS_CORDOVA &&
                (sc.ua.IS_ANDROID || sc.ua.IS_IOS);


/**
 * The hosted web app.
 * @type {boolean}
 */
sc.ua.IS_PROD_WEB_APP = window.location.hostname.indexOf('appspot') !== -1 ||
    window.location.hostname.indexOf('sporecast.net') !== -1;


/******************************************************************************/


/**
 * @return {Function} The native console.log implementation.
 * @private
 */
sc.getConsoleLogger_ = function() {
  return _.bind(console.log, console);
};


/**
 * @return {Function} A wrapped up stringifier.
 * @private
 */
sc.getWebViewLogger_ = function() {
  return _.bind(function() {
    var argumentsArray = _.toArray(arguments);
    var consoleStrings = [];
    _.each(argumentsArray, function(logLine) {
      if (_.isElement(logLine)) {
        consoleStrings.push('isElement-className: ' + logLine.className);
      } else if (_.isObject(logLine)) {
        // Some of our objects have circular references..
        try {
          // Wrapped in quotation marks for later parseability.
          var stringified = '"' + JSON.stringify(logLine) + '"';
          consoleStrings.push(stringified);
        } catch (err) {
          consoleStrings.push(logLine);
        }
      } else {
        consoleStrings.push(logLine);
      }
    });

    var consoleString = consoleStrings.join(', ');
    console.log(consoleString);
  }, console);
};


/**
 * @param {string} src The script src.
 */
sc.injectScript = function(src) {
  script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.onload = function() {
    // remote script has loaded
  };
  script.src = src;
  $('head').get(0).appendChild(script);
};


/**
 * Good times, wrap sc.log
 */
sc.log = sc.ua.IS_APP ?
    sc.getWebViewLogger_() : sc.getConsoleLogger_();


/**
 * @param {Object} obj An object to clone.
 * @return {Object} A deep clone of the passed in object.
 */
sc.clone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};


/**
 * @param {number} time An ISO time.
 * @return {string} A pretty representation of the time.
 */
sc.prettyDate = function(time) {
  var date = new Date(time),
      diff = (((new Date()).getTime() - date.getTime()) / 1000),
      dayDiff = Math.floor(diff / 86400);
  if (isNaN(dayDiff) || dayDiff < 0 || dayDiff >= 31) {
    return 'a bit ago';
  }

  return dayDiff === 0 && (
      diff < 60 && 'just now' ||
      diff < 120 && '1 min' ||
      diff < 3600 && Math.floor(diff / 60) + ' min' ||
      diff < 7200 && '1 hour' ||
      diff < 86400 && Math.floor(diff / 3600) + ' hours') ||
      dayDiff == 1 && 'Yesterday' ||
      dayDiff < 7 && dayDiff + ' days' ||
      dayDiff < 31 && Math.ceil(dayDiff / 7) + ' weeks';
};
