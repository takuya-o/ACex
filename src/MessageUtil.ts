// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />

export class MessageUtil {
  public static assignMessages() {
    //SAST: メソッド大きすぎ Function `assignMessages` has 30 lines of code (exceeds 25 allowed). Consider refactoring.
    const elems = document.querySelectorAll('*[class^="MSG_"]')
    Array.prototype.forEach.call(elems, (node: HTMLElement) => {
      const keys = node.className.match(/MSG_(\w+)/)
      let key: string
      if (keys !== null && keys.length > 1) {
        key = keys[1] as string //必ずあるのでキャスト undefined
      } else {
        console.error('Unexpected condition that not fund Key MSG_')
        return
      }
      const message = chrome.i18n.getMessage(key)
      if (message) {
        node.textContent = message
      } else {
        //リソースバンドルが無かった
        if (node.textContent === '') {
          //元の文字も無ければ
          node.textContent = key.replace(/_/g, ' ')
        }
      }
      //ツールチップも有れば更新
      const attrs = node.attributes
      Array.prototype.forEach.call(attrs, (attr: Attr) => {
        if (attr.name === 'title') {
          // tslint:disable-next-line: no-shadowed-variable
          const keys = attr.value.match(/MSG_(\w+)/)
          if (keys !== null && keys.length > 1) {
            key = keys[1] as string //必ずあるのでキャスト undefined
            // tslint:disable-next-line: no-shadowed-variable
            const message = chrome.i18n.getMessage(key)
            if (message) {
              attr.value = message
            }
          } else {
            //console.warn("Attribute is title but not MSG_ key.")
          }
        }
      })
    })
  }

  public static getMessage(args: string[]) {
    //arg:配列
    let ret = ''
    args.forEach((arg, i) => {
      let message = ''
      if (i !== 0) {
        ret = ret + ' '
      }
      if (chrome?.i18n) {
        message = chrome.i18n.getMessage(arg) // chrome.i18nが使える場合
      }
      if (!message) {
        message = arg
      } // chrome.i18nが使えない場合もしくは取れなかった場合
      ret = ret + message
    })
    return ret
  }

  public static checkRuntimeError(msg: string) {
    if (chrome.runtime.lastError) {
      const errorMsg = '####: sendMessage ' + msg + ':'
      console.log(errorMsg, chrome.runtime.lastError.message)
      console.error(new Error(errorMsg + chrome.runtime.lastError.message).stack) //スタックトトレース出力
    }
  }

  public static message(msg: string) {
    const message = document.getElementById('message')
    if (!message) {
      console.warn(new Error(`Cannot display message: ${msg}`).stack)
    } else {
      message.innerText = msg
    }
  }

  constructor() {
    console.log('--- Start MessageUtil ---')
    MessageUtil.assignMessages()
  }
}
