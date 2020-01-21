// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/// <reference types="jspdf" />
//import { jsPDF } from 'lib/jspdf.min'

class MakeSlide {
  static MAX_RETRY = 10
  static RETRY_WAIT = 1000 //ms
  constructor() {
    console.log("--- Start MakeSlide ---")
    //MessageUtil.assignMessages()
    MakeSlide.injectMakeButton()
  }
  // <input type="button" onclick="go(pid=000)">
  private static injectMakeButton() {
    let mvspecs = document.querySelectorAll("div.my-mvspec") //番組はいくつかある
    for (let i=0;i<mvspecs.length;i++) {
      let mvspec = mvspecs[i]
      let playButton = mvspec.querySelector("div.my-mvtools span.button>input") //1しかないはず
      let onmouseup=playButton.getAttribute("onmouseup")
      let pid = (onmouseup.match(/pid=(\d+)/)??[null, ""])[1] // Optional Chaining それとも??のNullish Coalescing
      let makeSlideButton = <HTMLInputElement>document.createElement("input")
      makeSlideButton.type = "button"
      makeSlideButton.value = "資料" //TODO: I18N
      makeSlideButton.onclick = (_e:MouseEvent) => {
        MakeSlide.collectionImages(mvspec, pid)
      }
      let span =  <HTMLSpanElement>document.createElement("span")
      span.setAttribute("class", "button") //「ポタン」スタイル
      span.appendChild(makeSlideButton)
      playButton.parentElement.after(span)
    }
  }
  private static pushDisplaySlide(mvspec:Element, pid:string) {
    let a = <HTMLAnchorElement>mvspec.querySelector("div#showLink" + pid + ">a") //pid有るからdocumentでも良いけど
    a.click()
  }
  private static collectionImages(mvspec:Element, pid:string, retry = this.MAX_RETRY) {
    let flip2 = mvspec.querySelector("div.my-flip2") // もしくは #all_flips" + pid
    let imgs = <NodeListOf<HTMLImageElement>>flip2.querySelectorAll("img.my-thumb_sdoc")
    if ( imgs?.length <= 0 ) {
      MakeSlide.pushDisplaySlide(mvspec, pid)
      console.log("RETRY:", retry)
      if ( retry > 0 ) {
        setTimeout( MakeSlide.collectionImages, this.RETRY_WAIT, mvspec, pid, --retry)
      }
      return
    }
    let title = mvspec.querySelector("div.movie_name").textContent
    let subTitle = mvspec.querySelector("div.movie_theme").textContent.replace(/(\t|^$\n)/mg,"").replace(/(^\n|\n$)/g,"")
    console.log(title, subTitle)
    let pdf = new jsPDF( {
      orientation: 'p',
      unit: 'px', //210x297  'px',  //2480px x 3507px 300DPI 1654x2339 200DPI 413x585 50DPI
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    })
    let manifest = chrome.runtime.getManifest() //Chrome拡張機能のマニュフェストファイル取得
    pdf.setProperties({
      title: title,
      subject: subTitle,
      author: "BBT",
      //keywords: tagged:
      creator: manifest.short_name + " " + manifest.version
    })
    pdf.setLanguage("ja-jp")
    //pdf.setFont('NotoSansCJKjp-Regular', 'normal')
    //pdf.setFont('IPAGothic', 'normal')
    pdf.setFont('umeplus-gothic', 'normal')
    pdf.setFontSize(16)
    // let gsDefault = {"opacity": 1, "stroke-opacity": 1}
    // pdf.addGState("def", gsDefault)
    // let gsTrans = {"opacity": 0, "stroke-opacity": 0}
    // pdf.addGState("trans", gsTrans)
    //pdf.setTextColor("#FFFFFF") //white
    //jsPDFのdefaultは300dpi https://github.com/MrRio/jsPDF/issues/132#issuecomment-28238493
    //let p = {w:210, h:297, mx:10, my:10} //{ w:2480, h:3507, mx:118, my:118} //マージン余白px
    let p:PDFprops = { w:446, h:632, mx:18, my:18, iw:0, ih:0 } //54DPI
    let w = imgs[0].naturalWidth
    let h = imgs[0].naturalHeight
    p.iw = p.w-(2*p.mx)
    p.ih = p.iw*h/w
    if ( p.ih > (p.h/2) ) {
      console.info("縦にちぎれた", p.ih ,">", (p.h/2) )
      p.ih = (p.h/2)-p.my
      p.iw = p.ih*w/h
    }
    console.log( w + " x " + h, p.iw, p.ih)
    MakeSlide.onePage(title, subTitle, p, imgs, pdf)
  }
  private static onePage(title:string, subTitle:string, p:PDFprops, imgs:NodeListOf<HTMLImageElement>, pdf:jsPDF, i = 0) {
    let img = new Image()
    //大きな画像でセット 640x360 や 640x480
    img.src = imgs[i].src.replace("/mdoc/", "/doc/").replace("http://","https://").replace("aaa.","www.")
    console.log(img.src)
    img.onload = () => { //<img src= を変えてロードが終わってから
      if ( i%2 === 0 && i !== 0 ) { pdf.addPage() }
     // pdf.setGState("def")
      pdf.addImage(img, "JPEG", p.mx, (i%2)*(p.h/2) + p.my, p.iw, p.ih, "Page " + (i+1) ) //資料は640x360や640x480

      console.log("Google Cloud Vition API call.",i );
      let canvas = document.createElement('canvas');
      canvas.width = img.width //サイズ設定をしておかないとdrowできない
      canvas.height = img.height
      //確認のために表示 img.after(canvas)
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0)
      //Base64取り出し
      let base64:string = canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/, "" );
      chrome.runtime.sendMessage( {cmd: "textDetection", text: base64}, (res:TextDetectionResult) => {
        console.log("認識結果", res.ans)
        if ( res.result === "done" && res.ans.text ) {
          //pdf.setGState("trans")
          pdf.text(res.ans.text, p.w, (i%2)*(p.h/2)+p.my ) //右欄外にOCR結果を出力
        }
        if ( i<(imgs.length-1) ) {
          MakeSlide.onePage(title,subTitle, p, imgs, pdf, ++i)
        } else {
          subTitle = subTitle.replace(/\n^ゲスト：.+$/m,"") //ゲスト:の行はのぞく
          if ( subTitle.indexOf("\n")>=0 ) {
            subTitle = "" //改行が有ったら
          } else if ( title.match(/\d$/) && subTitle.match(/^\d/) ) {
            subTitle = " " + subTitle
          }
          //8ページくらいまでしかダメ
          // let preview = document.createElement("iframe")
          // preview.setAttribute("frameborder", "0")
          // preview.setAttribute("width","640")
          // preview.setAttribute("height", "360")
          // preview.setAttribute("src", pdf.output("datauristring"))
          // mvspec.after(preview)
          pdf.save(title + subTitle + ".pdf")
        }
      })
    }
  }
}
new MakeSlide()
