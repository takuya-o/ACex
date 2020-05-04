# AirCampus for Web Extender

Chromeブラウザ用のAirCampusのディスカッションの「発言数カウント」拡張機能を作りました。


## ビルド方法

### ビルド準備
crxmakeがある環境で、crxmakeに--key-outputオプションをつけて秘密キーACex.pemを作る。

例:
```sh
$ crxmake --pack-extension="src" --extension-output="ACex.crx" --key-output=seckey.pem --verbose
```

※最近 crxmakeでは正しいキーが作れないことがあるので chromeで作った方が良いかも。

### ビルド
./build.rbする。

### Gitlab-CI
dockerコンテナで、パッケージングをして、CIとしています。


## インストール方法

### 正式版のインストール
1. Chromeウェブストアからインストールする。(URLは限定公開)

### 開発版のインストール
1. ソースを展開する。
2. Chromeブラウザの「拡張機能」タブを開く。
3. デベロッパーモードのチェックボックスを選択してデベロッパーモードにする。
4. 「パッケージ化されていない拡張機能を読み込む」ボタンで./src/を開く。

※開発版では自動更新機能をまだ使っていないので、バージョンアップの都度インストールが必要です。


## 使い方

※一度開いた投稿数一覧の表はキャッシュされています。終了したディスカッションは常にキャッシュを利用して再表示されるので、終了後に更新が有った場合には、必要に応じて「強制取得」で再取得してください。

### AirCampus for Webの場合
1. ChromeブラウザーでAirCampus for Webを開くと、ツールバーのこの拡張機能アイコンが有効になります。
2. アイコンをクリックすると「Course List」タブが開きます。
4. 各コースがボタンになっているので、発言数をカウントしたいフォーラムまでボタンをクリックしてドリルダウンします。
5. 該当のディスカッションのボタンを押すと、別タブに投稿数一覧の表が開きます。

※終了したディスカッションは、「開講中のみ」ボタンをOffにすることにより表示されるようになります。

### AirCampusポータルの場合
1. ChromeブラウザーでAirCampusポータルでカウントしたいディスカッションを開いてください。
2. ツールバーのこの拡張機能のアイコンに赤く「count」とバッチがつきます。
3. アイコンをクリックすると、別タブに投稿数一覧の表が開きます。

※ディスカッションのページの一番上の「カウント」ボタンからも投稿数の一覧を開くことができますが、画面が崩れるので、将来的には「カウント」ボタンは無くす予定です。


## 開発

* git-flowでブランチ管理しています。
* 主な開発や課題管理はプライベートのGitLabでやっていて、[GitHub](https://github.com/takuya-o/ACex)は泥臭いものを減らした公開用です。


## 追加機能案 要件抽出中

* 対応済み ~~Chromeウェブストアからの配布~~
* スタイルシートでのきれいなデザイン
* 対応済み ~~「開講中のみ」のようなフィルター機能~~
* 対応済み ~~コースの表示順番を時系列に~~
* 対応済み ~~発言の多い順に表示~~
* 対応済み ~~ユーザーごとの被返信数カウント~~ from V0.0.4.0
* ユーザーごとの本文の文字数カウント
* 対応済み ~~削除された発言除外~~
* 発言中のURL抽出
* コースすべてのフォーラムなど複数のフォーラムの合計値の算出
* テスト中 Chromeウェブストアでのライセンス管理
* 対応済み ~~キャッシュによる高速化~~ from V0.0.8.0
* キャッシュを利用した更新部分のみの取得による高速化


# chromeウェブストアの概要文

## 英語版

* The BBT's website "AirCampus for Web" closed on January 15, 2020, and start "AirCampus Portal" instead.

The following utility tools add to the "AirCampus Portal" by Business Break Through(BBT).
- Count and graph posted messages in each forum
- Download lecture video in the lecture screen
- Create PDF documents from AirSearch's images
  You can also embed OCR text in PDF documents using Google Vision's API Key.

The source is published on GitHub.
It may become unusable due to changes in AirCampus specifications.

It is using Google Tag Manager and Google Analytics to investigate usage.

### What is new!
Version 0.7
Supporting the creating PDF documents on AirSearch.

Version 0.6
Reduced memory during execution with background processing as the event page feature.
The options screen has been improved.

Version 0.4
All data acquiring data from the AirCumpus server use JSON format.

Version 0.3
Refactoring some features.

### Permissions
tabs - Used for switching and managing browser tabs.
storage, unlimitedStorage - Used to save option setting values ​​and data cache.
identity - used for license management

## 日本語版

※BBTのウェブサイト「AirCampus for Web」は2020/1/15にサービスが終了し、代わりに「AirCampusポータル」になりました。

以下の機能が ビジネス・ブレークスルー(BBT)の「AirCampusポータル」に追加されます。
- 各フォローラムの発言数カウント・グラフ化する
- 視聴画面で講義映像をダウンロードする
- AirSearchの画像からPDF資料を作成する
  さらに Google VisionのAPI Keyを利用すれば、PDF資料にOCRによるテキストも埋め込むこともできます。

ソースは、GitHub で公開しています。
AirCampusの仕様変更により使えなくなってしまうことがあるかもしれません。

Google Tag ManagerとGoogle Analyticsを使用して使用状況を調査しています。

### What is new!
Version 0.7
AirSearchの画像からPDF資料を作成する機能をサポートしました。

Version 0.6
バックグラウンド処理をイベントにして実行時のメモリ削減を行いました。
オプション画面の改善を行いました。

Version 0.4
ACサーバからのデータを全てJSONで取得するようにしました。

Version 0.3
機能の整理を行いました。

### Permission
tabs - ブラウザタブの切替・管理のために利用します。
storage,unlimitedStorage - オプションの設定値やデータのキャッシュを保存するために利用します。
identity - ライセンス管理のために利用します
