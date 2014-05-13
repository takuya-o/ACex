// -*- coding: utf-8-unix -*-
(function() {
  var Options = Class.create({
    bg: null,
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
    },
    assignEventHandlers: function() {
      $("options_save").onclick = this.onClickSave.bind(this);
      $("experimental_option").onclick = this.onClickSave.bind(this);
      $("coursename_rectriction_option").onclick = this.onClickSave.bind(this);
    },
    assignMessages: function() {
      var elems = document.querySelectorAll('*[class^="MSG_"]');
      Array.prototype.forEach.call(elems, function (node) {
        var key = node.className.match(/MSG_(\w+)/)[1];
        var message = chrome.i18n.getMessage(key);
        if (message) node.textContent = message;
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
    restoreConfigurations: function() {
      $("experimental_option").checked = this.bg.isExperimentalEnable();
      $("coursename_rectriction_option").checked = this.bg.isCRmode();
    },
    onClickSave: function(evt) {
      var experimental = $("experimental_option").checked;
      var coursenameRestriction = $("coursename_rectriction_option").checked;
      this.bg.setSpecial(experimental, coursenameRestriction);

      $('message').update(this.getMessage(["options_saved"]));
      setTimeout( function() {
        $('message').innerHTML=""; //一秒後にメッセージを消す
      }, 1000);
    }
  });
  new Options();
})();
