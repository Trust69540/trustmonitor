import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { API_URL } from "../config";

function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function Select({ selectedValue, onValueChange, items, placeholder }) {
  if (Platform.OS === "web") {
    return (
      <select
        value={selectedValue}
        onChange={(e) => onValueChange(e.target.value)}
        style={webInputStyle}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {items.map((item) => (
          <option key={item.id} value={item.id}>{item.nom}</option>
        ))}
      </select>
    );
  }
  return (
    <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
      {placeholder !== undefined && <Picker.Item label={placeholder} value="" />}
      {items.map((item) => (
        <Picker.Item key={item.id} label={item.nom} value={item.id} />
      ))}
    </Picker>
  );
}

function DateField({ value, onChangeText }) {
  if (Platform.OS === "web") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        style={webInputStyle}
      />
    );
  }
  return (
    <TextInput
      style={styles.input}
      placeholder="2026-07-09"
      value={value}
      onChangeText={onChangeText}
    />
  );
}

const webInputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 16,
  width: "100%",
  marginBottom: 4,
  boxSizing: "border-box",
};

export default function NewReportScreen({ navigation }) {
  const [projets, setProjets] = useState([]);
  const [activites, setActivites] = useState([]);
  const [zones, setZones] = useState([]);
  const [loadingProjets, setLoadingProjets] = useState(true);
  const [loadingSubData, setLoadingSubData] = useState(false);

  const [projetId, setProjetId] = useState("");
  const [activiteId, setActiviteId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [dateActivite, setDateActivite] = useState("");
  const [commentaire, setCommentaire] = useState("");

  // Load the list of projects once, on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/projets`);
        const data = await res.json();
        setProjets(data);
        if (data.length > 0) {
          setProjetId(String(data[0].id));
        }
      } catch (err) {
        showAlert("Erreur réseau", "Impossible de charger les projets");
      } finally {
        setLoadingProjets(false);
      }
    })();
  }, []);

  // Whenever the selected project changes, load its activities/zones
  useEffect(() => {
    if (!projetId) return;
    setActiviteId("");
    setZoneId("");
    setLoadingSubData(true);
    (async () => {
      try {
        const [actRes, zoneRes] = await Promise.all([
          fetch(`${API_URL}/projets/${projetId}/activites`),
          fetch(`${API_URL}/projets/${projetId}/zones`),
        ]);
        setActivites(await actRes.json());
        setZones(await zoneRes.json());
      } catch (err) {
        showAlert("Erreur réseau", "Impossible de charger les activités/zones");
      } finally {
        setLoadingSubData(false);
      }
    })();
  }, [projetId]);

  const handleContinue = () => {
    console.log("STATE:", { projetId, activiteId, zoneId, dateActivite });
    if (!activiteId || !zoneId || !dateActivite) {
      showAlert("Champs manquants", "Choisissez une activité, une zone et une date");
      return;
    }
    navigation.navigate("CameraScreen", {
      reportData: { projetId, activiteId, zoneId, dateActivite, commentaire },
    });
  };

  if (loadingProjets) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Chargement des projets...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Nouveau rapport</Text>

      <Text style={styles.label}>Projet</Text>
      <Select
        selectedValue={projetId}
        onValueChange={setProjetId}
        items={projets}
      />

      {loadingSubData ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <>
          <Text style={styles.label}>Activité</Text>
          <Select
            selectedValue={activiteId}
            onValueChange={setActiviteId}
            items={activites}
            placeholder="-- Choisir --"
          />

          <Text style={styles.label}>Zone</Text>
          <Select
            selectedValue={zoneId}
            onValueChange={setZoneId}
            items={zones}
            placeholder="-- Choisir --"
          />
        </>
      )}

      <Text style={styles.label}>Date de l'activité</Text>
      <DateField value={dateActivite} onChangeText={setDateActivite} />

      <Text style={styles.label}>Commentaire</Text>
      <TextInput style={[styles.input, { height: 80 }]} multiline value={commentaire} onChangeText={setCommentaire} />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continuer vers la photo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  label: { marginTop: 12, marginBottom: 4, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 },
  button: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 24, marginBottom: 40 },
  buttonText: { color: "white", fontWeight: "600" },
});
