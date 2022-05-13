// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />

class ACexMessageSender {
  public static send(msg: BackgroundMsg, sendResponse: (ret?: BackgroundResponse)=>void) {
    chrome.runtime.sendMessage( msg, (response: BackgroundResponse) => {
      if (chrome.runtime.lastError) {
        console.error("--- Error ACexMessageSender:", chrome.runtime.lastError)
      }
      if ( sendResponse ) {
        sendResponse(response)
      }
      return false //同期
    })
  }
  public static openTab(url:string) {
    chrome.runtime.sendMessage(
      {cmd: BackgroundMsgCmd.OPEN, url}, (_response)=>{
        MessageUtil.checkRuntimeError(BackgroundMsgCmd.OPEN) //bgへのメッセージ送信失敗でtab開けず
    });
  }
}
