// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* /// <reference types="jquery" /> */
/// <reference types="google.visualization" />
/* global Class, chrome, google,  messageUtil, dataLayer, tabHandler, Ajax, e */
/* tslint:disable: object-literal-sort-keys */

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

  constructor() {
    window.addEventListener("load", (_evt:Event) => {
      //start
      MessageUtil.assignMessages();
      TabHandler.assignMessageHandlers(); //backgroundからの通信受信設定
      document.getElementById("force_reload_button")!.onclick = this.onClickForceReload.bind(this);
      (document.getElementById("download") as HTMLAnchorElement).href = ""
      document.getElementById("download")!.style.pointerEvents = "none"  //キーでは行けちゃうけどね
      chrome.runtime.sendMessage({cmd:BackgroundMsgCmd. GET_SESSION}, (session:BackgroundResponseSession) => {
        //start
        if ( !session?.userID || !session?.sessionA ) { //sessionがnullのときが有る なんとTabHanderが返信している
          MessageUtil.message(MessageUtil.getMessage(["loding_fail"]))
        }
        this.userID = session.userID.replace(/^u=/,"")
        this.sessionA = session.sessionA.replace(/^a=/,"")
        this.isSaveContentInCache = session.saveContentInCache
        const query = new URL(window.location.href).searchParams   //chrome.tabs でurlを読まないからtab permissionいらない
        const fid = query.get("fid")
        // tslint:disable-next-line: no-construct
        const forceLoad = new Boolean( query.get("force") ).valueOf() //何か入れていないと有効にならない
        if (!fid) {
          console.error("Cannot get fid")
        } else {
          chrome.runtime.sendMessage({cmd: BackgroundMsgCmd.GET_FORUM_CACHE, fid: +fid},
            (res:BackgroundResponseForum) => {
            const forum = res.forum //undefinedのこともある
            this.createContents(fid!, forceLoad, forum); //bg揃ってから起動  //fidは必ずある
          })
        }
      })
    })
  }
  private setChartData(data:CountingDatum[], minWeek:number, maxWeek:number){
    this.chartData = ({} as ChartData);
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
  private onClickForceReload() {
    const orgUrl = location.href;
    location.replace( orgUrl + "&force=true");
  }
  private downloadEnable(forum:Forum) {
    const content = JSON.stringify( forum );
    const blob = new Blob([ content ], { type : "text/json" });
    (document.getElementById("download") as HTMLAnchorElement).href = window.URL.createObjectURL(blob);
    (document.getElementById("download") as HTMLAnchorElement).download = forum.title + forum.fid + ".json";
    const download = document.getElementById("download")
    if (!download) {
      console.warn("Cannot find #download")
    } else {
      download.style.pointerEvents = "auto"
    }
  }
  private createContents(fid:string, forceLoad:boolean, forum:Forum|undefined) {
    MessageUtil.message(MessageUtil.getMessage(["loding"]))
    const isSaveContentInCache = this.isSaveContentInCache;
    let doing = true; //開講中の場合は強制更新にするための開講中フラグ
    if ( forum ) {
      const reload = document.getElementById( "force_reload_button" )
      if (!reload ) {
        console.error("Cannot find #force_reload_button")
      } else {
        const cacheDate = new Date(forum.cacheDate)
        const endDay = new Date(forum.end)
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
      MessageUtil.message(MessageUtil.getMessage(["discussion_data", "cache_hit", "id"])+ fid)
      if ( doing ) {
        //TODO: 開講中差分キャッシュ更新
      }
      this.downloadEnable(forum)
      this.createTable(forum);
    } else {
      //まだ無かった 強制更新の場合 開講中の場合
      console.log("--- Create Forum Data:" + fid);
      dataLayer.push({event: "forum-" + fid });
      MessageUtil.message( MessageUtil.getMessage(["discussion_data", "loding", "id"]) + fid )
      const params = new URLSearchParams()
      params.append("fid", fid)
      params.append("u", this.userID)
      params.append("a", this.sessionA)
      params.append("format", "json")
      params.append("body", (isSaveContentInCache?"1":"0"))
      // &tag=1&msgtype=0&l=ja
      CourseCommon.fetchJSON("https://aircamp.us/svlAC/GetForumContents?", params).then((json) => {
        //https://bbtmba.aircamp.us/svlAC/GetForumContents
        console.log("### GetForumContents:", json)
        forum = this.createCache(json, fid);
        //URLからforceクリア
        if ( forceLoad ) {
          location.replace(location.href.replace(/&force=.*$/, "")); //履歴にforce=true残さない
          //forceリロードすると再描画(F5リロード)してしまう
        } else {
          //location.hrefを変えるとリロードされるので変えないときだけ
          this.createTable(forum);
        }
      }).catch((error) => {
        console.error("### GetForumContents ERR:", error)
        MessageUtil.message( MessageUtil.getMessage(["discussion_data", "loding_fail"])
          + `${fid} ${error.name}:${error.message}` )
        dataLayer.push({event: `Failure-GetForumContents ${error.name}:${error.message}` })
      })
    }
  }

  private createCache(json:ForumContents, fid:string) { //サーバレスポンスからキャッシュを作る
    //発言一覧から 発言回数取得
    MessageUtil.message( MessageUtil.getMessage(["discussion_data", "loding_success", "id"]) + fid )

    //キャッシュ生成
    //let authors = <Authors>{};
    const forum = {} as Forum;
    forum.fid = fid;
    forum.title = json.title.value; //フォーラムタイトル コース名は入っていない
    forum.updated = CourseCommon.getDate(json.updated).toISOString();
    forum.start = CourseCommon.getDate(json.start).toISOString();
    forum.end = CourseCommon.getDate(json.end).toISOString();
    forum.entry = new Array();
    forum.cacheDate = new Date().toISOString();
    forum.saveContentInCache = this.isSaveContentInCache //Entryにcontent入っているか?

    const entries = json.entry; //author, ac:deleted
    console.log("--- Post:" + entries.length);
    //for(let i=0; i<entries.length; i++) {
    entries.forEach( (entry) => {
      //キャッシュ生成 エントリー
      const author = entry.author; //name, uuid
      const no = entry.identifier; //記事番号
      forum.entry[no] = ({} as ACEntry);
      forum.entry[no]!.uuid = author!.uuid; //numberかも
      if ( !CountResult.authorNameCache[author.uuid]) {//キャッシュに無かったら
        CountResult.authorNameCache[author.uuid] = author.name
        //既にBackgroundにはキャッシュされているかもしれないけど
        ACexMessageSender.send({cmd:BackgroundMsgCmd.SET_AUTHOR_CACHE, uuid:author.uuid, name:author.name},
         ()=>{}) // tslint:disable-line: no-empty
      }
      forum.entry[no]!.deleted = entry.deleted;
      forum.entry[no]!.relation = entry.relation;  //参照先
      forum.entry[no]!.updated = CourseCommon.getDate(entry.updated as string).toISOString();
      //クライアントタイプは無いときがある
      const clientTypeTag  = entry.clienttype;
      if ( clientTypeTag ) {
        forum.entry[no]!.clienttype = clientTypeTag;
      } else {
        forum.entry[no]!.clienttype = "none";
      }
      //伊藤さんご要望のスレッドデータ - 発言数カウントには利用していない
      forum.entry[no]!.treeid = entry.treeid; //スレッドID = 大元の発言の発言ID
      forum.entry[no]!.depth = entry.depth;   //スレッドでの深さ
      //さらにオプションでコンテンツも保存 数百KB → 1.3MBとかに膨れるので注意
      if (forum.saveContentInCache) {
        forum.entry[no]!.title = entry.title;           //発言のタイトル
        forum.entry[no]!.content = (entry.content as {value:string}).value; //発言の内容
      }
    })
    //}
    //キャッシュ記録
    ACexMessageSender.send({cmd:BackgroundMsgCmd.SET_FORUM_CACHE, forum},  //非同期で登録
     ()=>{ } ) // tslint:disable-line: no-empty
    this.downloadEnable(forum)
    return forum;
  }
  private updateTableHeader(forum:Forum, msg:string) {
    const fid = forum.fid;
    MessageUtil.message( MessageUtil.getMessage(["discussion_data", msg, "id"]) + fid )

    //データ更新時刻表示
    const cacheDate = new Date(forum.cacheDate);
    document.getElementById("update_time")!.innerText = cacheDate.toLocaleString()

    //開始日時表示
    const startDay = new Date(forum.start);
    document.getElementById("start_day")!.innerText = startDay.toLocaleString()

    //終了日時表示
    const endDay = new Date(forum.end);
    document.getElementById("end_day")!.innerText = endDay.toLocaleString()

    //終了後にキャッシュしてある場合は強制更新ボタンを有効にする
    if ( endDay > cacheDate ) {
      (document.getElementById( "force_reload_button" ) as HTMLInputElement).disabled = false
    }

    //タイトル表示
    const title = forum.title;
    document.getElementById("title")!.innerText = title
    document.title = title + " " + document.title;
  }
  private calcWeeklyData(forum:Forum) { //人別 週別 データ作成
    function getStartTime(title:string, startDate:Date) { // 開始日時を返す(タイトルがRTCOSのときは補正付き)
      // tslint:disable-next-line: no-shadowed-variable
      let start = startDate.getTime();
      if (  title.indexOf("RTOCS") !== -1 ) { //RTOCSだった
        const days = startDate.getDay();
        if (days === 0 || days === 7 ) { //スタートが日曜日だったら20:00にする RTOCS補正
          start = start + ( CountResult.HOUR_MILSEC * 20 );
          //開始日時刻 表示更新
          document.getElementById("start_day")!.innerText = new Date(start).toLocaleString()
        }
      }
      return start
    }
    function getMinPost(title:string) { // 必要発言数を返す(タイトルがRTCOSのときは補正付き)
      let minPost = 1; //最低投稿数 普通は週に1件 2件もあるので黄色
      if (  title.indexOf("RTOCS") !== -1 ) { //RTOCSだった
        if (  title.indexOf("振り返り") === -1 ) { //振り返り以外のRTOCSだった
          minPost = 3; //RTOCSは週に3件必要
        } //振り返りは1件
      }
      return minPost
    }

    const chartData = this.getChartData();
    if ( chartData != null ) {
      console.log("Chart data cache hit.");
      return chartData; //キャッシュ・ヒット
    }
    const start = getStartTime(forum.title, new Date(forum.start))
    forum.minPost = getMinPost(forum.title)

    const data = new Array() as CountingDatum[];
    const uuids:{[key:string]: number } = {};
    let index = 0;
    let minWeek = 999;
    let maxWeek = -999;
    //for(let no=0; no<forum.entry.length; no++) { //for inはダメで実際は1からだけど
    for(const entry of forum.entry ) {
      if ( entry && !entry.deleted ){
        //削除されていないものだけ収集
        const uuid = entry.uuid  //forumに入っているuuidはnumberかも
        const relation = entry.relation;  //参照先
        if ( relation===0 || forum.entry[relation]!.uuid !== uuid ) {
          //返信先が無いか、自分以外からの返信だった
          const update = new Date( entry.updated ).getTime(); //日付UTC
          //第1週〜 ただし事務はそれ以前の発言もある
          let week = Math.floor( (update - start)/CountResult.WEEK_MILSEC )+1; //切り捨て
          if ( week < 0 ) { week = 0; } //開始以前は0週目とする -1週避け
          if ( week < minWeek ) { minWeek = week; }
          if ( week > maxWeek ) { maxWeek = week; }

          const uuidIndex = uuids[uuid]! //なくても良い
          if ( isNaN(uuidIndex) ) {  //初めて出てきた人
            data[index] = ({} as CountingDatum);
            data[index]!.d = new Array();
            data[index]!.d[week] = 1;
            data[index]!.uuid = uuid;
            data[index]!.name = CountResult.authorNameCache[uuid]! // 必ずキャッシュに有る
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
      const bSum = this.arraySum(b);
      const aSum = this.arraySum(a);
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
    if (i%(data.length/10)===0) { console.log("fillAuthorCache() Entry=",i) } //AuthorNameCache更新 ログはEntry数/10ごとに出す。
    if ( i<data.length ) {
        if ( data[i] && !CountResult.authorNameCache[data[i]!.uuid]) { //ACentryのdata[0]はempty  data[i]は必ずある
         ACexMessageSender.send({cmd:BackgroundMsgCmd.GET_AUTHOR_CACHE, uuid:data[i]!.uuid}, (ret) => {
          const response = ret as BackgroundResponseName //なんか必ず返ってくる
           if ( !response.name ) {
             console.error("Can not found Author name in Background.", data[i]!.uuid)
             response.name = "" //Non In Cache  forumキャッシュにはnameは入っていないのいないのでSET_AUTHOR_CACHEはできないので名無し
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
    const postuser:{[key:string]: string} = {};
    const counter:{[key:string]: number} = {};
    const deleted:{[key:string]: number} = {};
    const reply:{[key:string]: number} = {};
    const ownReply:{[key:string]: number} = {};
    const replied:{[key:string]: number} = {};
    //キャッシュからページ生成
    for(let i=0; i<forum.entry.length; i++) {
      const entry = forum.entry[i];
      if ( !entry ) {
        continue;
      }
      const uuid = entry.uuid;
      const deletedFlg =  entry.deleted;
      if ( !deletedFlg ) {
        //削除されていないものだけカウント
        if ( isNaN(counter[uuid]! ) ) {
          counter[uuid] = 0;
          //最初に見つかった名前を利用する→最初にキャッシュされた名前を利用する
        }
        counter[uuid]++; //発言数カウント
        const identifier = i; //記事番号
        postuser[identifier] = uuid; //誰のポストか覚えておく
        const relation = entry.relation;  //参照先
        if ( 0 !==  relation ) {
          //誰かを参照している
          if ( isNaN(reply[uuid]!) ) {
            reply[uuid] = 0; //初期化が大切
          }
          if ( isNaN(replied[postuser[relation]!]!) ) {
            replied[postuser[relation]!] = 0; //初期化が大切
          }
          if ( postuser[relation] !== uuid ) {
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

    // tslint:disable-next-line: max-line-length
    const finishMessages:string[] = /* グラフ出るよ this.noCharts ? ["count_finish", "no_charts", "id"] :*/ ["count_finish", "id"]
    MessageUtil.message( MessageUtil.getMessage(finishMessages) + forum.fid )

    const chartData = this.calcWeeklyData(forum) //週別も計算 dataは必ず作られる setChartData()も済んでいる

    const countingDatum = chartData.data; //this.getChartData()?.data //dataだけどテーブル用とグラフ用では微妙に異なる
    if (!countingDatum) {
      console.error("ACex: Can not postMessage for sandbox by no chart data")
    } else {
      this.fillAuthorCache(0, countingDatum, () => { //AuthorCacheを埋めてから
        // Google Chartをサンドボックス表示
        let hight = 33 * chartData.data.length;
        if ( hight < 500 ) { hight = 500; }
        hight+=50 //少し下駄を入れる
        const iframe = document.getElementById("graph_frame") as HTMLIFrameElement
        iframe.style.height = hight + "px";
        iframe.contentWindow!.postMessage({chartData, language: chrome.i18n.getUILanguage()}, "*")
      })
    }

    if (!chartData) { //このチェツク意味有る?
      console.error("No data for weekly count table.",chartData)
      return;
    }
    //週別情報のテーブルヘッタ追加
    document.getElementById("week_header")!.setAttribute("colspan", ""+ (chartData.maxWeek-chartData.minWeek+1))
    for(let week=chartData.minWeek; week<=chartData.maxWeek; week++) {
      document.getElementById("table_header_bottom")!.insertAdjacentHTML("beforeend", "<th>" + week + "</th>")
    }

    const ranking:Ranking[] = [];
    for(const uuid in counter) { //ここでuuidの型が強制的にstringになるよ 実はuuidはnumber
      if ( uuid ) {
        ranking.push({name: CountResult.authorNameCache[uuid]!, count: counter[uuid]!
                      ,deleted: deleted[uuid]!
                      ,reply: reply[uuid]!, ownReply: ownReply[uuid]!
                      ,replied: replied[uuid]!, uuid });
      }
    }
    ranking.sort( (a,b) => {
      return( b.count - a.count );
    } );

    this.createTableHTML(ranking, chartData, forum.minPost)
  }

  private createTableHTML(ranking: Ranking[], chartData: ChartData, forumMinPost: number) {
    //for(let i=0; i<ranking.length; i++) {
    ranking.forEach((rank, i) => {
      const count = rank.count
      let deleted = rank.deleted
      let reply = rank.reply
      let ownReply = rank.ownReply
      let replied = rank.replied
      if (isNaN(deleted)) { deleted = 0}
      if (isNaN(reply)) { reply = 0} ;
      if (isNaN(ownReply)) { ownReply = 0}
      if (isNaN(replied)) { replied = 0}
      // + '<th align="right" class="RankingNumber">'+ (i+1) +'</th>'
      // + '<td class="RankingName">' + rank["name"] + '</td>'
      // + '<td align="right">' + count + '</td>'
      // + '<td align="right">' + deleted +  '</td>'
      // + '<td align="right">' + ownReply + '</td>'
      // + '<td align="right">' + reply + '</td>'
      // + '<td align="right">' + Math.round(+reply/count*100) + '%</td>'
      // + '<td align="right">' + replied + '</td>'
      // + '<td align="right">' + Math.round(+replied/count*100) + '%</td>';
      const tr = document.createElement("tr")
      { //ヘッタ
        const th = document.createElement("th")
        th.setAttribute("align", "right")
        th.setAttribute("class", "RankingNumber")
        th.innerText = "" + (i + 1)
        tr.appendChild(th)
      }
      { //一行目〜
        const td = document.createElement("td")
        td.setAttribute("class", "RankingName")
        td.innerText = rank.name
        tr.appendChild(td); // ;必要
        [count, deleted, ownReply, reply,
          Math.round(+reply / count * 100) + "%",
          replied,
          Math.round(+replied / count * 100) + "%",
        ].forEach((str) => {
          // tslint:disable-next-line: no-shadowed-variable
          const td = document.createElement("td")
          td.setAttribute("align", "right")
          td.innerText = "" + str
          tr.appendChild(td)
        })
      }
      // 週毎データ
      let d = new Array()
      //for (let j = 0; j < chartData.data.length; j++) {
      for (const data of chartData.data) {   //一応、週テータもソートしてあるけどuuidでマッチを探す
        // tslint:disable-next-line: triple-equals
        if (rank.uuid == data.uuid) { //rank.uuidはstringなので、data.data[j]!.uuidはnumberなので注意
          d = data.d; break
        }
      }
      for (let week = chartData.minWeek; week <= chartData.maxWeek; week++) {
        let weekCount = d[week]
        if (isNaN(weekCount)) { weekCount = 0}
        let redClass = ""
        if (weekCount < forumMinPost) {
          redClass = "red_cell"
        } else if (weekCount < (forumMinPost + 1)) {
          redClass = "yellow_cell"
        }
        // item = item + ('<td align="right"' + (redClass!==""?('class="' + redClass + '" '):"")
        //   +'>' + count + '</td>');
        const td = document.createElement("td")
        td.setAttribute("align", "right")
        if (redClass !== "") { td.setAttribute("class", redClass)}
        td.innerText = weekCount
        tr.appendChild(td)
      }
      // item = item + '</tr>';
      //document.getElementById( "ranking_table").insertAdjacentHTML("beforeend", item)
      document.getElementById("ranking_table")!.appendChild(tr)
    })
    //}
  }
}
// tslint:disable-next-line: no-unused-expression
new CountResult();
