// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* global Class, chrome, messageUtil */

// import MessageUtil = require("./MessageUtil")

class Popup {
  constructor() {
    window.addEventListener("load", (_evt:Event) => {
      chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.GET_CONFIGURATIONS}, (config:Configurations) => {
        //通常モード
        let wait = 100; //Linuxでも0msで実行すると間に合わなくなった
        if(navigator.userAgent.indexOf('Mac') !== -1){
          //0.5秒後に移動Mac対策
          wait = config.popupWaitForMac
        }
        document.getElementById('content')!.style.display="none"
        setTimeout(function(this:Popup) {
          this.preview("count", wait) //閉じるまでの時間もPopupするまでのWait時間と同じ
        }.bind(this), wait);
      })
    })
  }
  private preview(cmd:string, wait:number = 100) {
    chrome.tabs.query({ currentWindow:true, active:true }, tabs => {
      for (const tab of tabs ) { //1つしか無いけど
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {cmd:"getUrl"}, openedUrl => { //tab.urlで取るにはTab Permissionが必要なのでMessageで取得
            MessageUtil.checkRuntimeError("getUrl()")
            console.log("getUrl()", openedUrl)
            let url = "";
            if ( cmd==="count" && openedUrl?.match(/^https?:\/\/[^.\/]+\.aircamp\.us\/course\//) ) {
              //HTML5版でコース画面
              const regexp = /^https?:\/\/[^.\/]+\.aircamp\.us\/course\/\d+(|[\/\?].*)#forum\/(\d+)/;
              const match = openedUrl.match(regexp);
              if ( match ) {
                url =  "countresult.html" + "?fid=" + encodeURI(match[2]!) //正規表現が正しければ必ずある
              }
            }
            if ( url === "" ) {
              url = "courselist.html" + "?cmd=" + encodeURI(cmd);
            }
            chrome.runtime.sendMessage({cmd: BackgroundMsgCmd.OPEN, url}, (_response) => {
              MessageUtil.checkRuntimeError(BackgroundMsgCmd.OPEN) //bgへのメッセージ送信失敗でtab開けず
            })
            setTimeout( ()=>{
              window.close();  // popupを閉じる処理 MacOSで重要
            }, wait)
          })
        } else {
          console.error("Faital Error tab.id", tab.id)
        }
      }
    })
  }
}
let popup = new Popup();
