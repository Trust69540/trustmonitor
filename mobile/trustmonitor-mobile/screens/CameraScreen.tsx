import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, ActivityIndicator, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { API_URL } from "../config";

function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function CameraScreen({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const cameraRef = useRef(null);

  const reportData = route?.params?.reportData;

  if (!permission) {
    return <View style={styles.center}><Text>Chargement des permissions...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>
          L'accès à l'appareil photo est nécessaire pour ajouter une photo au rapport.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Autoriser l'appareil photo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      setPhotoUri(photo.uri);
    }
  };

  const retake = () => setPhotoUri(null);

  const analyzeAndContinue = async () => {
    setAnalyzing(true);
    try {
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

      const res = await fetch(`${API_URL}/rapports/extract`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        showAlert("Erreur", "L'analyse IA a échoué. Réessayez.");
        setAnalyzing(false);
        return;
      }

      const extracted = await res.json();
      if (extracted._error) { showAlert("Erreur IA (debug)", String(extracted._error)); }
      navigation.navigate("AICorrection", { reportData, photoUri, extracted });
    } catch (err) {
      showAlert("Erreur réseau", "Impossible d'analyser la photo.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} />
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={retake} disabled={analyzing}>
            <Text style={styles.buttonText}>Reprendre</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={analyzeAndContinue} disabled={analyzing}>
            {analyzing ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Valider</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pickFromFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUri(url);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef} />
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
      </View>
      {Platform.OS === "web" && (
        <View style={styles.webUploadRow}>
          <Text style={styles.webUploadLabel}>Difficile avec la webcam ?</Text>
          <label style={webButtonStyle}>
            Choisir une photo depuis le disque
            <input type="file" accept="image/*" onChange={pickFromFile} style={{ display: "none" }} />
          </label>
        </View>
      )}
    </View>
  );
}

const webButtonStyle = {
  backgroundColor: "#374151",
  color: "white",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
  textAlign: "center",
  display: "inline-block",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  permText: { textAlign: "center", marginBottom: 16, fontSize: 16 },
  camera: { flex: 1 },
  preview: { flex: 1, resizeMode: "contain" },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
    backgroundColor: "black",
  },
  button: { backgroundColor: "#2563eb", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, alignItems: "center", minWidth: 100 },
  secondaryButton: { backgroundColor: "#555" },
  buttonText: { color: "white", fontWeight: "600" },
  captureButton: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: "white",
    justifyContent: "center", alignItems: "center",
  },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "white" },
  webUploadRow: { alignItems: "center", paddingBottom: 20, backgroundColor: "black" },
  webUploadLabel: { color: "#aaa", fontSize: 12, marginBottom: 8 },
});
