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
      messageUtil.assignMessages();
      tabHandler.assignMessageHandlers(this); //backgroundからの通信受信設定
      $("force_reload_button").onclick = this.onClickForceReload.bind(this);
      this.createTable();
    },
    onClickForceReload: function () {
      var orgUrl = location.href;
      location.replace( orgUrl + "&force=true");
    },
    createTable: function() {
      var query = window.location.search.toQueryParams();
      var fid = query["fid"];
      var forceLoad = query["force"]; //何かいれていないとダメ

      $('message').insert(messageUtil.getMessage(["loding"]));

      var forum = this.bg.getCache(fid);
      if ( !forceLoad && forum ) {
        //キャッシュに有った場合
        console.log("--- Cache Hit Forum Data:" + fid);
        $('message').update(
          messageUtil.getMessage(["discussion_data", "cache_hit", "id"])
            + fid);
        this.createContents(forum);
      } else {
        //まだ無かった
        console.log("--- Create Forum Data:" + fid);
        dataLayer.push({'event': 'forum-' + fid });
        $('message').update(messageUtil.getMessage(["discussion_data", "loding", "id"])
                            + fid);
        var courseListAjax = new Ajax.Request(
          "https://www.bbt757.com/svlAC/GetForumContents",
          { method: "get",
            parameters: "fid=" + fid + "&" + this.bg.getUserID() + "&" + this.bg.getSessionA(),
            asynchronous: true,
            onSuccess: function(response) {
              forum = this.createCache(response.responseXML, fid);
              //URLからforceクリア
              if ( forceLoad ) {
                location.href = location.href.replace(/&force=.*$/, "");
              } else {
                //location.hrefを変えるとリロードされるので変えないときだけ
                this.createContents(forum);
              }
            }.bind(this),
            onFailure: function(response) {
              $('message').update(
                messageUtil.getMessage(["discussion_data", "loding_fail"
                                 , fid, response.statusText]) );
              dataLayer.push({'event': 'Failure-GetForumContents'
                              + fid + response.statusText });
            }.bind(this),
            onException: function(response,e) {
              $('message').update(
                messageUtil.getMessage(["discussion_data", "loding_exception"
                                 , fid, e.message]) );
              dataLayer.push({'event': 'Exception-GetForumContents'
                              + fid + e.message });
            }.bind(this)
          }
        );
      }
    },
    getDate: function(xml, tag) {
      var dateStr = xml.getElementsByTagName(tag)[0].innerHTML;
      //"2012-09-08T23:59:59+09:00"
      var date = dateStr.match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/);
      return new Date(date[1], date[2]-1, date[3]
                      , date[4], date[5], date[6], 0);
    },
    createCache: function(xml, fid) {
      //発言一覧から 発言回数取得
      $('message').update(
        messageUtil.getMessage(["discussion_data", "loding_success", "id"])
          + fid);

      //キャッシュ生成
      var forum = {};
      forum.fid = fid;
      //bgでやる forum.cacheFormatVar = this.bg.getCacheFormatVar();
      forum.title = xml.getElementsByTagName("title")[0].innerHTML;
      forum.updated = this.getDate(xml, "updated").toISOString();
      forum.start = this.getDate(xml, "start").toISOString();
      forum.end = this.getDate(xml, "end").toISOString();
      forum.entry = new Array();
      forum.cacheDate = new Date().toISOString();

      var entries = xml.getElementsByTagName("entry"); //author, ac:deleted
      console.log("--- Post:" + entries.length);
      for(var i=0; i<entries.length; i++) {
        //キャッシュ生成 エントリー
        var author = entries[i].getElementsByTagName("author")[0]; //name, uuid
        var number //記事番号
            = entries[i].getElementsByTagName("identifier")[0].innerHTML;
        forum.entry[number] = {};
        //forum.entry[number].author = author;
        forum.entry[number].name
          = author.getElementsByTagName("name")[0].innerHTML;
        forum.entry[number].uuid = author.getElementsByTagName("uuid")[0].innerHTML;
        forum.entry[number].deletedFlg
          = entries[i].getElementsByTagName("deleted")[0].innerHTML;
        forum.entry[number].relation   //参照先
          = entries[i].getElementsByTagName("relation")[0].innerHTML;
        forum.entry[number].updated = this.getDate(entries[i], "updated").toISOString();

        //クライアントタイプは無いときがある
        var clientTypeTag  = entries[i].getElementsByTagName("clienttype");
        if ( clientTypeTag.length > 0 ) {
          forum.entry[number].clienttype = clientTypeTag[0].innerHTML;
        } else {
          forum.entry[number].clienttype = "none";
        }
      }

      //キャッシュ記録
      this.bg.setCache(forum);
      return forum;
    },
    createContents: function(forum) {
      var fid = forum.fid;
      $('message').update(
        messageUtil.getMessage(["discussion_data", "create_table", "id"])
          + fid);

      //更新時刻表示
      var cacheDate = new Date(forum.cacheDate);
      $('update_time').update(cacheDate.toLocaleString());

      //終了日時表示
      var endDay = new Date(forum.end);
      $('end_day').update(endDay.toLocaleString());

      //終了後にキャッシュした場合は強制更新ボタンを無効にする
      if ( endDay < cacheDate ) {
        $( "force_reload_button" ).disabled = true;
      }

      //カウント用の変数準備
      var postuser = {};
      var namemap = {};
      var counter = {};
      var deleted = {};
      var reply = {};
      var ownReply = {};
      var replied = {};

      //キャッシュからページ生成
      var title = forum.title;
      $('title').update(title);
      document.title = title + " " + document.title;

      for(var i in forum.entry) {
        var entry = forum.entry[i];
        if ( !entry ) {
          continue;
        }
        var uuid = entry.uuid;
        var deletedFlg =  entry.deletedFlg;

        if ( "false" == deletedFlg ) {
          //削除されていないものだけカウント
          if ( isNaN(counter[uuid] ) ) {
            counter[uuid] = 0;
            //最初に見つかった名前を利用する
            namemap[uuid] = entry.name;
          }
          counter[uuid]++; //発言数カウント
          var identifier = i; //記事番号
          postuser[identifier] = uuid; //誰のポストか覚えておく
          var relation = entry.relation;  //参照先
          if ( 0 !=  relation ) {
            //誰かを参照している
            if ( isNaN(reply[uuid]) ) {
              reply[uuid] = 0; //初期化が大切
            }
            if ( isNaN(replied[postuser[relation]]) ) {
              replied[postuser[relation]] = 0; //初期化が大切
            }
            if ( postuser[relation] != uuid ) {
              //返信先が自分以外だったら参照数と相手の記事の被参照数カウントアップ
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
      $('message').update(messageUtil.getMessage(["count_finish", "id"]) + fid);
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
