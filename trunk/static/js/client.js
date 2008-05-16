
//
// As mentioned at http://en.wikipedia.org/wiki/XMLHttpRequest
//
if( !window.XMLHttpRequest ) XMLHttpRequest = function()
{
  try{ return new ActiveXObject("Msxml2.XMLHTTP.6.0") }catch(e){}
  try{ return new ActiveXObject("Msxml2.XMLHTTP.3.0") }catch(e){}
  try{ return new ActiveXObject("Msxml2.XMLHTTP") }catch(e){}
  try{ return new ActiveXObject("Microsoft.XMLHTTP") }catch(e){}
  throw new Error("Could not find an XMLHttpRequest alternative.")
};


// Defined Server methods
var server = {};
InstallFunction(server, "POST", "get_url", "GetUrl");
InstallFunction(server, "GET", "get_sites", "GetSites");
InstallFunction(server, "GET", "get_site", "GetSite");
InstallFunction(server, "POST", "add_site", "AddSite");
InstallFunction(server, "POST", "update_site", "UpdateSite");
InstallFunction(server, "POST", "delete_site", "DeleteSite");
InstallFunction(server, "POST", "obliterate_site", "ObliterateSite");


function InstallFunction(obj, method, name_remote, name_local) {
	if (!name_local)
	  name_local = name_remote;
	
  obj[name_local] = function() {
  	
      // Find last one or two function arguments...
      var callbacks = [];
      var arg;

      if (arguments.length >= 1){
        if (arguments.length >= 2){
          arg = arguments[arguments.length-2];
          if ('function' == typeof arg){
          	callbacks.push(arg);
          } 
        }
      	arg = arguments[arguments.length-1]; 
      	if ('function' == typeof arg){
      		callbacks.push(arg);
      	}
      	arguments.length -= callbacks.length; 
      }
      
      // Fill remaining callbacks with nulls
      while (callbacks.length < 2){
      	callbacks.push(null);
      }
      
  	  var options = {
  	    method:method,
  	   	action:name_remote,
  	   	parameters:arguments,
  	   	onSuccess:callbacks[0],
  	   	onFail:callbacks[1]
  	  }
  	  RPC(options);
  }
}


//
//  options = {
//    method: 'get'|'post',
//    action: ..., // Some 'action' to request
//    parameters: arguments,
//    onSuccess: function(response) { ... },
//    onFail: function(response) { ... },
//    ...
//  }
//
function RPC(options) {
  
  var async = (options.onSuccess || options.onFail);
  
  var req = new XMLHttpRequest();
  var body = null;
  
  switch (options.method.toUpperCase()){
    case 'GET':
    {
		  // Encode the arguments in to a URI
		  var query = '?action=' + encodeURIComponent(options.action);
		  if (options.parameters){
			  for (var i = 0; i < options.parameters.length; i++) {
			    var key = 'arg' + i;
			    var val = JSON.stringify(options.parameters[i]);
			    query += '&' + key + '=' + encodeURIComponent(val);
			  }
		  }
		  query += '&time=' + new Date().getTime(); // IE cache workaround
		  
      req.open('GET', '/rpc' + query, async);
      break;
    }
    case 'POST':
    {
		  // Build an Array of parameters, w/ function_name being the first parameter
		  var params = new Array(options.action);
		  if (options.parameters){
			  for (var i = 0; i < options.parameters.length; i++) {
			    params.push(options.parameters[i]);
			  }
		  }
		  body = JSON.stringify(params);
		  
		  req.open('POST', '/rpc', async);		  
		  req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		  req.setRequestHeader("Content-length", body.length);
		  req.setRequestHeader("Connection", "close");
    	break;
    }
    default:
    {
      alert('Unsupported HTTP method: ' + options.method);
      return;
    }
  }
  
  if (async) {
    req.onreadystatechange = function() {
    	
      var response = null;
      try { 
       response = JSON.parse(req.responseText);
      } catch (e) {
       response = req.responseText;
      }

      if (4 == req.readyState){      
	      if (200 == req.status && options.onSuccess){
	        options.onSuccess(response);
	      } else {
//          if (DEBUG)
//            alert('onFail:'+response);
          if (options.onFail)
            options.onFail(response);
	      }
      }
    }
  }
  
  // Make the actual request
  req.send(body);
}
