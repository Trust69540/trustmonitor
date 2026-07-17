import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { getItem } from "../services/storage";

import { API_URL } from "../config";

const STATUS_LABELS = {
  SOUMIS: { label: "Soumis", color: "#f59e0b" },
  VALIDE_PAR_SUPERVISEUR: { label: "Validé par superviseur", color: "#3b82f6" },
  REJETE_PAR_SUPERVISEUR: { label: "Rejeté par superviseur", color: "#dc2626" },
  VALIDE_PAR_CHEF_PROJET: { label: "Validé (final)", color: "#16a34a" },
  REJETE_PAR_CHEF_PROJET: { label: "Rejeté par chef de projet", color: "#dc2626" },
};

export default function HistoriqueScreen({ navigation }) {
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await getItem("user_id");
      const res = await fetch(`${API_URL}/rapports`);
      const data = await res.json();
      // Filter client-side to only this agent's own reports
      const mine = data.filter((r) => String(r.auteur_id) === String(userId));
      setRapports(mine);
    } catch (err) {
      console.log("Erreur chargement historique:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  if (selected) {
    const statusInfo = STATUS_LABELS[selected.statut] || { label: selected.statut, color: "#666" };
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setSelected(null)}>
          <Text style={styles.back}>{"< Retour à l'historique"}</Text>
        </TouchableOpacity>

        <Image source={{ uri: selected.image_url }} style={styles.detailImage} />

        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
          <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
        </View>

        <Text style={styles.detailLabel}>Projet</Text>
        <Text style={styles.detailValue}>{selected.projet_nom}</Text>

        <Text style={styles.detailLabel}>Activité / Zone</Text>
        <Text style={styles.detailValue}>{selected.activite_nom} — {selected.zone_nom}</Text>

        <Text style={styles.detailLabel}>Date de l'activité</Text>
        <Text style={styles.detailValue}>{selected.date_activite}</Text>

        {selected.commentaire_superviseur ? (
          <>
            <Text style={styles.detailLabel}>Commentaire du superviseur</Text>
            <Text style={styles.detailValue}>{selected.commentaire_superviseur}</Text>
          </>
        ) : null}

        {selected.commentaire_chef_projet ? (
          <>
            <Text style={styles.detailLabel}>Commentaire du chef de projet</Text>
            <Text style={styles.detailValue}>{selected.commentaire_chef_projet}</Text>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>{"< Retour au tableau de bord"}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Historique de mes rapports</Text>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      ) : rapports.length === 0 ? (
        <Text style={styles.empty}>Aucun rapport soumis pour l'instant</Text>
      ) : (
        <FlatList
          data={rapports}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const statusInfo = STATUS_LABELS[item.statut] || { label: item.statut, color: "#666" };
            return (
              <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
                <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.projet_nom}</Text>
                  <Text style={styles.cardSubtitle}>{item.activite_nom} — {item.zone_nom}</Text>
                  <Text style={styles.cardMeta}>{item.date_activite}</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusInfo.color }]}>
                    <Text style={styles.statusPillText}>{statusInfo.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
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
  statusPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  statusPillText: { color: "white", fontSize: 11, fontWeight: "600" },
  detailImage: { width: "100%", height: 240, borderRadius: 8, backgroundColor: "#eee", marginBottom: 12 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 12 },
  statusBadgeText: { color: "white", fontWeight: "600" },
  detailLabel: { color: "#888", fontSize: 12, marginTop: 12 },
  detailValue: { fontSize: 16, marginTop: 2 },
});
