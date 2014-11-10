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
      this.assignMessages();
      if ( window.document.URL.match(
          /^http:\/\/accontent\.bbt757\.com\/content\//) ) {
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
      } else {
        //ACweb画面の時
        this.getACconfig();
      }
    },
    assignMessages: function() {
      var elems = document.querySelectorAll('*[class^="MSG_"]');
      Array.prototype.forEach.call(elems, function(node) {
        var key = node.className.match(/MSG_(\w+)/)[1];
        var message = chrome.i18n.getMessage(key);
        if (message) {
          node.textContent = message;
        }
        ;
      });
    },
    getMessage: function(args) {//arg:配列
      var ret = "";
      for(var i=0; i<args.length; i++ ) {
        if ( i != 0 ) { ret = ret + " "; };
        var message = chrome.i18n.getMessage(args[i]);
        if (!message) { message = args[i]; };
        ret = ret + message;
      }
      return ret;
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
            tab.insert('<p>'+this.getMessage(["auth_time"])+ telop +'</p>');
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
