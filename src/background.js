// -*- coding utf-8 -*-
var Background = Class.create({
    initialize: function() {
      this.assignEventHandlers();
    },
    assignEventHandlers: function() {
      //Nop
    },
    getServerUrl: function() {
      return "http://backend.server.name/";
    },
    loadOyo: function(callbacks) {
      var url = this.getServerUrl() + "ajax/get_Oyo";
      new Ajax.Request(url, {
          method: "get",
            onSuccess: function(req) {
            callbacks.onSuccess(req);
          }.bind(this)
              });
    },
    getOyoConfig: function() {
      var value = localStorage["Oyo"];
      if (value) {
        return value;
      } else {
        return "初期値の値";
      }
    },
    setOyoConfig: function(value) {
      localStorage["Oyo"] = value;
    }
  });
var bg = new Background();
