# !/usr/bin/env python

__author__ = 'Paul Peavyhouse'

import os

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import util

class ImportPage(webapp.RequestHandler):
  
  def get(self):
    template_values = {}
    path = os.path.join(os.path.dirname(__file__), "import.html")
    self.response.out.write(template.render(path, template_values))

def main():
  app = webapp.WSGIApplication([
    ('/import[/]?', ImportPage),
    ], debug=True)
  util.run_wsgi_app(app)

if __name__ == '__main__':
  main()

