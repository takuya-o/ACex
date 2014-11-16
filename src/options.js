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
      this.assignMessages();
      this.assignEventHandlers();
      this.displayLicenseStatus();
      this.restoreConfigurations();
    },
    assignMessages: function() {
      var elems = document.querySelectorAll('*[class^="MSG_"]');
      Array.prototype.forEach.call(elems, function (node) {
        var key = node.className.match(/MSG_(\w+)/)[1];
        var message = chrome.i18n.getMessage(key);
        if (message) node.textContent = message;
      });
    },
    getMessage: function(args) {//arg:配列
      var ret = "";
      for(var i=0; i<args.length; i++ ) {
        if ( i != 0 ) { ret = ret + " "; };
        var message = chrome.i18n.getMessage(args[i]);
        if (!message) { message = args[i]; };
        ret = ret + message;
      }
      return ret;
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
          = this.getMessage(["license_MSG_"+ status]);
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
	  if (userInfo.email) { displayName +=  " <" +  userInfo.email + ">" };
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
      $("coursename_rectriction_option").onclick = this.onClickSave.bind(this);
      $("display_popup_menu_option").onclick = this.onClickSave.bind(this);
      $("popup_wait_for_mac").onchange = this.onClickSave.bind(this);
      $("display_telop_option").onclick = this.onClickSave.bind(this);
    },
    restoreConfigurations: function() {
      $("experimental_option").checked = this.bg.isExperimentalEnable();
      $("coursename_rectriction_option").checked = this.bg.isCRmode();
      $("display_popup_menu_option").checked = this.bg.isDisplayPopupMenu();
      $("popup_wait_for_mac").value = this.bg.getPopupWaitForMac();
      $("display_telop_option").checked = this.bg.isDisplayTelop();
      this.displayExperimentalOptionList();
    },
    onClickSave: function(evt) {
      var experimental = $("experimental_option").checked;
      var coursenameRestriction = $("coursename_rectriction_option").checked;
      var displayPopupMenu = $("display_popup_menu_option").checked;
      var popupWaitForMac = parseInt($("popup_wait_for_mac").value, 10);
      var displayTelop = $("display_telop_option").checked;
      this.bg.setSpecial(experimental, coursenameRestriction,
                         displayPopupMenu, popupWaitForMac,
                         displayTelop );
      this.displayExperimentalOptionList();

      $('message').update(this.getMessage(["options_saved"]));
      setTimeout( function() {
        $('message').innerHTML=""; //一秒後にメッセージを消す
      }, 1000);
    }
  });
  new Options();
})();
