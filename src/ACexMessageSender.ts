// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />

class ACexMessageSender {
  public static send(msg:BackgroundMsg, sendResponse:(ret?:BackgroundResponse)=>void) {
    chrome.runtime.sendMessage( msg, (response:BackgroundResponse) => {
      if ( sendResponse ) {
        sendResponse(response)
      }
    })
  }
}
