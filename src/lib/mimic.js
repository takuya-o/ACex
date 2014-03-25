/********************************************************************
 Mimic v1.0, XML-RPC Client for JavaScript 
 Copyright (c) 2005 Carlos Eduardo Goncalves (cadu.goncalves@gmail.com)
 
 This program is free software, you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation.
*********************************************************************/
// XMLRpcRequest
function XMLRpcRequest(url, name){
  this.serviceUrl = url;
  this.methodName = name;
  this.params = [];
}

XMLRpcRequest.prototype.setServiceUrl = function(url){
  this.serviceUrl = url;
}

XMLRpcRequest.prototype.setMethodName = function(name){
  this.methodName = name;
}

XMLRpcRequest.prototype.addParam = function(data){
  type = typeof(data);
  switch(type.toLowerCase()){
    case 'function':
	  return;
	case 'object':
	  if(!data.constructor.name) return;
  }
  this.params.push(data);	
}

XMLRpcRequest.prototype.clear = function(){
  this.params.splice(0, this.params.length);
}

XMLRpcRequest.prototype.process = function(){
  XML_RPC_REQUEST	= "<?xml version=\"1.0\"?>\n<methodCall>\n<methodName>" +  this.methodName + "</methodName>\n<params>\n(#PCDATA)</params>\n</methodCall>";    
  XML_RPC_PARAM 	= "<param>\n<value>\n(#PCDATA)</value>\n</param>\n";
  param = "";
  for(var i = 0; i < this.params.length; i++){
    param += XML_RPC_PARAM.replace('(#PCDATA)', XMLRpcRequest.marshal(XMLRpcRequest.paramType(this.params[i]), this.params[i])); 	  
  }  
  request = XML_RPC_REQUEST.replace('(#PCDATA)', param); 	    
  parser = new DOMParser();
  xml = parser.parseFromString(request, "text/xml");  
  return XMLRpcRequest.post(this.serviceUrl, xml);
}

XMLRpcRequest.post = function(server, xml){
  try {
    netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead"); 
  } catch (e) {/* voids uncaught security exception */}
  sender = new XMLHttpRequest();
  sender.open("POST", server, false);   
  sender.send(xml);
  response = new XMLRpcResponse(sender.responseXML);
  return response;	
}

XMLRpcRequest.marshal = function(type, data){
  XML_RPC_ARRAY 	= "<array>\n<data>\n(#PCDATA)</data>\n</array>\n";
  XML_RPC_MEMBER 	= "\n<member>\n(#PCDATA)</member>";   
  XML_RPC_NAME 	    = "<name>(#PCDATA)</name>\n"  
  XML_RPC_SCALAR 	=  "<" + type + ">(#PCDATA)</" + type + ">";
  XML_RPC_STRUCT 	= "<struct>(#PCDATA)\n</struct>\n";  
  XML_RPC_VALUE 	= "<value>(#PCDATA)</value>\n"   
  switch(type){
	case 'struct':
 	  member = "";	  
	  for(var i in data){
         value = "";
         value  +=  XML_RPC_NAME.replace('(#PCDATA)', i);
         value  +=  XML_RPC_VALUE.replace('(#PCDATA)', XMLRpcRequest.marshal(XMLRpcRequest.paramType(data[i]),data[i]));
         member +=  XML_RPC_MEMBER.replace('(#PCDATA)', value);		 
	  }
	  xml = XML_RPC_STRUCT.replace('(#PCDATA)', member); break;	  
	case 'array':
	  value = "";
	  for(var i = 0; i < data.length; i++){
        value += XML_RPC_VALUE.replace('(#PCDATA)', XMLRpcRequest.marshal(XMLRpcRequest.paramType(data[i]), data[i])); 
	  }
      xml = XML_RPC_ARRAY.replace('(#PCDATA)', value); break;
	case 'dateTime.iso8601':     
	  xml = XML_RPC_SCALAR.replace('(#PCDATA)', data.toIso8601()); break;	
	case 'boolean': 
	  xml = XML_RPC_SCALAR.replace('(#PCDATA)', (data == true) ? 1 : 0); break;
	case 'base64':
	  xml = XML_RPC_SCALAR.replace('(#PCDATA)', data.encode()); break;	
    default : 
	  xml = XML_RPC_SCALAR.replace('(#PCDATA)', data); break;
  }
  return xml;
}

XMLRpcRequest.paramType = function(param){
  type = typeof(param);
  switch(type.toLowerCase()){
    case 'number':
      (Math.round(param) == param) ? type = "int" : type = "double";  break;    
	case 'object': 
      switch(param.constructor.name.toLowerCase()){	
		case 'string' || 'boolean' || 'base64' || 'array':
	      type = param.constructor.name.toLowerCase(); break;	  			  
        case 'number':	  
          (Math.round(param) == param) ? type = "int" : type = "double";  break;    	   
		case 'date': 
	      type = "dateTime.iso8601"; break;
	    default:
	      type = "struct"; break;	  
	  } 
	  break;
  }
  return type;
} 

// XMLRpcResponse
XMLRpcResponse.faultValue = undefined;

function XMLRpcResponse(xml){
  this.XMLData = xml.createTreeWalker(xml, NodeFilter.SHOW_ALL, null, true);
}

XMLRpcResponse.prototype.isFault = function(){
  return XMLRpcResponse.faultValue;
}

XMLRpcResponse.prototype.parse = function(){  
  try {
    netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead"); 
  } catch (e) {/* voids uncaught security exception */}
  XMLRpcResponse.faultValue = undefined;
  XMLRpcResponse.getName = false;
  XMLRpcResponse.propertyName = '';
  XMLRpcResponse.params = [];
  for(var i = 0; i < this.XMLData.currentNode.childNodes.length; i++){
    XMLRpcResponse.unmarshal(this.XMLData.currentNode.childNodes[i], 0);
  }
  return XMLRpcResponse.params[0];
}

XMLRpcResponse.unmarshal = function(node, parent){ 
  if (node.nodeType == Node.ELEMENT_NODE){
	obj = null;
    switch(node.tagName.toLowerCase()){
      case 'struct':
        obj = new Object(); break;
      case 'array':
        obj = new Array(); break;
      case 'datetime.iso8601':
        obj = new Date(); break;
      case 'boolean':
        obj = new Boolean(); break;
      case 'int' || 'i4' || 'double':
        obj = new Number(); break;	  
      case 'string':
        obj = new String(); break;	  
      case 'base64':
        obj = new Base64(); break;	  
      case 'fault':
	    XMLRpcResponse.faultValue = true; break;	  		
      case 'name':
	    XMLRpcResponse.getName = true; break;	  				
    }
	if(obj != null){
      XMLRpcResponse.params.push(obj);	  
      if(node.tagName.toLowerCase() == 'struct' || node.tagName.toLowerCase() == 'array'){
		if(XMLRpcResponse.params.length > 1){  
          switch(XMLRpcResponse.params[parent].constructor.name.toLowerCase()){		  
            case 'object': 	
              XMLRpcResponse.params[parent][XMLRpcResponse.propertyName] = XMLRpcResponse.params[XMLRpcResponse.params.length - 1]; break;
            case 'array': 	 
              XMLRpcResponse.params[parent].push(XMLRpcResponse.params[XMLRpcResponse.params.length - 1]); break;	 
          }		
		}
        parent = XMLRpcResponse.params.length - 1;		  	   
	  }
	}
    for(var i = 0; i < node.childNodes.length; i++){	
       XMLRpcResponse.unmarshal(node.childNodes[i], parent);
    } 
  }
  if( (node.nodeType == Node.TEXT_NODE) && (/[^\t\n\r ]/.test(node.nodeValue)) ){
    if(XMLRpcResponse.getName == true){
	  XMLRpcResponse.propertyName = node.nodeValue;
      XMLRpcResponse.getName = false;
	}
	else{
      switch(XMLRpcResponse.params[XMLRpcResponse.params.length - 1].constructor.name.toLowerCase()){	   
	    case 'date':
	      XMLRpcResponse.params[XMLRpcResponse.params.length - 1] = Date.fromIso8601(node.nodeValue); break;
 	    case 'boolean':
		  XMLRpcResponse.params[XMLRpcResponse.params.length - 1] = (node.nodeValue == "1") ? true : false; break
 	    case 'number':
		  XMLRpcResponse.params[XMLRpcResponse.params.length - 1] = new Number(node.nodeValue); break
 	    case 'string':
		  XMLRpcResponse.params[XMLRpcResponse.params.length - 1] = new String(node.nodeValue); break
 	    case 'base64':
		  XMLRpcResponse.params[XMLRpcResponse.params.length - 1] = new Base64(node.nodeValue); break
      }
	  if(XMLRpcResponse.params.length > 1){  	  
        switch(XMLRpcResponse.params[parent].constructor.name.toLowerCase()){		  
          case 'object': 	
            XMLRpcResponse.params[parent][XMLRpcResponse.propertyName] = XMLRpcResponse.params[XMLRpcResponse.params.length - 1]; break;
          case 'array': 	 
            XMLRpcResponse.params[parent].push(XMLRpcResponse.params[XMLRpcResponse.params.length - 1]); break;	 
        }
	  }
	}
  }
}

// Date
Date.prototype.toIso8601 = function(){
  year = this.getYear();
  if (year < 1900) year += 1900;   
  month = this.getMonth() + 1;
  if (month < 10) month = "0" + month;     
  day = this.getDate();
  if (day < 10) day = "0" + day;     
  time = this.toTimeString().substr(0,8);
  return year + month + day + "T" + time;
}

Date.fromIso8601 = function(value){
  year = value.substr(0,4); 
  month = value.substr(4,2);
  day = value.substr(6,2); 
  hour = value.substr(9,2); 
  minute = value.substr(12,2); 
  sec = value.substr(15,2);  
  return new Date(year, month - 1, day, hour, minute, sec, 0);
}

// Base64
function Base64(value){
  this.bytes = value;
}

Base64.prototype.encode = function(){
  this.bytes = btoa(this.bytes);
  return this.bytes;
}

Base64.prototype.decode = function(){
  this.bytes = atob(this.bytes);
  return this.bytes;
}