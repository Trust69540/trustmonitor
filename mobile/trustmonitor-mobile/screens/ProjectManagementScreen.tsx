import { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Platform, Alert, ActivityIndicator } from "react-native";

import { API_URL } from "../config";

function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function ProjectManagementScreen({ navigation }) {
  const [projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activites, setActivites] = useState([]);
  const [zones, setZones] = useState([]);

  const [newProjetNom, setNewProjetNom] = useState("");
  const [newProjetBailleur, setNewProjetBailleur] = useState("");
  const [newActiviteNom, setNewActiviteNom] = useState("");
  const [newZoneNom, setNewZoneNom] = useState("");
  const [newZoneType, setNewZoneType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadProjets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/projets`);
      setProjets(await res.json());
    } catch (err) {
      showAlert("Erreur réseau", "Impossible de charger les projets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjets();
  }, [loadProjets]);

  const loadDetail = useCallback(async (projetId) => {
    try {
      const [actRes, zoneRes] = await Promise.all([
        fetch(`${API_URL}/projets/${projetId}/activites`),
        fetch(`${API_URL}/projets/${projetId}/zones`),
      ]);
      setActivites(await actRes.json());
      setZones(await zoneRes.json());
    } catch (err) {
      showAlert("Erreur réseau", "Impossible de charger les détails");
    }
  }, []);

  const openProject = (projet) => {
    setSelected(projet);
    loadDetail(projet.id);
  };

  const createProjet = async () => {
    if (!newProjetNom.trim()) {
      showAlert("Nom requis", "Entrez un nom de projet");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/projets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newProjetNom, bailleur: newProjetBailleur || null }),
      });
      if (!res.ok) {
        showAlert("Erreur", "Échec de la création du projet");
        return;
      }
      setNewProjetNom("");
      setNewProjetBailleur("");
      await loadProjets();
      showAlert("Créé", "Projet créé avec succès");
    } catch (err) {
      showAlert("Erreur réseau", "Impossible de créer le projet");
    } finally {
      setSubmitting(false);
    }
  };

  const createActivite = async () => {
    if (!newActiviteNom.trim()) {
      showAlert("Nom requis", "Entrez un nom d'activité");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/projets/${selected.id}/activites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newActiviteNom }),
      });
      if (!res.ok) {
        showAlert("Erreur", "Échec de la création de l'activité");
        return;
      }
      setNewActiviteNom("");
      await loadDetail(selected.id);
    } catch (err) {
      showAlert("Erreur réseau", "Impossible de créer l'activité");
    } finally {
      setSubmitting(false);
    }
  };

  const createZone = async () => {
    if (!newZoneNom.trim()) {
      showAlert("Nom requis", "Entrez un nom de zone");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/projets/${selected.id}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newZoneNom, type: newZoneType || null }),
      });
      if (!res.ok) {
        showAlert("Erreur", "Échec de la création de la zone");
        return;
      }
      setNewZoneNom("");
      setNewZoneType("");
      await loadDetail(selected.id);
    } catch (err) {
      showAlert("Erreur réseau", "Impossible de créer la zone");
    } finally {
      setSubmitting(false);
    }
  };

  if (selected) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setSelected(null)}>
          <Text style={styles.back}>{"< Retour aux projets"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{selected.nom}</Text>
        <Text style={styles.subtitle}>{selected.bailleur}</Text>

        <Text style={styles.sectionTitle}>Activités</Text>
        {activites.map((a) => (
          <Text key={a.id} style={styles.listItem}>• {a.nom}</Text>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={styles.inputFlex}
            placeholder="Nouvelle activité"
            value={newActiviteNom}
            onChangeText={setNewActiviteNom}
          />
          <TouchableOpacity style={styles.addButton} onPress={createActivite} disabled={submitting}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Zones</Text>
        {zones.map((z) => (
          <Text key={z.id} style={styles.listItem}>• {z.nom} {z.type ? `(${z.type})` : ""}</Text>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={styles.inputFlex}
            placeholder="Nom de zone"
            value={newZoneNom}
            onChangeText={setNewZoneNom}
          />
          <TextInput
            style={[styles.inputFlex, { maxWidth: 100 }]}
            placeholder="Type"
            value={newZoneType}
            onChangeText={setNewZoneType}
          />
          <TouchableOpacity style={styles.addButton} onPress={createZone} disabled={submitting}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>{"< Retour au tableau de bord"}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Projets</Text>

      <View style={styles.newProjectBox}>
        <TextInput
          style={styles.input}
          placeholder="Nom du nouveau projet"
          value={newProjetNom}
          onChangeText={setNewProjetNom}
        />
        <TextInput
          style={styles.input}
          placeholder="Bailleur (optionnel)"
          value={newProjetBailleur}
          onChangeText={setNewProjetBailleur}
        />
        <TouchableOpacity style={styles.button} onPress={createProjet} disabled={submitting}>
          {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Créer le projet</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={projets}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openProject(item)}>
              <Text style={styles.cardTitle}>{item.nom}</Text>
              <Text style={styles.cardSubtitle}>{item.bailleur}</Text>
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
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 8 },
  listItem: { fontSize: 15, color: "#333", marginBottom: 4 },
  addRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  inputFlex: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 },
  addButton: { backgroundColor: "#2563eb", width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  addButtonText: { color: "white", fontSize: 20, fontWeight: "700" },
  newProjectBox: { borderWidth: 1, borderColor: "#eee", borderRadius: 8, padding: 16, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 10 },
  button: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
  card: { padding: 14, borderWidth: 1, borderColor: "#eee", borderRadius: 8, marginBottom: 10 },
  cardTitle: { fontWeight: "700", fontSize: 16 },
  cardSubtitle: { color: "#666", marginTop: 2 },
});
