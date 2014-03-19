// -*- coding: utf-8-unix -*-
var Background = Class.create({
  initialize: function() {
    this.assignEventHandlers();
  },
  assignEventHandlers: function() {
    //定期起動 ならchrome.alarmsを使う

    //script.jsとの通信
    chrome.extension.onConnect.addListener(function(port) {
      console.assert(port.name == "ACex");
      port.onMessage.addListener(function(msg) {
	console.log("--- Backgroupd Recv ACex:" + msg.cmd);
	if(msg.cmd == "getBG"){
	  //使ってない
	  port.postMessage({cmd: "retBG",bg: this.bg});
	}else if(msg.cmd == "setSession") {
	  //呼べないthis.setUserID(msg.userID);
	  //this.setSessionA(msg.sessionA);
	  localStorage["userID"] = msg.userID;
	  localStorage["sessionA"] = msg.sessionA;
	  port.postMessage({cmd: "OK"});
	}else if(msg.cmd == "showIcon") {
          //うまくPageActionのIconが表示できない
	  //chrome.declarativeContent.ShowPageAction();
	  //chrome.pageAction.show(lastTabId);
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
  getServerUrl: function() {
    return "http://backend.server.name/";
  },
  loadOyo: function(callbacks) {
    var url = this.getServerUrl() + "ajax/get_Oyo";
    new Ajax.Request(url, {
      method: "get",
      onSuccess: function(req) {
	//呼出し成功したら引数callbacksクラスのonSucess(req)を呼ぶ
	callbacks.onSuccess(req);
      }.bind(this)
    });
  },
  getOyoConfig: function() {
    var value = localStorage["Oyo"];
    if (value) {
      return value;
    } else {
      return "初期値";
    }
  },
  setOyoConfig: function(value) {
    localStorage["Oyo"] = value;
  },
  getUserID: function() {
    var value = localStorage["userID"];
    if (value) {
      return value;
    } else {
      return "u=";
    }
  },
  getSessionA: function() {
    var value = localStorage["sessionA"];
    if (value) {
      return value;
    } else {
      return "a=";
    }
  },
});
var bg = new Background();
var lastTabId = 0;
var tab_clicks = {};
