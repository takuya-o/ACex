// -*- coding: utf-8-unix -*-
/* global Class, chrome, google,  messageUtil, dataLayer, tabHandler, Ajax, e */
(function() {
  var CountResult = Class.create({
    WEEK_MILSEC: 604800000,
    DAY_MILSEC:  86400000,
    HOUR_MILSEC:  3600000,
    bg: null,
    chartData: null,
    setChartData: function(data, minWeek, maxWeek){
      this.chartData = {};
      this.chartData.data = data;
      this.chartData.minWeek = minWeek;
      this.chartData.maxWeek = maxWeek;
      //チャートデータが算出できたのでグラフ表示
      this.drawChart();
      return(this.chartData);
    },
    getChartData: function() {
      if ( !this.chartData ) {
        console.log("chartData is null.");
      }
      return this.chartData;
    },
    initialize: function() {
      this.bg = chrome.extension.getBackgroundPage().bg;
      try {
        google.load('visualization', '1.1', {packages: ['line']});
      } catch (e) {
        $('message').update(
                messageUtil.getMessage(["exception_occurred", e.message]));
        dataLayer.push({'event': 'Exception-Occurred'+ e.message});
        console.log("ACex: Exception:" + e.name + " " + e.message + " " + e.lineNumber);
      }
      google.setOnLoadCallback(this.drawChart.bind(this));
      window.addEventListener("load", function(evt) {
        this.start();
      }.bind(this));
    },
    start: function() {
      messageUtil.assignMessages();
      tabHandler.assignMessageHandlers(this); //backgroundからの通信受信設定
      $("force_reload_button").onclick = this.onClickForceReload.bind(this);
      this.createContents();
    },
    onClickForceReload: function () {
      var orgUrl = location.href;
      location.replace( orgUrl + "&force=true");
    },
    createContents: function() {
      var query = window.location.search.toQueryParams();
      var fid = query["fid"];
      var forceLoad = query["force"]; //何か入れていないと有効にならない

      $('message').insert(messageUtil.getMessage(["loding"]));

      var forum = this.bg.getForumCache(fid);
      var doing = true; //開講中の場合は強制更新にするための開講中フラグ
      if ( forum ) {
        var cacheDate = new Date(forum.cacheDate);
        var endDay = new Date(forum.end);
        if ( endDay < cacheDate ) {
          doing = false;
          $( "force_reload_button" ).style.display = "";
        } else {
          $( "force_reload_button" ).style.display="none"; //開講中は常に強制更新なのでボタン消す
        }
      }

      if ( !forceLoad && forum && !doing) {
        //キャッシュに有った場合
        console.log("--- Cache Hit Forum Data:" + fid);
        $('message').update(
          messageUtil.getMessage(["discussion_data", "cache_hit", "id"])
            + fid);
        if ( doing ) {
          //TODO: 差分キャッシュ更新
        }
        this.createTable(forum);
      } else {
        //まだ無かった 強制更新の場合 開講中の場合
        console.log("--- Create Forum Data:" + fid);
        dataLayer.push({'event': 'forum-' + fid });
        $('message').update(messageUtil.getMessage(["discussion_data", "loding", "id"])
                            + fid);
        var courseListAjax = new Ajax.Request(
          "https://www.bbt757.com/svlAC/GetForumContents", //https://bbtmba.aircamp.us/svlAC/GetForumContents
          { method: "get",
            parameters: "fid=" + fid + "&" + this.bg.getUserID() + "&" + this.bg.getSessionA()
            + "&format=json", // &body=1&format=json&tag=1&msgtype=0
            asynchronous: true,
            onSuccess: function(response) {
              var json=JSON.parse(response.responseText);
              forum = this.createCache(json, fid);
              //URLからforceクリア
              if ( forceLoad ) {
                location.href = location.href.replace(/&force=.*$/, "");
              } else {
                //location.hrefを変えるとリロードされるので変えないときだけ
                this.createTable(forum);
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
              console.log("ACex: Exception:" + e.name + " " + e.message + " " + e.lineNumber);
            }.bind(this)
          }
        );
      }
    },
    getDate: function(dateStr) {
      //"2012-09-08T23:59:59+09:00"
      var date = dateStr.match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/);
      return new Date(date[1], date[2]-1, date[3]
                      , date[4], date[5], date[6], 0);
    },
    createCache: function(json, fid) {
      //発言一覧から 発言回数取得
      $('message').update(
        messageUtil.getMessage(["discussion_data", "loding_success", "id"])
          + fid);

      //キャッシュ生成
      var authors = {};
      var forum = {};
      forum.fid = fid;
      forum.title = json.title.value;
      forum.updated = this.getDate(json.updated).toISOString();
      forum.start = this.getDate(json.start).toISOString();
      forum.end = this.getDate(json.end).toISOString();
      forum.entry = new Array();
      forum.cacheDate = new Date().toISOString();

      var entries = json.entry; //author, ac:deleted
      console.log("--- Post:" + entries.length);
      for(var i=0; i<entries.length; i++) {
        //キャッシュ生成 エントリー
        var author = entries[i].author; //name, uuid
        var number = entries[i].identifier; //記事番号
        forum.entry[number] = {};
        forum.entry[number].uuid = author.uuid;
        if ( !this.bg.getAuthorCache(forum.entry[number].uuid) ) { //キャッシュに無かったら
          var name = author.name;
          this.bg.setAuthorCache(forum.entry[number].uuid, name);
        }
        forum.entry[number].deletedFlg = entries[i].deleted;
        forum.entry[number].relation = entries[i].relation;  //参照先
        forum.entry[number].updated = this.getDate(entries[i].updated).toISOString();

        //クライアントタイプは無いときがある
        var clientTypeTag  = entries[i].clienttype;
        if ( clientTypeTag ) {
          forum.entry[number].clienttype = clientTypeTag;
        } else {
          forum.entry[number].clienttype = "none";
        }
      }

      //キャッシュ記録
      this.bg.setForumCache(forum);
      return forum;
    },
    updateTableHeader: function(forum, msg) {
      var fid = forum.fid;
      $('message').update(
        messageUtil.getMessage(["discussion_data", msg, "id"])
          + fid);

      //データ更新時刻表示
      var cacheDate = new Date(forum.cacheDate);
      $('update_time').update(cacheDate.toLocaleString());

      //開始日時表示
      var startDay = new Date(forum.start);
      $('start_day').update(startDay.toLocaleString());

      //終了日時表示
      var endDay = new Date(forum.end);
      $('end_day').update(endDay.toLocaleString());

      //終了後にキャッシュしてある場合は強制更新ボタンを有効にする
      if ( endDay > cacheDate ) {
        $( "force_reload_button" ).disabled = false;
      }

      //タイトル表示
      var title = forum.title;
      $('title').update(title);
      document.title = title + " " + document.title;
    },
    calcWeeklyData: function(forum) {
      var chartData = this.getChartData();
      if ( chartData != null ) {
        console.log("Chart data cache hit.");
        return chartData; //キャッシュ・ヒット
      }
      forum.minPost = 1; //最低投稿数 普通は週に1件 2件もあるので黄色
      //人別 週別 データ作成
      var startDate= new Date(forum.start);
      var start = startDate.getTime();

      if (  forum.title.indexOf("RTOCS") != -1 ) { //RTOCSだった
        var days = startDate.getDay();
        if (days == 0 || days == 7 ) { //スタートが日曜日だったら20:00にする RTOCS補正
          start = start + ( this.HOUR_MILSEC * 20 );
          //開始日時刻 表示更新
          $('start_day').update(new Date(start).toLocaleString());
        }
        if (  forum.title.indexOf("振り返り") == -1 ) { //振り返り以外のRTOCSだった
          forum.minPost = 3; //RTOCSは週に3件必要
        } //振り返りは1件
      }

      var data = new Array();
      var uuids = {};
      var index = 0;
      var minWeek = 999;
      var maxWeek = -999;
      for(var number=0; number<forum.entry.length; number++) { //for inはダメで実際は1からだけど
        if ( forum.entry[number] && !forum.entry[number].deletedFlg ){
          //削除されていないものだけ収集
          var uuid = forum.entry[number].uuid;
          var relation = forum.entry[number].relation;  //参照先
          if ( relation==0 || forum.entry[relation].uuid != uuid ) {
            //返信先が無いか、自分以外からの返信だった
            var update = new Date( forum.entry[number].updated ).getTime(); //日付
            //第1週〜 ただし事務はそれ以前の発言もある
            var week = Math.floor( (update - start)/this.WEEK_MILSEC )+1; //切り捨て
            if ( week < 0 ) { week = 0; } //開始以前は0週目とする -1週避け
            if ( week < minWeek ) { minWeek = week; }
            if ( week > maxWeek ) { maxWeek = week; }

            var uuidIndex = uuids[uuid];
            if ( isNaN(uuidIndex) ) {  //初めて出てきた人
              data[index] = {};
              data[index].d = new Array();
              data[index].d[week] = 1;
              data[index].uuid = uuid;
              uuids[uuid] = index;
              index++;
            } else {
              if ( isNaN(data[uuidIndex].d[week]) ) { //その人で初めて出てきた週
                data[uuidIndex].d[week] = 1;
              } else {
                data[uuidIndex].d[week]++;
              }
            }
          }
        }
      }
      data.sort( function(a,b) {
        var bSum = this.arraySum(b);
        var aSum = this.arraySum(a);
        return( bSum - aSum );
      }.bind(this) );
      return( this.setChartData(data, minWeek, maxWeek) );
    },
    arraySum: function(data) {
      var sum = 0;
      data.d.forEach(function(element) {
        sum += element;
      });
      return sum;
    },
    drawChart: function() {
      var chartData = this.getChartData();
      if ( !chartData ) {
        console.log("nothing chart Data.");
        return;
      }
      var data = new google.visualization.DataTable();
      //タイトル行
      data.addColumn('number', messageUtil.getMessage(["week_column"]));
      for(var i=0; i<chartData.data.length; i++) {
        data.addColumn('number', this.bg.getAuthorCache(chartData.data[i].uuid));
      }
      //データ
      var rows = new Array();
      var last = new Array(chartData.data.length);
      for(var week=chartData.minWeek; week<=chartData.maxWeek; week++ ){
        var row = new Array();
        row.push(week);
        for(var i=0; i<chartData.data.length; i++) {
          var count = chartData.data[i].d[week];
          if ( isNaN(count) ) { count = 0; }
          if ( isNaN(last[i]) ) { last[i] = 0; };
          last[i] = last[i] + count; //累積
          row.push(last[i]);
        }
        if ( week > 0 ) { //開講以前のグラフは表示しない
          rows.push(row);
        }
      }
      data.addRows(rows);
      //指定位置にグラフ描画
      var hight = 33 * chartData.data.length;
      if ( hight < 500 ) { hight = 500; }
      var options = {
        chart: {
          title: ' ', //TODO: タイトルセット
          subtitle: ' '
        },
        width: 900,
        height: hight
      };
      var chart = new google.charts.Line(document.getElementById('linechart_material'));
      chart.draw(data, options);
    },
    createTable: function(forum) {
      this.updateTableHeader(forum, "create_table");
      $( "ranking_table" ).style.display = "";

      //カウント用の変数準備
      var postuser = {};
      var counter = {};
      var deleted = {};
      var reply = {};
      var ownReply = {};
      var replied = {};

      //キャッシュからページ生成
      for(var i=0; i<forum.entry.length; i++) {
        var entry = forum.entry[i];
        if ( !entry ) {
          continue;
        }
        var uuid = entry.uuid;
        var deletedFlg =  entry.deletedFlg;

        if ( !deletedFlg ) {
          //削除されていないものだけカウント
          if ( isNaN(counter[uuid] ) ) {
            counter[uuid] = 0;
            //最初に見つかった名前を利用する→最初にキャッシュされた名前を利用する
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
              //自分での返信だった
              counter[uuid]--; //発言数カウント訂正
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

      $('message').update(messageUtil.getMessage(["count_finish", "id"]) + forum.fid);

      var data = this.calcWeeklyData(forum); //週別も計算

      //週別情報のテーブルヘッタ追加
      $('week_header').setAttribute("colspan", data.maxWeek-data.minWeek+1);
      for(var week=data.minWeek; week<=data.maxWeek; week++) {
        $('table_header_bottom').insert("<th>" + week + "</th>");
      }

      var ranking = [];
      for(var uuid in counter) {
        ranking.push({"name": this.bg.getAuthorCache(uuid), "count": counter[uuid]
                      ,"deleted": deleted[uuid]
                      ,"reply": reply[uuid], "ownReply": ownReply[uuid]
                      ,"replied": replied[uuid], "uuid": uuid });
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
          + '<td align="right">' + Math.round(replied/count*100) + '%</td>';
        var d = new Array();
        for( var j=0; j<data.data.length; j++ ) {
          if ( ranking[i].uuid == data.data[j].uuid ) {
            d = data.data[j].d; break;
          }
        }
        for(var week=data.minWeek; week<=data.maxWeek; week++) {
          var count = d[week];
          if ( isNaN(count) ) { count = 0; }
          var redClass = "";
          if ( count < forum.minPost ) {
            redClass = ' class="red_cell"';
          }else if ( count < (forum.minPost+1) ) {
            redClass = ' class="yellow_cell"';
          }

          item = item + ('<td align="right"' + redClass + '>' + count + '</td>');
        }
        item = item + '</tr>';
        $( "ranking_table").insert(item);
      }

    },

    end: function(forum) {
    }
  });
  new CountResult();
})();
