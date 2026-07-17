import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Alert, ActivityIndicator, Modal } from "react-native";

import { API_URL } from "../config";

function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

const ROLES = ["agent", "superviseur", "chef_projet", "administrateur"];
const STATUTS = ["actif", "en_attente", "suspendu"];

const STATUS_COLORS = {
  actif: "#16a34a",
  en_attente: "#f59e0b",
  suspendu: "#dc2626",
};

export default function AdminUsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      showAlert("Erreur réseau", "Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateUser = async (userId, patch) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        showAlert("Erreur", "Échec de la mise à jour");
        return;
      }
      await loadUsers();
      if (selected && selected.id === userId) {
        const updated = await res.json();
        setSelected({ ...selected, ...updated });
      }
    } catch (err) {
      showAlert("Erreur réseau", "Impossible de mettre à jour l'utilisateur");
    } finally {
      setSubmitting(false);
    }
  };

  const cycleStatus = (user) => {
    const currentIndex = STATUTS.indexOf(user.statut);
    const next = STATUTS[(currentIndex + 1) % STATUTS.length];
    updateUser(user.id, { statut: next });
  };

  if (selected) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setSelected(null)}>
          <Text style={styles.back}>{"< Retour à la liste"}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{selected.prenom} {selected.nom}</Text>
        <Text style={styles.subtitle}>{selected.email}</Text>

        <Text style={styles.label}>Rôle</Text>
        <TouchableOpacity style={styles.selectBox} onPress={() => setShowRoleModal(true)}>
          <Text style={styles.selectBoxText}>{selected.role}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Statut</Text>
        <TouchableOpacity
          style={[styles.statusBox, { backgroundColor: STATUS_COLORS[selected.statut] || "#666" }]}
          onPress={() => cycleStatus(selected)}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.statusBoxText}>{selected.statut} (toucher pour changer)</Text>}
        </TouchableOpacity>

        <Modal visible={showRoleModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Choisir un rôle</Text>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.roleOption}
                  onPress={() => {
                    updateUser(selected.id, { role: r });
                    setSelected({ ...selected, role: r });
                    setShowRoleModal(false);
                  }}
                >
                  <Text style={styles.roleOptionText}>{r}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowRoleModal(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>{"< Retour au tableau de bord"}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Utilisateurs</Text>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.prenom} {item.nom}</Text>
                <Text style={styles.cardSubtitle}>{item.email}</Text>
                <Text style={styles.cardMeta}>{item.role}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[item.statut] || "#666" }]}>
                <Text style={styles.statusPillText}>{item.statut}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  back: { color: "#2563eb", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#666", marginBottom: 16 },
  label: { marginTop: 16, marginBottom: 6, color: "#333", fontWeight: "600" },
  card: {
    flexDirection: "row",
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  cardTitle: { fontWeight: "700", fontSize: 15 },
  cardSubtitle: { color: "#555", marginTop: 2 },
  cardMeta: { color: "#999", fontSize: 12, marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  statusPillText: { color: "white", fontSize: 11, fontWeight: "600" },
  selectBox: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 },
  selectBoxText: { fontSize: 16 },
  statusBox: { borderRadius: 8, padding: 14, alignItems: "center" },
  statusBoxText: { color: "white", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalBox: { backgroundColor: "white", borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  roleOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#eee" },
  roleOptionText: { fontSize: 16 },
  cancelButton: { padding: 14, marginTop: 8, alignItems: "center" },
  cancelButtonText: { color: "#dc2626", fontWeight: "600" },
});
