import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { getItem, deleteItem } from "../services/storage";
import { API_URL } from "../config";

export default function DashboardScreen({ navigation }) {
  const [role, setRole] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    (async () => {
      const savedRole = await getItem("role");
      setRole(savedRole);
    })();
  }, []);

  useEffect(() => {
    if (!role) return;
    loadStats(role);
  }, [role]);

  const loadStats = async (currentRole) => {
    setLoadingStats(true);
    try {
      if (currentRole === "agent") {
        const userId = await getItem("user_id");
        const res = await fetch(`${API_URL}/rapports`);
        const all = await res.json();
        const mine = all.filter((r) => String(r.auteur_id) === String(userId));
        setStats({
          soumis: mine.length,
          enAttente: mine.filter((r) => r.statut === "SOUMIS").length,
          valides: mine.filter((r) => r.statut === "VALIDE_PAR_CHEF_PROJET").length,
        });
      } else if (currentRole === "superviseur") {
        const res = await fetch(`${API_URL}/rapports`);
        const all = await res.json();
        setStats({
          aVerifier: all.filter((r) => r.statut === "SOUMIS").length,
          valides: all.filter((r) => r.statut === "VALIDE_PAR_SUPERVISEUR" || r.statut === "VALIDE_PAR_CHEF_PROJET").length,
          rejetes: all.filter((r) => r.statut === "REJETE_PAR_SUPERVISEUR").length,
        });
      } else if (currentRole === "chef_projet") {
        const res = await fetch(`${API_URL}/rapports`);
        const all = await res.json();
        const validesFinal = all.filter((r) => r.statut === "VALIDE_PAR_CHEF_PROJET");
        let beneficiaires = 0;
        validesFinal.forEach((r) => {
          try {
            const donnees = JSON.parse(r.donnees_extraites_json || "{}");
            beneficiaires += donnees.participants_total || 0;
          } catch (e) {
            // ignore malformed json
          }
        });
        setStats({
          enAttente: all.filter((r) => r.statut === "VALIDE_PAR_SUPERVISEUR").length,
          valides: validesFinal.length,
          beneficiaires,
        });
      } else if (currentRole === "administrateur") {
        const [usersRes, projetsRes] = await Promise.all([
          fetch(`${API_URL}/users`),
          fetch(`${API_URL}/projets`),
        ]);
        const users = await usersRes.json();
        const projets = await projetsRes.json();
        setStats({
          utilisateurs: users.length,
          projets: projets.length,
          organisations: 0, // not yet modeled in the backend
        });
      }
    } catch (err) {
      console.log("Erreur chargement stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = async () => {
    await deleteItem("access_token");
    await deleteItem("role");
    navigation.replace("Login");
  };

  if (!role) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tableau de bord</Text>
      <Text style={styles.roleTag}>Rôle : {role}</Text>

      {loadingStats ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <>
          {role === "agent" && stats && (
            <View>
              <Text style={styles.stat}>Rapports soumis : {stats.soumis}</Text>
              <Text style={styles.stat}>Rapports en attente : {stats.enAttente}</Text>
              <Text style={styles.stat}>Rapports validés : {stats.valides}</Text>
              <TouchableOpacity style={styles.newReportButton} onPress={() => navigation.navigate("NewReport")}>
                <Text style={styles.newReportText}>Nouveau rapport</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.newReportButton} onPress={() => navigation.navigate("Historique")}>
                <Text style={styles.newReportText}>Historique</Text>
              </TouchableOpacity>
            </View>
          )}

          {role === "superviseur" && stats && (
            <View>
              <Text style={styles.stat}>Rapports à vérifier : {stats.aVerifier}</Text>
              <Text style={styles.stat}>Rapports validés : {stats.valides}</Text>
              <Text style={styles.stat}>Rapports rejetés : {stats.rejetes}</Text>
              <TouchableOpacity style={styles.newReportButton} onPress={() => navigation.navigate("SupervisorReports")}>
                <Text style={styles.newReportText}>Voir les rapports</Text>
              </TouchableOpacity>
            </View>
          )}

          {role === "chef_projet" && stats && (
            <View>
              <Text style={styles.stat}>Rapports en attente : {stats.enAttente}</Text>
              <Text style={styles.stat}>Rapports validés : {stats.valides}</Text>
              <Text style={styles.stat}>Bénéficiaires : {stats.beneficiaires}</Text>
              <TouchableOpacity style={styles.newReportButton} onPress={() => navigation.navigate("ChefProjetReports")}>
                <Text style={styles.newReportText}>Valider les rapports</Text>
              </TouchableOpacity>
            </View>
          )}

          {role === "administrateur" && stats && (
            <View>
              <Text style={styles.stat}>Utilisateurs : {stats.utilisateurs}</Text>
              <Text style={styles.stat}>Projets : {stats.projets}</Text>
              <Text style={styles.stat}>Organisations : {stats.organisations}</Text>
              <TouchableOpacity style={styles.newReportButton} onPress={() => navigation.navigate("AdminUsers")}>
                <Text style={styles.newReportText}>Gérer les utilisateurs</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.newReportButton} onPress={() => navigation.navigate("ProjectManagement")}>
                <Text style={styles.newReportText}>Gérer les projets</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "700" },
  roleTag: { color: "#666", marginBottom: 24 },
  stat: { fontSize: 16, marginBottom: 8 },
  logoutButton: { marginTop: 32, alignSelf: "flex-start" },
  logoutText: { color: "#e11d48", fontWeight: "600" },
  newReportButton: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 16 },
  newReportText: { color: "white", fontWeight: "600" },
});
