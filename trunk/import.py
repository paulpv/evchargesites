# !/usr/bin/env python

__author__ = 'Paul Peavyhouse'

import os

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import util

class ImportPage(webapp.RequestHandler):
  
  def get(self):
    ff2up = False
    ua = self.request.headers['User-Agent'].lower()
    ff = ua.find('firefox')
    if ff != -1:
      browser, version = ua[ff:].split('/',2)
      ff2up = (browser == 'firefox' and int(version.split('.',1)[0]) >= 2)
       
    if ff2up:
      template_values = {}
      path = os.path.join(os.path.dirname(__file__), "import.html")
      self.response.out.write(template.render(path, template_values))
    else:
      self.response.out.write('<p>'
          'Sorry, this page is only accessible from Firefox 2.x and above.'
          '</p>')
    

def main():
  app = webapp.WSGIApplication([
    ('/import[/]?', ImportPage),
    ], debug=True)
  util.run_wsgi_app(app)

if __name__ == '__main__':
  main()

