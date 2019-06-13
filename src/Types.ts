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
