// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />

class PlayerExstender {
  //定数
  private static RETRY_MAX = 10
  private static RETRY_WAIT = 1000 //ms
  //
  public static injectMakeButton() {
    // MakeSlideのコンストラクターの延長で呼ばれる
    console.log("injectMakeButton - PlayerExtender")
    chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.GET_CONFIGURATIONS}, (config:Configurations) => {
      if  (!config.supportAirSearchBeta) {
        console.log("Not support AirSearch Beta") //Optionでenableになっていない。Permissionも出ていないのでボタンを表示しない
      }  else {
        // MakeSlideでフォントが読み込まれるまでボタンは出ない
        const slideCarousel = document.querySelector("div.carousel.slide") as HTMLDivElement //1しかないはず 無い時nullだけど下でreturnするのでキャストでその先を助ける
        if ( !slideCarousel ) {
          console.error("Cannot find slide carousel.")
          return
        }
        const makeSlideButton = document.createElement("input") as HTMLInputElement //作成
        makeSlideButton.type = "button"
        makeSlideButton.value = MessageUtil.getMessage(["image_PDF_document"])
        makeSlideButton.onclick = (_e:MouseEvent) => {
          const imgs = slideCarousel.querySelectorAll("img") as NodeListOf<HTMLImageElement>
          PlayerExstender.collectionImages(imgs)
        }
        makeSlideButton.setAttribute("class", "rounded-pill")
        slideCarousel.parentElement!.after(makeSlideButton) //親は必ずある
      }
    })
  }

  private static sharpner(retry = PlayerExstender.RETRY_MAX) {
    const imgs = document.querySelectorAll('div.carousel-item img.d-block.w-100.filterBlur2') //divの子がimgだけど、フェールセーフで子孫
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
    Array.prototype.forEach.call(imgs, (img: HTMLImageElement) => {
        const orgClass = img.getAttribute("class")
        if (orgClass) {
          img.setAttribute("class", orgClass.replace(/filterBlur2/, "")) //曇り止め
        }
      })
    console.log("OK: Shapner",)
  }
  private static setDownloadable(retry = PlayerExstender.RETRY_MAX ) {
    const videos = document.querySelectorAll('video')
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
    Array.prototype.forEach.call(videos, (video: HTMLVideoElement) => {
      const orgControls = video.getAttribute('controls')
      if(orgControls) { //controls属性が有った
        const orgControlsList = video.getAttribute('controlslist')
        if (orgControlsList) {
          if (orgControlsList === "nodownload") { //controlslistはnodownloadだけ
            video.removeAttribute("controlsllist") //全部けしちゃう
          } else { //他のオプションも有った
            video.setAttribute('controlslist', orgControlsList.replace(/nodownload/, ""))
          }
        }
      } else { //controls属性が無い 当然controlslistも無い 2021/06/06発見
        video.setAttribute('controls',"")
      }
      console.log("OK: Video downloader") //videoは一つしか無いので。沢山有る場合は考える
    })
  }
  private static collectionImages(imgs:NodeListOf<HTMLImageElement>) {
    //let video = document.querySelector("div.course-video")
    const w = imgs[0]!.naturalWidth    //最初のスライドのサイスが最後まで続くと仮定
    const h = imgs[0]!.naturalHeight
    //chrome.tabGroups.getZoom()は使えない
    chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.GET_ZOOM_FACTOR }, (zoomFactor: number) => {
      //chrome.tabs.getCurrent()もquery()も使えないので
      const clientWidth = Math.floor(document.documentElement.clientWidth * zoomFactor) //Zoom無しのサイズ切り捨て
      const clientHeight = Math.floor(document.documentElement.clientHeight * zoomFactor)
      if ( clientWidth < w || clientHeight < h) {
        console.warn("Too small Window, need ( "+ w + " x " + h +
                     ") actual ( " + clientWidth + " x " + clientHeight + " )" )
        alert(MessageUtil.getMessage(["too_small_window"]))
      }
      //Windowに何枚スライドが入るか?
      const nx = Math.floor( clientWidth / w ) //横数
      const ny = Math.floor( clientHeight/ h ) //縦数
      console.log("Window("+clientWidth+", "+clientHeight+") Slide("+w+", "+h+") nx="+nx+" ny="+ny )
      //画像のサイズでCapture用のcanvas作る
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      const tmpImg = new Image()
      const outRoot = document.createElement("div")
      PlayerExstender.getCapture(imgs, w, h, nx, ny, tmpImg, ctx, canvas, outRoot)
    })
  }

  private static getCapture(imgs: NodeListOf<HTMLImageElement>, //画像一覧
                            w: number, h: number, //画像サイズ
                            nx: number, ny: number, //縦横何枚ウィンドウに並べられるか
                            tmpImg: HTMLImageElement,
                            ctx: CanvasRenderingContext2D | null, canvas: HTMLCanvasElement, //テンポラリ領域
                            outRoot: HTMLDivElement, //出力先
                            i = 0) {
    if ( i > imgs.length ) {
      console.error("Unexpected Error range orver:", imgs)
      throw new Error("Unexpected Error imgs[] range over. " + i)
    }
    const img=imgs[i] as HTMLImageElement //必ず有るのでnull避けキャスト
    const left = ( i % nx ) * w
    const top = Math.floor( (i%(nx*ny)) / nx ) * h
    console.log("Slide", i, left, top)
    //style="position:fixed; top:0; left:0; width:640px!important; width:360px; z-index:1021"  9999999
    img.setAttribute("style", "position:fixed; left:" + left + "px; top:" + top + "px; width:"
                      + w + "px!important; width:" + h + "px; z-index:10000000") //左上隅で一番前
    img.parentElement!.style.display = "block" //表示

    if ( (i >= imgs.length-1) || ( ((i+1) % (nx*ny))===0 ) ) {
      //最後のページか、すべてウィンドウに並べ終わったらCapture
      chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.GET_CAPTURE_DATA }, (dataUrl: string) => {
        if (!dataUrl) {
          alert(MessageUtil.getMessage(["image_data_could_not_be_acquired"]))
          return
        }
        console.log("Captureデータ " + img.src, dataUrl.substr(0,40) )
        //確認 (<HTMLImageElement>(document.querySelector("img#videoMainThumb"))).src = imageData

        tmpImg.onload = () => {
          for(let j=i-(i%(nx*ny)); j<=i; j++) { //並んだ画像の切り出し
            //Captureのために移動してたスライド画像を元の場所に戻す
            const img1 = imgs[j] as HTMLImageElement
            img1.removeAttribute("style") //スタイルを元に戻す
            img1.parentElement!.style.display = ""; //スタイルをリセット

            //tab全体のcaptuerから、それぞれの画像を切り出す
            const left1 = ( j % nx ) * w
            const top1 = Math.floor( (j%(nx*ny)) / nx ) * h
            console.log("drawImage",j, left1, top1)

            ctx?.drawImage(tmpImg, left1, top1, w, h, 0,0, w, h)
            const outImg = new Image(w, h)
            outImg.src = canvas.toDataURL("image/png") //canvasをimgにする onladされない 96dpi
            console.log(j, "(" + outImg.width +"," + outImg.height + ")" )
            //console.log(outImg.src)
            outRoot.appendChild(outImg) //一覧に追加 TODO: outImg.src読み込み待ち
          }
          if (i >= imgs.length - 1) {
            //最後のスライド
            console.log("Last slide", i)
            const title = ((document.querySelector("div.course-video, span.wapper-img")!.nextElementSibling) as HTMLDivElement)
                            .innerText
            // "h1:not(.header__logo)" という手もあるけどね
            let subTitle = (document.querySelector(".MuiTypography-subtitle1") as HTMLDivElement)
                            .innerText.replace(/\s/g,"")
            //タイムテーブル1つめより フォーマット変更 2021/5
            // (document.querySelector("ol#TimeTable>li:first-child p:nth-of-type(2)") as HTMLParagraphElement).innerText
            subTitle = subTitle.replace(/^[^#]+#\d+\s*/, "") // 頭にタイトル#番号 とタイトルが有ったら消す
            //TODO: 1秒待つのはoutImg.srcを待っていない対処療法Workaround
            setTimeout(() => {
              let retry = 1
              try {
                MakeSlide.setupPDF(title, subTitle, outRoot.querySelectorAll("img"))
              } catch (ex) {
                //一度だけリトライ TODO: 外側で1秒待てばいらないけど
                if ( ex instanceof RangeError && ex.message.indexOf("setupPDF()") >=0 && retry-- > 0 ) {
                  console.warn("retry setupPDF()", retry, ex)
                  setTimeout(() => {
                    MakeSlide.setupPDF(title, subTitle, outRoot.querySelectorAll("img"))
                  }, 1000)
                }
              }
            }, 1000)
          } else {
            //次のCapture まだスライドがある
            PlayerExstender.getCapture(imgs, w, h, nx, ny, tmpImg, ctx, canvas, outRoot, ++i)
          }
        }
        tmpImg.src = dataUrl
      })
    } else { // まだCaputureせず、次のスライド
      //まだスライドがある
      PlayerExstender.getCapture(imgs, w, h, nx, ny, tmpImg, ctx, canvas, outRoot, ++i)
    }

  }

  constructor() {
    console.log("--- Start PlayerExtender ---")
    // tslint:disable-next-line: no-unused-expression
    new MakeSlide(PlayerExstender.injectMakeButton)
    PlayerExstender.sharpner()
    PlayerExstender.setDownloadable()
  }
}
// tslint:disable-next-line: no-unused-expression
new PlayerExstender()
