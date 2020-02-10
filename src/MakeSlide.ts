// -*- coding: utf-8-unix -*-
//import { jsPDF } from 'lib/jspdf.min'

class MakeSlide {
  static MAX_RETRY = 10
  static RETRY_WAIT = 1000 //ms
  //jsPDF 追加font
  static font:string
  static callAddFont = function() {
    // 'this' will be ref to internal API object.
    this.addFileToVFS('ipag.ttf', MakeSlide.font);
    this.addFont('ipag.ttf', 'IPAGothic', 'normal');
  }
  constructor() {
    console.log("--- Start MakeSlide ---")
    //MessageUtil.assignMessages()
    MakeSlide.setupFonts( MakeSlide.injectMakeButton )
  }
  private static setupFonts(cb:()=>void = null) {
    if (!MakeSlide.font) {
      chrome.runtime.sendMessage({cmd: "getFontData"}, (response:FontData) => {
        if ( response.data !== "") {
          MakeSlide.font = response.data
          jsPDF.API.events.push(['addFonts', MakeSlide.callAddFont])
        } else {
          console.error("Can not get Font Data.")
        }
        cb()
      })
    } else {
      //font set 済み
      console.info("Alread setup font.") //ここに来るパターンみつけていないけど
      cb()
    }
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
    pdf.setFont('IPAGothic', 'normal')
    //pdf.setFont('umeplus-gothic', 'normal')
    pdf.setFontSize(16)
    // let gsDefault = {"opacity": 1, "stroke-opacity": 1}
    // pdf.addGState("def", gsDefault)
    // let gsTrans = {"opacity": 0, "stroke-opacity": 0}
    // pdf.addGState("trans", gsTrans)
    //pdf.setTextColor("#FFFFFF") //white
    //jsPDFのdefaultは300dpi https://github.com/MrRio/jsPDF/issues/132#issuecomment-28238493
    //let p = {w:210, h:297, mx:10, my:10} //{ w:2480, h:3507, mx:118, my:118} //マージン余白px
    let p:PDFprops = { w:446, h:632, mx:18, my:18, iw:0, ih:0 } //54DPI
    let w = imgs[0].naturalWidth  //小さいがそうだけど縦横比取るには十分なはず
    let h = imgs[0].naturalHeight
    p.iw = p.w-(2*p.mx)
    p.ih = p.iw*h/w
    if ( p.ih > (p.h/2) ) {
      console.info("縦にちぎれた", p.ih ,">", (p.h/2) )
      p.ih = (p.h/2)-p.my
      p.iw = p.ih*w/h
    }
    console.log( w + " x " + h, p.iw, p.ih)
    MakeSlide.onePage(title, subTitle, p, imgs, pdf, null, null)
  }
  private static onePage(title:string, subTitle:string, p:PDFprops, imgs:NodeListOf<HTMLImageElement>, pdf:jsPDF, ctx:CanvasRenderingContext2D, buf:CanvasRenderingContext2D, i = 0) {
    let img = new Image()
    //大きな画像でセット 640x360 や 640x480
    img.src = imgs[i].src.replace("/mdoc/", "/doc/").replace("http://","https://").replace("aaa.","www.")
    console.log(img.src)
    img.onload = () => { //<img src= を変えてロードが終わってから
      const w = img.naturalWidth
      const h = img.naturalHeight
      const nUp = 2 //PDF 1ページにいくつの画像をいれるか
      //OCR準備
      const ocrPages = nUp*1 // OCRの1ページの画像数 nUpの倍数が良い
      if ( i === 0 || ctx === null ) { //最初のページのときにCanvas作る
        let canvas = document.createElement('canvas')
        canvas.width = w //サイズ設定をしておかないとdrawできない
        canvas.height = h*ocrPages  //縦 2枚分
        console.info("img ", w, "x", h )
        ctx = canvas.getContext('2d')  //各画像でctxは使い回す
        //確認のために表示 img.after(canvas) //ベージ毎に書き換わる
        //PDFへ画像の貼り付け用
        const bufCanvas = document.createElement('canvas')
        bufCanvas.width = w //サイズ設定をしておかないとdrawできない
        bufCanvas.height = h
        buf=bufCanvas.getContext('2d')
      }
      //2ページをまとめる
      if ( i%ocrPages === 0 ) { //最初のページでクリア
        ctx.clearRect(0,0, w, h*ocrPages)
      }
      ctx.drawImage(img, 0, h * (i%ocrPages) ) //画像をまとめる

      if ( i%ocrPages !== (ocrPages-1) && i < (imgs.length-1) ) {
        //最後の画像ではない奇数画像
        console.info("---------------------------", i )
        MakeSlide.onePage(title,subTitle, p, imgs, pdf, ctx, buf, ++i)
      } else {
        //偶数画像もしくは最後の画像
        const b = Math.floor(i/ocrPages)*ocrPages //このターンの始めの画像番号
        //PDFへ画像貼り付け
        if ( i >= ocrPages ) { pdf.addPage() }
        for( let j = 0; j<ocrPages; j++) {
          if ( b + j >= imgs.length ) {
            break; //全画像終了
          }
          let imgData = ctx.getImageData(0, h*j, w, h) //まとめた画像を1つづ取り出す
          //いらない buf.clearRect(0,0,w,h)
          buf.putImageData(imgData,0,0)
          // pdf.setGState("def")
          if ( j%nUp === 0 && j !== 0 ) { pdf.addPage() }
          pdf.addImage(buf.canvas, "JPEG", p.mx, (j%nUp)*(p.h/nUp) + p.my, p.iw, p.ih, "Page " + (b+j+1) ) //資料は640x360や640x480
        }
        console.log("Google Cloud Vition API call.",i )
        //Base64取り出し
        let base64:string = ctx.canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/, "" );
        chrome.runtime.sendMessage( {cmd: "textDetection", text: base64}, (res:TextDetectionResult) => {
          console.log("認識結果", res.ans)
          if ( res.result === "done" && res.ans.text ) {
            //pdf.setGState("trans")
            pdf.text(res.ans.text, p.w, p.my ) //右欄外にOCR結果を出力 (i%2)*(p.h/2)+p.my TODO:重ね合わせ
          }
          if ( i<(imgs.length-1) ) {
            MakeSlide.onePage(title,subTitle, p, imgs, pdf, ctx, buf, ++i)
          } else {
            //全ページ完了
            subTitle = subTitle.replace(/\n^ゲスト：.+$/m,"") //ゲスト:の行はのぞく
            let lf = subTitle.match(/\n/gm)?.length  //マッチしないとnull つまり 0
            if ( lf > 1  ) { // 3行以上 「大前ライブ」とか
              subTitle = ""
            }else if ( lf === 1 ) { //2行なら1行にする
              subTitle = subTitle.replace(/\n/m, "")
            } //1行 もしくは 0行 はなにもしない
            if ( title.match(/\d$/) && subTitle.match(/^\d/) ) {
              subTitle = " " + subTitle //数字が重なるならスペース入れる
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
}
new MakeSlide()
