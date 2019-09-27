// -*- coding: utf-8-unix -*-

//google.charts.Lineが@types/google.visualizaionに定義されていない
declare namespace google {
  namespace charts {
    class Line {
      constructor(node:Node)
      public draw(data: google.visualization.DataTable | google.visualization.DataView, options:{} ): void;
      //optionsは、本当はgoogle.visualization.LineOptions なんだろうけど無いから…
    }
  }
}

//Google Analitics用
interface DataLayer {
  push(data:{[key:string]:string}):void
}

//Backgroundへのメッセージ
type BackgroundMsg = {
  cmd:string,
  userID?:string, sessionA?:string,
  text?:string,
  uuid?:string, name?:string,
  fid?:number,
  url?:string,
  message?:string,
  forum?: Forum
}
type BackgroundResponse = {
  isDownloadable?: boolean,
  isDisplayTelop?: boolean,
  isCountButton?: boolean,
  name?: string,
  forum?: Forum
}

//AirCampus Settings
type Sources = {
  file: string,  //URL .mp4?stalken... //USE
  label: string, //"244k" //USE
}[]
type Settings = {
  prg: string, //31614
  current_position: string, //1700
  bit_data: string,  //1222111133
  img_path: string,  //URL .../doc/
  play_id: string, //4759509
  playlist: {
    sources:Sources, //USE
    image: string, //URL *.jpg
  },
  slides: {
    index_type: number, //0
    index_time: number, //0 1264
    doc: string //00.jpg
  }[],
  rtmplist: {
    type: string, //rtmp
    streamer: string, //URL rtmpte://...mp4
    file: string //sec/224k/31614_224k.mp4
  }
  lo_id: string|null, //null
  telop: {
    choices: string, //6FAES ZO7T5
    id: string, //31614
    value: string, //6 Z  //USE
    time: number //537  //USE
  }[],
  data: string // "C,S,0,2015/08/10 07:32:01;I,6,537;" 認証済み情報 //USE
}

//Chrome Web Store license
//https://developer.chrome.com/webstore/one_time_payments#verifying-payment
type ChromeWebStoreLicense = {
  kind: string, //Identifies a Chrome Web Store license "chromewebstore#license"
  itemId: string, //Your app or extension ID
  createdTime: string, //The date that the license was created, returned as a Unix timestamp. You can use to limit functionality of a free trial to a specific period of time.
  result: boolean, //Whether the user has a license (full or trial), true or false
  accessLevel: string, //FREE_TRIAL, FULL or NONE
  maxAgeSecs: string // The length of time the response is valid for, once that time has passed your app should query the license server again to check whether the user's access has changed.
}

//AirCampus GetCourseList プログラム/コース一覧
type ProgramList = {
  program: Program[]
}
type Program = {
  id: number,
  name: string,
  course: Course[]
}
type Course = {
  id: number,
  name: string,
  end: string, //Date
}
//AirCampus GetCourseItemList コースアイテム(フォーラム)一覧
type CourseItemList = {
  outline: Outline[]
}
type Outline = {
  type: string,  // "GROUP", "BBS", "INFO", "MSGBASE", "LEC"
  text: string, //BBSならtitleにも同じ内容が入っている
  fid: number,
  tid: number,
  sid: number,
  htmlUrl: string, //LECの時の視聴用一覧URL
  outline: Outline[]
}


//Authorキャッシュ
type Author = {
    name:string, cacheDate:string
}
type Authors = {
  cacheFormatVer:number,
  author:{[uuid:string]:Author} //Author[uuid]
}

//AirCampus Authorデータ
type ACAuthor = {
  uuid: string,
  name: string
}
//AirCampus Entryデータ
type ACEntry = {
    author: ACAuthor,
    identifier: number,
    uuid: string,
    deleted: boolean,
    relation: number,
    updated: string,
    clienttype: string,
    treeid: number,
    depth: number,
    title: string,
    content: string|{value:string}
}

type Forum = {
    cacheFormatVer: number,
    fid: string,
    title: string,
    updated: string,
    start: string,
    end: string,
    entry: ACEntry[],
    cacheDate: string,
    saveContentInCache: boolean, //本文が保存されているか?
    minPost: number
}

type Forums = {
  cacheFormatVer: number,
  forum:{[fid:string]:Forum}
}

type ForumContents = { //サーバからくるForum中身
  title: { value:string },
  updated: string, //Date,
  start: string, //Date,
  end: string, //Date,
  entry: ACEntry[]
}

//グラフ作成
type CountingDatum = { //ID毎の各週の投稿数カウント
  d:number[], //各週の投稿数
  uuid: string
}

type ChartData = { //グラフデータ
  data:CountingDatum[], minWeek:number, maxWeek:number
}

//CountResult
type Ranking = {
  name: string,
  count: number,
  deleted: number,
  reply: number,
  ownReply: number,
  replied: number,
  uuid: string
}
