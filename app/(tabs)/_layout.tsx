import { router, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getUser, isLoggedIn } from '@/api/auth';
// import { IconSymbol } from '@/components/ui/icon-symbol';
import { initPusher } from "@/api/pusherClient";
import NotificationBell from '@/components/NotificationBell';
import { TabIcon } from '@/components/TabIcon';
import { useNotifications } from '@/context/NotificationContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { View } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<number | null>(null);
  const { addNotification } = useNotifications();
  const colorScheme = useColorScheme();

  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        router.replace("/login");
      }
    };

    checkAuth();
  }, []);

  // Get user ID once
  useEffect(() => {
    const fetchUser = async () => {
      const user = await getUser();
      if (user?.id) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userId) return; // wait until we have userId

    initPusher(userId, (data) => {
      addNotification({
        id: data.id,
        message_id: data.message_id,
        message: data.message,
        read: false,
        timestamp: Date.now(),
      });
      // if ("title" in data) {
      //   addNotification(data.id, `Neue Nachricht von ${data.creator.name}: ${data.title}`);
      // } else if ("chat" in data) {
      //   addNotification(data.chat.message_id, `Neuer Kommentar von ${data.chat.user.name}: ${data.chat.content}`);
      // }
    });
  }, [userId, addNotification]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffd700',
        tabBarInactiveTintColor: '#ccc',
        headerStyle: { backgroundColor: '#25292e' },
        headerTintColor: '#fff',
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: '#25292e', height: 56 + insets.bottom, paddingBottom: insets.bottom, },
        tabBarLabelStyle: { fontSize: 12 },
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            <NotificationBell />
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <TabIcon name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="NewMessage"
        options={{
          title: 'Neue Nachricht',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="plus-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <FontAwesome5 name="user" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="created"
        options={{ title: 'Zugewiesene Nachrichten', href: null }}
      />
      <Tabs.Screen
        name="assigned"
        options={{ title: 'Meine Nachrichten', href: null }}
      />
      <Tabs.Screen
        name="announcement"
        options={{ title: 'Pin Wand', href: null }}
      />
      <Tabs.Screen
        name="message/[id]"
        options={{ title: 'Nachricht', href: null }}
      />

    </Tabs>
  );
}
