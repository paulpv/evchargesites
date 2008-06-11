
function UserControl(authenticated, url_auth){
  this.authenticated = authenticated;
  this.url_auth = url_auth;
  return this;
}
UserControl.prototype = new GControl();

UserControl.prototype.initialize = function(map) {
  var container = document.createElement("div");
  if (this.authenticated){
    var divLogout = document.createElement("div");
    this.setButtonStyle_(divLogout);
    container.appendChild(divLogout);
    divLogout.appendChild(document.createTextNode("Log Out"));
    GEvent.addDomListener(divLogout, "click", bind(this, function() {
      document.location = this.url_auth;
    }));
  } else {
    var divLogin = document.createElement("div");
    this.setButtonStyle_(divLogin);
    container.appendChild(divLogin);
    divLogin.appendChild(document.createTextNode("Log In"));
    GEvent.addDomListener(divLogin, "click", bind(this, function() {
      document.location = this.url_auth;
    }));
  }

  var divNewSite = document.createElement("div");
  this.setButtonStyle_(divNewSite);
  container.appendChild(divNewSite);
  divNewSite.appendChild(document.createTextNode("New Site"));
  GEvent.addDomListener(divNewSite, "click", bind(this, function() {
  	if (this.authenticated){
      siteman.createNewSite();
  	} else {
  		confirmLogin(false);
  	}
  }));

  var divRefresh = document.createElement("div");
  this.setButtonStyle_(divRefresh);
  container.appendChild(divRefresh);
  divRefresh.appendChild(document.createTextNode("Refresh"));
  GEvent.addDomListener(divRefresh, "click", function() {
    siteman.loadMarkers();
  });

  map.getContainer().appendChild(container);

  return container;
}
    
UserControl.prototype.getDefaultPosition = function() {
  return new GControlPosition(G_ANCHOR_TOP_RIGHT, new GSize(7, 35));
}

UserControl.prototype.setButtonStyle_ = function(button) {
  button.style.textDecoration = "none";
  button.style.color = "#000000";
  button.style.backgroundColor = "white";
  button.style.font = "small Arial";
  button.style.border = "1px solid black";
  button.style.padding = "2px";
  button.style.marginBottom = "3px";
  button.style.textAlign = "center";
  button.style.width = "4em";
  button.style.cursor = "pointer";
}


function AdminControl(url_admin){
  this.url_admin = url_admin;
  return this;
}
AdminControl.prototype = new GControl();

AdminControl.prototype.initialize = function(map) {
  var container = document.createElement("div");

  var divSource = document.createElement("div");
  this.setButtonStyle_(divSource);
  container.appendChild(divSource);
  divSource.appendChild(document.createTextNode("Source"));
  GEvent.addDomListener(divSource, "click", function() {
    document.location = "http://code.google.com/p/evchargesites/";
  });
  
  var divBug = document.createElement("div");
  this.setButtonStyle_(divBug);
  container.appendChild(divBug);
  divBug.appendChild(document.createTextNode("Report Bug"));
  GEvent.addDomListener(divBug, "click", function() {
    document.location = "http://code.google.com/p/evchargesites/issues/entry";
  });

  if (this.url_admin){
    var divImport = document.createElement("div");
    this.setButtonStyle_(divImport);
    container.appendChild(divImport);
    divImport.appendChild(document.createTextNode("Import"));
    GEvent.addDomListener(divImport, "click", function() {
      document.location = "/import";
    });
  
    var divAdmin = document.createElement("div");
    this.setButtonStyle_(divAdmin);
    container.appendChild(divAdmin);
    divAdmin.appendChild(document.createTextNode("Admin"));
    GEvent.addDomListener(divAdmin, "click", bind(this, function() {
      document.location = this.url_admin;
    }));
    
    var divUrchinCode = document.createElement("div");
    this.setButtonStyle_(divUrchinCode);
    container.appendChild(divUrchinCode);
    divUrchinCode.appendChild(document.createTextNode("Analytics"));
    GEvent.addDomListener(divUrchinCode, "click", function() {
      document.location = "https://www.google.com/analytics/reporting/dashboard?scid=4277916";
    });
  }

  map.getContainer().appendChild(container);

  return container;
}
    
AdminControl.prototype.getDefaultPosition = function() {
  return new GControlPosition(G_ANCHOR_BOTTOM_LEFT, new GSize(7, 35));
}

AdminControl.prototype.setButtonStyle_ = function(button) {
  button.style.textDecoration = "none";
  button.style.color = "#000000";
  button.style.backgroundColor = "white";
  button.style.font = "small Arial";
  button.style.border = "1px solid black";
  button.style.padding = "2px";
  button.style.marginBottom = "3px";
  button.style.textAlign = "center";
  button.style.width = "4em";
  button.style.cursor = "pointer";
}
