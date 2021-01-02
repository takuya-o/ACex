// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* global Class, chrome, MessageUtil */

//コンテンツスクリプトではこれできないからMessageUtilLocal.tsにexportなしを作った
// require.config({ //for contents script on require.js
//   baseUrl: chrome.extension.getURL("/")
// });
// import MessageUtil = require("MessageUtil")

class ACex {
  constructor() {
    console.log("--- Start ACex ---");
    MessageUtil.assignMessages();
    let url = window.document.URL;
    //Backgroundに最新url通知
    this.setOpenedUrl(url)
    if ( url.match(/^https?:\/\/(accontent|www)\.(bbt757\.com|ohmae\.ac\.jp)\/content\//) ) {
      //視聴画面の時
      let settings = this.getSettings();
      if ( settings ) { //セッティング情報が見つかったら
        //Videoダウンロード表示
        chrome.runtime.sendMessage(
          {cmd: BackgroundMsgCmd.GET_CONFIGURATIONS}, (response:Configurations) => {
            //コンテント・スクリプトなのでgetBackground()出来ないのでメッセージ
            MessageUtil.checkRuntimeError(BackgroundMsgCmd.GET_CONFIGURATIONS)
            console.log("ACex: isDownloadable() = " + response.downloadable);
            if ( response.downloadable ) {
              this.getVideoSources(settings!) //undefinedではない
            }
            //認証情報表示
            //コンテント・スクリプトなのでgetBackground()出来ないのでメッセージ
            console.log("ACex: isDisplayTelop() = " + response.displayTelop);
            if ( response.displayTelop ) {
              this.getACtelop(settings!) //undefinedではない
          }
        });
      } else {
        console.log("Can not find settings."); //failsafe
      }
    } else if (url.match(/^https?:\/\/[^.\/]+\.aircamp\.us\/course\//) ) {
      //HTML5版でコース画面
      this.getACconfig();
      //RexExp準備 ツリーからの更新は#以下のURLしか変えない
      //おしらせ一覧などを経由すると/informationなどが入る
      let regexp = /^https?:\/\/[^.\/]+\.aircamp\.us\/course\/\d+(|[\/\?].*)#forum\/(\d+)/; //この正規表現使いまわされるから()の追加には注意
      chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.GET_CONFIGURATIONS}, (response:Configurations) => {
        //コンテント・スクリプトなのでgetBackground()出来ないのでメッセージ
        MessageUtil.checkRuntimeError(BackgroundMsgCmd.GET_CONFIGURATIONS)
        console.log("ACex: isCountButton() = " + response.countButton);
        if ( response.countButton ) {
          this.injectCountButton(regexp); //カウントボタン追加
        }
        this.updateIcon(url, regexp); //アイコンと有ればボタン更新
      })
      //URL変更検知
      window.addEventListener( "hashchange", (event:HashChangeEvent) => {
        let url = event.newURL;
        this.updateIcon(url, regexp); //アイコンと有ればボタン更新
        this.setOpenedUrl(url) //Backgroundに最新url通知
      })
      //戻ってきたときにOPEND_URLを更新 複数コース画面を開いていた時の対策
      chrome.tabs.getCurrent((tab)=>{
        chrome.tabs.onActivated.addListener((activeInfo)=>{
          //アクティブになったときのリスナー追加
          if (tab?.id===activeInfo.tabId && tab?.windowId===activeInfo.windowId) {
            this.setOpenedUrl(url) //Backgroundに最新url通知
          } else {
            //TODO:知らないtabIdのときにOPEND_URL消したいけど、あちこちでACexが動いていると喧嘩になるので消せないし
          }
        })
      })
    } else {
      //ACweb画面の時
      console.log("AirCumpus for Web.");
      this.getACconfig();
    }
  }
  private setOpenedUrl(url: string) {
    chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.SET_OPENED_URL, url: url }, (_response: BackgroundResponse) => {
      MessageUtil.checkRuntimeError(BackgroundMsgCmd.SET_OPENED_URL);
    });
  }

  private updateIcon(url:string, regexp:RegExp) { //private
    let input =<HTMLButtonElement>document.getElementById('ACexCountButton'); //ボタンが無い場合がある
    let iconText = "";
    //PageActionではバッチテキスト使えない let badgeText = ""
    if ( url.match(regexp) ) {
      //フォーラムを開いているのでボタン有効
      if ( input != null ) { input.disabled = false; }
      console.log("ACexCountButton enable.");
      iconText="COUNT"; //countマーク入りアイコン
      //badgeText="Count";
    } else {
      if ( input != null ) { input.disabled = true; }
      console.log("ACexCountButton disable.");
      iconText="";  //defaultのアイコン
      //badgeText="";
    }
    //Backgroundに最新icon通知
    chrome.runtime.sendMessage( {cmd: BackgroundMsgCmd.SET_ICON, text: iconText}, (_response:BackgroundResponse) => {
      MessageUtil.checkRuntimeError(BackgroundMsgCmd.SET_ICON)
    } );
    // //Backgroundに最新iconバッチテキスト通知
    // chrome.runtime.sendMessage( {cmd: "setBadgeText", text: badgeText}, function(response) {
    //   if (chrome.runtime.lastError) {
    //     console.log("####: sendMessage setBadgeText:",
    //                 chrome.runtime.lastError.message);
    //   }
    // } );
  }
  private injectCountButton(regexp:RegExp) { //private
    //navにボタンをinjection
    let navs =document.getElementsByTagName('nav');
    if ( navs.length > 0 ) { //入れるの早すぎると消されるがリロードで出てくる
      let uls = navs[0]!.getElementsByTagName('ul') //必ずある
      if ( uls.length > 0 ) {
        let input = document.createElement('input');
        input.disabled = true;
        input.setAttribute('id', 'ACexCountButton');
        input.setAttribute('type', 'button');
        input.setAttribute('value', MessageUtil.getMessage(["Count"]));
        input.addEventListener("click", () => {
          //AjaxでURLが毎回変わっていることがあるので取りなおす
          let match = window.document.URL.match(regexp);
          if ( !match ) {
            alert("Faital Error: Can't get forum ID.");
          } else {
            let fid = match[2];
            if (!fid) {
              alert("Faital Error: Can't get forum ID.")
            } else {
              let href= chrome.runtime.getURL("countresult.html"
                                              + "?fid=" + encodeURI(fid));
              chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.OPEN, url: href}, (_response) => {
                //レスポンスでもらう値なしだかコネクション閉じるために受信
                MessageUtil.checkRuntimeError(BackgroundMsgCmd.OPEN)
              });
            }
          }
        });
        let li = document.createElement('li');
        uls[0]!.appendChild( li.appendChild(input) )  //必ずある
      }
    }
  }
  private getSettings() { //ACのsetting情報を取得する
    let settings:Settings|undefined
    let elements = window.document.getElementsByTagName("script");
    console.log("ACex: getSettings " + elements.length );
    for (let i = 0; i < elements.length; i++) {
      let text = elements[i]?.innerText;
      if (text) {
        let match = text.match(/(var|let) settings = ({.*});/);
        if (match) {
          settings = JSON.parse(match[2]!);  //正規表現が間違っていなければ必ずある
          console.log("ACex: getSettings found setting.");
          break;
        }
      }
    }
    return settings;
  }
  private getVideoSources(settings:Settings) {
    //映像ファイル情報取得
    let sources:Sources = (settings.playlist).sources; //[].file & .label
    if ( sources ) {
      let tab=document.getElementById('content-tab1'); //概要タブ
      if (tab) { //入れるの早すぎると消されるがリロードで出てくる
        //for(let i=0; i<sources.length; i++ ) {
        sources.forEach( (source)=> {
          console.log("ACex: Video source " + source.label );
          let title = source.file.match(".+/(.+?)([\?#;].*)?$")?.[1];
          if (!title) { title = "" }
          let titles = window.document.getElementsByTagName("title");
          if (titles) {
            //<title>大前研一アワー 367 の配信は 08月09日 22時30分から</title>
            //<title>大前研一アワー 368 の配信は 08月15日 22時30分から【向研会】イタリアの研究 ～国破れて地方都市あり～</title>
            title = titles[0]!.innerText.replace(/ の配信は.*から/,"") //getElement 必ずある
              .replace(/ /g,"") + "_" + title;
          }
          let aElement = document.createElement("a");
          aElement.setAttribute("href", source.file);
          aElement.setAttribute("download", title);
          aElement.innerText = source.label;
          tab!.prepend(aElement) //必ずある
        })
        //}
      } else {
          console.log("ACex: Can not find the tab.");
      }
    } else {
      console.log("ACex: Can not find Video source information"); //failsafe
    }
  }
  private getACtelop(settings:Settings) {
    let datas:(string)[][] = new Array()
    console.log("ACex: getACtelop" );
    //テロップ情報取得
    let telops = settings.telop;
    if ( telops ) { //テロップ情報が有ったら
      let data:string[]
      if ( settings.data ) { //認証済み情報も取得
        //"data": "C,S,0,2015/08/10 07:32:01;I,6,537;"
        data = (<string>settings.data).split(";");
      } else {
        data = new Array(); //failsafe 認証済み情報が無いときもある
      }
      //「,」区切りの文字列も配列に展開しておく
      for(let j=0; j<data.length; j++) {
        let dataCmd = data[j]?.split(",");
        if ( !dataCmd ) {
          datas[j] = []
        } else {
          datas[j] = dataCmd;
        }
      }
      //console.log("ACex: telops=" + telops );
      let tab=document.getElementById('content-tab1'); //概要タブ
      if (tab) { //入れるの早すぎると消されるがリロードで出てくる
        for(let i=0; i<telops.length; i++) {
          //テロップ時間を文字列として取り出し行く
          //"telop": [{"choices": "6FAES", "id": "31614", "value": "6", "time": 537},..]
          let telop = this.getHourString( new Date( +telops[i]!.time * 1000 )) //必ずあるはず
          //該当のtelopの認証済み情報を検索
          for(let j=0; j<datas.length; j++) {
            let dataCmd = <string[]>datas[j];
            if ( dataCmd!.length >= 3 && dataCmd[0]==="I" && dataCmd[1]===telops[i]?.value ) {
              //該当のテロップの認証済み情報取得して文字列に追加
              telop = telop + "  " + dataCmd[1] + ";"
                + this.getHourString( new Date( +dataCmd[2]! * 1000 )) //必ずある
              dataCmd[1]="";  //また見つけないように消しておく
              break; //一つみつけたらOK
            }
          }
          console.log("ACex: time=" + telop);
          let pElement = document.createElement("p")
          pElement.append(MessageUtil.getMessage(["auth_time"]) + telop) //append()はstringもOK
          tab.append(pElement)
        }
      }
    }else{
      console.log("ACex: no telop");
    }
  }
  private getHourString(date:Date) { //時間を文字列 0:00:00 にする
    return date.getUTCHours() + ":"
      + ("00" + date.getUTCMinutes()).slice(-2) + ":"
      + ("00" + date.getUTCSeconds()).slice(-2);
  }
  private getACconfig() {
    let sessionA = "";
    let userID = "";
    let elements = window.document.getElementsByTagName("script");
    //alert(elements.length + "個の要素を取得しました");
    for (let i = 0; i < elements.length; i++) {
      let text = elements[i]?.innerText;
      if (text) {
        //alert(i + ":" + elements[i].innerText);
        let match = text.match(/a=\w+/);
        if (match) { sessionA = match[0]!; } //正規表現間違えなければ必ずある
        match = text.match(/u=\w+/);
        if (match) { userID = match[0]!; } //正規表現間違えなければ必ずある
        if (sessionA && userID) { break; } //見つかったら終わり
      }
    }
    chrome.runtime.sendMessage(
      {cmd: BackgroundMsgCmd.SET_SESSION, userID: userID, sessionA: sessionA}, () => {
        //レスポンスでもらう値なしだかコネクション閉じるために受信
        MessageUtil.checkRuntimeError(BackgroundMsgCmd.SET_SESSION)
      });
    console.log("ACex: " + userID + " : " + sessionA);
  }

}
new ACex()
