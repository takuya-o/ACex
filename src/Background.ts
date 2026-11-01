/* eslint-disable max-lines */
// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* tslint:disable:object-literal-sort-keys */
/* tslint:disable:variable-name */

import {
  Author,
  Authors,
  BackgroundMsg,
  BackgroundMsgCmd,
  BackgroundResponse,
  Configurations,
  FontData,
  Forum,
  Forums,
  TabId,
  TextAnnotations,
  TextDetectionResult,
} from './Types'

class Background {
  // page actionポイ動きにする
  // https://developer.chrome.com/docs/extensions/reference/action/#emulating-pageactions-with-declarativecontent
  public static chromeActionDisable() {
    // Page actions are disabled by default and enabled on select tabs
    chrome.action.disable()
    // サンプルにはURLでenbaleする方法も書いてあるが使わない
    // ベーシがACから外れた時にdisableにならない。
  }
  //定数
  private static ASSIGN_TAB_HANDLER_MAX_RETRY = 10 //回
  private static ASSIGN_TAB_HANDLER_RETRY_WAIT = 200 //msまつ
  //private static FONT_FILENAME = 'lib/ipag00303/ipag.ttf'
  //クラス変数
  private static tabList: { [key: string]: number } = {} //Tab管理用連想記憶配列 {}
  //インスタンス変数
  private handlerTab: number | null = null //Eventからの立ち上がりでnullのままだけど、複数登録しても害は無いのでそのまま
  private userID = 'u='
  private sessionA = 'a='
  private coursenameRestrictionEnable = false
  private experimental = false
  private popupWaitForMac = 500
  private downloadable = true
  private displayTelop = false
  private forumMemoryCacheSize = 100
  private countButton = false
  private apiKey = ''
  private supportAirSearchBeta = false
  //キャッシュ
  private forums: Forums = { cacheFormatVer: -1, forum: {} } //とりあえずダミー
  private authors: Authors = { cacheFormatVer: -1, author: {} } //Formキャッシュにはnameを保存せずこちらで一括キャッシュ(容量効率向上)  とりあえずダミー
  private saveContentInCache = false
  constructor() {
    this.initializeClassValue()
    this.assignEventHandlers()
  }
  // オプションをマイグレーションするリリースノートページを開く
  public openReleaseNote() {
    this.openNewTab('ACex_ReleaseNote.html')
  }

  // eslint-disable-next-line max-lines-per-function
  private assignEventHandlers() {
    //private
    //ACex.jsとの通信受信
    chrome.runtime.onMessage.addListener(
      // eslint-disable-next-line max-lines-per-function
      (msg: BackgroundMsg, sender: chrome.runtime.MessageSender, sendResponse: (ret?: BackgroundResponse) => void) => {
        console.log('--- Backgroupd Recv ACex:', msg)
        if (msg.cmd === BackgroundMsgCmd.SET_SESSION) {
          if (!msg.userID || !msg.sessionA) {
            //セッション情報が取れなかった
            console.error('setSession(userID, sessionA): Can not found argument userID or seesionA', msg)
          } else {
            //セッションデータを保存
            this.setACsession(msg.userID, msg.sessionA)
          }
          //pageActionのicon表示
          //chrome.pageAction.show(sender.tab!.id!) //送り主のTabは必ずある
          chrome.action.enable(sender.tab?.id) //送り主のTabは必ずある V3対応
          sendResponse()
        } else if (msg.cmd === BackgroundMsgCmd.SET_ICON) {
          //msg.textは空文字もありうる
          if (msg.text === null || msg.text === undefined) {
            msg.text = ''
          }
          //pageActionのiconのイメージ変更
          // chrome.pageAction.setIcon({
          //   tabId: sender.tab!.id!, //送り主のTabは必ずある
          //   imageData: this.getIconImageData(null/*this.service.icon*/, msg.text)
          // });
          chrome.action.enable(sender.tab?.id) //念の為 アイコンを有効にしてからテキストを書く
          chrome.action.setBadgeBackgroundColor({
            tabId: sender.tab?.id,
            color: 'red',
          })
          chrome.action.setBadgeText({
            //V3対応
            tabId: sender.tab?.id, //送り主のTabは必ずある
            text: msg.text,
          })
          // chrome.pageAction.setTitle({  //V2で変わらなかった
          //   tabId: sender.tab.id,
          //   title: this.icon_title.filter(function(s) {return s;}).join("\n")
          // });
          sendResponse()
          // } else if (msg.cmd === "setBadgeText" ) {
          //   //pageActionのバッチテスキスの変更
          //   chrome.browserAction.setBadgeText({text: msg.text});
          //   sendResponse();
          // } else if (msg.cmd === "isDownloadable" ) {
          //   sendResponse({downloadable: this.isDownloadable()});
          // } else if (msg.cmd === "enableDownloadable" ) {
          //   this.enableDownloadable();
          //   sendResponse();
          // } else if (msg.cmd === "isDisplayTelop" ) {
          //   sendResponse({displayTelop: this.isDisplayTelop()});
          // } else if (msg.cmd === "isCountButton" ) {
          //   sendResponse({countButton: this.isCountButton()});
        } else if (msg.cmd === BackgroundMsgCmd.GET_ZOOM_FACTOR) {
          this.getZoomFactor(sendResponse, sender.tab!) //tabはundefinedにはならない
          return true //async
        } else if (msg.cmd === BackgroundMsgCmd.GET_CAPTURE_DATA) {
          this.getCaptureData(sendResponse, sender.tab!) //tabはundefinedにはならない
          return true //async
        } else if (msg.cmd === BackgroundMsgCmd.GET_AUTHOR_CACHE) {
          if (!msg.uuid) {
            console.error('getAuthorCache(uuid): Can not found argument uuid.', msg.uuid)
            msg.uuid = '' //不明の場合はも何か返す
          }
          sendResponse({ name: this.getAuthorCache(msg.uuid) })
        } else if (msg.cmd === BackgroundMsgCmd.SET_AUTHOR_CACHE) {
          if (!msg.uuid || !msg.name) {
            console.error('setAuthorCache(uuid, name): Can not found argument uuid or name.', msg)
          } else {
            this.setAuthorCache(msg.uuid, msg.name)
          }
          sendResponse()
        } else if (msg.cmd === BackgroundMsgCmd.GET_FORUM_CACHE) {
          if (!msg.fid) {
            console.error('getForumCache(fid): Can not found argument fid.', msg.fid)
            sendResponse({ forum: undefined })
          } else {
            sendResponse({ forum: this.getForumCache(msg.fid) })
          }
        } else if (msg.cmd === BackgroundMsgCmd.SET_FORUM_CACHE) {
          this.checkAndExec(msg.forum, this.setForumCache.bind(this), sendResponse)
        } else if (msg.cmd === BackgroundMsgCmd.OPEN) {
          this.checkAndExec(msg.url, this.openTab.bind(this), sendResponse)
        } else if (msg.cmd === BackgroundMsgCmd.GET_SESSION) {
          if (!this.getUserID() || !this.getSessionA()) {
            console.error(
              'getSession(userID, sessionA): Can not found session data.',
              this.getUserID(),
              this.getSessionA(),
            )
          }
          sendResponse({
            userID: this.getUserID(),
            sessionA: this.getSessionA(),
            crMode: this.isCRmode(),
            saveContentInCache: this.isSaveContentInCache(),
          })
        } else if (msg.cmd === BackgroundMsgCmd.SET_CONFIGURATIONS) {
          this.checkAndExec(msg.config, this.setSpecial.bind(this), sendResponse)
          // } else if (msg.cmd === BackgroundMsgCmd.SET_CONFIG_LICENSE ) {
          //   if(!msg.configLicense) {
          //     console.error("setSpecial: Can not found argument config", msg.configLicense)
          //   } else {
          //     this.setConfigLisence(msg.configLicense)
          //   }
          //   sendResponse()
          // } else if (msg.cmd === BackgroundMsgCmd.SET_CONFIG_LICENSE ) {
          //   if(!msg.configAirSearchBeta) {
          //     console.error("setSpecial: Can not found argument config", msg.configAirSearchBeta)
          //   } else {
          //     this.setConfigAriSearchBeta(msg.configAirSearchBeta)
          //   }
          //   sendResponse()
        } else if (msg.cmd === BackgroundMsgCmd.GET_CONFIGURATIONS) {
          sendResponse({
            experimental: this.isExperimental(),
            countButton: this.isCountButton(),
            cRmode: this.isCRmode(),
            popupWaitForMac: this.getPopupWaitForMac(),
            downloadable: this.isDownloadable(),
            displayTelop: this.isDisplayTelop(),
            forumMemoryCacheSize: this.getForumMemoryCacheSize(),
            saveContentInCache: this.isSaveContentInCache(),
            apiKey: this.getAPIkey(),
            supportAirSearchBeta: this.isSupportAirSearchBeta(),
          })
        } else if (msg.cmd === BackgroundMsgCmd.TEXT_DETECTION) {
          if (!msg.text) {
            console.error('textDetection: Not find argument text', msg.text)
            sendResponse() //Error
          } else {
            this.textDetection(msg.text, sendResponse)
            return true //async
          }
        } else if (msg.cmd === BackgroundMsgCmd.GET_FONTDATA) {
          this.getFontData(sendResponse)
          return true //async
        } else if (msg.cmd === BackgroundMsgCmd.LOG) {
          //Debug用
          console.log('--- Logging ACex:' + msg.message)
          sendResponse()
        } else if (msg.cmd === BackgroundMsgCmd.REMOVE_TAB_ID) {
          if (!msg.tabId) {
            console.error('remoteTabid: Not find argument tabId')
            sendResponse()
          } else {
            this.removeTabId(msg.tabId)
            sendResponse()
          }
        } else if (msg.cmd === BackgroundMsgCmd.GET_TAB_ID) {
          if (!msg.url) {
            msg.url = '' //ダミー = みつからない
          }
          this.getTabId(msg.url, sendResponse)
          return true //async
          // } else if (msg.cmd === BackgroundMsgCmd.GET_MY_TAB_ID) {
          //   sendResponse(sender.tab?.id)
        } else {
          console.log('------ Backgroupd Recv ACex: Unknown message.')
          sendResponse()
        }
        return false //同期
        // tslint:disable-next-line: trailing-comma
      },
    )
    //storage.syncの変更検知
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync') {
        const changeSpecial = changes.Special
        if (changeSpecial) {
          const special:Configurations = changeSpecial.newValue as Configurations
          console.log('--- ACex: sync.Special changed.', special, changes)
          if (special) {
            if (special.couresenameRestriction != undefined) {
              special.cRmode = special.couresenameRestriction
            }
            this.updateClassVars(special)
          }
        }
      }
    })
  }

  private checkAndExec(
    arg: string | Forum | Configurations | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execMethod: (arg: any) => void,
    sendResponse: (ret?: BackgroundResponse) => void,
  ) {
    if (!arg) {
      console.error(`${execMethod.name}: Can not found argument`, arg)
    } else {
      execMethod(arg)
      //this.setForumCache(msg.forum);
    }
    sendResponse()
  }

  private getZoomFactor(sendResponse: (zoomFactor: number) => void, senderTab: chrome.tabs.Tab) {
    if (senderTab.id) {
      //nullのことは無いと思うけど
      chrome.tabs.getZoom(senderTab.id, zoomFactor => {
        //カレントtabのZoom率を取得
        //console.log("Browser Zoom:", zoomFactor)
        sendResponse(zoomFactor)
      })
    }
  }
  private getCaptureData(sendResponse: (dataUrl: string) => void, senderTab: chrome.tabs.Tab) {
    if (senderTab.id) {
      //nullのことは無いと思うけど
      chrome.tabs.getZoom(senderTab.id, zoomFactor => {
        //カレントtabのZoom率を取得
        //アクティブタブのスクリーンショットのデータ取得
        chrome.tabs.setZoom(senderTab.id!, 1.0, () => {
          //ズーム100%に戻して ここに入ってきても描画を待つ必要がある
          setTimeout(() => {
            //待っている間にフォーカスが別のタブに行っているかもしれないので戻す
            chrome.tabs.update(senderTab.id!, { highlighted: true })
            chrome.tabs.captureVisibleTab(senderTab.windowId, { format: 'png' }, dataUrl => {
              //WindowIdを指定してキャプチャ //jpegだと圧縮されるのでpng
              chrome.tabs.setZoom(senderTab.id!, zoomFactor, () => {
                //ズーム元に戻す
                sendResponse(dataUrl)
              }) //setZoom
            }) //capture
          }, 800) //少し(1000ms)待ってから TODO タイミングで良いのか
        }) //resetZoom
      }) //getZoom
    }
  }
  //フォントデータ読み込み
  private getFontData(sendResponse: (res: FontData) => void) {
    sendResponse({ data: '', length: -1 })
    // chrome.runtime.getPackageDirectoryEntry(directoryEntry => {
    //   //V3で呼べなくなった popupからのみ呼べるらしい
    //   directoryEntry.getFile(
    //     Background.FONT_FILENAME,
    //     { create: false },
    //     fileEntry => {
    //       fileEntry.file(file => {
    //         const reader = new FileReader()
    //         reader.onloadend = ev => {
    //           const result = ev?.target?.result as string //"undefined"かも
    //           const font = result.substr(result.indexOf(',') + 1)
    //           console.info(font)
    //           console.info('Font length:', font.length)
    //           sendResponse({ data: font, length: font.length })
    //         }
    //         reader.onerror = ev => {
    //           console.error('Font File Read Error', ev)
    //           reader.abort()
    //           sendResponse({ data: '', length: -1 })
    //         }
    //         reader.readAsDataURL(file)
    //       })
    //     },
    //     fileError => {
    //       console.error('Font File Open Error', fileError)
    //       sendResponse({ data: '', length: -1 })
    //     },
    //   )
    // })
    //V3では "web_accessible_resources":["lib/ipag00303/ipag.ttf"]で読めるかも
    // async function injectHtml():Promise<Blob> {
    //   const res = await fetch(chrome.runtime.getURL(Background.FONT_FILENAME), { method: "GET" })
    //   const blob = await res.blob()
    //   //const dataUrl = (window.URL || window.webkitURL).createObjectURL(blob) //SeriviceWorkerではwindow使えない
    //   return blob
    // }
  }

  //OCRテキスト検出
  // eslint-disable-next-line max-lines-per-function
  private textDetection(base64: string, sendResponse: (res: TextDetectionResult) => void) {
    if (!this.apiKey) {
      //API keyが入っていなければ終わり
      console.log('no API key')
      sendResponse({ result: 'none' })
      return
    }
    const requests = {
      requests: [
        {
          image: { content: base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        },
      ],
    }
    fetch('https://vision.googleapis.com/v1/images:annotate?key=' + this.apiKey, {
      //呼ばれるときにはOptionは取れているハズ
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        //"Authorization": "Bearer " + this.apiKey,
      }),
      mode: 'cors',
      body: JSON.stringify(requests),
    })
      .then(response => {
        if (response.ok) {
          console.log(`--- Ajax OK: ${response.statusText}`, response)
          return response.json()
        } else {
          let addtionalMessage = ''
          if (response.status === 403) {
            addtionalMessage = `: API key is invalid or referrer is not allowed. ${chrome.runtime.getURL('')}`
          }
          console.error(`--- Ajax NG: ${response.status} ${response.statusText}${addtionalMessage}`, response)
          throw new Error(`fetch() Error ${response.status} ${response.statusText}${addtionalMessage}`)
        }
      })
      .then(json => {
        let ans = ''
        let result = 'none'
        if (!json.responses) {
          //API errorすら戻ってない
        } else if (json.responses.error) {
          console.error(`Vision API Error ${json.responses.error.message}`, json.response.error)
          throw new Error(json.responses.error.message)
        } else {
          if (json.responses.length < 1) {
            console.warn(base64) //imgがscript描画されていない疑い
          } else {
            if (!json.responses[0]) {
              //.fullTextAnnotation.textが無いときが有ったので戻り先で注意
            } else {
              ans = json.responses[0].fullTextAnnotation?.text ?? '' //成功
              const textAnnotations = json.responses[0].textAnnotations as TextAnnotations
              // if (textAnnotations) {
              //   ans = textAnnotations.map( (textAnnotation:any)=>{
              //     return textAnnotation.description
              //   }).join("\n")
              // } else {
              //   result = "none"
              // }
              result = 'done'
              console.log('認識結果', result, ans)
              sendResponse({ result, ans, textAnnotations })
            }
          }
        }
        if (result !== 'done') {
          console.log('認識結果', result, ans)
          sendResponse({ result, ans })
        }
      })
      .catch(error => {
        const errorMessage = `Google Vision API ${error.message}`
        console.log(`--- ${errorMessage}`, error)
        sendResponse({ result: 'fail', errorMessage })
      })
  }
  // タブへonRemoveハンドラー設定指示メッセージ送信
  private sendMessageAssignTabHandler(tabId: number, retryCount: number) {
    if (this.handlerTab) {
      //既に登録済み
      chrome.tabs.get(this.handlerTab, (tab: chrome.tabs.Tab) => {
        //まだハンドラーに登録したタブがあるか確認
        if (chrome.runtime.lastError || tab === null) {
          console.log('#-- tab was closed.' + tabId)
          this.handlerTab = null //無かったら消す
        }
        this.assignTabHandler(tabId, retryCount) //非同期なので間に合わないかも
      })
    } else {
      this.assignTabHandler(tabId, retryCount)
    }
  }
  private assignTabHandler(tabId: number, retryCount: number) {
    if (this.handlerTab === null) {
      //eventHandler登録が必要
      console.log('--- assignTabHandlers(' + tabId + ', ' + retryCount-- + ')')
      chrome.tabs.sendMessage(tabId, 'assignTabHandler', _response => {
        if (chrome.runtime.lastError) {
          console.log('####: sendMessage assignTabHandler:', chrome.runtime.lastError.message)
          if (retryCount > 0) {
            //送信が早すぎるとタブが受信準備出来ていないのでリトライ
            console.log('----: sendMessage: Retry.')
            setTimeout(
              function (this: Background) {
                this.sendMessageAssignTabHandler(tabId, retryCount)
              }.bind(this),
              Background.ASSIGN_TAB_HANDLER_RETRY_WAIT,
            ) //何ms待ってリトライするか
          } else {
            console.error('####: sendMessage: Retry Fail.')
          }
        } else {
          //送信成功
          this.handlerTab = tabId
        }
      })
    }
  }
  /* タブID記録用のurlをきれいにする */
  private cleanupUrl(url: string) {
    //private
    //Chrome拡張のprotocol:path/削除
    url = url.replace(chrome.runtime.getURL(''), '')
    return url
  }
  /* フォーラムを開いているタブのIDを記憶
     fid:   forum ID
     tabId: chromeのタブID
  */
  private addTabId(fid: string, tabId: number): void {
    fid = this.cleanupUrl(fid)
    console.log('--- addTabId:' + fid + ' = ' + tabId)
    try {
      Background.tabList[fid] = tabId
      this.storeTabList()
      this.sendMessageAssignTabHandler(tabId, Background.ASSIGN_TAB_HANDLER_MAX_RETRY) //とりあえずTabHadlerの登録を試みる
    } catch (e) {
      const err = e as Error
      console.error('#-- addTabId()' + err.name + ' ' + err.message)
    }
  }
  // storage.lcoalにTabList保存
  private storeTabList(): void {
    chrome.storage.local.set({ tabList: Background.tabList }, () => {
      //死んだ時用にtabList[]データを残す
      console.info('Update tabList[] on storage.local')
    })
  }

  /* フォーラムを開いているタブIDを取得
     fid: forum ID
     sendResponse(tabId): 非同期返し先
     将来的には全部非同期にしたいけど現状は同期呼び出しもされる
  */
  private getTabId(fid: string, sendResponse?: (tabId: TabId) => void) {
    let tabId: number | undefined
    fid = this.cleanupUrl(fid)
    console.log('--- getTabId(' + fid + ')')
    try {
      tabId = Background.tabList[fid]
      if (tabId != null) {
        //undefined以外 0があるので!tabiDは使えない
        //普段はEventListenerで消されるので問題ないが
        //念の為に存在確認して既に無ければ削除
        //その場合、非同期なので一回目はゴミが返る
        chrome.tabs.get(tabId, (tab: chrome.tabs.Tab) => {
          if (chrome.runtime.lastError || tab === null) {
            console.log('#-- tab was closed.' + tabId)
            this.removeTabId(tabId!) //遅いがとりあえず次のために削除
            tabId = undefined //既に消されていた
          }
          if (sendResponse) {
            sendResponse(tabId)
          }
        })
      } else {
        //無かったのでundefined返す
        if (sendResponse) {
          sendResponse(tabId)
        }
      }
    } catch (e) {
      const err = e as Error
      console.warn('#-- getTabId()' + err.name + ' ' + err.message)
      if (sendResponse) {
        sendResponse(tabId)
      } //分かっている値で返す
    }
    return tabId //同期の時 既にタブが消されていたら一回目はゴミ
  }
  /* タブが閉じられたのでリストから削除 */
  private removeTabId(tabId: number) {
    console.log('--- removeTabId()')
    if (tabId === null) {
      console.log('#-- removeTabId() argument is null')
    } else {
      let doneFlg = false
      try {
        for (const element in Background.tabList) {
          //console.log("--- removeTabId:" + element);
          if (Background.tabList[element] === tabId) {
            console.log('--- removeTabId:' + tabId)
            delete Background.tabList[element]
            this.storeTabList()
            doneFlg = true
            if (this.handlerTab === tabId) {
              //ハンドラー登録していたタブが閉じられた
              console.log('--- removeTabId: remove tabHandler.')
              this.handlerTab = null
            }
          }
        }
      } catch (err) {
        const e = err as Error
        console.warn('#-- removeTabId():' + e.name + ' ' + e.message)
      }
      if (!doneFlg) {
        console.log('#-- removeTabId() not found:' + tabId)
      } else {
        if (this.handlerTab === null) {
          //タブハンドラーが空席状態なので最初に見つかったタブに登録
          for (const element in Background.tabList) {
            if (Background.tabList[element]) {
              this.sendMessageAssignTabHandler(Background.tabList[element]!, Background.ASSIGN_TAB_HANDLER_MAX_RETRY)
              break
            }
          }
        }
      }
    }
  }
  private openTab(url: string) {
    //courselist.jsからcopy共通化が必要
    //該当のURLをタブで開く。既に開いていたらそれを使う
    const tabId = this.getTabId(url)
    if (tabId == null) {
      //nullとの==比較でundefinedも見つけてる 0があるかもしれないから!tabIdは使えない
      //開いているタブが無かったので作る
      this.openNewTab(url)
    } else {
      //forumを開いているタブを開く
      console.log('--- reuse tab:', tabId, url)
      chrome.tabs.update(tabId, { highlighted: true }, _tab => {
        if (chrome.runtime.lastError) {
          //タブが消されていて無かったので新規にタブを作る
          //最近 タブが閉じられた時にonRemoveが発生せず、良く起こる
          console.log('--- The tab was already closed', tabId)
          this.openNewTab(url)
        }
      })
    }
  }
  private openNewTab(url: string) {
    console.log('--- create new tab', url)
    chrome.tabs.create({ url }, tab => {
      //tabが閉じられるまでキャッシュとして利用する
      console.log('--- opened tab:' + tab.id)
      this.addTabId(url, tab.id!)
    })
  }

  private localStorageMigration() {
    //マイグレーション
    // 0.8以前のlocalStorageに入っていたデータはmanifest V3のService Workerでは読めないので
    // ReleaseNote.tsでchrome.storageに移行する
    //現用 "ACsession" "Special"
    //キャッシュ用 "Authors" "Forums"
  }
  //インスタンス変数管理
  private initializeClassValue() {
    chrome.storage.local.get(['tabList'], items => {
      //有ったら使う
      if (items.tabList) {
        Background.tabList = items.tabList as typeof Background.tabList
      }
    }) //順序性は無い
    this.localStorageMigration()
    chrome.storage.local.get(['ACsession'], items => {
      const acSession = items.ACsession as { userID: string; sessionA: string }|undefined
      if (acSession) {
        this.userID = acSession.userID
        this.sessionA = acSession.sessionA
      }
    })
    chrome.storage.sync.get(['Special'], items => {
      if (items.Special) {
        const special:Configurations = items.Special as Configurations
        if (special.couresenameRestriction != undefined) {
          special.cRmode = special.couresenameRestriction
        }
        this.updateClassVars(special) //Default false
      }
    })

    this.forums = { cacheFormatVer: this.getCacheFormsFormatVer(), forum: {} } // 初期化
    this.setupCache('Forums', this.getCacheFormsFormatVer(), newCache => {
      this.forums = newCache as Forums
    })

    this.authors = {
      cacheFormatVer: this.getCacheAuthorsFormatVer(),
      author: {},
    } // 初期化
    this.setupCache('Authors', this.getCacheAuthorsFormatVer(), newCache => {
      this.authors = newCache as Authors
    })
  }
  private setupCache(cacheName: string, cacheFormatVer: number, setCache: (newCache: Forums | Authors) => void) {
    chrome.storage.local.get([cacheName], items => {
      if (!items[cacheName]) {
        console.info(`${cacheName} Cache Create`)
      } else {
        const item: Forums | Authors = items[cacheName] as Forums | Authors
        if (item.cacheFormatVer !== cacheFormatVer) {
          //キャッシュのフォーマットバージョンが違ったら使わない
          console.info(`${cacheName} Cache Clear by format version`)
        } else {
          setCache(item) // 良さげなので保存されていたキャッシュを使う
        }
      }
    })
  }

  private updateClassVars(special: Configurations) {
    const countButton = special.countButton
    if (countButton != null) {
      this.countButton = Boolean(countButton)
    } //Default true->false
    this.coursenameRestrictionEnable = Boolean(special.cRmode)
    //console.log("--- Special Experimental", special.experimental)
    this.experimental = Boolean(special.experimental)
    const popupWaitForMac = special.popupWaitForMac
    if (popupWaitForMac) {
      this.popupWaitForMac = popupWaitForMac
    }
    const downloadable = special.downloadable
    if (downloadable != null) {
      this.downloadable = Boolean(downloadable)
    } //Default true
    const displayTelop = special.displayTelop
    if (displayTelop) {
      this.displayTelop = Boolean(displayTelop)
    }
    const forumMemoryCacheSize = special.forumMemoryCacheSize
    if (forumMemoryCacheSize) {
      this.forumMemoryCacheSize = forumMemoryCacheSize
    }
    const saveContentInCache = special.saveContentInCache
    if (saveContentInCache) {
      this.saveContentInCache = Boolean(saveContentInCache)
    }
    const apiKey = special.apiKey
    if (apiKey) {
      this.apiKey = apiKey
    } else {
      this.apiKey = ''
    }
    const supportAirSearchBeta = special.supportAirSearchBeta
    if (supportAirSearchBeta != null) {
      this.supportAirSearchBeta = Boolean(supportAirSearchBeta)
    }
  }

  private setACsession(userID: string, sessionA: string) {
    this.userID = userID
    this.sessionA = sessionA
    chrome.storage.local.set({ ACsession: { userID, sessionA } })
  }
  private getUserID() {
    return this.userID
  }
  private getSessionA() {
    return this.sessionA
  }
  // private setConfigAriSearchBeta(support:boolean) {
  //   this.supportAirSearchBeta =  support
  //   //うう、単体にしてもSpecialに書き込むときに競合する
  // }
  private setSpecial(config: Configurations) {
    this.coursenameRestrictionEnable = Boolean(config.cRmode)
    this.experimental = Boolean(config.experimental)
    this.popupWaitForMac = config.popupWaitForMac
    this.downloadable = config.downloadable
    this.displayTelop = config.displayTelop
    this.forumMemoryCacheSize = config.forumMemoryCacheSize
    this.countButton = config.countButton
    this.saveContentInCache = config.saveContentInCache
    this.apiKey = config.apiKey
    this.supportAirSearchBeta = config.supportAirSearchBeta
    chrome.storage.sync.set({
      Special: {
        couresenameRestriction: this.coursenameRestrictionEnable,
        experimental: this.experimental,
        displayPopupMenu: Boolean(false), //互換のため 書き込むけど読み込まない
        popupWaitForMac: this.popupWaitForMac,
        downloadable: this.downloadable,
        displayTelop: this.displayTelop,
        forumMemoryCacheSize: this.forumMemoryCacheSize,
        countButton: this.countButton,
        saveContentInCache: this.saveContentInCache,
        apiKey: this.apiKey,
        supportAirSearchBeta: this.supportAirSearchBeta,
      },
    })
  }
  private isCRmode() {
    return this.coursenameRestrictionEnable
  }
  private isExperimental() {
    return this.experimental
  }
  private getPopupWaitForMac() {
    return this.popupWaitForMac
  }
  private isDownloadable() {
    return this.downloadable
  }
  private isDisplayTelop() {
    return this.displayTelop
  }
  private isCountButton() {
    return this.countButton
  }
  private isSaveContentInCache() {
    return this.saveContentInCache
  }
  private getForumMemoryCacheSize() {
    //まずはメモリキャッシュサイズをサポート
    //TODO: ファイルキャッシュも欲しいね
    //TODO: Authorsキャッシュのサイズも欲しいね
    return this.forumMemoryCacheSize
  }
  // private setAPIkey(key:string) {
  //   this.apiKey = key
  // }
  private getAPIkey() {
    return this.apiKey
  }
  private isSupportAirSearchBeta() {
    return this.supportAirSearchBeta
  }
  private getCacheFormsFormatVer() {
    return 2
  }
  private getCacheAuthorsFormatVer() {
    return 2
  }
  private setForumCache(forum: Forum) {
    this.forums.forum[forum.fid] = forum
    let diff = Object.keys(this.forums.forum).length - this.getForumMemoryCacheSize()
    if (diff > 0) {
      // tslint:disable-next-line: interface-name
      interface FidDate {
        fid: string
        date: Date
      }
      console.log('Cache Retension Over: ' + diff + ' Forum.')
      //キャッシュ多すぎなのでキャッシュリテンションする
      //日付別でソート
      const sorting = new Array<FidDate>()
      for (const fid in this.forums.forum) {
        if (Object.prototype.hasOwnProperty.call(this.forums.forum, fid)) {
          sorting.push({
            fid,
            date: new Date(this.forums.forum[fid]?.cacheDate as string), //cacheDateは必ず有る
          })
        }
      }
      sorting.sort((a: FidDate, b: FidDate) => a.date.getTime() - b.date.getTime())
      //古いキャッシュから削除
      while (diff-- > 0) {
        if (sorting.length <= 0) {
          //failsafe
          console.warn('ACex: Unexpected over retantion.')
          break
        }
        const fid: string = sorting.shift()!.fid //無いと上でbreakしているので必ずある
        if (fid !== forum.fid) {
          //今登録したのは削除対象外にする
          const f = this.forums.forum[fid]
          console.log(`ACex: cache retention ${fid} ${f?.cacheDate} ${f?.title}`)
          delete this.forums.forum[fid]
        } else {
          diff++
        }
      }
    }
    try {
      chrome.storage.local.set({ Forums: this.forums })
    } catch (e) {
      //多分 Out of memoryが発生している例外を握りつぶす
      console.error('setForumCache(): Unexpected Exception in storage.local.set({Forums}).', e, forum)
    }
  }
  private getForumCache(fid: number): Forum {
    const forum = this.forums.forum[fid] as Forum
    return forum
  }
  private setAuthorCache(uuid: string, name: string) {
    //TODO: Authorキャッシュのリテンション
    if (!this.authors.author[uuid]) {
      //未登録なら
      const author: Author = {
        cacheDate: new Date().toISOString(), //キャッシュ更新日付
        name,
      }
      this.authors.author[uuid] = author
      try {
        chrome.storage.local.set({ Authors: this.authors })
      } catch (e) {
        //多分 Out of memoryが発生しているが例外を握りつぶす
        console.error(
          'setAuthorCache(): Unexpected Exception in store.local.set({Authors})={uuid:' + uuid + ',name:' + name + '}',
          e,
        )
      }
    }
  }
  private getAuthorCache(uuid: string): string {
    //stringで名前を返すので関数名良くないかも
    const author = this.authors.author[uuid]
    let name: string = '' //undefined
    if (author) {
      name = author.name
    }
    return name
  }
  // //アイコンbadgeテキスト
  // private getIconImageData(img:HTMLImageElement|null,  text:string) {
  //   console.log("getIconImageData()", null, text )
  //   const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  //   const ctx = canvas.getContext('2d');
  //   const width = canvas.width;
  //   const height = canvas.height;
  //   ctx!.clearRect(0, 0, width, height) //必ずある
  //   if (!img) {//iconが取れなそうなのでhtmlにicon置いておいて使う
  //     img = (document.getElementById('icon') as HTMLImageElement);
  //   }
  //   if ( img ) { //まずアイコンデータを描画
  //     ctx!.drawImage(img, 0, 0, img.width, img.height) //必ずある
  //   }
  //   if (text && ctx ) { //ついで文字を描画
  //     //ctx.fillStyle = '#000000';
  //     //ctx.fillRect(0, height - 9, width, 9);
  //     ctx.font = 'bold 8px "arial" sans-serif';
  //     ctx.fillStyle = '#ff0000';
  //     ctx.textAlign = "center";
  //     ctx.fillText(text, width/2, height-1, height);
  //   }
  //   return ctx!.getImageData(0, 0, width, height);
  // }
}
const bg = new Background()

chrome.runtime.onInstalled.addListener(details => {
  console.log(`onInstalled: reason=${details.reason}`, details)
  if (details.reason === 'update') {
    Background.chromeActionDisable() // インストール時にはバッチをdisableにして page actionポイ動きにする
    bg.openReleaseNote()
  }
})
