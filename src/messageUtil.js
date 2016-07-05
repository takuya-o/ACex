// -*- coding: utf-8-unix -*-
/* global Class, chrome */
var messageUtil = null;
(function() {
  var MessageUtil = Class.create({
//   initialize: function() {
//    },
    assignMessages: function() {
      var elems = document.querySelectorAll('*[class^="MSG_"]');
      Array.prototype.forEach.call(elems, function (node) {
        var key = node.className.match(/MSG_(\w+)/)[1];
        var message = chrome.i18n.getMessage(key);
        if (message) {
          node.textContent = message;
        } else { //リソースバンドルが無かった
          if ( node.textContent == "" ) { //元の文字も無ければ
            node.textContent = key.replace(/_/g, " ");
          }
        }
        //ツールチップも有れば更新
        var attrs = node.attributes;
        Array.prototype.forEach.call(attrs, function(attr) {
          if (attr.name == "title") {
            var key = attr.value.match(/MSG_(\w+)/)[1];
            var message = chrome.i18n.getMessage(key);
            if (message) { attr.value = message; }
          }
        });
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
    }
  });
  messageUtil = new MessageUtil();
})();
