// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* global Class, chrome */

class TabHandler {
  private static assignTabHandlers(kore:any) {
    chrome.tabs.onRemoved.addListener( function(tabId:number, _removeInfo:chrome.tabs.TabRemoveInfo){
        //閉じたときにtabListから削除する
        console.log("--- tab closed:" + tabId);
        kore["bg"].removeTabId(tabId);
      }.bind(kore)
    )
    //タブが変更された時判定 新規に開かれたときにも呼ばれる
    chrome.tabs.onUpdated.addListener( function(tabId:number, changeInfo:chrome.tabs.TabChangeInfo, _tab:chrome.tabs.Tab){
        let url = changeInfo.url;
        if ( url ) {
          //urlが変更されたので、新しいURLがリストあるか確認
          url = url.replace(new RegExp(".+/", "g"), "");
          if( kore["bg"].getTabId(url) != tabId ) {
            //見あたらないURLなので、変更されたらしいからTabListから外す
            kore["bg"].removeTabId(tabId);
          }
        }
      }.bind(kore)
    )
  }
  public static assignMessageHandlers(kore:any) {
    chrome.runtime.onMessage.addListener( function(msg:string, _sender:chrome.runtime.MessageSender, sendResponse:(res?:any)=>void){
      console.log("--- Recv ACex:" + msg);
      if(msg === "assignTabHandler") {
        TabHandler.assignTabHandlers(kore);//tab.onRemoved()登録
        sendResponse();
      } else {
        console.log("--- Recv ACex: Unknown message.");
        sendResponse();//とりあえず無視
      }
    }.bind(kore));
  }
}
//export = TabHandler
