// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />

class PlayerExstender {
  //定数
  private static RETRY_MAX = 10
  private static RETRY_WAIT = 1000 //ms
  //
  constructor() {
    console.log("--- Start PlayerExtender ---")
    new MakeSlide(PlayerExstender.injectMakeButton)
    PlayerExstender.sharpner()
    PlayerExstender.setDownloadable()
  }
  private static sharpner(retry = PlayerExstender.RETRY_MAX) {
    let imgs = document.querySelectorAll('div.carousel-item img.d-block.w-100.filterBlur2') //divの子がimgだけど、フェールセーフで子孫
    if (imgs.length === 0) {
      if (retry > 0 ) {
        console.log("Retry get image", retry)
        setTimeout( PlayerExstender.sharpner, PlayerExstender.RETRY_WAIT, --retry )
      } else {
        console.log("Retry over: Cannot get slide images.") //TODO: AirSearchiのBetaが取れたらwranにする
      }
      return
    }
    console.log("Find img.filterBlur2", imgs.length, imgs)
    Array.prototype.forEach.call(imgs, function (img:HTMLImageElement) {
      let orgClass = img.getAttribute("class")
      if (orgClass) {
        img.setAttribute("class", orgClass.replace(/filterBlur2/,"")) //曇り止め
      }
    })
    console.log("OK: Shapner",)
  }
  private static setDownloadable(retry = PlayerExstender.RETRY_MAX ) {
    let videos = document.querySelectorAll('video[controlslist~="nodownload"]') //2020-12-14フォーマット 2020-12-26には変わったかも
    if (videos.length === 0) {
      if ( retry !== PlayerExstender.RETRY_MAX && document.querySelectorAll("span.wapper-img").length !==0 ) {
        //ビデオの替わりの画像が有った
        console.log("Retry End: no video.")
      } else  if (retry > 0 ) {
        console.log("Retry get video", retry)
        setTimeout( PlayerExstender.setDownloadable, PlayerExstender.RETRY_WAIT, --retry )
      } else {
        console.log("Retry over: Cannot get video.") //もしかしたら視聴できない講義かも TODO: AirSearchのBataがとれたらwarnにする
      }
      return
    }
    Array.prototype.forEach.call(videos, function(video:HTMLVideoElement) {
      let orgControl = video.getAttribute('controlslist')
      if (orgControl) {
        if ( orgControl === "nodownload" ) { //controlslistはnodownloadだけ
          video.removeAttribute("controlsllist") //全部けしちゃう
        } else { //他のオプションも有った
          video.setAttribute('controlslist', orgControl.replace(/nodownload/,""))
        }
      }
      console.log("OK: Video downloader") //videoは一つしか無いので。沢山有る場合は考える
    })
  }
  public static injectMakeButton() {
    // MakeSlideのコンストラクターの延長で呼ばれる
    console.log("injectMakeButton - PlayerExtender")
    chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.GET_CONFIGURATIONS}, (config:Configurations) => {
      if  (!config.supportAirSearchBeta) {
        console.log("Not support AirSearch Beta") //Optionでenableになっていない。Permissionも出ていないのでボタンを表示しない
      }  else {
        // MakeSlideでフォントが読み込まれるまでボタンは出ない
        let slideCarousel = <HTMLDivElement>document.querySelector("div.carousel.slide") //1しかないはず 無い時nullだけど下でreturnするのでキャストでその先を助ける
        if ( !slideCarousel ) {
          console.error("Cannot find slide carousel.")
          return
        }
        let makeSlideButton = <HTMLInputElement>document.createElement("input") //作成
        makeSlideButton.type = "button"
        makeSlideButton.value = MessageUtil.getMessage(["image_PDF_document"])
        makeSlideButton.onclick = (_e:MouseEvent) => {
          let imgs = <NodeListOf<HTMLImageElement>>slideCarousel.querySelectorAll("img")
          PlayerExstender.collectionImages(imgs)
        }
        makeSlideButton.setAttribute("class", "rounded-pill")
        slideCarousel.parentElement!.after(makeSlideButton) //親は必ずある
      }
    })

  }
  private static collectionImages(imgs:NodeListOf<HTMLImageElement>) {
    //let video = document.querySelector("div.course-video")
    const w = imgs[0]!.naturalWidth    //最初のスライドのサイスが最後まで続くと仮定
    const h = imgs[0]!.naturalHeight
    //chrome.tabs.getCurrent()もquery()も使えないので
    window.innerWidth
    if ( window.innerWidth < w || window.innerHeight < h) {
      console.warn("Too small Window, need ( "+ w + " x " + h + ") actual ( " + window.innerWidth + " x " + window.innerHeight + " )" )
      alert(MessageUtil.getMessage(["too_small_window"]))
    }
    let canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    let ctx = canvas.getContext("2d")
    let tmpImg = new Image()
    let outRoot = document.createElement("div")
    PlayerExstender.getCapture(imgs, w, h, tmpImg, ctx, canvas, outRoot)
  }

  private static getCapture(imgs: NodeListOf<HTMLImageElement>, w: number, h: number, tmpImg: HTMLImageElement, ctx: CanvasRenderingContext2D | null, canvas: HTMLCanvasElement, outRoot: HTMLDivElement,i = 0) {
    if ( i > imgs.length ) {
      console.error("Unexpected Error range orver:", imgs)
      throw new Error("Unexpected Error imgs[] range over. " + i)
    }
    let img=<HTMLImageElement>imgs[i] //必ず有るのでnull避けキャスト
    //style="position:fixed; top:0; left:0; width:640px!important; width:360px; z-index:1021"  9999999
    img.setAttribute("style", "position:fixed; top:0; left:0; width:" + w + "px!important; width:" + h + "px; z-index:10000000") //左上隅で一番前
    img.parentElement!.style.display = "block" //表示

    chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.GET_CAPTURE_DATA }, (dataUrl: string) => {
      img.removeAttribute("style") //スタイルを元に戻す
      img.parentElement!.style.display = ""; //スタイルをリセット
      if (!dataUrl) {
        alert(MessageUtil.getMessage(["image_data_could_not_be_acquired"]))
        return
      }
      console.log("画像データ " + img.src, dataUrl.substr(0,40) )
      //確認 (<HTMLImageElement>(document.querySelector("img#videoMainThumb"))).src = imageData
      tmpImg.onload = () => {
        ctx?.drawImage(tmpImg, 0, 0) //タブ全体からキャンパスの大きさ w x h で切り出す
        let outImg = new Image()
        outImg.src = canvas.toDataURL()
        outRoot.appendChild(outImg)
        if (i >= imgs.length - 1) {
          //最後のスライド
          let title = (<HTMLDivElement>(document.querySelector("div.course-video, span.wapper-img")!.nextElementSibling)).innerText
          // "h1:not(.header__logo)" という手もあるけどね
          let subTitle = (<HTMLParagraphElement>document.querySelector("ol#TimeTable>li:first-child p:nth-of-type(2)")).innerText
          subTitle = subTitle.replace(/^[^#]+#\d+\s*/, "") // 頭にタイトル#番号 とタイトルが有ったら消す
          MakeSlide.setupPDF(title, subTitle, outRoot.querySelectorAll("img"))
        } else {
          //まだスライドがある
          PlayerExstender.getCapture(imgs, w, h, tmpImg, ctx, canvas, outRoot, ++i)
        }
      }
      tmpImg.src = dataUrl
    })

  }
}
new PlayerExstender()
