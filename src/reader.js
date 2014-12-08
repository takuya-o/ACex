// -*- coding: utf-8-unix -*-
(function() {
  var ACReader = Class.create({
    bg: null,
    initialize: function() {
      this.bg = chrome.extension.getBackgroundPage().bg;
      window.addEventListener("load", function(evt) {
        this.start();
      }.bind(this));
    },
    start: function() {
      utilMessage.assignMessages();
      tabHandler.assignMessageHandlers(this); //backgroundからの通信受信設定
      this.createList();
    },
    createList: function() {
      $('message').insert(messageUtil.getMessage(["loding"]));
    }
  });
  new ACReader();
})();
