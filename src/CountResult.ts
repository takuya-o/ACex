// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/// <reference types="jquery" />
/// <reference types="google.visualization" />
/* global Class, chrome, google,  messageUtil, dataLayer, tabHandler, Ajax, e */

// requirejs.config({
//     baseUrl: './',
//     paths: {
//         jquery: 'lib/jquery.min'
//     }
// });
// import MessageUtil = require("./MessageUtil")
// import TabHandler = require("./TabHandler")

class CountResult {
  private static WEEK_MILSEC = 604800000
  //private static DAY_MILSEC =  86400000
  private static  HOUR_MILSEC = 3600000
  private static authorNameCache:{[uuid:string]:string} = {}
  private userID:string = ""
  private sessionA:string = ""
  private isSaveContentInCache:boolean = false //ページを開いた後にオプション変更は効かない
  private chartData:ChartData|null = null
  private setChartData(data:CountingDatum[], minWeek:number, maxWeek:number){
    this.chartData = <ChartData>{};
    this.chartData.data = data;
    this.chartData.minWeek = minWeek;
    this.chartData.maxWeek = maxWeek;
    return this.chartData
  }
  private getChartData() {
    if ( !this.chartData ) {
      console.log("chartData is null.");
    }
    return this.chartData;
  }
  constructor() {
    try {
      google.charts.load('49', {packages: ['line'], 'language': chrome.i18n.getUILanguage() }); //'current'
      //https://developers.google.com/chart/interactive/docs/release_notes?hl=en#Releases 46:Oct2018 49:Jul2020
      google.charts.setOnLoadCallback(this.drawChart.bind(this));
    } catch (e) {
      this.messsage(MessageUtil.getMessage(["exception_occurred", e.message]))
      dataLayer.push({'event': 'Exception-Occurred'+ e.message});
      console.error("ACex: Exception:" + e.name + " " + e.message + " " + e.lineNumber);
    }
    window.addEventListener("load", (_evt:Event) => {
      //start
      MessageUtil.assignMessages();
      TabHandler.assignMessageHandlers(); //backgroundからの通信受信設定
      document.getElementById("force_reload_button")!.onclick = this.onClickForceReload.bind(this);
      (<HTMLAnchorElement>document.getElementById("download")).href = ""
      document.getElementById("download")!.style.pointerEvents = "none"  //キーでは行けちゃうけどね
      chrome.runtime.sendMessage({cmd:BackgroundMsgCmd. GET_SESSION}, (session:BackgroundResponseSession) => {
        //start
        this.userID = session.userID.replace(/^u=/,"")
        this.sessionA = session.sessionA.replace(/^a=/,"")
        this.isSaveContentInCache = session.saveContentInCache
        let query = new URL(window.location.href).searchParams   //chrome.tabs でurlを読まないからtab permissionいらない
        let fid = query.get("fid")
        let forceLoad = new Boolean(query.get("force")).valueOf() //何か入れていないと有効にならない
        if (!fid) {
          console.error("Cannot get fid")
        } else {
          chrome.runtime.sendMessage({cmd: BackgroundMsgCmd.GET_FORUM_CACHE, fid: +fid}, (res:BackgroundResponseForum) => {
            let forum = res.forum //undefinedのこともある
            this.createContents(fid!, forceLoad, forum); //bg揃ってから起動  //fidは必ずある
          })
        }
      })
    })
  }
  private onClickForceReload() {
    let orgUrl = location.href;
    location.replace( orgUrl + "&force=true");
  }
  private downloadEnable(forum:Forum) {
    let content = JSON.stringify( forum );
    let blob = new Blob([ content ], { "type" : "text/json" });
    (<HTMLAnchorElement>document.getElementById("download")).href = window.URL.createObjectURL(blob);
    (<HTMLAnchorElement>document.getElementById("download")).download = forum.title + forum.fid + '.json';
    let download = document.getElementById("download")
    if (!download) {
      console.warn("Cannot find #download")
    } else {
      download.style.pointerEvents = "auto"
    }
  }
  private createContents(fid:string, forceLoad:boolean, forum:Forum|undefined) {
    this.messsage(MessageUtil.getMessage(["loding"]))
    let isSaveContentInCache = this.isSaveContentInCache;
    let doing = true; //開講中の場合は強制更新にするための開講中フラグ
    if ( forum ) {
      let reload = document.getElementById( "force_reload_button" )
      if (!reload ) {
        console.error("Cannot find #force_reload_button")
      } else {
        let cacheDate = new Date(forum.cacheDate)
        let endDay = new Date(forum.end)
        if ( endDay < cacheDate ) {
          doing = false;
          reload.style.display = "";
          if ( isSaveContentInCache && !forum.saveContentInCache ) {
            //オプションでキャッシュに本文保存となっていたけどキャッシュに無い場合強制更新
            forceLoad = true;
          }
        } else {
          reload.style.display="none"; //開講中は常に強制更新なのでボタン消す
        }
      }
    }
    if ( !forceLoad && !doing && forum ) {
      //キャッシュに有り、強制更新や開講中でなく再利用する場合
      console.log("--- Cache Hit Forum Data:" + fid);
      this.messsage(MessageUtil.getMessage(["discussion_data", "cache_hit", "id"])+ fid)
      if ( doing ) {
        //TODO: 開講中差分キャッシュ更新
      }
      this.downloadEnable(forum)
      this.createTable(forum);
    } else {
      //まだ無かった 強制更新の場合 開講中の場合
      console.log("--- Create Forum Data:" + fid);
      dataLayer.push({'event': 'forum-' + fid });
      this.messsage( MessageUtil.getMessage(["discussion_data", "loding", "id"]) + fid )
      $.ajax(
        "https://aircamp.us/svlAC/GetForumContents", //https://bbtmba.aircamp.us/svlAC/GetForumContents
        { method: "GET",
          data: {
            "fid": fid,
            "u": this.userID,
            "a": this.sessionA,
            "format": "json",
            "body": (isSaveContentInCache?"1":"0")
            // &tag=1&msgtype=0&l=ja
          }
        }
      ).done( (response:ForumContents)=>{
        forum = this.createCache(response, fid);
        //URLからforceクリア
        if ( forceLoad ) {
          location.replace(location.href.replace(/&force=.*$/, "")); //履歴にforce=true残さない
          //forceリロードすると再描画(F5リロード)してしまう
        } else {
          //location.hrefを変えるとリロードされるので変えないときだけ
          this.createTable(forum);
        }
      }).fail( (_response, statusText) => {
        this.messsage( MessageUtil.getMessage(["discussion_data", "loding_fail", fid, statusText]) )
        dataLayer.push({'event': 'Failure-GetForumContents'
                        + fid + statusText });
      })
    }
  }
  private getDate(dateStr:string) {
    //"2012-09-08T23:59:59+09:00"
    let date = dateStr.match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/);
    return new Date(+date![1]!, +date![2]!-1, +date![3]!, +date![4]!, +date![5]!, +date![6]!, 0); //本当にあるかは引数次第
  }
  private messsage(msg:string) {
    let message = document.getElementById('message')
    if ( !message ) {
      console.warn("Cannot display message: " + msg)
    } else{
      message.innerText = msg
    }
  }
  private createCache(json:ForumContents, fid:string) { //サーバレスポンスからキャッシュを作る
    //発言一覧から 発言回数取得
    this.messsage( MessageUtil.getMessage(["discussion_data", "loding_success", "id"]) + fid )

    //キャッシュ生成
    //let authors = <Authors>{};
    let forum = <Forum>{};
    forum.fid = fid;
    forum.title = json.title.value; //フォーラムタイトル コース名は入っていない
    forum.updated = this.getDate(json.updated).toISOString();
    forum.start = this.getDate(json.start).toISOString();
    forum.end = this.getDate(json.end).toISOString();
    forum.entry = new Array();
    forum.cacheDate = new Date().toISOString();
    forum.saveContentInCache = this.isSaveContentInCache //Entryにcontent入っているか?

    let entries = json.entry; //author, ac:deleted
    console.log("--- Post:" + entries.length);
    //for(let i=0; i<entries.length; i++) {
    entries.forEach( (entry) => {
      //キャッシュ生成 エントリー
      let author = entry.author; //name, uuid
      let number = entry.identifier; //記事番号
      forum.entry[number] = <ACEntry>{};
      forum.entry[number]!.uuid = author!.uuid;
      if ( !CountResult.authorNameCache[author.uuid]) {//キャッシュに無かったら
        CountResult.authorNameCache[author.uuid] = author.name
        //既にBackgroundにはキャッシュされているかもしれないけど
        ACexMessageSender.send({cmd:BackgroundMsgCmd.SET_AUTHOR_CACHE, uuid:author.uuid, name:author.name}, ()=>{})
      }
      forum.entry[number]!.deleted = entry.deleted;
      forum.entry[number]!.relation = entry.relation;  //参照先
      forum.entry[number]!.updated = this.getDate(<string>entry.updated).toISOString();
      //クライアントタイプは無いときがある
      let clientTypeTag  = entry.clienttype;
      if ( clientTypeTag ) {
        forum.entry[number]!.clienttype = clientTypeTag;
      } else {
        forum.entry[number]!.clienttype = "none";
      }
      //伊藤さんご要望のスレッドデータ - 発言数カウントには利用していない
      forum.entry[number]!.treeid = entry.treeid; //スレッドID = 大元の発言の発言ID
      forum.entry[number]!.depth = entry.depth;   //スレッドでの深さ
      //さらにオプションでコンテンツも保存 数百KB → 1.3MBとかに膨れるので注意
      if (forum.saveContentInCache) {
        forum.entry[number]!.title = entry.title;           //発言のタイトル
        forum.entry[number]!.content = (<{value:string}>entry.content).value; //発言の内容
      }
    })
    //}
    //キャッシュ記録
    ACexMessageSender.send({cmd:BackgroundMsgCmd.SET_FORUM_CACHE, forum:forum}, ()=>{}) //非同期で登録
    this.downloadEnable(forum)
    return forum;
  }
  private updateTableHeader(forum:Forum, msg:string) {
    let fid = forum.fid;
    this.messsage( MessageUtil.getMessage(["discussion_data", msg, "id"]) + fid )

    //データ更新時刻表示
    let cacheDate = new Date(forum.cacheDate);
    document.getElementById('update_time')!.innerText = cacheDate.toLocaleString()

    //開始日時表示
    let startDay = new Date(forum.start);
    document.getElementById('start_day')!.innerText = startDay.toLocaleString()

    //終了日時表示
    let endDay = new Date(forum.end);
    document.getElementById('end_day')!.innerText = endDay.toLocaleString()

    //終了後にキャッシュしてある場合は強制更新ボタンを有効にする
    if ( endDay > cacheDate ) {
      (<HTMLInputElement>document.getElementById( "force_reload_button" )).disabled = false
    }

    //タイトル表示
    let title = forum.title;
    document.getElementById('title')!.innerText = title
    document.title = title + " " + document.title;
  }
  private calcWeeklyData(forum:Forum) {
    function getStartTime(title:string, startDate:Date) {
      //人別 週別 データ作成
      let start = startDate.getTime();
      if (  title.indexOf("RTOCS") != -1 ) { //RTOCSだった
        let days = startDate.getDay();
        if (days == 0 || days == 7 ) { //スタートが日曜日だったら20:00にする RTOCS補正
          start = start + ( CountResult.HOUR_MILSEC * 20 );
          //開始日時刻 表示更新
          document.getElementById('start_day')!.innerText = new Date(start).toLocaleString()
        }
      }
      return start
    }
    function getMinPost(title:string) {
      let minPost = 1; //最低投稿数 普通は週に1件 2件もあるので黄色
      if (  title.indexOf("RTOCS") != -1 ) { //RTOCSだった
        if (  title.indexOf("振り返り") == -1 ) { //振り返り以外のRTOCSだった
          minPost = 3; //RTOCSは週に3件必要
        } //振り返りは1件
      }
      return minPost
    }

    let chartData = this.getChartData();
    if ( chartData != null ) {
      console.log("Chart data cache hit.");
      return chartData; //キャッシュ・ヒット
    }
    let start = getStartTime(forum.title, new Date(forum.start))
    forum.minPost = getMinPost(forum.title)

    let data = <CountingDatum[]>new Array();
    let uuids:{[key:string]: number } = {};
    let index = 0;
    let minWeek = 999;
    let maxWeek = -999;
    for(let number=0; number<forum.entry.length; number++) { //for inはダメで実際は1からだけど
      if ( forum.entry[number] && !forum.entry[number]!.deleted ){
        //削除されていないものだけ収集
        let uuid = forum.entry[number]!.uuid;
        let relation = forum.entry[number]!.relation;  //参照先
        if ( relation==0 || forum.entry[relation]!.uuid != uuid ) {
          //返信先が無いか、自分以外からの返信だった
          let update = new Date( forum.entry[number]!.updated ).getTime(); //日付UTC
          //第1週〜 ただし事務はそれ以前の発言もある
          let week = Math.floor( (update - start)/CountResult.WEEK_MILSEC )+1; //切り捨て
          if ( week < 0 ) { week = 0; } //開始以前は0週目とする -1週避け
          if ( week < minWeek ) { minWeek = week; }
          if ( week > maxWeek ) { maxWeek = week; }

          let uuidIndex = uuids[uuid]! //なくても良い
          if ( isNaN(uuidIndex) ) {  //初めて出てきた人
            data[index] = <CountingDatum>{};
            data[index]!.d = new Array();
            data[index]!.d[week] = 1;
            data[index]!.uuid = uuid;
            uuids[uuid] = index++;
          } else {
            if ( isNaN(data[uuidIndex]?.d[week]!) ) { //その人で初めて出てきた週 .d[]が無いとundefinedで数値でないのでfalse
              data[uuidIndex]!.d[week] = 1;
            } else {
              data[uuidIndex]!.d[week]++;
            }
          }
        }
      }
    }
    data.sort( (a:CountingDatum,b:CountingDatum)=>{
      let bSum = this.arraySum(b);
      let aSum = this.arraySum(a);
      return( bSum - aSum );
    })
    return this.setChartData(data, minWeek, maxWeek)  //nullが入らない this.getChartData()だとnullがあり得る
  }
  private arraySum(data:CountingDatum) {
    let sum = 0;
    data.d.forEach( (element:number) => {
      sum += element;
    })
    return sum;
  }
  private fillAuthorCache(i:number=0, data:Array<ACEntry|CountingDatum>, sendResponse:()=>void) {
    if (i%10===0) { console.log("filleDataTableHeader()",i) } //AuthorNameCache更新 ログは10回に一度
    if ( i<data.length ) {
        if ( data[i] && !CountResult.authorNameCache[data[i]!.uuid]) { //ACentryのdata[0]はempty  data[i]は必ずある
         ACexMessageSender.send({cmd:BackgroundMsgCmd.GET_AUTHOR_CACHE, uuid:data[i]!.uuid}, (ret) => {
          let response = <BackgroundResponseName>ret //なんか必ず返ってくる
           if ( !response.name ) {
             console.error("Can not found Author name in Background.", data[i]!.uuid)
             response.name = "" //Non In Cache
           }
           CountResult.authorNameCache[data[i]!.uuid] = response.name
           this.fillAuthorCache(++i, data, sendResponse)
         })
        } else {
         this.fillAuthorCache(++i, data, sendResponse)
        }
    } else {
      sendResponse()
    }
  }
  private drawChart() {
    let chartData = this.getChartData();
    if ( !chartData ) {
      console.log("nothing chart Data.");
    } else {
      this.fillAuthorCache(0, chartData.data, () => {
        this.drawChartMain(chartData!) //nullはない
      })
    }
  }
  private drawChartMain(chartData:ChartData) {
    let data = new google.visualization.DataTable();
    //タイトル行
    data.addColumn('number', MessageUtil.getMessage(["week_column"]));
    //for(let i=0;i<chartData.data.length;i++) {
    chartData.data.forEach(element => {
      data.addColumn('number', CountResult.authorNameCache[element.uuid]);
    });
    //}
    //データ
    let rows = new Array();
    let last = new Array(chartData.data.length);
    for(let week=chartData.minWeek; week<=chartData.maxWeek; week++ ){
      let row = new Array();
      row.push(week);
      //for(let i=0; i<chartData.data.length; i++) {
      chartData.data.forEach( (data,i) => {
        let count = data.d[week]! //必ずある
        if ( isNaN(count) ) { count = 0; }
        if ( isNaN(last[i]) ) { last[i] = 0; };
        last[i] = last[i] + count; //累積
        row.push(last[i]);
      })
      //}
      if ( week > 0 ) { //開講以前のグラフは表示しない
        rows.push(row);
      }
    }
    //表示すべきデータが無いときにはグラフ表示は行わない
    if ( rows.length <= 0) {
      console.log("nothing chart row Data.");
    } else {
      data.addRows(rows);
      //指定位置にグラフ描画
      let hight = 33 * chartData.data.length;
      if ( hight < 500 ) { hight = 500; }
      let options = {
        chart: {
          //効かず hAxis: { minValue: (chartData.minWeek>0?chartData.minWeek:1), maxValue: chartData.maxWeek },
          title: ' ', //TODO: グラフのタイトルのセット
          subtitle: ' '
        },
        width: (window.innerWidth)-5, //900
        height: hight
      };
      let chart = new google.charts.Line(document.getElementById('linechart_material')!);
      //let chart = new google.visualization.LineChart(document.getElementById('linechart_material')); //@Typeにある古いやり方?
      chart.draw(data, options);
    }
  }
  private createTable(forum:Forum) {
    //キャッシュの場合nameが無いからAuthorCacheを埋めてからスタート
    this.fillAuthorCache(0, forum.entry, ()=>{
      this.createTableMain(forum)
    })
  }
  private createTableMain(forum:Forum) {
    this.updateTableHeader(forum, "create_table");
    document.getElementById( "ranking_table" )!.style.display = "";
    //カウント用の変数準備
    let postuser:{[key:string]: string} = {};
    let counter:{[key:string]: number} = {};
    let deleted:{[key:string]: number} = {};
    let reply:{[key:string]: number} = {};
    let ownReply:{[key:string]: number} = {};
    let replied:{[key:string]: number} = {};
    //キャッシュからページ生成
    for(let i=0; i<forum.entry.length; i++) {
      let entry = forum.entry[i];
      if ( !entry ) {
        continue;
      }
      let uuid = entry.uuid;
      let deletedFlg =  entry.deleted;
      if ( !deletedFlg ) {
        //削除されていないものだけカウント
        if ( isNaN(counter[uuid]! ) ) {
          counter[uuid] = 0;
          //最初に見つかった名前を利用する→最初にキャッシュされた名前を利用する
        }
        counter[uuid]++; //発言数カウント
        let identifier = i; //記事番号
        postuser[identifier] = uuid; //誰のポストか覚えておく
        let relation = entry.relation;  //参照先
        if ( 0 !=  relation ) {
          //誰かを参照している
          if ( isNaN(reply[uuid]!) ) {
            reply[uuid] = 0; //初期化が大切
          }
          if ( isNaN(replied[postuser[relation]!]!) ) {
            replied[postuser[relation]!] = 0; //初期化が大切
          }
          if ( postuser[relation] != uuid ) {
            //返信先が自分以外だったら参照数と相手の記事の被参照数カウントアップ
            reply[uuid]++;
            replied[postuser[relation]!]++;
          } else {
            //自分での返信だった
            counter[uuid]--; //発言数カウント訂正
            if ( isNaN(ownReply[uuid]!) ) {
              ownReply[uuid] = 0; //初期化が大切
            }
            ownReply[uuid]++;
          }
        }
      } else {
        //削除されてた
        if ( isNaN(deleted[uuid]!) ) { deleted[uuid] = 0; }
        deleted[uuid]++;
      }
    } // forum.entryでのforループ

    this.messsage( MessageUtil.getMessage(["count_finish", "id"]) + forum.fid )

    let data = this.calcWeeklyData(forum) //週別も計算 dataは必ず作られる
    //チャートデータが算出できたのでグラフ表示
    this.drawChart();

    if (!data) {
      console.error("No data for weekly count table.",data)
      return;
    }
    //週別情報のテーブルヘッタ追加
    document.getElementById('week_header')!.setAttribute("colspan", ""+ (data.maxWeek-data.minWeek+1))
    for(let week=data.minWeek; week<=data.maxWeek; week++) {
      document.getElementById('table_header_bottom')!.insertAdjacentHTML("beforeend", "<th>" + week + "</th>")
    }

    let ranking:Ranking[] = [];
    for(let uuid in counter) {
      ranking.push({"name": CountResult.authorNameCache[uuid]!, "count": counter[uuid]!
                    ,"deleted": deleted[uuid]!
                    ,"reply": reply[uuid]!, "ownReply": ownReply[uuid]!
                    ,"replied": replied[uuid]!, "uuid": uuid });
    }
    ranking.sort( function(a,b) {
      return( b.count - a.count );
    } );
    //for(let i=0; i<ranking.length; i++) {
    ranking.forEach( (rank, i) => {
      let count    = rank.count
      let deleted  = rank.deleted
      let reply    = rank.reply
      let ownReply = rank.ownReply
      let replied  = rank.replied
      if ( isNaN(deleted) )  { deleted = 0; };
      if ( isNaN(reply) )    { reply   = 0; };
      if ( isNaN(ownReply) ) { ownReply= 0; };
      if ( isNaN(replied) )  { replied = 0; };
      let item = '<tr>'
        + '<th align="right" class="RankingNumber">'+ (i+1) +'</th>'
        + '<td class="RankingName">' + rank["name"] + '</td>'
        + '<td align="right">' + count + '</td>'
        + '<td align="right">' + deleted +  '</td>'
        + '<td align="right">' + ownReply + '</td>'
        + '<td align="right">' + reply + '</td>'
        + '<td align="right">' + Math.round(+reply/count*100) + '%</td>'
        + '<td align="right">' + replied + '</td>'
        + '<td align="right">' + Math.round(+replied/count*100) + '%</td>';
      let tr = document.createElement("tr")
      {//ヘッタ
        let th = document.createElement("th")
        th.setAttribute("align", "right")
        th.setAttribute("class", "RankingNumber")
        th.innerText = ""+(i+1)
        tr.appendChild(th)
      }
      {//一行目
        let td = document.createElement("td")
        td.setAttribute("class", "RankingName")
        td.innerText =  rank["name"]
        tr.appendChild(td);
        [ count, deleted, ownReply, reply,
          Math.round(+reply/count*100) + '%',
          replied,
          Math.round(+replied/count*100) + '%'  ].forEach( (str) => {
            let td = document.createElement("td")
            td.setAttribute("align", "right")
            td.innerText = ""+str
            tr.appendChild(td)
          })
      }
      let d = new Array();
      for( let j=0; j<data.data.length; j++ ) {
        if ( rank.uuid == data.data[j]!.uuid ) {
          d = data.data[j]!.d; break;
        }
      }
      for(let week=data.minWeek; week<=data.maxWeek; week++) {
        let count = d[week];
        if ( isNaN(count) ) { count = 0; }
        let redClass = "";
        if ( count < forum.minPost ) {
          redClass = "red_cell"
        }else if ( count < (forum.minPost+1) ) {
          redClass = "yellow_cell"
        }
        item = item + ('<td align="right"' + (redClass!==""?('class="' + redClass + '" '):"") +'>' + count + '</td>');
        let td = document.createElement("td")
        td.setAttribute("align", "right")
        if ( redClass!=="") { td.setAttribute("class", redClass) }
        td.innerText = count
        tr.appendChild(td)
      }
      item = item + '</tr>';
      //document.getElementById( "ranking_table").insertAdjacentHTML("beforeend", item)
      document.getElementById( "ranking_table")!.appendChild(tr)
    })
    //}

  }
}
new CountResult();
