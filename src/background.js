// -*- coding: utf-8-unix -*-
var Background = Class.create({
  initialize: function() {
    this.assignEventHandlers();
  },
  assignEventHandlers: function() {
    //script.jsとの通信
    chrome.extension.onConnect.addListener(function(port) {
      console.assert(port.name == "ACex");
      port.onMessage.addListener(function(msg) {
        console.log("--- Backgroupd Recv ACex:" + msg.cmd);
        if(msg.cmd == "setSession") {
          //セッションデータを保存
          localStorage["ACsession"]
            = JSON.stringify({"userID": msg.userID, "sessionA": msg.sessionA});
          port.postMessage({cmd: "OK"});
        }
      });
    });
    //PageActionのIconを表示するためにtabの切り替えを監視
    chrome.tabs.onUpdated.addListener(this.checkForValidUrl);
  },
  // Called when the url of a tab changes.
  checkForValidUrl: function(tabId, changeInfo, tab) {
    console.log("checkForValidUrl");
    if (tab.url.indexOf("https://www.bbt757.com/ac/web/") > -1) {
      // ... show the page action.
      chrome.pageAction.show(tabId);
    }
  },
  getUserID: function() {
    var value = localStorage["ACsession"];
    if (value) {
      return JSON.parse(value)["userID"];
    } else {
      return "u=";
    }
  },
  getSessionA: function() {
    var value = localStorage["ACsession"];
    if (value) {
      return JSON.parse(value)["sessionA"];
    } else {
      return "a=";
    }
  }
});
var bg = new Background();
