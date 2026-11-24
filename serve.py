import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os

os.chdir(r"c:\Users\m\Documents\appsafe")

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format%args))

server = ThreadingHTTPServer(("127.0.0.1", 8088), QuietHandler)
print("Serving on http://localhost:8088 ...", flush=True)
server.serve_forever()
