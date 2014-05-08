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
      this.assignMessages();
      if( this.bg.isExperimentalEnable() ) {
        this.assignEventHandlers();
      } else {
        //通常モード
        this.preview("count");
      }
    },
    assignEventHandlers: function() {
      //$("***").onclick = this.onClick***.bind(this);
      var elems = document.getElementsByTagName('a');
      Array.prototype.forEach.call(elems, function (node) {
        if ( node.className.match(/MSG_(\w+)/).length > 0 ) {
          node.onclick = this.onClickURL.bind(this);
        }
      }.bind(this));
    },
    assignMessages: function() {
      var elems = document.querySelectorAll('*[class^="MSG_"]');
      Array.prototype.forEach.call(elems, function (node) {
        var key = node.className.match(/MSG_(\w+)/)[1];
        var message = chrome.i18n.getMessage(key);
        if (message) { node.textContent = message; }
      });
    },
    onClickURL: function(evt) {
      var cmd = evt.target.id;
      this.preview(cmd);
    },
    preview: function(cmd) {
      var url = "courselist.html" + "?cmd=" + encodeURI(cmd);
      var tabId = this.bg.getTabId(url);
      if ( tabId == null ) { //nullとの==比較でundefined見つけてる
        //新しいタブを開く 引数省略すると「新しいタブ」
        chrome.tabs.create({ "url": url }, function(tab){
          this.bg.addTabId(url, tab.id);
          window.close();  // popupを閉じる処理 MacOSで重要
        }.bind(this));
      } else {
        //既に開いているタブを使う
        chrome.tabs.update(tabId,{highlighted:true});
      }
    }
  });
  new PopUp();
})();
