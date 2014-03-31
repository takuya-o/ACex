// -*- coding: utf-8-unix -*-
(function() {
  var CountResult = Class.create({
    initialize: function() {
      this.bg = chrome.extension.getBackgroundPage().bg;
      window.addEventListener("load", function(evt) {
        this.start();
      }.bind(this));
    },
    start: function() {
      this.assignEventHandlers();
      this.assignMessages();
      this.createTable();
    },
    assignEventHandlers: function() {
      chrome.tabs.onRemoved.addListener(
        //閉じたときにtabListから削除する
        function(tabId, removeInfo) {
          console.log("--- tab closed:" + tabId);
          this.bg.removeTabId(tabId);
        }.bind(this)
      );
    },
    assignMessages: function() {
      var elems = document.querySelectorAll('*[class^="MSG_"]');
      Array.prototype.forEach.call(elems, function (node) {
        var key = node.className.match(/MSG_(\w+)/)[1];
        var message = chrome.i18n.getMessage(key);
        if (message) { node.textContent = message; }
      });
    },
    getMessage: function(args) {//arg:配列
      var ret = "";
      for(var i=0; i<args.length; i++ ) {
        if ( i != 0 ) { ret = ret + " "; };
        var message = chrome.i18n.getMessage(args[i]);
        if (!message) { message = args[i] };
        ret = ret + message;
      }
      return ret;
    },
    createTable: function() {
      var query = window.location.search.toQueryParams();
      var fid = query["fid"];
      $('message').insert(this.getMessage(["loding"]));

      if ( false ) {
        //キャッシュに有った場合
        console.log("--- Cache Hit Forum Data:" + fid);
        //TODO: キャッシュから引いてくる 未実装
      } else {
        //まだ無かった
        console.log("--- Create Forum Data:" + fid);
        dataLayer.push({'event': 'forum-' + fid });
        $('message').update(this.getMessage(["discussion_data", "loding", "id"])
                            + fid);
        var courseListAjax = new Ajax.Request(
          "https://www.bbt757.com/svlAC/GetForumContents",
          { method: "get",
            parameters: "fid=" + fid + "&" + this.bg.getUserID() + "&" + this.bg.getSessionA(),
            asynchronous: true,
            onSuccess: function(response) {
              this.getContents(response.responseXML, fid);
            }.bind(this),
            onFailure: function(response) {
              $('message').update(
                this.getMessage(["discussion_data", "loding_fail"
                                 , fid, response.statusText]) );
              dataLayer.push({'event': 'Failure-GetForumContents'
                              + fid + response.statusText });
            }.bind(this),
            onException: function(response,e) {
              $('message').update(
                this.getMessage(["discussion_data", "loding_exception"
                                 , fid, e.message]) );
              dataLayer.push({'event': 'Exception-GetForumContents'
                              + fid + e.message });
            }.bind(this)
          }
        )
      }
    },
    getContents: function(xml, fid) {
      //発言一覧から 発言回数取得
      var postuser = {}
      var namemap = {};
      var counter = {};
      var deleted = {};
      var replied = {};
      $('message').update(
        this.getMessage(["discussion_data", "loding_success", "id"])
          + fid);
      var title = xml.getElementsByTagName("title")[0].innerHTML;
      $('title').update(title);
      chrome.tabs.getCurrent( function(tab) {
        tab.title = title; //TODO: 効果なし tab.update()の対象属性でもなし…
      });
      var entries = xml.getElementsByTagName("entry"); //author, ac:deleted
      console.log("--- Post:" + entries.length);
      for(var i=0; i<entries.length; i++) {
        var deletedFlg
          = entries[i].getElementsByTagName("deleted")[0].innerHTML;
        if ( "false" == deletedFlg ) {
          //削除されていないものだけカウント
          var author = entries[i].getElementsByTagName("author")[0]; //name, uuid
          var uuid = author.getElementsByTagName("uuid")[0].innerHTML;
          if ( isNaN(counter[uuid] ) ) {
            counter[uuid] = 0;
            //最初に見つかった名前を利用する
            var name = author.getElementsByTagName("name")[0].innerHTML;
            namemap[uuid] = name;
          }
          counter[uuid]++;
          var identifier
            = entries[i].getElementsByTagName("identifier")[0].innerHTML
          postuser[identifier] = uuid; //誰のポストか覚えておく
          var relation
            = entries[i].getElementsByTagName("relation")[0].innerHTML;
          if ( 0 !=  relation ) {
            //誰かを参照している
            if ( isNaN(replied[postuser[relation]]) ) {
              replied[postuser[relation]] = 0; //初期化が大切
            }
            replied[postuser[relation]]++;
          }
        } else {
          //削除
          deleted[uuid]++;
        }
      }
      $('message').update(this.getMessage(["count_finish", "id"]) + fid);
      var ranking = [];
      for(var key in counter) {
        ranking.push({"name": namemap[key], "count": counter[key]
                      ,"deleted": deleted[key], "replied": replied[key] });
      }
      ranking.sort( function(a,b) {
        return( b["count"] - a["count"] );
      } );
      for(var i=0; i<ranking.length; i++) {
        var deleted = ranking[i]["deleted"];
        var replied = ranking[i]["replied"];
        var count = ranking[i]["count"];
        if ( isNaN(deleted) ) { deleted = '' };
        if ( isNaN(replied) ) { replied = '' };
        var item = '<tr>'
          + '<th align="right" class="RankingNumber">'+ (i+1) +'</th>'
          + '<td class="RankingName">' + ranking[i]["name"] + '</td>'
          + '<td align="right">' + count + '</td>'
          + '<td align="right">' + deleted +  '</td>'
          + '<td align="right">' + replied + '</td>'
          + '<td align="right">' + Math.round(replied/count*100) + '%</td>'
          + '</tr>';
        $( "ranking_table").insert(item);
      }
    }

  });
  new CountResult();
})();
