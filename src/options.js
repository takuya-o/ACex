// -*- coding: utf-8-unix -*-
(function() {
  var Options = Class.create({
      initialize: function() {
        this.bg = chrome.extension.getBackgroundPage().bg;
        window.addEventListener("load", function(evt) {
            this.start();
          }.bind(this));
      },
      start: function() {
        this.assignMessages();
        this.assignEventHandlers();
        this.restoreConfigurations();
        //
      },
      assignMessages: function() {
        var elems = document.querySelectorAll('*[class^="MSG_"]');
        Array.prototype.forEach.call(elems, function (node) {
          var key = node.className.match(/MSG_(\w+)/)[1];
          var message = chrome.i18n.getMessage(key);
          if (message) node.textContent = message;
        });
      },
      assignEventHandlers: function() {
        $("option_save").onclick = this.onClickSave.bind(this);
      },
      restoreConfigurations: function() {
        $("option1").value = this.bg.getOyoConfig();
      },
      onClickSave: function(evt) {
        var value = $("option1").value;
        this.bg.setOyoConfig(value);
      }
    });
  new Options();
})();
