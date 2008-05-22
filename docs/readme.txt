
  CONTACT:
    Paul Peavyhouse (pv@swooby.com)

  REFERENCES:
    GData API Reference:
      http://code.google.com/apis/gdata/jsdoc/1.1/index.html
    GMap API Reference:
      http://code.google.com/apis/maps/documentation/reference.html
    MapMundi.org/MapEcos.org:
      http://core.mapmundi.org/mapPortal.do?key=nXrOfnvmKdm7agntOkNlAF4q2bVpdEFfcHyau011kNkOIiHTOEq4G2JQTunSyArklStPVvOXSjGD69NaiQsLyI&color=blue

  TODO:
    Support multiple phone numbers?
      Make sense of Creator vs. Contact info
    Ranking
    User/Anonymous comments
    BUG: Cookie currently expires after one year; need better option
    Search code for "TODO" and make bugs
    
    Add "Report a bug"
    
    Scrub all JS code and make variable & method/function names consistent
    
    Improve MapType options (topo, +/- SV overlay, traffic, etc...)
    
    Add http://clustrmaps.com/
    Oh wow! UI similar to: http://www.kreisalarm.de/drkmap
    Remove taxi top to car.
      W/ cute FOV indicator:
        http://data.mapchannels.com/mm/dual2/map.htm?x=-122.388581&y=37.789536&z=16&gm=0&ve=3&gc=0&xb=-122.388581&yb=37.789536&zb=1&db=0&bar=1&mw=1&sv=1&svb=0
        <svg version="1.1" overflow="visible" style="position: absolute; left: 433px; top: 70px; z-index: 1000;" width="89px" height="89px" viewBox="433 70 89 89">
          <path stroke-linejoin="round" stroke-linecap="round" d="M478,157 L435,83 L449,77 L463,73 L478,72 L493,73 L507,77 L520,83 L478,157" stroke="#0000FF" stroke-opacity="0.5" stroke-width="2px" fill="#00FF00" fill-opacity="0.9" fill-rule="evenodd"/>
        </svg>
        http://www.w3.org/TR/SVG/masking.html
        http://lecturer.eng.chula.ac.th/fsvskk/gglmap2/gmad-v2x.html
    Numbered Icons (1-99999...programmatic?):
      http://gmaps-utility-library.googlecode.com/svn/trunk/mapiconmaker/
        JS, no text
      http://people.csail.mit.edu/alexgru/markers/markers/
        PHP, text
      http://www.geocodezip.com/mapIcons/marker99.png
      http://gmaps-samples.googlecode.com/svn/trunk/markers/green/marker99.png
      http://gmaps-samples.googlecode.com/svn/trunk/markers/green/blank.png
      May need to cache images: http://www.panoramio.com/blog/slow-markers-explorer/
      http://gmaps-utility-library.googlecode.com/svn/trunk/labeledmarker/release/examples/markerhider.html
      Labels?
    Custom Icons (outlet, avcon, lpi, spi, etc):
      http://www.visual-case.it/cgi-bin/vc/GMapsIcons.pl
      http://groups.google.com/group/Google-Maps-API/web/examples-tutorials-custom-icons-for-markers
      http://mapki.com/index.php?title=Icon_Image_Sets
      http://lecturer.eng.chula.ac.th/fsvskk/gglmap2/res/pencil3.gif
      http://core.mapmundi.org/images/zoom-to-rectangle.gif
    Marker Tooltips:
      http://econym.googlepages.com/tooltips.htm
    Custom Controls:
      http://econym.googlepages.com/example_maptypecontrols.htm
      http://atenasio.googlepages.com/gdd2007.html
      Example from EVChargerMaps
    Get AdminControl to expand to the right (not up)
    Directions w/ Animation:
      http://econym.googlepages.com/example_cartrip.htm :)
    Proper JavaScript exception throwing
    Expandible edit inputs?
      "+" button beside text inputs grow input size
    Reverse geocoding (for initial position?):
      http://emad.fano.us/blog/?p=277
      http://geo.localsearchmaps.com/?format=json&lat=34.209539&long=-118.325116
      http://www.localsearchmaps.com/
    Car profiles
      Weight, wheels, V, A, rolling/aero resistance, details (austinev), etc... 
      Allow multiple Cars?

  BUGS:
    ScaleControl does not repaint on [some?] zooms (only during drag)
    
  DONE/HISTORY:
    Authenticate: DONE(when moved to Google App Engine)
    Add Urchin & Adsense: DONE(when moved to Google App Engine)
    Replace "guy" SV icon w/ "car": DONE    
    Progress/Loading Message: DONE(2008/04/24)
    Load both EVChargerMaps.xml and NW EV Charging Locations: DONE(2008/04/24)
      http://www.evchargermaps.com/XMLs/sitesxml.xml
      http://maps.google.com/maps/ms?ie=UTF8&hl=en&oe=UTF8&msa=0&msid=106101835885297831085.00044b128b91711066112&output=kml
    Dynamic load Marker data onclick: DONE(2008/04/24)
      http://gmaps-utility-library.googlecode.com/svn/trunk/extinfowindow/release/examples/ajaxContent.html
    Save data to server DB: DONE(2008/04/23)
      http://maps.forum.nu/gm_markers_from_db.php
      http://www.developer.com/db/article.php/3649136
    Cookie to save last StreetView marker: DONE(2008/04/19)
      http://econym.googlepages.com/example_cookies.htm