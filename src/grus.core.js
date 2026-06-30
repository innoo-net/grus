(function (global) {
  'use strict';

  var VERSION = '0.1.0';
  var DEFAULT_LOCALE = {
    ui: {
      addCondition: '条件を追加',
      remove: '削除',
      field: '項目',
      operator: '条件',
      value: '値',
      emptyFields: 'フィルター項目がありません。'
    },
    operators: {
      equals: '等しい',
      notEquals: '等しくない',
      contains: '含む',
      startsWith: 'から始まる',
      endsWith: 'で終わる',
      greaterThan: 'より大きい',
      greaterThanOrEqual: '以上',
      lessThan: 'より小さい',
      lessThanOrEqual: '以下',
      before: 'より前',
      after: 'より後'
    }
  };

  var TYPE_OPERATORS = {
    text: ['contains', 'equals', 'notEquals', 'startsWith', 'endsWith'],
    number: ['equals', 'notEquals', 'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual'],
    select: ['equals', 'notEquals'],
    boolean: ['equals', 'notEquals'],
    date: ['equals', 'notEquals', 'before', 'after']
  };

  var state = {
    locale: DEFAULT_LOCALE
  };

  /**
   * Returns true when value is a plain object.
   * @param {*} value Value to check.
   * @returns {boolean} Whether the value is a plain object.
   */
  function _isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  /**
   * Throws when condition is false.
   * @param {boolean} condition Validation result.
   * @param {string} message Error message.
   * @returns {void}
   */
  function _assert(condition, message) {
    if (!condition) {
      throw new TypeError('[grus] ' + message);
    }
  }

  /**
   * Asserts that value is a plain object.
   * @param {*} value Value to validate.
   * @param {string} name Value name.
   * @returns {void}
   */
  function _assertObject(value, name) {
    _assert(_isPlainObject(value), name + ' must be an object.');
  }

  /**
   * Asserts that value is a string.
   * @param {*} value Value to validate.
   * @param {string} name Value name.
   * @returns {void}
   */
  function _assertString(value, name) {
    _assert(typeof value === 'string' && value.length > 0, name + ' must be a non-empty string.');
  }

  /**
   * Asserts that value is an array.
   * @param {*} value Value to validate.
   * @param {string} name Value name.
   * @returns {void}
   */
  function _assertArray(value, name) {
    _assert(Array.isArray(value), name + ' must be an array.');
  }

  /**
   * Resolves a selector or element to an HTMLElement.
   * @param {string|HTMLElement} target Selector or HTMLElement.
   * @returns {HTMLElement} Resolved element.
   */
  function _resolveElement(target) {
    var element = typeof target === 'string' ? document.querySelector(target) : target;
    _assert(element instanceof HTMLElement, 'target element was not found.');
    return element;
  }

  /**
   * Creates an element with optional class name and text.
   * @param {string} tag Tag name.
   * @param {string=} className Class name.
   * @param {string=} text Text content.
   * @returns {HTMLElement} Created element.
   */
  function _createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (typeof text === 'string') {
      element.textContent = text;
    }
    return element;
  }

  /**
   * Removes all child nodes from an element.
   * @param {HTMLElement} element Target element.
   * @returns {void}
   */
  function _clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Deep-merges plain objects.
   * @param {Object} base Base object.
   * @param {Object} override Override object.
   * @returns {Object} Merged object.
   */
  function _mergeObject(base, override) {
    var result = {};
    Object.keys(base || {}).forEach(function (key) {
      result[key] = base[key];
    });
    Object.keys(override || {}).forEach(function (key) {
      if (_isPlainObject(result[key]) && _isPlainObject(override[key])) {
        result[key] = _mergeObject(result[key], override[key]);
        return;
      }
      result[key] = override[key];
    });
    return result;
  }

  /**
   * Returns localized text from a string or language map.
   * @param {string|Object} value Label value.
   * @param {string} lang Language code.
   * @returns {string} Localized text.
   */
  function _getLabelText(value, lang) {
    if (typeof value === 'string') {
      return value;
    }
    if (_isPlainObject(value)) {
      return value[lang] || value.ja || value.en || Object.keys(value).map(function (key) { return value[key]; })[0] || '';
    }
    return '';
  }

  /**
   * Returns a locale text value by path.
   * @param {Object} locale Locale object.
   * @param {string} path Dot-separated path.
   * @param {string} fallback Fallback text.
   * @returns {string} Locale text.
   */
  function _getLocaleText(locale, path, fallback) {
    var keys = path.split('.');
    var current = locale;
    var index;
    for (index = 0; index < keys.length; index += 1) {
      if (!_isPlainObject(current) || !(keys[index] in current)) {
        return fallback;
      }
      current = current[keys[index]];
    }
    return typeof current === 'string' ? current : fallback;
  }

  /**
   * Normalizes a field option.
   * @param {Object|string|number|boolean} option Raw option.
   * @returns {Object} Normalized option.
   */
  function _normalizeOption(option) {
    if (_isPlainObject(option)) {
      _assert('value' in option, 'option.value is required.');
      return {
        value: String(option.value),
        label: option.label || String(option.value)
      };
    }
    return {
      value: String(option),
      label: String(option)
    };
  }

  /**
   * Normalizes a filter field definition.
   * @param {Object} field Raw field.
   * @returns {Object} Normalized field.
   */
  function _normalizeField(field) {
    var allowedTypes = ['text', 'number', 'select', 'boolean', 'date'];
    _assertObject(field, 'field');
    _assertString(field.key, 'field.key');
    _assert(field.label !== undefined, 'field.label is required.');
    _assertString(field.type, 'field.type');
    _assert(allowedTypes.indexOf(field.type) !== -1, 'field.type must be one of: ' + allowedTypes.join(', ') + '.');

    if (field.type === 'select') {
      _assertArray(field.options, 'field.options');
      _assert(field.options.length > 0, 'field.options must not be empty for select fields.');
    }

    return {
      key: field.key,
      label: field.label,
      type: field.type,
      options: Array.isArray(field.options) ? field.options.map(_normalizeOption) : [],
      placeholder: field.placeholder || '',
      operators: Array.isArray(field.operators) ? field.operators.slice() : TYPE_OPERATORS[field.type].slice()
    };
  }

  /**
   * Normalizes filter field definitions.
   * @param {Array<Object>} fields Raw fields.
   * @returns {Array<Object>} Normalized fields.
   */
  function _normalizeFields(fields) {
    _assertArray(fields, 'fields');
    return fields.map(_normalizeField);
  }

  /**
   * Finds a field by key.
   * @param {Array<Object>} fields Fields.
   * @param {string} key Field key.
   * @returns {Object|null} Field or null.
   */
  function _findField(fields, key) {
    var index;
    for (index = 0; index < fields.length; index += 1) {
      if (fields[index].key === key) {
        return fields[index];
      }
    }
    return null;
  }

  /**
   * Returns the default value for a field.
   * @param {Object} field Field definition.
   * @returns {string} Default value.
   */
  function _getDefaultValue(field) {
    if (field.type === 'boolean') {
      return 'true';
    }
    if (field.type === 'select' && field.options.length > 0) {
      return field.options[0].value;
    }
    return '';
  }

  /**
   * Normalizes a condition object.
   * @param {Object} condition Raw condition.
   * @param {Array<Object>} fields Fields.
   * @returns {Object} Normalized condition.
   */
  function _normalizeCondition(condition, fields) {
    var field;
    _assertObject(condition, 'condition');
    _assertString(condition.key, 'condition.key');
    field = _findField(fields, condition.key);
    _assert(!!field, 'condition.key does not match fields: ' + condition.key);
    return {
      key: condition.key,
      operator: field.operators.indexOf(condition.operator) !== -1 ? condition.operator : field.operators[0],
      value: condition.value === undefined || condition.value === null ? _getDefaultValue(field) : String(condition.value)
    };
  }

  /**
   * Normalizes initial conditions.
   * @param {Array<Object>} value Raw conditions.
   * @param {Array<Object>} fields Fields.
   * @returns {Array<Object>} Normalized conditions.
   */
  function _normalizeConditions(value, fields) {
    if (value === undefined || value === null) {
      return [];
    }
    _assertArray(value, 'value');
    return value.map(function (condition) {
      return _normalizeCondition(condition, fields);
    });
  }

  /**
   * Creates a select option element.
   * @param {string} value Option value.
   * @param {string} label Option label.
   * @returns {HTMLOptionElement} Option element.
   */
  function _createOption(value, label) {
    var option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }

  /**
   * Emits an instance change event and callback.
   * @param {Object} instance Builder instance.
   * @returns {void}
   */
  function _emitChange(instance) {
    var event = new CustomEvent('grus:change', {
      detail: instance.getValue()
    });
    instance.target.dispatchEvent(event);
    if (typeof instance.onChange === 'function') {
      instance.onChange(instance.getValue(), instance);
    }
  }

  /**
   * Builds an input control for a field.
   * @param {Object} instance Builder instance.
   * @param {Object} condition Condition.
   * @param {Object} field Field.
   * @param {number} index Condition index.
   * @returns {HTMLElement} Value input element.
   */
  function _createValueControl(instance, condition, field, index) {
    var input;
    var lang = instance.lang;

    if (field.type === 'select') {
      input = _createElement('select', 'grus-control');
      field.options.forEach(function (option) {
        input.appendChild(_createOption(option.value, _getLabelText(option.label, lang)));
      });
    } else if (field.type === 'boolean') {
      input = _createElement('select', 'grus-control');
      input.appendChild(_createOption('true', _getLocaleText(instance.locale, 'boolean.true', 'true')));
      input.appendChild(_createOption('false', _getLocaleText(instance.locale, 'boolean.false', 'false')));
    } else {
      input = _createElement('input', 'grus-control');
      input.type = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
      input.placeholder = _getLabelText(field.placeholder, lang);
    }

    input.value = condition.value;
    input.setAttribute('aria-label', _getLocaleText(instance.locale, 'ui.value', 'Value'));
    input.addEventListener('change', function () {
      instance.conditions[index].value = input.value;
      _emitChange(instance);
    });
    input.addEventListener('input', function () {
      instance.conditions[index].value = input.value;
      _emitChange(instance);
    });
    return input;
  }

  /**
   * Builds a field select control.
   * @param {Object} instance Builder instance.
   * @param {Object} condition Condition.
   * @param {number} index Condition index.
   * @returns {HTMLSelectElement} Field select.
   */
  function _createFieldControl(instance, condition, index) {
    var select = _createElement('select', 'grus-control');
    var lang = instance.lang;
    instance.fields.forEach(function (field) {
      select.appendChild(_createOption(field.key, _getLabelText(field.label, lang)));
    });
    select.value = condition.key;
    select.setAttribute('aria-label', _getLocaleText(instance.locale, 'ui.field', 'Field'));
    select.addEventListener('change', function () {
      var field = _findField(instance.fields, select.value);
      instance.conditions[index] = {
        key: field.key,
        operator: field.operators[0],
        value: _getDefaultValue(field)
      };
      instance.render();
      _emitChange(instance);
    });
    return select;
  }

  /**
   * Builds an operator select control.
   * @param {Object} instance Builder instance.
   * @param {Object} condition Condition.
   * @param {Object} field Field.
   * @param {number} index Condition index.
   * @returns {HTMLSelectElement} Operator select.
   */
  function _createOperatorControl(instance, condition, field, index) {
    var select = _createElement('select', 'grus-control grus-operator');
    field.operators.forEach(function (operator) {
      select.appendChild(_createOption(operator, _getLocaleText(instance.locale, 'operators.' + operator, operator)));
    });
    select.value = condition.operator;
    select.setAttribute('aria-label', _getLocaleText(instance.locale, 'ui.operator', 'Operator'));
    select.addEventListener('change', function () {
      instance.conditions[index].operator = select.value;
      _emitChange(instance);
    });
    return select;
  }

  /**
   * Builds a condition row.
   * @param {Object} instance Builder instance.
   * @param {Object} condition Condition.
   * @param {number} index Condition index.
   * @returns {HTMLElement} Condition row.
   */
  function _createConditionRow(instance, condition, index) {
    var field = _findField(instance.fields, condition.key);
    var row = _createElement('div', 'grus-row');
    var removeButton = _createElement('button', 'grus-remove', _getLocaleText(instance.locale, 'ui.remove', 'Remove'));

    removeButton.type = 'button';
    removeButton.addEventListener('click', function () {
      instance.removeCondition(index);
    });

    row.appendChild(_createFieldControl(instance, condition, index));
    row.appendChild(_createOperatorControl(instance, condition, field, index));
    row.appendChild(_createValueControl(instance, condition, field, index));
    row.appendChild(removeButton);
    return row;
  }

  /**
   * Renders a builder instance.
   * @param {Object} instance Builder instance.
   * @returns {void}
   */
  function _render(instance) {
    var container = _createElement('div', 'grus');
    var body = _createElement('div', 'grus-body');
    var actions = _createElement('div', 'grus-actions');
    var addButton = _createElement('button', 'grus-add', _getLocaleText(instance.locale, 'ui.addCondition', 'Add condition'));

    _clearElement(instance.target);

    if (instance.fields.length === 0) {
      body.appendChild(_createElement('p', 'grus-empty', _getLocaleText(instance.locale, 'ui.emptyFields', 'No fields.')));
    }

    instance.conditions.forEach(function (condition, index) {
      body.appendChild(_createConditionRow(instance, condition, index));
    });

    addButton.type = 'button';
    addButton.addEventListener('click', function () {
      instance.addCondition();
    });
    addButton.disabled = instance.fields.length === 0;
    actions.appendChild(addButton);

    container.appendChild(body);
    container.appendChild(actions);
    instance.target.appendChild(container);
  }

  /**
   * Loads JSON from a URL.
   * @param {string} url JSON URL.
   * @returns {Promise<Object|Array>} Loaded JSON.
   */
  function loadJson(url) {
    _assertString(url, 'url');
    return fetch(url, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) {
        throw new Error('[grus] Failed to load JSON: ' + url);
      }
      return response.json();
    });
  }

  /**
   * Validates and normalizes field definitions.
   * @param {Array<Object>} fields Field definitions.
   * @returns {Array<Object>} Normalized fields.
   */
  function validateFields(fields) {
    return _normalizeFields(fields);
  }

  /**
   * Sets the global locale.
   * @param {Object} locale Locale JSON.
   * @returns {Object} Merged locale.
   */
  function setLocale(locale) {
    _assertObject(locale, 'locale');
    state.locale = _mergeObject(DEFAULT_LOCALE, locale);
    return state.locale;
  }

  /**
   * Returns the global locale.
   * @returns {Object} Current locale.
   */
  function getLocale() {
    return state.locale;
  }

  /**
   * Creates a new condition-builder instance.
   * @param {Object} options Builder options.
   * @param {string|HTMLElement} options.target Mount target selector or element.
   * @param {Array<Object>} options.fields Filter field definitions.
   * @param {Array<Object>=} options.value Initial conditions.
   * @param {Object=} options.locale Locale object.
   * @param {string=} options.lang Language code used for field label maps.
   * @param {Function=} options.onChange Change callback.
   * @returns {Object} Builder instance.
   */
  function createConditionBuilder(options) {
    var fields;
    var locale;
    var target;
    var instance;

    _assertObject(options, 'options');
    target = _resolveElement(options.target);
    fields = _normalizeFields(options.fields || []);
    locale = options.locale ? _mergeObject(DEFAULT_LOCALE, options.locale) : state.locale;

    instance = {
      version: VERSION,
      target: target,
      fields: fields,
      conditions: _normalizeConditions(options.value, fields),
      locale: locale,
      lang: typeof options.lang === 'string' ? options.lang : 'ja',
      onChange: options.onChange,

      /**
       * Adds a new condition row.
       * @returns {Object} Builder instance.
       */
      addCondition: function () {
        var field = this.fields[0];
        if (!field) {
          return this;
        }
        this.conditions.push({
          key: field.key,
          operator: field.operators[0],
          value: _getDefaultValue(field)
        });
        this.render();
        _emitChange(this);
        return this;
      },

      /**
       * Removes a condition row.
       * @param {number} index Condition index.
       * @returns {Object} Builder instance.
       */
      removeCondition: function (index) {
        _assert(typeof index === 'number' && index >= 0, 'index must be a positive number.');
        this.conditions.splice(index, 1);
        this.render();
        _emitChange(this);
        return this;
      },

      /**
       * Returns a serializable condition array.
       * @returns {Array<Object>} Current conditions.
       */
      getValue: function () {
        return this.conditions.map(function (condition) {
          return {
            key: condition.key,
            operator: condition.operator,
            value: condition.value
          };
        });
      },

      /**
       * Replaces current conditions.
       * @param {Array<Object>} value New conditions.
       * @returns {Object} Builder instance.
       */
      setValue: function (value) {
        this.conditions = _normalizeConditions(value, this.fields);
        this.render();
        _emitChange(this);
        return this;
      },

      /**
       * Re-renders the builder.
       * @returns {Object} Builder instance.
       */
      render: function () {
        _render(this);
        return this;
      },

      /**
       * Destroys the builder DOM.
       * @returns {void}
       */
      destroy: function () {
        _clearElement(this.target);
      }
    };

    instance.render();
    return instance;
  }

  /**
   * Serializes a builder instance.
   * @param {Object} instance Builder instance.
   * @returns {Array<Object>} Current conditions.
   */
  function serialize(instance) {
    _assertObject(instance, 'instance');
    _assert(typeof instance.getValue === 'function', 'instance.getValue is required.');
    return instance.getValue();
  }

  /**
   * Destroys a builder instance.
   * @param {Object} instance Builder instance.
   * @returns {void}
   */
  function destroy(instance) {
    _assertObject(instance, 'instance');
    _assert(typeof instance.destroy === 'function', 'instance.destroy is required.');
    instance.destroy();
  }

  global.Grus = {
    version: VERSION,
    createConditionBuilder: createConditionBuilder,
    validateFields: validateFields,
    loadJson: loadJson,
    setLocale: setLocale,
    getLocale: getLocale,
    serialize: serialize,
    destroy: destroy
  };
})(window);
