// -*- coding: utf-8-unix -*-
var Background = Class.create({
  tabList: new Object(),  //連想記憶配列 {}
  //インスタンス変数
  userID: "u=",
  sessionA: "a=",
  coursenameRestrictionEnable: false,
  experimentalEnable: false,
  displayPopupMenu: false,
  popupWaitForMac: 500,
  displayTelop: false,

  initialize: function() {
    this.initializeClassValue();
    this.assignEventHandlers();
  },
  initializeClassValue: function() {
    var value = localStorage["ACsession"];
    if (value) {
      var acSession = JSON.parse(value)
      this.userID = acSession["userID"];
      this.sessionA = acSession["sessionA"];
    }
    value = localStorage["Special"];
    if (value) {
      var special = JSON.parse(value);
      this.coursenameRestrictionEnable = Boolean(special["couresenameRestriction"]);
      this.experimentalEnable = Boolean(special["experimental"]);
      var displayPopupMenu = special["displayPopupMenu"];
      if (displayPopupMenu) { this.displayPopupMenu = Boolean(displayPopupMenu); }
      var popupWaitForMac = special["popupWaitForMac"];
      if (popupWaitForMac) { this.popupWaitForMac = popupWaitForMac; }
      var displayTelop = special["displayTelop"];
      if (displayTelop) { this.displayTelop = Boolean(displayTelop); }
    }
  },
  assignEventHandlers: function() {
    //script.jsとの通信
    chrome.runtime.onMessage.addListener(
      function(msg, sender, sendResponse) {
        console.log("--- Backgroupd Recv ACex:" + msg.cmd);
        if(msg.cmd == "setSession") {
          //セッションデータを保存
          this.setACsession(msg.userID, msg.sessionA);
          //pageActionのicon表示
          chrome.pageAction.show(sender.tab.id);
          sendResponse();
        }else if (msg.cmd == "isDisplayTelop" ) {
          sendResponse({isDisplayTelop: this.isDisplayTelop()});
        }
      }.bind(this)
    );
    //タブがクローズされた時判定 TODO:すべてのタブで効いてしまうけど…
    chrome.tabs.onRemoved.addListener(
      //閉じたときにtabListから削除する
      function(tabId, removeInfo) {
        console.log("--- tab closed:" + tabId);
        this.removeTabId(tabId);
      }.bind(this)
    );
    //タブが変更された時判定
    chrome.tabs.onUpdated.addListener(
      function(tabId, changeInfo, tab) {
        var url = changeInfo.url;
        if ( url != null ) {
          //urlが変更されたので、新しいURLがリストあるか確認
          url = url.replace(new RegExp(".+/", "g"), "");
          if( this.getTabId(url) != tabId ) {
            //見あたらないURLなので、変更されたらしいからTabListから外す
            this.removeTabId(tabId);
          }
        }
      }.bind(this)
    );

  },
  /* フォーラムを開いているタブのIDを記憶
     fid:   forum ID
     tabId: chromeのタブID
  */
  addTabId: function(fid, tabId) {
    console.log("--- addTabId:" + fid + " = " + tabId);
    try {
      this.tabList[fid] = tabId;
    } catch (e) {
      console.log("#-- addTabId()" + e.name + " " + e.message);
    }
  },
  /* フォーラムを開いているタブIDを取得
     fid: forum ID
  */
  getTabId: function(fid) {
    console.log("--- getTabId(" + fid + ")");
    try {
      var tabId =this.tabList[fid];
      if ( tabId != null ) {
        //普段はEventListenerで消されるので問題ないが
        //念の為に存在確認して既に無ければ削除
        //その場合、非同期なので一回目はゴミが返る
        chrome.tabs.get(tabId, function(tab) {
          if (tab == null ) {
            console.log("#-- tab was closed." + tabId);
            this.removeTabId(tabId); //遅いがとりあえず次のために削除
          }
        }.bind(this) );
      }
    } catch (e) {
      console.log("#-- getTabId()" + e.name + " " + e.message);
    }
    return tabId;
  },
  /* タブが閉じられたのでリストから削除 */
  removeTabId: function(tabId) {
    console.log("--- removeTabId()");
    if (tabId == null ) {
      console.log("#-- removeTabId() argument is null");
    } else {
      var doneFlg = false;
      try {
        for(var element in this.tabList) {
          //console.log("--- removeTabId:" + element);
          if ( this.tabList[element] == tabId ) {
            console.log("--- removeTabId:" + tabId);
            delete this.tabList[element];
            doneFlg = true;
          }
        }
      } catch (e) {
        console.log("#-- removeTabId():" + e.name + " " + e.message);
      }
      if ( !doneFlg ) {
        console.log("#-- removeTabId() not found:" + tabId);
      }
    }
  },
  setACsession: function(userID, sessionA) {
    this.userID = userID;
    this.sessionA = sessionA;
    localStorage["ACsession"]
      = JSON.stringify({"userID": userID, "sessionA": sessionA});
  },
  getUserID: function() {
    return this.userID;
  },
  getSessionA: function() {
    return this.sessionA;
  },
  setSpecial: function(experimental, coursenameRestriction,
                       displayPopupMenu, popupWaitForMac,
                       displayTelop ) {
    this.coursenameRestrictionEnable = Boolean(coursenameRestriction);
    this.experimentalEnable = Boolean(experimental);
    this.displayPopupMenu = displayPopupMenu;
    this.popupWaitForMac = popupWaitForMac;
    this.displayTelop = displayTelop;
    localStorage["Special"]
      = JSON.stringify({"couresenameRestriction":coursenameRestriction,
                        "experimental": experimental,
                        "displayPopupMenu": displayPopupMenu,
                        "popupWaitForMac": popupWaitForMac,
                        "displayTelop": displayTelop });
  },
  isCRmode: function() {
    return this.coursenameRestrictionEnable;
  },
  isExperimentalEnable: function() {
    return this.experimentalEnable;
  },
  isDisplayPopupMenu: function() {
    return this.displayPopupMenu;
  },
  getPopupWaitForMac: function() {
    return this.popupWaitForMac;
  },
  isDisplayTelop: function() {
    return this.displayTelop;
  }
});
var bg = new Background();
