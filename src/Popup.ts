// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* global Class, chrome, messageUtil */

// import MessageUtil = require("./MessageUtil")

class Popup {
  private bg:Background = null;
  constructor() {
    window.addEventListener("load", (_evt:Event) => {
      chrome.runtime.getBackgroundPage( (backgroundPage) => {
        this.bg = backgroundPage["bg"];
        this.start() //bg揃ってから起動
      })
    })
  }
  private start() {
    if (this.bg.isDisplayPopupMenu()) {
      MessageUtil.assignMessages();  //表示をするときのみI18N文字列置き換え
      this.assignEventHandlers();
    } else {
      //通常モード
      let wait = 0;
      if(navigator.userAgent.indexOf('Mac') != -1){
        //0.5秒後に移動Mac対策
        wait = this.bg.getPopupWaitForMac();
      }
      document.getElementById('content').style.display="none"
      setTimeout(function() {
        this.preview("count");
      }.bind(this), wait);
    }
  }
  private assignEventHandlers() {
    //$("***").onclick = this.onClick***.bind(this);
    let elems = document.getElementsByTagName('a');
    Array.prototype.forEach.call(elems, (node:HTMLAnchorElement) => {
      if (node.className.match(/MSG_(\w+)/).length > 0) {
        node.onclick = this.onClickURL.bind(this);
      }
    })
  }
  private onClickURL(evt:MouseEvent) {
    let cmd = (<HTMLElement>evt.target).id;
    this.preview(cmd);
  }
  private preview(cmd:string) {
    let url = "";
    let openedUrl = this.bg.getOpenedUrl();
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
      if (chrome.runtime.lastError) {
        //bgへのメッセージ送信失敗でtab開けず
        console.log("####: sendMessage open:",chrome.runtime.lastError.message);
      }
    })
    window.close();  // popupを閉じる処理 MacOSで重要
  }
}
let popup = new Popup();
