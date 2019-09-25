// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* global Class, chrome, e */
class Background{
  //定数
  private static ASSIGN_TAB_HANDLER_MAX_RETRY =   10 //回
  private static ASSIGN_TAB_HANDLER_RETRY_WAIT = 200 //msまつ
  //クラス変数
  private static tabList = {}  //Tab管理用連想記憶配列 {}
  private static openedUrl= "" //HTML5コース画面で最後に開かれたURL

  //インスタンス変数
  private license:{[key:string]:string|Date} = {
    status: "UNKNOWN", //FREE_TRIAL,FREE_TRIAL_EXPIRED, FULL, NONE
    validDate: new Date(),
    //不明時はメモリも確保しないcreateDate: null//store.syncだと{}になる
  }
  private handlerTab:number|null =  null
  private userID = "u="
  private sessionA = "a="
  private coursenameRestrictionEnable = false
  private experimentalEnable = false
  private displayPopupMenu = false
  private popupWaitForMac = 500
  private downloadable = true
  private displayTelop = false
  private useLicenseInfo = false
  private trialPriodDays = 30
  private forumMemoryCacheSize = 100
  private countButton = false
  //キャッシュ
  private forums:Forums
  private authors:Authors  //Formキャッシュにはnameを保存せずこちらで一括キャッシュ(容量効率向上)
  private saveContentInCache = false
  constructor() {
    this.initializeClassValue();
    this.assignEventHandlers();
    //再起動したときに呼ばれる 再起動時のみライセンスチェック
    if ( this.getLicenseValidDate() &&
         this.getLicenseValidDate().getMilliseconds() > Date.now() ) {
      //期限来ていない UNKNOWNでもNONEでも
      console.log("ACex: License is Valid.");
    }else{
      //FULLでもFREE_TRIALでも期限来てたら許可取り直し
      console.log("ACex: License is not Valid.");
      this.setupAuth(true);
    }
  }
  private assignEventHandlers() { //private
    //ACex.jsとの通信受信
    chrome.runtime.onMessage.addListener(
      (msg:BackgroundMsg, sender:chrome.runtime.MessageSender, sendResponse:(ret?:BackgroundResponse)=>void) => {
        console.log("--- Backgroupd Recv ACex:" + msg.cmd);
        if(msg.cmd == "setSession") {
          if ( !msg.userID || !msg.sessionA ) {
            console.error("setSession(userID, sessionA): Can not found argument userID or seesionA", msg)
          }
          //セッションデータを保存
          this.setACsession(msg.userID, msg.sessionA);
          //pageActionのicon表示
          chrome.pageAction.show(sender.tab.id);
          sendResponse();
        } else if (msg.cmd == "setIcon" ) {
          //msg.textは空文字もありうる
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
        } else if (msg.cmd == "getAuthorCache" ) {
          if (!msg.uuid) { console.error("getAuthorCache(uuid): Can not found argument uuid.", msg.uuid)}
          sendResponse({name: this.getAuthorCache(msg.uuid)});
        } else if (msg.cmd == "setAuthorCache" ) {
          if (!msg.uuid || !msg.name ) { console.error("setAuthorCache(uuid, name): Can not found argument uuid or name.", msg)}
          this.setAuthorCache(msg.uuid, msg.name)
          sendResponse()
        } else if (msg.cmd == "getForumCache" ) {
          if (!msg.fid) { console.error("getForumCache(fid): Can not found argument fid.",msg.fid)}
          sendResponse({forum: this.getForumCache(msg.fid)});
        } else if (msg.cmd == "setForumCache" ) {
          if (!msg.forum) { console.error("setForumCache(forum): Can not found argument forum", msg.forum)}
          this.setForumCache(msg.forum)
          sendResponse();
        } else if (msg.cmd == "open" ) {
          this.openTab(msg.url);
          sendResponse();
        } else if (msg.cmd == "openedUrl" ) {
          Background.openedUrl = msg.url; //最後にcontent scriptで開かれたURL保存
          console.log("--- ACex: openedUrl=" + Background.openedUrl);
          sendResponse();
        } else if (msg.cmd == "log" ) {
          console.log("--- Logging ACex:" + msg.message);
          sendResponse();
        } else {
          console.log("------ Backgroupd Recv ACex: Unknown message.");
          sendResponse();
        }
      }
    )
    //storage.syncの変更検知
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if( namespace === "sync" ){
        let storageChange = changes["License"];
        if ( storageChange ) {
          let license = storageChange.newValue;
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
    })
  }
  // タブへonRemoveハンドラー設定指示メッセージ送信
  private sendMessageAssignTabHandler(tabId:number, retryCount:number) {
    if ( this.handlerTab === null ) { //eventHandler登録が必要
      console.log("--- assignTabHandlers(" + tabId + ", " + retryCount-- + ")");
      chrome.tabs.sendMessage(tabId, "assignTabHandler", (_response) => {
          if (chrome.runtime.lastError) {
            console.log("####: sendMessage assignTabHandler:",
                        chrome.runtime.lastError.message);
            if (retryCount>0) {//送信が早すぎるとタブが受信準備出来ていないのでリトライ
              console.log("----: sendMessage: Retry.");
              setTimeout(
                function() {
                  this.sendMessageAssignTabHandler(tabId, retryCount);
                }.bind(this),
                Background.ASSIGN_TAB_HANDLER_RETRY_WAIT); //何ms待ってリトライするか
            } else {
              console.log("####: sendMessage: Retry Fail.");
            }
          }else{ //送信成功
            this.handlerTab = tabId;
          }
      })
    }
  }
  /* タブID記録用のurlをきれいにする */
  private cleanupUrl(url:string) { //private
    //Chrome拡張のprotocol:path/削除
    url = url.replace(chrome.runtime.getURL(""), "");
    return url;
  }
  /* フォーラムを開いているタブのIDを記憶
     fid:   forum ID
     tabId: chromeのタブID
  */
  private addTabId(fid:string, tabId:number) {
    fid = this.cleanupUrl(fid);
    console.log("--- addTabId:" + fid + " = " + tabId);
    try {
      Background.tabList[fid] = tabId;
      if ( this.handlerTab === null ) { //eventHandler登録が必要
        this.sendMessageAssignTabHandler(tabId, Background.ASSIGN_TAB_HANDLER_MAX_RETRY);
      }
    } catch (e) {
      console.log("#-- addTabId()" + e.name + " " + e.message);
    }
  }
  /* フォーラムを開いているタブIDを取得
     fid: forum ID
  */
  private getTabId(fid:string) {
    let tabId:number
    fid = this.cleanupUrl(fid);
    console.log("--- getTabId(" + fid + ")");
    try {
      tabId =Background.tabList[fid];
      if ( tabId != null ) {
        //普段はEventListenerで消されるので問題ないが
        //念の為に存在確認して既に無ければ削除
        //その場合、非同期なので一回目はゴミが返る
        chrome.tabs.get(tabId, (tab:chrome.tabs.Tab) => {
          if ( chrome.runtime.lastError || tab === null ) {
            console.log("#-- tab was closed." + tabId);
            this.removeTabId(tabId); //遅いがとりあえず次のために削除
          }
        })
      }
    } catch (e) {
      console.log("#-- getTabId()" + e.name + " " + e.message);
    }
    return tabId;
  }
  /* タブが閉じられたのでリストから削除 */
  private removeTabId(tabId:number) {
    console.log("--- removeTabId()");
    if (tabId === null ) {
      console.log("#-- removeTabId() argument is null");
    } else {
      let doneFlg = false;
      try {
        for(let element in Background.tabList) {
          //console.log("--- removeTabId:" + element);
          if ( Background.tabList[element] == tabId ) {
            console.log("--- removeTabId:" + tabId);
            delete Background.tabList[element];
            doneFlg = true;
            if ( this.handlerTab === tabId ) {
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
          for(let element in Background.tabList) {
            this.sendMessageAssignTabHandler(Background.tabList[element],
                                             Background.ASSIGN_TAB_HANDLER_MAX_RETRY);
            break;
          }
        }
      }
    }
  }
  private openTab(url:string) { //courselist.jsからcopy共通化が必要
    //該当のURLをタブで開く。既に開いていたらそれを使う
    let tabId = this.getTabId(url);
    if ( tabId == null ) { //nullとの==比較でundefined見つけてる
      //開いているタブが無かったので作る
      chrome.tabs.create( //タブを開く 引数省略すると「新しいタブ」
        { url: url },
        (tab) => {
          //tabが閉じられるまでキャッシュとして利用する
          console.log("--- opened tab:" + tab.id);
          this.addTabId(url, tab.id);
      });
    } else {
      //forumを開いているタブを開く
      chrome.tabs.update(tabId,{highlighted:true});
    }
  }
  public getOpenedUrl(){
    return Background.openedUrl;
  }
  private localStorageMigration() {
    //マイグレーション
    //V0.0.0.3以前(11bf542b)であまりに古いので消すだけ
    localStorage.removeItem("Oyo");
    localStorage.removeItem("userID");
    localStorage.removeItem("sessionA");
    //現用 "ACsession" "Special"
    //キャッシュ用 "Authors" "Forums"
  }
  //インスタンス変数管理
  private initializeClassValue() {
    this.localStorageMigration();
    let value = localStorage["ACsession"];
    if (value) {
      let acSession = JSON.parse(value);
      this.userID = acSession["userID"];
      this.sessionA = acSession["sessionA"];
    }
    value = localStorage["Special"];
    if (value) {
      let special = JSON.parse(value);
      let countButton = special["countButton"];
      if ( countButton!=null ) { this.countButton = Boolean(countButton); } //Default true->false
      this.coursenameRestrictionEnable = Boolean(special["couresenameRestriction"]);
      this.experimentalEnable = Boolean(special["experimental"]);
      let displayPopupMenu = special["displayPopupMenu"];
      if (displayPopupMenu) { this.displayPopupMenu = Boolean(displayPopupMenu); }
      let popupWaitForMac = special["popupWaitForMac"];
      if (popupWaitForMac) { this.popupWaitForMac = popupWaitForMac; }
      let downloadable = special["downloadable"];
      if (downloadable!=null) { this.downloadable = Boolean(downloadable); } //Default true
      let displayTelop = special["displayTelop"];
      if (displayTelop) { this.displayTelop = Boolean(displayTelop); }
      let useLicenseInfo = special["useLicenseInfo"];
      if (useLicenseInfo) { this.useLicenseInfo = Boolean(useLicenseInfo); }
      let trialPriodDays = special["trialPriodDays"];
      if (trialPriodDays) { this.trialPriodDays = trialPriodDays; }
      let forumMemoryCacheSize = special["forumMemoryCacheSize"];
      if (forumMemoryCacheSize) { this.forumMemoryCacheSize = forumMemoryCacheSize; }
      let saveContentInCache = special["saveContentInCache"];
      if ( saveContentInCache ) { this.saveContentInCache = Boolean(saveContentInCache); }
    }
    value = localStorage["Forums"];
    if (value) {
      try {
        this.forums = JSON.parse(value);
      } catch (e) {
        console.error("#Exception:" + e.name + " " + e.message + "Forums Cache Clear", e);
        this.forums = {cacheFormatVer: this.getCacheFormsFormatVer(), forum:{}}
      }
      let cacheFormatVer = this.forums.cacheFormatVer;
      if ( !cacheFormatVer ||  cacheFormatVer !== this.getCacheFormsFormatVer() ) {
        //キャッシュのフォーマットバージョンが違ったらクリア
        this.forums = {cacheFormatVer: this.getCacheFormsFormatVer(), forum:{}}
      }
    } else {
      this.forums = {cacheFormatVer: this.getCacheFormsFormatVer(), forum:{}}
    }
    value = localStorage["Authors"];
    if (value) {
      try {
        this.authors = JSON.parse(value);
      } catch (e) {
        console.error("#Exception:" + e.name + " " + e.message);
        this.authors = {cacheFormatVer: this.getCacheAuthorsFormatVer(), author:{}}
      }
      let cacheFormatVer = this.authors.cacheFormatVer;
      if ( !cacheFormatVer ||  cacheFormatVer !== this.getCacheAuthorsFormatVer() ) {
        //キャッシュのフォーマットバージョンが違ったらクリア
        console.warn("Cache version mismatch:", cacheFormatVer)
        this.authors = {cacheFormatVer: this.getCacheAuthorsFormatVer(), author:{}}
      }
    } else {
      this.authors = {cacheFormatVer: this.getCacheAuthorsFormatVer(), author:{}}
    }
    //ライセンス情報
    chrome.storage.sync.get("License", (items)=>{
      if (chrome.runtime.lastError) {
        console.log("####: storage.sync.get() ERR:",chrome.runtime.lastError);
        return;
      }
      if (items) {
        let license = items.License;
        if (license ){
          let licenseStatus = license.status;
          if ( licenseStatus ) {
            this.license.status = licenseStatus;
          }
          let licenseValidDate = license.validDate;
          if ( licenseValidDate ) {
            this.license.validDate = new Date(licenseValidDate);
          }
          let licenseCreateDate = license.createDate;
          if ( licenseCreateDate ) {
            this.license.createDate = new Date(licenseCreateDate);
          }else{
            if (this.license.createDate) delete this.license.createDate;
          }
        }
      }
    })
  }
  private setACsession(userID:string, sessionA:string) {
    this.userID = userID;
    this.sessionA = sessionA;
    localStorage["ACsession"]
      = JSON.stringify({"userID": userID, "sessionA": sessionA});
  }
  public getUserID() {
    return this.userID;
  }
  public getSessionA() {
    return this.sessionA;
  }
  public setSpecial(experimental:boolean, coursenameRestriction:boolean,
                       displayPopupMenu:boolean, popupWaitForMac:number,
                       displayTelop:boolean, useLicenseInfo:boolean, trialPriodDays:number,
                       forumMemoryCacheSize:number, downloadable:boolean, countButton:boolean,
                       saveContentInCache:boolean ) {
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
    this.saveContentInCache = saveContentInCache;
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
                        "countButton": countButton,
                        "saveContentInCache": saveContentInCache
                       });
  }
  private enableDownloadable() { //downloadableだけ変える
    this.downloadable = true;
    let special = {};
    let value = localStorage["Special"];
    if (value) {
      special = JSON.parse(value);
    }
    special["downloadable"] = true; //ここらへんは将来的には共通化
    localStorage["Special"] = JSON.stringify(special);
  }
  public isCRmode() {
    return this.coursenameRestrictionEnable;
  }
  public isExperimentalEnable() {
    return this.experimentalEnable;
  }
  public isDisplayPopupMenu() {
    return this.displayPopupMenu;
  }
  public getPopupWaitForMac() {
    return this.popupWaitForMac;
  }
  public isDownloadable() {
    return this.downloadable;
  }
  public isDisplayTelop() {
    return this.displayTelop;
  }
  public isUseLicenseInfo() {
    return this.useLicenseInfo;
  }
  public getTrialPriodDays() {
    return this.trialPriodDays;
  }
  public isCountButton() {
    return this.countButton;
  }
  public isSaveContentInCache() {
    return this.saveContentInCache;
  }
  public getForumMemoryCacheSize() {
    //まずはメモリキャッシュサイズをサポート
    //TODO: ファイルキャッシュも欲しいね
    //TODO: Authorsキャッシュのサイズも欲しいね
    return this.forumMemoryCacheSize;
  }
  private getCacheFormsFormatVer() {
    return 2;
  }
  private getCacheAuthorsFormatVer() {
    return 2;
  }
  public setForumCache(forum:Forum) {
    this.forums.forum[forum.fid] = forum;
    let diff = Object.keys(this.forums.forum).length - this.getForumMemoryCacheSize();
    if ( diff > 0 ) {
      type FidDate = {fid:string, date:Date};
      console.log("Cache Retension Over: " + diff + " Forum.")
      //キャッシュ多すぎなのでキャッシュリテンションする
      //日付別でソート
      let sorting = <FidDate[]>new Array();
      for(let fid in this.forums.forum) {
        sorting.push({ "fid": fid, "date": new Date(this.forums.forum[""+fid].cacheDate) });
      }
      sorting.sort(function(a:FidDate,b:FidDate) { return( a.date.getTime() - b.date.getTime() ) } )
      //古いキャッシュから削除
      while ( diff-- > 0 ) {
        if ( sorting.length <= 0 ) {  //failsafe
          console.warn("ACex: Unexpected over retantion.");
          break;
        }
        let fid:string = sorting.shift().fid;
        if (fid != forum.fid) { //今登録したのは削除対象外にする
          let f = this.forums.forum[fid];
          console.log("ACex: cache retention "+fid+" "+f["cacheDate"]+" "+f["title"]);
          delete this.forums.forum[fid];
        } else {
          diff++;
        }
      }
    }
    try {
      localStorage["Forums"] = JSON.stringify(this.forums);
    } catch (e) {
      //多分 Out of memoryが発生している例外を握りつぶす
      console.error("setForumCache(): Unexpected Exception in store localStorage[Forums].", e, forum)
    }
  }
  public getForumCache(fid:number):Forum {
    let forum = <Forum>this.forums.forum[fid];
    return forum;
  }
  public setAuthorCache(uuid:string, name:string) {
    //TODO: Authorキャッシュのリテンション
    if ( !this.authors.author[uuid] ) { //未登録なら
      let author:Author = {
        cacheDate: new Date().toISOString(), //キャッシュ更新日付
        name: name
      }
      this.authors.author[uuid] = author;
      try {
        localStorage["Authors"] = JSON.stringify(this.authors);
      } catch (e) {
        //多分 Out of memoryが発生しているが例外を握りつぶす
        console.error("setAuthorCache(): Unexpected Exception in store localStorage[Authors]={uuid:"+ uuid +",name:"+ name +"}", e)
      }
    }
  }
  public getAuthorCache(uuid:string):string {  //stringで名前を返すので関数名良くないかも
    let author = this.authors.author[uuid];
    let name:string; //undefined
    if ( author ) {
      name = author.name;
    }
    return name;
  }
  private setLicense(status:string, validDate:Date, createDate:Date) {
    let key = "UNKNOWN";
    for (key in ["FREE_TRIAL","FREE_TRIAL_EXPIRED","FULL","NONE","UNKNOWN"]){
      if ( status === key ) break; //サニタイズ
    }
    if ( key != "UNKNOWN" ) {
      this.license = {}; //chrome.storage.sync.remove("License");
      this.license.status = status;  //String
      this.license.validDate = validDate;  //Date
      let storeLicense = {};
      if ( createDate ) {//Date or null
        this.license.createDate = createDate;
        storeLicense = {status: this.license.status,
                        validDate: (<Date>this.license.validDate).getTime(),
                        createDate: (<Date>this.license.createDate).getTime()};
      } else {
        if (this.license.createDate) delete this.license["createDate"];
        storeLicense = {status: this.license.status,
                        validDate: (<Date>this.license.validDate).getTime() };
      }
      console.log("ACex: storage.sync.set(",this.license, ")");
      chrome.storage.sync.set( //Date型は保存できないみたいなので数値で保管
        {License: storeLicense }, ()=>{
          if (chrome.runtime.lastError) {
            console.log("####: storage.sync.set() ERR:",
                        chrome.runtime.lastError);
          }
        })
    }
  }
  public getLicenseStatus() {
    return this.license.status;
  }
  public getLicenseValidDate():Date {
    return <Date>this.license.validDate;
  }
  public getLicenseCreateDate():Date {
    if (this.license.createDate ) {
      return <Date>this.license.createDate;
    } else {
      return undefined;
    }
  }
  public getLicenseExpireDate():Date {
    if ( this.license.createDate &&
         Object.prototype.toString.call(this.license.createDate).slice(8, -1)==="Date" ) { //Date型だったら
           return new Date((<Date>this.license.createDate).getTime() +
                           this.trialPriodDays*24*60*60*1000);
         } else {
           return undefined;
         }
  }
  //ライセンス管理
  public setupAuth(_interactive:boolean) {
    const CWS_LICENSE_API_URL = 'https://www.googleapis.com/chromewebstore/v1.1/userlicenses/';
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
    function onLicenseFetched(error:chrome.runtime.LastError, status:string, response:string) {
      console.log(error, status, response);
      //ユーザが承認しないとerror.message="The user did not approve access."
      //statusDiv.text("Parsing license...");
      if (status === "200") {
        let responseObj = <{[key:string]:string}>JSON.parse(response);
        //$("#license_info").text(JSON.stringify(response, null, 2));
        //console.log("ACex: Parsing license " + JSON.stringify(response, null, 2));
        parseLicense(responseObj);
      } else {
        console.error(error);  //"The user turned off browser signin"など
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
    function parseLicense(license:{[key:string]:string}) {
      console.log("ACex: Full License=" + license.result);
      //let licenseStatus:string
      let licenseStatusText:string
      if (license.result && license.accessLevel == "FULL") {
        console.log("Fully paid & properly licensed.");
        licenseStatusText = "FULL";
        //licenseStatus = "alert-success";
      } else if (license.result && license.accessLevel == "FREE_TRIAL") {
        let daysAgoLicenseIssued = Date.now()-parseInt(license.createdTime,10);
        daysAgoLicenseIssued = daysAgoLicenseIssued / 1000 / 60 / 60 / 24;
        if (daysAgoLicenseIssued <= bg.trialPriodDays) {
          console.log("Free trial, still within trial period");
          licenseStatusText = "FREE_TRIAL";
          //licenseStatus = "alert-info";
        } else {
          console.log("Free trial, trial period expired.");
          licenseStatusText = "FREE_TRIAL_EXPIRED";
          //licenseStatus = "alert-warning";
        }
      } else {
        console.log("No license ever issued.");
        licenseStatusText = "NONE";
        //licenseStatus = "alert-danger";
      }
      //$("#dateCreated").text(moment(parseInt(license.createdTime, 10)).format("llll"));
      //$("#licenseState").addClass(licenseStatus);
      //$("#licenseStatus").text(licenseStatusText);
      //statusDiv.html("&nbsp;");
      let validDate = new Date(Date.now() +
                               parseInt(license.maxAgeSecs, 10)*1000 );
      console.log("ACex: Valid Date=" + validDate );
      if ( license.result ) {
        console.log("ACex: Access Level=" + license.accessLevel);
        console.log("ACex: Create=" +
                    new Date(parseInt(license.createdTime, 10)));
        let createDate = new Date(parseInt(license.createdTime, 10) );
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
    function xhrWithAuth(method:string, url:string, interactive:boolean,
      callback:(l:chrome.runtime.LastError, status?:string, response?:string)=>void) {
      let retry = true;
      let access_token:string
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
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
        xhr.onload = requestComplete;
        xhr.send();
      }
      function requestComplete() {
        //statusDiv.text("Authenticated XHR completed.");
        if (this.status === 401 && retry) {
          retry = false;
          chrome.identity.removeCachedAuthToken({ token: access_token },
                                                getToken);
        } else {
          callback(null, this.status, this.response);
        }
      }
    }
  }
  //アイコンbadgeテキスト
  private getImageData(img:HTMLImageElement,  text:string) {
    let canvas = <HTMLCanvasElement>document.getElementById('canvas');
    let ctx = canvas.getContext('2d');
    let width = canvas.width;
    let height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    if (!img) {//iconが取れなそうなのでhtmlにicon置いておいて使う
      img = <HTMLImageElement>document.getElementById('icon');
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
}
let bg = new Background();
