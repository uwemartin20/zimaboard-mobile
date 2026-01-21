import { getUser } from "@/api/auth";
import api from "@/api/client";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

interface MessageStatus {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  department: { id: number; name: string; color: string };
}

type Priority = "Niedrig" | "Mittel" | "Hoch";

export default function NewMessage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Mittel");
  const [statusId, setStatusId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [assignees, setAssignees] = useState<number[]>([]);
  const [assignee, setAssignee] = useState<number | null>(null);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [attachments, setAttachments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [statuses, setStatuses] = useState<MessageStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    api.get("/message-statuses").then(res => setStatuses(res.data));
    api.get("/users").then(res => setUsers(res.data.users));
    getUser().then(user => setCurrentUser(user));
  }, []);

  const pickAttachments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (!result.canceled) {
      setAttachments(prev => [...prev, ...result.assets]);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("Mittel");
    setStatusId(null);
    setIsAnnouncement(false);
    setAssignees([]);
    setAssignee(null);
    setAttachments([]);
  };

  const handleSubmit = async () => {
    if (!title || !description || !statusId) {
      Alert.alert("Fehler", "Bitte füllen Sie Titel, Beschreibung und Statusfelder aus!");
      return;
    }
    setLoading(true);

    try {
      /** 1️⃣ Create Message */
      const res = await api.post("/new-message", {
        title,
        description,
        priority,
        status_id: statusId,
        is_announcement: isAnnouncement,
        assignees,
        assignee,
      });

      const messageId = res.data.data.id;

      /** 2️⃣ Attachments */
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

      /** 3️⃣ Activity */
      await api.post("/store-activities", {
        message_id: messageId,
        action: "hat Nachricht erstellt",
      });

      /** 4️⃣ Assignment activities */
      await Promise.all(
        assignees.map(id =>
          api.post("/store-activities", {
            message_id: messageId,
            action: "hat geteilt mit",
            assignee_id: id,
          })
        )
      );

      resetForm();
      router.back();
    } catch (err) {
      console.error(err);
      alert("Nachricht konnte nicht erstellt werden");
    } finally {
      setLoading(false);
    }
  };

  const excludeUserId = currentUser?.id;

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
    <>
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Neue Nachricht</Text>

      {/* Title */}
      <TextInput
        placeholder="Titel"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      {/* Description */}
      <TextInput
        placeholder="Beschreibung"
        value={description}
        onChangeText={setDescription}
        style={[styles.input, styles.textarea]}
        multiline
      />

      {/* Attachments */}
      <TouchableOpacity onPress={pickAttachments} style={styles.attachmentBtn}>
        <Ionicons name="attach" size={20} />
        <Text>Anhänge auswählen</Text>
      </TouchableOpacity>

      {attachments.map((f, i) => (
        <Text key={i} style={styles.file}>
          {f.name}
        </Text>
      ))}

      {/* Announcement
      <View style={styles.row}>
        <Text>Ist eine Ankündigung</Text>
        <Switch value={isAnnouncement} onValueChange={setIsAnnouncement} />
      </View> */}

      {/* Priority */}
      <Text style={styles.label}>Priorität</Text>
      {(["Niedrig", "Mittel", "Hoch"] as Priority[]).map(p => (
        <TouchableOpacity
          key={p}
          style={[
            styles.option,
            priority === p && styles.optionActive,
          ]}
          onPress={() => setPriority(p)}
        >
          <Text>{p}</Text>
        </TouchableOpacity>
      ))}

      {/* Status */}
      <Text style={styles.label}>Status</Text>
      {statuses.map(s => (
        <TouchableOpacity
          key={s.id}
          style={[
            styles.option,
            statusId === s.id && styles.optionActive,
          ]}
          onPress={() => setStatusId(s.id)}
        >
          <Text>{s.name}</Text>
        </TouchableOpacity>
      ))}

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
    </ScrollView>

    {/* Actions */}
    <View style={styles.actions}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text>Abbrechen</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="large" color="#000" />
        ) : (
          <Text style={styles.submit}>Nachricht erstellen</Text>
        )}
      </TouchableOpacity>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 18, fontWeight: "600", marginBottom: 12 },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },

  textarea: { height: 100, textAlignVertical: "top" },

  attachmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  file: { fontSize: 12, color: "#2563eb" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },

  label: { marginTop: 12, fontWeight: "600" },

  option: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    marginVertical: 4,
  },

  optionActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
  },

  submit: {
    color: "#2563eb",
    fontWeight: "600",
  },
  section: { marginBottom: 16 },
  sectionTitle: { fontWeight: "600", marginBottom: 8 },
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
  
