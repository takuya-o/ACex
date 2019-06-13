// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/// <reference types="jquery" />
/* global Class, chrome, messageUtil, tabHandler, Ajax, dataLayer */

// requirejs.config({
//     //baseUrl: './',
//     paths: {
//         jquery: 'lib/jquery.min'
//     }
// });
// //import * as $ from "lib/jquery.min";
// import MessageUtil = require("MessageUtil")
// import TabHandler = require("TabHandler")

declare var dataLayer:DataLayer

class CurseList {
  private userID:string
  private sessionA:string
  private crMode: boolean //ページ開いてからオプションの変更は効かない
  constructor() {
    window.addEventListener("load", (_evt:Event) => {
      //start
      MessageUtil.assignMessages();
      TabHandler.assignMessageHandlers(this); //backgroundからの通信受信設定
      chrome.runtime.getBackgroundPage( (backgroundPage) => {
        let bg:Background = backgroundPage["bg"];
        this.userID = bg.getUserID().replace(/^u=/,"")
        this.sessionA = bg.getSessionA().replace(/^a=/,"")
        this.crMode = bg.isCRmode()
        this.createList() //bg揃ってから起動
      })
    })
  }
  private createList() {
    let query = new URL(window.location.href).searchParams
    let cmd = query.get("cmd")
    if ( cmd !== "count" ) { cmd = "count"; } //サニタイズ
    document.getElementById('cmd_name').innerText = MessageUtil.getMessage([cmd, "selectCourse"])
    document.getElementById('message').innerText = MessageUtil.getMessage(["loding"])

    $.ajax(
      "https://aircamp.us/svlAC/GetCourseList",
      { method: "GET",
        data: {
          act: 1,
          u: this.userID,
          a: this.sessionA,
          format: "json"
        },
        crossDomain: true
      }
    ).done( (data:ProgramList, _textStatus, _jqXHR) => {
        this.programItemList(data, cmd)
      }
    ).fail( (_jqXHR, textStatus) => {
        document.getElementById('message').innerText =
          MessageUtil.getMessage(["program_list", "loding_fail"] ) + textStatus
        dataLayer.push({'event': 'Failure-GetCourseList3'
                          + textStatus })
      }
    )
  }
  private programItemList(programList:ProgramList, cmd:string) {
    document.getElementById('message').innerText = MessageUtil.getMessage(["course_list", "loding_success"])
    let now = new Date();
    let programs = programList.program
    for(let i=0; i<programs.length; i++) { //プログラム
      let programID = programs[i].id
      document.getElementById('ProgramList').insertAdjacentHTML("beforeend",
      '<li class="ProgramItem" id="programItem'+ programID + '">'
      + '<button type="button" id="' + programID
      + '" value="' + programID + '">'
      + ( this.crMode ?
          programs[i].name.replace(/・*大学院*/g,""):
          programs[i].name)
      + '</button>'
      + '<ul id="program' + programID + '" style="display: none;"></ul>'
      +'</li>')
      //残らない (<HTMLButtonElement>document.getElementById(programID)).onclick = this.onClickProgram.bind(this)
      let courses = programs[i].course
      let endFlg = (<HTMLInputElement>document.getElementById("termonoffswitch")).checked
      let items = {} //コースを覚えておく
      for(let j=0; j<courses.length; j++) { //コース
        let courseID = courses[j].id
        let endStr = courses[j].end
        //"2012-09-08T23:59:59+09:00"
        let date = endStr.match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/);
        let end = new Date(+date[1], +date[2]-1, +date[3]
                            , +date[4], +date[5], +date[6], 999);
        //順番付はorderよりcousrIDの方が直感的
        items[courseID] =
          '<li class="CourseItem" id="course' + courseID
          + '" end="'+ ( now > end ) + '" name="courseItem"'
          + (endFlg===true && now>end  ?  ' style="display: none;"' : '')
          + '>'
          + '<a href="https://bbtmba.aircamp.us/course/' + courseID + '" target="_blank">' //URLがMBA決めうち
          +  '<img src="https://bbtmba.aircamp.us/statics/user/images/ico_close_folder.png">'
          + '</a>'
          + '<button type="button" id="' + courseID
          +  '" cmd="' + cmd
          +  '" value="' + courseID + '">'
          +  ( this.crMode ?
               courses[j].name.replace(/・*大学院*/g,""):
               courses[j].name)
          + '</button>'
          +'</li>'
      }
      for(let key in items) { //courseID順に並べる
        document.getElementById( "program" + programID ).insertAdjacentHTML("beforeend", items[key])
        document.getElementById( key ).onclick = this.onClickCourseItem.bind(this);
      }
    }
    for(let i=0; i<programs.length; i++) { //最後だけしか残らない問題 insesrtAdjacentHTMLで解決だけど
      let programID = programs[i].id;
      (<HTMLButtonElement>document.getElementById(""+programID)).onclick = this.onClickProgram.bind(this)
    }
    document.getElementById("termonoffswitch").onclick = this.onClickSwitch.bind(this);
  }
  private  onClickSwitch(_evt:Event) {
    let items = document.getElementsByName("courseItem");
    for(let i=0; i<items.length; i++) {
      if ( (<HTMLInputElement>document.getElementById("termonoffswitch")).checked ) {
        let endFlg = items[i].getAttribute('end');
        if ( endFlg === "true" ) { items[i].style.display = "none" }
      }else{
        items[i].style.display = "" //show "block"
      }
    }
  }
  private onClickProgram(evt:Event) {
    console.log("--- onClickProgram:" + (<HTMLElement>evt.target).id);
    let programID = (<HTMLElement>evt.target).id;
    let list = document.getElementById( "program" + programID );
    if ( list.clientHeight == 0 ) {
      list.style.display = "" //"block"
      dataLayer.push({'event': 'program-' + programID });
    } else {
      list.style.display = "none"
    }
  }
  private onClickCourseItem(evt:Event) {
    console.log("--- onClickCourseItem:" + (<HTMLElement>evt.target).id);
    let courseID = (<HTMLElement>evt.target).id;
    let cmd = (<HTMLElement>evt.target).getAttribute('cmd');
    // if ( cmd === "reader")     { this.openReader(courseID); }
    // else
    if ( cmd === "count") { this.openCourseItem(courseID); }
    else { this.openCourseItem(courseID); } //failsafe
  }
    // openReader: function(courseID) {
    //   let url = "reader.html" + "?courseID=" + encodeURI(courseID);
    //   this.openTab(url);
    // },
  private openCourseItem(courseID:string) {
    try {
      let list = document.getElementById( "courseItemList" + courseID );
      if ( list.clientHeight == 0 ) {
        list.style.display = "" //"block"
      } else {
        list.style.display = "none"
      }
    } catch (e) {
      //まだ無かった
      console.log("--- Create CourseItem:" + courseID);
      dataLayer.push({'event': 'course-' + courseID });
      $.ajax(
        "https://aircamp.us/svlAC/GetCourseItemList",
        //https://bic.aircamp.us/svlAC/TxGetCourseItemList?u=US120029&a=fac3c9f51cef5b326587035e7123b586feaaf5f9&cid=19211&aid=&fid=-1&tag=1&flat=1&mode=0&format=json&cmplid=
        { method: "GET",
          data: {
            "cid": courseID,
            "u": this.userID,
            "a": this.sessionA,
            "format": "json"
          }
        }
      ).done( (data:CourseItemList) => {
            this.courseItemList(data, courseID);
          }
      ).fail((_data, textStatus ) => {
            document.getElementById('message').innerText =
              MessageUtil.getMessage(["course_list", "logind_fail", "id",
                                courseID, textStatus])
            dataLayer.push({'event': 'Failure-GetCourseItemList'
                            + courseID + textStatus });
          }
      )
    }
  }
  private courseItemList(courseItemList:CourseItemList, courseID:string) {
    document.getElementById('message').innerText =
      MessageUtil.getMessage(["forum_list", "loding_success", "id"]) + courseID
    let outlines = courseItemList.outline
    document.getElementById( 'course' + courseID ).insertAdjacentHTML("beforeend",
      '<ul id="courseItemList' + courseID + '"></ul>')
    for(let i=0; i<outlines.length; i++) {
      console.log("--- outlines["+i+"]"+outlines[i].type)
      this.expandOutline(outlines[i], courseID)
    }
    // for(let i=0; i<outlines.length; i++) { //消える対策 うまくいかない
    //   if ( outlines[i].type === "BBS" ) {
    //     let fid = outlines[i].fid
    //     document.getElementById( fid ).onclick = this.onClickBBS.bind(this);
    //   }
    // }
  }
  private expandOutline(outline:Outline, courseID:string) {
    let title = outline.text
    if ( outline.type === "GROUP" ) {
      if ( !outline.outline) {
        console.warn("Can not found outlines in GROUP")
      } else {
        let groupID:string
        if ( !outline.tid ) {
          groupID = ""+outline.sid
        } else {
          groupID = ""+outline.tid
        }
        console.log("---- find Group:" + groupID);
        document.getElementById( 'courseItemList' + courseID ).insertAdjacentHTML("beforeend",
          '<li>' + title + '</li>'
          +'<ul id="courseItemList' + courseID + "-" + groupID + '"></ul>')
        for(let i=0;i<outline.outline.length;i++) {
            console.log("--- outline.outline["+i+"]"+outline.outline[i].type)
            this.expandOutline(outline.outline[i], courseID + "-" + groupID)
        }
      }
    } else if ( outline.type === "BBS") {
      let fid = outline.fid
      console.log("---- find BBS fid:" + fid);
      let item = '<li id="BBS' + fid + '">'
        + '<a href="https://bbtmba.aircamp.us/course/'   //URLがMBA決めうち
        + courseID.replace(/-.*/,"") //GROUPを"-"区切りで連結しているので削除
        + '?#forum/' + fid + '" target="_blank">'
        + '<img src="https://www.aircamp.us/statics/user/images/ico_discussion.png">'
        + '</a>'
        + '<button type="button" id="' + fid
        + '" value="' + fid + '">'
        + title + '</button></li>'
      document.getElementById( "courseItemList" + courseID ).insertAdjacentHTML("beforeend", item)
      document.getElementById( ""+fid ).onclick = this.onClickBBS.bind(this);
    }
  }
  private onClickBBS(evt:Event) {
    console.log("--- onClickBBS:" + (<HTMLElement>evt.target).id);
    let fid = (<HTMLElement>evt.target).id;
    let url = "countresult.html" + "?fid=" + encodeURI(fid);
    this.openTab(url);
  }
  private openTab(url:string) {
    chrome.runtime.sendMessage(
      {cmd: "open", url: url}, (_response)=>{
        if (chrome.runtime.lastError) {
          //bgへのメッセージ送信失敗でtab開けず
          console.log("####: sendMessage open:",chrome.runtime.lastError.message);
        }
    });
  }
}
new CurseList()
