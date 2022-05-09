// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/* /// <reference types="jquery" /> */
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
  private userID:string = ""
  private sessionA:string = ""
  private crMode: boolean = false //「大学院」削除表示 //ページ開いてからオプションの変更は効かない
  constructor() {
    window.addEventListener("load", (_evt:Event) => {
      MessageUtil.assignMessages();
      TabHandler.assignMessageHandlers(); //backgroundからの通信受信設定
      chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.GET_SESSION}, (session:BackgroundResponseSession) => {
        //start
        this.userID = session.userID.replace(/^u=/,"")
        this.sessionA = session.sessionA.replace(/^a=/,"")
        this.crMode = session.crMode
        this.createList() //bg揃ってから起動
      })
    })
  }
  private message(msg:string) {
   let message=document.getElementById('message')
   if (!message) {
     console.warn("Cannot display message:" + msg)
   } else {
     message.innerText = msg
   }
  }
  private createList() {
    let query = new URL(window.location.href).searchParams
    let cmd = <string>query.get("cmd")
    if ( cmd !== "count" ) { cmd = "count"; } //サニタイズ
    document.getElementById('cmd_name')!.innerText = MessageUtil.getMessage([cmd, "selectCourse"])
    this.message( MessageUtil.getMessage(["loding"]) )

    let params = this.mkSessionParams()
    params.append("act", "1")
    fetch("https://aircamp.us/svlAC/GetCourseList?" + params.toString(), {
      method: "GET",
      mode: "cors",
    }).then(response => {
      if (response.ok) {
        return response.json()
      } else {
        throw new Error(`${response.status} ${response.statusText}`)
      }
    }).then(json => {
      console.log("### GetCouseList:", json)
      this.programItemList(json, cmd)
    }).catch(error => {
      console.error("### GetCouseList ERR:", error)
      this.message( `${MessageUtil.getMessage(["program_list", "loding_fail"])} ${error.name}:${error.message}` )
      dataLayer.push({'event': `Failure-GetCourseList3 ${error.name}:${error.message}` });
    })
    // $.ajax(
    //   "https://aircamp.us/svlAC/GetCourseList",
    //   { method: "GET",
    //     data: {
    //       act: 1,
    //       u: this.userID,
    //       a: this.sessionA,
    //       format: "json"
    //     },
    //     crossDomain: true
    //   }
    // ).done( (data:ProgramList, _textStatus, _jqXHR) => {
    //     this.programItemList(data, cmd)
    //   }
    // ).fail( (_jqXHR, textStatus) => {
    //     this.message( MessageUtil.getMessage(["program_list", "loding_fail"] ) + textStatus )
    //     dataLayer.push({'event': 'Failure-GetCourseList3'
    //                       + textStatus })
    //   }
    // )
  }
  private mkSessionParams() {
    let params = new URLSearchParams()
    params.append("u", this.userID)
    params.append("a", this.sessionA)
    params.append("format", "json")
    return params
  }

  private programItemList(programList:ProgramList, cmd:string) {
    this.message( MessageUtil.getMessage(["course_list", "loding_success"]) )
    let now = new Date();
    let programs = programList.program
    //for(let i=0; i<programs.length; i++) {
    programs.forEach( (program) => {
      //プログラム
      let programID = program.id
      document.getElementById('ProgramList')!.insertAdjacentHTML("beforeend",
      '<li class="ProgramItem" id="programItem'+ programID + '">'
      + '<button type="button" id="' + programID
      + '" value="' + programID + '">'
      + ( this.crMode ?
          program.name.replace(/・*大学院*/g,""):
          program.name)
      + '</button>'
      + '<ul id="program' + programID + '" style="display: none;"></ul>'
      +'</li>')
      //残らない (<HTMLButtonElement>document.getElementById(programID)).onclick = this.onClickProgram.bind(this)
      let courses = program.course
      let endFlg = (<HTMLInputElement>document.getElementById("termonoffswitch")).checked
      let items:{[key:string]: string} = {} //コースを覚えておく
      //for(let j=0; j<courses.length; j++) {
      courses.forEach( (course) => {
        //コース
        let courseID = course.id
        let endStr = course.end
        //"2012-09-08T23:59:59+09:00"
        let date = endStr.match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/);
        let end = new Date(+date![1]!, +date![2]!-1, +date![3]!
                            , +date![4]!, +date![5]!, +date![6]!, 999);
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
               course.name.replace(/・*大学院*/g,""):
               course.name)
          + '</button>'
          +'</li>'
      })
      //}
      for(let key in items) { //courseID順に並べる
        document.getElementById( "program" + programID )!.insertAdjacentHTML("beforeend", items[key]!) //必ずある
        document.getElementById( key )!.onclick = this.onClickCourseItem.bind(this);
      }
    })
    //}
    //for(let i=0; i<programs.length; i++) {
    programs.forEach( (program) => {
      //最後だけしか残らない問題 insesrtAdjacentHTMLで解決だけど
      let programID = program.id;
      (<HTMLButtonElement>document.getElementById(""+programID)).onclick = this.onClickProgram.bind(this)
    })
    //}
    document.getElementById("termonoffswitch")!.onclick = this.onClickSwitch.bind(this);
  }
  private  onClickSwitch(_evt:Event) {
    let items = document.getElementsByName("courseItem");
    //for(let i=0; i<items.length; i++) {
    items.forEach( (item) => {
      if ( (<HTMLInputElement>document.getElementById("termonoffswitch")).checked ) {
        let endFlg = item.getAttribute('end');
        if ( endFlg === "true" ) { item.style.display = "none" }
      }else{
        item.style.display = "" //show "block"
      }
    })
    //}
  }
  private onClickProgram(evt:Event) {
    console.log("--- onClickProgram:" + (<HTMLElement>evt.target).id);
    let programID = (<HTMLElement>evt.target).id;
    let list = <HTMLElement>document.getElementById( "program" + programID );
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
      let list = <HTMLElement>document.getElementById( "courseItemList" + courseID );
      if ( list.clientHeight == 0 ) {
        list.style.display = "" //"block"
      } else {
        list.style.display = "none"
      }
    } catch (e) {
      //まだ無かった
      console.log("--- Create CourseItem:" + courseID);
      dataLayer.push({'event': 'course-' + courseID });
      let params = this.mkSessionParams()
      params.append("cid", courseID)
      fetch("https://aircamp.us/svlAC/GetCourseItemList?" + params.toString(), {
      //https://bic.aircamp.us/svlAC/TxGetCourseItemList?u=US120029&a=fac3c9f51cef5b326587035e7123b586feaaf5f9&cid=19211&aid=&fid=-1&tag=1&flat=1&mode=0&format=json&cmplid=
          method: "GET",
          mode: "cors",
      }).then( (response) => {
        if (response.ok) {
          return response.json()
        } else {
          throw new Error(`${response.status} ${response.statusText}`)
        }
      }).then(json => {
        console.log("### couseItemList:", json)
        this.courseItemList(json, courseID);
      }).catch(error => {
        console.error("### couseItemList ERR:", error)
        this.message( `${MessageUtil.getMessage(["course_list", "logind_fail", "id"])}${courseID} ${error.name}:${error.message}` )
        dataLayer.push({'event': `Failure-GetCourseItemList ${courseID} ${error.name}:${error.messsage}` });
      })

      // $.ajax(
      //   "https://aircamp.us/svlAC/GetCourseItemList",
      //   //https://bic.aircamp.us/svlAC/TxGetCourseItemList?u=US120029&a=fac3c9f51cef5b326587035e7123b586feaaf5f9&cid=19211&aid=&fid=-1&tag=1&flat=1&mode=0&format=json&cmplid=
      //   { method: "GET",
      //     data: {
      //       "cid": courseID,
      //       "u": this.userID,
      //       "a": this.sessionA,
      //       "format": "json"
      //     }
      //   }
      // ).done( (data:CourseItemList) => {
      //       this.courseItemList(data, courseID);
      //     }
      // ).fail((_data, textStatus ) => {
      //       this.message( MessageUtil.getMessage(["course_list", "logind_fail", "id",
      //                           courseID, textStatus]) )
      //       dataLayer.push({'event': 'Failure-GetCourseItemList'
      //                       + courseID + textStatus });
      //     }
      // )
    }
  }
  private courseItemList(courseItemList:CourseItemList, courseID:string) {
    this.message( MessageUtil.getMessage(["forum_list", "loding_success", "id"]) + courseID )
    let outlines = courseItemList.outline
    document.getElementById( 'course' + courseID )!.insertAdjacentHTML("beforeend",
      '<ul id="courseItemList' + courseID + '"></ul>')
    //for(let i=0; i<outlines.length; i++) {
    outlines.forEach( (outline, i) => {
      console.log("--- outlines["+i+"]"+outline.type)
      this.expandOutline(outline, courseID)
    })
    //}
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
        document.getElementById( 'courseItemList' + courseID )!.insertAdjacentHTML("beforeend",
          '<li>' + title + '</li>'
          +'<ul id="courseItemList' + courseID + "-" + groupID + '"></ul>')
        //for(let i=0;i<outline.outline.length;i++) {
        outline.outline.forEach( (out, i) => {
          console.log("--- outline.outline["+i+"]"+out.type)
          this.expandOutline(out, courseID + "-" + groupID)
        })
        //}
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
      document.getElementById( "courseItemList" + courseID )!.insertAdjacentHTML("beforeend", item)
      document.getElementById( ""+fid )!.onclick = this.onClickBBS.bind(this);
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
      {cmd: BackgroundMsgCmd.OPEN, url: url}, (_response)=>{
        MessageUtil.checkRuntimeError(BackgroundMsgCmd.OPEN) //bgへのメッセージ送信失敗でtab開けず
    });
  }
}
new CurseList()
