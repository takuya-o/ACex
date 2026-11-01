/* eslint-disable max-lines */
// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />

import { BackgroundMsgCmd, Configurations } from './Types'
import { MessageUtil } from './MessageUtil'

/* tslint:disable: object-literal-sort-keys */

class Options {
  // 定数
  //private static OPTIONAL_PERMISSION_ALL_URLS: chrome.permissions.Permissions = {origins: ["<all_urls>"]}
  //"https://player.aircamp.us/"  PDFのためスクリーンショットを作成するのに必要 URLだとpermissionを追加できるけど一度追加すると削除できない
  private lastSupportAirSearchBeta: boolean = false

  constructor() {
    console.log('--- Options start ---')
    window.addEventListener('load', (_evt: Event) => {
      //start
      MessageUtil.assignMessages()
      this.assignEventHandlers()
      this.restoreConfigurations()
    })
  }
  private displayExperimentalOptionList() {
    const experimentalOptionListElement = document.getElementById('experimental_option_list')
    if (this.getInputElement('experimental_option').checked) {
      experimentalOptionListElement!.style.display = 'inline'
    } else {
      experimentalOptionListElement!.style.display = 'none'
    }
  }
  private assignEventHandlers() {
    document.getElementById('options_save')!.onclick = this.onClickSaveAndClose.bind(this)
    document.getElementById('experimental_option')!.onclick = this.onClickSave.bind(this)
    document.getElementById('count_button_option')!.onclick = this.onClickSave.bind(this)
    document.getElementById('coursename_rectriction_option')!.onclick = this.onClickSave.bind(this)
    document.getElementById('support_airsearch_beta')!.onclick = this.onClickSave.bind(this)
    //document.getElementById("display_popup_menu_option").onclick = this.onClickSave.bind(this)
    document.getElementById('popup_wait_for_mac')!.onchange = this.onClickSave.bind(this)
    document.getElementById('downloadable_option')!.onclick = this.onClickSave.bind(this)
    document.getElementById('display_telop_option')!.onclick = this.onClickSave.bind(this)
    document.getElementById('forum_memory_cache_size')!.onchange = this.onClickSave.bind(this)
    document.getElementById('save_content_in_cache')!.onchange = this.onClickSave.bind(this)
    document.getElementById('api_key')!.onchange = this.onClickSave.bind(this)
  }
  private getInputElement(id: string): HTMLInputElement {
    //<input type="いろいろ" 用get
    return document.getElementById(id) as HTMLInputElement
  }
  private restoreConfigurations() {
    chrome.runtime.sendMessage({ cmd: BackgroundMsgCmd.GET_CONFIGURATIONS }, (config: Configurations) => {
      this.restoreConfigurationsDisplayOptions(config)

      this.lastSupportAirSearchBeta = config.supportAirSearchBeta
      this.setConfig(
        config.experimental,
        config.countButton,
        config.cRmode,
        config.popupWaitForMac,
        config.downloadable,
        config.displayTelop,
        config.forumMemoryCacheSize,
        config.saveContentInCache,
        config.apiKey,
        this.lastSupportAirSearchBeta,
      )
    })
  }
  private restoreConfigurationsDisplayOptions(config: Configurations) {
    this.getInputElement('experimental_option').checked = config.experimental
    this.getInputElement('count_button_option').checked = config.countButton
    this.getInputElement('coursename_rectriction_option').checked = config.cRmode
    this.getInputElement('support_airsearch_beta').checked = config.supportAirSearchBeta
    this.getInputElement('popup_wait_for_mac').value = '' + config.popupWaitForMac
    this.getInputElement('downloadable_option').checked = config.downloadable
    this.getInputElement('display_telop_option').checked = config.displayTelop
    this.getInputElement('forum_memory_cache_size').value = '' + config.forumMemoryCacheSize
    this.getInputElement('save_content_in_cache').checked = config.saveContentInCache
    this.getInputElement('api_key').value = config.apiKey
    this.displayExperimentalOptionList()
  }

  private onClickSaveAndClose(e: Event) {
    this.onClickSave(e)
    window.close()
  }

  // eslint-disable-next-line max-lines-per-function
  private onClickSave(_evt: Event) {
    const experimental = this.getInputElement('experimental_option').checked
    const countButton = this.getInputElement('count_button_option').checked
    const coursenameRestriction = this.getInputElement('coursename_rectriction_option').checked
    const supportAirSearchBeta = this.getInputElement('support_airsearch_beta').checked
    const popupWaitForMac = parseInt(this.getInputElement('popup_wait_for_mac').value, 10)
    const downloadable = this.getInputElement('downloadable_option').checked
    const displayTelop = this.getInputElement('display_telop_option').checked
    const forumMemoryCacheSize = parseInt(this.getInputElement('forum_memory_cache_size').value, 10)
    const saveContentInCache = this.getInputElement('save_content_in_cache').checked
    const apiKey = this.getInputElement('api_key').value
    this.displayExperimentalOptionList()

    this.lastSupportAirSearchBeta = supportAirSearchBeta //permission変えずにlast更新のみ

    this.setConfig(
      experimental,
      countButton,
      coursenameRestriction,
      popupWaitForMac,
      downloadable,
      displayTelop,
      forumMemoryCacheSize,
      saveContentInCache,
      apiKey,
      this.lastSupportAirSearchBeta,
      () => {
        document.getElementById('message')!.innerText = MessageUtil.getMessage(['options_saved'])
        setTimeout(() => {
          document.getElementById('message')!.innerText = '' //一秒後にメッセージを消す
        }, 1000)
      },
    )
  }

  private setConfig(
    experimental: boolean,
    countButton: boolean,
    coursenameRestriction: boolean,
    popupWaitForMac: number,
    downloadable: boolean,
    displayTelop: boolean,
    forumMemoryCacheSize: number,
    saveContentInCache: boolean,
    apiKey: string,
    supportAirSearchBeta: boolean,
    cb?: () => void,
  ) {
    chrome.runtime.sendMessage(
      {
        cmd: BackgroundMsgCmd.SET_CONFIGURATIONS,
        config: {
          experimental,
          countButton,
          cRmode: coursenameRestriction,
          popupWaitForMac,
          downloadable,
          displayTelop,
          forumMemoryCacheSize,
          saveContentInCache,
          apiKey,
          supportAirSearchBeta,
        },
      },
      () => {
        if (cb) {
          cb()
        }
      },
    )
  }
}
const options = new Options()
console.log('Start Options', options)
