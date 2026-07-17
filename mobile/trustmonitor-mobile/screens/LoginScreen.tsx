import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { setItem } from "../services/storage";

import { API_URL } from "../config";

function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

// Decode the JWT payload (no verification needed client-side, just reading claims)
function decodeToken(token) {
  try {
    let payload = token.split(".")[1];
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4 !== 0) {
      payload += "=";
    }
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (e) {
    console.log("TOKEN DECODE ERROR:", e);
    return null;
  }
}

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("Erreur", "Remplissez les deux champs");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        showAlert("Échec de connexion", errorData.detail || "Email ou mot de passe incorrect");
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("LOGIN RESPONSE:", data);
      const claims = decodeToken(data.access_token);
      console.log("DECODED CLAIMS:", claims);

      await setItem("access_token", data.access_token);
      await setItem("role", data.role);
      await setItem("nom", data.nom);
      if (claims?.user_id) {
        await setItem("user_id", String(claims.user_id));
      } else {
        console.log("WARNING: user_id missing from decoded claims");
      }

      navigation.replace("Dashboard");
    } catch (err) {
      console.log("LOGIN ERROR:", err);
      showAlert("Erreur réseau", "Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>
      <Text style={styles.hint}>Ex: agent1@test.com / password123</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Connexion..." : "Se connecter"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  hint: { fontSize: 12, color: "#888", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 16 },
  button: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
});
