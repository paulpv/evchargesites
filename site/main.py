# !/usr/bin/env python

__author__ = 'Paul Peavyhouse'

import os

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import util

APP_NAME = 'evchargesites'
PRODUCTION_HOST = APP_NAME+'.appspot.com'
API_KEYS = {
  PRODUCTION_HOST:'ABQIAAAA0lf9s5m2g3l_sMAsMUUB8xTyUT6dGzLdyJgY2_mzDYVTRC9sZRS1BLU0Ax4y6N-QPqCHTAX0W5k2hw',
  'localhost':'ABQIAAAA0lf9s5m2g3l_sMAsMUUB8xT2yXp_ZAY8_ufC3CFXhHIE1NvwkxTCcubIT5_F9VQlYSX6guPKOiC6dA',
  '127.0.0.1':'ABQIAAAA0lf9s5m2g3l_sMAsMUUB8xRi_j0U6kJrkFvY4-OX2XYmEAa76BTDvoB_Rt6S6xEivow6nooxId20Fw',
  }
DEBUG_CLIENT = False
  

class MainPage(webapp.RequestHandler):
  
  def hostname(self):
    return self.request.host.split(':')[0]
  
  def api_key(self):
    return API_KEYS.get(self.hostname(),'')

  def is_production(self):
    return self.hostname() == PRODUCTION_HOST
  
  def url_admin(self):
    url_admin = None
    if users.is_current_user_admin():
      if self.is_production():
        url_admin = 'http://appengine.google.com/dashboard?app_id='+APP_NAME
      else:
        url_admin = '/_ah/admin/'
    return url_admin  
  
  def url_auth(self):
    url_auth = None
    uri = self.request.uri
    if users.get_current_user():
      url_auth = users.create_logout_url(uri)
    else:
      url_auth = users.create_login_url(uri)
    return url_auth
  
  def current_user(self):
    current_user = users.get_current_user()
    if current_user:
      current_user = dict(
        nickname=current_user.nickname(),
        email=current_user.email(),
        )
    return current_user    
  
  def get(self):

    request = self.request
    api_key = self.api_key()
    current_user = self.current_user()
    debug_client = DEBUG_CLIENT or not self.is_production() # TODO(pv): or certain user(s)?
    url_admin = self.url_admin()
    url_auth = self.url_auth()

    user_list = {}
#    query = datastore.Query('User')
#    for user in query.Get(100):
#      user_list[user['user'].email()] = user['user']
#    if current_user:
#      user_list[current_user.email()] = current_user

    template_values = {
      'api_key': api_key,
      'current_user': current_user,
      'debug_client': debug_client,
      'user_list': user_list.values(),
      'url_auth': url_auth,
      'url_admin': url_admin,
    }
    path = os.path.join(os.path.dirname(__file__), "index.html")
    self.response.out.write(template.render(path, template_values))


def main():
  app = webapp.WSGIApplication([('/', MainPage)], debug=True)
  util.run_wsgi_app(app)

if __name__ == '__main__':
  main()

