// -*- coding utf-8 -*-
/*
//jQuery readyになったら開始
//フル $(window).on("load", function() { });
$(function(){
  $("a.l").each(function(){ //検索結果ごとに処理
    //URLを取得
    var domain = $(this).attr('href');
    //取得したURLのドメイン部分だけ取り出し
    var domain2 = domain.match(/^[httpsfile]+:\/{2,3}([0-9a-zA-Z\.\-:]+?):?[0-9]*?\//i);

     //Googleファビコン取得APIのURL
    var favget = "//www.google.com/s2/favicons?domain="+domain2[1];
    //上記のURLを画像ファイルタグにしますよ。
    var favgethtml = "<img src='"+favget+"' class='favi'/>";
    //タイトルの前に上記のタグを挿入しますよ。
    $(this).parent().prepend(favgethtml);
  });
});
*/

//Javascriptだけ
document.OnLoad = start();
function start() {
    window.alert('Hello World !!')
}

