import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationBell() {
    const { notifications, markAllAsRead, markAsRead, removeNotification } = useNotifications();
    const unreadCount = notifications.filter(n => !n.read).length;
    const [open, setOpen] = useState(false);
    const navigation = useNavigation();

    return (
        <View>
        
            {/* Bell Icon */}
            <Pressable onPress={() => setOpen(prev => !prev)} style={{ marginRight: 16 }}>
                <FontAwesome5 name="bell" size={24} color="white" />
                {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
                )}
            </Pressable>

            {/* Modal / Dropdown */}
            <Modal visible={open} transparent animationType="fade">
                <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
                    <View style={styles.dropdown}>
                        <View style={styles.header}>
                            <Text style={styles.headerText}>Mitteilungen</Text>
                            <Pressable onPress={() => markAllAsRead()}>
                                <Text style={styles.markRead}>Alle als gelesen</Text>
                            </Pressable>
                        </View>
                        {notifications.length === 0 ? (
                            <Text style={styles.empty}>Keine Mitteilungen</Text>
                        ) : (
                            <FlatList
                                data={notifications}
                                keyExtractor={(item) => item.id.toString()}
                                style={{ maxHeight: 300 }}
                                renderItem={({ item }) => (
                                    <View style={[styles.item, !item.read && styles.unread]}>

                                    {/* Remove (X) Button */}
                                    <Pressable
                                      style={styles.removeButton}
                                      onPress={() => removeNotification(item.id)}
                                    >
                                      <Text style={styles.removeText}>✕</Text>
                                    </Pressable>
                      
                                    {/* Notification Body */}
                                    <Pressable
                                      onPress={() => {
                                        if (!item.read) {
                                          markAsRead(item.id);
                                        }
                                        router.push(`/message/${item.message_id}`);
                                        setOpen(false);
                                      }}
                                    >
                                        
                                        <Text>{item.message}</Text>
                                        <Text style={styles.timestamp}>
                                            {new Date(item.timestamp).toLocaleTimeString()}
                                        </Text>
                                    </Pressable>
                                </View>
                                )}
                            />
                        )}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: "red",
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
    dropdown: {
        position: "absolute",
        top: 50,
        right: 16,
        width: 250,
        backgroundColor: "white",
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    header: { flexDirection: "row", justifyContent: "space-between", padding: 8, borderBottomWidth: 1, borderColor: "#ddd" },
    headerText: { fontWeight: "bold" },
    markRead: { color: "blue" },
    empty: { padding: 12, color: "#555" },
    item: { padding: 12, borderBottomWidth: 1, borderColor: "#eee" },
    unread: { backgroundColor: "#e6f0ff" },
    timestamp: { fontSize: 10, color: "#888", marginTop: 2 },
    removeButton: {
        position: "absolute",
        top: 6,
        right: 6,
        zIndex: 10,
        padding: 4,
    },
    removeText: {
        fontSize: 14,
        color: "#9ca3af",
    },
});
