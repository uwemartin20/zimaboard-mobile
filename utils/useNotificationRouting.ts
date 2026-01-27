import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

export function useNotificationRouting() {

  // Background / foreground taps
  useEffect(() => {
    const sub =
      Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;

        if (data?.type === 'chat' && data.messageId) {
          setTimeout(() => {
            router.push(`/message/${data.messageId}`);
          }, 500);
        }
      });

    return () => sub.remove();
  }, []);

  // Cold start (app killed)
  useEffect(() => {
    (async () => {
      const response =
        await Notifications.getLastNotificationResponseAsync();

      if (!response) return;

      const data = response.notification.request.content.data;

      if (data?.type === 'chat' && data.messageId) {
        setTimeout(() => {
          router.push(`/message/${data.messageId}`);
        }, 500);
      }
    })();
  }, []);
}
