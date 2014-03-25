// -*- coding: utf-8-unix -*-
var Background = Class.create({
  initialize: function() {
    this.assignEventHandlers();
  },
  assignEventHandlers: function() {
    //script.jsとの通信
    chrome.extension.onMessage.addListener(function(msg, sender) {
      console.log("--- Backgroupd Recv ACex:" + msg.cmd);
      if(msg.cmd == "setSession") {
        //セッションデータを保存
        localStorage["ACsession"]
          = JSON.stringify({"userID": msg.userID, "sessionA": msg.sessionA});
        //pageActionのicon表示
        chrome.pageAction.show(sender.tab.id);
      }
    });
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
  },
  isCRmode: function() {
    var value = localStorage["Special"];
    if (value) {
      return Boolean(JSON.parse(value)["couresenameRestriction"]);
    } else {
      return false;
    }
  }
});
var bg = new Background();
