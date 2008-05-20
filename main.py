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
DEBUG = True

class MainPage(webapp.RequestHandler):
  
  def get(self):
    current_user = users.get_current_user()

    user_list = {}
#    query = datastore.Query('User')
#    for user in query.Get(100):
#      user_list[user['user'].email()] = user['user']
    
#    if current_user:
#      user_list[current_user.email()] = current_user

    request = self.request
    hostname = request.host.split(':')[0]
    uri = request.uri
            
    url_admin = None

    if current_user:
      url_auth = users.create_logout_url(uri)
      if users.is_current_user_admin():
        if hostname == PRODUCTION_HOST:
          url_admin = 'http://appengine.google.com/dashboard?app_id='+APP_NAME
        else:
          url_admin = '/_ah/admin/'
    else:
      url_auth = users.create_login_url(uri)

    template_values = {
      'api_key': API_KEYS.get(hostname,''),
      'user_list': user_list.values(),
      'current_user': current_user,
      'url_auth': url_auth,
      'url_admin': url_admin,
    }
    path = os.path.join(os.path.dirname(__file__), "index.html")
    self.response.out.write(template.render(path, template_values))


def main():
  app = webapp.WSGIApplication([('/', MainPage)], debug=DEBUG)
  util.run_wsgi_app(app)

if __name__ == '__main__':
  main()

