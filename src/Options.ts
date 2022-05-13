// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* global Class, chrome, messageUtil */
/* tslint:disable: object-literal-sort-keys */

// import MessageUtil = require("./MessageUtil")

class Options {
  // 定数
  //private static OPTIONAL_PERMISSION_ALL_URLS: chrome.permissions.Permissions = {origins: ["<all_urls>"]}
  //"https://player.aircamp.us/"  PDFのためスクリーンショットを作成するのに必要 URLだとpermissionを追加できるけど一度追加すると削除できない
  private static OPTIONAL_PERMISSION_IDENTITY: chrome.permissions.Permissions
    = {permissions: ["identity", "identity.email"]}
  private lastSupportAirSearchBeta:boolean = false
  private lastUseLicenseInfo:boolean = false

  constructor() {
    console.log("--- Options start ---")
    window.addEventListener("load", (_evt:Event) => {
      //start
      MessageUtil.assignMessages();
      this.assignEventHandlers();
      //this.displayLicenseStatus()
      this.restoreConfigurations()
    })
  }
  private displayLicenseStatus(reload = true) {
    chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.GET_LICENSE}, (license:License) => {
      console.log("License", license)
      if ( new Date(license.validDate).getMilliseconds() > Date.now() ) {
        console.log("ACex: License is Valid.");
      }else{
        console.log("ACex: License is not Valid.");
        if ( reload ) {
          chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.SETUP_AUTH }, () => {
            this.displayLicenseStatus(false)
          })
          return
        }
      }
      const licenseStatusElement = document.getElementById("license_status") as HTMLElement
      if (license.status) {
        licenseStatusElement.textContent
        = MessageUtil.getMessage(["license_MSG_"+ license.status]); //LicenseStatusだけどstringとして利用
      }
      if ( license.status === LicenseStatus.FULL ) {
        licenseStatusElement.style.color="Black";
        license.expireDate = undefined;
      } else if ( license.status === LicenseStatus.FREE_TRIAL || license.status === LicenseStatus.FREE_TRIAL_EXPIRED ) {
        licenseStatusElement.style.color="Black";
      } else {
        licenseStatusElement.style.color="Red"; // NONE, UNKNOWN
      }
      const licenseExpireElement = document.getElementById("license_expire") as HTMLElement
      if (license.expireDate) {
        license.expireDate = new Date(license.expireDate)
        licenseExpireElement.textContent = license.expireDate.toLocaleString();
        if ( Date.now() > license.expireDate.getMilliseconds() ) {
          licenseExpireElement.style.color="Red";
        } else {
          licenseExpireElement.style.color="Black";
        }
        document.getElementById("license_expire_row")!.style.display="";
      } else {
        document.getElementById("license_expire_row")!.style.display="none";
      }
      if ( this.lastUseLicenseInfo ) {
        chrome.identity.getProfileUserInfo( (userInfo)=>{
          //https://developer.chrome.com/docs/extensions/reference/identity/#method-getProfileUserInfo
          //Requires the identity.email manifest permission.
          if (userInfo) {
            let displayName = userInfo.id;
            if (userInfo.email) { displayName +=  " <" +  userInfo.email + ">"; }
              document.getElementById("license_user")!.textContent = displayName;
            }
        })
      }
    })
  }
  private displayExperimentalOptionList() {
    const experimentalOptionListElement = document.getElementById("experimental_option_list")
    if(this.getInputElement("experimental_option").checked) {
      experimentalOptionListElement!.style.display="inline";
    } else {
      experimentalOptionListElement!.style.display="none";
    }
  }
  private assignEventHandlers() {
    document.getElementById("options_save")!.onclick = this.onClickSaveAndClose.bind(this)
    document.getElementById("experimental_option")!.onclick = this.onClickSave.bind(this)
    document.getElementById("count_button_option")!.onclick = this.onClickSave.bind(this)
    document.getElementById("coursename_rectriction_option")!.onclick = this.onClickSave.bind(this)
    document.getElementById("support_airsearch_beta")!.onclick = this.onClickSave.bind(this)
    //document.getElementById("display_popup_menu_option").onclick = this.onClickSave.bind(this)
    document.getElementById("popup_wait_for_mac")!.onchange = this.onClickSave.bind(this)
    document.getElementById("downloadable_option")!.onclick = this.onClickSave.bind(this)
    document.getElementById("display_telop_option")!.onclick = this.onClickSave.bind(this)
    document.getElementById("check_license_by_chrome_web_store")!.onclick
     = this.onClickSave.bind(this)
    document.getElementById("trial_priod_days")!.onchange = this.onClickSave.bind(this)
    document.getElementById("forum_memory_cache_size")!.onchange = this.onClickSave.bind(this)
    document.getElementById("save_content_in_cache")!.onchange = this.onClickSave.bind(this)
    document.getElementById("api_key")!.onchange = this.onClickSave.bind(this)
  }
  private getInputElement(id:string):HTMLInputElement { //<input type="いろいろ" 用get
    return document.getElementById(id) as HTMLInputElement
  }
  private restoreConfigurations() {
    chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.GET_CONFIGURATIONS}, (config:Configurations) => {
      this.getInputElement("experimental_option").checked = config.experimental
      this.getInputElement("count_button_option").checked = config.countButton
      this.getInputElement("coursename_rectriction_option").checked = config.cRmode
      this.getInputElement("support_airsearch_beta").checked = config.supportAirSearchBeta
      this.getInputElement("popup_wait_for_mac").value = ""+config.popupWaitForMac
      this.getInputElement("downloadable_option").checked = config.downloadable
      this.getInputElement("display_telop_option").checked = config.displayTelop
      this.getInputElement("check_license_by_chrome_web_store").checked
        = config.useLicenseInfo
      this.getInputElement("trial_priod_days").value = ""+config.trialPriodDays
      this.getInputElement("forum_memory_cache_size").value = ""+config.forumMemoryCacheSize
      this.getInputElement("save_content_in_cache").checked = config.saveContentInCache
      this.getInputElement("api_key").value = config.apiKey
      this.displayExperimentalOptionList();

      this.lastSupportAirSearchBeta = config.supportAirSearchBeta
      this.lastUseLicenseInfo = config.useLicenseInfo

      //PermissionにConfig値に合わせる
      // this.containsPermissions(this.lastSupportAirSearchBeta,
      //   Options.OPTIONAL_PERMISSION_ALL_URLS, (resultSupportAirSearchBeta)=> {
      //   this.lastSupportAirSearchBeta = resultSupportAirSearchBeta
      //   this.getInputElement("support_airsearch_beta").checked = resultSupportAirSearchBeta

        this.containsPermissions(this.lastUseLicenseInfo, Options.OPTIONAL_PERMISSION_IDENTITY,
          (resultUseLicenseInfo)=>{
          this.lastUseLicenseInfo = resultUseLicenseInfo;
          this.getInputElement("check_license_by_chrome_web_store").checked = resultUseLicenseInfo;

          //this.onClickSave(new Event("dummy")) //ここでまとめて config更新
          this.setConfig(
            config.experimental,
            config.countButton,
            config.cRmode,
            config.popupWaitForMac,
            config.downloadable,
            config.displayTelop,
            this.lastUseLicenseInfo,
            config.trialPriodDays,
            config.forumMemoryCacheSize,
            config.saveContentInCache,
            config.apiKey,
            this.lastSupportAirSearchBeta,
          )
          // オプション情報が取れたところでライセンス情報を表示する
          this.displayLicenseStatus()
        })
      // })
    })
  }
  private containsPermissions(lastPermission: boolean, permissions: chrome.permissions.Permissions,
    cb: (permission: boolean)=>void ) { //Permissionsとstoreされたconfigを同期して正しい表示にする
    chrome.permissions.contains(permissions , (result) => {
      if (chrome.runtime.lastError) {
        console.error("Runtime.lastError: " + chrome.runtime.lastError.message, chrome.runtime.lastError)
        result = false  //とれなかったけど cb()は必ず呼びたいのでfalseにしておく
      } else if (result !== lastPermission) {
        console.warn("permission different with config", permissions, result);
      }
      console.log("Permission contain", permissions, result)
      cb(result)
    })
  }

  private onClickSaveAndClose(e:Event) {
    this.onClickSave(e)
    window.close()
  }

  private onClickSave(_evt:Event) {
    const experimental = this.getInputElement("experimental_option").checked;
    const countButton = this.getInputElement("count_button_option").checked;
    const coursenameRestriction = this.getInputElement("coursename_rectriction_option").checked;
    const supportAirSearchBeta = this.getInputElement("support_airsearch_beta").checked;
    const popupWaitForMac = parseInt(this.getInputElement("popup_wait_for_mac").value, 10);
    const downloadable = this.getInputElement("downloadable_option").checked;
    const displayTelop = this.getInputElement("display_telop_option").checked;
    const useLicenseInfo= this.getInputElement("check_license_by_chrome_web_store").checked;
    const trialPriodDays = parseInt(this.getInputElement("trial_priod_days").value, 10);
    const forumMemoryCacheSize
      = parseInt(this.getInputElement("forum_memory_cache_size").value, 10);
    const saveContentInCache = this.getInputElement("save_content_in_cache").checked;
    const apiKey = this.getInputElement("api_key").value
    this.displayExperimentalOptionList()

    //スイッチによりPermission設定 必要なときだけchangePermission()を呼びたいが、まとめsetConfig()するため、いつも呼ぶ
    // this.setPermissions(this.lastSupportAirSearchBeta, supportAirSearchBeta,
    //   Options.OPTIONAL_PERMISSION_ALL_URLS, (resultSupporAirSearchBeta)=> {
    //   if ( this.lastSupportAirSearchBeta !== resultSupporAirSearchBeta ) {
    //     this.lastSupportAirSearchBeta = resultSupporAirSearchBeta
    //   }
    //   this.getInputElement("support_airsearch_beta").checked = resultSupporAirSearchBeta
    this.lastSupportAirSearchBeta = supportAirSearchBeta //permission変えずにlast更新のみ

      this.setPermissions(this.lastUseLicenseInfo, useLicenseInfo, Options.OPTIONAL_PERMISSION_IDENTITY,
        (resultUseLicenseInfo)=> {
        if ( this.lastUseLicenseInfo !== resultUseLicenseInfo ) {
          this.lastUseLicenseInfo = resultUseLicenseInfo
        }
        this.getInputElement("check_license_by_chrome_web_store").checked = resultUseLicenseInfo

        //最後にまとめてConfig更新 TODO:Permission関係はユーザ反応が入るので、分けてひとづつ更新にしたい
        this.setConfig(
          experimental, countButton,
          coursenameRestriction,
          popupWaitForMac,
          downloadable, displayTelop,
          this.lastUseLicenseInfo,
          trialPriodDays,
          forumMemoryCacheSize,
          saveContentInCache,
          apiKey,
          this.lastSupportAirSearchBeta,
          ()=>{
            document.getElementById("message")!.innerText = MessageUtil.getMessage(["options_saved"])
            setTimeout(() => {
              document.getElementById("message")!.innerText = "" //一秒後にメッセージを消す
            }, 1000)
          },
        )
      })
    // })

  }

  private setConfig(
    experimental: boolean,
    countButton: boolean,
    coursenameRestriction: boolean,
    popupWaitForMac: number,
    downloadable: boolean,
    displayTelop: boolean,
    useLicenseInfo: boolean,
    trialPriodDays: number,
    forumMemoryCacheSize: number,
    saveContentInCache: boolean,
    apiKey: string,
    supportAirSearchBeta: boolean,
    cb? :()=>void) {
    chrome.runtime.sendMessage(
      {
        cmd: BackgroundMsgCmd.SET_CONFIGURATIONS,
        config: {
          experimental,
          countButton,
          cRmode: coursenameRestriction,
          popupWaitForMac,
          downloadable,
          displayTelop,
          useLicenseInfo,
          trialPriodDays,
          forumMemoryCacheSize,
          saveContentInCache,
          apiKey,
          supportAirSearchBeta,
        },
      },
      () => {
        if(cb) { cb() }
      },
    )
  }

  //Permissionをpermission:booleanへ変更要求する  不許可だったり削除できなかったら変更前の値を返す
  private setPermissions(lastPermission:boolean, permission: boolean, permissions: chrome.permissions.Permissions,
    cb: (permission: boolean)=>void) {
    if (lastPermission === permission) {
      console.log("Permission is not change:", permissions, permission) //パーミッションの変更なしなので何もしない
      cb(permission)
    } else if (permission) {
      chrome.permissions.request(permissions, (granted) => { //ここでユーザの許可をもらう ユーザ反応待ち
        if (chrome.runtime.lastError) {
          console.error("Runtime.lastError: " + chrome.runtime.lastError.message, chrome.runtime.lastError)
          granted = false
        }
        if (!granted) { //不許可
          permission = false //元に戻す
        }
        console.log("Permission request:",permissions, permission)
        cb(permission)
      })
    } else {
      chrome.permissions.remove(permissions, (remove) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime.lastError: " + chrome.runtime.lastError.message, chrome.runtime.lastError)
           remove = true //二重消しでもエラーになるので、エラーの場合でもpermission削除の成功を偽りチェックは反転させる
        }
        if (!remove) { //消せず
          permission = true //元に戻す
        }
        console.log("Permission remove:",permissions, permission)
        cb(permission)
      })
    }
  }

}
const options = new Options();
