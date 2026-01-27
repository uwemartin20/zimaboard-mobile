import Constants from "expo-constants";
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] =
    useState<string | null>(null);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldSetBadge: false,
      }),
    });

    (async () => {
      if (!Device.isDevice) return;

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      setExpoPushToken(token);
    })();
  }, []);

  return { expoPushToken };
}
