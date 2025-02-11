# AirCampusポータル Extender

発言数が成績に大きく影響しているように感じたので、AirCampusでのディスカッションの発言数をカウントするChromeブラウザ拡張機能を作りました。

## 主な機能
* ディスカッションの発言数カウント - 参加者の発言数の推移一覧とグラフを表示します
* ビデオダウンロード - ビデオのダウンロードができるようになります
* 画像からのPDF資料作成 - PDF資料がない場合も画像があればPDF資料を作成します
* 視聴認証情報の表示 - 視聴画面での認証情報を表示します

## インストール方法

### 正式版のインストール
1. Chromeウェブストアからインストールする。([URLは限定公開](https://chrome.google.com/webstore/detail/aircampus%E3%83%9D%E3%83%BC%E3%82%BF%E3%83%ABextender/iphdoahjdhlkfkjdfdjcidmgadpaelno))

### 開発版のインストール
1. ソースを展開します
2. Chromeブラウザの「拡張機能」タブを開きます
3. デベロッパーモードのチェックボックスを選択してデベロッパーモードにします
4. 「パッケージ化されていない拡張機能を読み込む」ボタンで./src/を開きます

※開発版では自動更新機能をまだ使っていないので、バージョンアップの都度インストールもしくは更新が必要です。


## 使い方

### AirCampusポータルの場合
1. ChromeブラウザーでAirCampusポータルからカウントしたいディスカッションを開きます
2. ツールバーのこの拡張機能のアイコンに赤く「count」とバッチがつきます
3. アイコンをクリックすると、別タブに投稿数一覧の表が開きます

※オプション設定により、ディスカッションのページの一番上の「カウント」ボタンからも投稿数の一覧を開くことができますが、画面が崩れるので、将来的には「カウント」ボタンは無くす予定です。

### AirCampus for Webの場合
注: AirCampus for Webは、BBTでのサービスが2020年1月15日に終了しています。
1. ChromeブラウザーでAirCampus for Webを開くと、ツールバーのこの拡張機能アイコンが有効になります
2. アイコンをクリックすると「カウントコース選択」Course Listタブが開きます
4. 各コースがボタンになっているので、発言数をカウントしたいフォーラムまでボタンをクリックしてドリルダウンします
5. 該当のディスカッションのボタンを押すと、別タブに投稿数一覧の表が開きます

※終了したディスカッションは、「開講中のみ」ボタンをOffにすることにより表示されるようになります。

※2019年以降の新しいシステムでのコースは、「カウントコース選択」の一覧に表示されません。

### その他の注意事項
※一度開いた投稿数一覧の表はキャッシュされています。終了したディスカッションは常にキャッシュを利用して再表示されるので、終了後に更新が有った場合には、必要に応じて「強制取得」で再取得してください。

※画像PDF作成時にOCRによりテキスト埋め込みを行う場合には、[Google Cloud Vision API](https://cloud.google.com/vision)のAPI Keyを取得してオプション画面で設定する必要があります。

#### Google Cloud Vision APIでのAPI Key取得方法
1. まず、APIを有効にする必要があります。「[クイックスタート: Vision API のセットアップ](https://cloud.google.com/vision/docs/setup#api)」の「APIを有効にする」まで行います
2. 「[API キーを使用して認証する](https://cloud.google.com/docs/authentication/api-keys)」を参照して、APIキーを作成します。APIキーで「Cloud Vision API」を選択することを忘れないでください

# 開発

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
* テスト中→廃止予定:Chromeウェブストアでのライセンス管理
* 対応済み ~~キャッシュによる高速化~~ from V0.0.8.0
* キャッシュを利用した更新部分のみの取得による高速化
* AirSearch beta(2020/12)対応
  * 認証情報表示
  * ~~ビデオダウンロード~~
  * ~~画像PDF作成~~

## ビルド方法

### ビルド準備
crxmakeがある環境で、crxmakeに --key-outputオプションをつけて秘密キーACex.pemを作る。

#### 例:
```shell
$ crxmake --pack-extension="src" --extension-output="ACex.crx" --key-output=seckey.pem --verbose
```

※最近、crxmakeでは正しいキーが作れないことがあるのでchromeで作った方がよいかも。

#### フォント準備
```shell
$ base64 -w 0 <ipag.ttf >ipag.base64 #改行なし
$ (echo -n 'const ipag ="';cat ipag.base64 ;echo -n '"') >ipag-ttf.js #文字列は改行で切れる
```

### ビルド
#### フルビルド
パッケージのインストールからChrome拡張機能用の.zipファイル作成までを行う。
```shell
$ npm run full-build
```

#### 開発ビルド
テスト用の.jsファイルを生成する。
```shell
$ npm run lint
$ npm run build
```

#### Prettierによるソースコード整形
```shell
$ npm run format
```

## CI
GitLab CIのAutoDevOpsをベースとしたCIを利用しています。

### コード品質Job高速化
.gitlab-ci.ymlでは、Code Qualityの高速化のために専用のcq-sans-dindタグがついたgitlab-runnerを用意されていることを期待しています。

参照: [mprove Code Quality performance with private runners](https://docs.gitlab.com/ee/ci/testing/code_quality.html#improve-code-quality-performance-with-private-runners)

設定例: オプションの推奨設定とタグなしを拒否を追加しています。
```shell
$ gitlab-runner register --executor "docker" \
  --docker-image="docker:stable" \
  --url "https://gitlab.com/" \
  --description "cq-sans-dind" \
  --tag-list "cq-sans-dind" \
  --locked="false" \
  --access-level="not_protected" \
  --docker-volumes "/cache"\
  --docker-volumes "/tmp/builds:/tmp/builds"\
  --docker-volumes "/var/run/docker.sock:/var/run/docker.sock" \
  --registration-token="<project_token>" \
  --non-interactive
  --builds-dir "/tmp/builds" \
  --run-untagged=false
```

### キャッシュ圧縮高速化
GitLabのCI変数に以下を追加して、CPU使用量と容量増えることを許容してキャッシュの圧縮の高速化を図ることができます。

| 設定 | 設定値 | デフォルト値 | 詳細 |
| ---- | ------ | ------------ | ---- |
|FF_USE_FASTZIP |true |false | FastZipを利用 |
|ARTIFACT_COMPRESSION_LEVEL |fast |slow |Artifactsの圧縮レベル fastest(無圧縮), fast, slow, slowest |
|CACHE_COMPRESSION_LEVEL |fast|slow |Cacheの圧縮レベル fastest(無圧縮), fast, slow, slowest |

∵ GitLabのDefaultだと圧縮がものすごく遅く最近の通信速度は早いので。

## ソース管理
* git-flowでブランチ管理しています
* 主な開発や課題管理はプライベートのGitLabで行っています
* [GitHub](https://github.com/takuya-o/ACex)は泥臭いものを削った公開用です


# chromeウェブストアの概要文

## 英語版

* The BBT's Website "AirCampus for Web" closed on January 15, 2020, and start "AirCampus Portal" instead.

The following utility tools add to the "AirCampus Portal" by Business Break Through(BBT).
- Count and graph posted messages in each forum
- Download lecture video in the lecture screen
- Create PDF documents from AirSearch's images
  You can also embed OCR text in PDF documents using Google Vision's API Key.

The source is published on GitHub.
It may become unusable due to changes in AirCampus specifications.

It is using Google Tag Manager and Google Analytics to investigate usage.

### What is new
Version 0.10
* Support 2023 AirCampus new design
* Add transparent text on the location of the characters in the image on PDF

Version 0.9
Support Manifest V3.

Version 0.8
Supporting AirSearch beta(Dec.2020), partially.
* Focused slide image, and video download.
* The creating PDF documents from slide images on the video screen.

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
activeTab - Used for switching and managing browser tabs.
storage, unlimitedStorage - Used to save option setting values and data cache.
identity, identity.email - Used for license management.
<all_urls> - For taking slide images by screenshot. (Optional)

## 日本語版

※BBTのウェブサイト「AirCampus for Web」は2020/1/15にサービスが終了し、代わりに「AirCampusポータル」になりました。
※2021年に公開されていた新しいAirSearchと、そこから起動される新しい視聴画面に対応中です。いまのところ視聴画面での視聴情報表示に対応する見通しはありません。
※2023年に公開が開始されている「新しいデザイン」は未調査です。

次の機能がビジネス・ブレークスルー(BBT)の「AirCampusポータル」に追加されます。
- 各フォローラムの発言数カウント・グラフ化する
- 視聴画面で講義映像をダウンロードする
- AirSearchの画像からPDF資料を作成する
  さらにGoogle VisionのAPI Keyを利用すれば、PDF資料にOCRによるテキストも埋め込むことができます

ソースは、GitHubで公開しています。
AirCampusの仕様変更により使えなくなってしまうことがあるかもしれません。

Google Tag ManagerとGoogle Analyticsを使用して使用状況を調査しています。

### What is new
Version 0.10
* Supoort 2023年のAirCampus新デザインに対応しました。
* 画像PDFで画像の文字の位置に透明文字を入れるようにしました。

Version 0.9
Manifest V3対応。

Version 0.8
部分的にAirSearch beta(2020/12)をサポート。
* スライドの曇り止めとビデオダウンロード
* 視聴画面で「画像PDF化資料」作成をサポート(実験的オプション)

Version 0.7
AirSearchの画像からPDF資料を作成する機能をサポートしました。

Version 0.6
バックグラウンド処理をイベントにして実行時のメモリ削減しました。
オプション画面の改善しました。

Version 0.4
ACサーバからのデータをすべてJSONで取得するようにしました。

Version 0.3
機能の整理しました。

### Permission
activeTab - ブラウザタブの切替・管理のために利用します。
storage, unlimitedStorage - オプションの設定値やデータのキャッシュを保存するために利用します。
<all_urls> - スライド画像をスクリーンチャプタで取得するために利用します。
identity  - ライセンス管理のためにユーザを特定するため。
identity.email - ユーザ管理のために連絡先を確認するため。
