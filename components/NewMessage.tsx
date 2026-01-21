import { Message } from "@/types/message";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { getUser } from "../api/auth";
import api from "../api/client";

interface User {
    id: number;
    name: string;
    email: string;
    department: { id: number; name: string; color: string };
}

interface MessageStatus {
    id: number;
    name: string;
}

interface Attachment {
    uri: string;
    name: string;
    type?: string;
}

type MessageFormMode = "create" | "edit";

type NewMessageProps = {
    mode: MessageFormMode;
    visible: boolean;
    onSaved?: (message: Message) => void;
    onClose: () => void;
    message?: Message;
};

export default function NewMessage({ mode, visible, onSaved, onClose, message }: NewMessageProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<"Niedrig" | "Mittel" | "Hoch">("Mittel");
    const [statusId, setStatusId] = useState<number | "">("");
    const [users, setUsers] = useState<User[]>([]);
    const [assignees, setAssignees] = useState<number[]>([]);
    const [assignee, setAssignee] = useState<number | null>(null);
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [statuses, setStatuses] = useState<MessageStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        api.get("/message-statuses").then(res => setStatuses(res.data));
        api.get("/users").then(res => setUsers(res.data.users));
        getUser().then(user => setCurrentUser(user));
    }, []);

    useEffect(() => {
        if (mode === "edit" && message) {
        setTitle(message.title);
        setDescription(message.description);
        setPriority(message.priority);
        setStatusId(message.status_id);
        setAssignee(message.assignee?.id)
        setAssignees(message.assignees.map(a => a.id));
        setIsAnnouncement(message.is_announcement);
        }
    }, [mode, message]);

    const handlePickAttachment = async () => {
        const result = await DocumentPicker.getDocumentAsync({ 
            multiple: true,
            copyToCacheDirectory: true,
        });
        if (!result.canceled) {
            setAttachments(prev => [...prev, ...result.assets]);
        }
    };

    const handleSubmit = async () => {
        if (!title || !description || !statusId) {
              Alert.alert("Fehler", "Bitte füllen Sie Titel, Beschreibung und Statusfelder aus!");
              return;
        }
        setLoading(true);
        try {
            let messageId: number;
            let updatedMessage;
            if (mode === "create") {
                const res = await api.post("/new-message", {
                title,
                description,
                priority,
                status_id: statusId,
                // is_announcement: isAnnouncement,
                is_announcement: false,
                assignees,
                assignee,
                });
                messageId = res.data.data.id;
                updatedMessage = res.data.data;

                // store activities
                await api.post("/store-activities", { message_id: messageId, action: "hat Nachricht erstellt" });
                if (assignees.length > 0) {
                    await Promise.all(
                        assignees.map(a =>
                        api.post("/store-activities", { message_id: messageId, action: "hat geteilt mit", assignee_id: a })
                        )
                    );
                }
            } else {
                const res = await api.put(`/message-update/${message!.id}`, {
                    title,
                    description,
                    priority,
                    status_id: statusId,
                    is_announcement: isAnnouncement,
                    assignees,
                    assignee,
                });
                messageId = message!.id;
                updatedMessage = res.data.data;
                console.log("Updated message:", updatedMessage);
                await api.post("/store-activities", { message_id: messageId, action: "hat Nachricht bearbeitet" });
            }

            // upload attachments
            if (attachments.length > 0) {
                const formData = new FormData();
                formData.append("message_id", String(messageId));
                for (const file of attachments) {
                    const response = await fetch(file.uri);
                    const blob = await response.blob();
                    formData.append("files[]", blob, file.name);
                }
                await api.post("/store-attachments", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }

            onSaved?.(updatedMessage);
            onClose();
        } catch (err) {
            console.error(err);
            alert("Nachricht konnte nicht erstellt werden");
        } finally {
            setLoading(false);
        }
    };

    // Determine the user to exclude
    const excludeUserId = message?.creator?.id ?? currentUser?.id;

    const selectableUsers = useMemo(
        () => users.filter(u => u.id !== excludeUserId),
        [users, excludeUserId]
    );
    const selectableUserIds = useMemo(
        () => selectableUsers.map(u => u.id),
        [selectableUsers]
    );
    const allSelected = useMemo(
        () => selectableUserIds.every(id => assignees.includes(id)),
        [selectableUserIds, assignees]
    );
    
    const departments = useMemo(
        () =>
          Array.from(
            new Map(
            selectableUsers.map(u => [u.department.id, u.department])
          ).values()
        ),
        [selectableUsers]
    );

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                        {mode === "create" ? "Neue Nachricht" : "Nachricht bearbeiten"}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                        <Text className="text-gray-500 text-lg">✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        
                        {/* Title */}
                        <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Titel</Text>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Titel"
                            style={styles.input}
                        />
                        </View>

                        {/* Description */}
                        <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Beschreibung</Text>
                        <TextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Beschreibung"
                            multiline
                            numberOfLines={5}
                            style={[styles.input, { height: 100 }]}
                        />
                        </View>

                        {/* Priority */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Priorität</Text>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {["Niedrig", "Mittel", "Hoch"].map((p, idx) => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setPriority(p as any)}
                                    style={[
                                        styles.priorityButton,
                                        priority === p && { backgroundColor: "#2563eb" },
                                        idx < 2 && { marginRight: 8 },
                                    ]}
                                >
                                    <Text style={{ color: priority === p ? "#fff" : "#000" }}>{p}</Text>
                                </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Status */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Status</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    {statuses.map(s => {
                                        const selected = s.id === statusId;
                                        return (
                                        <TouchableOpacity
                                            key={s.id}
                                            onPress={() => setStatusId(s.id)}
                                            style={[
                                            styles.statusButton,
                                            selected && { backgroundColor: "#2563eb" },
                                            ]}
                                        >
                                            <Text style={{ color: selected ? "#fff" : "#000" }}>{s.name}</Text>
                                        </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>

                        {/* Subscribers */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Abonnenten</Text>

                            {/* Horizontal scrollable buttons for All + Departments */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                {/* "Alle" button */}
                                <TouchableOpacity
                                onPress={() =>
                                    setAssignees(allSelected ? [] : selectableUserIds)
                                }
                                style={[
                                    styles.groupButton,
                                    allSelected
                                    ? styles.groupButtonSelected
                                    : styles.groupButtonUnselected,
                                ]}
                                >
                                <Text style={allSelected ? styles.groupButtonTextSelected : styles.groupButtonTextUnselected}>Alle</Text>
                                </TouchableOpacity>

                                {/* Department buttons */}
                                {departments.map(dep => {
                                const depUserIds = users
                                    .filter(u => u.id !== excludeUserId && u.department.id === dep.id)
                                    .map(u => u.id);

                                const depFullySelected =
                                    depUserIds.length > 0 &&
                                    depUserIds.every(id => assignees.includes(id));

                                return (
                                    <TouchableOpacity
                                    key={dep.id}
                                    onPress={() =>
                                        setAssignees(prev =>
                                        depFullySelected
                                            ? prev.filter(id => !depUserIds.includes(id))
                                            : Array.from(new Set([...prev, ...depUserIds]))
                                        )
                                    }
                                    style={[
                                        styles.groupButton,
                                        depFullySelected
                                        ? { backgroundColor: dep.color, borderColor: dep.color }
                                        : { borderColor: dep.color },
                                    ]}
                                    >
                                    <Text style={depFullySelected ? { color: "#fff" } : { color: dep.color }}>
                                        {dep.name}
                                    </Text>
                                    </TouchableOpacity>
                                );
                                })}
                            </ScrollView>

                            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                {users
                                .filter(u => u.id !== excludeUserId)
                                .map(u => {
                                    const selected = assignees.includes(u.id);

                                    return (
                                    <TouchableOpacity
                                        key={u.id}
                                        onPress={() =>
                                        setAssignees(prev =>
                                            prev.includes(u.id)
                                            ? prev.filter(id => id !== u.id)
                                            : [...prev, u.id]
                                        )
                                        }
                                        style={[
                                        styles.assigneeButton,
                                        selected && { backgroundColor: "#e0f2fe" },
                                        ]}
                                    >
                                        <Text>{u.name}</Text>
                                        {selected && (
                                        <Text style={{ color: "#2563eb", fontWeight: "bold" }}>✓</Text>
                                        )}
                                    </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Assignee */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Empfänger</Text>
                            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                {users
                                    .filter(u => u.id !== excludeUserId)
                                    .map(u => {
                                        const selected = assignee === u.id;
                                return (
                                    <TouchableOpacity
                                    key={u.id}
                                    onPress={() =>
                                        setAssignee(selected ? null : u.id)
                                    }
                                    style={[
                                        styles.assigneeButton,
                                        selected && { backgroundColor: "#dbeafe",
                                            borderColor: "#2563eb", },
                                    ]}
                                    >
                                    <Text 
                                        style = {[
                                            selected && { fontWeight: "600", color: "#1e40af" },
                                          ]}
                                    >
                                        {u.name}
                                    </Text>
                                    {selected && <Text style={{ color: "#2563eb", fontWeight: "bold" }}>✓</Text>}
                                    </TouchableOpacity>
                                );
                                })}
                            </ScrollView>
                        </View>

                        {/* Announcement
                        <View style={styles.section}>
                            <Switch value={isAnnouncement} onValueChange={setIsAnnouncement} />
                            <Text>Ist eine Ankündigung</Text>
                        </View> */}

                        {/* Attachments */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Anhänge</Text>
                            <TouchableOpacity
                                onPress={handlePickAttachment}
                                style={styles.button}
                            >
                                <Text>Datei hinzufügen</Text>
                            </TouchableOpacity>
                            {attachments.map((f, i) => (
                                <Text key={i}>{f.name}</Text>
                            ))}
                        </View>

                        {/* Submit */}
                        <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        style={styles.submitButton}
                        >
                        {loading ? <ActivityIndicator size="large" color="#000" /> : <Text className="text-white">Speichern</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContainer: {
        backgroundColor: "#fff",
        width: "90%",
        maxHeight: "90%",
        borderRadius: 10,
        padding: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: "600" },
    content: { flexGrow: 0 },
    section: { marginBottom: 16 },
    sectionTitle: { fontWeight: "600", marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 6,
        padding: 8,
    },
    priorityButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 6,
    },
    button: {
        backgroundColor: "#e5e7eb",
        padding: 10,
        borderRadius: 6,
        alignItems: "center",
        marginBottom: 8,
    },
    submitButton: {
        backgroundColor: "#2563eb",
        padding: 12,
        borderRadius: 6,
        alignItems: "center",
    },
    statusButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#d1d5db",
    },
      
    assigneeButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#d1d5db",
        marginBottom: 6,
    },

    groupButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    groupButtonSelected: {
        backgroundColor: "#2563eb",
        borderColor: "#2563eb",
    },
    groupButtonUnselected: {
        backgroundColor: "#fff",
        borderColor: "#2563eb",
    },
    groupButtonTextSelected: {
        color: "#fff",
        fontSize: 12,
    },
    groupButtonTextUnselected: {
        color: "#2563eb",
        fontSize: 12,
    },
});
