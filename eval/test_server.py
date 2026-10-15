import importlib.util
import json
import os
import threading
import unittest
import urllib.request
import urllib.error
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('tonic_server', Path(__file__).resolve().parents[1] / 'server.py')
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)

class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = s.ThreadingHTTPServer(('127.0.0.1', 0), s.Handler)
        cls.url = 'http://127.0.0.1:' + str(cls.server.server_port)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def request(self, path, data=None, origin=None, host=None):
        headers = {'Content-Type': 'application/json'}
        if origin: headers['Origin'] = origin
        if host: headers['Host'] = host
        req = urllib.request.Request(self.url + path, data=data, headers=headers)
        try:
            response = urllib.request.urlopen(req)
        except urllib.error.HTTPError as error:
            response = error
        result = response.status, response.read(), response.headers
        response.close()
        return result

    def test_static_page(self):
        code, body, headers = self.request('/')
        self.assertEqual(code, 200)
        self.assertIn(b'Tonic Task Assistant', body)
        self.assertIn("frame-ancestors 'none'", headers['Content-Security-Policy'])

    def test_hidden_files_denied(self):
        self.assertEqual(self.request('/.git/config')[0], 404)
        self.assertEqual(self.request('/server.py')[0], 404)

    def test_host_rebinding_denied(self):
        self.assertEqual(self.request('/', host='evil.example')[0], 403)

    def test_cross_origin_denied(self):
        self.assertEqual(self.request('/api/interpret', b'{"raw":"ligar"}', 'https://evil.example')[0], 403)

    @patch.dict(os.environ, {}, clear=True)
    def test_missing_key(self):
        self.assertEqual(json.loads(self.request('/api/status')[1]), {'available': False})
        self.assertEqual(self.request('/api/interpret', b'{"raw":"ligar"}', self.url)[0], 503)

    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-only'})
    def test_invalid_text(self):
        self.assertEqual(self.request('/api/interpret', b'{"raw":42}', self.url)[0], 400)
        self.assertEqual(self.request('/api/interpret', json.dumps({'raw':'x'*2001}).encode(), self.url)[0], 400)

    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-only'})
    @patch.object(s.urllib.request, 'urlopen')
    def test_provider_contract(self, mocked):
        # Use http.client for the local call so only the upstream provider is mocked.
        import http.client
        s.LAST_CALL = 0
        mocked.return_value.__enter__.return_value.read.return_value = json.dumps({'content':[{'type':'text','text':'{"title":"Ligar"}'}]}).encode()
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
        conn.request('POST', '/api/interpret', b'{"raw":"ligar"}', {'Origin':self.url,'Content-Type':'application/json'})
        response=conn.getresponse()
        self.assertEqual(response.status, 200)
        self.assertEqual(json.loads(response.read()), {'text':'{"title":"Ligar"}'})
        upstream=mocked.call_args.args[0]
        self.assertEqual(upstream.full_url, 'https://api.anthropic.com/v1/messages')
        self.assertNotIn(b'test-only', upstream.data)
        conn.close()

if __name__ == '__main__': unittest.main()
