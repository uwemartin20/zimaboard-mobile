import { Message } from '@/types/message';
import { Picker } from "@react-native-picker/picker";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { default as FontAwesome5, default as Icon } from "react-native-vector-icons/FontAwesome5";
import api from "../api/client";
import MessageModal from "./MessageModal";
import ShareModal from "./ShareModal";

type Department = { id: number; name: string; color: string };
type BoardProps = { type: "assigned" | "created" | "announcement" };

export default function Board({ type }: BoardProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);

    const [filterArchived, setFilterArchived] = useState(false);
    const [filterCreator, setFilterCreator] = useState<string | null>(null);
    const [filterPriority, setFilterPriority] = useState<"hoch" | "mittel" | "niedrig" | null>(null);
    const [filterStatus, setFilterStatus] = useState<string | null>(null);

    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareMessage, setShareMessage] = useState<Message | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBoard = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterArchived !== null) params.is_archived = filterArchived;
            if (filterCreator) params.creator_id = Number(filterCreator);
            if (filterPriority) params.priority = filterPriority;
            if (filterStatus) params.status = filterStatus;
            const res = await api.get(`/${type}`, { params });
            setMessages(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get("/departments");
            setDepartments(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchDepartments();
        fetchBoard();
    }, [type, filterArchived, filterCreator, filterPriority, filterStatus]);

    const messagesByDept = (dept: string) =>
        messages.filter((msg) => msg.creator?.department?.name === dept);
    
    const reloadData = useCallback( () => {
        setRefreshing(true);
    
        // fetch / refetch your data here
        fetchDepartments();
        fetchBoard();
    
        setRefreshing(false);
    }, []);

    if (loading) return <ActivityIndicator size="large" color="#000" style={{ flex: 1 }} />;

    return (
        <ScrollView 
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={reloadData} />
            }    
        >
            
            {/* Filters */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16, gap: 12 }}>
                
                {/* Creator Filter */}
                <View style={{ width: 150, marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Ersteller</Text>
                    <Picker
                        selectedValue={filterCreator ?? ""}
                        onValueChange={(value) => setFilterCreator(value || null)}
                    >
                        <Picker.Item label="Alle Ersteller" value="" />
                        {messages
                            .map((m) => m.creator)
                            .filter((v, i, a) => v && a.findIndex(x => x?.id === v.id) === i)
                            .map((creator) => (
                                <Picker.Item key={creator!.id} label={creator!.name} value={creator?.id.toString()} />
                            ))
                        }
                    </Picker>
                </View>

                {/* Priority Filter */}
                <View style={{ width: 150, marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Priorität</Text>
                    <Picker
                        selectedValue={filterPriority ?? ""}
                        onValueChange={(value) => setFilterPriority(value as any || null)}
                    >
                        <Picker.Item label="Alle Prioritäten" value="" />
                        <Picker.Item label="Hoch" value="hoch" />
                        <Picker.Item label="Mittel" value="mittel" />
                        <Picker.Item label="Niedrig" value="niedrig" />
                    </Picker>
                </View>

                {/* Status Filter */}
                <View style={{ width: 150, marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Status</Text>
                    <Picker
                        selectedValue={filterStatus ?? ""}
                        onValueChange={(value) => setFilterStatus(value || null)}
                    >
                        <Picker.Item label="Alle Status" value="" />
                        {messages
                        .map((m) => m.status.name)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .map((status) => (
                            <Picker.Item key={status} label={status} value={status} />
                        ))}
                    </Picker>
                </View>

                {/* Archived Toggle */}
                <TouchableOpacity
                onPress={() => setFilterArchived((prev) => !prev)}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: filterArchived ? "#2563eb" : "#d1d5db",
                }}
                >
                    <Icon name="trash" size={16} color="#fff" />
                    <Text style={{ color: "#fff", marginLeft: 6 }}>{filterArchived ? "Archiv" : "Archiv"}</Text>
                </TouchableOpacity>
            </View>

            {/* Departments */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {departments.map((dept) => (
                    <View
                        key={dept.id}
                        style={{
                        width: 250,
                        backgroundColor: "#f3f4f6",
                        borderRadius: 12,
                        padding: 12,
                        marginRight: 12,
                        }}
                    >
                        <Text style={{ fontWeight: "bold", marginBottom: 8 }}>{dept.name}</Text>

                        {messagesByDept(dept.name).map((msg) => (
                        <TouchableOpacity
                            key={msg.id}
                            onPress={() => setSelectedMessage(msg)}
                            style={{
                            backgroundColor:
                                msg.priority.toLowerCase() === "hoch"
                                ? "rgba(248,113,113,0.3)"
                                : msg.priority.toLowerCase() === "mittel"
                                ? "rgba(253,230,138,0.3)"
                                : msg.priority.toLowerCase() === "niedrig"
                                ? "rgba(191,219,254,0.3)"
                                : "#e5e7eb",
                            padding: 8,
                            borderRadius: 8,
                            marginBottom: 8,
                            opacity: msg.is_archived ? 0.5 : 1,
                            }}
                        >
                            {/* Title + Status */}
                            <Text style={{ fontWeight: "bold" }}>{msg.title}</Text>
                            <Text style={{ color: msg.status.color }}>{msg.status.name}</Text>
                            <Text numberOfLines={2}>{msg.description}</Text>

                            {/* Footer */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    marginTop: 8,
                                    borderTopWidth: 1,
                                    borderTopColor: "#ddd",
                                    paddingTop: 4,
                                }}
                                >
                                {/* Share button */}
                                <TouchableOpacity
                                    onPress={(e) => {
                                    e.stopPropagation?.(); // optional in RN
                                    setShareMessage(msg);
                                    setShareModalOpen(true);
                                    }}
                                    style={{ flexDirection: "row", alignItems: "center" }}
                                >
                                    <FontAwesome5 name="share-alt" size={12} color="#2563eb" />
                                    <Text style={{ color: "#2563eb", marginLeft: 4 }}>Teilen</Text>
                                </TouchableOpacity>

                                {/* Creator / Assignees */}
                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                                    {type === "created"
                                    ? msg.assignees.map((a, i) => (
                                        <View key={a.id} style={{ flexDirection: "row", alignItems: "center", marginRight: 4 }}>
                                            <FontAwesome5 name="user-circle" size={12} color="red" />
                                            <Text>{a.name}{i < msg.assignees.length - 1 ? "," : ""}</Text>
                                        </View>
                                        ))
                                    : (
                                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                                            <FontAwesome5 name="user-circle" size={12} color="blue" />
                                            <Text>{msg.creator?.name}</Text>
                                        </View>
                                        )}
                                </View>
                            </View>
                        </TouchableOpacity>
                        ))}

                        {messagesByDept(dept.name).length === 0 && <Text style={{ color: "#6b7280" }}>Keine Nachrichten</Text>}
                    </View>
                ))}
            </ScrollView>

            {/* Modals */}
            {shareModalOpen && shareMessage && (
                <ShareModal
                message={shareMessage}
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                onShareSuccess={() => {
                    fetchBoard();
                    setShareModalOpen(false);
                }}
                />
            )}
            
            {selectedMessage && (
                <MessageModal
                message={selectedMessage}
                onClose={() => setSelectedMessage(null)}
                onArchiveToggle={async (archived) => {
                    await api.put(`/messages/${selectedMessage.id}`, { is_archived: archived });
                    fetchBoard();
                    setSelectedMessage((prev) => (prev ? { ...prev, is_archived: archived } : null));
                }}
                onAddComment={async (text) => {
                    const res = await api.post(`/messages/${selectedMessage.id}/comments`, { text });
                    return res.data.data;
                }}
                />
            )}
        </ScrollView>
    );
}
