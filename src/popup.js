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
      messageUtil.assignMessages();
      if (this.bg.isDisplayPopupMenu()) {
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
      var url = "courselist.html" + "?cmd=" + encodeURI(cmd);
      var tabId = this.bg.getTabId(url);
      if (tabId == null) { //nullとの==比較でundefined見つけてる
        //新しいタブを開く 引数省略すると「新しいタブ」
        chrome.tabs.create({active: true, url: url}, function(tab) {
          this.bg.addTabId(url, tab.id);
          window.close();  // popupを閉じる処理 MacOSで重要
        }.bind(this));
      } else {
        //既に開いているタブを使う
        chrome.tabs.update(tabId, {highlighted: true});
      }
    }
  });
  new PopUp();
})();
