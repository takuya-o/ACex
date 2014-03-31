// -*- coding: utf-8-unix -*-
var Background = Class.create({
  tabList: new Array(),
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
  /* フォーラムを開いているタブのIDを記憶
     fid:   forum ID
     tabId: chromeのタブID
  */
  addTabId: function(fid, tabId) {
    console.log("--- addTabId:" + fid + " = " + tabId);
    this.tabList[fid] = tabId;
  },
  /* フォーラムを開いているタブIDを取得
     fid: forum ID
  */
  getTabId: function(fid) {
    var tabId =this.tabList[fid];
    if ( tabId != null ) {
      //存在確認 TODO: 非同期なので一回目はゴミが返る
      chrome.tabs.get(tabId, function(tab) {
        if (tab == null ) {
          console.log("#-- tab was closed." + tabId);
          this.removeTabId(tabId); //遅いがとりあえず次のために削除
        }
      }.bind(this) );
    }
    return tabId;
  },
  /* タブが閉じられたのでリストから削除 */
  removeTabId: function(tabId) {
    //console.log("--- removeTabId()");
    if (tabId == null ) {
      console.log("#-- removeTabId() argument is null");
    } else {
      var doneFlg = false;
      try {
        this.tabList = this.tabList.filter( function(element, index, tabList) {
          if ( element == tabId ) {
            console.log("--- removeTabId:" + tabId);
            doneFlg = true;
          }
          return (element != tabId);
        }, this);
      } catch (e) {
        console.log("#-- removeTabId():" + e.name + " " + e.message);
      }
      if ( !doneFlg ) {
          console.log("#-- removeTabId() not found:" + tabId);
      }
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
