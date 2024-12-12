from django.urls import path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

from notifications.consumers import NotificationConsumer
from loans.consumers import BidConsumer

application = ProtocolTypeRouter({
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter([
                path('ws/notifications/', NotificationConsumer.as_asgi()),
                path('ws/bids/', BidConsumer.as_asgi()),
            ])
        )
    ),
}) 