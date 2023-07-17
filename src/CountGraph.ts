// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/// <reference types="google.visualization" />

import { ChartData } from './Types'
import { MessageUtil } from './MessageUtil'

/* tslint:disable: object-literal-sort-keys */

class CountGraph {
  private chartData: ChartData | null = null
  constructor() {
    console.info('--- CountGraph ---')

    window.addEventListener('message', event => {
      console.log('Count Graph sandbox get message:', event.data)
      // TODO: event.orginチェック
      if (!event.data.chartData) {
        console.error('ACex: event.data.data is null.', event.data)
        return
      }
      this.chartData = event.data.chartData
      let language = event.data?.language
      if (!language) {
        console.info('ACex: Use default language.')
        language = 'ja'
      }
      try {
        google.charts.load('52', { packages: ['corechart', 'line'], language }) //'current' 49:July 2020, 51:June 2021, 52:April 2023
        //https://developers.google.com/chart/interactive/docs/release_notes?hl=en#Releases 46:Oct2018 49:Jul2020
        google.charts.setOnLoadCallback(this.drawChart.bind(this)) //上で例外のときには設定されない
      } catch (err) {
        const e = err as Error
        MessageUtil.message(MessageUtil.getMessage(['exception_occurred', e.name + ' ' + e.message]))
        //dataLayer.push({'event': 'Exception-Occurred '+ e.name + " " + e.message});
        console.error('ACex: Exception:', err)
      }

      this.drawChart()
    })
  }

  private getChartData() {
    if (!this.chartData) {
      console.log('chartData is null.')
    }
    return this.chartData
  }

  private drawChart() {
    const chartData = this.getChartData()
    if (!chartData) {
      console.log('nothing chart Data.')
    } else {
      //TODO: authorNameCacheが必要 this.fillAuthorCache(0, chartData.data, () => {
      this.drawChartMain(chartData!) //nullはない
      //})
    }
  }
  private drawChartMain(chartData: ChartData) {
    console.info('--- drawChartMain ---')
    let dataTable: google.visualization.DataTable
    try {
      dataTable = new google.visualization.DataTable()
    } catch (e) {
      // まだgoogleが読めて無いTypeErrorを想定
      const error = e as Error
      console.info(`ACex: Ignore and wait retry. Exception: ${error.name} ${error.message}`)
      return
    }
    //タイトル行
    dataTable.addColumn('number', 'Week' /* sandboxではi18n効かないMessageUtil.getMessage(["week_column"])*/)
    //for(let i=0;i<chartData.data.length;i++) {
    chartData.data.forEach(element => {
      dataTable.addColumn('number', element.name ? element.name : element.uuid)
    })
    //}
    //データ
    this.createGraph(chartData, dataTable)
  }

  private checkNaN(n: number) {
    // numberが、NaNなら0、それ以外ならそのまま返す
    if (isNaN(n)) {
      return 0
    }
    return n
  }
  private createGraph(chartData: ChartData, dataTable: google.visualization.DataTable) {
    const rows = new Array<Array<number>>()
    const last = new Array(chartData.data.length)
    for (let week = chartData.minWeek; week <= chartData.maxWeek; week++) {
      const row = new Array<number>()
      row.push(week)
      chartData.data.forEach((data, i) => {
        let count = data.d[week]! //必ずある
        count = this.checkNaN(count)
        last[i] = this.checkNaN(last[i])
        last[i] = last[i] + count //累積
        row.push(last[i])
      })
      if (week > 0) {
        //開講以前のグラフは表示しない
        rows.push(row)
      }
    }
    //表示すべきデータが無いときにはグラフ表示は行わない
    if (rows.length <= 0) {
      console.log('nothing chart row Data.')
    } else {
      dataTable.addRows(rows)
      //指定位置にグラフ描画
      let hight = 33 * chartData.data.length
      if (hight < 500) {
        hight = 500
      }
      const options = {
        chart: {
          //効かず hAxis: { minValue: (chartData.minWeek>0?chartData.minWeek:1), maxValue: chartData.maxWeek },
          title: ' ',
          subtitle: ' ',
        },
        width: window.innerWidth - 16,
        height: hight,
      }
      // lineパッケージ(動かなくなった) google.charts.load("52", {packages: ["line"], language })
      //const chart = new google.charts.Line(document.getElementById("linechart_material")!);
      // chorechartパッケージ google.charts.load("52", {packages: ['corechart'], language })
      const chart = new google.visualization.LineChart(document.getElementById('linechart_material')!)
      chart.draw(dataTable, options)
    }
  }
}

window.addEventListener('load', (_evt: Event) => {
  // tslint:disable-next-line: no-unused-expression
  new CountGraph()
})
