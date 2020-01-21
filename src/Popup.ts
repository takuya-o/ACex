// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* global Class, chrome, messageUtil */

// import MessageUtil = require("./MessageUtil")

class Popup {
  constructor() {
    window.addEventListener("load", (_evt:Event) => {
      chrome.runtime.sendMessage({cmd: "getConfigurations"}, (config:Configurations) => {
        //通常モード
        let wait = 0;
        if(navigator.userAgent.indexOf('Mac') != -1){
          //0.5秒後に移動Mac対策
          wait = config.popupWaitForMac
        }
        document.getElementById('content').style.display="none"
        setTimeout(function() {
          this.preview("count");
        }.bind(this), wait);
      })
    })
  }
  private preview(cmd:string) {
    chrome.runtime.sendMessage({cmd: "getOpenedUrl"}, (ret:BackgroundResponseName) => {
      let url = "";
      let openedUrl = ret.name
      if ( cmd==="count" && openedUrl.match(/^https?:\/\/[^.\/]+\.aircamp\.us\/course\//) ) {
        //HTML5版でコース画面
        let regexp = /^https?:\/\/[^.\/]+\.aircamp\.us\/course\/\d+(|[\/\?].*)#forum\/(\d+)/;
        let match = openedUrl.match(regexp);
        if ( match ) {
          url =  "countresult.html" + "?fid=" + encodeURI(match[2]);
        }
      }
      if ( url === "" ) {
        url = "courselist.html" + "?cmd=" + encodeURI(cmd);
      }
      chrome.runtime.sendMessage({cmd: "open", url: url}, (_response) => {
        MessageUtil.checkRuntimeError("open") //bgへのメッセージ送信失敗でtab開けず
      })
      window.close();  // popupを閉じる処理 MacOSで重要
    })
  }
}
let popup = new Popup();
