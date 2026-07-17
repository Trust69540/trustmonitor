import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator, Image } from "react-native";
import { getItem } from "../services/storage";

import { API_URL } from "../config";

function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function AICorrectionScreen({ navigation, route }) {
  const { reportData, photoUri, extracted } = route.params;

  const [hommes, setHommes] = useState(String(extracted.hommes ?? ""));
  const [femmes, setFemmes] = useState(String(extracted.femmes ?? ""));
  const [enfants, setEnfants] = useState(String(extracted.enfants ?? ""));
  const [contraintes, setContraintes] = useState(extracted.contraintes ?? "");
  const [submitting, setSubmitting] = useState(false);

  const participantsTotal = (parseInt(hommes) || 0) + (parseInt(femmes) || 0) + (parseInt(enfants) || 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const userId = await getItem("user_id");
      if (!userId) {
        showAlert("Erreur", "Utilisateur introuvable, reconnectez-vous.");
        setSubmitting(false);
        return;
      }

      const donneesExtraites = {
        participants_total: participantsTotal,
        hommes: parseInt(hommes) || 0,
        femmes: parseInt(femmes) || 0,
        enfants: parseInt(enfants) || 0,
        contraintes,
      };

      const formData = new FormData();
      if (Platform.OS === "web") {
        const photoResponse = await fetch(photoUri);
        const photoBlob = await photoResponse.blob();
        formData.append("image", photoBlob, "rapport.jpg");
      } else {
        formData.append("image", {
          uri: photoUri,
          name: "rapport.jpg",
          type: "image/jpeg",
        });
      }
      formData.append("projet_id", reportData.projetId);
      formData.append("activite_id", reportData.activiteId);
      formData.append("zone_id", reportData.zoneId);
      formData.append("date_activite", reportData.dateActivite);
      formData.append("commentaire_agent", reportData.commentaire || "");
      formData.append("auteur_id", userId);
      formData.append("donnees_extraites_json", JSON.stringify(donneesExtraites));

      const res = await fetch(`${API_URL}/rapports`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        showAlert("Échec de l'envoi", `Le serveur a refusé le rapport.\n${errText}`);
        setSubmitting(false);
        return;
      }

      const result = await res.json();
      showAlert("Rapport envoyé", `Rapport #${result.id} soumis avec succès.`);
      navigation.navigate("Dashboard");
    } catch (err) {
      showAlert("Erreur réseau", "Impossible d'envoyer le rapport. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Vérifier les données extraites</Text>
      <Text style={styles.subtitle}>
        L'IA a lu la fiche photographiée. Corrigez si besoin avant de soumettre.
      </Text>

      <Image source={{ uri: photoUri }} style={styles.photoThumb} />

      <Text style={styles.label}>Hommes</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={hommes} onChangeText={setHommes} />

      <Text style={styles.label}>Femmes</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={femmes} onChangeText={setFemmes} />

      <Text style={styles.label}>Enfants</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={enfants} onChangeText={setEnfants} />

      <Text style={styles.label}>Total participants (calculé)</Text>
      <Text style={styles.totalValue}>{participantsTotal}</Text>

      <Text style={styles.label}>Contraintes</Text>
      <TextInput style={styles.input} value={contraintes} onChangeText={setContraintes} />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Soumettre le rapport</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#666", marginBottom: 16 },
  photoThumb: { width: "100%", height: 160, borderRadius: 8, backgroundColor: "#eee", marginBottom: 16 },
  label: { marginTop: 12, marginBottom: 4, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 },
  totalValue: { fontSize: 18, fontWeight: "700", color: "#2563eb" },
  button: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 24, marginBottom: 40 },
  buttonText: { color: "white", fontWeight: "600" },
});
