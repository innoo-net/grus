(function (global, document) {
  'use strict';

  var DEFAULT_CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/';
  var DEFAULT_CDN_LOCALE_BASE_URL = 'https://cdn.jsdelivr.net/gh/innoo-net/grus@master/locales/';
  var LOADER_FILE_NAME = 'grus.loader.js';
  var CORE_FILE_NAME = 'grus.core.js';

  /**
   * Returns the currently executing script element.
   * @returns {HTMLScriptElement|null} Current script element.
   */
  function _getCurrentScript() {
    return document.currentScript || null;
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
   * Returns an option value if it is a non-empty string; otherwise returns a fallback value.
   * @param {*} value Candidate value.
   * @param {string} fallbackValue Fallback value.
   * @returns {string} Resolved string value.
   */
  function _stringOrFallback(value, fallbackValue) {
    return _isString(value) ? value : fallbackValue;
  }

  /**
   * Safely returns a script src.
   * @param {HTMLScriptElement|null} script Script element.
   * @returns {string} Script src or empty string.
   */
  function _getScriptSrc(script) {
    return script && _isString(script.src) ? script.src : '';
  }

  /**
   * Checks whether a URL appears to be the grus loader script.
   * @param {string} src Script src.
   * @returns {boolean} Whether the src is the loader script.
   */
  function _isLoaderSrc(src) {
    return _isString(src) && src.indexOf(LOADER_FILE_NAME) !== -1;
  }

  /**
   * Checks whether a script element is the grus loader script.
   * @param {HTMLScriptElement|null} script Script element.
   * @returns {boolean} Whether the script is the loader script.
   */
  function _isLoaderScript(script) {
    if (!script) {
      return false;
    }
    if (_isLoaderSrc(_getScriptSrc(script))) {
      return true;
    }
    return Boolean(script.dataset && (script.dataset.grusAuto || script.dataset.grusTarget || script.dataset.grusCoreUrl));
  }

  /**
   * Resolves a URL against a base URL.
   * @param {string} value URL or path.
   * @param {string=} baseUrl Base URL.
   * @returns {string} Resolved URL.
   */
  function _resolveUrl(value, baseUrl) {
    try {
      return new URL(value, baseUrl || document.baseURI || global.location.href).href;
    } catch (error) {
      return value;
    }
  }

  /**
   * Returns the directory URL for a script source.
   * @param {string} src Script URL.
   * @returns {string} Directory URL.
   */
  function _getBaseUrl(src) {
    if (!_isString(src)) {
      return '';
    }
    return _resolveUrl('.', src);
  }

  /**
   * Removes hash and query from a URL-like string.
   * @param {string} value URL-like string.
   * @returns {string} URL-like string without hash and query.
   */
  function _stripHashAndQuery(value) {
    return String(value || '').split('#')[0].split('?')[0];
  }

  /**
   * Extracts the loader URL from an error stack when the host hides script tags.
   * @returns {string} Loader URL or empty string.
   */
  function _getLoaderSrcFromStack() {
    var stack = '';
    var matches;
    var index;

    try {
      stack = String(new Error().stack || '');
    } catch (error) {
      return '';
    }

    matches = stack.match(/https?:\/\/[^\s)]+grus\.loader\.js[^\s)]*/g) || [];
    for (index = 0; index < matches.length; index += 1) {
      if (_isLoaderSrc(matches[index])) {
        return matches[index];
      }
    }

    return '';
  }

  /**
   * Finds the grus loader script element.
   * @returns {HTMLScriptElement|null} Loader script element.
   */
  function _findLoaderScript() {
    var currentScript = _getCurrentScript();
    var scripts;
    var index;

    if (_isLoaderScript(currentScript)) {
      return currentScript;
    }

    scripts = document.getElementsByTagName('script');
    for (index = scripts.length - 1; index >= 0; index -= 1) {
      if (_isLoaderScript(scripts[index])) {
        return scripts[index];
      }
    }

    return null;
  }

  var _loaderScript = _findLoaderScript();
  var _loaderSrc = _getScriptSrc(_loaderScript) || _getLoaderSrcFromStack();

  /**
   * Returns the effective loader source URL.
   * @returns {string} Loader source URL or empty string.
   */
  function _resolveLoaderSrc() {
    if (_isLoaderSrc(_loaderSrc)) {
      return _loaderSrc;
    }

    _loaderScript = _findLoaderScript();
    _loaderSrc = _getScriptSrc(_loaderScript) || _getLoaderSrcFromStack();

    return _isLoaderSrc(_loaderSrc) ? _loaderSrc : '';
  }

  /**
   * Resolves the asset base URL from the loader script URL.
   * @returns {string} Asset base URL.
   */
  function _resolveAssetBaseUrl() {
    var src = _resolveLoaderSrc();
    var baseUrl = _getBaseUrl(src);

    if (_isString(baseUrl)) {
      return baseUrl;
    }

    return DEFAULT_CDN_BASE_URL;
  }

  /**
   * Resolves the default core URL from the loader script URL.
   * @returns {string} Core script URL.
   */
  function _resolveDefaultCoreUrl() {
    return _resolveUrl(CORE_FILE_NAME, _resolveAssetBaseUrl());
  }

  /**
   * Resolves the default locale base URL from the loader script URL.
   * @returns {string} Locale base URL.
   */
  function _resolveDefaultLocaleBaseUrl() {
    var baseUrl = _resolveAssetBaseUrl();
    var cleanBaseUrl = _stripHashAndQuery(baseUrl);

    if (/\/dist\/$/.test(cleanBaseUrl)) {
      return baseUrl.replace(/\/dist\/$/, '/locales/');
    }

    if (baseUrl === DEFAULT_CDN_BASE_URL) {
      return DEFAULT_CDN_LOCALE_BASE_URL;
    }

    return _resolveUrl('locales/', baseUrl);
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
    var loaderScript = script || _findLoaderScript();
    var dataset = loaderScript ? loaderScript.dataset : {};
    return {
      lang: dataset.grusLang || 'ja',
      localeUrl: dataset.grusLocaleUrl || '',
      localeBaseUrl: _stringOrFallback(dataset.grusLocaleBaseUrl, _resolveDefaultLocaleBaseUrl()),
      coreUrl: _stringOrFallback(dataset.grusCoreUrl, _resolveDefaultCoreUrl()),
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
   * @param {string=} userOptions.coreUrl Core JS URL. Usually unnecessary.
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
    var scriptOptions;
    var options;

    _resolveLoaderSrc();

    scriptOptions = _readOptionsFromScript(_loaderScript);
    options = Object.assign({}, scriptOptions, userOptions || {});

    if (!_isString(options.coreUrl)) {
      options.coreUrl = _resolveDefaultCoreUrl();
    }
    if (!_isString(options.localeBaseUrl) && !_isString(options.localeUrl)) {
      options.localeBaseUrl = _resolveDefaultLocaleBaseUrl();
    }

    return _ensureCore(options.coreUrl)
      .then(function () { return _loadLocale(options); })
      .then(function () { return _mountWhenNeeded(options); });
  }

  /**
   * Initializes loader automatically when data-grus-auto is true.
   * @returns {void}
   */
  function _autoLoad() {
    var currentScript = _getCurrentScript();
    var options = _readOptionsFromScript(_isLoaderScript(currentScript) ? currentScript : _loaderScript);
    if (options.auto) {
      load(options).catch(function (error) {
        console.error(error);
      });
    }
  }

  global.GrusLoader = {
    load: load,
    resolveCoreUrl: function () {
      return _resolveDefaultCoreUrl();
    },
    resolveLocaleBaseUrl: function () {
      return _resolveDefaultLocaleBaseUrl();
    },
    resolveLoaderSrc: function () {
      return _resolveLoaderSrc();
    }
  };

  _autoLoad();
})(window, document);
