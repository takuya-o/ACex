// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* global Class, chrome */

class TabHandler {
  private static assignTabHandlers() {
    console.log("assignTabHandlers()")
    chrome.tabs.onRemoved.addListener( (tabId:number, _removeInfo:chrome.tabs.TabRemoveInfo) => {
        //閉じたときにtabListから削除する
        //TODO: 自分が閉じられるときには間に合わない = 代表ハンドラーが無くなると残りもみんな削除されなくなってしまう。Workaound:二回ボタンを押す
        console.log("--- tab closed:" + tabId);
        chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.REMOVE_TAB_ID, tabId}, ()=>{
          MessageUtil.checkRuntimeError("REMOVE_TAB_ID")
        })
      }
    )
    //タブが変更された時判定 新規に開かれたときにも呼ばれる
    chrome.tabs.onUpdated.addListener( (tabId:number, changeInfo:chrome.tabs.TabChangeInfo, _tab:chrome.tabs.Tab) => {
        let url = changeInfo.url;
        if ( url ) {
          //urlが変更されたので、新しいURLがリストあるか確認
          url = url.replace(new RegExp(".+/", "g"), "");
          chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.GET_TAB_ID, url} ,(urlTabId:TabId)=> {
            if( urlTabId !== tabId ) {
              //見あたらないURLなので、変更されたらしいからTabListから外す
              chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.REMOVE_TAB_ID, tabId}, ()=>{
                MessageUtil.checkRuntimeError("REMOVE_TAB_ID")
              })
            }
          })
        }
      }
    )
  }
  public static assignMessageHandlers() {
    chrome.runtime.onMessage.addListener( (msg:string, _sender:chrome.runtime.MessageSender, sendResponse:(res?:any)=>void) =>{
      console.log("--- Recv TabHandler:", msg);
      if(msg === "assignTabHandler") {
        TabHandler.assignTabHandlers();//tab.onRemoved()登録
        sendResponse();
      } else {
        console.log("--- Recv TabHandler: Unknown message.")
        // ループしちゃう
        // if ( typeof msg === "object" ) {
        //   const backgroudMessage = msg as BackgroundMsg
        //   if ( typeof ( backgroudMessage?.cmd) === "string" ) {
        //     //Background行きのメッセージを受けちゃったらしい
        //     console.log("--- Recv TabHandler: Resend to background")
        //     chrome.runtime.sendMessage( backgroudMessage, (response:BackgroundResponse)=>{
        //       if (chrome.runtime.lastError) {
        //         console.error("--- Recv TabHandler: resend error:", chrome.runtime.lastError)
        //       }
        //       sendResponse(response)
        //     })
        //     return true //非同期
        //   }
        // }
      }
      return false //同期
    })
    console.log("assignMessageHandlers() ")
  }
}
//export = TabHandler
