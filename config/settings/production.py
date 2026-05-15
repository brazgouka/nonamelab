from .base import *  # noqa

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

CSRF_TRUSTED_ORIGINS = [
    f'https://{host}' for host in ALLOWED_HOSTS
    if host not in ('localhost', '127.0.0.1', '')
]
