// -*- coding: utf-8-unix -*-
(function() {
  var CountResult = Class.create({
    bg: null,
    initialize: function() {
      this.bg = chrome.extension.getBackgroundPage().bg;
      window.addEventListener("load", function(evt) {
        this.start();
      }.bind(this));
    },
    start: function() {
      this.assignMessages();
      this.createTable();
    },
    assignMessages: function() {
      var elems = document.querySelectorAll('*[class^="MSG_"]');
      Array.prototype.forEach.call(elems, function (node) {
        var key = node.className.match(/MSG_(\w+)/)[1];
        var message = chrome.i18n.getMessage(key);
        if (message) { node.textContent = message; }
        //ツールチップも有れば更新
        var attrs = node.attributes;
        Array.prototype.forEach.call(attrs, function(attr) {
          if (attr.name == "title") {
            var key = attr.value.match(/MSG_(\w+)/)[1];
            var message = chrome.i18n.getMessage(key);
            if (message) { attr.value = message; }
          }
        });
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
        );
      }
    },
    getContents: function(xml, fid) {
      //発言一覧から 発言回数取得
      var postuser = {};
      var namemap = {};
      var counter = {};
      var deleted = {};
      var reply = {};
      var ownReply = {};
      var replied = {};
      $('message').update(
        this.getMessage(["discussion_data", "loding_success", "id"])
          + fid);
      var title = xml.getElementsByTagName("title")[0].innerHTML;
      $('title').update(title);
      document.title = title + " " + document.title;

      var entries = xml.getElementsByTagName("entry"); //author, ac:deleted
      console.log("--- Post:" + entries.length);
      for(var i=0; i<entries.length; i++) {
        var author = entries[i].getElementsByTagName("author")[0]; //name, uuid
        var uuid = author.getElementsByTagName("uuid")[0].innerHTML;

        var deletedFlg = entries[i].getElementsByTagName("deleted")[0].innerHTML;
        if ( "false" == deletedFlg ) {
          //削除されていないものだけカウント
          if ( isNaN(counter[uuid] ) ) {
            counter[uuid] = 0;
            //最初に見つかった名前を利用する
            var name = author.getElementsByTagName("name")[0].innerHTML;
            namemap[uuid] = name;
          }
          counter[uuid]++; //発言数カウント
          var identifier //記事番号
            = entries[i].getElementsByTagName("identifier")[0].innerHTML;
          postuser[identifier] = uuid; //誰のポストか覚えておく
          var relation   //参照先
            = entries[i].getElementsByTagName("relation")[0].innerHTML;
          if ( 0 !=  relation ) {
            //誰かを参照している
            if ( isNaN(reply[uuid]) ) {
              reply[uuid] = 0; //初期化が大切
            }
            if ( isNaN(replied[postuser[relation]]) ) {
              replied[postuser[relation]] = 0; //初期化が大切
            }
            if ( postuser[relation] != uuid ) {
              //返信先が自分以外だったら参照数と被参照数カウントアップ
              reply[uuid]++;
              replied[postuser[relation]]++;
            } else {
              //自分でのリプライだった
              if ( isNaN(ownReply[uuid]) ) {
                ownReply[uuid] = 0; //初期化が大切
              }
              ownReply[uuid]++;
            }
          }
        } else {
          //削除されてた
          if ( isNaN(deleted[uuid]) ) { deleted[uuid] = 0; }
          deleted[uuid]++;
        }
      }
      $('message').update(this.getMessage(["count_finish", "id"]) + fid);
      var ranking = [];
      for(var key in counter) {
        ranking.push({"name": namemap[key], "count": counter[key]
                      ,"deleted": deleted[key]
                      ,"reply": reply[key], "ownReply": ownReply[key]
                      ,"replied": replied[key] });
      }
      ranking.sort( function(a,b) {
        return( b["count"] - a["count"] );
      } );
      for(var i=0; i<ranking.length; i++) {
        var count    = ranking[i]["count"];
        var deleted  = ranking[i]["deleted"];
        var reply    = ranking[i]["reply"];
        var ownReply = ranking[i]["ownReply"];
        var replied  = ranking[i]["replied"];
        if ( isNaN(deleted) )  { deleted = ''; };
        if ( isNaN(reply) )    { reply   = ''; };
        if ( isNaN(ownReply) ) { ownReply= ''; };
        if ( isNaN(replied) )  { replied = ''; };
        var item = '<tr>'
          + '<th align="right" class="RankingNumber">'+ (i+1) +'</th>'
          + '<td class="RankingName">' + ranking[i]["name"] + '</td>'
          + '<td align="right">' + count + '</td>'
          + '<td align="right">' + deleted +  '</td>'
          + '<td align="right">' + ownReply + '</td>'
          + '<td align="right">' + reply + '</td>'
          + '<td align="right">' + Math.round(reply/count*100) + '%</td>'
          + '<td align="right">' + replied + '</td>'
          + '<td align="right">' + Math.round(replied/count*100) + '%</td>'
          + '</tr>';
        $( "ranking_table").insert(item);
      }
    }

  });
  new CountResult();
})();
