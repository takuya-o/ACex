/* eslint-disable max-lines */
// -*- coding: utf-8-unix -*-
/* tslint:disable: interface-name */
/* tslint:disable: object-literal-sort-keys */

//Google Analitics用
export interface DataLayer {
  push(data: { [key: string]: string }): void
}

export const airCampusHTML5Regexp = /^https?:\/\/[^./]+\.aircamp\.us\/course\/\d+((|[/?].*)#|\/)forum\/(\d+)/ //この正規表現使いまわされるから()の追加には注意

//Backgroundへのメッセージ
export enum BackgroundMsgCmd {
  SET_ICON = 'setIcon',
  GET_ZOOM_FACTOR = 'getZoomFactor',
  GET_CAPTURE_DATA = 'getCaptureData',
  GET_AUTHOR_CACHE = 'getAuthorCache',
  SET_AUTHOR_CACHE = 'setAuthorCache',
  GET_FORUM_CACHE = 'getForumCache',
  SET_FORUM_CACHE = 'setForumCache',
  OPEN = 'open',
  // getAPIkey:"getAPIkey",
  GET_LICENSE = 'getLicense',
  GET_SESSION = 'getSession',
  SET_SESSION = 'setSession',
  GET_CONFIGURATIONS = 'getConfigurations',
  SET_CONFIGURATIONS = 'setConfigurations',
  // SET_CONFIG_LICENSE:"setConfgiLicense",
  // SET_CONFIG_AIRSEARCH_BETA:"setConfigAirSearchBeta",
  SETUP_AUTH = 'setupAuth',
  TEXT_DETECTION = 'textDetection',
  GET_FONTDATA = 'getFontData',
  REMOVE_TAB_ID = 'removeTabId',
  GET_TAB_ID = 'getTabId',
  // GET_MY_TAB_ID: "getMyTabId",
  LOG = 'log',
}
//type BackgroundMsgCmd = typeof BackgroundMsgCmd[keyof typeof BackgroundMsgCmd]
export type BackgroundMsg = {
  cmd: BackgroundMsgCmd
  userID?: string
  sessionA?: string //SET_SESSION
  text?: string //SET_ICON, TEXT_DETECTION
  uuid?: string
  name?: string //GET_AUTHOR_CACHE, SET_AUTHOR_CACHE,
  fid?: number //GET_FORUM_CACHE
  url?: string //OPEN_TAB, SET_OPENED_URL, GET_TAB
  message?: string //LOG
  forum?: Forum //SET_FORUM_CACHE
  config?: Configurations //SET_CONFIGURATIONS
  // configLicense?:boolean, //SET_CONFIG_LICENSE
  // configAirSearchBeta?:boolean, //SET_CONFIG_AIRSEARCH_BETA
  tabId?: number //REMOVE_TAB
}
//Backgroundからのレスポンス
export enum LicenseStatus {
  FREE_TRIAL = 'FREE_TRIAL',
  FREE_TRIAL_EXPIRED = 'FREE_TRIAL_EXPIRED',
  FULL = 'FULL',
  NONE = 'NONE',
  UNKNOWN = 'UNKNOWN',
}
//type LicenseStatus = typeof LicenseStatus[keyof typeof LicenseStatus];
export type License = {
  status: LicenseStatus //string, //|Date,
  validDate: Date
  expireDate: Date | undefined
  createDate?: Date
}
export type BackgroundResponseName = {
  name: string
}
export type BackgroundResponseUrl = {
  url: string
}
export type BackgroundResponseForum = {
  forum: Forum | undefined
}
export type BackgroundResponseSession = {
  userID: string
  sessionA: string
  crMode: boolean //TODO: 分けたい CourseList用
  saveContentInCache: boolean //TODO: 分けたいCoundResult用
}
export type TextDetectionResult = {
  result: string
  ans?: string
  textAnnotations?: TextAnnotations
  errorMessage?: string
}
export type FontData = {
  data: string
  length: number
}
export type UrlString = string
export type TabId = number | undefined
export type BackgroundResponse =
  | BackgroundResponseName
  | BackgroundResponseUrl
  | BackgroundResponseForum
  | BackgroundResponseSession
  | TextDetectionResult
  | License
  | Configurations
  | FontData
  | UrlString
  | TabId

//オプション設定
export type Configurations = {
  experimental: boolean
  countButton: boolean
  cRmode: boolean
  popupWaitForMac: number
  downloadable: boolean
  displayTelop: boolean
  useLicenseInfo: boolean
  trialPriodDays: number
  forumMemoryCacheSize: number
  saveContentInCache: boolean
  apiKey: string
  supportAirSearchBeta: boolean
}
// {[items:StorageTag]: any}って無理?
// //chrome.storage用
// const StorageTag = {
//   OPENED_URL: "openedUrl",
//   LICENSE: "License"
// }
// type StorageTag = typeof StorageTag[keyof typeof StorageTag]

//jsPDF用
export type PDFprops = {
  w: number
  h: number
  mx: number
  my: number
  iw: number
  ih: number
}

// Google Vsion API用
export type TextAnnotations = TextAnnotation[]
export type TextAnnotation = {
  locale?: string
  description: string
  boundingPoly: {
    vertices: [
      {
        x: number
        y: number
      },
      {
        x: number
        y: number
      },
      {
        x: number
        y: number
      },
      {
        x: number
        y: number
      },
    ]
  }
}

//AirCampus Settings
export type Sources = Array<{
  file: string //URL .mp4?stalken... //USE
  label: string //"244k" //USE
}>
export type Settings = {
  prg: string //31614
  current_position: string //1700
  bit_data: string //1222111133
  img_path: string //URL .../doc/
  play_id: string //4759509
  playlist: {
    sources: Sources //USE
    image: string //URL *.jpg
  }
  slides: Array<{
    index_type: number //0
    index_time: number //0 1264
    doc: string //00.jpg
  }>
  rtmplist: {
    type: string //rtmp
    streamer: string //URL rtmpte://...mp4
    file: string //sec/224k/31614_224k.mp4
  }
  lo_id: string | null //null
  telop: Array<{
    choices: string //6FAES ZO7T5
    id: string //31614
    value: string //6 Z  //USE
    time: number //537  //USE
  }>
  data: string // "C,S,0,2015/08/10 07:32:01;I,6,537;" 認証済み情報 //USE
}

//Chrome Web Store license
//https://developer.chrome.com/webstore/one_time_payments#verifying-payment
export type ChromeWebStoreLicense = {
  kind: string //Identifies a Chrome Web Store license "chromewebstore#license"
  itemId: string //Your app or extension ID
  createdTime: string //The date that the license was created, returned as a Unix timestamp.
  // You can use to limit functionality of a free trial to a specific period of time.
  result: boolean //Whether the user has a license (full or trial), true or false
  accessLevel: string //FREE_TRIAL, FULL or NONE
  maxAgeSecs: string // The length of time the response is valid for, once that time has passed your app
  // should query the license server again to check whether the user's access has changed.
}

//AirCampus GetCourseList プログラム/コース一覧
export type ProgramList = {
  program: Program[]
}
export type Program = {
  id: number
  name: string
  course: Course[]
}
export type Course = {
  id: number
  name: string
  end: string //Date
}
//AirCampus GetCourseItemList コースアイテム(フォーラム)一覧
export type CourseItemList = {
  outline: Outline[]
}
export type Outline = {
  type: string // "GROUP", "BBS", "INFO", "MSGBASE", "LEC"
  text: string //BBSならtitleにも同じ内容が入っている
  fid: number
  tid: number
  sid: number
  htmlUrl: string //LECの時の視聴用一覧URL
  outline: Outline[]
}

//Authorキャッシュ
export type Author = {
  name: string
  cacheDate: string
}
export type Authors = {
  cacheFormatVer: number
  author: { [uuid: string]: Author } //Author[uuid]
}

//AirCampus Authorデータ
export type ACAuthor = {
  uuid: string
  name: string
}
//AirCampus Entryデータ
export type ACEntry = {
  author: ACAuthor
  identifier: number
  uuid: string
  deleted: boolean
  relation: number
  updated: string
  clienttype: string
  treeid: number
  depth: number
  title: string
  content: string | { value: string }
}

export type Forum = {
  cacheFormatVer: number
  fid: string
  title: string
  updated: string
  start: string
  end: string
  entry: ACEntry[]
  cacheDate: string
  saveContentInCache: boolean //本文が保存されているか?
  minPost: number
}

export type Forums = {
  cacheFormatVer: number
  forum: { [fid: string]: Forum }
}

export type ForumContents = {
  //サーバからくるForum中身
  title: { value: string }
  updated: string //Date,
  start: string //Date,
  end: string //Date,
  entry: ACEntry[]
}

//グラフ作成
export type CountingDatum = {
  //ID毎の各週の投稿数カウント
  d: number[] //各週の投稿数
  uuid: string
  name: string
}

export type ChartData = {
  //グラフデータ
  data: CountingDatum[]
  minWeek: number
  maxWeek: number
}

//CountResult
export type Ranking = {
  name: string
  count: number
  deleted: number
  reply: number
  ownReply: number
  replied: number
  uuid: string
}
