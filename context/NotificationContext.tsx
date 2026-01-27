import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

export interface Notification {
  id: number;
  message_id: number;
  message: string;
  read: boolean;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notif: Notification) => void;
  markAllAsRead: () => void;
  markAsRead: (id: number) => void;
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from AsyncStorage
  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem("notifications");
      if (saved) setNotifications(JSON.parse(saved));

      const res = await api.get("/notifications");
      const data = res.data.data.map((n: any) => ({
        id: n.recipient_id,
        message_id: n.notification.message.id,
        message: n.notification.title || n.notification.body,
        read: !!n.read_at,
        timestamp: new Date(n.notification.created_at).getTime(),
      }));

      setNotifications(data);
    };

    load();
  }, []);

  // Save notifications on change
  useEffect(() => {
    AsyncStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = React.useCallback((notif: Notification) => {
    setNotifications(prev => {
      const exists = prev.some(n => n.id === notif.id);
      if (exists) return prev;
      return [notif, ...prev];
    });
  }, []);

  const markAsRead = async (id: number) => {
    await api.post(`/notifications/${id}/read`);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    await api.post("/notifications/read-all");
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = async (id: number) => {
    await api.delete(`/notifications/${id}`);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAllAsRead, markAsRead, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
