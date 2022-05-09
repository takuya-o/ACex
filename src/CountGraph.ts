// -*- coding: utf-8-unix -*-
/// <reference types="chrome" />
/// <reference types="google.visualization" />

class CountGraph {
  private chartData:ChartData|null = null

  private getChartData() {
    if ( !this.chartData ) {
      console.log("chartData is null.");
    }
    return this.chartData;
  }
  constructor() {
    console.info("--- CountGraph ---")

    window.addEventListener("message", (event) => {
      console.log("Count Graph sandbox get message:", event.data);
      // TODO: event.orginチェック
      if ( !event.data.chartData ) {
        console.error("ACex: event.data.data is null.", event.data);
        return;
      }
      this.chartData = event.data.chartData;
      let language = event.data?.language
      if (!language) {
        console.info("ACex: Use default language.");
        language = "ja"
      }
      try {
        google.charts.load('49', {packages: ['line'], 'language': language }); //'current' 49:July 2020, 51:June 2021
        //https://developers.google.com/chart/interactive/docs/release_notes?hl=en#Releases 46:Oct2018 49:Jul2020
        google.charts.setOnLoadCallback(this.drawChart.bind(this)); //上で例外のときには設定されない
      } catch (err) {
        const e = err as Error
        this.messsage(MessageUtil.getMessage(["exception_occurred", e.name + " " + e.message]))
        //dataLayer.push({'event': 'Exception-Occurred '+ e.name + " " + e.message});
        console.error("ACex: Exception:", err);
      }


      this.drawChart();
    })

  }
  private messsage(msg:string) {
    const message = document.getElementById('message')
    if ( !message ) {
      console.warn( new Error(`Cannot display message: ${msg}`).stack)
    } else{
      message.innerText = msg
    }
  }
  private drawChart() {
    const chartData = this.getChartData();
    if ( !chartData ) {
      console.log("nothing chart Data.");
    } else {
      //TODO: authorNameCacheが必要 this.fillAuthorCache(0, chartData.data, () => {
        this.drawChartMain(chartData!) //nullはない
      //})
    }
  }
  private drawChartMain(chartData:ChartData) {
    console.info("--- drawChartMain ---")
    let data:google.visualization.DataTable
    try {
      data = new google.visualization.DataTable();
    } catch (e) {
      const error = e as Error
      console.info("ACex: Ignore and wait retry. Exception:", error.name + " " + error.message) // まだgoogleが読めて無いTypeErrorを想定
      return
    }
    //タイトル行
    data.addColumn('number', "Week" /* sandboxではi18n効かないMessageUtil.getMessage(["week_column"])*/)
    //for(let i=0;i<chartData.data.length;i++) {
    chartData.data.forEach(element => {
      data.addColumn('number', element.name?element.name:element.uuid /* CountResult.authorNameCache[element.uuid]*/);
    });
    //}
    //データ
    const rows = new Array();
    const last = new Array(chartData.data.length);
    for(let week=chartData.minWeek; week<=chartData.maxWeek; week++ ){
      const row = new Array();
      row.push(week);
      //for(let i=0; i<chartData.data.length; i++) {
      chartData.data.forEach( (data,i) => {
        let count = data.d[week]! //必ずある
        if ( isNaN(count) ) { count = 0; }
        if ( isNaN(last[i]) ) { last[i] = 0; };
        last[i] = last[i] + count; //累積
        row.push(last[i]);
      })
      //}
      if ( week > 0 ) { //開講以前のグラフは表示しない
        rows.push(row);
      }
    }
    //表示すべきデータが無いときにはグラフ表示は行わない
    if ( rows.length <= 0) {
      console.log("nothing chart row Data.");
    } else {
      data.addRows(rows);
      //指定位置にグラフ描画
      let hight = 33 * chartData.data.length;
      if ( hight < 500 ) { hight = 500; }
      const options = {
        chart: {
          //効かず hAxis: { minValue: (chartData.minWeek>0?chartData.minWeek:1), maxValue: chartData.maxWeek },
          title: ' ', //TODO: グラフのタイトルのセット
          subtitle: ' '
        },
        width: (window.innerWidth)-16, //900
        height: hight
      };
      const chart = new google.charts.Line(document.getElementById('linechart_material')!);
      //let chart = new google.visualization.LineChart(document.getElementById('linechart_material')); //@Typeにある古いやり方?
      chart.draw(data, options);
    }
  }
}

window.addEventListener("load", (_evt:Event) => {
  new CountGraph()
})

