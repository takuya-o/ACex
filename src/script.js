// -*- coding: utf-8-unix -*-
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
      if ( url.match(/^http:\/\/accontent\.bbt757\.com\/content\//) ) {
        //視聴画面の時
        chrome.runtime.sendMessage(
          {cmd: "isDisplayTelop"}, function(response) {
            //コンテント・スクリプトなのでgetBackground()出来ないのでメッセージ
            console.log("ACex: isDisplayTelop() = " + response.isDisplayTelop);
            if ( response.isDisplayTelop ) {
              //オプションOnのときだけ表示
              this.getACtelop();
            }
          }.bind(this) );
      } else if (url.match(/^https?:\/\/[^.\/]+\.aircamp\.us\/course\//) ) {
        //HTML5版でコース画面
        this.getACconfig();
        //RexExp準備 ツリーからの更新は#以下のURLしか変えない
        //おしらせ一覧などを経由すると/informationなどが入る
        var regexp = /^https?:\/\/[^.\/]+\.aircamp\.us\/course\/\d+(|\/.*)#forum\/(\d+)/;
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
                chrome.runtime.sendMessage(
                  {cmd: "open", url: href}, function(response) {
                    //レスポンスでもらう値なしだかコネクション閉じるために受信
                  });
              }
            });
            var li = document.createElement('li');
            uls[0].insert( li.insert(input) );
          }
        }
        if ( url.match(regexp) ) {
          //フォーラムを開いているのでボタン有効
          var input =document.getElementById('ACexCountButton');
          input.disabled = false;
        } else {
          //HTML5画面でフォーラム以外
          console.log("AirCumpus HTML5 page.");
        }
        //URL変更検知
        window.addEventListener( "hashchange", function(event) {
          var url = event.newURL;
          var input =document.getElementById('ACexCountButton');
          if ( input && url.match(regexp) ) {
            //フォーラムを開いているのでボタン有効
            input.disabled = false;
            console.log("ACexCountButton enable.");
          } else {
            input.disabled = true;
            console.log("ACexCountButton disable.");
          }
        });
      } else {
        //ACweb画面の時
        console.log("AirCumpus for Web.");
        this.getACconfig();
      }
    },
    getACtelop: function () {
      var telops;
      var elements = window.document.getElementsByTagName("script");
      console.log("ACex: getACtelop" + elements.length );
      for (var i = 0; i < elements.length; i++) {
        var text = elements[i].innerText;
        if (text) {
          var match = text.match(/var settings = ({.*});/);
          if (match) {
            telops = JSON.parse(match[1]).telop;
            break;
          }
        }
      }
      if (telops) {
        //console.log("ACex: telops=" + telops );
        for(var i=0; i<telops.length; i++) {
          var d = new Date( telops[i].time * 1000 );
          var telop = d.getUTCHours()+":"+d.getUTCMinutes()+":"+d.getUTCSeconds();
          console.log("ACex: time=" + telop);
          var tab=document.getElementById('content-tab1');
          if (tab) { //入れるの早すぎると消されるがリロードで出てくる
            tab.insert('<p>'+messageUtil.getMessage(["auth_time"])+ telop +'</p>');
          }
        }
      }else{
        console.log("ACex: no telop");
      }
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
        });
      console.log("ACex: " + userID + " : " + sessionA);
    }

  });
  new ContentScript();
})();
