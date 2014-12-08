# AirCampus for Web Extender

Chromeブラウザ用の「発言数カウント」拡張機能を作りました。


## ビルド方法

crxmakeがある環境で、crxmakeに--key-outputオプションをつけて秘密キーACex.pemを作ってから、./build.rbする。


## インストール方法

### 正式版のインストール
1. Chromeウェブストアからインストールする。(URLは限定公開)

### 開発版のインストール
1. ソースを展開する。
2. Chromeブラウザの「拡張機能」タブを開く。
3. デベロッパーモードのチェックボックスを選択してデベロッパーモードにする。
4. 「パッケージ化されていない拡張機能を読み込む」ボタンで./src/を開く。

※開発版では自動更新機能をまだ使っていないので、バージョンアップの都度インストールが必要です。

※Googleのセキュリティ対策で、2014/5/1以降はWindows版の安定版のChromeブラウザーでACex.crxをドラッグアンドドロップするインストール方法ではインストールできなくなりました。

## 使い方

1. ChromeブラウザーでAirCampus for Webを開くと、この拡張機能によりアドレスバー右端に、アイコンが出ます。
2. アイコンをクリックするとメニューが出ます。(まだ、メニューは「Count」のみ)
3. 「Count」を選択すると、「Course List」タブが開きます。
4. 各コースがボタンになっているので、発言数をカウントしたいフォーラムまでドリルダウン。
5. 該当のフォーラムのボタンを押すと、別タブに投稿数一覧の表が開きます。


## 開発

* git-flowでブランチ管理しています。
* 主な開発や課題管理はプライベートのgitlabでやっていて、githubは泥臭いものを減らした公開用です。

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

## 追加/修正された機能
#### 0.0.6.2
・Bugfix: 0.0.6.0以降、閉じたタブの管理に不具合がありクローズ済みのタブを再利用しようとしていた。

### 0.0.6.0
・Chromeウェブストアでのライセンス管理(実験的サポート)

#### 0.0.5.4
・Bugfix: 削除数のカウントが、削除された発言の前の人にカウントされていた。

#### 0.0.5.3
・Bugfix: Macでポップアップの殻が残る。
・Bugfix: 0.0.5.2の修正の影響で表示しているタブに飛ばす新たにタブを作成してしまう。

#### 0.0.5.2
・Bugfix: カウント結果表示タブのURLを変更しても検知できず再利用してしまう。

### 0.0.5.0
・返信数カウント
・自分の発言への返信をカウント
・ツールチップ
・表の罫線
・Bugfix: 削除数

### 0.0.4.0
* 発言数カウント結果を別タブで表示
* 削除数を表示
* 被返信数と発言数に対するその割合を表示




