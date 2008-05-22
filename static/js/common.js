
function DBG(text){
  if (DEBUG)
    if (GLog)
      GLog.write(text);
    else
      alert(text);
}

// For callback objects to bind a method to themself
function bind(obj, func){
  return function(){
  	//alert('func:'+func+',obj:'+obj+',args:'+arguments);
  	func.apply(obj, arguments);
  }
}

// Easy access to a named element in the DOM
function $(id) {
  return document.getElementById(id);
}

function showElement(element, show){
  if (element && element.style){
    if (show){
      element.style.display = '';
    } else {
      element.style.display = 'none';
    }
  }
}

function showId(id, show){
  showElement($(id), show);
}


//
// Weak, but useful, form of String formatting:
//   http://community.hdri.net/blogs/ray_blog/archive/2006/02/27/5.aspx
//
String.prototype.format = function(){
  var str = this;
  for(var i=0;i<arguments.length;i++){
    var re = new RegExp('\\{' + (i) + '\\}','gm');
    str = str.replace(re, arguments[i]);
  }
  return str;
}


function getHostName(){
  var host = window.location.host;
  var pos = host.indexOf(':');
  if (pos > 0){
    host = host.substr(0, pos);
  }
  return host.toLowerCase();
}


function includeJavaScript(jsfile){
  var html_doc = document.getElementsByTagName('head').item(0);
  var script = document.createElement('script')
  script.setAttribute('language', 'javascript')
  script.setAttribute('type', 'text/javascript')
  script.setAttribute('src', jsfile)
  html_doc.appendChild(script);
}


function getCookie( name ) {
  var start = document.cookie.indexOf( name + "=" );
  var len = start + name.length + 1;
  if ( ( !start ) && ( name != document.cookie.substring( 0, name.length ) ) ) {
    return null;
  }
  if ( start == -1 ) return null;
  var end = document.cookie.indexOf( ';', len );
  if ( end == -1 ) end = document.cookie.length;
  return unescape( document.cookie.substring( len, end ) );
}

function setCookie( name, value, expires, path, domain, secure ) {
  var today = new Date();
  today.setTime( today.getTime() );
  if ( expires ) {
    expires = expires * 1000 * 60 * 60 * 24;
  }
  var expires_date = new Date( today.getTime() + (expires) );
  document.cookie = name+'='+escape( value ) +
    ( ( expires ) ? ';expires='+expires_date.toGMTString() : '' ) + //expires.toGMTString()
    ( ( path ) ? ';path=' + path : '' ) +
    ( ( domain ) ? ';domain=' + domain : '' ) +
    ( ( secure ) ? ';secure' : '' );
}

function deleteCookie( name, path, domain ) {
  if ( getCookie( name ) ) document.cookie = name + '=' +
      ( ( path ) ? ';path=' + path : '') +
      ( ( domain ) ? ';domain=' + domain : '' ) +
      ';expires=Thu, 01-Jan-1970 00:00:01 GMT';
}
