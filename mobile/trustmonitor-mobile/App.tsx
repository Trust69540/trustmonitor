import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getItem } from "./services/storage";
import { View, Image, Text, StyleSheet } from "react-native";

import LoginScreen from "./screens/LoginScreen";
import DashboardScreen from "./screens/DashboardScreen";
import NewReportScreen from "./screens/NewReportScreen";
import CameraScreen from "./screens/CameraScreen";
import SupervisorReportsScreen from "./screens/SupervisorReportsScreen";
import AICorrectionScreen from "./screens/AICorrectionScreen";
import ChefProjetReportsScreen from "./screens/ChefProjetReportsScreen";
import HistoriqueScreen from "./screens/HistoriqueScreen";
import AdminUsersScreen from "./screens/AdminUsersScreen";
import ProjectManagementScreen from "./screens/ProjectManagementScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    (async () => {
      const [token] = await Promise.all([
        getItem("access_token"),
        new Promise((resolve) => setTimeout(resolve, 1500)), // keep splash visible briefly
      ]);
      setInitialRoute(token ? "Dashboard" : "Login");
    })();
  }, []);

  if (initialRoute === null) {
    return (
      <View style={splashStyles.container}>
        <Image source={require("./assets/splash-icon.png")} style={splashStyles.logo} resizeMode="contain" />
        <Text style={splashStyles.appName}>TrustMonitor</Text>
        <Text style={splashStyles.tagline}>Suivi terrain simplifié</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="NewReport" component={NewReportScreen} />
        <Stack.Screen name="CameraScreen" component={CameraScreen} />
        <Stack.Screen name="SupervisorReports" component={SupervisorReportsScreen} />
        <Stack.Screen name="AICorrection" component={AICorrectionScreen} />
        <Stack.Screen name="ChefProjetReports" component={ChefProjetReportsScreen} />
        <Stack.Screen name="Historique" component={HistoriqueScreen} />
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
        <Stack.Screen name="ProjectManagement" component={ProjectManagementScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


const splashStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff" },
  logo: { width: 140, height: 140, marginBottom: 16 },
  appName: { fontSize: 26, fontWeight: "700", color: "#2563eb" },
  tagline: { fontSize: 14, color: "#888", marginTop: 6 },
});
