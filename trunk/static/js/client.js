
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


function InstallFunction(obj, http_method, name_remote, name_local) {
	if (!name_local)
	 name_local = name_remote;
  obj[name_local] = function() {
  	   var args = Array.prototype.slice.call(arguments);
  	   CallRemote(http_method, name_remote, args);
  }
}


function CallRemote(http_method, function_name, opt_argv) {

  var i;
  
  if (!opt_argv)
    opt_argv = new Array();
  
  // Find if the last arg is a callback function; save it
  var callback = null;
  var len = opt_argv.length;
  if (len > 0 && typeof opt_argv[len-1] == 'function') {
    callback = opt_argv[len-1];
    opt_argv.length--;
  }
  var async = (callback != null);
  
  var req = new XMLHttpRequest();
  var body = null;
  
  switch (http_method.toUpperCase()){
    case 'GET':
    {
		  // Encode the arguments in to a URI
		  var query = '?action=' + encodeURIComponent(function_name);
		  for (i = 0; i < opt_argv.length; i++) {
		    var key = 'arg' + i;
		    var val = JSON.stringify(opt_argv[i]);
		    query += '&' + key + '=' + encodeURIComponent(val);
		  }
		  query += '&time=' + new Date().getTime(); // IE cache workaround
		  
      req.open('GET', '/rpc' + query, async);
      break;
    }
    case 'POST':
    {
		  // Build an Array of parameters, w/ function_name being the first parameter
		  var params = new Array(function_name);
		  for (i = 0; i < opt_argv.length; i++) {
		    params.push(opt_argv[i]);
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
      alert('Unsupported HTTP method: ' + http_method);
      return;
    }
  }
  
  if (async) {
    req.onreadystatechange = function() {
      if(req.readyState == 4 && req.status == 200) {
        var response = null;
        try { 
         response = JSON.parse(req.responseText);
        } catch (e) {
         response = req.responseText;
        }
        callback(response);
      }
    }
  }
  
  // Make the actual request
  req.send(body);
}
