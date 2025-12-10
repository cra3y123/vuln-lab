import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        "http://localhost:8080/api/auth/login",
        { username, password },
        { withCredentials: true }
      );

      // any 200 here means login OK
      if (res.status === 200) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Login failed");
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f7",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "24px 28px",
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
          minWidth: "320px",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Login</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "10px" }}>
            <label>
              Username
              <input
                style={{ width: "100%", padding: "6px", marginTop: "4px" }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>
              Password
              <input
                type="password"
                style={{ width: "100%", padding: "6px", marginTop: "4px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </div>

          {error && (
            <div style={{ color: "red", marginBottom: "8px" }}>{error}</div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "8px 0",
              marginTop: "6px",
              borderRadius: "999px",
              border: "1px solid #222",
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
