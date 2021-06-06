// -*- coding: utf-8-unix -*-
/// <reference types="jspdf" />

//VScode生成 import * as jspdf from "jspdf"

//const module = await import('./lib/jspdf.es.min.js');
//const jsPDF = new module.jsPDF();

// const script = document.createElement('script');
// script.setAttribute('src', chrome.extension.getURL('lib/jspdf.es.min.js'));
// script.setAttribute('type', 'module');
// const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
// head.insertBefore(script, head.lastChild);

// import "lib/jspdf.es.min.js"

class MakeSlide {
  //jsPDF 追加font
  static font:string

  public static setupPDF(title: string, subTitle: string, imgs: NodeListOf<HTMLImageElement>) {
    if ( imgs.length === 0 ) {
      throw new RangeError("setupPDF(): no images." + {title, subTitle, imgs} )
    }
    const pdf = new jspdf.jsPDF({
      orientation: 'p',
      unit: 'px',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    })
    const manifest = chrome.runtime.getManifest() //Chrome拡張機能のマニュフェストファイル取得
    pdf.setProperties({
      title,
      subject: subTitle,
      author: "BBT",
      //keywords: tagged:
      creator: manifest.short_name + " " + manifest.version
    })
    pdf.setFont(MakeSlide.FONT_NAME, MakeSlide.FONT_TYPE.toLowerCase())
    //pdf.setFont('NotoSansCJKjp-Regular', 'normal')
    //pdf.setFont('IPAGothic', 'normal')
    //pdf.setFont('umeplus-gothic', 'normal')
    //pdf.setFont('Koruri', 'regular')
    //pdf.setFontSize(20)
    // let gsDefault = {"opacity": 1, "stroke-opacity": 1}
    // pdf.addGState("def", gsDefault)
    // let gsTrans = {"opacity": 0, "stroke-opacity": 0}
    // pdf.addGState("trans", gsTrans)
    //pdf.setTextColor("#FFFFFF") //white
    pdf.setLanguage("ja-jp")
    //jsPDFのdefaultは300dpi https://github.com/MrRio/jsPDF/issues/132#issuecomment-28238493
    //let p = {w:210, h:297, mx:10, my:10} //{ w:2480, h:3507, mx:118, my:118} //マージン余白px
    const p: PDFprops = { w: 446, h: 632, mx: 18, my: 18, iw: 0, ih: 0 } //54DPI(pxでほしいので実験算出値)
    const w = imgs[0]!.naturalWidth //小さいがそうだけど縦横比取るには十分なはず
    const h = imgs[0]!.naturalHeight
    if ( w === 0 || h === 0) {
      throw new RangeError("setupPDF(): Image Side size 0. (" + w + "x" + h +")")
    }
    p.iw = p.w - (2 * p.mx)  //PDFイメージ幅 px
    p.ih = p.iw * h / w      //PDFイメージ高 px  幅基準で高さを算出
    if (p.ih > (p.h / 2)) { //縦に二枚分の高さpx が ページ高さを超えた
      console.info("縦にちぎれた", p.ih, ">", (p.h / 2))
      p.ih = (p.h / 2) - p.my
      p.iw = p.ih * w / h      //PDFイメージ高さ基準で幅を算出
    }
    console.log(w + " x " + h, p.iw, p.ih)
    MakeSlide.onePage(title, subTitle, p, imgs, pdf)
  }

  //定数
  private static FONT_NAME="ipag"
  private static FONT_TYPE="normal" //ファイル名としてはそのまま使うsetFont時は小文字に自動変換 "normal"の場合ファイル名として含めない

  private static onePage(title:string, subTitle:string, p:PDFprops, imgs:NodeListOf<HTMLImageElement>, pdf:jspdf.jsPDF, ctx:CanvasRenderingContext2D|null = null, buf:CanvasRenderingContext2D|null = null, i = 0) {
    //PDF処理中アイコン点滅
    chrome.runtime.sendMessage( {cmd: BackgroundMsgCmd.SET_ICON, text: "PDF"}, (_response:BackgroundResponse) => {
      MessageUtil.checkRuntimeError(BackgroundMsgCmd.SET_ICON)
      setTimeout( ()=>{
        //0.5秒後に消す  次のページに追いつかれても最後消すから問題なし
        // tslint:disable-next-line: no-shadowed-variable
        chrome.runtime.sendMessage( {cmd: BackgroundMsgCmd.SET_ICON, text: ""}, (_response:BackgroundResponse) => {
          MessageUtil.checkRuntimeError(BackgroundMsgCmd.SET_ICON)
        })
      }, 500) //500ms
    })
    const img = new Image()
    let src =""
    if ( imgs[i] && /^https?:\/\//.test(imgs[i]!.src) ) {
      //大きな画像でセット 640x360 や 640x480 //AirSearch Bataの視聴画面では拡大の必要ない
      //CORS対応のため親のURLと同じサーバーから画像を取ってくるためのURL変換
      src = imgs[i]!.src.replace("/mdoc/", "/doc/").replace("http://","https://").replace("aaa.","www.")
    } else {
      src = imgs[i]!.src  //この場合再ロードはいらないけれどonloadを触るのでnewしたImageを使う
    }
    console.log(imgs[i]!.src.substr(0,100)) //元のsrc 頭だけ
    img.onload = () => { //<img src= を変えてロードが終わってから
      console.log(img.src.substr(0,100))  //変換後src 頭だけ
      const w = img.naturalWidth
      const h = img.naturalHeight
      const nUp = 2 //PDF 1ページにいくつの画像をいれるか
      //OCR準備
      const ocrPages = nUp*1 // OCRの1ページの画像数 nUpの倍数が良い
      if ( i === 0 || !ctx ) { //最初のページのときにCanvas作る
        console.log("Create Canvas")
        const canvas = document.createElement('canvas')
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
        ctx!.clearRect(0,0, w, h*ocrPages)
      }
      ctx!.drawImage(img, 0, h * (i%ocrPages) ) //画像をまとめる

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
          let imgData:ImageData|undefined
          try {
            imgData = ctx?.getImageData(0, h*j, w, h) //まとめた画像を1つづ取り出す
          } catch (e) {   //getImageData()がCORSで引っかかる
            console.error("Exception in getImageData()", e)
            alert(MessageUtil.getMessage(["cannot_get_image_data"]))
            return
          }
          //いらない buf.clearRect(0,0,w,h)
          if ( !imgData ) {
            console.error("Canot getImageData(0,"+(h*j)+","+w+","+h+")",ctx)
            throw new Error("Cannot getImagaData")
          } else {
            buf!.putImageData(imgData,0,0)
          }
          // pdf.setGState("def")
          if ( j%nUp === 0 && j !== 0 ) { pdf.addPage() }
          if (!buf) {
            console.error("Buf no init.")
            throw new Error("Buf no init.")
          } else {
            pdf.addImage(buf.canvas, "JPEG", p.mx, (j%nUp)*(p.h/nUp) + p.my, p.iw, p.ih, "Page " + (b+j+1) ) //資料は640x360や640x480
          }
        }
        console.log("Google Cloud Vition API call.",i )
        //Base64取り出し
        const base64 = ctx?.canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/, "" );
        if (!base64 ) {
          console.error("Cannot toDataURL")
          throw new Error("Cannot toDataURL")
        }
        chrome.runtime.sendMessage( {cmd:BackgroundMsgCmd.TEXT_DETECTION, text: base64}, (res:TextDetectionResult) => {
          if ( res.result === "done" && res.ans.fullTextAnnotation?.text ) {
            console.log("認識結果", res.ans)
            //pdf.setGState("trans")
            pdf.text(res.ans.fullTextAnnotation.text, p.w, p.my ) //TODO:画像と文字の重ね合わせ 今は右欄外にOCR結果を出力 (i%2)*(p.h/2)+p.my
          } else if ( res.result === "fail") {
            console.error("Image OCR text detection Error: "+ res.errorMessage)
            alert(MessageUtil.getMessage(["ACex_name", "\n", "text_detection_error"]) + "\n" + res.errorMessage )
            throw new Error(res.errorMessage) //認識失敗で中断
          } else { // result === "none"  // no API key
            console.log("No text detection.")
          }
          if ( i<(imgs.length-1) ) {
            MakeSlide.onePage(title,subTitle, p, imgs, pdf, ctx, buf, ++i)
          } else {
            //全ページ完了
            subTitle = subTitle.replace(/\n^ゲスト：.+$/m,"") //ゲスト:の行はのぞく
            const lf = subTitle.match(/\n/gm)?.length  //マッチしないとnull つまり 0
            if ( lf && lf > 1  ) { // 3行以上 「大前ライブ」とか
              subTitle = ""
            }else if ( lf === 1 ) { //2行なら1行にする
              subTitle = subTitle.replace(/\n/m, "")
            } //1行 もしくは 0行 はなにもしない
            //タイトルなどの全角英数字を半角へ
            title=MakeSlide.zenkaku2Hankaku(title)
            subTitle=MakeSlide.zenkaku2Hankaku(subTitle)
            //間のスペースを除く
            title=MakeSlide.squeezeSpace(title)
            subTitle=MakeSlide.squeezeSpace(subTitle)

            //8ページくらいまでしかダメ
            // let preview = document.createElement("iframe")
            // preview.setAttribute("frameborder", "0")
            // preview.setAttribute("width","640")
            // preview.setAttribute("height", "360")
            // preview.setAttribute("src", pdf.output("datauristring"))
            // mvspec.after(preview)

            //タイトルとサブタイトルをつなげてファイル名にして保存
            if ( title.match(/\d$/) && subTitle.match(/^\d/) ) {
              subTitle = " " + subTitle //数字が重なるならスペース入れる
            }
            pdf.save(title + subTitle + ".pdf")
          }
        })
      }
    }
    //
    img.src = src //画像ロードの実行
  }
  private static squeezeSpace(str:string) {  //英字以外の前のスペースを削除する
    //英字以外の前のスペースを除いている
    return str.replace(/ +(?![A-Za-z])/gm,  "")
  }
  private static zenkaku2Hankaku(str:string) { //全角英数半角変換
    return str.replace(/[！-｝]/g, (s) => {   //全角英数  〜を除く  cf. 半角英数[ -~]
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    })
  }

  private static setupFonts(cb:()=>void) {
    if (!MakeSlide.font) {
      chrome.runtime.sendMessage({cmd:BackgroundMsgCmd.GET_FONTDATA}, (response:FontData) => {
        if ( response.data !== "") {
          console.log("Font:", response.length, response.data)
          if ( response.data.length !== response.length ) {
            console.error("Font length missmatch. Error on message passing?")
          }
          MakeSlide.font = response.data
          jspdf.jsPDF.API.events.push(['addFonts', MakeSlide.callAddFont])
        } else {
          console.error("Can not get Font Data.")
        }
        if (cb) { cb() }
      })
    } else {
      //font set 済み
      console.info("Alread setup font.") //ここに来るパターンみつけていないけど
      if (cb) { cb() }
    }
  }
  static callAddFont = function(this:jspdf.jsPDF) { //jsPDFからコールバックされる
    // 'this' will be ref to internal API object.
    // this.addFileToVFS('Koruri-Regular.ttf', MakeSlide.font);
    // this.addFont('Koruri-Regular.ttf', 'Koruri', 'regular');
    // this.addFileToVFS('umeplus-gothic.ttf', MakeSlide.font);
    // this.addFont('umeplus-gothic.ttf', 'umeplus-gothic', 'normal');
    let filename = MakeSlide.FONT_NAME
    if (MakeSlide.FONT_TYPE !== "normal" ) { //FONT_TYPEがnormalのときにはFONT_NAMEのみ
      filename += "-" + MakeSlide.FONT_TYPE
    }
    filename += ".ttf"
    this.addFileToVFS(filename, MakeSlide.font);
    this.addFont(filename, MakeSlide.FONT_NAME, MakeSlide.FONT_TYPE.toLowerCase());
  }

  constructor(cb:()=>void) {
    console.log("--- Start MakeSlide ---")
    //MessageUtil.assignMessages()
    MakeSlide.setupFonts( cb )
  }
}
//new MakeSlide(MakeSlide.injectMakeButton)

//import { jsPDF } from 'jspdf'
//import jspdf from 'jspdf' //"allowSyntheticDefaultImports": true,
//import * as jspdf from 'jspdf'
