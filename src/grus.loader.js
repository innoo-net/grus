(function (global, document) {
  'use strict';

  /**
   * Returns the currently executing script element.
   * @returns {HTMLScriptElement|null} Current script element.
   */
  function _getCurrentScript() {
    return document.currentScript || null;
  }

  /**
   * Returns the directory URL for a script source.
   * @param {string} src Script URL.
   * @returns {string} Directory URL.
   */
  function _getBaseUrl(src) {
    return src.split('/').slice(0, -1).join('/') + '/';
  }

  /**
   * Checks whether a value is a non-empty string.
   * @param {*} value Value to check.
   * @returns {boolean} Whether the value is a non-empty string.
   */
  function _isString(value) {
    return typeof value === 'string' && value.length > 0;
  }


  /**
   * Checks whether a dataset value is true.
   * @param {*} value Value to check.
   * @returns {boolean} Whether the value is true.
   */
  function _isTrue(value) {
    return String(value) === 'true';
  }

  /**
   * Appends a JavaScript file and resolves after it loads.
   * @param {string} src JavaScript URL.
   * @returns {Promise<void>} Load promise.
   */
  function _loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('[grus] Failed to load script: ' + src)); };
      document.head.appendChild(script);
    });
  }

  /**
   * Ensures the core script is available.
   * @param {string} coreUrl Core script URL.
   * @returns {Promise<void>} Load promise.
   */
  function _ensureCore(coreUrl) {
    if (global.Grus) {
      return Promise.resolve();
    }
    return _loadScript(coreUrl);
  }

  /**
   * Resolves a JSON URL for a language.
   * @param {Object} options Loader options.
   * @returns {string} Locale JSON URL.
   */
  function _resolveLocaleUrl(options) {
    if (_isString(options.localeUrl)) {
      return options.localeUrl;
    }
    return options.localeBaseUrl.replace(/\/$/, '') + '/' + options.lang + '.json';
  }

  /**
   * Loads locale JSON and applies it to Grus.
   * @param {Object} options Loader options.
   * @returns {Promise<Object>} Loaded locale.
   */
  function _loadLocale(options) {
    return global.Grus.loadJson(_resolveLocaleUrl(options)).then(function (locale) {
      return global.Grus.setLocale(locale);
    });
  }


  /**
   * Reads a global value by dot path.
   * @param {string} path Global variable path, for example GRUS_FIELDS or window.App.fields.
   * @returns {*} Resolved value.
   */
  function _getGlobalValue(path) {
    var normalizedPath = String(path || '').replace(/^window\./, '');
    var parts = normalizedPath.split('.').filter(function (part) { return part.length > 0; });
    var value = global;
    var index;

    for (index = 0; index < parts.length; index += 1) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[parts[index]];
    }

    return value;
  }

  /**
   * Resolves fields from inline options, a global variable, or a JSON URL.
   * @param {Object} options Loader options.
   * @returns {Promise<Array<Object>|null>} Resolved fields or null.
   */
  function _resolveFields(options) {
    var fields;

    if (Array.isArray(options.fields)) {
      return Promise.resolve(options.fields);
    }

    if (_isString(options.fieldsVar)) {
      fields = _getGlobalValue(options.fieldsVar);
      if (!Array.isArray(fields)) {
        return Promise.reject(new TypeError('[grus] fieldsVar must point to an array: ' + options.fieldsVar));
      }
      return Promise.resolve(fields);
    }

    if (_isString(options.fieldsUrl)) {
      return global.Grus.loadJson(options.fieldsUrl);
    }

    return Promise.resolve(null);
  }

  /**
   * Checks whether options include any field source.
   * @param {Object} options Loader options.
   * @returns {boolean} Whether a field source exists.
   */
  function _hasFieldSource(options) {
    return Array.isArray(options.fields) || _isString(options.fieldsVar) || _isString(options.fieldsUrl);
  }

  /**
   * Reads loader options from a script tag dataset.
   * @param {HTMLScriptElement|null} script Script tag.
   * @returns {Object} Loader options.
   */
  function _readOptionsFromScript(script) {
    var baseUrl = script && script.src ? _getBaseUrl(script.src) : './';
    var dataset = script ? script.dataset : {};
    return {
      lang: dataset.grusLang || 'ja',
      localeUrl: dataset.grusLocaleUrl || '',
      localeBaseUrl: dataset.grusLocaleBaseUrl || baseUrl.replace(/dist\/$/, 'locales/'),
      coreUrl: dataset.grusCoreUrl || baseUrl + 'grus.core.js',
      fieldsUrl: dataset.grusFieldsUrl || '',
      fieldsVar: dataset.grusFieldsVar || '',
      target: dataset.grusTarget || '',
      auto: _isTrue(dataset.grusAuto),
      urlSync: _isTrue(dataset.grusUrlSync),
      urlPathKey: dataset.grusUrlPathKey || 'filter',
      urlUpdateMode: dataset.grusUrlUpdateMode || 'replace'
    };
  }

  /**
   * Creates a builder when auto-mount options are provided.
   * @param {Object} options Loader options.
   * @returns {Promise<Object|null>} Builder instance or null.
   */
  function _mountWhenNeeded(options) {
    if (!_isString(options.target) || !_hasFieldSource(options)) {
      return Promise.resolve(null);
    }
    return _resolveFields(options).then(function (fields) {
      if (!fields) {
        return null;
      }
      return global.Grus.createConditionBuilder({
        target: options.target,
        fields: fields,
        value: options.value,
        lang: options.lang,
        locale: global.Grus.getLocale(),
        onChange: options.onChange,
        urlSync: options.urlSync,
        urlPathKey: options.urlPathKey,
        urlUpdateMode: options.urlUpdateMode
      });
    });
  }

  /**
   * Loads core JS, locale JSON, and optionally mounts the condition builder.
   * @param {Object=} userOptions Loader options.
   * @param {string=} userOptions.lang Language code.
   * @param {string=} userOptions.localeUrl Locale JSON URL.
   * @param {string=} userOptions.localeBaseUrl Locale base URL.
   * @param {string=} userOptions.coreUrl Core JS URL.
   * @param {string=} userOptions.fieldsUrl Fields JSON URL.
   * @param {Array<Object>=} userOptions.fields Inline field definitions.
   * @param {string=} userOptions.fieldsVar Global variable path for field definitions.
   * @param {string|HTMLElement=} userOptions.target Auto-mount target.
   * @param {Object|Array<Object>=} userOptions.value Initial condition tree or legacy condition array.
   * @param {Function=} userOptions.onChange Change callback.
   * @param {boolean|Object=} userOptions.urlSync URL path synchronization option.
   * @param {string=} userOptions.urlPathKey URL path key segment. Defaults to filter.
   * @param {string=} userOptions.urlUpdateMode URL update mode: replace or push.
   * @returns {Promise<Object|null>} Builder instance or null.
   */
  function load(userOptions) {
    var scriptOptions = _readOptionsFromScript(_getCurrentScript());
    var options = Object.assign({}, scriptOptions, userOptions || {});
    return _ensureCore(options.coreUrl)
      .then(function () { return _loadLocale(options); })
      .then(function () { return _mountWhenNeeded(options); });
  }

  /**
   * Initializes loader automatically when data-grus-auto is true.
   * @returns {void}
   */
  function _autoLoad() {
    var options = _readOptionsFromScript(_getCurrentScript());
    if (options.auto) {
      load(options).catch(function (error) {
        console.error(error);
      });
    }
  }

  global.GrusLoader = {
    load: load
  };

  _autoLoad();
})(window, document);
