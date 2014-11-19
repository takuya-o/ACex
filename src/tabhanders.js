// -*- coding: utf-8-unix -*-
function assignMessageHandlers(kore) {
  chrome.runtime.onMessage.addListener(
    function(msg, sender, sendResponse) {
      console.log("--- Recv ACex:" + msg);
      if(msg == "assignTabHander") {
        assignTabHandlers(kore);//tab.onRemoved()登録
        sendResponse();
      } else {
        console.log("--- Recv ACex: Unknown message.");
        sendResponse();//とりあえず無視
      }
    }.bind(kore));
}
function assignTabHandlers(kore) {
  chrome.tabs.onRemoved.addListener(
    //閉じたときにtabListから削除する
    function(tabId, removeInfo) {
      console.log("--- tab closed:" + tabId);
      kore.bg.removeTabId(tabId);
    }.bind(kore)
  );
  //タブが変更された時判定 新規に開かれたときにも呼ばれる
  chrome.tabs.onUpdated.addListener(
    function(tabId, changeInfo, tab) {
      var url = changeInfo.url;
      if ( url != null ) {
        //urlが変更されたので、新しいURLがリストあるか確認
        url = url.replace(new RegExp(".+/", "g"), "");
        if( kore.bg.getTabId(url) != tabId ) {
          //見あたらないURLなので、変更されたらしいからTabListから外す
          kore.bg.removeTabId(tabId);
        }
      }
    }.bind(kore)
  );
}
