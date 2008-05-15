//
// @author Paul Peavyhouse (pv@swooby.com)
//

// TODO(pv): Custom numbered icons
//  http://gmaps-utility-library.googlecode.com/svn/trunk/mapiconmaker/
//    JS, no text
//  http://people.csail.mit.edu/alexgru/markers/markers/
//    PHP, text

// Pointer to the one and only marker that we can edit at a time
var selectedSite = null;


function textToHTML(text){
  if (text) {
    text = text.replace(/\n/g, '<br>\n');
  } else {
  	text = '&nbsp;'
  }
  return text;
}

function showLoading(show){
	showId('loading', show);
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


function SitesManager(map, current_user, is_authenticated, is_admin){
	this.current_user = (current_user) ? current_user.toLowerCase() : null;
	this.is_authenticated = is_authenticated;
	this.is_admin = is_admin;
  this.dictMarkers = {};
  this.cluster = new ClusterMarker(map, {clusterMarkerIcon:this.getClusterMarkerIcon()});
  return this;
}

SitesManager.prototype.addMarker = function(id, marker){
  this.dictMarkers[id] = marker;
}

SitesManager.prototype.removeMarker = function(id, redraw){
  delete this.dictMarkers[id]
  if (redraw)
    this.redrawMarkers();
}

SitesManager.prototype.getClusterMarkerIcon = function(){
  return getSiteMarkerIcon('green-dot');
}

SitesManager.prototype.updateMarker = function(marker){
  // Marker clustering does not [currently?] allow updating a single marker
  // For now we have to clear markers and then rebuild them
  // This may not be too bad, since Clustering is pretty fast, and we are only changing one.
  
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

SitesManager.prototype.isEditable = function(site){
	return (this.is_authenticated && 
	 ((this.current_user == site.userCreator.toLowerCase()) || this.is_admin || (this.current_user == site.contactUser.toLowerCase()))
	 );
}
SitesManager.prototype.loadMarkers = function(){
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
  }));
}


function ChargeSite(id, name, latlng, type, editable, newsite){
	if (!newsite){
		newsite = false;
	}
  this.newsite = newsite;
    
  // These arguments are the min needed to get an icon displayed on the map
  this.id = id;
  this.name = name;
  this.latlng = latlng;
  this.type =type;
  this.editable = editable;

  this.createMarker();
    
  return this;
}

ChargeSite.prototype.confirmCanModify = function(){
  if (!this.editable){
    if (confirm('You must Log In as the site Creator, Contact, or Admin in order to perform this action.\n' +
      'Would you like to Log In now?')){
      document.location = url_auth;
    }
  }
  return this.editable;
}

ChargeSite.prototype.deleteSite = function(id){
  server.DeleteSite(id, bind(this, function(id){
  	siteman.removeMarker(id, true);
  }));
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

ChargeSite.prototype.createMarker = function(){
  var markerOptions = {
    icon: this.getSiteMarkerIcon(this.id, this.type),
    title: '#' + this.id + ':'+ this.name,
    draggable: true,
    bouncy: true
  };
  this.marker = new GMarker(this.latlng, markerOptions);
  this.marker.site = this; // May cause recursion problem if JSONed/walked
  GEvent.bind(this.marker, "dragend", this, this.onDragEnd);
  GEvent.bind(this.marker, "click", this, this.onClick);
  return this.marker;
}

ChargeSite.prototype.showMapBlowup = function(){
	// TODO(pv): auto detect greatest supported zoomLevel? (19, 20, ?)
	// TODO(pv): Save blowup zoom level to DB?
	this.marker.showMapBlowup({mapType:G_HYBRID_MAP});
}

ChargeSite.prototype.onDragEnd = function(){
	if (!this.confirmCanModify()){
		this.marker.setLatLng(this.latlng);
    return;
	}
	
  if (this.newsite){
  	// Nothing to do: We haven't saved the site yet, so no need update the server
  } else {
    var json = {
      latlng: this.marker.getLatLng().toString()
    };
    server.UpdateSite(this.id, json, bind(this, function(site){
    	this.latlng = site.latlng;
    }));
  }
}


// ABOVE ^: Relatively stable and reliable code
// BELOW v: Problematic ugly code 


SitesManager.prototype.createNewSite = function(){
  var latlng = map.getCenter();
  var site = new ChargeSite('NEW', 'Unnamed', latlng, null, this.authenticated, true);
  map.addOverlay(site.marker);
}



ChargeSite.prototype.getDetails = function(callback){
  if (this.newsite){
	  var json = {
	    userCreator:null,
	    name:null,
	    address:null,
	    phone:null,
	    description:null
	  };
    DBG('New:'+JSON.stringify(json));
	  callback(json);
  } else {
	  server.GetSite(this.id, function(json){
	    DBG('Queried:'+JSON.stringify(json));
	    callback(json);
	  });
  }
}

ChargeSite.prototype.onClick = function(){
  selectedSite = this; // Needed by JS generated for InfoWindow
  this.getDetails(bind(this, this.openInfoWindow));   
}

ChargeSite.prototype.makeDetailsTab = function(details){
	var id = this.id;
  var div = $('propsWrapper'+id);
  if (!div) {
	  // Sad that IE does not support E4X! :(
	  // Is DOM really faster/safer than raw text/html?
	  var dom = document.createElement('div');
	  dom.setAttribute('id', 'propsWrapper'+id);
	  dom.setAttribute('style', 'width:400px;');
	  // TODO(pv): Create a proper DOM for the below HTML; until then...
	  var template = '' +
				'<table width="100%;">' +
				'  <tr id="propsHeader{0}">' +
				'    <td><font size="5"><b>Site #{0}</b></font></td>' +
				'    <td align="right"><font size="2">Created by: {1}</font></td>' +
				'  </tr>' +
				'  <tr>' +
				'    <td colspan="2" style="height:100%;" valign="top">' +
				'      <div id="divProps{0}" style="overflow-y:auto;">' +
				'      <table border="1">' +
				'        <tr>' +
				'          <td valign="top" align="right"><b>Name:</b></td>' +
				'          <td valign="top" style="width:100%;"><span id="name{0}">{2}</span></td>' +
				'        </tr>' +
				'        <tr>' +
				'          <td valign="top" align="right"><b>Address:</b></td>' +
				'          <td valign="top"><span id="address{0}">{3}</span></td>' +
				'        </tr>' +
				'        <tr>' +
				'          <td valign="top" align="right"><b>Phone:</b></td>' +
				'          <td valign="top"><span id="phone{0}">{4}</span></td>' +
				'        </tr>' +
				'        <tr>' +
				'          <td valign="top" align="right"><b>Description:</b></td>' +
				'          <td valign="top"><span id="description{0}">{5}</span></td>' +
				'        </tr>' +
				'      </table>' +
				'      </div>' +
				'    </td>' +
				'  </tr>' +
				'  <tr id="propsFooter{0}">' +
				'    <td colspan="2">' +
				'      <table width="100%;">' +
				'        <tr>' +
				'          <td align="left">' +
				'            <input type="button" value="Blow Up" onclick="selectedSite.showMapBlowup()"/>' +
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
		dom.innerHTML = template.format(
				      id,
				      textToHTML(details.userCreator), // document.createTextNode(   
				      textToHTML(details.name),
				      textToHTML(details.address),
				      textToHTML(details.phone),
				      textToHTML(details.description));
  }
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

ChargeSite.prototype.openInfoWindow = function(details){

  var tabDetails = this.makeDetailsTab(details);
  var tabStreetView = this.makeStreetViewTab(details);
  
  var opts = {
//  	selectedTab: 1, // maybe we would prefer SV as selected tab?
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
  this.calcDetailsOverflowHeight();
}

ChargeSite.prototype.calcDetailsOverflowHeight = function(){
  var id = this.id;
  var divWrapper = $('propsWrapper'+id);
  var divHeader = $('propsHeader'+id);
  var divFooter = $('propsFooter'+id);
  var divProps = $('divProps'+id);
  if (divWrapper && divHeader && divFooter && divProps) { 
    var height = divWrapper.offsetHeight - divHeader.offsetHeight - divFooter.offsetHeight;
    divProps.style.height = height + 'px';
  }
}

ChargeSite.prototype.toggleEditMode = function(save){
	
	if (!this.confirmCanModify())
	  return;
		
  var id = this.id;
  var btnOne = $('btnOne'+id);
  var btnTwo = $('btnTwo'+id);
  
  btnOne.disabled = btnTwo.disabled = true;

  var editing = (btnTwo.value == 'Save');
  if (this.newsite || !editing) {

    this.getDetails(function(site){
        var id = site.id;
        $('name' + id).innerHTML = '<input type="text" style="width:100%" id="editName" value="' + site.name + '"/>';
        $('address' + id).innerHTML = '<textarea style="width:100%" rows="3" id="editAddress">' + site.address + '</textarea>';
        $('phone' + id).innerHTML = '<input type="text" style="width:100%" id="editPhone" value="' + site.phone + '"/>';
        $('description' + id).innerHTML = '<textarea style="width:100%" rows="5" id="editDescription">' + site.description + '</textarea>';
        
        btnOne.value = 'Cancel';
        btnOne.onclick = function() { selectedSite.toggleEditMode(false); };
        btnTwo.value = 'Save';
        btnTwo.onclick = function() { selectedSite.toggleEditMode(true); };
      });
    
  } else {
  	    
    btnOne.value = 'Edit';
    btnOne.onclick = function() { selectedSite.toggleEditMode(true); };
    btnTwo.value = 'Delete';
    btnTwo.onclick = function() { selectedSite.confirmDeleteSite(); };

    if (save){
	    
	    var site = {
	      name:$('editName').value,
	      address:$('editAddress').value,
	      phone:$('editPhone').value,
	      description:$('editDescription').value
	      };
	    
	    for (var key in site){
	    	var val = site[key];
	    	if (val == ''){
	    		site[key] = null;
	    	}
	    }

      DBG('Saving #'+this.id+':'+JSON.stringify(site));
	
	    $('name' + id).innerHTML = textToHTML(site.name);
	    $('address' + id).innerHTML = textToHTML(site.address);
	    $('phone' + id).innerHTML = textToHTML(site.phone);
	    $('description' + id).innerHTML = textToHTML(site.description);
	      
      if (this.newsite){
        server.AddSite(site, function(site){
          DBG('Site #'+site.id+' Saved');
        });
      } else {
        server.UpdateSite(this.id, site, function(site){
          DBG('Site #'+site.id+' Saved');
        });
      }
      
    } else {
      
      DBG('Site #'+this.id+': No changes to save; getting the latest');
      
      this.getDetails(function(site){
      	var id = site.id;
	      $('name' + id).innerHTML = textToHTML(site.name);
	      $('address' + id).innerHTML = textToHTML(site.address);
	      $('phone' + id).innerHTML = textToHTML(site.phone);
	      $('description' + id).innerHTML = textToHTML(site.description);
      });
      
    }
  }

  btnOne.disabled = btnTwo.disabled = false;
}
