# !/usr/bin/env python

__author__ = 'Paul Peavyhouse'

import os
import logging

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
  
    logging.info('RPC: "%s", %r' % (func_name, repr(args)))
  
    if not func_name or func_name[0] == '_':
      self.error(403) # access denied
      return

    func = getattr(self._methods, func_name, None)   
    if not func:
      self.error(404) # file not found
      return
    
    result = func(*args)
    
    response = simplejson.dumps(result, skipkeys=True, separators=(',',':'))
        
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
  pass

class User(db.Model):
  """TODO(pv): A list of users that have...logged in?...created?...?"""
  pass

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
  phone = db.PhoneNumberProperty()
  email = db.EmailProperty()
  URL = db.LinkProperty()
  IM = db.IMProperty()

  #types = db.ListProperty() choices=set(["cat", "dog", "bird"]
  #db.BlobProperty() # images, etc
  #db.ListProperty() # images, history, ...
  # ReferenceProperty?
  
  contactUser = db.UserProperty()
  contactAddress = db.PostalAddressProperty()
  contactPhone = db.PhoneNumberProperty()
  contactEmail = db.EmailProperty()
  contactURL = db.LinkProperty()
  contactIM = db.IMProperty()

# TODO(pv) batchAdd, batchDelete
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
    return user and site.contactUser == user
  
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

  def get_url(self, url):
    """
    requires:user == admin
    """
    if not self._is_admin():
      raise self.AccessDenied
    
    url = str(url)
    response = None
    #logging.info('fetching "%s"' % url)
    from google.appengine.api import urlfetch
    response = urlfetch.fetch(url)
    response = dict(
        content=response.content,
        content_was_truncated=response.content_was_truncated,
        headers=response.headers,
        status_code=response.status_code,
      )
    #logging.info('got:%r' % repr(response))
    return response

  def add_site(self, name, latlng, props=None):
    """
    requires:user
    """
    user = users.get_current_user()
    if not user:
      raise self.AccessDenied
    
    site = Site(
      name=name,
      latlng=self._to_latlng(latlng),
      userCreator=user,
      )
    site.put()
    
    return self.update_site(site.key().id(), props)

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
      for key in site.properties().iterkeys():
        if key[0] != '_' and key in props.keys():
          value = props[key]
          if isinstance(value, basestring):
            value = value.strip('\n ,')
          attr = getattr(site, key)
          if isinstance(attr, db.GeoPt):
            value=self._to_latlng(value)
          logging.debug('Setting site.%s=%s' % (key, repr(value)))
          setattr(site, key, value)
      site.put()
    
    return self._get_site_id_and_properties(site)
    
  def get_sites(self):
    """
    requires:anonymous or user
    """

    # limit output to only these values
    columns = ['id','name','latlng','userCreator','contactUser',]#types
    
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
  
  def obliterate_site(self, id):
    """
    requires:user == admin
    """
    if not self._is_admin():
      raise self.AccessDenied
    
    id = int(id)
    site = Site.get_by_id(id)
    if not site:
      raise self.NotFound
    
    site.delete()
    
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

