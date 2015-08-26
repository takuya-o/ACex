// -*- coding: utf-8-unix -*-
(function() {
  var PopUp = Class.create({
    bg: null,
    initialize: function() {
      this.bg = chrome.extension.getBackgroundPage().bg;
      window.addEventListener("load", function(evt) {
        this.start();
      }.bind(this));
    },
    start: function() {
      if (this.bg.isDisplayPopupMenu()) {
        messageUtil.assignMessages();  //表示をするときのみI18N文字列置き換え
        this.assignEventHandlers();
      } else {
        //通常モード
        var wait = 0;
        if(navigator.userAgent.indexOf('Mac') != -1){
          //0.5秒後に移動Mac対策
          wait = this.bg.getPopupWaitForMac();
        }
        $('content').hide();
        setTimeout(function() {
          this.preview("count");
        }.bind(this), wait);
      }
    },
    assignEventHandlers: function() {
      //$("***").onclick = this.onClick***.bind(this);
      var elems = document.getElementsByTagName('a');
      Array.prototype.forEach.call(elems, function(node) {
        if (node.className.match(/MSG_(\w+)/).length > 0) {
          node.onclick = this.onClickURL.bind(this);
        }
      }.bind(this));
    },
    onClickURL: function(evt) {
      var cmd = evt.target.id;
      this.preview(cmd);
    },
    preview: function(cmd) {
      var url = "";
      var openedUrl = this.bg.getOpenedUrl();
      if ( cmd=="count" && openedUrl.match(/^https?:\/\/[^.\/]+\.aircamp\.us\/course\//) ) {
        //HTML5版でコース画面
        var regexp = /^https?:\/\/[^.\/]+\.aircamp\.us\/course\/\d+(|\/.*)#forum\/(\d+)/;
        var match = openedUrl.match(regexp);
        if ( match ) {
          url =  "countresult.html" + "?fid=" + encodeURI(match[2]);
        }
      }
      if ( url == "" ) {
        url = "courselist.html" + "?cmd=" + encodeURI(cmd);
      }

      chrome.runtime.sendMessage(
        {cmd: "open", url: url}, function(response) {
          if (chrome.runtime.lastError) {
            //bgへのメッセージ送信失敗でtab開けず
            console.log("####: sendMessage open:",chrome.runtime.lastError.message);
          }
        });
      window.close();  // popupを閉じる処理 MacOSで重要
    }
  });
  new PopUp();
})();
