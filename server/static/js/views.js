


/**
 * @extends {Backbone.View}
 * @constructor
 */
sc.views.App = Backbone.View.extend({
  el: '.sc-app',
  events: {
    'tap .sc-app-link': 'onClickAppLink_',
    'tap .sc-take-photo': 'onClickTakePhoto_'
  }
});


/** @inheritDoc */
sc.views.App.prototype.initialize = function(options) {
  sc.log('sc.views.App.initialize', this.model);

  // For some special scroll/overflow control.
  $('html,body').addClass('sc-app-container');

  $('body').addClass('sc-platform-' + sc.ua.getPlatform());

  $(window).on('orientationchange',
      _.debounce(_.bind(this.handleResizeOrientationChange_, this), 500), true);
  $(window).on('resize',
      _.debounce(_.bind(this.handleResizeOrientationChange_, this), 500), true);

  this.onChangeWeatherDataPrefs_();  // init link w/ correct href.
  this.listenTo(this.model.weatherData.prefs, 'change',
      this.onChangeWeatherDataPrefs_);
};


/**
 * @param {Event} e A click event.
 * @private
 */
sc.views.App.prototype.onClickAppLink_ = function(e) {
  sc.log('sc.views.App.onClickAppLink_', e);
  e.preventDefault();
  window['app'].navigate($(e.currentTarget).attr('href'),
                         {trigger: true});
};


/** @private */
sc.views.App.prototype.onChangeWeatherDataPrefs_ = function() {
  var urlState = this.model.weatherData.prefs.getUrlState();
  $('.weather.sc-app-link').attr('href', urlState);

  // Quietly update the URL as appropo
  if (this.currentView == this.viewWeather) {
    window['app'].navigate(urlState, {replace: true});
  }
};


/**
 * @private
 */
sc.views.App.prototype.handleResizeOrientationChange_ = function() {
  this.setCurrentView(this.currentView);

  // Resize the scrollys.
  this.currentView && this.currentView.subView &&
      this.currentView.subView.render();
};


/**
 * @param {Backbone.View} view A view instance.
 * @return {number} The index of this node in it's parent list.
 * @private
 */
sc.views.App.prototype.getTabIndex_ = function(view) {
  return view.$el.parent('.sc-tab').index();
};


/**
 * @param {Backbone.View} view A view instance.
 */
sc.views.App.prototype.setCurrentView = function(view) {
  // Calls a "setIsActive" function if defined on this view.
  if (this.currentView && view !== this.currentView) {
    this.currentView.setIsActive &&
        this.currentView.setIsActive(false);
  }

  this.currentView = view;

  // Calls a "setIsActive" function if defined on this view.
  this.currentView.setIsActive &&
      this.currentView.setIsActive(true);

  // Sets up tab / container widths so we can have nice scrolling and
  // tab animations.
  var screenW = document.documentElement.clientWidth;

  var $mfTabs = $('.sc-tab');

  var tabIndex = this.getTabIndex_(view);
  var transform = 'translateX(-' + (tabIndex * screenW) + 'px)';
  $('.sc-tab-frame').
      css('-webkit-transform', transform).
      css('transform', transform);

  _.defer(function() {
    // Enables transitions on all but the first change.
    if (!$('.sc-tab-frame').hasClass('sc-active')) {
      $('.sc-tab-frame').addClass('sc-active');
    }
  });
};


/**
 * @param {Object} route A route.
 */
sc.views.App.prototype.transitionPage = function(route) {
  sc.log('sc.views.App --> transitionPage', route);

  var newTab;
  var newView;

  this.$('.sc-tabs .selected').removeClass('selected');
  var $priorActiveTab = this.$('.sc-tab.sc-active');
  if ($priorActiveTab.length) {
    $priorActiveTab.removeClass('sc-active');
    _.defer(function() {
      $priorActiveTab.get(0).scrollTop = 0;
    });
  }

  if (_.isEqual(sc.App.Routes.WEATHER, route)) {
    if (!this.viewWeather) {
      this.viewWeather = new sc.views.Weather({
        model: this.model.weatherData
      });
      this.viewWeather.render();
    }
    newTab = 'weather';
    newView = this.viewWeather;

  } else if (_.isEqual(sc.App.Routes.MUSHROOM_OBSERVER, route)) {

    if (!this.viewMob) {
      this.viewMob = new sc.views.Mob({
        model: this.model.mobData
      });
      this.viewMob.render();
    }
    newTab = 'mob';
    newView = this.viewMob;

  } else if (_.isEqual(sc.App.Routes.PHOTOS, route)) {

    if (!this.viewPhotos) {
      this.viewPhotos = new sc.views.Photos({
        model: this.model.photosData
      });
      this.viewPhotos.render();
    }
    newTab = 'photos';
    newView = this.viewPhotos;

  }

  this.$('.sc-tabs .' + newTab).addClass('selected');
  this.$('.sc-tab.sc-tab-' + newTab).addClass('sc-active');
  this.setCurrentView(newView);
};


/**
 * @param {Event} e A click event.
 * @private
 */
sc.views.App.prototype.onClickTakePhoto_ = function(e) {
  if (!navigator.camera) {
    alert('Try installing the mobile App!');
    return;
  }

  var cameraOptions = {
    quality: 100,
    destinationType: Camera.DestinationType.FILE_URI,
    sourceType: Camera.PictureSourceType.CAMERA,
    allowEdit: true,
    encodingType: Camera.EncodingType.JPEG,
    targetWidth: 800,
    saveToPhotoAlbum: true
  };
  navigator.camera.getPicture(
      _.bind(this.onPhotoSuccess_, this),
      _.bind(this.onPhotoError_, this),
      cameraOptions);
};


/**
 * update this.model.photosData
 * @param {string} photoUri The path to the photo.
 * @private
 */
sc.views.App.prototype.onPhotoSuccess_ = function(photoUri) {
  this.model.photosData.create({'uri': photoUri});
};


/**
 * @param {string} errorMessage An error message.
 * @private
 */
sc.views.App.prototype.onPhotoError_ = function(errorMessage) {
  alert(errorMessage);
};


/******************************************************************************/



/**
 * @extends {Backbone.View}
 * @constructor
 */
sc.views.Weather = sc.views.View.extend({
  el: '.sc-weather',
  events: {
    'tap .month-prev': 'onTapMonthPrev_',
    'tap .month-next': 'onTapMonthNext_',
    'change select': 'onChangePrefs_'
  }
});


/** @inheritDoc */
sc.views.Weather.prototype.initialize = function(options) {
  sc.log('views.Weather initialize');
  this.subView = new sc.views.WeatherData({
    model: this.model
  });
  if (!this.model.has('data')) {
    this.model.fetch();
  }
};


/** @private */
sc.views.Weather.prototype.onTapMonthNext_ = function() {
  this.setMonthIndex_(1);
};


/** @private */
sc.views.Weather.prototype.onTapMonthPrev_ = function() {
  this.setMonthIndex_(-1);
};


/**
 * @param {number} delta The delta to change the month index.
 * @private
 */
sc.views.Weather.prototype.setMonthIndex_ = function(delta) {
  sc.log('sc.views.Weather setMonthIndex_', delta);
  var $selectMonth = this.$('select[name="month"]');
  var $selectYear = this.$('select[name="year"]');
  var currentYear = window.parseInt($selectYear.val(), 10);
  var curMonth = $selectMonth.val();
  var curIndex = _.indexOf(sc.models.WeatherPrefsMonths, curMonth);
  var nextIndex = curIndex + delta;
  if (sc.models.WeatherPrefsMonths[nextIndex]) {
    $selectMonth.val(sc.models.WeatherPrefsMonths[nextIndex]);

  } else if (delta > 0) {
    $selectYear.val(currentYear + delta);
    $selectMonth.val(sc.models.WeatherPrefsMonths[0]);

  } else if (delta < 0) {
    $selectYear.val(currentYear + delta);
    $selectMonth.val(sc.models.WeatherPrefsMonths[
        sc.models.WeatherPrefsMonths.length - 1]);
  }

  this.onChangePrefs_();
};



/** @private */
sc.views.Weather.prototype.onChangePrefs_ = function() {
  var obj = sc.views.serializeFormToObject(this.$form);
  sc.log('sc.views.Weather onChangePrefs_', obj);
  this.model.prefs.set(obj);
};


/** @inheritDoc */
sc.views.Weather.prototype.render = function() {
  sc.log('sc.views.Weather render');

  this.$el.html(sc.views.getTemplateHtml('weather', {
    prefs: this.model.prefs.getTemplateData(),
    cities: sc.models.WeatherPrefsCities,
    months: sc.models.WeatherPrefsMonths,
    years: sc.models.WeatherPrefsYears
  }));

  this.$form = this.$('form');
  this.$('[name="city"]').val(this.model.prefs.get('city'));
  this.$('[name="month"]').val(this.model.prefs.get('month'));
  this.$('[name="year"]').val(this.model.prefs.get('year'));

  this.$data = this.$('.data-c');
  this.subView.setElement(this.$data);
  this.subView.render();

  return this;
};



/******************************************************************************/



/**
 * @extends {Backbone.View}
 * @constructor
 */
sc.views.WeatherData = sc.views.View.extend({
  events: {}
});


/** @inheritDoc */
sc.views.WeatherData.prototype.initialize = function(options) {
  sc.log('views.WeatherData initialize');
  this.listenTo(this.model, 'change', this.render);
};


/** @inheritDoc */
sc.views.WeatherData.prototype.render = function() {
  sc.log('sc.views.WeatherData render');

  this.$el.html(sc.views.getTemplateHtml('weather_data',
      this.model.getTemplateData()));

  this.makeScrollTables();

  // Scroll down to yesterday or today.
  var $mfScrollY = this.$('.sc-scroll-y');
  var $forecast = this.$('.forecast');
  if ($mfScrollY.length && $forecast.length) {
    var $yesterday = $forecast.prev();
    $mfScrollY[0].scrollTop = $yesterday.length ?
        $yesterday[0].offsetTop : $forecast[0].offsetTop;
  }
};


/******************************************************************************/



/**
 * @extends {Backbone.View}
 * @constructor
 */
sc.views.Mob = sc.views.View.extend({
  el: '.sc-mob',
  events: {
    'change select': 'onChangePrefs_',
    'tap a': 'onClickLink_'
  }
});


/** @inheritDoc */
sc.views.Mob.prototype.initialize = function(options) {
  sc.log('sc.views.Mob initialize');
  this.subView = new sc.views.MobData({
    model: this.model
  });
  if (!this.model.has('data')) {
    this.model.fetch();
  }
};


/** @private */
sc.views.Mob.prototype.onChangePrefs_ = function() {
  var obj = sc.views.serializeFormToObject(this.$form);
  sc.log('sc.views.Mob onChangePrefs_', obj);
  this.model.prefs.set(obj);
};


/**
 * @param {Event} e A browser event.
 * @private
 */
sc.views.Mob.prototype.onClickLink_ = function(e) {
  var href = $(e.currentTarget).attr('href');
  sc.log('onClickLink_', href);
  window.open(href, '_system');  // Uses InAppBrowser to open external browser.
};


/** @inheritDoc */
sc.views.Mob.prototype.render = function() {
  sc.log('sc.views.Mob render');

  this.$el.html(sc.views.getTemplateHtml('mob', {
    prefs: this.model.prefs.getTemplateData(),
    states: sc.models.MobPrefsStates
  }));

  this.$form = this.$('form');
  this.$('[name="state"]').val(this.model.prefs.get('state'));

  this.$data = this.$('.data-c');
  this.subView.setElement(this.$data);
  this.subView.render();

  return this;
};


/******************************************************************************/



/**
 * @extends {Backbone.View}
 * @constructor
 */
sc.views.MobData = sc.views.View.extend();


/** @inheritDoc */
sc.views.MobData.prototype.initialize = function(options) {
  sc.log('views.MobData initialize');
  this.listenTo(this.model, 'change', this.render);
};


/** @inheritDoc */
sc.views.MobData.prototype.render = function() {
  sc.log('sc.views.MobData render');

  this.$el.html(sc.views.getTemplateHtml('mob_data',
      this.model.getTemplateData()));

  this.$el.removeClass('sc-scroll-y');
  sc.views.View.setHeightAsAvailable(this.$el);
  this.$el.addClass('sc-scroll-y');
};


/******************************************************************************/



/**
 * @extends {Backbone.View}
 * @constructor
 */
sc.views.Photos = sc.views.View.extend({
  el: '.sc-photos',
  events: {
    'tap a': 'onClickPhoto_'
  }
});


/** @inheritDoc */
sc.views.Photos.prototype.initialize = function(options) {
  sc.log('sc.views.Photos initialize');
  this.subView = new sc.views.PhotosData({
    model: this.model
  });
};

/** @inheritDoc */
sc.views.Photos.prototype.render = function() {
  sc.log('sc.views.Photos render');

  this.$el.html(sc.views.getTemplateHtml('photos', {
    prefs: this.model.prefs.getTemplateData()
  }));

  this.$data = this.$('.data-c');
  this.subView.setElement(this.$data);
  this.subView.render();

  return this;
};


/**
 * @param {Event} e An event object.
 * @private
 */
sc.views.Photos.prototype.onClickPhoto_ = function(e) {
  var $anchor = $(e.currentTarget);
  var filename = $anchor.attr('href');
  sc.log('sc.views.Photos onClickPhoto_', filename);

  var exifPlugin = cordova.require('com.elsigh.exif.ExifPlugin');
  if (exifPlugin) {
    exifPlugin.removeGeoTags(
        _.bind(this.onClearExifDataSuccess_, this),
        _.bind(this.onClearExifDataError_, this),
        filename);
    e.preventDefault();
  } else {
    sc.log('No cordova plugin available to handle the click.');
  }
};


/**
 * @param {Object} response A response.
 * @private
 */
sc.views.Photos.prototype.onClearExifDataSuccess_ = function(response) {
  sc.log('onClearExifDataSuccess_', response);
};


/**
 * @param {Object} response A response.
 * @private
 */
sc.views.Photos.prototype.onClearExifDataError_ = function(response) {
  sc.log('onClearExifDataError_', response);
};


/******************************************************************************/



/**
 * @extends {Backbone.View}
 * @constructor
 */
sc.views.PhotosData = sc.views.View.extend();


/** @inheritDoc */
sc.views.PhotosData.prototype.initialize = function(options) {
  sc.log('views.PhotosData initialize');
  this.listenTo(this.model, 'change', this.render);
};


/** @inheritDoc */
sc.views.PhotosData.prototype.render = function() {
  sc.log('sc.views.PhotosData render');

  this.$el.html(sc.views.getTemplateHtml('photos_data', {
    'data': this.model.getTemplateData()
  }));

  this.$el.removeClass('sc-scroll-y');
  sc.views.View.setHeightAsAvailable(this.$el);
  this.$el.addClass('sc-scroll-y');
};
