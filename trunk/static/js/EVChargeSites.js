//
// @author Paul Peavyhouse (pv@swooby.com)
//

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
  // Marker clustering does not [currently?] allow updating a single marker
  // For now we have to clear markers and then rebuild them
  // This may not be too bad, since Clustering is pretty fast, and we are only changing one.
  this.loadMarkers(bind(site,site.onClick));
  
  
  // Another alternative is to forego this and just add the marker outside of clustering.
  // This seems reasonable considering that the marker was of interest to the user enough for them to update it.
  // So, it is reasonable to presume that the user might not mind or even notice that the marker stands outside of the cluster.
  // When the user refreshes the page the cluster will re-group.
  // The problem w/ this is that we still need to remove the old marker from the cluster, and since there is [currently] no way
  // to do this, we are back to needing this function.
}

SitesManager.prototype.redrawMarkers = function(){
  this.cluster.removeMarkers();
  var arrayMarkers = [];
  for(var key in this.dictMarkers){
    arrayMarkers.push(this.dictMarkers[key]);
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

ChargeSite.prototype.makeDetailsTab = function(details){
	var id = this.id;
  // Sad that IE does not support E4X! :(
  var dom = document.createElement('div');
  dom.setAttribute('id', 'propsWrapper'+id);
  dom.setAttribute('style', 'width:400px;');

  // TODO(pv): Would it be better/faster to DOM the below HTML?
  var htmlTemplate = '' +
    '<table width="100%;">' +
		'  <tr id="propsHeader{0}">' +
		'    <td><font size="5"><b>Site #{0}</b></font></td>' +
		'    <td align="right"><font size="2">Created by: <a href="mailto:{1}">{2}</a></font></td>' +
		'  </tr>' +
		'  <tr>' +
		'    <td colspan="2" style="height:100%;width:100%;" valign="top">' +
		'      <div id="divProps{0}" style="overflow:auto;">{3}</div>' +
		'    </td>' +
		'  </tr>' +
		'  <tr id="propsFooter{0}">' +
		'    <td colspan="2">' +
		'      <table width="100%;">' +
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

ChargeSite.prototype.makeStreetViewTab = function(details){
	var id = this.id;
  var dom = document.createElement('div');
  dom.setAttribute('id', 'streetView'+id);
  dom.setAttribute('style', 'width:400px;');
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
  contentNode.style.width = '640px';
  contentNode.style.height = '360px';
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

ChargeSite.prototype.htmlDetails = function(details){
  var html = '' +
    '<table border="1" width="100%">' +
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
    //'  <tr>' +
    //'    <td colspan="2">Outlets: TODO(pv)</td>' + 
    //'  </tr>' +
    '  <tr>' +
    '    <td colspan="2"><b>Contact:</b>' +
    '      <table border="1" width="100%">' +
    '        <tr>' +
    '          <td valign="top" align="right"><b>Name:</b></td>' +
    '          <td valign="top" style="width:100%;"><span id="contactName{0}">{4}</span></td>' +
    '        </tr>' +
    //'        <tr>' +
    //'          <td valign="top" align="right"><b>Address:</b></td>' +
    //'          <td valign="top"><span id="contactAddress{0}">{?}</span></td>' +
    //'        </tr>' +
    '        <tr>' +
    '          <td valign="top" align="right"><b>Phone:</b></td>' +
    '          <td valign="top"><span id="contactPhone{0}">{5}</span></td>' +
    '        </tr>' +
    '        <tr>' +
    '          <td valign="top" align="right"><b>Email:</b></td>' +
    '          <td valign="top"><span id="contactEmail{0}">{6}</span></td>' +
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
                     textToHTML(details.contactName),
                     //textToHTML(details.contactAddress),
                     textToHTML(details.contactPhone),
                     textToHTML(details.contactEmail)
                     //textToHTML(details.contactIM),
                     //textToHTML(details.contactURL)
                     );
}


ChargeSite.prototype.domTabTemplate = function(tabNum, details, innerHTML){
	
  var id = this.id;
  // Sad that IE does not support E4X! :(
  var dom = document.createElement('div');
  dom.setAttribute('id', 'propsWrapper'+id+'_'+tabNum);
  dom.setAttribute('style', 'width:400px;');

  var htmlTemplate = '' +
    '<table width="100%;">' +
    '  <tr id="propsHeader{0}_{1}">' +
    '    <td><font size="5"><b>Site #{0}</b></font></td>' +
    '    <td align="right"><font size="2">Created by: <a href="mailto:{2}">{3}</a></font></td>' +
    '  </tr>' +
    '  <tr>' +
    '    <td colspan="2" style="height:100%;width:100%;" valign="top">' +
    '      <div id="divProps{0}_{1}" style="overflow:auto;">{4}</div>' +
    '    </td>' +
    '  </tr>' +
    '  <tr id="propsFooter{0}_{1}">' +
    '    <td colspan="2">' +
    '      <table width="100%;">' +
    '        <tr>' +
    '          <td align="left">' +
    '            <input type="button" value="Close Up" onclick="selectedSite.showMapBlowup()"/>' +
    '          </td>' +
    '          <td align="right">' +
    '            <input id="btnOne{0}_{1}" type="button" value="Edit" onclick="selectedSite.toggleEditMode(true)"/>' +
    '            <input id="btnTwo{0}_{1}" type="button" value="Delete" onclick="selectedSite.confirmDeleteSite()"/>' +
    '          </td>' +
    '        </tr>' +
    '      </table>' +
    '    </td>' +
    '  </tr>' +
    '</table>';
    
  dom.innerHTML = htmlTemplate.format(id,
                                      tabNum,
                                      escape(details.userCreator.email),   
                                      escape(details.userCreator.nickname),
                                      innerHTML);
  return dom;
}

ChargeSite.prototype.openInfoWindow = function(details){

  // TODO(pv): Can we use map.updateInfoWindow(tabs, onupdate)?
  // TODO(pv): Can we use map.updateCurrentTab(function(tab){ /* GInfoWindowTab.content/label */}, onupdate)?
  // events: infowindowopen, infowindowbeforeclose, infowindowclose
  // GInfoWindow.reset(...), selectTab(#), getSelectedTab(), getTabs()
  // marker.bindInfoWindowTabs
  //var htmlDetails = this.htmlDetails(details);
  //var domDetails = this.domTabTemplate(0, details, htmlDetails);
  //var htmlStreetView = 'TODO(pv): htmlStreetView';
  //var domStreetView = this.domTabTemplate(1, details, htmlStreetView);
  
  var tabDetails = this.makeDetailsTab(details);
  var tabStreetView = this.makeStreetViewTab(details);
  // TODO(pv): History Tab? (show modifications?  to who?)
  
  var opts = {
//  	selectedTab: 1, // Possible we would prefer SV as selected tab?
//  	maxWidth:?, // map.clientWidth - some margin
//  	maxTitle:?, //
//  	maxContent:? // TODO(pv): Calculate (similar to tabDetails+tabStreetView)
  };
  this.marker.openInfoWindowTabs([
      new GInfoWindowTab('Details', tabDetails),
      new GInfoWindowTab('Street View', tabStreetView)
      ],
      opts);
  
  // Always do this (even if not edit mode)
  this.calcDetailsOverflow();
  
  if (this.newsite){
  	this.toggleEditMode(false);
  }
}

ChargeSite.prototype.calcDetailsOverflow = function(){
  var id = this.id;
  var divWrapper = $('propsWrapper'+id);
  var divHeader = $('propsHeader'+id);
  var divFooter = $('propsFooter'+id);
  var divProps = $('divProps'+id);
  if (divWrapper && divHeader && divFooter && divProps) { 
    var height = divWrapper.offsetHeight - divHeader.offsetHeight - divFooter.offsetHeight;
    divProps.style.height = height + 'px';
    //divProps.style.width = divWrapper.offsetWidth;
  }
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

    var json = {
      address:$('editAddress').value,
      description:$('editDescription').value,
      contactPhone:$('editContactName').value,
      contactPhone:$('editContactPhone').value,
      contactPhone:$('editContactEmail').value
    };

    if (this.newsite){

	    var name = $('editName').value;
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
    	
	    json.name = $('editName').value;
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

  } else {

    DBG('Site #'+id+': No changes to save; getting the latest');
    this.getDetails(bind(this, function(site){
    	this.renderText(site, editing);
    }));
    
  }
}

ChargeSite.prototype.selectEdit = function(input){
	var defaultValue = input.value;
  input.onclick = input.onfocus = function(){
  	DBG('"'+this.value+'"?="'+defaultValue+'"');
  	if (this.value == defaultValue){
  		this.select();
  	}
  }
}

ChargeSite.prototype.renderText = function(site, staticText){

  var id = site.id;
  var btnOne = $('btnOne'+id);
  var btnTwo = $('btnTwo'+id);
  
  if (staticText){
	  btnOne.value = 'Edit';
	  btnOne.onclick = function() { selectedSite.toggleEditMode(true); };
	  btnTwo.value = 'Delete';
	  btnTwo.onclick = function() { selectedSite.confirmDeleteSite(); };
	
	  $('name' + id).innerHTML = textToHTML(site.name);
	  $('address' + id).innerHTML = textToHTML(site.address);
	  $('description' + id).innerHTML = textToHTML(site.description);
    $('contactName' + id).innerHTML = textToHTML(site.contactName);
    $('contactPhone' + id).innerHTML = textToHTML(site.contactPhone);
    $('contactEmail' + id).innerHTML = textToHTML(site.contactEmail);
  } else {
  	var style = 'width:100%'; // TODO(pv): For long contiguous text, this wraps bad in IE
    $('name' + id).innerHTML = '<input type="text" style="'+style+'" id="editName" value="' + site.name + '"/>';
    $('address' + id).innerHTML = '<textarea style="'+style+'" rows="3" id="editAddress">' + site.address + '</textarea>';
    $('description' + id).innerHTML = '<textarea style="'+style+'" rows="5" id="editDescription">' + site.description + '</textarea>';
    $('contactName' + id).innerHTML = '<input type="text" style="'+style+'" id="editContactName" value="' + site.contactName + '"/>';
    $('contactPhone' + id).innerHTML = '<input type="text" style="'+style+'" id="editContactPhone" value="' + site.contactPhone + '"/>';
    $('contactEmail' + id).innerHTML = '<input type="text" style="'+style+'" id="editContactEmail" value="' + site.contactEmail + '"/>';
        
    if (this.newsite){
    	this.selectEdit($('editName'));
      this.selectEdit($('editAddress'));
      this.selectEdit($('editDescription'));
      this.selectEdit($('editContactName'));
      this.selectEdit($('editContactPhone'));
      this.selectEdit($('editContactEmail'));
    	
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