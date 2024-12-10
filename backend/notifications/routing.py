from django.urls import re_path
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
    re_path(r'^api/ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
] 