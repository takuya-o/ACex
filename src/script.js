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
      this.assignEventHandlers();
      this.getACconfig();
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
    assignEventHandlers: function() {
      //$("Foo").onclick = this.onClickFoo.bind(this);
    },
    onClickFoo: function(evt) {
      // 設定値を取得
      //var oyoConfig = this.bg.getOyoConfig();
      // Ajax通信
      //this.bg.loadFoo({
      //  onSuccess: function(res) {
      //            //
      //  }.bind(this)
      //});
      //
    },
    //
    getACconfig: function() {
      var sessionA = "";
      var userID = "";
      var elements = window.document.getElementsByTagName("script");
      //alert(elements.length + "個の要素を取得しました");
      for (i = 0; i < elements.length; i++) {
        var text = elements[i].innerText;
        if (text) {
          //alert(i + ":" + elements[i].innerText);
          var match = text.match(/a=\w+/);
          if (match) {
            sessionA = match;
          }
          ;
          match = text.match(/u=\w+/);
          if (match) {
            userID = match;
          }
          ;
        }
      }
      chrome.extension.sendMessage(
        {cmd: "setSession", userID: userID, sessionA: sessionA});
      console.log("ACex: " + userID + " : " + sessionA);
    }

  });
  new ContentScript();
})();

