import { BrowserRouter as Router, Routes, Route } from "react-router";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Dashboard from "@/react-app/pages/Dashboard";
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
            <Route
              path="/"
              element={<Dashboard />}
            />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
