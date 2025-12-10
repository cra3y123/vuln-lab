import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import axios from "axios";

import TopBar from "./components/TopBar.jsx";

import LoginPage from "./LoginPage.jsx";
import SQLiPage from "./challenges/SQLiPage.jsx";
import XSSPage from "./challenges/XSSPage.jsx";
import IDORPage from "./challenges/IDORPage.jsx";
import MassPage from "./challenges/MassPage.jsx";
import SSRFPage from "./challenges/SSRFPage.jsx";
import CSRFPage from "./challenges/CSRFPage.jsx";

// Protect routes by checking /api/auth/me
function ProtectedLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/auth/me", { withCredentials: true })
      .then((res) => {
        setAuthed(true);
        setUserId(res.data.user_id);
      })
      .catch(() => {
        setAuthed(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: 40 }}>Checking session…</div>;
  }

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <TopBar userId={userId} />
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px" }}>
        {children}
      </main>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public login route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Default route */}
        <Route
          path="/"
          element={
            <ProtectedLayout>
              <SQLiPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/xss"
          element={
            <ProtectedLayout>
              <XSSPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/idor"
          element={
            <ProtectedLayout>
              <IDORPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/mass"
          element={
            <ProtectedLayout>
              <MassPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/ssrf"
          element={
            <ProtectedLayout>
              <SSRFPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/csrf"
          element={
            <ProtectedLayout>
              <CSRFPage />
            </ProtectedLayout>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
