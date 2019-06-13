// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* global Class, chrome, messageUtil */

// import MessageUtil = require("./MessageUtil")

class Options {
  constructor() {
    window.addEventListener("load", (_evt:Event) => {
      //start
      MessageUtil.assignMessages();
      this.assignEventHandlers();
      chrome.runtime.getBackgroundPage( (backgroundPage) => {
        let bg:Background = backgroundPage["bg"];
        //bg揃ってから起動
        this.displayLicenseStatus(bg);
        this.restoreConfigurations(bg);
      })
    })
  }
  private displayLicenseStatus(bg:Background) {
    let validDate = bg.getLicenseValidDate();
    if ( validDate && validDate.getMilliseconds() > Date.now() ) {
      console.log("ACex: License is Valid.");
    }else{
      console.log("ACex: License is not Valid.");
      bg.setupAuth(true);
    }
    let status = bg.getLicenseStatus();
    //let createDate = this.bg.getLicenseCreateDate();//Date
    let expireDate = bg.getLicenseExpireDate();//Date
    let licenseStatusElement = document.getElementById("license_status")
    if (status) {
      licenseStatusElement.textContent = MessageUtil.getMessage(["license_MSG_"+ status]);
    }
    if ( status == "FULL" ) {
      licenseStatusElement.style["color"]="Black";
      expireDate = null;
    } else if ( status === "FREE_TRIAL" || status === "FREE_TRIAL_EXPIRED" ) {
      licenseStatusElement.style["color"]="Black";
    } else {
      licenseStatusElement.style["color"]="Red";
    }
    let licenseExpireElement = document.getElementById("license_expire")
    if (expireDate) {
      licenseExpireElement.textContent = expireDate.toLocaleString();
      if ( Date.now() > expireDate.getMilliseconds() ) {
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
  }
  private getInputElement(id:string):HTMLInputElement { //<input type="いろいろ" 用get
    return <HTMLInputElement>document.getElementById(id)
  }
  private restoreConfigurations(bg:Background) {
    this.getInputElement("experimental_option").checked = bg.isExperimentalEnable();
    this.getInputElement("count_button_option").checked = bg.isCountButton();
    this.getInputElement("coursename_rectriction_option").checked = bg.isCRmode();
    //this.getInputElement("display_popup_menu_option").checked = this.bg.isDisplayPopupMenu();
    this.getInputElement("popup_wait_for_mac").value = ""+bg.getPopupWaitForMac();
    this.getInputElement("downloadable_option").checked = bg.isDownloadable();
    this.getInputElement("display_telop_option").checked = bg.isDisplayTelop();
    this.getInputElement("check_license_by_chrome_web_store").checked
      = bg.isUseLicenseInfo();
    this.getInputElement("trial_priod_days").value = ""+bg.getTrialPriodDays();
    this.getInputElement("forum_memory_cache_size").value = ""+bg.getForumMemoryCacheSize();
    this.getInputElement("save_content_in_cache").checked = bg.isSaveContentInCache();
    this.displayExperimentalOptionList();
  }
  private onClickSave(_evt:Event) {
      let experimental = this.getInputElement("experimental_option").checked;
      let countButton = this.getInputElement("count_button_option").checked;
      let coursenameRestriction = this.getInputElement("coursename_rectriction_option").checked;
      let displayPopupMenu = false; //this.getInputElement("display_popup_menu_option").checked;
      let popupWaitForMac = parseInt(this.getInputElement("popup_wait_for_mac").value, 10);
      let downloadable = this.getInputElement("downloadable_option").checked;
      let displayTelop = this.getInputElement("display_telop_option").checked;
      let useLicenseInfo= this.getInputElement("check_license_by_chrome_web_store").checked;
      let trial_priod_days = parseInt(this.getInputElement("trial_priod_days").value, 10);
      let forumMemoryCacheSize
       = parseInt(this.getInputElement("forum_memory_cache_size").value, 10);
      let saveContentInCache = this.getInputElement("save_content_in_cache").checked;

      chrome.runtime.getBackgroundPage( (backgroundPage) => {
        let bg:Background = backgroundPage["bg"];
        bg.setSpecial(experimental, coursenameRestriction,
                         displayPopupMenu, popupWaitForMac,
                         displayTelop, useLicenseInfo, trial_priod_days,
                         forumMemoryCacheSize, downloadable, countButton,
                         saveContentInCache);
        this.displayExperimentalOptionList();
        document.getElementById('message').innerText = MessageUtil.getMessage(["options_saved"])
        setTimeout( () => {
          document.getElementById('message').innerText=""; //一秒後にメッセージを消す
        }, 1000);
      })
    }
  }
let options = new Options();
