# grus

`grus` は、JSON定義から条件ビルダーを生成する素のJavaScriptライブラリです。GitHub Pages や jsDelivr などのCDN配布を想定しています。

## 特徴

- 依存ライブラリなし
- IIFE形式でブラウザに直接読み込み可能
- 言語データをJSONで読み込み
- フィルター項目をJSONまたはJavaScript変数で入力
- AND / OR グループ化に対応
- ネスト条件に対応
- URL Pathへの条件保存・URL Pathからの条件復元に対応
- `grus.core.js` と `grus.loader.js` を分離
- JSDoc付き
- private関数は `_camelCase`
- public API は `camelCase`

## 構成

```text
grus/
├─ dist/
│  ├─ grus.core.js
│  ├─ grus.loader.js
│  └─ grus.css
├─ locales/
│  ├─ ja.json
│  └─ en.json
├─ src/
│  ├─ grus.core.js
│  └─ grus.loader.js
├─ examples/
│  ├─ cross-domain-jsdelivr.html
│  ├─ cross-domain-local-fields.html
│  ├─ cross-domain-inline-fields.html
│  ├─ google-apps-script-inline-fields.html
│  └─ fields.local.json
├─ 404.html
├─ fields.sample.json
├─ index.html
└─ README.md
```

`404.html` は、GitHub Pages で `/filter/<encoded>` のようなPathを直接開いたときの簡易フォールバック用です。


## 別ドメインから使うサンプル

`innoo-net/grus` を別ドメインのHTMLから使う場合は、jsDelivr経由で `dist` と `locales` を読み込みます。現在のリポジトリのデフォルトブランチが `master` のため、以下は `@master` を指定しています。

### 全データをCDN側から読む

利用側ドメインのHTMLに以下を置きます。

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.css">

<div id="builder"></div>

<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js"
  data-grus-auto="true"
  data-grus-lang="ja"
  data-grus-locale-base-url="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/locales"
  data-grus-fields-url="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/fields.sample.json"
  data-grus-target="#builder"
  data-grus-url-sync="true"
  data-grus-url-path-key="filter"
  data-grus-url-update-mode="replace"></script>
```

同梱サンプルは以下です。

```text
examples/cross-domain-jsdelivr.html
```

### フィールドJSONだけ利用側ドメインから読む

アプリごとにフィルター項目を変える場合は、grus本体・CSS・言語JSONだけCDNから読み、`fieldsUrl` だけ自ドメインにします。

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.css">

<div id="builder"></div>

<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js"></script>
<script>
  GrusLoader.load({
    lang: 'ja',
    localeBaseUrl: 'https://cdn.jsdelivr.net/gh/innoo-net/grus@master/locales',
    fieldsUrl: './fields.local.json',
    target: '#builder',
    urlSync: {
      enabled: true,
      pathKey: 'filter',
      updateMode: 'replace'
    }
  }).then(function (builder) {
    if (builder.getValue().children.length === 0) {
      builder.addCondition();
    }
  });
</script>
```

同梱サンプルは以下です。

```text
examples/cross-domain-local-fields.html
examples/fields.local.json
```

### フィールド定義を変数で渡す

JSONファイルをfetchせず、利用側ページの変数からフィールド定義を渡すこともできます。

手動マウントなら `fields` に配列を直接渡します。

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
    urlSync: {
      enabled: true,
      pathKey: 'filter',
      updateMode: 'replace'
    }
  });
</script>
```

`data-grus-auto="true"` で自動マウントしたい場合は、先にグローバル変数を定義してから `data-grus-fields-var` に変数名を指定します。

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.css">

<div id="builder"></div>

<script>
  window.GRUS_FIELDS = [
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
</script>

<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js"
  data-grus-auto="true"
  data-grus-lang="ja"
  data-grus-locale-base-url="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/locales"
  data-grus-fields-var="GRUS_FIELDS"
  data-grus-target="#builder"
  data-grus-url-sync="true"></script>
```

`data-grus-fields-var` はドット記法にも対応しています。たとえば `window.App.grusFields` を参照する場合は `data-grus-fields-var="App.grusFields"` と指定できます。

同梱サンプルは以下です。

```text
examples/cross-domain-inline-fields.html
```

### GitHub Pagesで配布する場合

GitHub Pages を `innoo-net/grus` で有効化している場合は、URLを以下の形に差し替えます。

```html
<link rel="stylesheet" href="https://innoo-net.github.io/grus/dist/grus.css">

<div id="builder"></div>

<script src="https://innoo-net.github.io/grus/dist/grus.loader.js"
  data-grus-auto="true"
  data-grus-lang="ja"
  data-grus-locale-base-url="https://innoo-net.github.io/grus/locales"
  data-grus-fields-url="https://innoo-net.github.io/grus/fields.sample.json"
  data-grus-target="#builder"
  data-grus-url-sync="true"></script>
```

`/filter/<encoded>` のPath同期は、grus配布元ではなく「利用側ドメイン」のURLに反映されます。


## Google Apps Script で使う場合

`grus.loader.js` は、自分自身の `<script src>` から `grus.core.js` のURLを自動解決します。
そのため、通常は `coreUrl` を利用側で指定する必要はありません。

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.css">

<div id="builder"></div>

<script src="https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js"></script>
<script>
  var grusFields = [
    { key: 'keyword', label: { ja: 'キーワード', en: 'Keyword' }, type: 'text' },
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

  GrusLoader.load({
    lang: 'ja',
    localeBaseUrl: 'https://cdn.jsdelivr.net/gh/innoo-net/grus@master/locales',
    fields: grusFields,
    target: '#builder',
    urlSync: false
  });
</script>
```

Apps Script のダイアログやサイドバーでは iframe 内で動くため、`/filter/<encoded>` のURL Path同期は通常のWebページほど扱いやすくありません。Webアプリとして公開してURL共有したい場合だけ `urlSync` を有効にしてください。

同梱サンプルは以下です。

```text
examples/google-apps-script-inline-fields.html
```

## CDN読み込み例

GitHub Pages で公開する場合の例です。

```html
<link rel="stylesheet" href="https://example.github.io/grus/dist/grus.css">
<div id="builder"></div>

<script src="https://example.github.io/grus/dist/grus.loader.js"
  data-grus-auto="true"
  data-grus-lang="ja"
  data-grus-locale-base-url="https://example.github.io/grus/locales"
  data-grus-fields-url="https://example.github.io/grus/fields.sample.json"
  data-grus-target="#builder"></script>
```

## jsDelivr読み込み例

リポジトリを `user/grus` として公開した場合の例です。

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/user/grus@main/dist/grus.css">
<div id="builder"></div>

<script src="https://cdn.jsdelivr.net/gh/user/grus@main/dist/grus.loader.js"
  data-grus-auto="true"
  data-grus-lang="ja"
  data-grus-locale-base-url="https://cdn.jsdelivr.net/gh/user/grus@main/locales"
  data-grus-fields-url="https://cdn.jsdelivr.net/gh/user/grus@main/fields.sample.json"
  data-grus-target="#builder"></script>
```

## URL Path同期付き CDN読み込み例

`data-grus-url-sync="true"` を指定すると、条件変更時にURL Pathへ条件ツリーを保存し、ページ表示時にPathから条件ツリーを復元します。

```html
<link rel="stylesheet" href="https://example.github.io/grus/dist/grus.css">
<div id="builder"></div>

<script src="https://example.github.io/grus/dist/grus.loader.js"
  data-grus-auto="true"
  data-grus-lang="ja"
  data-grus-locale-base-url="https://example.github.io/grus/locales"
  data-grus-fields-url="https://example.github.io/grus/fields.sample.json"
  data-grus-target="#builder"
  data-grus-url-sync="true"
  data-grus-url-path-key="filter"
  data-grus-url-update-mode="replace"></script>
```

標準形式は以下です。

```text
/filter/<encoded>
```

既存Pathがある場合は、末尾に追加されます。

```text
/products/filter/<encoded>
```

`<encoded>` は、条件ツリーJSONを UTF-8 Base64URL 化した文字列です。日本語の値も扱えます。

## coreUrl の自動解決

`coreUrl` は省略できます。`grus.loader.js` は次の順で `grus.core.js` のURLを決定します。

```text
1. data-grus-core-url があればそれを使う
2. GrusLoader.load({ coreUrl }) があればそれを使う
3. grus.loader.js 自身の src と同じディレクトリの grus.core.js を使う
4. loader script が特定できない場合だけ ./grus.core.js を使う
```

たとえば、以下から読み込んだ場合は、

```text
https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.loader.js
```

内部で以下を自動的に読み込みます。

```text
https://cdn.jsdelivr.net/gh/innoo-net/grus@master/dist/grus.core.js
```

GitHub Pages の場合も同様に、`https://innoo-net.github.io/grus/dist/grus.loader.js` から `https://innoo-net.github.io/grus/dist/grus.core.js` を自動解決します。

## 手動マウント

```html
<link rel="stylesheet" href="./dist/grus.css">
<div id="builder"></div>
<script src="./dist/grus.loader.js"></script>
<script>
  GrusLoader.load({
    lang: 'ja',
    localeBaseUrl: './locales',
    fieldsUrl: './fields.sample.json',
    target: '#builder'
  }).then(function (builder) {
    builder.addCondition();
  });
</script>
```

フィールドを変数で渡す場合は、`fieldsUrl` の代わりに `fields` を使います。

```js
var fields = [
  { key: 'keyword', label: { ja: 'キーワード', en: 'Keyword' }, type: 'text' }
];

GrusLoader.load({
  lang: 'ja',
  localeBaseUrl: './locales',
  fields: fields,
  target: '#builder'
});
```

## URL Path同期付き 手動マウント

```js
GrusLoader.load({
  lang: 'ja',
  localeBaseUrl: './locales',
  fieldsUrl: './fields.sample.json',
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
}).then(function (builder) {
  if (builder.getValue().children.length === 0) {
    builder.addCondition();
  }
});
```

### URL同期オプション

```js
{
  enabled: true,          // URL Path同期を有効化
  pathKey: 'filter',      // /filter/<encoded> の filter 部分
  updateMode: 'replace',  // replace または push
  readOnInit: true,       // 初期表示時にPathから復元
  writeOnChange: true,    // 条件変更時にPathへ保存
  removeWhenEmpty: true,  // 条件が空ならPathからfilterを削除
  listenPopState: true    // ブラウザ戻る/進むでPathから再復元
}
```

`updateMode: 'replace'` は履歴を増やさずURLだけ差し替えます。条件変更ごとに履歴を残したい場合は `push` を使います。

## フィールド定義形式

JSONファイルで渡す場合も、JavaScript変数で渡す場合も、基本形は `key`, `label`, `type`, `options` です。

```json
[
  {
    "key": "status",
    "label": {
      "ja": "ステータス",
      "en": "Status"
    },
    "type": "select",
    "options": [
      {
        "value": "open",
        "label": {
          "ja": "未対応",
          "en": "Open"
        }
      }
    ]
  }
]
```

対応型は `text`, `number`, `select`, `boolean`, `date` です。

## 出力形式

`getValue()` と `Grus.serialize(instance)` は、条件ツリーを返します。

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
        },
        {
          "type": "condition",
          "key": "featured",
          "operator": "equals",
          "value": "true"
        }
      ]
    }
  ]
}
```

意味としては以下です。

```text
status = open AND (price <= 10000 OR featured = true)
```

## 初期値

`value` に条件ツリーを渡すと、初期状態として復元できます。

```js
var builder = Grus.createConditionBuilder({
  target: '#builder',
  fields: fields,
  value: {
    type: 'group',
    conjunction: 'and',
    children: [
      { type: 'condition', key: 'status', operator: 'equals', value: 'open' },
      {
        type: 'group',
        conjunction: 'or',
        children: [
          { type: 'condition', key: 'price', operator: 'lessThanOrEqual', value: '10000' },
          { type: 'condition', key: 'featured', operator: 'equals', value: 'true' }
        ]
      }
    ]
  }
});
```

旧形式の配列も互換のため受け付けます。配列を渡した場合は、root の `and` グループに変換されます。

```json
[
  {
    "key": "status",
    "operator": "equals",
    "value": "open"
  }
]
```

## URL Path用 Public API

```js
var value = builder.getValue();
var segment = Grus.encodeValue(value);
var restoredValue = Grus.decodeValue(segment);

var path = Grus.createPathWithValue('/products', value, 'filter');
var valueFromPath = Grus.parseValueFromPath(path, 'filter');
var cleanPath = Grus.removeValueFromPath(path, 'filter');
```

例です。

```js
var value = {
  type: 'group',
  conjunction: 'and',
  children: [
    { type: 'condition', key: 'status', operator: 'equals', value: 'open' }
  ]
};

var path = Grus.createPathWithValue('/products', value, 'filter');
// /products/filter/eyJ0eXBlIjoiZ3JvdXAiLCJjb25qdW5jdGlvbiI6ImFuZCIsImNoaWxkcmVuIjpbeyJ0eXBlIjoiY29uZGl0aW9uIiwia2V5Ijoic3RhdHVzIiwib3BlcmF0b3IiOiJlcXVhbHMiLCJ2YWx1ZSI6Im9wZW4ifV19

var parsed = Grus.parseValueFromPath(path, 'filter');
```

## GrusLoader のフィールド指定優先順位

`GrusLoader.load()` は以下の優先順位でフィールド定義を解決します。

```text
1. fields       // 配列を直接指定
2. fieldsVar    // グローバル変数名を指定
3. fieldsUrl    // JSONファイルURLを指定
```

`fields` がある場合は `fieldsUrl` より優先されます。

## Public API

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
GrusLoader.load(options)
```

## Builder instance API

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

`parentPath` と `path` は、root から見た children のインデックス配列です。

```js
builder.addCondition();       // root に条件追加
builder.addGroup([], 'or');    // root に OR グループ追加
builder.addCondition([1]);     // root.children[1] のグループに条件追加
builder.removeNode([1, 0]);    // root.children[1].children[0] を削除
```

## GitHub PagesでPathを直接開く場合

GitHub Pages は通常の静的ホスティングなので、`/filter/<encoded>` を直接開くとサーバー側には実ファイルが存在しません。このスターターには `404.html` を同梱しているため、GitHub Pages 上では簡易的に `index.html` と同じアプリを表示できます。

プロジェクトページ配下で使う場合は、CSSやJSのURLを絶対URLにするか、`index.html` のように `<base>` を適切に指定してください。
