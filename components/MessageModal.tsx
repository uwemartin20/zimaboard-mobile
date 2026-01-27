import { getUser } from "@/api/auth";
import { initPusher } from "@/api/pusherClient";
import { Message } from '@/types/message';
import React, { useEffect, useRef, useState } from "react";
import {
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import Ionicons from "react-native-vector-icons/Ionicons";
import api from "../api/client";
import { timeAgo } from "../utils/timeAgo"; // make sure this works for RN
import NewMessage from "./NewMessage";
import UserCircle from "./UserCircle";

type Comment = {
    id: number;
    user: { id: number; name: string };
    content: string;
    created_at: string;
};

type Props = {
    message: Message;
    onClose: () => void;
    onArchiveToggle: (archived: boolean) => void;
    onAddComment: (text: string) => Promise<Comment> | Comment;
};

export default function MessageModal({ message, onClose, onArchiveToggle, onAddComment }: Props) {
    const [chatMessages, setChatMessages] = useState<Comment[]>(message.chat_messages || []);
    const [newComment, setNewComment] = useState("");
    const [assignee, setAssignee] = useState<number | null>(message.assignee?.id ?? null);
    const [loading, setLoading] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

    const scrollRef = useRef<ScrollView>(null);

    const [user, setUser] = useState<any>(null);
    const [assignedToMe, setAssignedToMe] = useState<boolean>(false);
        
    // Fetch current user once
    useEffect(() => {
        const fetchUser = async () => {
            const u = await getUser();
            if (u?.id) {
            setUser(u);
            // Initialize toggle based on message.assignee
            setAssignedToMe(message.assignee?.id === u.id);
            }
        };
        fetchUser();
    }, [message.assignee?.id]);

    // Keep toggle in sync if assignee changes
    useEffect(() => {
        if (user) {
            setAssignedToMe(assignee === user.id);
        }
    }, [assignee, user]);
      
    const onAssignToMeToggle = async (value: boolean) => {
        if (!user) return;
            setAssignedToMe(value);
      
        try {
            await api.put(`/messages/${message.id}/assign-to-me`, {
              assigned_to: value ? user.id : null,
            });
      
            // Update assignee locally
            setAssignee(value ? user.id : null);
        } catch (error) {
            console.error("Assign failed:", error);
            // Revert toggle if API fails
            setAssignedToMe(!value);
        }
    };

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [chatMessages]);

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
            const res = await onAddComment(newComment);
            setChatMessages((prev) => [...prev, res]);
            setNewComment("");
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

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
        if (!userId) return;
    
        // handle incoming Pusher events
        const handlePusherEvent = (data: any) => {

            setChatMessages(prev => {
                if (!prev) return prev;
                // prevent duplicates (VERY IMPORTANT)
                if (prev.some(c => c.id === data.chat.id)) {
                    return prev;
                }
                return [...prev, data.chat];
            });

            scrollRef.current?.scrollToEnd({ animated: true });
        };

        initPusher(userId, handlePusherEvent);
  
    }, [userId]);

    return (
        <Modal visible transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                        <Text style={{ backgroundColor: message.status.color, color: "#fff", paddingHorizontal: 4, borderRadius: 4 }}>
                            {message.status.name}
                        </Text>{" "}
                        {message.title}
                            <TouchableOpacity onPress={() => setEditModal(true)}>
                                <Ionicons name="create-outline" size={22} />
                            </TouchableOpacity>
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                        <Icon name="times" size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {editModal && (
                        <NewMessage
                            mode="edit"
                            visible={editModal}
                            onClose={() => setEditModal(false)}
                            message={message}        
                        />
                    )}

                    <ScrollView style={styles.content}>
                    
                        {/* Description */}
                        <View style={[styles.section, { backgroundColor: priorityBg, padding: 12 }]}>
                            <Text>{message.description}</Text>
                        </View>

                        {/* Attachments */}
                        {message.attachments?.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Anhänge</Text>
                                {message.attachments.map((att) => (
                                <TouchableOpacity key={att.id} onPress={() => Linking.openURL(att.url)}>
                                    <Text style={{ color: "#2563eb", marginVertical: 2 }}>
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
                                style={{ maxHeight: 200 }}
                                contentContainerStyle={{ gap: 6 }}
                                onContentSizeChange={() =>
                                    scrollRef.current?.scrollToEnd({ animated: true })
                                }
                                nestedScrollEnabled
                                showsVerticalScrollIndicator
                            >
                                {chatMessages.map((c) => {
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

                            {/* Add new comment */}
                            <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
                                <TextInput
                                style={styles.input}
                                value={newComment}
                                onChangeText={setNewComment}
                                placeholder="Kommentar hinzufügen..."
                                />
                                <TouchableOpacity onPress={handleAddComment} style={[styles.button, loading && { opacity: 0.7 }]} disabled={loading}>
                                    <Ionicons name="send" size={24} color="#2563eb" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Activities */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Aktivitäten</Text>
                            <ScrollView
                                style={{ maxHeight: 200 }}
                                nestedScrollEnabled
                                showsVerticalScrollIndicator
                            >
                                {message.activities?.map((a) => (
                                    <View key={a.id} style={{ flexDirection: "row", marginBottom: 4 }}>
                                    <Icon name="history" size={14} color="#9ca3af" style={{ marginRight: 4, marginTop: 2 }} />
                                    <View>
                                        <Text style={{ fontWeight: "bold" }}>
                                        {a.user.name} <Text style={{ color: "#374151" }}>{a.action}</Text> {a.assignee?.name || ""}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: "#9ca3af" }}>{timeAgo(a.created_at)}</Text>
                                    </View>
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
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
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

                        {/* Archive Toggle */}
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                            <Icon name="trash" size={16} color="#374151" />
                            <TouchableOpacity
                                onPress={() => onArchiveToggle(!message.is_archived)}
                                style={{
                                marginLeft: 8,
                                width: 50,
                                height: 25,
                                borderRadius: 15,
                                backgroundColor: message.is_archived ? "#2563eb" : "#d1d5db",
                                justifyContent: "center",
                                }}
                            >
                                <View
                                style={{
                                    width: 21,
                                    height: 21,
                                    borderRadius: 10.5,
                                    backgroundColor: "#fff",
                                    marginLeft: message.is_archived ? 25 : 2,
                                }}
                                />
                            </TouchableOpacity>
                            <Text style={{ marginLeft: 8 }}>{message.is_archived ? "Archiviert" : "Nicht archiviert"}</Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
    modalContainer: { backgroundColor: "#fff", borderRadius: 12, maxHeight: "90%", padding: 12 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    title: { fontWeight: "bold", fontSize: 16, flex: 1 },
    content: { marginTop: 8 },
    section: { marginBottom: 12 },
    sectionTitle: { fontWeight: "bold", marginBottom: 4 },
    input: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, paddingHorizontal: 8, height: 36 },
    button: { padding: 5},
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8, // React Native >=0.71 supports gap
        marginVertical: 6,
      },
      label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#374151",
      },

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
});
