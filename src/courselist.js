// -*- coding: utf-8-unix -*-
(function() {
  var Popup = Class.create({
    initialize: function() {
      this.bg = chrome.extension.getBackgroundPage().bg;
      window.addEventListener("load", function(evt) {
        this.start();
      }.bind(this));
    },
    start: function() {
      this.assignMessages();
      this.assignEventHandlers();
      this.createList();
    },
    assignMessages: function() {
      var elems = document.querySelectorAll('*[class^="MSG_"]');
      Array.prototype.forEach.call(elems, function (node) {
        var key = node.className.match(/MSG_(\w+)/)[1];
        var message = i18n.getMessage(key);
        if (message) { node.textContent = message; }
      });
    },
    assignEventHandlers: function() {
      //$("Foo").onclick = this.onClickFoo.bind(this);
    },
    onClickFoo: function(evt) {
      // 設定値を取得
      var fooConfig = this.bg.getFooConfig();
      // Ajax通信
      this.bg.loadFoo({
        onSuccess: function(res) {
                  //
        }.bind(this)
      });
      //
    },
    createList: function() {
      $('message').insert("Loding...");
      var courseListAjax = new Ajax.Request(
        "https://www.bbt757.com/svlAC/GetCourseList3",
        { method: "get",
          parameters: "act=1&" + this.bg.getUserID() + "&" + this.bg.getSessionA(),
	  asynchronous: true,
	  onSuccess: function(response) {
	    this.programItemList(response);
	  }.bind(this),
          onFailure: function(response) {
            $('message').update("Course List Loding Fail.");
          },
          onException: function(response) {
            $('message').update("Course List Loding Exception?");
          }
        }
      );
    },
    programItemList: function(response) {
      $('message').update("Course List Loding Success.");
      var xml = response.responseXML;
      var programs = xml.getElementsByTagName("program");
      for(i=0; i<programs.length; i++) {
	var programID = programs[i].getAttribute('id');
	var item =  '<li class="ProgramItem" id="'+ programID + '">'
	  + programs[i].getAttribute('name') +'</li>';
	$( 'ProgramList' ).insert(item);
	$( programID ).insert('<ul id="program' + programID + '"></ul>');
	var courses = programs[i].getElementsByTagName("course");
	for(j=0; j<courses.length; j++) {
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
	var courseListAjax = new Ajax.Request(
          "https://www.bbt757.com/svlAC/GetCourseItemList",
          { method: "get",
            parameters: "cid=" + courseID + "&" + this.bg.getUserID() + "&" + this.bg.getSessionA(),
	    asynchronous: true,
	    onSuccess: function(response) {
	      this.courseItemList(response, courseID);
            }.bind(this),
            onFailure: function(response) {
              $('message').update("Course List Loding Fail. " + courseID);
            },
            onException: function(response) {
              $('message').update("Course List Loding Exception? " + courseID);
          }
          }
	);
      }
    },
    courseItemList: function(response, courseID) {
      $('message').update("Course Item List Loding Success.. ID=" + courseID);
      var xml = response.responseXML;
      var outlines = xml.getElementsByTagName("outline");
      $( 'course' + courseID ).insert(
	'<ul id="courseItemList' + courseID + '"></ul>'
      );
      for(i=0; i<outlines.length; i++) {
	if ( outlines[i].getAttribute('type') == "GROUP" ) {
	  var elements = outlines[i].getElementsByTagName("outline");
	  for(j=0; j<elements.length; j++) {
	    if ( elements[j].getAttribute('type') == "BBS" ) {
	      var fid = elements[j].getAttribute('fid');
	      console.log("--- Find fid:" + fid);
	      var title = elements[j].getAttribute('text');
	      var item = '<li id="BBS' + fid + '">'
		+ '<button type="botton" id="' + fid 
		+ '" value="' + fid + '">'
	      	+ title + '</botton></li>';
	      $ ( "courseItemList" + courseID ).insert(item);
	      $( fid ).onclick = this.onClickBBS.bind(this);
	    }
	  }
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
	var courseListAjax = new Ajax.Request(
          "https://www.bbt757.com/svlAC/GetForumContents",
          { method: "get",
            parameters: "fid=" + fid + "&" + this.bg.getUserID() + "&" + this.bg.getSessionA(),
	    asynchronous: true,
	    onSuccess: function(response) {
	      this.getContents(response, fid);
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
    getContents: function(response, fid) {
      var counter = {};
      var namemap = {};
      $('message').update("Content Data Loding Success.. ID=" + fid);
      $( "BBS" + fid ).insert('<ol id="ranking'+ fid + '"></ol>');
      var xml = response.responseXML;
      var authors = xml.getElementsByTagName("author"); //name, uuid
      console.log("--- Post:" + authors.length);
      for(i=0; i<authors.length; i++) {
	var uuid = authors[i].getElementsByTagName("uuid")[0].innerHTML;
	var name = authors[i].getElementsByTagName("name")[0].innerHTML;
	if ( isNaN(counter[uuid] ) ) {
	  counter[uuid] = 0;
	  namemap[uuid] = name;
	}
	counter[uuid]++;
//	console.log("--- " + uuid + ":" + counter[uuid]);
      }
      $('message').update("Count finish. ID=" + fid);
      for(var key in counter) {
	var item = '<li>' + namemap[key] + " : "
	  + counter[key] + '</li>'
//	console.log("--- " + namemap[key] + ":" + counter[key]);
	$( "ranking" + fid ).insert(item);
      }
    }
  });
  new Popup();
})();
