from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
import json

User = get_user_model()

class BidConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.user = None
        self.bid_group = None

    async def disconnect(self, close_code):
        if self.bid_group:
            await self.channel_layer.group_discard(
                self.bid_group,
                self.channel_name
            )

    async def receive_json(self, content):
        message_type = content.get('type')

        if message_type == 'authenticate':
            token = content.get('token')
            if token:
                try:
                    # Validate token and get user
                    access_token = AccessToken(token)
                    user_id = access_token.payload.get('user_id')
                    self.user = await self.get_user(user_id)
                    
                    if self.user and self.user.is_authenticated:
                        # Join the bids group
                        self.bid_group = 'bids'
                        await self.channel_layer.group_add(
                            self.bid_group,
                            self.channel_name
                        )
                        await self.send_json({
                            'type': 'authentication_successful',
                            'message': 'Successfully authenticated'
                        })
                    else:
                        await self.send_json({
                            'type': 'authentication_failed',
                            'message': 'Invalid user'
                        })
                except TokenError:
                    await self.send_json({
                        'type': 'authentication_failed',
                        'message': 'Invalid token'
                    })
            else:
                await self.send_json({
                    'type': 'authentication_failed',
                    'message': 'No token provided'
                })

        elif message_type == 'subscribe_bids':
            if not self.user:
                await self.send_json({
                    'type': 'error',
                    'message': 'Authentication required'
                })
                return

            # Already handled in authentication
            await self.send_json({
                'type': 'subscription_successful',
                'message': 'Successfully subscribed to bid updates'
            })

    async def bid_update(self, event):
        """
        Handler for bid update messages from the channel layer
        """
        if self.user and self.bid_group:
            await self.send_json({
                'type': 'bid_update',
                'loan_id': event['loan_id'],
                'new_lowest_apr': event['new_lowest_apr'],
                'current_bid_count': event['current_bid_count'],
                'current_leader': event['current_leader']
            })

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None 