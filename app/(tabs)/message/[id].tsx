import { getUser } from "@/api/auth";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/api/client";
import NewMessage from "@/components/NewMessage";
import UserCircle from "@/components/UserCircle";
import { Message } from "@/types/message";
import { timeAgo } from "@/utils/timeAgo";
import React from "react";

export default function MessageDetail() {

    <Stack.Screen
        options={{
            title: `Nachricht Detail`,
        }}
    />
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [message, setMessage] = useState<Message | null>(null);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [editModal, setEditModal] = useState(false);

    const scrollRef = useRef<ScrollView>(null);

    const [assignee, setAssignee] = useState<number | null>(null);

    const [user, setUser] = useState<any>(null);
    const [assignedToMe, setAssignedToMe] = useState<boolean>(false);

    const fetchMessage = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/messages/${id}`);
            setMessage(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessage();
    }, [id]);

    // Fetch current user once
    useEffect(() => {
            const fetchUser = async () => {
                const u = await getUser();
                if (u?.id) {
                setUser(u);
                // Initialize toggle based on message.assignee
                setAssignedToMe(message?.assignee?.id === u.id);
                }
            };
            fetchUser();
    }, [message?.assignee?.id]);

    // Update assignee when message loads
    useEffect(() => {
    if (message?.assignee?.id) {
        setAssignee(message.assignee.id);
    } else {
        setAssignee(null);
    }
    }, [message]);

    // Keep assignedToMe toggle in sync
    useEffect(() => {
        if (user) {
            setAssignedToMe(assignee === user.id);
        }
    }, [assignee, user]);

    // Toggle handler
    const onAssignToMeToggle = async (value: boolean) => {
        if (!user || !message) return;

        setAssignedToMe(value);
        try {
            await api.put(`/messages/${message.id}/assign-to-me`, {
            assigned_to: value ? user.id : null,
            });
            setAssignee(value ? user.id : null);
        } catch (err) {
            console.error("Assign failed:", err);
            setAssignedToMe(!value); // revert if API fails
        }
    };

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [message?.chat_messages]);

    if (!message) { 
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        )
    };

    const priorityBg =
        message.priority === "Hoch"
            ? "#fee2e2"
            : message.priority === "Mittel"
            ? "#fef3c7"
            : "#dbeafe";

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setLoading(true);
        try {
            const res = await api.post(`/messages/${message?.id}/comments`, {
                text: newComment,
            });

            setMessage(prev =>
                prev
                ? { ...prev, chat_messages: [...prev.chat_messages, res.data.data] }
                : prev
            );

            setNewComment("");
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleMessageSaved = (updated: Message) => {
        setMessage(updated);
    };  

    const handleArchiveToggle = async (value: boolean) => {
        try {
            await api.put(`/messages/${message?.id}`, { is_archived: value });
            setMessage(prev => (prev ? { ...prev, is_archived: value } : prev));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    if (!message) {
        return <Text>Nachricht nicht gefunden</Text>;
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="close" size={28} />
                </TouchableOpacity>

                <View style={styles.archiveRow}>
                <Ionicons name="trash-outline" size={20} />
                <Switch
                    value={message.is_archived}
                    onValueChange={handleArchiveToggle}
                />
                </View>
            </View>

            {/* Title */}
            <View style={styles.titleRow}>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: message.status.color },
                    ]}
                >
                    <Text style={styles.statusText}>{message.status.name}</Text>
                </View>

                <Text style={styles.title}>{message.title}</Text>

                <TouchableOpacity onPress={() => setEditModal(true)}>
                    <Ionicons name="create-outline" size={22} />
                </TouchableOpacity>
            </View>

            {editModal && (
                <NewMessage
                    mode="edit"
                    visible={editModal}
                    onSaved={handleMessageSaved}
                    onClose={() => setEditModal(false)}
                    message={message}        />
            )}

            {/* Description */}
            <View style={[styles.card, { backgroundColor: priorityBg }]}>
                <Text>{message.description}</Text>
            </View>

            {/* Attachments */}
            {message.attachments.length > 0 && (
                <View style={styles.section}>
                <Text style={styles.sectionTitle}>Anhänge</Text>
                {message.attachments.map(att => (
                    <TouchableOpacity
                    key={att.id}
                    onPress={() => Linking.openURL(att.url)}
                    >
                    <Text style={styles.link}>
                        {att.original_name} ({Math.round(att.size / 1024)} KB)
                    </Text>
                    </TouchableOpacity>
                ))}
                </View>
            )}

            <View style={styles.container}>
                <Text style={styles.label}>Mir Zuweisen</Text>
                <Switch
                    value={assignedToMe}
                    onValueChange={onAssignToMeToggle}
                    trackColor={{ false: "#d1d5db", true: "#2563eb" }}
                    thumbColor="#fff"
                />
            </View>

            {/* Comments */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Kommentare</Text>

                <ScrollView 
                    ref={scrollRef} 
                    style={styles.commentsBox}
                    contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
                    onContentSizeChange={() =>
                        scrollRef.current?.scrollToEnd({ animated: true })
                    }
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                >
                {message.chat_messages.map(c => {
                    const isMine = c.user.id === user?.id;
                    return (
                        <View
                            key={c.id}
                            style={[
                                styles.messageRow,
                                isMine ? styles.rowRight : styles.rowLeft,
                            ]}
                            >
                            <View
                                style={[
                                styles.bubble,
                                isMine ? styles.bubbleMine : styles.bubbleOther,
                                ]}
                            >
                                {/* Header */}
                                <View style={styles.bubbleHeader}>
                                <Text style={styles.author}>
                                    {isMine ? "Du" : c.user.name}
                                </Text>
                                <Text
                                    style={[
                                    styles.time,
                                    isMine ? styles.timeMine : styles.timeOther,
                                    ]}
                                >
                                    {timeAgo(c.created_at)}
                                </Text>
                                </View>

                                {/* Message */}
                                <Text style={styles.messageText}>{c.content}</Text>
                            </View>
                        </View>
                    );
                })}
                </ScrollView>

                <View style={styles.commentInput}>
                <TextInput
                    placeholder="Kommentar schreiben..."
                    value={newComment}
                    onChangeText={setNewComment}
                    style={styles.input}
                />
                <TouchableOpacity onPress={handleAddComment} style={[loading && { opacity: 0.7 }]} disabled={loading}>
                    <Ionicons name="send" size={24} color="#2563eb" />
                </TouchableOpacity>
                </View>
            </View>

            {/* Activities */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Aktivitäten</Text>
                <ScrollView
                    style={{ maxHeight: 240 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                >
                    {message.activities.map(a => (
                    <View key={a.id} style={styles.activity}>
                        <Ionicons name="time-outline" size={16} />
                        <Text style={styles.activityText}>
                        {a.user.name} {a.action} {a.assignee?.name || ""}
                        </Text>
                        <Text style={styles.time}>{timeAgo(a.created_at)}</Text>
                    </View>
                    ))}
                </ScrollView>
            </View>

            {/* Creator, Receiver & Subscribers */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Verantwortlicher</Text>

                {/* Creator → Receiver */}
                <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 8 }}>
                    
                    {/* Creator */}
                    <UserCircle user={message.creator} color="#2563eb" />  

                    {/* Arrow / Sent To */}
                    <Text style={{ marginHorizontal: 8, color: "#9ca3af", fontSize: 16 }}>→</Text>

                    {/* Receiver (Assignee) */}
                    {message.assignee ? (
                    <UserCircle user={message.assignee} color="#dc2626" />
                    ) : (
                    <Text style={{ fontSize: 12, fontStyle: "italic", color: "#9ca3af" }}>NA</Text>
                    )}
                </View>

                {/* Subscribers */}
                {message.assignees?.length > 0 && (
                    <>
                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Abonnenten</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4, }}>
                        {message.assignees.map(u => (
                        <UserCircle
                            key={u.id}
                            user={u}
                            color="#4b5563"
                            size="sm"
                        />
                        ))}
                    </ScrollView>
                    </>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
  
    archiveRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        flexWrap: "wrap",
    },
  
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
  
    statusText: { color: "#fff", fontSize: 12 },
    title: { fontSize: 18, fontWeight: "600", flex: 1 },
  
    card: {
        backgroundColor: "#f1f5f9",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
  
    section: { marginBottom: 16 },
    sectionTitle: { fontWeight: "600", marginBottom: 8 },
  
    link: { color: "#2563eb", marginBottom: 4 },
  
    commentsBox: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        padding: 8,
        maxHeight: 260,
    },

    messageRow: {
        flexDirection: "row",
    },
    rowLeft: {
        justifyContent: "flex-start",
    },
    rowRight: {
        justifyContent: "flex-end",
    },

    bubble: {
        maxWidth: "80%",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    bubbleMine: {
        backgroundColor: "#8ea2ce",
        color: "#ffffff",
    },
    bubbleOther: {
        backgroundColor: "#e5e7eb",
        color: "#000000",
    },

    bubbleHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 2,
    },
    author: {
        fontSize: 11,
        fontWeight: "500",
    },

    messageText: {
        fontSize: 13,
        lineHeight: 16,
    },

    timeMine: {
        color: "#2c425e",
    },
    timeOther: {
        color: "#575d68",
    },    
  
    comment: { marginBottom: 8 },
    commentAuthor: { fontWeight: "600" },
    time: { fontSize: 10, color: "#6b7280" },
  
    commentInput: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
  
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 8,
        padding: 8,
    },
  
    activity: { marginBottom: 8 },
    activityText: { fontSize: 13 },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#374151",
      },
  });
  
