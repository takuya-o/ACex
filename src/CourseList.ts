/* eslint-disable max-lines */
// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />

import { BackgroundMsgCmd, BackgroundResponseSession, CourseItemList, DataLayer, Outline, ProgramList } from './Types'
import { ACexMessageSender } from './ACexMessageSender'
import { CourseCommon } from './CourseCommon'
import { MessageUtil } from './MessageUtil'
import { TabHandler } from './TabHandler'

declare const dataLayer: DataLayer

class CourceList {
  private userID: string = ''
  private sessionA: string = ''
  private crMode: boolean = false //「大学院」削除表示 //ページ開いてからオプションの変更は効かない
  constructor() {
    window.addEventListener('load', (_evt: Event) => {
      MessageUtil.assignMessages()
      TabHandler.assignMessageHandlers() //backgroundからの通信受信設定
      chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.GET_SESSION }, (session: BackgroundResponseSession) => {
        //start
        this.userID = session.userID.replace(/^u=/, '')
        this.sessionA = session.sessionA.replace(/^a=/, '')
        this.crMode = session.crMode
        this.createList() //bg揃ってから起動
      })
    })
  }
  private createList() {
    const query = new URL(window.location.href).searchParams
    let cmd = query.get('cmd') as string
    if (cmd !== 'count') {
      cmd = 'count'
    } //サニタイズ
    document.getElementById('cmd_name')!.innerText = MessageUtil.getMessage([cmd, 'selectCourse'])
    MessageUtil.message(MessageUtil.getMessage(['loding']))

    const params = this.mkSessionParams()
    params.append('act', '1')
    CourseCommon.fetchJSON('https://aircamp.us/svlAC/GetCourseList?', params)
      .then(json => {
        console.log('### GetCouseList:', json)
        this.programItemList(json, cmd)
      })
      .catch(error => {
        console.error('### GetCouseList ERR:', error)
        MessageUtil.message(`${MessageUtil.getMessage(['program_list', 'loding_fail'])} ${error.name}:${error.message}`)
        dataLayer.push({
          event: `Failure-GetCourseList3 ${error.name}:${error.message}`,
        })
      })
  }

  private mkSessionParams() {
    const params = new URLSearchParams()
    params.append('u', this.userID)
    params.append('a', this.sessionA)
    params.append('format', 'json')
    return params
  }

  // eslint-disable-next-line max-lines-per-function
  private programItemList(programList: ProgramList, cmd: string) {
    MessageUtil.message(MessageUtil.getMessage(['course_list', 'loding_success']))
    const now = new Date()
    const programs = programList.program
    // eslint-disable-next-line max-lines-per-function
    programs.forEach(program => {
      //プログラム
      const programID = program.id
      document
        .getElementById('ProgramList')!
        .insertAdjacentHTML(
          'beforeend',
          '<li class="ProgramItem" id="programItem' +
            programID +
            '">' +
            '<button type="button" id="' +
            programID +
            '" value="' +
            programID +
            '">' +
            (this.crMode ? program.name.replace(/・*大学院*/g, '') : program.name) +
            '</button>' +
            '<ul id="program' +
            programID +
            '" style="display: none;"></ul>' +
            '</li>',
        )
      //残らない (<HTMLButtonElement>document.getElementById(programID)).onclick = this.onClickProgram.bind(this)
      const courses = program.course
      const endFlg = (document.getElementById('termonoffswitch') as HTMLInputElement).checked
      const items: { [key: string]: string } = {} //コースを覚えておく
      //for(let j=0; j<courses.length; j++) {
      courses.forEach(course => {
        //コース
        const courseID = course.id
        const endStr = course.end
        const end = CourseCommon.getDate(endStr, 999)
        //順番付はorderよりcousrIDの方が直感的
        items[courseID] =
          '<li class="CourseItem" id="course' +
          courseID +
          '" end="' +
          (now > end) +
          '" name="courseItem"' +
          (endFlg === true && now > end ? ' style="display: none;"' : '') +
          '>' +
          '<a href="https://bbtmba.aircamp.us/course/' +
          courseID +
          '" target="_blank">' + //URLがMBA決めうち
          '<img src="https://bbtmba.aircamp.us/statics/user/images/ico_close_folder.png">' +
          '</a>' +
          '<button type="button" id="' +
          courseID +
          '" cmd="' +
          cmd +
          '" value="' +
          courseID +
          '">' +
          (this.crMode ? course.name.replace(/・*大学院*/g, '') : course.name) +
          '</button>' +
          '</li>'
      })
      for (const key in items) {
        //courseID順に並べる
        if (key) {
          document.getElementById('program' + programID)!.insertAdjacentHTML('beforeend', items[key]!) //必ずある
          document.getElementById(key)!.onclick = this.onClickCourseItem.bind(this)
        }
      }
    })
    programs.forEach(program => {
      //最後だけしか残らない問題 insesrtAdjacentHTMLで解決だけど
      const programID = program.id
      ;(document.getElementById('' + programID) as HTMLButtonElement).onclick = this.onClickProgram.bind(this)
    })
    document.getElementById('termonoffswitch')!.onclick = this.onClickSwitch.bind(this)
  }

  private onClickSwitch(_evt: Event) {
    const items = document.getElementsByName('courseItem')
    //for(let i=0; i<items.length; i++) {
    items.forEach(item => {
      if ((document.getElementById('termonoffswitch') as HTMLInputElement).checked) {
        const endFlg = item.getAttribute('end')
        if (endFlg === 'true') {
          item.style.display = 'none'
        }
      } else {
        item.style.display = '' //show "block"
      }
    })
    //}
  }
  private onClickProgram(evt: Event) {
    console.log('--- onClickProgram:' + (evt.target as HTMLElement).id)
    const programID = (evt.target as HTMLElement).id
    const list = document.getElementById('program' + programID) as HTMLElement
    if (list.clientHeight === 0) {
      list.style.display = '' //"block"
      dataLayer.push({ event: 'program-' + programID })
    } else {
      list.style.display = 'none'
    }
  }
  private onClickCourseItem(evt: Event) {
    console.log('--- onClickCourseItem:' + (evt.target as HTMLElement).id)
    const courseID = (evt.target as HTMLElement).id
    const cmd = (evt.target as HTMLElement).getAttribute('cmd')
    // if ( cmd === "reader")     { this.openReader(courseID); }
    // else
    if (cmd === 'count') {
      this.openCourseItem(courseID)
    } else {
      //failsafe
      this.openCourseItem(courseID)
    }
  }
  // openReader: function(courseID) {
  //   let url = "reader.html" + "?courseID=" + encodeURI(courseID);
  //   this.openTab(url);
  // },
  private openCourseItem(courseID: string) {
    try {
      const list = document.getElementById('courseItemList' + courseID) as HTMLElement
      if (list.clientHeight === 0) {
        list.style.display = '' //"block"
      } else {
        list.style.display = 'none'
      }
    } catch (e) {
      //まだ無かった
      console.log('--- Create CourseItem:' + courseID)
      dataLayer.push({ event: 'course-' + courseID })
      const params = this.mkSessionParams()
      params.append('cid', courseID)
      CourseCommon.fetchJSON('https://aircamp.us/svlAC/GetCourseItemList?', params)
        .then(json => {
          //https://bic.aircamp.us/svlAC/TxGetCourseItemList?u=US120029&a=fac3c9f
          // &cid=19211&aid=&fid=-1&tag=1&flat=1&mode=0&format=json&cmplid=
          console.log('### couseItemList:', json)
          this.courseItemList(json, courseID)
        })
        .catch(error => {
          console.error('### couseItemList ERR:', error)
          // tslint:disable-next-line: max-line-length
          MessageUtil.message(
            `${MessageUtil.getMessage(['course_list', 'logind_fail', 'id'])}${courseID} ${error.name}:${error.message}`,
          )
          dataLayer.push({
            event: `Failure-GetCourseItemList ${courseID} ${error.name}:${error.messsage}`,
          })
        })
    }
  }
  private courseItemList(courseItemList: CourseItemList, courseID: string) {
    MessageUtil.message(MessageUtil.getMessage(['forum_list', 'loding_success', 'id']) + courseID)
    const outlines = courseItemList.outline
    document
      .getElementById('course' + courseID)!
      .insertAdjacentHTML('beforeend', '<ul id="courseItemList' + courseID + '"></ul>')
    //for(let i=0; i<outlines.length; i++) {
    outlines.forEach((outline, i) => {
      console.log('--- outlines[' + i + ']' + outline.type)
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
  private expandOutline(outline: Outline, courseID: string) {
    const title = outline.text
    if (outline.type === 'GROUP') {
      if (!outline.outline) {
        console.warn('Can not found outlines in GROUP')
      } else {
        let groupID: string
        if (!outline.tid) {
          groupID = '' + outline.sid
        } else {
          groupID = '' + outline.tid
        }
        console.log('---- find Group:' + groupID)
        document
          .getElementById('courseItemList' + courseID)!
          .insertAdjacentHTML('beforeend', `<li>${title}</li><ul id="courseItemList${courseID}-${groupID}"></ul>`)
        outline.outline.forEach((out, i) => {
          console.log('--- outline.outline[' + i + ']' + out.type)
          this.expandOutline(out, courseID + '-' + groupID)
        })
      }
    } else if (outline.type === 'BBS') {
      const fid = outline.fid
      console.log('---- find BBS fid:' + fid)
      const item =
        `<li id="BBS${fid}">` +
        `<a href="https://bbtmba.aircamp.us/course/${courseID.replace(/-.*/, '')}?#forum/${fid}" target="_blank">` +
        //URLがMBA決めうち GROUPを"-"区切りで連結しているので削除
        `<img src="https://www.aircamp.us/statics/user/images/ico_discussion.png"></a>` +
        `<button type="button" id="${fid}" value="${fid}">${title}</button></li>`
      document.getElementById('courseItemList' + courseID)!.insertAdjacentHTML('beforeend', item)
      document.getElementById('' + fid)!.onclick = this.onClickBBS.bind(this)
    }
  }
  private onClickBBS(evt: Event) {
    console.log('--- onClickBBS:' + (evt.target as HTMLElement).id)
    const fid = (evt.target as HTMLElement).id
    const url = 'countresult.html' + '?fid=' + encodeURI(fid)
    ACexMessageSender.openTab(url)
  }
}
// tslint:disable-next-line: no-unused-expression
new CourceList()
