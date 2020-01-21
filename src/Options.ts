// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* global Class, chrome, messageUtil */

// import MessageUtil = require("./MessageUtil")

class Options {
  constructor() {
    console.log("--- Options start ---")
    window.addEventListener("load", (_evt:Event) => {
      //start
      MessageUtil.assignMessages();
      this.assignEventHandlers();
      this.displayLicenseStatus()
      this.restoreConfigurations()
    })
  }
  private displayLicenseStatus(reload = true) {
    chrome.runtime.sendMessage({cmd: "getLicense"}, (license:License) => {
      console.log("License", license)
      if ( new Date(license.validDate).getMilliseconds() > Date.now() ) {
        console.log("ACex: License is Valid.");
      }else{
        console.log("ACex: License is not Valid.");
        if ( reload ) {
          chrome.runtime.sendMessage({cmd: "setupAuth" }, () => {
            this.displayLicenseStatus(false)
          })
          return
        }
      }
      let licenseStatusElement = document.getElementById("license_status")
      if (license.status) {
        licenseStatusElement.textContent = MessageUtil.getMessage(["license_MSG_"+ license.status]);
      }
      if ( license.status === "FULL" ) {
        licenseStatusElement.style["color"]="Black";
        license.expireDate = null;
      } else if ( status === "FREE_TRIAL" || status === "FREE_TRIAL_EXPIRED" ) {
        licenseStatusElement.style["color"]="Black";
      } else {
        licenseStatusElement.style["color"]="Red";
      }
      let licenseExpireElement = document.getElementById("license_expire")
      if (license.expireDate) {
        license.expireDate = new Date(license.expireDate)
        licenseExpireElement.textContent = license.expireDate.toLocaleString();
        if ( Date.now() > license.expireDate.getMilliseconds() ) {
          licenseExpireElement.style["color"]="Red";
        } else {
          licenseExpireElement.style["color"]="Black";
        }
        document.getElementById("license_expire_row").style["display"]="table";
      } else {
        document.getElementById("license_expire_row").style["display"]="none";
      }
      chrome.identity.getProfileUserInfo( (userInfo)=>{
        if (userInfo) {
          let displayName = userInfo.id;
          if (userInfo.email) { displayName +=  " <" +  userInfo.email + ">"; }
            document.getElementById("license_user").textContent = displayName;
          }
      })
    })
  }
  private displayExperimentalOptionList() {
    let experimentalOptionListElement = document.getElementById("experimental_option_list")
    if(this.getInputElement("experimental_option").checked) {
      experimentalOptionListElement.style["display"]="inline";
    } else {
      experimentalOptionListElement.style["display"]="none";
    }
  }
  private assignEventHandlers() {
    document.getElementById("options_save").onclick = this.onClickSave.bind(this)
    document.getElementById("experimental_option").onclick = this.onClickSave.bind(this)
    document.getElementById("count_button_option").onclick = this.onClickSave.bind(this)
    document.getElementById("coursename_rectriction_option").onclick = this.onClickSave.bind(this)
    //document.getElementById("display_popup_menu_option").onclick = this.onClickSave.bind(this)
    document.getElementById("popup_wait_for_mac").onchange = this.onClickSave.bind(this)
    document.getElementById("downloadable_option").onclick = this.onClickSave.bind(this)
    document.getElementById("display_telop_option").onclick = this.onClickSave.bind(this)
    document.getElementById("check_license_by_chrome_web_store").onclick
     = this.onClickSave.bind(this)
    document.getElementById("trial_priod_days").onchange = this.onClickSave.bind(this)
    document.getElementById("forum_memory_cache_size").onchange = this.onClickSave.bind(this)
    document.getElementById("save_content_in_cache").onchange = this.onClickSave.bind(this)
    document.getElementById("api_key").onchange = this.onClickSave.bind(this)
  }
  private getInputElement(id:string):HTMLInputElement { //<input type="いろいろ" 用get
    return <HTMLInputElement>document.getElementById(id)
  }
  private restoreConfigurations() {
    chrome.runtime.sendMessage({cmd: "getConfigurations"}, (config:Configurations) => {
      this.getInputElement("experimental_option").checked = config.experimentalEnable
      this.getInputElement("count_button_option").checked = config.countButton
      this.getInputElement("coursename_rectriction_option").checked = config.cRmode
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
    })
  }
  private onClickSave(_evt:Event) {
      let experimental = this.getInputElement("experimental_option").checked;
      let countButton = this.getInputElement("count_button_option").checked;
      let coursenameRestriction = this.getInputElement("coursename_rectriction_option").checked;
      let popupWaitForMac = parseInt(this.getInputElement("popup_wait_for_mac").value, 10);
      let downloadable = this.getInputElement("downloadable_option").checked;
      let displayTelop = this.getInputElement("display_telop_option").checked;
      let useLicenseInfo= this.getInputElement("check_license_by_chrome_web_store").checked;
      let trial_priod_days = parseInt(this.getInputElement("trial_priod_days").value, 10);
      let forumMemoryCacheSize
       = parseInt(this.getInputElement("forum_memory_cache_size").value, 10);
      let saveContentInCache = this.getInputElement("save_content_in_cache").checked;
      let apiKey = this.getInputElement("api_key").value

      chrome.runtime.sendMessage({cmd: "setSpecial", config:{
        experimentalEnable: experimental,
        countButton: countButton,
        cRmode: coursenameRestriction,
        popupWaitForMac: popupWaitForMac,
        downloadable: downloadable,
        displayTelop: displayTelop,
        useLicenseInfo: useLicenseInfo,
        trialPriodDays: trial_priod_days,
        forumMemoryCacheSize: forumMemoryCacheSize,
        saveContentInCache: saveContentInCache,
        apiKey: apiKey,
      }}, () => {
        this.displayExperimentalOptionList();
        document.getElementById('message').innerText = MessageUtil.getMessage(["options_saved"])
        setTimeout( () => {
          document.getElementById('message').innerText=""; //一秒後にメッセージを消す
        }, 1000);
      })
    }
  }
let options = new Options();
