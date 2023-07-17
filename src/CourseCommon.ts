// -*- coding: utf-8-unix -*-

export class CourseCommon {
  public static async fetchJSON(url: string, params: URLSearchParams) {
    const response = await fetch(url + params.toString(), {
      method: 'GET',
      mode: 'cors',
    })
    if (response.ok) {
      return response.json()
    } else {
      throw new Error(`${response.status} ${response.statusText}`)
    }
  }
  public static getDate(dateStr: string, offset = 0) {
    // offsetはスタートは0 エンド999とかにする
    //"2012-09-08T23:59:59+09:00"
    const data = dateStr.match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/)
    const date = new Date(+data![1]!, +data![2]! - 1, +data![3]!, +data![4]!, +data![5]!, +data![6]!, offset) //本当にあるかは引数次第
    return date
  }
}
