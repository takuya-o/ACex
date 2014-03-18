(function() {
  var Options = Class.create({
      initialize: function() {
        this.bg = chrome.extension.getBackgroundPage().bg;
        window.addEventListener("load", function(evt) {
            this.start();
          }.bind(this));
      },
      start: function() {
        this.assignMessages();
        this.assignEventHandlers();
        this.restoreConfigurations();
        //
      },
      assignMessages: function() {
        var hash = {
          "optOyo": "optOyo",
          //
        };
        for (var key in hash) {
          $(key).innerHTML = chrome.i18n.getMessage(hash[key]);
        }
      },
      assignEventHandlers: function() {
        $("Oyo").onclick = this.onClick***.bind(this);
      },
      restoreConfigurations: function() {
        $("Oyo").value = this.bg.get***Config();
      },
      onClick***: function(evt) {
        var value = $("Oyo").value;
        this.bg.set***Config(value);
      },
      //
    });
  new Options();
})();