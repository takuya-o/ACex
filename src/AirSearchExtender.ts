// -*- coding: utf-8-unix -*-

class AirSearchExtender {
  //定数
  private static MAX_RETRY = 10
  private static RETRY_WAIT = 1000 //ms
  constructor() {
    new MakeSlide(AirSearchExtender.injectMakeButton)
    console.log("--- Start AirSearchExtender ---")
  }
  // <input type="button" onclick="go(pid=000)">
  public static injectMakeButton() {
    console.log("injectMakeButton - Extender")
    let mvspecs = document.querySelectorAll("div.my-mvspec") //番組はいくつかある
    for (let i=0;i<mvspecs.length;i++) {
      let playButton = mvspecs[i]!.querySelector("div.my-mvtools span.button>input") //1しかないはず
      let onmouseup=playButton?.getAttribute("onmouseup")
      let pid = (onmouseup?.match(/pid=(\d+)/)??[null, ""])[1] // Optional Chaining それとも??のNullish Coalescing 必ずstring
      let makeSlideButton = <HTMLInputElement>document.createElement("input")
      makeSlideButton.type = "button"
      makeSlideButton.value = MessageUtil.getMessage(["image_PDF_document"])
      makeSlideButton.onclick = (_e:MouseEvent) => {
        AirSearchExtender.collectionImages(mvspecs[i]!, pid!)
      }
      let span =  <HTMLSpanElement>document.createElement("span")
      span.setAttribute("class", "button") //「ポタン」スタイル
      span.appendChild(makeSlideButton)
      playButton?.parentElement?.after(span) //再生ボタンの親クラスがいれば
    }
  }
  private static collectionImages(mvspec:Element, pid:string, retry = AirSearchExtender.MAX_RETRY) {
    let flip2 = mvspec.querySelector("div.my-flip2") // もしくは #all_flips" + pid
    let imgs = <NodeListOf<HTMLImageElement>>flip2?.querySelectorAll("img.my-thumb_sdoc")
    if ( imgs?.length <= 0 ) {
      AirSearchExtender.pushDisplaySlide(mvspec, pid)
      console.log("RETRY:", retry)
      if ( retry > 0 ) {
        setTimeout( AirSearchExtender.collectionImages, AirSearchExtender.RETRY_WAIT, mvspec, pid, --retry)
      }
      return
    }
    let title = mvspec.querySelector("div.movie_name")?.textContent
    let subTitle = mvspec.querySelector("div.movie_theme")?.textContent?.replace(/(\t|^$\n)/mg,"").replace(/(^\n|\n$)/g,"")
    if (!title) { title="" }
    if (!subTitle) { subTitle="" }
    console.log(title, subTitle)
    MakeSlide.setupPDF(title, subTitle, imgs)
  }
  private static pushDisplaySlide(mvspec:Element, pid:string) {
    let a = <HTMLAnchorElement>mvspec.querySelector("div#showLink" + pid + ">a") //この動画スライドを表示
    //pid有るからdocumentでも良いけど
    if (!a) {
      a = <HTMLAnchorElement>mvspec.querySelector("span#showLink" + pid + ">a") //他のスライドも表示
    }
    if (!a){
      console.warn("Can not find expand slide button.")
    } else {
      a.click()
    }
  }
}
new AirSearchExtender()

