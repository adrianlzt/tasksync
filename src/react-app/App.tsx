import { BrowserRouter as Router, Routes, Route } from "react-router";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Dashboard from "@/react-app/pages/Dashboard";
import Login from "@/react-app/pages/Login";
import ProtectedRoute from "@/react-app/components/ProtectedRoute";
import { AuthProvider } from "./providers/AuthProvider";

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    return <div>Error: Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.</div>;
  }
  
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
