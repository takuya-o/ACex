// -*- coding: utf-8-unix -*-
var Background = Class.create({
  tabList: new Object(),  //連想記憶配列 {}
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
  setSpecial: function(experimental, coursenameRestriction) {
    localStorage["Special"]
      = JSON.stringify({"couresenameRestriction":coursenameRestriction,
                        "experimental": experimental });
  },
  isCRmode: function() {
    var value = localStorage["Special"];
    if (value) {
      return Boolean(JSON.parse(value)["couresenameRestriction"]);
    } else {
      return false;
    }
  },
  isExperimentalEnable: function() {
    var value = localStorage["Special"];
    if (value) {
      return Boolean(JSON.parse(value)["experimental"]);
    } else {
      return false;
    }
  }
});
var bg = new Background();
