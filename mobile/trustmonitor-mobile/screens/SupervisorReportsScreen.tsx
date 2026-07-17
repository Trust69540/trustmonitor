import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Platform, Alert, ActivityIndicator, TextInput, Modal } from "react-native";

import { API_URL } from "../config";

function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function SupervisorReportsScreen({ navigation }) {
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/rapports?statut=SOUMIS`);
      const data = await res.json();
      setRapports(data);
    } catch (err) {
      showAlert("Erreur réseau", "Impossible de charger les rapports");
    } finally {
      setLoading(false);
    }
  }, []);

  const patchRapport = async (id, action, commentaire) => {
    const res = await fetch(`${API_URL}/rapports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, role: "superviseur", commentaire }),
    });
    return res;
  };

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const approve = async (rapport) => {
    setSubmitting(true);
    try {
      const res = await patchRapport(rapport.id, "approve", null);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showAlert("Erreur", err.detail || "Échec de la validation");
        return;
      }
      showAlert("Validé", `Rapport #${rapport.id} validé.`);
      setSelected(null);
      loadReports();
    } catch (err) {
      showAlert("Erreur réseau", "Impossible de valider ce rapport");
    } finally {
      setSubmitting(false);
    }
  };

  const openRejectModal = (rapport) => {
    setRejectComment("");
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectComment.trim()) {
      showAlert("Commentaire requis", "Expliquez pourquoi ce rapport est rejeté");
      return;
    }
    setSubmitting(true);
    try {
      const res = await patchRapport(selected.id, "reject", rejectComment);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showAlert("Erreur", err.detail || "Échec du rejet");
        return;
      }
      showAlert("Rejeté", `Rapport #${selected.id} rejeté.`);
      setShowRejectModal(false);
      setSelected(null);
      loadReports();
    } catch (err) {
      showAlert("Erreur réseau", "Impossible de rejeter ce rapport");
    } finally {
      setSubmitting(false);
    }
  };

  if (selected) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setSelected(null)}>
          <Text style={styles.back}>{"< Retour à la liste"}</Text>
        </TouchableOpacity>

        <Image source={{ uri: selected.image_url }} style={styles.detailImage} />

        <Text style={styles.detailLabel}>Projet</Text>
        <Text style={styles.detailValue}>{selected.projet_nom}</Text>

        <Text style={styles.detailLabel}>Activité / Zone</Text>
        <Text style={styles.detailValue}>{selected.activite_nom} — {selected.zone_nom}</Text>

        <Text style={styles.detailLabel}>Agent</Text>
        <Text style={styles.detailValue}>{selected.auteur_nom}</Text>

        <Text style={styles.detailLabel}>Date de l'activité</Text>
        <Text style={styles.detailValue}>{selected.date_activite}</Text>

        {selected.commentaire_agent ? (
          <>
            <Text style={styles.detailLabel}>Commentaire de l'agent</Text>
            <Text style={styles.detailValue}>{selected.commentaire_agent}</Text>
          </>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => openRejectModal(selected)}
            disabled={submitting}
          >
            <Text style={styles.actionButtonText}>Rejeter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => approve(selected)}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.actionButtonText}>Valider</Text>}
          </TouchableOpacity>
        </View>

        <Modal visible={showRejectModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Motif du rejet</Text>
              <TextInput
                style={styles.modalInput}
                multiline
                placeholder="Expliquez ce qui ne va pas..."
                value={rejectComment}
                onChangeText={setRejectComment}
              />
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => setShowRejectModal(false)}>
                  <Text style={styles.actionButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={confirmReject} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.actionButtonText}>Confirmer</Text>}
                </TouchableOpacity>
              </View>
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
      <Text style={styles.title}>Rapports à vérifier</Text>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      ) : rapports.length === 0 ? (
        <Text style={styles.empty}>Aucun rapport en attente</Text>
      ) : (
        <FlatList
          data={rapports}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.projet_nom}</Text>
                <Text style={styles.cardSubtitle}>{item.activite_nom} — {item.zone_nom}</Text>
                <Text style={styles.cardMeta}>{item.auteur_nom} · {item.date_activite}</Text>
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
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  empty: { color: "#888", marginTop: 24, textAlign: "center" },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  thumbnail: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#eee" },
  cardTitle: { fontWeight: "700", fontSize: 15 },
  cardSubtitle: { color: "#555", marginTop: 2 },
  cardMeta: { color: "#999", fontSize: 12, marginTop: 4 },
  detailImage: { width: "100%", height: 240, borderRadius: 8, backgroundColor: "#eee", marginBottom: 16 },
  detailLabel: { color: "#888", fontSize: 12, marginTop: 12 },
  detailValue: { fontSize: 16, marginTop: 2 },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  actionButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: "center" },
  approveButton: { backgroundColor: "#16a34a" },
  rejectButton: { backgroundColor: "#dc2626" },
  actionButtonText: { color: "white", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalBox: { backgroundColor: "white", borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, height: 100, textAlignVertical: "top" },
});
