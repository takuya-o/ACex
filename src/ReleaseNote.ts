// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />

class ReleaseNote {
  constructor() {
    window.addEventListener("load", (_evt:Event) => {
      MessageUtil.assignMessages()
      TabHandler.assignMessageHandlers(); //backgroundからの通信受信設定
      // バージョン番号を表示する
      const versionElement  = document.getElementById("version") as HTMLSpanElement
      versionElement.innerText = chrome.runtime.getManifest().version
      if ( !localStorage.Special ) {
        MessageUtil.message(MessageUtil.getMessage(["No_data_migration"]))
      } else {
        // 古いデータが有ったのでデータ移行
        MessageUtil.message(MessageUtil.getMessage(["Doing_data_migration"]))
        const special = JSON.parse(localStorage.Special)
        chrome.storage.sync.set({Special: special}, () => {
          MessageUtil.message(MessageUtil.getMessage(["Data_migration_done"]))
          // 無事に移行できたので、古いデータを削除
          //現用 "ACsession" "Special"
          localStorage.removeItem("Special") //移行したので消す
          localStorage.removeItem("ACsession") //セッション情報は取れば良いので移行無しで消す
          //キャッシュ用 "Authors" "Forums" も取り直せば良いので移行無しで消す
          localStorage.removeItem("Forums")
          localStorage.removeItem(newFunction())

          // //V0.0.0.3以前(11bf542b)であまりに古いので消すだけ
          localStorage.removeItem("Oyo");
          localStorage.removeItem("userID");
          localStorage.removeItem("sessionA");

          function newFunction(): string {
            return "Authors";
          }
        })
      }
    })
  }
}
// tslint:disable-next-line: no-unused-expression
let releaseNote = new ReleaseNote()
