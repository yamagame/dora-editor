# Dora Script Editor

[ドラエンジン](https://github.com/yamagame/dora-engine)用スクリプトを入力するエディターです。
ビルドしたファイルをドラエンジンのpublicフォルダに配置します。[create-react-app](https://github.com/facebook/create-react-app)を使っています。

## 機能

- ユーザー毎にスクリプトを作成できます。
- スクリプトの実行と停止ができます。
- 選択したスクリプトだけ実行することができます。

## 準備

```
$ npm i
```

## 開発方法

package.jsonの proxyをドラエンジンが起動しているラズベリーパイのホスト名に変更し、以下のコマンドを実行します。

```
$ npm start
```

## ビルド方法

```
$ npm run build
```

## License

  MIT
