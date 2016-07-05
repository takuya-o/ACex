// -*- coding: utf-8-unix -*-
/* global Class, chrome, e */
var Background = Class.create({
  //定数
  ASSIGN_TAB_HANDLER_MAX_RETRY:   10, //回
  ASSIGN_TAB_HANDLER_RETRY_WAIT: 200, //msまつ
  //クラス変数
  tabList: new Object(),  //Tab管理用連想記憶配列 {}
  openedUrl: "", //HTML5コース画面で最後に開かれたURL
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
  assignEventHandlers: function() { //private
    //外部のChrome拡張との通信受信
    chrome.runtime.onMessageExternal.addListener(
      function(msg, sender, sendResponse) {
        console.log("--- Backgroupd External Recv ACex:" + msg.cmd);
        if (msg.cmd == "enableDownloadable" ) {
          this.enableDownloadable();
          sendResponse();
        } else if (msg.cmd == "log" ) {
          console.log("--- Logging ACex:" + msg.message);
          sendResponse();
        } else {
          console.log("------ Backgroupd External Recv ACex: Unknown message.");
          sendResponse();
        }
      }.bind(this)
    );
    //ACex.jsとの通信受信
    chrome.runtime.onMessage.addListener(
      function(msg, sender, sendResponse) {
        console.log("--- Backgroupd Recv ACex:" + msg.cmd);
        if(msg.cmd == "setSession") {
          //セッションデータを保存
          this.setACsession(msg.userID, msg.sessionA);
          //pageActionのicon表示
          chrome.pageAction.show(sender.tab.id);
          sendResponse();
        } else if (msg.cmd == "setIcon" ) {
          //pageActionのiconのイメージ変更
          chrome.pageAction.setIcon({
            tabId: sender.tab.id,
            imageData: this.getImageData(null/*this.service.icon*/, msg.text)
          });
          // chrome.pageAction.setTitle({
          //   tabId: sender.tab.id,
          //   title: this.icon_title.filter(function(s){return s;}).join('\n')
          // });
          sendResponse();
        // } else if (msg.cmd == "setBadgeText" ) {
        //   //pageActionのバッチテスキスの変更
        //   chrome.browserAction.setBadgeText({text: msg.text});
        //   sendResponse();
        } else if (msg.cmd == "isDownloadable" ) {
          sendResponse({isDownloadable: this.isDownloadable()});
        } else if (msg.cmd == "enableDownloadable" ) {
          this.enableDownloadable();
          sendResponse();
        } else if (msg.cmd == "isDisplayTelop" ) {
          sendResponse({isDisplayTelop: this.isDisplayTelop()});
        } else if (msg.cmd == "isCountButton" ) {
          sendResponse({isCountButton: this.isCountButton()});
        } else if (msg.cmd == "open" ) {
          this.openTab(msg.url);
          sendResponse();
        } else if (msg.cmd == "openedUrl" ) {
          this.openedUrl = msg.url; //最後にcontent scriptで開かれたURL保存
          console.log("--- ACex: openedUrl=" + this.openedUrl);
          sendResponse();
        } else if (msg.cmd == "log" ) {
          console.log("--- Logging ACex:" + msg.message);
          sendResponse();
        } else {
          console.log("------ Backgroupd Recv ACex: Unknown message.");
          sendResponse();
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
              if (this.license.createDate) delete this.license.createDate;
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
  sendMessageAssignTabHandler: function(tabId, retryCount) {
    if ( this.handlerTab == null ) { //eventHandler登録が必要
      console.log("--- assignTabHandlers(" + tabId + ", " + retryCount-- + ")");
      chrome.tabs.sendMessage(tabId, "assignTabHandler", function(response) {
          if (chrome.runtime.lastError) {
            console.log("####: sendMessage assignTabHandler:",
                        chrome.runtime.lastError.message);
            if (retryCount>0) {//送信が早すぎるとタブが受信準備出来ていないのでリトライ
              console.log("----: sendMessage: Retry.");
              setTimeout(
                function() {
                  this.sendMessageAssignTabHandler(tabId, retryCount);
                }.bind(this),
                this.ASSIGN_TAB_HANDLER_RETRY_WAIT); //何ms待ってリトライするか
            } else {
              console.log("####: sendMessage: Retry Fail.");
            }
          }else{ //送信成功
            this.handlerTab = tabId;
          }
      }.bind(this));
    }
  },
  /* タブID記録用のurlをきれいにする */
  cleanupUrl: function(url) { //private
    //Chrome拡張のprotocol:path/削除
    url = url.replace(chrome.runtime.getURL(""), "");
    return url;
  },
  /* フォーラムを開いているタブのIDを記憶
     fid:   forum ID
     tabId: chromeのタブID
  */
  addTabId: function(fid, tabId) {
    fid = this.cleanupUrl(fid);
    console.log("--- addTabId:" + fid + " = " + tabId);
    try {
      this.tabList[fid] = tabId;
      if ( this.handlerTab == null ) { //eventHandler登録が必要
        this.sendMessageAssignTabHandler(tabId, this.ASSIGN_TAB_HANDLER_MAX_RETRY);
      }
    } catch (e) {
      console.log("#-- addTabId()" + e.name + " " + e.message);
    }
  },
  /* フォーラムを開いているタブIDを取得
     fid: forum ID
  */
  getTabId: function(fid) {
    fid = this.cleanupUrl(fid);
    console.log("--- getTabId(" + fid + ")");
    try {
      var tabId =this.tabList[fid];
      if ( tabId != null ) {
        //普段はEventListenerで消されるので問題ないが
        //念の為に存在確認して既に無ければ削除
        //その場合、非同期なので一回目はゴミが返る
        chrome.tabs.get(tabId, function(tab) {
          if ( chrome.runtime.lastError || tab == null ) {
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
            this.sendMessageAssignTabHandler(this.tabList[element],
                                             this.ASSIGN_TAB_HANDLER_MAX_RETRY);
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
  getOpenedUrl: function() {
    return this.openedUrl;
  },
  localStorageMigration: function() {
    //マイグレーション
    //V0.0.0.3以前(11bf542b)であまりに古いので消すだけ
    localStorage.removeItem("Oyo");
    localStorage.removeItem("userID");
    localStorage.removeItem("sessionA");
    //現用 "ACsession" "Special"
    //キャッシュ用 "Authors" "Forums"
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
  downloadable: false,
  displayTelop: false,
  useLicenseInfo: false,
  trialPriodDays: 30,
  forumMemoryCacheSize: 100,
  countButton: true,
  //キャッシュ
  forums: {},
  authors: {},

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
      var downloadable = special["downloadable"];
      if (downloadable) { this.downloadable = Boolean(downloadable); }
      var displayTelop = special["displayTelop"];
      if (displayTelop) { this.displayTelop = Boolean(displayTelop); }
      var useLicenseInfo = special["useLicenseInfo"];
      if (useLicenseInfo) { this.useLicenseInfo = Boolean(useLicenseInfo); }
      var trialPriodDays = special["trialPriodDays"];
      if (trialPriodDays) { this.trialPriodDays = trialPriodDays; }
      var forumMemoryCacheSize = special["forumMemoryCacheSize"];
      if (forumMemoryCacheSize) { this.forumMemoryCacheSize = forumMemoryCacheSize; }
      var countButton = special["countButton"];
      if ( countButton!=null ) { this.countButton = Boolean(countButton); }
    }
    value = localStorage["Forums"];
    if (value) {
      try {
        this.forums = JSON.parse(value);
      } catch (e) {
        console.log("#Exception:" + e.name + " " + e.message);
      }
      cacheFormatVer = this.forums.cacheFormatVer;
      if ( !cacheFormatVer ||  cacheFormatVer != this.getFormsCacheFormatVer() ) {
        //キャッシュのフォーマットバージョンが違ったらクリア
        this.forums = {};
      }
    } else {
      this.forums = {};
    }
    value = localStorage["Authors"];
    if (value) {
      try {
        this.authors = JSON.parse(value);
      } catch (e) {
        console.log("#Exception:" + e.name + " " + e.message);
      }
      cacheFormatVer = this.authors.cacheFormatVer;
      if ( !cacheFormatVer ||  cacheFormatVer != this.getAuthorsCacheFormatVer() ) {
        //キャッシュのフォーマットバージョンが違ったらクリア
        this.authors = {};
      }
    } else {
      this.authors = {};
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
            if (this.license.createDate) delete this.license.createDate;
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
                       displayTelop, useLicenseInfo, trialPriodDays,
                       forumMemoryCacheSize, downloadable, countButton) {
    this.coursenameRestrictionEnable = Boolean(coursenameRestriction);
    this.experimentalEnable = Boolean(experimental);
    this.displayPopupMenu = displayPopupMenu;
    this.popupWaitForMac = popupWaitForMac;
    this.downloadable = downloadable;
    this.displayTelop = displayTelop;
    this.useLicenseInfo = useLicenseInfo;
    this.trialPriodDays = trialPriodDays;
    this.forumMemoryCacheSize = forumMemoryCacheSize;
    this.countButton = countButton;
    localStorage["Special"]
      = JSON.stringify({"couresenameRestriction": coursenameRestriction,
                        "experimental": experimental,
                        "displayPopupMenu": displayPopupMenu,
                        "popupWaitForMac": popupWaitForMac,
                        "downloadable": downloadable,
                        "displayTelop": displayTelop,
                        "useLicenseInfo": useLicenseInfo,
                        "trialPriodDays": trialPriodDays,
                        "forumMemoryCacheSize": forumMemoryCacheSize,
                        "countButton": countButton
                       });
  },
  enableDownloadable: function() { //downloadableだけ変える
    this.downloadable = true;
    var special = {};
    var value = localStorage["Special"];
    if (value) {
      special = JSON.parse(value);
    }
    special["downloadable"] = true; //ここらへんは将来的には共通化
    localStorage["Special"] = JSON.stringify(special);
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
  isDownloadable: function() {
    return this.downloadable;
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
  isCountButton: function() {
    return this.countButton;
  },
  getForumMemoryCacheSize: function() {
    //まずはメモリキャッシュサイズをサポート
    //TODO: ファイルキャッシュも欲しいね
    //TODO: Authorsキャッシュのサイズも欲しいね
    return this.forumMemoryCacheSize;
  },
  getCacheFormsFormatVer: function () {
    return 1;
  },
  getCacheAuthorsFormatVer: function () {
    return 1;
  },
  setForumCache: function (forum) {
    this.forums[forum.fid] = forum;
    var diff = Object.keys(this.forums).length - this.getForumMemoryCacheSize();
    if ( diff > 0 ) {
      //キャッシュ多すぎなのでキャッシュリテンションする
      //日付別でソート
      var sorting = new Array();
      for(var fid in this.forums) {
        sorting.push({ "fid": fid, "date": new Date(this.forums[fid].cacheDate) });
      }
      sorting.sort(function(a,b) { return( a.date - b.date ); });
      //古いキャッシュから削除
      while ( diff-- > 0 ) {
        if ( sorting.length <= 0 ) {  //failsafe
          console.log("ACex: Warning: unexpected over retantion.");
          break;
        }
        var fid = sorting.shift().fid;
        if (fid != forum.fid) { //今登録したのは削除対象外にする
          var f = this.forums[fid];
          console.log("ACex: cache retention "+fid+" "+f.cacheDate+" "+f.title);
          delete this.forums[fid];
        } else {
          diff++;
        }
      }
    }
    localStorage["Forums"] = JSON.stringify(this.forums);
  },
  getForumCache: function (fid) {
    var forum = this.forums[fid];
    return forum;
  },
  setAuthorCache: function (uuid, name) {
    var author = {};
    author.name = name;
    author.cacheDate = new Date().toISOString(); //キャッシュ更新日付
    this.authors[uuid] = author;
    localStorage["Authors"] = JSON.stringify(this.authors);
  },
  getAuthorCache: function (uuid) {
    var author = this.authors[uuid];
    var name = null;
    if ( author ) {
      name = author.name;
    }
    return name;
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
  },
  //アイコンbadgeテキスト
  getImageData: function(img,  text) {
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    if (!img) {//iconが取れなそうなのでhtmlにicon置いておいて使う
      img = document.getElementById('icon');
    }
    if (img) {
      ctx.drawImage(img, 0, 0, img.width, img.height);
    }
    if (text) {
      //ctx.fillStyle = '#000000';
      //ctx.fillRect(0, height - 9, width, 9);
      ctx.font = 'bold 8px "arial" sans-serif';
      ctx.fillStyle = '#ff0000';
      ctx.textAlign = "center";
      ctx.fillText(text, width/2, height-1, height);
    }
    return ctx.getImageData(0, 0, width, height);
  }
});
var bg = new Background();
