// -*- coding: utf-8-unix -*-
(function() {
  var Options = Class.create({
    bg: null,
    initialize: function() {
      this.bg = chrome.extension.getBackgroundPage().bg;
      window.addEventListener("load", function(evt) {
        this.start();
      }.bind(this));
    },
    start: function() {
      messageUtil.assignMessages();
      this.assignEventHandlers();
      this.displayLicenseStatus();
      this.restoreConfigurations();
    },
    displayLicenseStatus: function() {
      var validDate = this.bg.getLicenseValidDate();
      if ( validDate && validDate > Date.now() ) {
        console.log("ACex: License is Valid.");
      }else{
        console.log("ACex: License is not Valid.");
        this.bg.setupAuth(true);
      }

      var status = this.bg.getLicenseStatus();
      var createDate = this.bg.getLicenseCreateDate();//Date
      var expireDate = this.bg.getLicenseExpireDate();//Date
      if (status) {
        $("license_status").textContent
          = messageUtil.getMessage(["license_MSG_"+ status]);
      }
      if ( status == "FULL" ) {
        $("license_status").style["color"]="Black";
        expireDate = null;
      } else if ( status == "FREE_TRIAL" || status == "FREE_TRIAL_EXPIRED" ) {
	$("license_status").style["color"]="Black";
      } else {
	$("license_status").style["color"]="Red";
      }
      if (expireDate) {
	$("license_expire").textContent = expireDate.toLocaleString();
	if ( Date.now() > expireDate ) {
	  $("license_expire").style["color"]="Red";
	} else {
	  $("license_expire").style["color"]="Black";
	}
        $("license_expire_row").show(); //style["display"]="table";
      } else {
        $("license_expire_row").hide(); //style["display"]="none";
      }
      chrome.identity.getProfileUserInfo(function(userInfo) {
        if (userInfo) {
	  var displayName = userInfo.id;
	  if (userInfo.email) { displayName +=  " <" +  userInfo.email + ">"; }
	  $("license_user").textContent = displayName;
        }
      }.bind(this));
    },
    displayExperimentalOptionList: function() {
      if(this.bg.isExperimentalEnable()) {
        $("experimental_option_list").style["display"]="inline";
      } else {
        $("experimental_option_list").style["display"]="none";
      }
    },
    assignEventHandlers: function() {
      $("options_save").onclick = this.onClickSave.bind(this);
      $("experimental_option").onclick = this.onClickSave.bind(this);
      $("count_button_option").onclick = this.onClickSave.bind(this);
      $("coursename_rectriction_option").onclick = this.onClickSave.bind(this);
      $("display_popup_menu_option").onclick = this.onClickSave.bind(this);
      $("popup_wait_for_mac").onchange = this.onClickSave.bind(this);
      $("downloadable_option").onclick = this.onClickSave.bind(this);
      $("display_telop_option").onclick = this.onClickSave.bind(this);
      $("check_license_by_chrome_web_store").onclick
        = this.onClickSave.bind(this);
      $("trial_priod_days").onchange = this.onClickSave.bind(this);
      $("forum_memory_cache_size").onchange = this.onClickSave.bind(this);
    },
    restoreConfigurations: function() {
      $("experimental_option").checked = this.bg.isExperimentalEnable();
      $("count_button_option").checked = this.bg.isCountButton();
      $("coursename_rectriction_option").checked = this.bg.isCRmode();
      $("display_popup_menu_option").checked = this.bg.isDisplayPopupMenu();
      $("popup_wait_for_mac").value = this.bg.getPopupWaitForMac();
      $("downloadable_option").checked = this.bg.isDownloadable();
      $("display_telop_option").checked = this.bg.isDisplayTelop();
      $("check_license_by_chrome_web_store").checked
        = this.bg.isUseLicenseInfo();
      $("trial_priod_days").value = this.bg.getTrialPriodDays();
      $("forum_memory_cache_size").value = this.bg.getForumMemoryCacheSize();
      this.displayExperimentalOptionList();
    },
    onClickSave: function(evt) {
      var experimental = $("experimental_option").checked;
      var countButton = $("count_button_option").checked;
      var coursenameRestriction = $("coursename_rectriction_option").checked;
      var displayPopupMenu = $("display_popup_menu_option").checked;
      var popupWaitForMac = parseInt($("popup_wait_for_mac").value, 10);
      var downloadable = $("downloadable_option").checked;
      var displayTelop = $("display_telop_option").checked;
      var useLicenseInfo= $("check_license_by_chrome_web_store").checked;
      var trial_priod_days = parseInt($("trial_priod_days").value, 10);
      var forumMemoryCacheSize
            = parseInt($("forum_memory_cache_size").value, 10);

      this.bg.setSpecial(experimental, coursenameRestriction,
                         displayPopupMenu, popupWaitForMac,
                         displayTelop, useLicenseInfo, trial_priod_days,
                         forumMemoryCacheSize, downloadable, countButton);
      this.displayExperimentalOptionList();

      $('message').update(messageUtil.getMessage(["options_saved"]));
      setTimeout( function() {
        $('message').innerHTML=""; //一秒後にメッセージを消す
      }, 1000);
    }
  });
  new Options();
})();
