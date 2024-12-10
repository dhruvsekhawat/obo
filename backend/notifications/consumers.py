import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

logger = logging.getLogger(__name__)
User = get_user_model()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Handle WebSocket connection."""
        logger.info("WebSocket connection attempt")
        self.user = None
        self.room_group_name = None
        await self.accept()
        logger.info("WebSocket connection accepted")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        logger.info(f"WebSocket disconnected with code: {close_code}")
        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle messages from WebSocket."""
        try:
            logger.info(f"Received WebSocket message: {text_data}")
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'authenticate':
                token = text_data_json.get('token')
                if token:
                    user = await self.get_user_from_token(token)
                    if user:
                        self.user = user
                        self.user_id = str(user.id)
                        self.room_group_name = f'notifications_{self.user_id}'
                        
                        # Add to notification group
                        await self.channel_layer.group_add(
                            self.room_group_name,
                            self.channel_name
                        )
                        
                        logger.info(f"User {user.id} authenticated successfully")
                        await self.send(text_data=json.dumps({
                            'type': 'authentication_successful'
                        }))
                        return
                    
                logger.warning("Authentication failed")
                await self.send(text_data=json.dumps({
                    'type': 'authentication_failed',
                    'message': 'Invalid token'
                }))
                await self.close()
                return

            if not self.user:
                logger.warning("Unauthenticated message received")
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Not authenticated'
                }))
                await self.close()
                return
            
            if message_type == 'mark_read':
                notification_id = text_data_json.get('notification_id')
                if notification_id:
                    success = await self.mark_notification_read(notification_id)
                    await self.send(text_data=json.dumps({
                        'type': 'mark_read_response',
                        'success': success,
                        'notification_id': notification_id
                    }))
            
            elif message_type == 'mark_all_read':
                await self.mark_all_notifications_read()
                await self.send(text_data=json.dumps({
                    'type': 'mark_all_read_response',
                    'success': True
                }))

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error in receive: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        """Validate JWT token and return user."""
        try:
            access_token = AccessToken(token)
            user = User.objects.get(id=access_token['user_id'])
            return user
        except (TokenError, User.DoesNotExist) as e:
            logger.error(f"Token validation error: {e}")
            return None

    async def notification_message(self, event):
        """Send notification to WebSocket."""
        try:
            message = event['message']
            await self.send(text_data=json.dumps({
                'type': 'notification',
                'notification': message
            }))
        except Exception as e:
            logger.error(f"Error in notification_message: {e}")

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark a notification as read."""
        from .models import Notification
        try:
            notification = Notification.objects.get(
                id=notification_id,
                user_id=self.user.id
            )
            notification.is_read = True
            notification.save()
            return True
        except Notification.DoesNotExist:
            logger.warning(f"Notification {notification_id} not found")
            return False
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            return False

    @database_sync_to_async
    def mark_all_notifications_read(self):
        """Delete all notifications for the user."""
        from .models import Notification
        try:
            # Delete all notifications for the user
            Notification.objects.filter(user_id=self.user.id).delete()
            return True
        except Exception as e:
            logger.error(f"Error clearing all notifications: {e}")
            return False 