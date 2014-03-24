// -*- coding: utf-8-unix -*-
(function() {
  var CurseList = Class.create({
    initialize: function() {
      this.bg = chrome.extension.getBackgroundPage().bg;
      window.addEventListener("load", function(evt) {
        this.start();
      }.bind(this));
    },
    start: function() {
      this.assignMessages();
      this.createList();
    },
    assignMessages: function() {
      var elems = document.querySelectorAll('*[class^="MSG_"]');
      Array.prototype.forEach.call(elems, function (node) {
        var key = node.className.match(/MSG_(\w+)/)[1];
        var message = chrome.i18n.getMessage(key);
        if (message) { node.textContent = message; }
      });
    },
    getMessage: function(args) {//arg:配列
      var ret = "";
      for(var i=0; i<args.length; i++ ) {
        if ( i != 0 ) { ret = ret + " "; };
        var message = chrome.i18n.getMessage(args[i]);
        if (!message) { message = args[i] };
        ret = ret + message;
      }
      return ret;
    },
    createList: function() {
      $('message').insert(this.getMessage(["loding"]));
      var courseListAjax = new Ajax.Request(
        "https://www.bbt757.com/svlAC/GetCourseList3",
        { method: "get",
          parameters: "act=1&" + this.bg.getUserID() + "&" + this.bg.getSessionA(),
          asynchronous: true,
          onSuccess: function(response) {
            this.programItemList(response.responseXML);
          }.bind(this),
          onFailure: function(response) {
            $('message').update(this.getMessage(["program_list", "loding_fail"]));
          }.bind(this),
          onException: function(response) {
            $('message').update(this.getMessage(["program_list", "loding_exception"]));
          }.bind(this)
        }
      );
    },
    programItemList: function(xml) {
      $('message').update(this.getMessage(["course_list", "loding_success"]));
      var programs = xml.getElementsByTagName("program");
      for(var i=0; i<programs.length; i++) {
        var programID = programs[i].getAttribute('id');
        var item =  '<li class="ProgramItem" id="programItem'+ programID + '">'
          + '<button type="button" id="' + programID 
          + '" value="' + programID + '">'
          + programs[i].getAttribute('name') +'</button></li>';
        $( 'ProgramList' ).insert(item);
        $( programID ).onclick = this.onClickProgram.bind(this);
        $( "programItem" + programID ).insert(
          '<ul id="program' + programID + '"></ul>');
        $( "program" + programID ).hide();
        var courses = programs[i].getElementsByTagName("course");
        for(var j=0; j<courses.length; j++) {
          var courseID = courses[j].getAttribute('id');
          var item =  '<li class="CourseItem" id="course'+ courseID + '">'
            + '<button type="button" id="' + courseID 
            + '" value="' + courseID + '">'
            + courses[j].getAttribute('name')
            + '</botton></li>';
          $( "program" + programID ).insert(item);
          $( courseID ).onclick = this.onClickCourseItem.bind(this);
        }
      }
    },
    onClickProgram: function(evt) {
      console.log("--- onClickProgram:" + evt.target.id);
      var programID = evt.target.id;
      var list = $( "program" + programID );
      if ( list.clientHeight == 0 ) {
        list.show();
        dataLayer.push({'event': 'program-' + programID });
      } else {
        list.hide();
      }
    },
    onClickCourseItem: function(evt) {
      console.log("--- onClickCourseItem:" + evt.target.id);
      var courseID = evt.target.id;
      try {
        var list = $( "courseItemList" + courseID );
        if ( list.clientHeight == 0 ) {
          list.show();
        } else {
          list.hide();
        }
      } catch (e) {
        //まだ無かった
        console.log("--- Create CourseItem:" + courseID);
        dataLayer.push({'event': 'course-' + courseID });
        var courseListAjax = new Ajax.Request(
          "https://www.bbt757.com/svlAC/GetCourseItemList",
          { method: "get",
            parameters: "cid=" + courseID + "&" + this.bg.getUserID() + "&" + this.bg.getSessionA(),
            asynchronous: true,
            onSuccess: function(response) {
              this.courseItemList(response.responseXML, courseID);
            }.bind(this),
            onFailure: function(response) {
              $('message').update(
                this.getMessage(["course_list", "logind_fail"]) + courseID);
            }.bind(this),
            onException: function(response) {
              $('message').update(
              this.getMessage(["course_list", "logind_exception"]) + courseID);
            }.bind(this)
          }
        );
      }
    },
    courseItemList: function(xml, courseID) {
      $('message').update(
        this.getMessage(["forum_list", "loding_success", "id"])
          + courseID);
      var outlines = xml.getElementsByTagName("outline");
      $( 'course' + courseID ).insert(
        '<ul id="courseItemList' + courseID + '"></ul>'
      );
      for(var i=0; i<outlines.length; i++) {
        console.log("--- outline["+i+"]"+outlines[i].getAttribute('type'));
        if ( outlines[i].getAttribute('type') == "BBS" ) {
          var fid = outlines[i].getAttribute('fid');
          console.log("---- find BBS fid:" + fid);
          var title = outlines[i].getAttribute('text');
          var item = '<li id="BBS' + fid + '">'
            + '<button type="botton" id="' + fid 
            + '" value="' + fid + '">'
            + title + '</botton></li>';
          $ ( "courseItemList" + courseID ).insert(item);
          $( fid ).onclick = this.onClickBBS.bind(this);
        }
      }
    },
    onClickBBS: function(evt) {
      console.log("--- onClickBBS:" + evt.target.id);
      var fid = evt.target.id;
      try {
        var list = $( "ranking" + fid );
        if ( list.clientHeight == 0 ) {
          list.show();
        } else {
          list.hide();
        }
      } catch (e) {
        //まだ無かった
        console.log("--- Create Forum Data:" + fid);
        dataLayer.push({'event': 'forum-' + fid });
        $('message').update(this.getMessage(["discussion_data", "loding", "id"])
                            + fid);
        var courseListAjax = new Ajax.Request(
          "https://www.bbt757.com/svlAC/GetForumContents",
          { method: "get",
            parameters: "fid=" + fid + "&" + this.bg.getUserID() + "&" + this.bg.getSessionA(),
            asynchronous: true,
            onSuccess: function(response) {
              this.getContents(response.responseXML, fid);
            }.bind(this),
            onFailure: function(response) {
              $('message').update("Course List Loding Fail. " + fid);
            },
            onException: function(response) {
              $('message').update("Course List Loding Exception? " + fid);
            }
          }
        )
      }
    },
    getContents: function(xml, fid) {
      //発言一覧から 発言回数取得
      var counter = {};
      var namemap = {};
      $('message').update(
        this.getMessage(["discussion_data", "loding_success", "id"])
          + fid);
      $( "BBS" + fid ).insert('<table id="ranking'+ fid + '"></table>');
      var entries = xml.getElementsByTagName("entry"); //author, ac:deleted
      console.log("--- Post:" + entries.length);
      for(var i=0; i<entries.length; i++) {
        var deleted = entries[i].getElementsByTagName("deleted")[0].innerHTML;
        if ( "false" == deleted ) {
          //削除されていないものだけカウント
          var author = entries[i].getElementsByTagName("author")[0]; //name, uuid
          var uuid = author.getElementsByTagName("uuid")[0].innerHTML;
          if ( isNaN(counter[uuid] ) ) {
            counter[uuid] = 0;
            //最初に見つかった名前を利用する
            var name = author.getElementsByTagName("name")[0].innerHTML;
            namemap[uuid] = name;
          }
          counter[uuid]++;
        }
      }
      $('message').update(this.getMessage(["count_finish", "id"]) + fid);
      var ranking = [];
      for(var key in counter) {
        ranking.push({"name": namemap[key], "count": counter[key]});
      }
      ranking.sort( function(a,b) {
        return( b["count"] - a["count"] );
      } );
      for(var i=0; i<ranking.length; i++) {
        var item = '<tr><td class="RankingNumber">'+ (i+1)
                +'</th><td class="RankingName">' + ranking[i]["name"] 
                + '</td><td>' + ranking[i]["count"] + '</td></tr>';
        $( "ranking" + fid ).insert(item);
      }
    }
  });
  new CurseList();
})();
