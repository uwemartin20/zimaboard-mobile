import { useEffect, useRef, useState } from "react";

import Constants from "expo-constants";
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from "expo-router";
import { Platform } from "react-native";



export interface PushNotificationState {
    expoPushToken: Notifications.ExpoPushToken | null;
    notification: Notifications.Notification | null;
}

export const usePushNotifications = (): PushNotificationState => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound: true,
            shouldShowSound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    const [expoPushToken, setExpoPushToken] = useState<
        Notifications.ExpoPushToken | null
    >(null);
    const [notification, setNotification] = useState<
        Notifications.Notification | null
    >(null);

    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    async function registerForPushNotificationsAsync() {
        let token;
        if(Device.isDevice) {
            const { status: existingStatus } =
                await Notifications.getPermissionsAsync();

            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } =
                    await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                throw new Error('Permission denied');
            }

            token = (await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId,
            }));

            if(Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                });
            }

            return token;

        } else {
            throw new Error('Must use physical device');
        }
    }

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            setExpoPushToken(token);
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;

            // IMPORTANT: delay until router is ready
            setTimeout(() => {
                if (data.type === 'chat' && data.messageId) {
                    router.push(`/message/${data.messageId}`);
                }
            }, 500);
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }

            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return {
        expoPushToken,
        notification,
    };
}
