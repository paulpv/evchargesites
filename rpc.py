# !/usr/bin/env python

__author__ = 'Paul Peavyhouse'

import os
import logging
import google.appengine.ext.db # Due to some bug w/ Model.gql?...

from datetime import datetime
from django.utils import simplejson
from google.appengine.ext import db
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util


class RPCHandler(webapp.RequestHandler):

  def __init__(self):
    webapp.RequestHandler.__init__(self)
    self._methods = RPCMethods(self)
  
  def handle_exception(self, exception, debug_mode):
    if debug_mode:
      webapp.RequestHandler.handle_exception(self, exception, debug_mode)
    else:
      self.error(500)
      self.response.out.write(exception)

  def _rpc(self, func_name, *args):
  
    logging.debug('RPC: %s(%s)' % (func_name,
                                  ','.join([repr(arg) for arg in args])))
  
    if not func_name or func_name[0] == '_':
      self.error(403) # access denied
      return

    func = getattr(self._methods, func_name, None)   
    if not func:
      self.error(404) # file not found
      return
    
    result = func(*args)
    #logging.debug('result=%r' % repr(result))
    response = simplejson.dumps(result, separators=(',',':'))
    self.response.out.write(response)
   
  def get(self):
    func_name = self.request.get('action')
    if not func_name:
      self.error(403)
      return
    
    args = ()
    while True:
      key = 'arg%d' % len(args)
      val = self.request.get(key)
      if val:
        args += (simplejson.loads(val),)
      else:
        break
    self._rpc(func_name, *args)

  def post(self):
    args = simplejson.loads(self.request.body)
    if not args:
      self.error(403)
      return
    func_name, args = args[0], args[1:]
    self._rpc(func_name, *args)


class Rating(db.Model):
  """TODO(pv): Aggregated user ratings per site"""
  user = db.UserProperty()
  rating = db.RatingProperty()

class User(db.Model):
  """TODO(pv): A list of users that have...logged in?...created?...?"""
  pass

class POV(db.Model):
  yaw = db.FloatProperty()
  pitch = db.FloatProperty()
  roll = db.FloatProperty()
  zoom = db.IntegerProperty()
  
ChargerAction = ['ok', 'new loc', 'down loc', 'prob loc', 'spi down', 'spi prob', 'unknown']
# TODO(pv): Last Confirmed By

NEMA_volts = {
              2:115,
              5:125,
              6:250,
              7:277,
              8:480,
              9:600,
              14:(125,250),
              15:250,
              #16,17,21,22,23,...
              }


class NEMA(db.Model):
  """A model representation of a typical NEMA outlet.
  http://www.nema.org/stds/wd6.cfm#download
    At end: "NEMA Configurations..."

  See also:
    http://en.wikipedia.org/wiki/NEMA_connector
      http://www.nooutage.com/nema_configurations.htm
      http://www.stayonline.com/reference-nema-straight-blade.aspx
      http://www.stayonline.com/reference-nema-locking.aspx
      http://www.powercabling.com/nema.htm
      http://www.powercabling.com/hubbell/hubbell.htm
      http://www.systemconnection.com/downloads/PDFs/power_cord_nema_mold_chart.pdf
  
  TODO(pv): Make this extensible for other configs (ex: European, Asian, etc...)
  """
  #voltage = db.IntegerProperty(required=True, choices=[120, 125, 208, 250, 277, 347, 480, 600])
  #amperage = db.IntegerProperty(required=True, choices=[15, 20, 30, 50, 60])
  #poles = db.IntegerProperty(choices)
  #wires = 
  #grounded = db.BooleanProperty(required=True)
  #phase = db.IntegerPropterty(choices=[1, 3])
  #socket = db.
  pass

# NOTE: Some items are intentionally *NOT* a dict, so as to maintain order
# TODO(pv): Localize these (and any other) strings?
class ChargerService:
  types=(
         ('spi','Small Paddle Inductive'),
         ('lpi','Large Paddle Inductive'),
         ('avcon','AVCon'),
         ('cond120','Conductive 110V-120V NEMA 5-15'),
         ('cond240','Conductive 208V-240V NEMA 14-50'),
         )
  conditions=('working','marginal','not working','unknown')
  breakers=('15A','20A','30A','40A','50A','60A','70A','80A','90A','100A','?')
  
  def get_type(self, key):
    key = key.lower()
    for type in types:
      if type[0] == key:
        return type[0]
  
  def get_descriptors(self):
    return dict(
        types=self.types,
        conditions=self.conditions,
        breakers=self.breakers,
      )


class Service(db.Model):
  type = db.StringProperty(choices=[type[0] for type in ChargerService.types])
  condition = db.StringProperty(choices=ChargerService.conditions)
  breaker = db.StringProperty(choices=ChargerService.breakers)
  breaker_accessible = db.BooleanProperty()
  #ground-fault?
  #arc-fault?
  #plug?


class Site(db.Model):
  
  # RPC private/protected properties: read-only for ALL
  _deleted = db.BooleanProperty(default=False)
  _dateCreated = db.DateTimeProperty(auto_now_add=True)
  _dateModified = db.DateTimeProperty(auto_now=True)
  _dateAccessed = db.DateTimeProperty()
  _userLastAccessed = db.UserProperty()
  _rating = db.RatingProperty()
  
  # RPC public properties: writable by creator/admin
  userCreator = db.UserProperty(required=True) # creator or admin may change creator
  name = db.StringProperty(required=True)
  latlng = db.GeoPtProperty(required=True)
  address = db.PostalAddressProperty()
  description = db.TextProperty()
  
  # From evchargermaps
  action = db.StringProperty(choices=ChargerAction)
  pay = db.BooleanProperty() # pay access only?
  restricted = db.BooleanProperty() # authorized access only?
  
  # List of Service entries in the DB 
  services = db.ListProperty(int) # List of key.id to Service entities
  #db.BlobProperty() # images, etc
  #db.ListProperty() # images, history, ...
  # ReferenceProperty?
  
  contactName = db.StringProperty()
  contactAddress = db.PostalAddressProperty()
  contactPhone = db.PhoneNumberProperty()
  contactEmail = db.EmailProperty()
  contactURL = db.LinkProperty()
  contactIM = db.IMProperty()


# TODO(pv) batchAdd, batchDelete
# TODO(pv): Do I need to protect Error and subclasses?
class RPCMethods:
  
  class Error(Exception):
    """Unspecified error in RPCMethods"""
  
  class AccessDenied(Error):
    """Access denied."""
  
  class NotFound(Error):
    """The requested item was not found."""
    
  def __init__(self, handler):
    self._handler = handler
#    self.addSite('testing', '0,0')

  def _ToJSON(self, value):
    if isinstance(value, users.User):
      value = dict(
        nickname=value.nickname(),
        email=value.email(),
        )
    else:
      try:
        value = unicode(value)
      except UnicodeError:
        value = repr(value)
    return value

  def _is_admin(self):
    return users.is_current_user_admin()
  
  def _is_creator(self, site, user=users.get_current_user()):
    return user and site.userCreator == user

  def _is_contact(self, site, user=users.get_current_user()):
    return (user and site.contactEmail and 
      site.contactEmail.lower() == user.email().lower())
  
  def _is_creator_admin_or_contact(self, site, user=users.get_current_user()):
    return (self._is_creator(site, user) or 
      self._is_admin() or
      self._is_contact(site, user)) 
  
  def _get_site_id_and_values(self, site, keys=None):
    """Returns list of values in a specific order (w/ id first)
    """
    # TODO(pv): combine logic w/ _get_site_id_and_properties
    if not keys:
      keys = site.properties().keys()
    elif 'id' in keys:
      keys.remove('id')
    
    values = [site.key().id()]
    for key in keys:
      value = getattr(site, key)
      if value is None:
        value = ""
      else:
        value = self._ToJSON(value)
      values.append(value)
      
    return values

  def _get_site_id_and_properties(self, site, keys=None):
    """Returns dict of values not in a specific order
    """
    # TODO(pv): combine logic w/ _get_site_id_and_values
    if not keys:
      keys = site.properties().keys()
    elif 'id' in keys:
      keys.remove('id')
    
    properties = {'id':site.key().id()}
    for key in keys:
      value = getattr(site, key)
      if value is None:
        value = ""
      else:
        value = self._ToJSON(value)
      properties[key] = value
    
    return properties
  
  def _to_latlng(self, val):
    latlng = val
    # TODO(pv): RegEx this for \((.*?)\)
    latlng=latlng[1:-1].split(',')
    latlng = db.GeoPt(float(latlng[0]),float(latlng[1]))
    return latlng
  
  def _to_bool(selfself, val):
    if isinstance(val, basestring):
      val = val.lower()
      if val in ('no', 'false', '0'):
        val = False
      elif val in ('yes', 'true', '1'):
        val = True
    else:
      val = bool(val)
    return val

  def get_url(self, url):
    """
    requires:user == admin
    """
    if not self._is_admin():
      raise self.AccessDenied
    
    if False: # Set to True to fake data (allows getting static [test] data when offline)
      url = str(url)
      response = None
      #logging.debug('fetching "%s"' % url)
      from google.appengine.api import urlfetch
      response = urlfetch.fetch(url)
      response = dict([(key, getattr(response, key)) for key in dir(response) if key[0] != '_'])
      del response['headers']
    else:
      import evchargermap
      response = dict(
          content=evchargermap.evchargermap,
          content_was_truncated=False,
          #headers=response.headers, # http://b/issue?id=1195299
          status_code=200,
        )
    #logging.debug('got %r' % repr(response))
    return response

  def get_service_descriptors(self):
    """
    requires:anonymous
    """
    return ChargerService().get_descriptors()

  def add_site(self, name, latlng, props=None, user=users.get_current_user()):
    """
    requires:user
    """
    if not user:
      raise self.AccessDenied
    
    site = Site(
      name=name,
      latlng=self._to_latlng(latlng),
      userCreator=user,
      contactName=user.nickname(),
      contactEmail=user.email(),
      )
    site.put()
    
    return self.update_site(site.key().id(), props)

  def add_sites(self, sites):
    """
    requires:user (checked in add_site)
    """
    user = users.get_current_user()
    for site in sites:
      self.add_site(site['name'], site['latlng'], site['props'], user)
    return len(sites)

  def update_site(self, id, props):
    """
    requires:user == creator, admin, or contact
    """
    id = int(id)
    site = Site.get_by_id(id)
    if not site:
      raise self.NotFound
    
    if not self._is_creator_admin_or_contact(site):
      raise self.AccessDenied
    
    if isinstance(props, dict):
      
      logging.debug('props = %r' % repr(props))
      
      # iterate through only existing non-underscored properties
      for property in site.properties().iterkeys():
        if property[0] == '_' or property not in props.keys():
          continue
        
        attr = getattr(site, property)

        value = props[property]

        # Massage data as needed to fit in to the Model(s) 
        
        if isinstance(value, basestring):
          value = value.strip('\n ,') # pv: Why did I do this?

        # TODO(pv): Can this be lambdaed?
        if isinstance(attr, db.GeoPt):
          value=self._to_latlng(value)
        elif isinstance(attr, bool):
          value=self._to_bool(value)
        elif property in ('action',):
          value=value.lower()
        #elif isinstance(attr, list/dict/type): # type...
        
        logging.debug('Setting site.%s=%s' % (property, repr(value)))
        setattr(site, property, value)
      site.put()
    
    return self._get_site_id_and_properties(site)
    
  def get_sites(self):
    """
    requires:anonymous or user
    """

    # limit output to only these values
    columns = ['id','name','latlng','userCreator','contactEmail',]#services?
    
    sites = Site.gql('WHERE _deleted = FALSE ORDER BY _dateCreated')
    
    rows = []
    for site in sites:
      row = self._get_site_id_and_values(site, columns[1:])
      rows.append(row)

    return dict(
      columns=columns,
      rows=rows,
      count=len(rows),
      )

  def get_site(self, id):
    """
    requires:anonmymous or user
    """
    id = int(id)
    site = Site.get_by_id(id)
    if not site:
      raise self.NotFound
    
    site._dateAccessed = datetime.utcnow()
    site._userLastAccessed = users.get_current_user()
    site.put()
    
    return self._get_site_id_and_properties(site)
  
  def delete_site(self, id):
    """
    requires:user == creator, admin, or contact
    """
    id = int(id)
    site = Site.get_by_id(id)
    if not site:
      raise self.NotFound
    
    if not self._is_creator_admin_or_contact(site):
      raise self.AccessDenied
    
    site._deleted = True
    site.put()
    
    return id
  
"""
  # below: old sample code
  def GetLocations(self, user_email=None):
    if user_email:
      user = users.User(user_email)
    else:
      user = users.get_current_user()
    query = datastore.Query('Location')
    if not user:
      return []
    query['user ='] = user
    locations = []
    for location in query.Get(100):
      # Add a few additional attributes so that they are available to
      # the remote user.
      location['user'] = location['user'].email()
      location['key'] = str(location.key())
      locations += [location]
    return locations
"""

def main():
  app = webapp.WSGIApplication([('/rpc', RPCHandler)], debug=True)
  util.run_wsgi_app(app)

if __name__ == '__main__':
  main()

