// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />

class MessageUtil {

  constructor() {
    console.log("--- Start MessageUtil ---")
    MessageUtil.assignMessages();
  }
  public static assignMessages() {
    let elems = document.querySelectorAll('*[class^="MSG_"]');
    Array.prototype.forEach.call(elems, function (node:HTMLElement) {
      let keys = node.className.match(/MSG_(\w+)/);
      let key:string;
      if ( keys !== null && keys.length > 1 ) {
        key = keys[1];
      } else {
        console.error("Unexpected condition that not fund Key MSG_");
        return;
      }
      let message = chrome.i18n.getMessage(key);
      if (message) {
        node.textContent = message;
      } else { //リソースバンドルが無かった
        if ( node.textContent === "" ) { //元の文字も無ければ
          node.textContent = key.replace(/_/g, " ");
        }
      }
      //ツールチップも有れば更新
      let attrs = node.attributes;
      Array.prototype.forEach.call(attrs, function(attr:Attr) { //:Node使えん
        if (attr.name === "title") {
          let keys = attr.value.match(/MSG_(\w+)/);
          if ( keys !== null && keys.length > 1  ) {
            let message = chrome.i18n.getMessage(keys[1]);
            if (message) { attr.value = message; }
          } else {
            //console.log("Attribute is title but not MSG_ key.")
          }
        }
      });
    });
  };

  public static getMessage(args:Array<string>) {//arg:配列
    let ret = "";
    for(let i=0; i<args.length; i++ ) {
      if ( i !== 0 ) { ret = ret + " "; };
      let message = chrome.i18n.getMessage(args[i]);
      if (!message) { message = args[i]; };
      ret = ret + message;
    }
    return ret;
  };

  public static checkRuntimeError(msg:string) {
    if (chrome.runtime.lastError) {
      console.log("####: sendMessage " + msg + ":" ,chrome.runtime.lastError.message);
    }
  }
}
//export = MessageUtil
