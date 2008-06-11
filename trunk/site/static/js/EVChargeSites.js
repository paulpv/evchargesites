//
// @author Paul Peavyhouse (pv@swooby.com)
//

// HARD CODED FOR DEBUGGING; remove when no longer needed
var DEBUG_SERVICES = [];
/*    new ChargeService('avcon','working','30A',false),
    new ChargeService('avcon','marginal','30A',false),
    new ChargeService('spi','not working','40A',true),
    new ChargeService('cond120','not working','15A',true),
    new ChargeService('cond240','unknown','?',false)
    ];*/

// Pointer to the one and only marker that we can edit at a time
var selectedSite = null;


function textToHTML(text){
  if (text) {
    text = text.replace(/(\s*<br>\s*)*(\n+)/gi, function(m, m1, m2){
    	if (!m1){
    		// \n w/ no preceeding <BR>
    		return '<BR>\n';
    	} else {
    		return m;
    	}
    });
    text = text.replace(/(\s*<br>\s*){3,}/gi, '<BR><BR>\n'); // limit BR to 2
  } else {
  	text = '&nbsp;'; // For IE
  }
  return text;
}

function showLoading(show){
	showId('loading', show);
}

function confirmLogin(special){
	var txt = 'You must Log In';
	if (special){
		txt += ' as the site Creator, Contact, or Admin';
	}
	txt += ' to perform this action.';
  if (confirm(txt + '\nWould you like to Log In now?')){
    document.location = url_auth;
  }
}

function getSiteMarkerIcon(name) {
  if (name.lastIndexOf('.') <= name.lastIndexOf('/')){
    // They have not provided an extension; make it '.png'
    name += '.png';
  }
  var icon = new GIcon();
  icon.image = '/static/img/markers/site/' + name;
  icon.shadow = '/static/img/markers/site/marker-shadow.png';
  icon.iconSize = new GSize(32.0, 32.0);
  icon.shadowSize = new GSize(49.0, 32.0);
  icon.iconAnchor = new GPoint(16.0, 32.0);
  icon.infoWindowAnchor = new GPoint(16.0, 32.0);
  icon.imageMap = [
    14,31,12,21, // lower left side of pin
    06,12, // 9 o'clock
    06,06, // 10 o'clock
    12,00,18,00, // top
    24,06, // 2 o'clock
    24,12, // 3 o'clock
    18,21,16,31, // lower right side of pin
    ];
  return icon;
}


function SitesManager(map, current_user, is_admin){
  for(var key in current_user){
    current_user[key] = current_user[key].toLowerCase();
  }
	this.current_user = current_user;
	this.is_authenticated = current_user != null;
	this.is_admin = is_admin;
  this.dictMarkers = {};
  this.cluster = new ClusterMarker(map, {clusterMarkerIcon:this.getClusterMarkerIcon()});
  server.GetServiceDescriptors(bind(this, function(serviceDescriptors){
    
      this.services = {};
      var htmlTypes = '<select id="{0}">\n';
      var types = serviceDescriptors.types;
      for (var i=0; i<types.length; i++){
        var value = types[i][0];
        var display = types[i][1];
        this.services[value] = display;
        htmlTypes += '<option value="'+value+'">'+display+'</option>\n';
      }
      htmlTypes += '</select>\n';
  
      var htmlConditions = '<select id="{0}">\n';
      var conditions = serviceDescriptors.conditions;
      for(i=0; i<conditions.length; i++){
        htmlConditions += '<option>'+conditions[i].capitalize()+'</option>\n';
      }
      htmlConditions += '</select>\n';
  
      var htmlBreakers = '<select id="{0}">\n';
      var breakers = serviceDescriptors.breakers;
      for(i=0; i<breakers.length; i++){
        htmlBreakers += '<option>'+breakers[i]+'</option>\n';
      }
      htmlBreakers += '</select>\n';
  
      this.htmlServiceDescriptors = {
        types:htmlTypes,
        conditions:htmlConditions,
        breakers:htmlBreakers
      };

    }));
  return this;
}

SitesManager.prototype.isEditable = function(site){
  return (this.is_authenticated && 
   ((this.current_user.email == site.userCreator.email.toLowerCase()) ||
     this.is_admin ||
     ((site.contactUser) ? this.current_user.email == site.contactEmail.toLowerCase() : false)));
}

SitesManager.prototype.addMarker = function(id, marker){
  this.dictMarkers[id] = marker;
}

SitesManager.prototype.removeMarker = function(id, redraw){
  delete this.dictMarkers[id]
  if (redraw)
    this.redrawMarkers();
}

SitesManager.prototype.removeNewSite = function(site){
	map.removeOverlay(site.marker);
	delete site;
}

SitesManager.prototype.replaceNewSite = function(oldSite, newProps){
  map.removeOverlay(oldSite.marker);
  delete oldSite;
  // TODO(pv): Add site from newProps; until then...
  this.loadMarkers();
}

SitesManager.prototype.getClusterMarkerIcon = function(){
  return getSiteMarkerIcon('green-dot');
}

SitesManager.prototype.updateSite = function(site){
  // ClusterMarker does not [currently?] allow updating a single marker.
  // For now we have to clear *all* markers and then re-load *all* markers.
  // This may not be too bad, since Clustering seems to be pretty fast.
  this.loadMarkers(bind(site, site.onClick));
  
  // TODO(pv): Revisit this if ClusterMarker ever allows removing a single marker  
}

SitesManager.prototype.redrawMarkers = function(){
  this.cluster.removeMarkers();
  var arrayMarkers = [];
  for(var key in this.dictMarkers){
    var marker = this.dictMarkers[key]
    arrayMarkers.push(marker);
  }
  this.cluster.addMarkers(arrayMarkers);
  this.cluster.refresh();
}

SitesManager.prototype.loadMarkers = function(callbackSuccess, callbackFail){
  showLoading(true);
  this.dictMarkers = {};
  server.GetSites(bind(this, function(sites) {
	  var rows = sites.rows;   
	  var cols = sites.columns;  
	  for (var i=0; i < rows.length; i++) {
      var json = {};
	  	for (var j=0; j < cols.length; j++) {
	  		json[cols[j]] = rows[i][j];
	  	}
      var id = parseInt(json.id);
	    var editable = this.isEditable(json);
      var name = json.name;
      var latlng = json.latlng.match(/[(]?(.+),([^)]*)/).slice(1);
      latlng = new GLatLng(latlng[0], latlng[1]);
      var type = json.type;
      var site = new ChargeSite(id, name, latlng, type, editable);
      this.addMarker(id, site.marker);
	  }
	  this.redrawMarkers();
	  showLoading(false);
	  if (callbackSuccess){
	  	callbackSuccess();
	  }
  }), function(){
  	alert('ERROR: GetSites');
  	if (callbackFail){
  		callbackFail();
  	}
  });
}


function selectEdit(input){
  var defaultValue = input.value;
  input.onclick = input.onfocus = function(){
    DBG('"'+this.value+'"?="'+defaultValue+'"');
    if (this.value == defaultValue){
      this.select();
    }
  }
}

function htmlInputTextElement(id, value, width){
  var style = (width) ? 'style="width:'+width+';"' : '';
  return '<input type="text" '+style+' id="'+id+'" value="'+value+'"/>';
}

function htmlTextAreaElement(rows, id, value, width){
  var style = (width) ? 'style="width:'+width+';"' : '';
  return '<textarea rows="'+rows+'" '+style+' id="'+id+'">'+value+'</textarea>';
}

function htmlSelectOptionElement(id, options, selectedValue, width){
  selectedValue = selectedValue.toString().toLowerCase();
  var style = (width) ? 'style="width:'+width+';"' : '';
  var html = '<select id="'+id+'" '+style+'>\n';
  for (var key in options){
    if (key.toLowerCase() == selectedValue){
      html += '<option value="'+key+'" selected="true">'+options[key]+'</option>\n'; 
    } else {
      html += '<option value="'+key+'">'+options[key]+'</option>\n';
    } 
  }
  return html;
}

function htmlInputCheckboxElement(id, checked){
  return '<input type="checkbox" id="'+id+'" '+((checked)?'checked="on"':'')+'/>';
}

function selectOptionValue(id, value){
  var element = $(id);
  value = value.toString().toLowerCase();
  for (var i=0; i<element.length; i++){
    var option = element.options[i]; 
    if (option.value.toLowerCase() == value){
      option.selected = true;
      break;
    }
  }
}

function addNewServiceRow(id, suffix){
  var tbl = $(id);
  var newRow = tbl.insertRow(-1);
  var newCell = newRow.insertCell(-1);
  newCell.style.whiteSpace="nowrap";
  newCell.innerHTML = '?';
  suffix += '_'+(tbl.rows.length-1);
  newCell = newRow.insertCell(-1);
  newCell.innerHTML = siteman.htmlServiceDescriptors.types.format('newServiceType'+suffix);
  newCell = newRow.insertCell(-1);
  newCell.innerHTML = siteman.htmlServiceDescriptors.conditions.format('newServiceCondition'+suffix);
  newCell = newRow.insertCell(-1);
  newCell.style.whiteSpace="nowrap";
  newCell.innerHTML = siteman.htmlServiceDescriptors.breakers.format('newServiceBreaker'+suffix) +
      this.htmlInputCheckboxElement('newServiceBreakerAccessible'+suffix);
}

function addAddNewServiceRowButton(id, suffix){
  var tbl = $(id);
  var newRow = tbl.insertRow(-1);
  var newCell = newRow.insertCell(-1);
  newCell.colSpan=4;
  newCell.innerHTML = '<input type="button" style="width:100%;" value="Add New Service" onclick="addNewServiceRow(\''+id+'\',\''+suffix+'\')"/>';
}


// TODO(pv): Verify that values are in expected range(s)
function ChargeService(type, condition, breaker, breakerAccessible){
  this.type = type; // 'avcon', 'spi', 'lpi', 'cond120', 'cond240', ...
  this.condition = condition; // 'working', 'not working', 'marginal', 'unknown'
  this.breaker = breaker; // '?', '15A', '20A', ..., '100A', ...
  this.breaker_accessible = breakerAccessible; // true | false
  return this;
}


function ChargeSite(id, name, latlng, type, editable, newsite){
	if (!newsite){
		newsite = false;
	}
  this.newsite = newsite;

  // These arguments are the min needed to get an icon displayed on the map
  this.id = id;
  this.name = name;
  this.type =type;
  this.editable = editable;

  this.createMarker(latlng);
  
  this.rectInfoWindow = {width:550, height:425};
    
  return this;
}

ChargeSite.prototype.confirmCanModify = function(){
	var canModify = this.newsite || this.editable; 
  if (!canModify){
  	confirmLogin(true);
  }
  return canModify;
}

ChargeSite.prototype.deleteSite = function(id){
	if (this.newsite){
		siteman.removeNewSite(this);
	} else {
	  server.DeleteSite(id, function(id){
	  	siteman.removeMarker(id, true);
	  }, function(){
	  	alert('ERROR: DeleteSite');
	  });
	}
}

ChargeSite.prototype.confirmDeleteSite = function(){
  if (!this.confirmCanModify())
    return;

  if (confirm('Are you sure you want to delete this site?')){
    this.deleteSite(this.id);
  }
}
ChargeSite.prototype.getSiteMarkerIcon = function(id, type){
  // TODO(pv): Generate icon w/ # and type
  var filename = (this.newsite) ? 'blue' : 'green';
  return getSiteMarkerIcon(filename);
}

ChargeSite.prototype.createMarker = function(latlng){
  var markerOptions = {
    icon: this.getSiteMarkerIcon(this.id, this.type),
    title: '#' + this.id + ':'+ this.name,
    draggable: true,
    bouncy: true
  };
  this.marker = new GMarker(latlng, markerOptions);
  this.marker.site = this; // May cause recursion problem if JSONed/walked
  GEvent.bind(this.marker, "dragstart", this, this.onDragStart);
  GEvent.bind(this.marker, "dragend", this, this.onDragEnd);
  GEvent.bind(this.marker, "click", this, this.onClick);
  GEvent.bind(this.marker, "infowindowopen", this, this.onInfoWindowOpen);
  return this.marker;
}

ChargeSite.prototype.showMapBlowup = function(){
	// TODO(pv): auto detect greatest supported zoomLevel? (19, 20, ?)
	// TODO(pv): Save blowup zoom level to DB?
	this.marker.showMapBlowup({mapType:G_HYBRID_MAP});
}

ChargeSite.prototype.strLatLng = function(){
	return this.marker.getLatLng().toString();
}

ChargeSite.prototype.onDragStart = function(){
	this.lastLatLng = this.marker.getLatLng();
}

ChargeSite.prototype.onDragEnd = function(){
	if (!this.confirmCanModify()){
		this.marker.setLatLng(this.lastLatLng);
    return;
	}
	
  if (this.newsite){
  	this.onClick();
  } else {
    var json = {
      latlng: this.strLatLng()
    };
    server.UpdateSite(this.id, json, bind(this, function(site){
      // Anything to do?
    }), function(){
    	alert('ERROR: UpdateSite');
    });
  }
}


// ABOVE ^: Relatively stable and reliable code
// BELOW v: Problematic ugly code 


SitesManager.prototype.createNewSite = function(){
  var latlng = map.getCenter();
  var site = new ChargeSite('NEW', 'Unnamed', latlng, null, this.authenticated, true);
  map.addOverlay(site.marker);
  site.onClick();
}



ChargeSite.prototype.getDetails = function(callback){
  if (this.newsite){
  	var current_user = siteman.current_user;
	  var json = {
	  	id:this.id,
	    userCreator:current_user,
	    name:'Please enter a name',
	    address:'Please enter an address',
	    description:'Please enter a description',
      contactName:current_user.nickname,
      contactPhone:'Please enter a phone number',
      contactEmail:current_user.email
	  };
    DBG('New:'+JSON.stringify(json));
	  callback(json);
  } else {
	  server.GetSite(this.id, function(json){
	    DBG('Queried:'+JSON.stringify(json));
	    callback(json);
	  }, function(){
	  	alert('ERROR: GetSite');
	  });
  }
}

ChargeSite.prototype.onClick = function(){
  selectedSite = this; // Needed by JS generated for InfoWindow
  this.getDetails(bind(this, this.openInfoWindow));   
}

ChargeSite.prototype.makeDetailsDOM = function(details){
	var id = this.id;
  // Sad that IE does not support E4X! :(
  var dom = document.createElement('div');
  dom.setAttribute('id', 'divWrapper'+id);
  dom.setAttribute('style',
      'width:'+this.rectInfoWindow.width+'px;'+
      'height:'+this.rectInfoWindow.height+'px;');

  // TODO(pv): Would it be better/faster to DOM the below HTML?
  var htmlTemplate = '' +
    '<table width="100%">' +
		'  <tr id="rowHeader{0}">' +
		'    <td><font size="5"><b>Site #{0}</b></font></td>' +
		'    <td align="right"><font size="2">Created by: <a href="mailto:{1}">{2}</a></font></td>' +
		'  </tr>' +
		'  <tr>' +
		'    <td colspan="2" valign="top" style="width:100%;height:100%;">' +
		'      <div id="divDetails{0}" style="overflow-y:scroll;height:'+this.rectInfoWindow.height+'px;">' +
		'        {3}' +
		'      </div>' +
		'    </td>' +
		'  </tr>' +
		'  <tr id="rowFooter{0}">' +
		'    <td colspan="2">' +
		'      <table width="100%">' +
		'        <tr>' +
		'          <td align="left">' +
		'            <input type="button" value="Close Up" onclick="selectedSite.showMapBlowup()"/>' +
		'          </td>' +
		'          <td align="right">' +
		'            <input id="btnOne{0}" type="button" value="Edit" onclick="selectedSite.toggleEditMode(true)"/>' +
		'            <input id="btnTwo{0}" type="button" value="Delete" onclick="selectedSite.confirmDeleteSite()"/>' +
		'          </td>' +
		'        </tr>' +
		'      </table>' +
		'    </td>' +
		'  </tr>' +
		'</table>';
		
	dom.innerHTML = htmlTemplate.format(id,
													            escape(details.userCreator.email),   
																      escape(details.userCreator.nickname),
																      this.htmlDetails(details));
  return dom;
}

ChargeSite.prototype.makeStreetViewDOM = function(details){
	var id = this.id;
  var dom = document.createElement('div');
  dom.setAttribute('id', 'divStreetView'+id);
  dom.setAttribute('style',
      'width:'+this.rectInfoWindow.width+'px;'+
      'height:'+this.rectInfoWindow.height+'px;');
  dom.innerHTML = '<table border="1" style="margin-left:auto;margin-right:auto;">'+
      '<tr><td valign="middle" align="center">' +
  		'TODO(pv): StreetView (if available)' +
  		'</td></tr>' +
  		'</table>';
  return dom;
  
  //
  // Below: experimental unused code (work in progress)
  //
  
  var latlng = this.marker.getLatLng();
  svClient.getNearestPanorama(latlng, function(response){
    if (response.code != 200) {
      alert('Sorry, there is no StreetView data available here...yet!');
      return;
    }
    
    var latlng = new GLatLng(response.Location.lat, response.Location.lng);
    alert('Success:'+latlng.toString()); // TODO(pv): generate DOM
   });


  
  // TODO(pv): maxWidth seems to be capped ~700; find a way to increase
  var contentNode = document.createElement('div');
  contentNode.style.textAlign = 'center';
  contentNode.style.width = this.rectInfoWindow.width + 'px';
  contentNode.style.height = this.rectInfoWindow.height + 'px';
  contentNode.innerHTML = 'Loading panorama';
  
  var infoOpts = {
    maxWidth: 960,
    maxContent: contentNode,
    maxTitle: "Full screen"
  };
  
  svMarker.openInfoWindow("<div id='pano' style='width:640px;height:360px;'></div>");//, infoOpts);
  svPanorama = new GStreetviewPanorama($('pano'));
  
  var pov = {
    yaw: appOpts.svYaw,
    pitch: appOpts.svPitch,
    zoom: appOpts.svZoom
  };
  svPanorama.setLocationAndPOV(svMarker.getLatLng(), pov);
  
  GEvent.addListener(svPanorama, "initialized", onNewLocation);
  GEvent.addListener(svPanorama, "yawchanged", onYawChange);
  GEvent.addListener(svPanorama, "pitchchanged", onPitchChange);
  GEvent.addListener(svPanorama, "zoomchanged", onZoomChange);
  
  var iw = map.getInfoWindow();
  GEvent.addListener(iw, "maximizeend", function(){
    svPanorama.setContainer(contentNode);
    window.setTimeout("svPanorama.checkResize()", 5);
  });
  
}

ChargeSite.prototype.htmlServices = function(details){
  
  // HARD CODED FOR DEBUGGING; remove when no longer needed
  //details.services = DEBUG_SERVICES;

  var id = this.id;
  
  var services = details.services;
  
  var html = '<table id="tblServices{0}" border="1" width="100%">'.format(id) +
    '<tr>' +
    '  <th>#</th>' +
    '  <th>Type</th>' +
    '  <th>Condition</th>' +
    '  <th>Breaker</th>' +
    '</tr>';
  if (!services || services.length == 0){
    html += '' +
      '<tr><td colspan="4" align="center">No Services Specified</td></tr>';
  } else {
    // TODO(pv): style="white-space: nowrap;" instead of "nowrap"?
    for (var i=0; i<services.length; i++){
      var service = services[i];
      var htmlRow = '' +
      '<tr>' +
      '<td style="white-space:nowrap;" nowrap="true" align="right">' +
        '<span id="btnServiceDelete{0}_{1}" style="display:none;">' +
          '<input type="button" value="X" onclick="$(\'tblServices{0}\').deleteRow({1})"/>' +
        '</span>' +
        '{1}' +
      '</td>' +
      '<td><span id="serviceType{0}_{1}">{2}</span></td>' +
      '<td><span id="serviceCondition{0}_{1}">{3}</span></td>' +
      '<td style="white-space:nowrap;" nowrap="true">' +
        '<span id="serviceBreaker{0}_{1}">{4}</span>' +
        '<span id="serviceBreakerAccessible{0}_{1}">{5}</span>' +
      '</td>' +
      '</tr>';
      html += htmlRow.format(id,
          i+1,
          siteman.services[service.type],
          service.condition.capitalize(),
          service.breaker,
          (service.breaker_accessible) ? '*' : '');
    }
  }
  html += '</table>' +
      '<span style="font-size:xx-small;">* = Breaker is accessible</span>';
  return html;  
}

ChargeSite.prototype.htmlDetails = function(details){
  var html = '' +
    '<table id="tblDetails{0}" border="1">' +
    '  <tr>' +
    '    <td valign="top" align="right"><b>Name:</b></td>' +
    '    <td valign="top" style="width:100%;"><span id="name{0}">{1}</span></td>' +
    '  </tr>' +
    '  <tr>' +
    '    <td valign="top" align="right"><b>Address:</b></td>' +
    '    <td valign="top"><span id="address{0}">{2}</span></td>' +
    '  </tr>' +
    '  <tr>' +
    '    <td valign="top" align="right"><b>Description:</b></td>' +
    '    <td valign="top"><span id="description{0}">{3}</span></td>' +
    '  </tr>' +
    '  <tr>' +
    '    <td valign="top" align="right"<b>Services:</b>' + 
    '    <td valign="top" align="right"><span id="services{0}">{4}</span></td>' + 
    '  </tr>' +
    '  <tr>' +
    '    <td valign="top" align="right"><b>Contact:</b></td>' +
    '    <td valign="top">' +
    '      <table border="1">' +
    '        <tr>' +
    '          <td valign="top" align="right"><b>Name:</b></td>' +
    '          <td valign="top" style="width:100%;"><span id="contactName{0}">{5}</span></td>' +
    '        </tr>' +
    //'        <tr>' +
    //'          <td valign="top" align="right"><b>Address:</b></td>' +
    //'          <td valign="top"><span id="contactAddress{0}">{?}</span></td>' +
    //'        </tr>' +
    '        <tr>' +
    '          <td valign="top" align="right"><b>Phone:</b></td>' +
    '          <td valign="top"><span id="contactPhone{0}">{6}</span></td>' +
    '        </tr>' +
    '        <tr>' +
    '          <td valign="top" align="right"><b>Email:</b></td>' +
    '          <td valign="top"><span id="contactEmail{0}">{7}</span></td>' +
    '        </tr>' +
    //'        <tr>' +
    //'          <td valign="top" align="right"><b>IM:</b></td>' +
    //'          <td valign="top"><span id="contactIM{0}">{?}</span></td>' +
    //'        </tr>' +
    //'        <tr>' +
    //'          <td valign="top" align="right"><b>URL:</b></td>' +
    //'          <td valign="top"><span id="contactURL{0}">{?}</span></td>' +
    //'        </tr>' +
    '      </table>' + 
    '    </td>' +
    '  </tr>' +
    //'  <tr>' +
    //'    <td colspan="2">Rating: TODO(pv)</td>' + 
    //'  </tr>' +
    //'  <tr>' +
    //'    <td colspan="2">Comment(s): TODO(pv)</td>' + 
    //'  </tr>' +
    '</table>';
  return html.format(this.id,
                     textToHTML(details.name),
                     textToHTML(details.address),
                     textToHTML(details.description),
                     textToHTML(this.htmlServices(details)),
                     textToHTML(details.contactName),
                     //textToHTML(details.contactAddress),
                     textToHTML(details.contactPhone),
                     textToHTML(details.contactEmail)
                     //textToHTML(details.contactIM),
                     //textToHTML(details.contactURL)
                     );
}

ChargeSite.prototype.openInfoWindow = function(details){

  // TODO(pv): Can we use map.updateInfoWindow(tabs, onupdate)?
  // TODO(pv): Can we use map.updateCurrentTab(function(tab){ /* GInfoWindowTab.content/label */}, onupdate)?
  // events: infowindowopen, infowindowbeforeclose, infowindowclose
  // GInfoWindow.reset(...), selectTab(#), getSelectedTab(), getTabs()
  // marker.bindInfoWindowTabs
  
  var domDetails = this.makeDetailsDOM(details);
  var domStreetView = this.makeStreetViewDOM(details);
  // TODO(pv): History Tab? (show modifications?  to who?)
  
  var opts = {
//  	selectedTab: 1, // Possible we would prefer SV as selected tab?
//  	maxWidth:?, // map.clientWidth - some margin
//  	maxTitle:?, //
//  	maxContent:?, // TODO(pv): Calculate (similar to tabDetails+tabStreetView)
//    onOpenFn: ?
  };
  
  this.marker.openInfoWindowTabs([
      new GInfoWindowTab('Details', domDetails),
      new GInfoWindowTab('Street View', domStreetView)
      ],
      opts);
}

ChargeSite.prototype.onInfoWindowOpen = function(){
/*
  map.updateCurrentTab(bind(this, function(tab){
    alert('modify tab');
    this.calcDetailsOverflow();
  }), function(){
    alert('onupdate');
  })
*/
  // Always do this (even if not edit mode)
  this.calcDetailsOverflow();
  
  if (this.newsite){
    this.toggleEditMode(false);
  }
}

ChargeSite.prototype.calcDetailsOverflow = function(){
  var id = this.id;
  var divWrapper = $('divWrapper'+id);
  var divHeader = $('rowHeader'+id);
  var divDetails = $('divDetails'+id);
  var tblDetails = $('tblDetails'+id);
  var divFooter = $('rowFooter'+id);
  DBG(tblDetails.clientHeight);
  if (divWrapper && divHeader && divDetails && tblDetails && divFooter) {
    var height = divWrapper.offsetHeight - divHeader.offsetHeight - divFooter.offsetHeight;
    DBG(height);
    divDetails.style.height = height + 'px';
    //divDetails.style.width = divWrapper.clientWidth;
  } else {
    alert('ERROR: Failed to get all divs needed to calculate overflow!');
  }
}

ChargeSite.prototype.calcInputWidth = function(id){
  var element = $(id);
  var width = element.offsetParent.clientWidth - element.parentNode.offsetLeft;
  DBG(width);
  element.style.width = (width - 10) + 'px';
  return element.style.width;
}


ChargeSite.prototype.validSite = function(){
  // TODO(pv): Validate values...
  //'Please enter a'
  return true;
}

ChargeSite.prototype.validateSite = function(site){
  // Server won't accept '', but will access null; replace      
  for (var key in site){
    var val = site[key];
    if (val == ''){
      site[key] = null;
    }
  }
  return site;
}

ChargeSite.prototype.toggleEditMode = function(save){

	if (!this.confirmCanModify())
	  return;

  var id = this.id;
  var editing = ($('btnTwo'+id).value == 'Save');

  if (editing && save){

    var name = $('editName').value;

    var json = {
      address:$('editAddress').value,
      description:$('editDescription').value,
      contactName:$('editContactName').value,
      contactPhone:$('editContactPhone').value,
      contactEmail:$('editContactEmail').value
    };
    
    json.services = [];
    var tbl = $('tblServices'+id);
    for (var i=1; i<tbl.rows.length; i++){
      var row = tbl.rows[i];
      if (row.cells.length != 4){
        continue;
      }

      var service = {};
      var cell0 = row.cells[0];
      var serviceNum = cell0.lastChild.data;
      var prefix = (serviceNum == '?') ? 'new' : 'edit';
      var suffix = id+'_'+ ((prefix == 'new') ? i : serviceNum);
      
      DBG(prefix+'ServiceType'+suffix);
      
      var type = $(prefix+'ServiceType'+suffix);
      if (type){
        // Skip this row       
        service.type = $(prefix+'ServiceType'+suffix).value;
        service.condition = $(prefix+'ServiceCondition'+suffix).value;
        service.breaker = $(prefix+'ServiceBreaker'+suffix).value;
        service.breaker_accessible = $(prefix+'ServiceBreakerAccessible'+suffix).checked;
  
        DBG(service.toSource());
        json.services.push(service);
      }
    }
    
    // TODO(pv): Submit only if changed/"dirty" & valid?
    if (!this.validSite()){
      
      alert('Please enter complete and valid data');
            
    } else {
            
      if (this.newsite){
  
  	    var latlng = this.strLatLng();
  	    json = this.validateSite(json);
      	
        DBG('Adding #'+id+':'+JSON.stringify(json));
        server.AddSite(name, latlng, json, bind(this, function(site){
          DBG('Site #'+site.id+' Added');
          siteman.replaceNewSite(this, site);
        }), bind(this, function(){
          DBG('Site #'+this.id+' FAILED to add');
        	alert('ERROR: AddSite');
        }));
        
      } else {
      	
  	    json.name = name;
      	json = this.validateSite(json);
      	
        DBG('Updating #'+id+':'+JSON.stringify(json));
        server.UpdateSite(id, json, bind(this, function(site){
          DBG('Site #'+site.id+' Updated');
          siteman.updateSite(this);
          //this.renderText(site, editing); // Removed until siteman.updateSite can be more dynamic
        }), bind(this, function(){
          DBG('Site #'+this.id+' FAILED to update');
          alert('ERROR: UpdateSite');
        }));
        
      }
    }

  } else {

    DBG('Site #'+id+': No changes to save; getting the latest');
    this.getDetails(bind(this, function(site){
    	this.renderText(site, editing);
    }));
    
  }
}

ChargeSite.prototype.renderText = function(details, staticText){

  var id = details.id;
  var btnOne = $('btnOne'+id);
  var btnTwo = $('btnTwo'+id);

  // FOR DEBUGGING ONLY! (Remove eventually)
  //details.services = DEBUG_SERVICES;
  
  if (staticText){
    
	  btnOne.value = 'Edit';
	  btnOne.onclick = function() { selectedSite.toggleEditMode(true); };
	  btnTwo.value = 'Delete';
	  btnTwo.onclick = function() { selectedSite.confirmDeleteSite(); };

    // Render Basic Info
	  $('name'+id).innerHTML = textToHTML(details.name);
	  $('address'+id).innerHTML = textToHTML(details.address);
	  $('description'+id).innerHTML = textToHTML(details.description);
	  
	  // Render Services
	  $('services'+id).innerHTML = this.htmlServices(details);
	  	  
	  // Render Contact Info	  
    $('contactName'+id).innerHTML = textToHTML(details.contactName);
    $('contactPhone'+id).innerHTML = textToHTML(details.contactPhone);
    $('contactEmail'+id).innerHTML = textToHTML(details.contactEmail);
    
  } else {

    var width;

    // Render Editable Basic Info
    $('name'+id).innerHTML = htmlInputTextElement('editName', details.name);
    width = this.calcInputWidth('editName');
    $('address'+id).innerHTML = htmlTextAreaElement(3, 'editAddress', details.address, width);
    $('description'+id).innerHTML = htmlTextAreaElement(5, 'editDescription', details.description, width);
    
    var services = details.services;
    if (services){
      // Render Editable Services
      for (var i=0; i<services.length; i++){
        
        var service = services[i];
        
        var suffix = id+'_'+(i+1);
  
        $('btnServiceDelete'+suffix).style.display = 'inline';
        
        var spanName = 'serviceType'+suffix;
        var editName = 'edit'+spanName.capitalize(false);            
        $(spanName).innerHTML = siteman.htmlServiceDescriptors.types.format(editName);
        selectOptionValue(editName, service.type);
    
        spanName = 'serviceCondition'+suffix;
        editName = 'edit'+spanName.capitalize(false);
        $(spanName).innerHTML = siteman.htmlServiceDescriptors.conditions.format(editName);
        selectOptionValue(editName, service.condition);
  
        spanName = 'serviceBreaker'+suffix;
        editName = 'edit'+spanName.capitalize(false);
        $(spanName).innerHTML = siteman.htmlServiceDescriptors.breakers.format(editName);
        selectOptionValue(editName, service.breaker);
  
        spanName = 'serviceBreakerAccessible'+suffix;
        editName = 'edit'+spanName.capitalize(false);
        $(spanName).innerHTML = htmlInputCheckboxElement(editName, service.breaker_accessible);
      }
    }
    
    // Add new row to allow inserting new Service type
    addAddNewServiceRowButton('tblServices'+id, id);
    // TODO(pv): Allow moving rows up/down
    
    // Render Editable Contact Info
    $('contactName'+id).innerHTML = htmlInputTextElement('editContactName', details.contactName, width);
    width = this.calcInputWidth('editContactName');
    $('contactPhone'+id).innerHTML = htmlInputTextElement('editContactPhone', details.contactPhone, width);
    $('contactEmail'+id).innerHTML = htmlInputTextElement('editContactEmail', details.contactEmail, width);
    
    // Highlight newsite values to encourage changing defaults... 
    if (this.newsite){
    	selectEdit($('editName'));
      selectEdit($('editAddress'));
      selectEdit($('editDescription'));
      selectEdit($('editContactName'));
      selectEdit($('editContactPhone'));
      selectEdit($('editContactEmail'));
    	
      btnOne.value = 'Delete';
      btnOne.onclick = function() { selectedSite.confirmDeleteSite(); };
    } else {
	    btnOne.value = 'Cancel';
	    btnOne.onclick = function() { selectedSite.toggleEditMode(false); };
    }
    btnTwo.value = 'Save';
    btnTwo.onclick = function() { selectedSite.toggleEditMode(true); };
  }
}