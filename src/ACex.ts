// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* tslint:disable:object-literal-sort-keys */
/* tslint:disable:variable-name */
/* eslint-disable max-lines */

import { BackgroundMsgCmd, BackgroundResponse, Configurations, Settings, Sources, airCampusHTML5Regexp } from './Types'
import { MessageUtil } from './MessageUtil'

//コンテンツスクリプトではこれできないからMessageUtilLocal.tsにexportなしを作った
// require.config({ //for contents script on require.js
//   baseUrl: chrome.extension.getURL("/")
// });
// import MessageUtil = require("MessageUtil")

class ACex {
  constructor() {
    console.log('--- Start ACex ---')
    MessageUtil.assignMessages()
    const url = document.URL
    if (url.match(/^https?:\/\/(accontent|www)\.(bbt757\.com|ohmae\.ac\.jp)\/content\//)) {
      //視聴画面の時
      const settings = this.getSettings()
      if (settings) {
        //セッティング情報が見つかったら
        this.constructorSetupPlayerScreen(settings)
      } else {
        console.log('Can not find settings.') //failsafe
      }
    } else if (url.match(/^https?:\/\/[^./]+\.aircamp\.us\/course\//)) {
      //HTML5版でコース画面
      this.getACconfig()
      this.constructorSetupHTMLcousesScreen(url)
    } else {
      //ACweb画面の時
      console.log('AirCumpus for Web.')
      this.getACconfig()
    }
    //URL渡し用のメッセージハンドラ
    chrome.runtime.onMessage.addListener(
      (msg: { cmd: string }, _sender: chrome.runtime.MessageSender, sendResponse: (_res: string) => void) => {
        console.log('--- Recv ACex:', msg)
        if (msg.cmd === 'getUrl') {
          sendResponse(document.URL) //このタブのURLを返す
        } else {
          console.log('--- Recv ACex: Unknown message.')
          sendResponse('Unknown cmd:' + msg.cmd) //とりあえず無視
        }
      },
    )
    console.log('assign onMessage ')
  }

  private constructorSetupPlayerScreen(settings: Settings) {
    //Videoダウンロード表示
    chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.GET_CONFIGURATIONS }, (response: Configurations) => {
      //コンテント・スクリプトなのでgetBackground()出来ないのでメッセージ
      MessageUtil.checkRuntimeError(BackgroundMsgCmd.GET_CONFIGURATIONS)
      console.log('ACex: isDownloadable() = ' + response.downloadable)
      if (response.downloadable) {
        this.getVideoSources(settings!) //undefinedではない
      }
      //認証情報表示
      //コンテント・スクリプトなのでgetBackground()出来ないのでメッセージ
      console.log('ACex: isDisplayTelop() = ' + response.displayTelop)
      if (response.displayTelop) {
        this.getACtelop(settings!)
      }
    })
  }

  private constructorSetupHTMLcousesScreen(url: string) {
    //RexExp準備 ツリーからの更新は#以下のURLしか変えない
    //おしらせ一覧などを経由すると/informationなどが入る
    chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.GET_CONFIGURATIONS }, (response: Configurations) => {
      //コンテント・スクリプトなのでgetBackground()出来ないのでメッセージ
      MessageUtil.checkRuntimeError(BackgroundMsgCmd.GET_CONFIGURATIONS)
      console.log('ACex: isCountButton() = ' + response.countButton)
      if (response.countButton) {
        this.injectCountButton() //カウントボタン追加
      }
      this.updateIcon(url) //アイコンと有ればボタン更新
    })
    //URL変更検知
    window.addEventListener('hashchange', (event: HashChangeEvent) => {
      const newURL = event.newURL
      this.updateIcon(newURL)
    })
  }

  private updateIcon(url: string) {
    const input = document.getElementById('ACexCountButton') as HTMLButtonElement //ボタンが無い場合がある
    let iconText = ''
    //PageActionではバッチテキスト使えない let badgeText = ""
    if (url.match(airCampusHTML5Regexp)) {
      //フォーラムを開いているのでボタン有効
      if (input) {
        input.disabled = false
      }
      console.log('ACexCountButton enable.')
      iconText = 'COUNT' //countマーク入りアイコン
      //badgeText="Count";
    } else {
      if (input) {
        input.disabled = true
      }
      console.log('ACexCountButton disable.')
      iconText = '' //defaultのアイコン
      //badgeText="";
    }
    //chrome.action.enable() //コンテンツスクリプトでは使えない?
    //chrome.action.setBadgeText({text:"OK"})
    //Backgroundに最新icon通知
    chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.SET_ICON, text: iconText }, (_response: BackgroundResponse) => {
      MessageUtil.checkRuntimeError(BackgroundMsgCmd.SET_ICON)
    })
    // //Backgroundに最新iconバッチテキスト通知
    // chrome.runtime.sendMessage( {cmd: "setBadgeText", text: badgeText}, function(response) {
    //   if (chrome.runtime.lastError) {
    //     console.log("####: sendMessage setBadgeText:",
    //                 chrome.runtime.lastError.message);
    //   }
    // } );
  }
  private injectCountButton() {
    //navにボタンをinjection
    const navs = document.getElementsByTagName('nav')
    if (navs.length > 0) {
      //入れるの早すぎると消されるがリロードで出てくる
      const uls = navs[0]!.getElementsByTagName('ul') //必ずある
      if (uls.length > 0) {
        const input = document.createElement('input')
        input.disabled = true
        input.setAttribute('id', 'ACexCountButton')
        input.setAttribute('type', 'button')
        input.setAttribute('value', MessageUtil.getMessage(['Count']))
        input.addEventListener('click', () => {
          //AjaxでURLが毎回変わっていることがあるので取りなおす
          const match = document.URL.match(airCampusHTML5Regexp) //location.hrefやchrome.tabs.query()で取るもの?
          if (!match) {
            alert("Faital Error: Can't get forum ID.")
          } else {
            const fid = match[match.length - 1]
            if (!fid) {
              alert("Faital Error: Can't get forum ID.")
            } else {
              const href = chrome.runtime.getURL('countresult.html' + '?fid=' + encodeURI(fid))
              chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.OPEN, url: href }, _response => {
                //レスポンスでもらう値なしだかコネクション閉じるために受信
                MessageUtil.checkRuntimeError(BackgroundMsgCmd.OPEN)
              })
            }
          }
        })
        const li = document.createElement('li')
        uls[0]!.appendChild(li.appendChild(input)) //必ずある
      }
    }
  }
  private getSettings() {
    //ACのsetting情報を取得する
    let settings: Settings | undefined
    const elements = Array.from(document.getElementsByTagName('script'))
    console.log('ACex: getSettings ' + elements.length)
    for (const element of elements) {
      const text = element.innerText
      if (text) {
        const match = text.match(/(var|let) settings = ({.*});/)
        if (match) {
          settings = JSON.parse(match[2]!) //正規表現が間違っていなければ必ずある
          console.log('ACex: getSettings found setting.')
          break
        }
      }
    }
    return settings
  }
  private getVideoSources(settings: Settings) {
    //映像ファイル情報取得
    const sources: Sources = settings.playlist.sources //[].file & .label
    if (sources) {
      const tab = document.getElementById('content-tab1') //概要タブ
      if (tab) {
        //入れるの早すぎると消されるがリロードで出てくる
        //for(let i=0; i<sources.length; i++ ) {
        sources.forEach(source => {
          console.log('ACex: Video source ' + source.label)
          let title = source.file.match('.+/(.+?)([?#;].*)?$')?.[1]
          if (!title) {
            title = ''
          }
          const titles = document.getElementsByTagName('title')
          if (titles) {
            //<title>大前研一アワー 367 の配信は 08月09日 22時30分から</title>
            //<title>大前研一アワー 368 の配信は 08月15日 22時30分から【向研会】イタリアの研究 ～国破れて地方都市あり～</title>
            title =
              titles[0]!.innerText
                .replace(/ の配信は.*から/, '') //getElement 必ずある
                .replace(/ /g, '') +
              '_' +
              title
          }
          const aElement = document.createElement('a')
          aElement.setAttribute('href', source.file)
          aElement.setAttribute('download', title)
          aElement.innerText = source.label
          tab!.prepend(aElement) //必ずある
        })
        //}
      } else {
        console.log('ACex: Can not find the tab.')
      }
    } else {
      console.log('ACex: Can not find Video source information') //failsafe
    }
  }
  private getACtelop(settings: Settings) {
    const datas: string[][] = new Array<string[]>()
    console.log('ACex: getACtelop')
    //テロップ情報取得
    const telops = settings.telop
    if (telops) {
      //テロップ情報が有ったら
      let data: string[]
      if (settings.data) {
        //認証済み情報も取得
        //"data": "C,S,0,2015/08/10 07:32:01;I,6,537;"
        data = (settings.data as string).split(';')
      } else {
        data = new Array<string>() //failsafe 認証済み情報が無いときもある
      }
      //「,」区切りの文字列を配列に展開しておく
      this.splitByCamma(data, datas)
      //console.log("ACex: telops=" + telops );
      const tab = document.getElementById('content-tab1') //概要タブ
      if (tab) {
        //入れるの早すぎると消されるがリロードで出てくる
        for (const telop of telops) {
          //テロップ時間を文字列として取り出し行く
          //"telop": [{"choices": "6FAES", "id": "31614", "value": "6", "time": 537},..]
          let telopString = this.getHourString(new Date(+telop.time * 1000)) //必ずあるはず
          //該当のtelopの認証済み情報を検索
          for (const dataCmd of datas) {
            if (dataCmd.length >= 3 && dataCmd[0] === 'I' && dataCmd[1] === telop.value) {
              //該当のテロップの認証済み情報取得して文字列に追加
              telopString = `${telopString}  ${dataCmd[1]};${this.getHourString(new Date(+dataCmd[2]! * 1000))}`
              dataCmd[1] = '' //また見つけないように消しておく
              break //一つみつけたらOK
            }
          }
          console.log('ACex: time=' + telopString)
          const pElement = document.createElement('p')
          pElement.append(MessageUtil.getMessage(['auth_time']) + telopString) //append()はstringもOK
          tab.append(pElement)
        }
      }
    } else {
      console.log('ACex: no telop')
    }
  }
  private splitByCamma(data: string[], datas: string[][]) {
    //「,」区切りの文字列を配列に展開しておく
    for (let j = 0; j < data.length; j++) {
      const dataCmd = data[j]?.split(',')
      if (!dataCmd) {
        datas[j] = [] as string[]
      } else {
        datas[j] = dataCmd
      }
    }
  }

  private getHourString(date: Date) {
    //時間を文字列 0:00:00 にする
    return (
      date.getUTCHours() + ':' + ('00' + date.getUTCMinutes()).slice(-2) + ':' + ('00' + date.getUTCSeconds()).slice(-2)
    )
  }
  private getACconfig() {
    let sessionA = ''
    let userID = ''
    const elements = Array.from(document.getElementsByTagName('script'))
    //alert(elements.length + "個の要素を取得しました");
    for (const element of elements) {
      const text = element.innerText
      if (text) {
        //alert(i + ":" + elements[i].innerText);
        let match = text.match(/a=\w+/)
        if (match) {
          sessionA = match[0]!
        } //正規表現間違えなければ必ずある
        match = text.match(/u=\w+/)
        if (match) {
          userID = match[0]!
        } //正規表現間違えなければ必ずある
        if (sessionA && userID) {
          break
        } //見つかったら終わり
      }
    }
    chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.SET_SESSION, userID, sessionA }, () => {
      //レスポンスでもらう値なしだかコネクション閉じるために受信
      MessageUtil.checkRuntimeError(BackgroundMsgCmd.SET_SESSION)
    })
    console.log('ACex: ' + userID + ' : ' + sessionA)
  }
}
// tslint:disable-next-line: no-unused-expression
new ACex()
