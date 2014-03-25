// -*- coding: utf-8-unix -*-
(function() {
  var PopUp = Class.create({
    initialize: function() {
      this.bg = chrome.extension.getBackgroundPage().bg;
      window.addEventListener("load", function(evt) {
        this.start();
      }.bind(this));
    },
    start: function() {
      //省略性能重視 this.assignMessages();
      this.preview("courselist.html");
    },
    assignMessages: function() {
      var elems = document.querySelectorAll('*[class^="MSG_"]');
      Array.prototype.forEach.call(elems, function (node) {
        var key = node.className.match(/MSG_(\w+)/)[1];
        var message = chrome.i18n.getMessage(key);
        if (message) { node.textContent = message; }
      });
    },
    preview: function(url) {
      //タブを開く 引数省略すると「新しいタブ」
      chrome.tabs.create({ url: url });
      window.close();
    }
  });
  new PopUp();
})();
