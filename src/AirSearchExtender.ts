// -*- coding: utf-8-unix -*-

import { MakeSlide } from './MakeSlide'
import { MessageUtil } from './MessageUtil'

class AirSearchExtender {
  // <input type="button" onclick="go(pid=000)">
  public static injectMakeButton() {
    console.log('injectMakeButton - Extender')
    const mvspecs = Array.from(document.querySelectorAll('div.my-mvspec')) //番組はいくつかある
    for (const mvspec of mvspecs) {
      const playButton = mvspec.querySelector('div.my-mvtools span.button>input') //1しかないはず
      const onmouseup = playButton?.getAttribute('onmouseup')
      const pid = (onmouseup?.match(/pid=(\d+)/) ?? [null, ''])[1] // Optional Chaining それとも??のNullish Coalescing 必ずstring
      const makeSlideButton = document.createElement('input') as HTMLInputElement
      makeSlideButton.type = 'button'
      makeSlideButton.value = MessageUtil.getMessage(['image_PDF_document'])
      makeSlideButton.onclick = (_e: MouseEvent) => {
        AirSearchExtender.collectionImages(mvspec, pid!)
      }
      const span = document.createElement('span') as HTMLSpanElement
      span.setAttribute('class', 'button') //「ポタン」スタイル
      span.appendChild(makeSlideButton)
      // tslint:disable-next-line: no-unused-expression
      playButton?.parentElement?.after(span) //再生ボタンの親クラスがいれば
    }
  }
  //定数
  private static MAX_RETRY = 10
  private static RETRY_WAIT = 1000 //ms

  private static collectionImages(mvspec: Element, pid: string, retry = AirSearchExtender.MAX_RETRY) {
    const flip2 = mvspec.querySelector('div.my-flip2') // もしくは #all_flips" + pid
    const imgs = flip2?.querySelectorAll('img.my-thumb_sdoc') as NodeListOf<HTMLImageElement>
    if (imgs?.length <= 0) {
      AirSearchExtender.pushDisplaySlide(mvspec, pid)
      console.log('RETRY:', retry)
      if (retry > 0) {
        setTimeout(AirSearchExtender.collectionImages, AirSearchExtender.RETRY_WAIT, mvspec, pid, --retry)
      }
      return
    }
    let title = mvspec.querySelector('div.movie_name')?.textContent
    let subTitle = mvspec
      .querySelector('div.movie_theme')
      ?.textContent?.replace(/(\t|^$\n)/gm, '')
      .replace(/(^\n|\n$)/g, '')
    if (!title) {
      title = ''
    }
    if (!subTitle) {
      subTitle = ''
    }
    console.log(title, subTitle)
    MakeSlide.setupPDF(title, subTitle, imgs)
  }
  private static pushDisplaySlide(mvspec: Element, pid: string) {
    let a = mvspec.querySelector('div#showLink' + pid + '>a') as HTMLAnchorElement //この動画スライドを表示
    //pid有るからdocumentでも良いけど
    if (!a) {
      a = mvspec.querySelector('span#showLink' + pid + '>a') as HTMLAnchorElement //他のスライドも表示
    }
    if (!a) {
      console.warn('Can not find expand slide button.')
    } else {
      a.click()
    }
  }

  constructor() {
    // tslint:disable-next-line: no-unused-expression
    new MakeSlide(AirSearchExtender.injectMakeButton)
    console.log('--- Start AirSearchExtender ---')
  }
}
// tslint:disable-next-line: no-unused-expression
new AirSearchExtender()
