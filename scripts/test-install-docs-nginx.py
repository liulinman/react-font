import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('installer', Path(__file__).with_name('install-docs-nginx.py'))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)

HTTP = '''    server {
        listen 80;
        location ^~ /.well-known/acme-challenge/ { root /var/www/acme; }
        location / { return 308 https://$host$request_uri; }
    }
'''
HTTPS = '''    server {
        listen 443 ssl;
        ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
        root /usr/share/nginx/html;
        location ^~ /api/ { proxy_pass http://backend:3000; }
        location = /englishWorld/admin { return 301 /admin/; }
        location / { try_files $uri $uri/ /index.html; }
    }
'''
class MergeTests(unittest.TestCase):
    def test_two_vhosts_preserve_tls_acme_proxy_and_redirect(self):
        source = 'http {\n' + HTTP + HTTPS + '}\n'
        result = installer.merge(source)
        self.assertEqual(result.replace(installer.block('        '), ''), source)
        self.assertEqual(result.count('location ^~ /docs/'), 1)
        self.assertIn('try_files $uri $uri.html $uri/ =404;', result)
        self.assertIn('error_page 404 /docs/404.html;', result)
    def test_idempotent_and_updates_managed_block(self):
        once = installer.merge(HTTPS)
        self.assertEqual(installer.merge(once), once)
        obsolete = once.replace('try_files $uri $uri.html $uri/ =404;', 'try_files $uri =404;')
        self.assertEqual(installer.merge(obsolete), once)
    def test_unknown_layout_rejected(self):
        for source in ('http {}', HTTPS.replace('/usr/share/nginx/html', '/other'), HTTPS + HTTPS,
                       HTTPS.replace('/englishWorld/admin', '/unknown'),
                       HTTPS + 'location /docs/ {}\n', HTTPS + installer.BEGIN,
                       'server { root /usr/share/nginx/html; }\nserver {\nlocation = /englishWorld/admin {}\n}'):
            with self.subTest(source=source):
                with self.assertRaises(ValueError): installer.merge(source)
    def test_repository_config_already_current(self):
        source = Path(__file__).parents[1].joinpath('nginx.conf').read_text()
        self.assertEqual(installer.merge(source), source)

if __name__ == '__main__': unittest.main()
