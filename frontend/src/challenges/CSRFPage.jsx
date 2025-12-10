import { useEffect, useState } from "react";
import axios from "axios";

export default function CSRFPage() {
  const [mode, setMode] = useState("insecure");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const isSecure = mode === "secure";

  const loadProfile = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/csrf/profile", {
        withCredentials: true,
      });
      if (!res.data.error) {
        setEmail(res.data.email);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadToken = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/csrf/token", {
        withCredentials: true,
      });
      setToken(res.data.token || "");
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProfile();
    loadToken();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        "http://localhost:8080/api/csrf/change-email",
        {
          email: newEmail,
          token: isSecure ? token : "",
          secure: isSecure,
        },
        { withCredentials: true }
      );
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setEmail(res.data.email);
        setNewEmail("");
      }
    } catch (err) {
      setError("Request failed");
    }
  };

  return (
    <div>
      <h2>CSRF Challenge</h2>
      <p>
        The browser automatically sends your session cookie. In insecure mode,
        the server updates your email without any CSRF token. In secure mode, a
        token from <code>/api/csrf/token</code> must be sent with the request.
      </p>

      <div style={{ marginBottom: "10px" }}>
        <label>
          Mode:&nbsp;
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="insecure">Insecure (no CSRF token)</option>
            <option value="secure">Secure (token validated)</option>
          </select>
        </label>
      </div>

      <p>
        <b>Current email:</b> {email}
      </p>

      {isSecure && (
        <p>
          <b>CSRF token:</b> <code>{token}</code>
        </p>
      )}

      <form onSubmit={submit} style={{ marginTop: "10px" }}>
        <input
          style={{ width: "100%", padding: "6px", marginBottom: "8px" }}
          placeholder="New email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <button type="submit">Change email</button>
      </form>

      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}
