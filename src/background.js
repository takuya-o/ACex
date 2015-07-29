// -*- coding: utf-8-unix -*-
var Background = Class.create({
  tabList: new Object(),  //Tab管理用連想記憶配列 {}
  initialize: function() {
    this.initializeClassValue();
    this.assignEventHandlers();
    //再起動したときに呼ばれる 再起動時のみライセンスチェック
    if ( this.getLicenseValidDate() &&
         this.getLicenseValidDate() > Date.now() ) {
      //期限来ていない UNKNOWNでもNONEでも
      console.log("ACex: License is Valid.");
    }else{
      //FULLでもFREE_TRIALでも期限来てたら許可取り直し
      console.log("ACex: License is not Valid.");
      this.setupAuth(true);
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
        } else if (msg.cmd == "isDisplayTelop" ) {
          sendResponse({isDisplayTelop: this.isDisplayTelop()});
        } else if (msg.cmd == "open" ) {
          this.openTab(msg.url);
        } else if (msg.cmd == "log" ) {
          console.log("--- Backgroupd Recv ACex:" + msg.message);
        } else {
          console.log("------ Backgroupd Recv ACex: Unknown message.");
        }
      }.bind(this)
    );
    //storage.syncの変更検知
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if( namespace == "sync" ){
        var storageChange = changes["License"];
        if ( storageChange ) {
          var license = storageChange.newValue;
          console.log("ACex: storage change" + JSON.stringify(license));
          if ( license ) {
            if (license.status) {
              this.license.status = license.status;
            } else {
              this.license.status = "UNKOWN";
            }
            if (license.validDate) {
              this.license.validDate = new Date(license.validDate);
            } else {
              this.license.validDate = new Date();
            }
            if (license.createDate) {
              this.license.createDate = new Date(license.createDate);
            } else {
              if (this.license.createDate) delete this.license[createDate];
            }
            console.log("ACex: storage changed"+JSON.stringify(this.license));
            // console.log('Storage key "%s" in namespace "%s" changed. ' +
            //             'Old value was "%s", new value is "%s".',
            //             "License", namespace,
            //             storageChange.oldValue, storageChange.newValue);
          }
        }
      }
    }.bind(this));
  },
  // タブへonRemoveハンドラー設定指示メッセージ送信
  sendMessageAssignTabHandler: function(tabId, retry) {
    if ( this.handlerTab == null ) { //eventHandler登録が必要
      console.log("--- assignTabHandlers() " + tabId);
      chrome.tabs.sendMessage(tabId, "assignTabHandler", function(response) {
          if (chrome.runtime.lastError) {
            console.log("####: sendMessage:",chrome.runtime.lastError.message);
            if (retry) {//送信が早すぎるとタブが受信準備出来ていないのでリトライ
              console.log("----: sendMessage: Retry.");
              setTimeout(function() {
                this.sendMessageAssignTabHandler(tabId, false);
              }.bind(this), 200);
            } else {
              console.log("####: sendMessage: Retry Fail.");
            }
          }else{ //送信成功
            this.handlerTab = tabId;
          }
      }.bind(this));
    }
  },
  /* フォーラムを開いているタブのIDを記憶
     fid:   forum ID
     tabId: chromeのタブID
  */
  addTabId: function(fid, tabId) {
    console.log("--- addTabId:" + fid + " = " + tabId);
    try {
      this.tabList[fid] = tabId;
      if ( this.handlerTab == null ) { //eventHandler登録が必要
        this.sendMessageAssignTabHandler(tabId, true);
      }
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
            if ( this.handlerTab == tabId ) {
              //ハンドラー登録していたタブが閉じられた
              console.log("--- removeTabId: remove tabHandler.");
              this.handlerTab = null;
            }
          }
        }
      } catch (e) {
        console.log("#-- removeTabId():" + e.name + " " + e.message);
      }
      if ( !doneFlg ) {
        console.log("#-- removeTabId() not found:" + tabId);
      } else {
        if ( this.handlerTab == null ) {
          //タブハンドラーが空席状態なので最初に見つかったタブに登録
          for(var element in this.tabList) {
            this.sendMessageAssignTabHandler(this.tabList[element], true);
            break;
          }
        }
      }
    }
  },
  openTab: function(url) { //courselist.jsからcopy共通化が必要
    //該当のURLをタブで開く。既に開いていたらそれを使う
    var tabId = this.getTabId(url);
    if ( tabId == null ) { //nullとの==比較でundefined見つけてる
      //開いているタブが無かったので作る
      chrome.tabs.create( //タブを開く 引数省略すると「新しいタブ」
        { url: url },
        function(tab) {
          //tabが閉じられるまでキャッシュとして利用する
          console.log("--- opened tab:" + tab.id);
          this.addTabId(url, tab.id);
        }.bind(this)
      );
    } else {
      //forumを開いているタブを開く
      chrome.tabs.update(tabId,{highlighted:true});
    }
  },
  localStorageMigration: function() {
    //マイグレーション
    //V0.0.0.3以前(11bf542b)であまりに古いので消すだけ
    localStorage.removeItem("Oyo");
    localStorage.removeItem("userID");
    localStorage.removeItem("sessionA");
    //現用 "ACsession" "Special"
  },
  //インスタンス変数
  license: {status: "UNKNOWN", //FREE_TRIAL,FREE_TRIAL_EXPIRED, FULL, NONE
            validDate: new Date()
            //不明時はメモリも確保しないcreateDate: null//store.syncだと{}になる
           },
  handlerTab: null,
  userID: "up=",
  sessionA: "a=",
  coursenameRestrictionEnable: false,
  experimentalEnable: false,
  displayPopupMenu: false,
  popupWaitForMac: 500,
  displayTelop: false,
  useLicenseInfo: false,
  trialPriodDays: 30,
  //キャッシュ
  forums: null,

  //インスタンス変数管理
  initializeClassValue: function() {
    this.localStorageMigration();
    var value = localStorage["ACsession"];
    if (value) {
      var acSession = JSON.parse(value);
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
      var useLicenseInfo = special["useLicenseInfo"];
      if (useLicenseInfo) { this.useLicenseInfo = Boolean(useLicenseInfo); }
      var trialPriodDays = special["trialPriodDays"];
      if (trialPriodDays) { this.trialPriodDays = trialPriodDays; }
    }
    value = localStorage["Forums"];
    if (value) {
      this.forums = JSON.parse(value);
    } else {
      this.forums = {};
    }
    //ライセンス情報
    chrome.storage.sync.get("License", function(items){
      if (chrome.runtime.lastError) {
        console.log("####: storage.sync.get() ERR:",chrome.runtime.lastError);
        return;
      }
      if (items) {
        var license = items.License;
        if (license ){
          var licenseStatus = license.status;
          if ( licenseStatus ) {
            this.license.status = licenseStatus;
          }
          var licenseValidDate = license.validDate;
          if ( licenseValidDate ) {
            this.license.validDate = new Date(licenseValidDate);
          }
          var licenseCreateDate = license.createDate;
          if ( licenseCreateDate ) {
            this.license.createDate = new Date(licenseCreateDate);
          }else{
            if (this.license.createDate) delete this.license[createDate];
          }
        }
      }
    }.bind(this) );
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
                       displayTelop, useLicenseInfo, trialPriodDays) {
    this.coursenameRestrictionEnable = Boolean(coursenameRestriction);
    this.experimentalEnable = Boolean(experimental);
    this.displayPopupMenu = displayPopupMenu;
    this.popupWaitForMac = popupWaitForMac;
    this.displayTelop = displayTelop;
    this.useLicenseInfo = useLicenseInfo;
    this.trialPriodDays = trialPriodDays;
    localStorage["Special"]
      = JSON.stringify({"couresenameRestriction":coursenameRestriction,
                        "experimental": experimental,
                        "displayPopupMenu": displayPopupMenu,
                        "popupWaitForMac": popupWaitForMac,
                        "displayTelop": displayTelop,
                        "useLicenseInfo": useLicenseInfo,
                        "trialPriodDays": trialPriodDays });
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
  },
  isUseLicenseInfo: function() {
    return this.useLicenseInfo;
  },
  getTrialPriodDays: function() {
    return this.trialPriodDays;
  },
  getCacheFormatVer: function () {
    return 1;
  },
  setCache: function (forum) {
    forum.cacheFormatVer = this.getCacheFormatVer();
    this.forums[forum.fid] = forum;
    localStorage["Forums"] = JSON.stringify(this.forums);
  },
  getCache: function (fid) {
    var forum = this.forums[fid];
    if ( forum && ( !forum.cacheFormatVer || (forum.cacheFormatVer < this.getCacheFormatVer())) ) {
      forum = null;
    }
    return forum;
  },
  setLicense: function(status, validDate, createDate) {
    var key = "UNKNOWN";
    for (key in ["FREE_TRIAL","FREE_TRIAL_EXPIRED","FULL","NONE","UNKNOWN"]){
      if ( status == key ) break; //サニタイズ
    }
    if ( key != "UNKNOWN" ) {
      this.license = {}; //chrome.storage.sync.remove("License");
      this.license.status = status;  //String
      this.license.validDate = validDate;  //Date
      var storeLicense = {};
      if ( createDate ) {//Date or null
        this.license.createDate = createDate;
        storeLicense = {status: this.license.status,
                        validDate: this.license.validDate.getTime(),
                        createDate: this.license.createDate.getTime()};
      } else {
        if (this.license.createDate) delete this.license[createDate];
        storeLicense = {status: this.license.status,
                        validDate: this.license.validDate.getTime() };
      }
      console.log("ACex: storage.sync.set(",this.license, ")");
      chrome.storage.sync.set( //Date型は保存できないみたいなので数値で保管
        {License: storeLicense }, function() {
          if (chrome.runtime.lastError) {
            console.log("####: storage.sync.set() ERR:",
                        chrome.runtime.lastError);
          }
        });
    }
  },
  getLicenseStatus: function() {
    return this.license.status;
  },
  getLicenseValidDate: function() {
    return this.license.validDate;
  },
  getLicenseCreateDate: function() {
    if (this.license.createDate ) {
      return this.license.createDate;
    } else {
      return undefined;
    }
  },
  getLicenseExpireDate: function() {
    if ( this.license.createDate &&
         Object.prototype.toString.call(this.license.createDate).slice(8, -1)
         =="Date" ) { //Date型だったら
           return new Date(this.license.createDate.getTime() +
                           this.trialPriodDays*24*60*60*1000);
         } else {
           return undefined;
         }
  },
  //ライセンス管理
  setupAuth: function(interactive) {
    var CWS_LICENSE_API_URL = 'https://www.googleapis.com/chromewebstore/v1.1/userlicenses/';
    if ( this.isUseLicenseInfo() ) {
      //まだ実験的機能
      getLicense();
    }else{
      console.log("ACex: not getLicense(), becouse disable license check.");
    }
    /*************************************************************************
     * Call to license server to request the license
     *************************************************************************/
    function getLicense() {
      xhrWithAuth('GET', CWS_LICENSE_API_URL + chrome.runtime.id, true,
                  onLicenseFetched);
    }
    function onLicenseFetched(error, status, response) {
      console.log(error, status, response);
      //ユーザが承認しないとerror.message="The user did not approve access."
      //statusDiv.text("Parsing license...");
      response = JSON.parse(response);
      //$("#license_info").text(JSON.stringify(response, null, 2));
      //console.log("ACex: Parsing license " + JSON.stringify(response, null, 2));
      if (status === 200) {
        parseLicense(response);
      } else {
        //$("#dateCreated").text("N/A");
        //$("#licenseState").addClass("alert-danger");
        //$("#licenseStatus").text("Error");
        //statusDiv.html("Error reading license server.");
      }
    }
    /**************************************************************************
     * Parse the license and determine if the user should get a free trial
     *  - if license.accessLevel == "FULL", they've paid for the app
     *  - if license.accessLevel == "FREE_TRIAL" they haven't paid
     *    - If they've used the app for less than TRIAL_PERIOD_DAYS days, free trial
     *    - Otherwise, the free trial has expired 
     *    @param {{result: boolean, accessLevel: string, createTinme: number,
     *     maxAgeSecs: number }} license Chromeウェブストアのライセンス情報
     **************************************************************************/
    function parseLicense(license) {
      console.log("ACex: Full License=" + license.result);
      var licenseStatus;
      var licenseStatusText;
      if (license.result && license.accessLevel == "FULL") {
        console.log("Fully paid & properly licensed.");
        licenseStatusText = "FULL";
        licenseStatus = "alert-success";
      } else if (license.result && license.accessLevel == "FREE_TRIAL") {
        var daysAgoLicenseIssued = Date.now()-parseInt(license.createdTime,10);
        daysAgoLicenseIssued = daysAgoLicenseIssued / 1000 / 60 / 60 / 24;
        if (daysAgoLicenseIssued <= bg.trialPriodDays) {
          console.log("Free trial, still within trial period");
          licenseStatusText = "FREE_TRIAL";
          licenseStatus = "alert-info";
        } else {
          console.log("Free trial, trial period expired.");
          licenseStatusText = "FREE_TRIAL_EXPIRED";
          licenseStatus = "alert-warning";
        }
      } else {
        console.log("No license ever issued.");
        licenseStatusText = "NONE";
        licenseStatus = "alert-danger";
      }
      //$("#dateCreated").text(moment(parseInt(license.createdTime, 10)).format("llll"));
      //$("#licenseState").addClass(licenseStatus);
      //$("#licenseStatus").text(licenseStatusText);
      //statusDiv.html("&nbsp;");
      var validDate = new Date(Date.now() +
                               parseInt(license.maxAgeSecs, 10)*1000 );
      console.log("ACex: Valid Date=" + validDate );
      if ( license.result ) {
        console.log("ACex: Access Level=" + license.accessLevel);
        console.log("ACex: Create=" +
                    new Date(parseInt(license.createdTime, 10)));
        var createDate = new Date(parseInt(license.createdTime, 10) );
        bg.setLicense(licenseStatusText, validDate, createDate);
      } else {
        bg.setLicense("NONE", validDate, null);
      }
    }
    /**************************************************************************
     * Helper method for making authenticated requests
     * @param {string} method
     * @param {string} url
     * @param {boolean} interactive
     * @param {function(?string, number, strting)} callback
     **************************************************************************/
    // Helper Util for making authenticated XHRs
    function xhrWithAuth(method, url, interactive, callback) {
      var retry = true;
      getToken();
      function getToken() {
        //statusDiv.text("Getting auth token...");
        console.log("Calling chrome.identity.getAuthToken", interactive);
        chrome.identity.getAuthToken(
          { interactive: interactive }, function(token) {
            if (chrome.runtime.lastError) {
              callback(chrome.runtime.lastError);
              return;
            }
            console.log("chrome.identity.getAuthToken returned a token", token);
            access_token = token;
            requestStart();
          });
      }
      function requestStart() {
        //statusDiv.text("Starting authenticated XHR...");
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
        xhr.onload = requestComplete;
        xhr.send();
      }
      function requestComplete() {
        //statusDiv.text("Authenticated XHR completed.");
        if (this.status == 401 && retry) {
          retry = false;
          chrome.identity.removeCachedAuthToken({ token: access_token },
                                                getToken);
        } else {
          callback(null, this.status, this.response);
        }
      }
    }
  }
});
var bg = new Background();
