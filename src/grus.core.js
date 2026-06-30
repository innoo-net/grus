(function (global) {
  'use strict';

  var VERSION = '0.2.0';
  var ROOT_PATH = [];
  var DEFAULT_LOCALE = {
    ui: {
      addCondition: '条件を追加',
      addGroup: 'グループを追加',
      remove: '削除',
      removeGroup: 'グループ削除',
      field: '項目',
      operator: '条件',
      value: '値',
      conjunction: '結合',
      emptyFields: 'フィルター項目がありません。',
      emptyGroup: 'このグループには条件がありません。'
    },
    conjunctions: {
      and: 'すべて満たす（AND）',
      or: 'いずれかを満たす（OR）'
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
    },
    boolean: {
      true: 'はい',
      false: 'いいえ'
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
   * Returns true when a value is a valid node path.
   * @param {*} value Value to check.
   * @returns {boolean} Whether the value is a path.
   */
  function _isPath(value) {
    return Array.isArray(value) && value.every(function (item) {
      return typeof item === 'number' && item >= 0 && Math.floor(item) === item;
    });
  }

  /**
   * Normalizes an optional node path.
   * @param {Array<number>=} path Raw path.
   * @returns {Array<number>} Normalized path.
   */
  function _normalizePath(path) {
    if (path === undefined || path === null) {
      return ROOT_PATH.slice();
    }
    _assert(_isPath(path), 'path must be an array of positive integer indexes.');
    return path.slice();
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
   * Returns a normalized conjunction.
   * @param {*} value Raw conjunction.
   * @returns {string} Normalized conjunction.
   */
  function _normalizeConjunction(value) {
    return String(value || 'and').toLowerCase() === 'or' ? 'or' : 'and';
  }

  /**
   * Creates a default condition node.
   * @param {Array<Object>} fields Fields.
   * @returns {Object} Condition node.
   */
  function _createDefaultCondition(fields) {
    var field = fields[0];
    _assert(!!field, 'fields must not be empty.');
    return {
      type: 'condition',
      key: field.key,
      operator: field.operators[0],
      value: _getDefaultValue(field)
    };
  }

  /**
   * Creates an empty group node.
   * @param {string=} conjunction Group conjunction.
   * @returns {Object} Group node.
   */
  function _createEmptyGroup(conjunction) {
    return {
      type: 'group',
      conjunction: _normalizeConjunction(conjunction),
      children: []
    };
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
      type: 'condition',
      key: condition.key,
      operator: field.operators.indexOf(condition.operator) !== -1 ? condition.operator : field.operators[0],
      value: condition.value === undefined || condition.value === null ? _getDefaultValue(field) : String(condition.value)
    };
  }

  /**
   * Normalizes a rule node.
   * @param {Object} node Raw node.
   * @param {Array<Object>} fields Fields.
   * @returns {Object} Normalized node.
   */
  function _normalizeNode(node, fields) {
    _assertObject(node, 'node');
    if (node.type === 'group' || Array.isArray(node.children)) {
      return _normalizeGroup(node, fields);
    }
    return _normalizeCondition(node, fields);
  }

  /**
   * Normalizes a group node.
   * @param {Object} group Raw group.
   * @param {Array<Object>} fields Fields.
   * @returns {Object} Normalized group.
   */
  function _normalizeGroup(group, fields) {
    _assertObject(group, 'group');
    _assertArray(group.children || [], 'group.children');
    return {
      type: 'group',
      conjunction: _normalizeConjunction(group.conjunction),
      children: (group.children || []).map(function (child) {
        return _normalizeNode(child, fields);
      })
    };
  }

  /**
   * Normalizes initial builder value.
   * @param {Object|Array<Object>|undefined|null} value Raw value.
   * @param {Array<Object>} fields Fields.
   * @returns {Object} Normalized root group.
   */
  function _normalizeValue(value, fields) {
    if (value === undefined || value === null) {
      return _createEmptyGroup('and');
    }
    if (Array.isArray(value)) {
      return _normalizeGroup({ type: 'group', conjunction: 'and', children: value }, fields);
    }
    _assertObject(value, 'value');
    return _normalizeGroup(value, fields);
  }

  /**
   * Creates a serializable clone of a condition.
   * @param {Object} condition Condition node.
   * @returns {Object} Cloned condition.
   */
  function _serializeCondition(condition) {
    return {
      type: 'condition',
      key: condition.key,
      operator: condition.operator,
      value: condition.value
    };
  }

  /**
   * Creates a serializable clone of a group.
   * @param {Object} group Group node.
   * @returns {Object} Cloned group.
   */
  function _serializeGroup(group) {
    return {
      type: 'group',
      conjunction: group.conjunction,
      children: group.children.map(function (child) {
        return child.type === 'group' ? _serializeGroup(child) : _serializeCondition(child);
      })
    };
  }

  /**
   * Finds a node by path.
   * @param {Object} root Root group.
   * @param {Array<number>} path Node path.
   * @returns {Object} Found node.
   */
  function _findNodeByPath(root, path) {
    var current = root;
    var index;
    for (index = 0; index < path.length; index += 1) {
      _assert(current && current.type === 'group', 'path parent must be a group.');
      _assert(path[index] < current.children.length, 'path is out of range.');
      current = current.children[path[index]];
    }
    return current;
  }

  /**
   * Finds a parent group and child index by node path.
   * @param {Object} root Root group.
   * @param {Array<number>} path Node path.
   * @returns {Object} Parent metadata.
   */
  function _findParentByPath(root, path) {
    _assert(path.length > 0, 'root node cannot be removed.');
    return {
      parent: _findNodeByPath(root, path.slice(0, -1)),
      index: path[path.length - 1]
    };
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
    var value = instance.getValue();
    var event = new CustomEvent('grus:change', {
      detail: value
    });
    instance.target.dispatchEvent(event);
    if (typeof instance.onChange === 'function') {
      instance.onChange(value, instance);
    }
  }

  /**
   * Updates a condition node by path.
   * @param {Object} instance Builder instance.
   * @param {Array<number>} path Condition path.
   * @param {Object} patch Partial condition values.
   * @returns {void}
   */
  function _updateCondition(instance, path, patch) {
    var condition = _findNodeByPath(instance.root, path);
    _assert(condition.type === 'condition', 'path must point to a condition.');
    Object.keys(patch).forEach(function (key) {
      condition[key] = patch[key];
    });
  }

  /**
   * Builds an input control for a field.
   * @param {Object} instance Builder instance.
   * @param {Object} condition Condition.
   * @param {Object} field Field.
   * @param {Array<number>} path Condition path.
   * @returns {HTMLElement} Value input element.
   */
  function _createValueControl(instance, condition, field, path) {
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
      _updateCondition(instance, path, { value: input.value });
      _emitChange(instance);
    });
    input.addEventListener('input', function () {
      _updateCondition(instance, path, { value: input.value });
      _emitChange(instance);
    });
    return input;
  }

  /**
   * Builds a field select control.
   * @param {Object} instance Builder instance.
   * @param {Object} condition Condition.
   * @param {Array<number>} path Condition path.
   * @returns {HTMLSelectElement} Field select.
   */
  function _createFieldControl(instance, condition, path) {
    var select = _createElement('select', 'grus-control');
    var lang = instance.lang;
    instance.fields.forEach(function (field) {
      select.appendChild(_createOption(field.key, _getLabelText(field.label, lang)));
    });
    select.value = condition.key;
    select.setAttribute('aria-label', _getLocaleText(instance.locale, 'ui.field', 'Field'));
    select.addEventListener('change', function () {
      var field = _findField(instance.fields, select.value);
      _updateCondition(instance, path, {
        key: field.key,
        operator: field.operators[0],
        value: _getDefaultValue(field)
      });
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
   * @param {Array<number>} path Condition path.
   * @returns {HTMLSelectElement} Operator select.
   */
  function _createOperatorControl(instance, condition, field, path) {
    var select = _createElement('select', 'grus-control grus-operator');
    field.operators.forEach(function (operator) {
      select.appendChild(_createOption(operator, _getLocaleText(instance.locale, 'operators.' + operator, operator)));
    });
    select.value = condition.operator;
    select.setAttribute('aria-label', _getLocaleText(instance.locale, 'ui.operator', 'Operator'));
    select.addEventListener('change', function () {
      _updateCondition(instance, path, { operator: select.value });
      _emitChange(instance);
    });
    return select;
  }

  /**
   * Builds a condition row.
   * @param {Object} instance Builder instance.
   * @param {Object} condition Condition.
   * @param {Array<number>} path Condition path.
   * @returns {HTMLElement} Condition row.
   */
  function _createConditionRow(instance, condition, path) {
    var field = _findField(instance.fields, condition.key);
    var row = _createElement('div', 'grus-row');
    var removeButton = _createElement('button', 'grus-remove', _getLocaleText(instance.locale, 'ui.remove', 'Remove'));

    removeButton.type = 'button';
    removeButton.addEventListener('click', function () {
      instance.removeNode(path);
    });

    row.appendChild(_createFieldControl(instance, condition, path));
    row.appendChild(_createOperatorControl(instance, condition, field, path));
    row.appendChild(_createValueControl(instance, condition, field, path));
    row.appendChild(removeButton);
    return row;
  }

  /**
   * Builds a conjunction select control.
   * @param {Object} instance Builder instance.
   * @param {Object} group Group node.
   * @param {Array<number>} path Group path.
   * @returns {HTMLSelectElement} Conjunction select.
   */
  function _createConjunctionControl(instance, group, path) {
    var select = _createElement('select', 'grus-control grus-conjunction');
    select.appendChild(_createOption('and', _getLocaleText(instance.locale, 'conjunctions.and', 'AND')));
    select.appendChild(_createOption('or', _getLocaleText(instance.locale, 'conjunctions.or', 'OR')));
    select.value = group.conjunction;
    select.setAttribute('aria-label', _getLocaleText(instance.locale, 'ui.conjunction', 'Conjunction'));
    select.addEventListener('change', function () {
      _findNodeByPath(instance.root, path).conjunction = select.value;
      _emitChange(instance);
    });
    return select;
  }

  /**
   * Builds group action buttons.
   * @param {Object} instance Builder instance.
   * @param {Array<number>} path Group path.
   * @param {boolean} isRoot Whether this group is root.
   * @returns {HTMLElement} Actions element.
   */
  function _createGroupActions(instance, path, isRoot) {
    var actions = _createElement('div', 'grus-group-actions');
    var addConditionButton = _createElement('button', 'grus-add', _getLocaleText(instance.locale, 'ui.addCondition', 'Add condition'));
    var addGroupButton = _createElement('button', 'grus-add grus-add-secondary', _getLocaleText(instance.locale, 'ui.addGroup', 'Add group'));
    var removeGroupButton;

    addConditionButton.type = 'button';
    addConditionButton.disabled = instance.fields.length === 0;
    addConditionButton.addEventListener('click', function () {
      instance.addCondition(path);
    });

    addGroupButton.type = 'button';
    addGroupButton.addEventListener('click', function () {
      instance.addGroup(path);
    });

    actions.appendChild(addConditionButton);
    actions.appendChild(addGroupButton);

    if (!isRoot) {
      removeGroupButton = _createElement('button', 'grus-remove', _getLocaleText(instance.locale, 'ui.removeGroup', 'Remove group'));
      removeGroupButton.type = 'button';
      removeGroupButton.addEventListener('click', function () {
        instance.removeNode(path);
      });
      actions.appendChild(removeGroupButton);
    }

    return actions;
  }

  /**
   * Builds a group header.
   * @param {Object} instance Builder instance.
   * @param {Object} group Group node.
   * @param {Array<number>} path Group path.
   * @param {boolean} isRoot Whether this group is root.
   * @returns {HTMLElement} Group header.
   */
  function _createGroupHeader(instance, group, path, isRoot) {
    var header = _createElement('div', 'grus-group-header');
    var label = _createElement('span', 'grus-group-label', isRoot ? 'ROOT' : 'GROUP');
    header.appendChild(label);
    header.appendChild(_createConjunctionControl(instance, group, path));
    header.appendChild(_createGroupActions(instance, path, isRoot));
    return header;
  }

  /**
   * Builds a child node element.
   * @param {Object} instance Builder instance.
   * @param {Object} node Node.
   * @param {Array<number>} path Node path.
   * @returns {HTMLElement} Node element.
   */
  function _createNodeElement(instance, node, path) {
    if (node.type === 'group') {
      return _createGroupElement(instance, node, path, false);
    }
    return _createConditionRow(instance, node, path);
  }

  /**
   * Builds a group element recursively.
   * @param {Object} instance Builder instance.
   * @param {Object} group Group node.
   * @param {Array<number>} path Group path.
   * @param {boolean} isRoot Whether this group is root.
   * @returns {HTMLElement} Group element.
   */
  function _createGroupElement(instance, group, path, isRoot) {
    var groupElement = _createElement('div', isRoot ? 'grus-group grus-root-group' : 'grus-group');
    var body = _createElement('div', 'grus-group-body');

    groupElement.appendChild(_createGroupHeader(instance, group, path, isRoot));

    if (group.children.length === 0) {
      body.appendChild(_createElement('p', 'grus-empty', _getLocaleText(instance.locale, 'ui.emptyGroup', 'This group is empty.')));
    }

    group.children.forEach(function (child, index) {
      body.appendChild(_createNodeElement(instance, child, path.concat(index)));
    });

    groupElement.appendChild(body);
    return groupElement;
  }

  /**
   * Renders a builder instance.
   * @param {Object} instance Builder instance.
   * @returns {void}
   */
  function _render(instance) {
    var container = _createElement('div', 'grus');
    _clearElement(instance.target);

    if (instance.fields.length === 0) {
      container.appendChild(_createElement('p', 'grus-empty', _getLocaleText(instance.locale, 'ui.emptyFields', 'No fields.')));
    }

    container.appendChild(_createGroupElement(instance, instance.root, ROOT_PATH.slice(), true));
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
   * Validates and normalizes a condition tree.
   * @param {Object|Array<Object>} value Condition tree or legacy condition array.
   * @param {Array<Object>} fields Field definitions.
   * @returns {Object} Normalized condition tree.
   */
  function validateValue(value, fields) {
    return _normalizeValue(value, _normalizeFields(fields || []));
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
   * @param {Object|Array<Object>=} options.value Initial condition tree or legacy condition array.
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
      root: _normalizeValue(options.value, fields),
      locale: locale,
      lang: typeof options.lang === 'string' ? options.lang : 'ja',
      onChange: options.onChange,

      /**
       * Adds a new condition to a group.
       * @param {Array<number>=} parentPath Parent group path. Defaults to root.
       * @returns {Object} Builder instance.
       */
      addCondition: function (parentPath) {
        var path = _normalizePath(parentPath);
        var parent = _findNodeByPath(this.root, path);
        _assert(parent.type === 'group', 'parentPath must point to a group.');
        if (this.fields.length === 0) {
          return this;
        }
        parent.children.push(_createDefaultCondition(this.fields));
        this.render();
        _emitChange(this);
        return this;
      },

      /**
       * Adds a new child group to a group.
       * @param {Array<number>=} parentPath Parent group path. Defaults to root.
       * @param {string=} conjunction Group conjunction: and or or.
       * @returns {Object} Builder instance.
       */
      addGroup: function (parentPath, conjunction) {
        var path = _normalizePath(parentPath);
        var parent = _findNodeByPath(this.root, path);
        _assert(parent.type === 'group', 'parentPath must point to a group.');
        parent.children.push(_createEmptyGroup(conjunction || 'and'));
        this.render();
        _emitChange(this);
        return this;
      },

      /**
       * Removes a node by path.
       * @param {Array<number>} path Node path.
       * @returns {Object} Builder instance.
       */
      removeNode: function (path) {
        var normalizedPath = _normalizePath(path);
        var result = _findParentByPath(this.root, normalizedPath);
        _assert(result.parent.type === 'group', 'parent must be a group.');
        _assert(result.index < result.parent.children.length, 'path is out of range.');
        result.parent.children.splice(result.index, 1);
        this.render();
        _emitChange(this);
        return this;
      },

      /**
       * Removes a root-level condition by index. Kept for backward compatibility.
       * @param {number} index Root child index.
       * @returns {Object} Builder instance.
       */
      removeCondition: function (index) {
        _assert(typeof index === 'number' && index >= 0, 'index must be a positive number.');
        return this.removeNode([index]);
      },

      /**
       * Returns a serializable condition tree.
       * @returns {Object} Current condition tree.
       */
      getValue: function () {
        return _serializeGroup(this.root);
      },

      /**
       * Replaces current condition tree.
       * @param {Object|Array<Object>} value New condition tree or legacy condition array.
       * @returns {Object} Builder instance.
       */
      setValue: function (value) {
        this.root = _normalizeValue(value, this.fields);
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
   * @returns {Object} Current condition tree.
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
    validateValue: validateValue,
    loadJson: loadJson,
    setLocale: setLocale,
    getLocale: getLocale,
    serialize: serialize,
    destroy: destroy
  };
})(window);
