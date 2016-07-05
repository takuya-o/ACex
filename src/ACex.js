// -*- coding: utf-8-unix -*-
/* global Class, chrome, messageUtil */
(function() {
  console.log("--- Start ACex ---");
  var ContentScript = Class.create({
    initialize: function() {
      window.addEventListener("load", function(evt) {
        this.start();
      }.bind(this));
    },
    start: function() {
      messageUtil.assignMessages();
      var url = window.document.URL;
      //Backgroundに最新url通知
      chrome.runtime.sendMessage( {cmd: "openedUrl", url: url}, function(response) {
        if (chrome.runtime.lastError) {
          console.log("####: sendMessage openUrl:",chrome.runtime.lastError.message);
        }
      } );

      if ( url.match(/^http:\/\/accontent\.bbt757\.com\/content\//) ) {
        //視聴画面の時
        var settings = this.getSettings();
        if ( settings ) { //セッティング情報が見つかったら
          //Videoダウンロード表示
          chrome.runtime.sendMessage(
            {cmd: "isDownloadable"}, function(response) {
              //コンテント・スクリプトなのでgetBackground()出来ないのでメッセージ
              if (chrome.runtime.lastError) {
                console.log("####: sendMessage isDownloadable:",chrome.runtime.lastError.message);
              }
              console.log("ACex: isDawnloadable() = " + response.isDownloadable);
              if ( response.isDownloadable ) {
                this.getVideoSources(settings);
              }
              //認証情報表示
              chrome.runtime.sendMessage(
                {cmd: "isDisplayTelop"}, function(response) {
                  if (chrome.runtime.lastError) {
                    console.log("####: sendMessage isDisplayTelop:",chrome.runtime.lastError.message);
                  }
                  //コンテント・スクリプトなのでgetBackground()出来ないのでメッセージ
                  console.log("ACex: isDisplayTelop() = " + response.isDisplayTelop);
                  if ( response.isDisplayTelop ) {
                    this.getACtelop(settings);
                  }
                }.bind(this) );
            }.bind(this) );
        } else {
          console.log("Can not find settings."); //failsafe
        }
      } else if (url.match(/^https?:\/\/[^.\/]+\.aircamp\.us\/course\//) ) {
        //HTML5版でコース画面
        this.getACconfig();
        //RexExp準備 ツリーからの更新は#以下のURLしか変えない
        //おしらせ一覧などを経由すると/informationなどが入る
        var regexp = /^https?:\/\/[^.\/]+\.aircamp\.us\/course\/\d+(|\/.*)#forum\/(\d+)/;
        chrome.runtime.sendMessage({cmd: "isCountButton"}, function(response) {
          //コンテント・スクリプトなのでgetBackground()出来ないのでメッセージ
          if (chrome.runtime.lastError) {
            console.log("####: sendMessage isCountButton:",chrome.runtime.lastError.message);
          }
          console.log("ACex: isCountButton() = " + response.isCountButton);
          if ( response.isCountButton ) {
            this.injectCountButton(regexp); //カウントボタン追加
          }
          this.updateIcon(url, regexp); //アイコンと有ればボタン更新
        }.bind(this));
        //URL変更検知
        window.addEventListener( "hashchange", function(event) {
          var url = event.newURL;
          this.updateIcon(url, regexp); //アイコンと有ればボタン更新
          //Backgroundに最新url通知
          chrome.runtime.sendMessage( {cmd: "openedUrl", url: url}, function(response) {
            if (chrome.runtime.lastError) {
              console.log("####: sendMessage openedUrl:",chrome.runtime.lastError.message);
            }
          } );
        }.bind(this));
      } else {
        //ACweb画面の時
        console.log("AirCumpus for Web.");
        this.getACconfig();
      }
    },
    updateIcon: function(url, regexp) { //private
      var input =document.getElementById('ACexCountButton'); //ボタンが無い場合がある
      var iconText = "";
      //PageActionではバッチテキスト使えない var badgeText = ""
      if ( url.match(regexp) ) {
        //フォーラムを開いているのでボタン有効
        if ( input != null ) { input.disabled = false; }
        console.log("ACexCountButton enable.");
        iconText="COUNT"; //countマーク入りアイコン
        //badgeText="Count";
      } else {
        if ( input != null ) { input.disabled = true; }
        console.log("ACexCountButton disable.");
        iconText="";  //defaultのアイコン
        //badgeText="";
      }
      //Backgroundに最新icon通知
      chrome.runtime.sendMessage( {cmd: "setIcon", text: iconText}, function(response) {
        if (chrome.runtime.lastError) {
          console.log("####: sendMessage setIcon:",chrome.runtime.lastError.message);
        }
      } );
      // //Backgroundに最新iconバッチテキスト通知
      // chrome.runtime.sendMessage( {cmd: "setBadgeText", text: badgeText}, function(response) {
      //   if (chrome.runtime.lastError) {
      //     console.log("####: sendMessage setBadgeText:",
      //                 chrome.runtime.lastError.message);
      //   }
      // } );
    },
    injectCountButton: function(regexp) { //private
      //navにボタンをinjection
      var navs =document.getElementsByTagName('nav');
      if ( navs.length > 0 ) { //入れるの早すぎると消されるがリロードで出てくる
        var uls = navs[0].getElementsByTagName('ul');
        if ( uls.length > 0 ) {
          var input = document.createElement('input');
          input.disabled = true;
          input.setAttribute('id', 'ACexCountButton');
          input.setAttribute('type', 'button');
          input.setAttribute('value', messageUtil.getMessage(["Count"]));
          input.addEventListener("click", function() {
            //AjaxでURLが毎回変わっていることがあるので取りなおす
            var match = window.document.URL.match(regexp);
            if ( !match ) {
              alert("Faital Error: Can't get forum ID.");
            } else {
              var fid = match[2];
              var href= chrome.runtime.getURL("countresult.html"
                                              + "?fid=" + encodeURI(fid));
              chrome.runtime.sendMessage({cmd: "open", url: href}, function(response) {
                //レスポンスでもらう値なしだかコネクション閉じるために受信
                if (chrome.runtime.lastError) {
                  console.log("####: sendMessage open:",chrome.runtime.lastError.message);
                }
              });
            }
          });
          var li = document.createElement('li');
          uls[0].insert( li.insert(input) );
        }
      }
    },
    getSettings: function () { //ACのsetting情報を取得する
      var settings;
      var elements = window.document.getElementsByTagName("script");
      console.log("ACex: getSettings" + elements.length );
      for (var i = 0; i < elements.length; i++) {
        var text = elements[i].innerText;
        if (text) {
          var match = text.match(/var settings = ({.*});/);
          if (match) {
            settings = JSON.parse(match[1]);
            console.log("ACex: getSettings found setting.");
            break;
          }
        }
      }
      return settings;
    },
    getVideoSources: function(settings) {
      var sources;
      //映像ファイル情報取得
      sources = settings.playlist.sources; //[].file & .label
      if ( sources ) {
        var tab=document.getElementById('content-tab1'); //概要タブ
        if (tab) { //入れるの早すぎると消されるがリロードで出てくる
          for(var i=0; i<sources.length; i++ ) {
            console.log("ACex: Video source " + sources[i].label );
            var title = sources[i].file.match(".+/(.+?)([\?#;].*)?$")[1];
            var titles = window.document.getElementsByTagName("title");
            if (titles) {
              //<title>大前研一アワー 367 の配信は 08月09日 22時30分から</title>
              //<title>大前研一アワー 368 の配信は 08月15日 22時30分から【向研会】イタリアの研究 ～国破れて地方都市あり～</title>
              title = titles[0].innerText.replace(/ の配信は.*から/,"")
                .replace(/ /g,"") + " " + title;
            }
            var aElement = document.createElement("a");
            aElement.setAttribute("href", sources[i].file);
            aElement.setAttribute("download", title);
            aElement.innerHTML = sources[i].label;
            tab.insert({top: aElement});
          }
        } else {
            console.log("ACex: Can not find the tab.");
        }
      } else {
        console.log("ACex: Can not find Video source information"); //failsafe
      }
    },
    getACtelop: function (settings) {
      var telops;
      var datas;
      console.log("ACex: getACtelop" );
      //テロップ情報取得
      telops = settings.telop;
      if ( telops ) { //テロップ情報が有ったら
        if ( settings.data ) { //認証済み情報も取得
          //"data": "C,S,0,2015/08/10 07:32:01;I,6,537;"
          datas = settings.data.split(";");
        } else {
          datas = new Array(); //failsafe
        }
        //「,」区切りの文字列も配列に展開しておく
        for(var j=0; j<datas.length; j++) {
          var dataCmd = datas[j].split(",");
          datas[j] = dataCmd;
        }
        //console.log("ACex: telops=" + telops );
        var tab=document.getElementById('content-tab1'); //概要タブ
        if (tab) { //入れるの早すぎると消されるがリロードで出てくる
          for(var i=0; i<telops.length; i++) {
            //テロップ時間を文字列として取り出し行く
            //"telop": [{"choices": "6FAES", "id": "31614", "value": "6", "time": 537},..]
            var telop = this.getHourString( new Date( telops[i].time * 1000 ));
            //該当のtelopの認証済み情報を検索
            for(var j=0; j<datas.length; j++) {
              var dataCmd = datas[j];
              if ( dataCmd.length >= 3 ) {
                if ( dataCmd[0]=="I" && dataCmd[1]==telops[i].value ) {
                  //該当のテロップの認証済み情報取得して文字列に追加
                  telop = telop + "  " + dataCmd[1] + ";"
                    + this.getHourString( new Date( dataCmd[2] * 1000 ));
                  dataCmd[1]="";  //また見つけないように消しておく
                  break; //一つみつけたらOK
                }
              }
            }
            console.log("ACex: time=" + telop);
            tab.insert('<p>'+messageUtil.getMessage(["auth_time"]) +
                       telop +'</p>');
          }
        }
      }else{
        console.log("ACex: no telop");
      }
    },
    getHourString: function(date) { //時間を文字列 0:00:00 にする
      return date.getUTCHours() + ":"
        + ("00" + date.getUTCMinutes()).slice(-2) + ":"
        + ("00" + date.getUTCSeconds()).slice(-2);
    },
    getACconfig: function() {
      var sessionA = "";
      var userID = "";
      var elements = window.document.getElementsByTagName("script");
      //alert(elements.length + "個の要素を取得しました");
      for (var i = 0; i < elements.length; i++) {
        var text = elements[i].innerText;
        if (text) {
          //alert(i + ":" + elements[i].innerText);
          var match = text.match(/a=\w+/);
          if (match) { sessionA = match; };
          match = text.match(/u=\w+/);
          if (match) { userID = match; };
        }
      }
      chrome.runtime.sendMessage(
        {cmd: "setSession", userID: userID, sessionA: sessionA}, function() {
          //レスポンスでもらう値なしだかコネクション閉じるために受信
          if (chrome.runtime.lastError) {
            console.log("####: sendMessage setSession:",chrome.runtime.lastError.message);
          }
        });
      console.log("ACex: " + userID + " : " + sessionA);
    }

  });
  new ContentScript();
})();
