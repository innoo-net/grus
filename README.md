# grus

`grus` は、素の JavaScript だけで動く CDN 配布向けの条件ビルダーです。

- GitHub / jsDelivr 配布想定
- モダンな見た目の CSS 同梱
- 多言語 JSON 読み込み
- フィールド定義 JSON / 変数渡し対応
- AND / OR グループ化対応
- ネスト条件対応
- URL Path へのフィルター保存 / 復元対応
- `grus.loader.js` と `grus.core.js` を分離
- JSDoc 付き
- private 関数は `_camelCase`
- public API は `camelCase`
- 型チェックを可能な範囲で実装

## ファイル構成

```text
grus/
├─ dist/
│  ├─ grus.core.js
│  ├─ grus.loader.js
│  └─ grus.css
├─ src/
│  ├─ grus.core.js
│  └─ grus.loader.js
├─ locales/
│  ├─ ja.json
│  └─ en.json
├─ examples/
│  ├─ cross-domain-jsdelivr.html
│  ├─ cross-domain-local-fields.html
│  ├─ cross-domain-inline-fields.html
│  ├─ google-apps-script-inline-fields.html
│  └─ fields.local.json
├─ fields.sample.json
├─ index.html
└─ 404.html
```

## 最小読み込み

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.css">

<div id="builder"></div>

<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js"></script>
<script>
  var grusFields = [
    {
      key: 'keyword',
      label: { ja: 'キーワード', en: 'Keyword' },
      type: 'text'
    },
    {
      key: 'category',
      label: { ja: 'カテゴリ', en: 'Category' },
      type: 'select',
      options: [
        { value: 'news', label: { ja: 'ニュース', en: 'News' } },
        { value: 'blog', label: { ja: 'ブログ', en: 'Blog' } }
      ]
    }
  ];

  GrusLoader.load({
    lang: 'ja',
    localeBaseUrl: 'https://cdn.jsdelivr.net/gh/innoo-net/grus@master/locales',
    fields: grusFields,
    target: '#builder',
    urlSync: false
  });
</script>
```

## `coreUrl` は基本不要

`grus.loader.js` は、自分自身の `<script src>` を見て `grus.core.js` を自動解決します。

```html
<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js"></script>
```

この場合、内部で次を読み込みます。

```text
https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.core.js
```

Google Apps Script などで `<script>` タグの取得に失敗する場合も、以下の CDN にフォールバックします。

```js
var DEFAULT_CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/';

function _resolveDefaultCoreUrl(script) {
  var baseUrl;

  if (script && script.src) {
    baseUrl = _getBaseUrl(script.src);
    return _resolveUrl('grus.core.js', baseUrl);
  }

  return DEFAULT_CDN_BASE_URL + 'grus.core.js';
}
```

実装版では、script タグ探索、`document.currentScript`、`Error.stack` 補足、CDN fallback を組み合わせています。

## Apps Script サンプル

Apps Script の HTML Service では `urlSync` は一旦 `false` 推奨です。

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.css">

<div id="builder"></div>
<pre id="output"></pre>

<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js?v=20260701c"></script>
<script>
  var grusFields = [
    { key: 'keyword', label: { ja: 'キーワード', en: 'Keyword' }, type: 'text' },
    {
      key: 'category',
      label: { ja: 'カテゴリ', en: 'Category' },
      type: 'select',
      options: [
        { value: 'news', label: { ja: 'ニュース', en: 'News' } },
        { value: 'blog', label: { ja: 'ブログ', en: 'Blog' } }
      ]
    }
  ];

  GrusLoader.load({
    lang: 'ja',
    localeBaseUrl: 'https://cdn.jsdelivr.net/gh/innoo-net/grus@master/locales',
    fields: grusFields,
    target: '#builder',
    urlSync: false,
    onChange: function (value) {
      document.getElementById('output').textContent = JSON.stringify(value, null, 2);
    }
  }).then(function (builder) {
    if (builder.getValue().children.length === 0) {
      builder.addCondition();
    }
  });
</script>
```

確認用ログです。

```js
console.log(GrusLoader.resolveLoaderSrc());
console.log(GrusLoader.resolveCoreUrl());
console.log(GrusLoader.resolveLocaleBaseUrl());
```

期待値です。

```text
https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js...
https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.core.js
https://cdn.jsdelivr.net/gh/innoo-net/grus@master/locales/
```

## フィールド定義

基本形です。

```js
var grusFields = [
  {
    key: 'status',
    label: { ja: 'ステータス', en: 'Status' },
    type: 'select',
    options: [
      { value: 'open', label: { ja: '公開', en: 'Open' } },
      { value: 'closed', label: { ja: '非公開', en: 'Closed' } }
    ]
  }
];
```

対応型です。

```text
text
number
select
boolean
date
```

## フィールドの渡し方

### 1. 変数で直接渡す

```js
GrusLoader.load({
  fields: grusFields,
  target: '#builder'
});
```

### 2. グローバル変数名で渡す

```html
<script>
  window.GRUS_FIELDS = [
    { key: 'keyword', label: { ja: 'キーワード', en: 'Keyword' }, type: 'text' }
  ];
</script>

<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js"
  data-grus-auto="true"
  data-grus-fields-var="GRUS_FIELDS"
  data-grus-target="#builder"></script>
```

### 3. JSON URL で渡す

```html
<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js"
  data-grus-auto="true"
  data-grus-fields-url="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/fields.sample.json"
  data-grus-target="#builder"></script>
```

優先順位です。

```text
1. fields
2. fieldsVar
3. fieldsUrl
```

## 出力JSON

AND / OR とネストはツリー構造で出力します。

```json
{
  "type": "group",
  "conjunction": "and",
  "children": [
    {
      "type": "condition",
      "key": "status",
      "operator": "equals",
      "value": "open"
    },
    {
      "type": "group",
      "conjunction": "or",
      "children": [
        {
          "type": "condition",
          "key": "price",
          "operator": "lessThanOrEqual",
          "value": "10000"
        }
      ]
    }
  ]
}
```

意味です。

```text
status = open AND (price <= 10000)
```

## URL Path 同期

通常のWebページでは URL Path にフィルターを保存できます。

```js
GrusLoader.load({
  lang: 'ja',
  fields: grusFields,
  target: '#builder',
  urlSync: {
    enabled: true,
    pathKey: 'filter',
    updateMode: 'replace',
    readOnInit: true,
    writeOnChange: true,
    removeWhenEmpty: true,
    listenPopState: true
  }
});
```

URL形式です。

```text
/filter/<encoded>
/products/filter/<encoded>
```

## Public API

### GrusLoader

```js
GrusLoader.load(options)
GrusLoader.resolveLoaderSrc()
GrusLoader.resolveCoreUrl()
GrusLoader.resolveLocaleBaseUrl()
GrusLoader.defaultCdnBaseUrl
```

### Grus

```js
Grus.createConditionBuilder(options)
Grus.validateFields(fields)
Grus.validateValue(value, fields)
Grus.encodeValue(value)
Grus.decodeValue(segment)
Grus.parseValueFromPath(pathname, pathKey)
Grus.createPathWithValue(pathname, value, pathKey)
Grus.removeValueFromPath(pathname, pathKey)
Grus.loadJson(url)
Grus.setLocale(locale)
Grus.getLocale()
Grus.serialize(instance)
Grus.destroy(instance)
```

### builder instance

```js
builder.addCondition(parentPath)
builder.addGroup(parentPath, conjunction)
builder.removeNode(path)
builder.removeCondition(index)
builder.getValue()
builder.setValue(value)
builder.syncUrl()
builder.loadFromUrl()
builder.render()
builder.destroy()
```

## ローカル確認

```bash
cd grus
python3 -m http.server 8080
```

```text
http://localhost:8080
```

## jsDelivr キャッシュ

`master` を更新しても CDN キャッシュが残る場合があります。確認中はクエリを変えてください。

```html
<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js?v=20260701c"></script>
```

または purge します。

```text
https://purge.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js
https://purge.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.core.js
https://purge.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.css
```

本番では `@master` より、Gitタグ固定を推奨します。

```html
<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@v0.4.0/dist/grus.loader.js"></script>
```
