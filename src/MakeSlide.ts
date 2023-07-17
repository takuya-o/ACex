// -*- coding: utf-8-unix -*-
/* eslint-disable max-lines */

import { BackgroundMsgCmd, BackgroundResponse, PDFprops, TextAnnotations, TextDetectionResult } from './Types'
import { MessageUtil } from './MessageUtil'
import jsPDF from 'jspdf'

/* tslint:disable: max-classes-per-file */
/* tslint:disable: object-literal-sort-keys */

declare const ipag: string //IPAフォント lib/ipag00303/ipag-ttf.js

export class MakeSlide {
  public static setupPDF(title: string, subTitle: string, imgs: NodeListOf<HTMLImageElement>): void {
    if (imgs.length < 1 || !imgs[0]) {
      throw new RangeError(`setupPDF(): no images.${{ title, subTitle, imgs }}`)
    }
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true,
    })
    const manifest = chrome.runtime.getManifest() //Chrome拡張機能のマニュフェストファイル取得
    pdf.setProperties({
      title,
      subject: subTitle,
      author: 'BBT', //keywords: tagged:
      creator: manifest.short_name + ' ' + manifest.version,
    })
    pdf.setFont(MakeSlide.FONT_NAME, MakeSlide.FONT_TYPE.toLowerCase())
    //pdf.setFont('NotoSansCJKjp-Regular', 'normal')
    //pdf.setFont('IPAGothic', 'normal')
    //pdf.setFontSize(20)
    // let gsDefault = {"opacity": 1.0 }
    // pdf.addGState("default", gsDefault)
    // let gsTrans = {"opacity": 0.0 }
    // pdf.addGState("trans", gsTrans)
    //pdf.setTextColor("#FFFFFF") //white
    pdf.setLanguage('ja') // ja-jpは定義されていない
    //jsPDFのdefaultは300dpi https://github.com/MrRio/jsPDF/issues/132#issuecomment-28238493
    //let p = {w:210, h:297, mx:10, my:10} //{ w:2480, h:3507, mx:118, my:118} //マージン余白px
    const p: PDFprops = { w: 446, h: 632, mx: 18, my: 18, iw: 0, ih: 0 } //54DPI(pxでほしいので実験算出値)
    MakeSlide.caclImazeRegion(imgs[0], p)
    MakeSlide.onePage(title, subTitle, p, imgs, pdf)
  }
  public static callAddFont = function (this: jsPDF) {
    //jsPDFからコールバックされる
    // 'this' will be ref to internal API object.
    // this.addFileToVFS('Koruri-Regular.ttf', MakeSlide.font);
    // this.addFont('Koruri-Regular.ttf', 'Koruri', 'regular');
    // this.addFileToVFS('umeplus-gothic.ttf', MakeSlide.font);
    // this.addFont('umeplus-gothic.ttf', 'umeplus-gothic', 'normal');
    let filename = MakeSlide.FONT_NAME
    if (MakeSlide.FONT_TYPE !== 'normal') {
      //FONT_TYPEがnormalのときにはFONT_NAMEのみ
      filename += '-' + MakeSlide.FONT_TYPE
    }
    filename += '.ttf'
    this.addFileToVFS(filename, MakeSlide.font)
    this.addFont(filename, MakeSlide.FONT_NAME, MakeSlide.FONT_TYPE.toLowerCase())
  }
  //jsPDF 追加font
  private static font: string

  //定数
  private static FONT_NAME = 'ipag'
  private static FONT_TYPE = 'normal' //ファイル名としてはそのまま使うsetFont時は小文字に自動変換 "normal"の場合ファイル名として含めない

  private static caclImazeRegion(img: HTMLImageElement, p: PDFprops) {
    // imgから p.iwと p.ih を計算
    const w = img.naturalWidth //まだimgは小さい画像だけど縦横比取るには十分なはず
    const h = img.naturalHeight
    if (w === 0 || h === 0) {
      throw new RangeError(`setupPDF(): Image Side size 0. (${w}x${h})`)
    }
    p.iw = p.w - 2 * p.mx //PDFイメージ幅 px
    p.ih = (p.iw * h) / w //PDFイメージ高 px  まずは幅基準で高さを算出
    if (p.ih > (p.h - 2 * p.my) / 2) {
      //縦に二枚分の高さpx が ページ高さを超えた
      console.info(`縦にちぎれた ${p.ih}>${p.h / 2}`)
      // 上下の画像の間にはすき間無くて縦のマージンはページの上下のみ
      p.ih = (p.h - 2 * p.my) / 2
      p.iw = (p.ih * w) / h //PDFイメージ高さ基準で幅を算出
    }
    console.log(`Page Side:${w} x ${h} Image Region:${p.iw} ${p.ih}`)
  }

  // eslint-disable-next-line max-lines-per-function
  private static onePage(
    title: string,
    subTitle: string,
    p: PDFprops,
    imgs: NodeListOf<HTMLImageElement>,
    pdf: jsPDF,
    ctx: CanvasRenderingContext2D | null = null,
    buf: CanvasRenderingContext2D | null = null,
    pageNo = 0,
  ) {
    MakeSlide.blinkingPDFonBadge() //PDF処理中アイコン点滅
    const img = new Image()
    let src = ''
    if (imgs[pageNo] && /^https?:\/\//.test(imgs[pageNo]!.src)) {
      //大きな画像でセット 640x360 や 640x480 //AirSearch Bataの視聴画面では拡大の必要ない
      //CORS対応のため親のURLと同じサーバーから画像を取ってくるためのURL変換
      src = imgs[pageNo]!.src.replace('/mdoc/', '/doc/').replace('http://', 'https://').replace('aaa.', 'www.')
    } else {
      src = imgs[pageNo]!.src //この場合再ロードはいらないけれどonloadを触るのでnewしたImageを使う
    }
    console.log(imgs[pageNo]!.src.slice(0, 100)) //元のsrc 頭だけ
    // eslint-disable-next-line max-lines-per-function
    img.onload = () => {
      //<img src= を変えてロードが終わってから
      console.log(img.src.slice(0, 100)) //変換後src 頭だけ
      const w = img.naturalWidth
      const h = img.naturalHeight
      const nUp = 2 //PDF 1ページにいくつの画像をいれるか
      //OCR準備
      const ocrPages = nUp * 1 // OCRの1ページの画像数 nUpの倍数が良い
      if (pageNo === 0 || !ctx) {
        //最初のページのときにCanvas作る OCR用ctx:縦2枚分=ocrPages PDF用buf:画像一枚分
        ;({ ctx, buf } = MakeSlide.onePageCreateCanvas(w, h, ocrPages))
      }

      //2ページをまとめる
      if (pageNo % ocrPages === 0) {
        //最初のページでクリア
        ctx!.clearRect(0, 0, w, h * ocrPages)
      }
      ctx!.drawImage(img, 0, h * (pageNo % ocrPages)) //画像をまとめる

      if (pageNo % ocrPages !== ocrPages - 1 && pageNo < imgs.length - 1) {
        //最後の画像ではない奇数画像
        console.info('---------------------------', pageNo)
        MakeSlide.onePage(title, subTitle, p, imgs, pdf, ctx, buf, ++pageNo)
      } else {
        //偶数画像もしくは最後の画像
        const beginPage = Math.floor(pageNo / ocrPages) * ocrPages //このターンの始めの画像番号
        if (!buf) {
          console.error('Buf no init.')
          throw new Error('Buf no init.')
        }
        //PDFへ画像貼り付け
        if (pageNo >= ocrPages) {
          pdf.addPage() // PDF 1ページ目以降はページを作る必要がある
        }
        for (let j = 0; j < ocrPages; j++) {
          // PDF用に1ページ分ずつ画像データを取り出してPDFに貼り付ける
          if (beginPage + j >= imgs.length) {
            break //全画像終了
          }
          let imgData: ImageData | undefined
          try {
            imgData = ctx?.getImageData(0, h * j, w, h) //まとめた画像を1つづ取り出す
          } catch (e) {
            //getImageData()がCORSで引っかかる
            console.error('Exception in getImageData()', e)
            alert(MessageUtil.getMessage(['cannot_get_image_data']))
            return
          }
          //いらない buf.clearRect(0,0,w,h)
          if (!imgData) {
            console.error(`Canot getImageData(0,${h * j},${w},${h})`, ctx)
            throw new Error('Cannot getImagaData')
          } else {
            buf.putImageData(imgData, 0, 0)
          }
          // pdf.setGState("def")
          if (j % nUp === 0 && j !== 0) {
            pdf.addPage()
          }
          pdf.addImage(
            imgs[beginPage + j]!, //buf.canvas, //HTMLImageElementで良さそう //TODO: buf使ってないので消す
            'PNG',
            p.mx,
            (j % nUp) * p.ih + p.my, //上下で隙間なく詰める
            p.iw,
            p.ih,
            'Page ' + (beginPage + j + 1),
          ) //資料は640x360や640x480
        }
        // OCRで文字生成
        console.log('Google Cloud Vition API call.', pageNo)
        //Base64取り出し
        const base64 = ctx?.canvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '') //PNGのほうが良い画像だけど認識はできないかも
        if (!base64) {
          console.error('Cannot toDataURL')
          throw new Error('Cannot toDataURL')
        }
        chrome.runtime.sendMessage(
          { cmd: BackgroundMsgCmd.TEXT_DETECTION, text: base64 },
          (res: TextDetectionResult) => {
            if (res.result === 'done' && res.ans) {
              pdf.saveGraphicsState()
              pdf.setTextColor('#FF0000') //white
              pdf.setGState(pdf.GState({ opacity: 0.0 })) //透明テキスト
              if (!res.textAnnotations) {
                console.log('認識結果', res.ans)
                pdf.text(res.ans, p.mx, p.my) //古いスタイル 右上から書く
              } else {
                //単語で区切られてしまうので従来どおりの全文を右上に小さく入れておく
                pdf.setFontSize(4)
                pdf.text(res.ans, 0, 0, { maxWidth: Math.max((p.w - p.iw) / 2, p.mx) + p.mx }) // p.mx分は画面に入れる
                // エリアが狭いので文字数が多いとしり切れることもある
                console.log('認識結果', res.textAnnotations)
                MakeSlide.putTextOnPDF(res.textAnnotations, pdf, p, h, w)
              }
              pdf.restoreGraphicsState()
            } else if (res.result === 'fail') {
              console.error(`Image OCR text detection Error: ${res.errorMessage}`)
              alert(`${MessageUtil.getMessage(['ACex_name', '\n', 'text_detection_error'])}\n${res.errorMessage}`)
              throw new Error(res.errorMessage) //認識失敗で中断
            } else {
              // result === "none"  // no API key
              console.log('No text detection.')
            }

            // PDF 1ページ分の処理終わり
            if (pageNo < imgs.length - 1) {
              MakeSlide.onePage(title, subTitle, p, imgs, pdf, ctx, buf, ++pageNo)
            } else {
              //全ページ完了
              MakeSlide.savePDF(subTitle, title, pdf)
            }
          },
        )
      }
    }
    //
    img.src = src //画像ロードの実行
  }
  private static putTextOnPDF(textAnnotations: TextAnnotations, pdf: jsPDF, p: PDFprops, h: number, w: number) {
    textAnnotations.forEach((textAnnotation, index, textAnnotations) => {
      if (textAnnotations.length === 1 || index > 1) {
        // 画像の文字に重ねて書く
        let fontHight = textAnnotation.boundingPoly.vertices[2].y - textAnnotation.boundingPoly.vertices[0].y
        if (fontHight < 0) {
          console.warn(`Unexpected fontHight: ${fontHight} < 0`)
          fontHight *= -1 //falsesafe
        }
        // 54DPIなので、 1pt=1/72inch  54px=72pt
        pdf.setFontSize((((fontHight * p.ih) / h) * 72) / 54)
        const x = p.mx + (textAnnotation.boundingPoly.vertices[3].x * p.iw) / w
        const y = p.my + (textAnnotation.boundingPoly.vertices[3].y * p.ih) / h
        // if (textAnnotation.boundingPoly.vertices[3].y > h ) {
        //   y += p.h - 2 * p.my - 2 * p.ih //上の画像と下の画像の隙間分を足す
        // }
        try {
          // テキスト描画 呼び出しごとにスペースが入ってしまう
          pdf.text(textAnnotation.description, x, y)
        } catch (e) {
          // 図面などで無理な文字のときもあるのでエラーが出たら諦めて例外は握りつぶす
          console.error('Ignore Exception:', e, textAnnotation.description, x, y)
        }
      }
    })
  }

  private static savePDF(subTitle: string, title: string, pdf: jsPDF) {
    subTitle = subTitle.replace(/\n^ゲスト：.+$/m, '') //ゲスト:の行はのぞく
    const lf = subTitle.match(/\n/gm)?.length //マッチしないとnull つまり 0
    if (lf && lf > 1) {
      // 3行以上 「大前ライブ」とか
      subTitle = ''
    } else if (lf === 1) {
      //2行なら1行にする
      subTitle = subTitle.replace(/\n/m, '')
    } //1行 もしくは 0行 はなにもしない

    //タイトルなどの全角英数字を半角へ
    title = MakeSlide.zenkaku2Hankaku(title)
    subTitle = MakeSlide.zenkaku2Hankaku(subTitle)
    //間のスペースを除く
    title = MakeSlide.squeezeSpace(title)
    subTitle = MakeSlide.squeezeSpace(subTitle)

    //8ページくらいまでしかダメ
    // let preview = document.createElement("iframe")
    // preview.setAttribute("frameborder", "0")
    // preview.setAttribute("width","640")
    // preview.setAttribute("height", "360")
    // preview.setAttribute("src", pdf.output("datauristring"))
    // mvspec.after(preview)
    //タイトルとサブタイトルをつなげてファイル名にして保存
    if (title.match(/\d$/) && subTitle.match(/^\d/)) {
      subTitle = ' ' + subTitle //数字が重なるならスペース入れる
    }
    pdf.save(title + subTitle + '.pdf')
  }

  private static onePageCreateCanvas(w: number, h: number, ocrPages: number) {
    //必要なCanvas作る OCR用ctx:縦2枚分=ocrPages PDF用buf:画像一枚分
    console.log('Create Canvas')
    const canvas = document.createElement('canvas')
    canvas.width = w //サイズ設定をしておかないとdrawできない
    canvas.height = h * ocrPages //縦 2枚分
    console.info('img ', `${w}x${h}`)
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) //各画像でctxは使い回す
    //確認のために表示 img.after(canvas) //ベージ毎に書き換わる
    //PDFへ画像の貼り付け用
    const bufCanvas = document.createElement('canvas')
    bufCanvas.width = w //サイズ設定をしておかないとdrawできない
    bufCanvas.height = h
    const buf = bufCanvas.getContext('2d')
    return { ctx, buf }
  }

  private static blinkingPDFonBadge() {
    //PDF処理中アイコン点滅
    chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.SET_ICON, text: 'PDF' }, (_response: BackgroundResponse) => {
      MessageUtil.checkRuntimeError(BackgroundMsgCmd.SET_ICON)
      setTimeout(() => {
        //0.5秒後に消す  次のページに追いつかれても最後消すから問題なし
        // tslint:disable-next-line: no-shadowed-variable
        chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.SET_ICON, text: '' }, (_response: BackgroundResponse) => {
          MessageUtil.checkRuntimeError(BackgroundMsgCmd.SET_ICON)
        })
      }, 500)
    })
  }

  private static squeezeSpace(str: string) {
    //英字以外の前のスペースを削除する
    //英字以外の前のスペースを除いている
    return str.replace(/\s+(?=[^a-zA-Z])/gm, '')
  }
  private static zenkaku2Hankaku(str: string) {
    //全角英数半角変換
    return str.replace(/[！-｝]/g, s => {
      //全角英数  〜を除く  cf. 半角英数[ -~]
      return String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    })
  }

  private static setupFonts(cb: () => void) {
    if (!MakeSlide.font) {
      console.log('Font:', ipag.length, ipag)
      MakeSlide.font = ipag //事前JavaScript版フォントを使う
      jsPDF.API.events.push(['addFonts', MakeSlide.callAddFont])
      if (cb) {
        cb()
      }
    } else {
      //font set 済み
      console.info('Alread setup font.') //ここに来るパターンみつけていないけど
      if (cb) {
        cb()
      }
    }
  }

  constructor(cb: () => void) {
    console.log('--- Start MakeSlide ---')
    //MessageUtil.assignMessages()
    MakeSlide.setupFonts(cb)
  }
}
