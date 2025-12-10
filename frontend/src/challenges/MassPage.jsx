import { useEffect, useState } from "react";
import axios from "axios";

export default function MassPage() {
  const [mode, setMode] = useState("insecure");
  const [plan, setPlan] = useState("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");

  const isSecure = mode === "secure";

  const loadAccount = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/mass/me", {
        withCredentials: true,
      });
      if (!res.data.error) {
        setAccount(res.data);
        setPlan(res.data.plan);
        setIsAdmin(res.data.is_admin);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAccount();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        "http://localhost:8080/api/mass/update",
        { plan, is_admin: isAdmin, secure: isSecure },
        { withCredentials: true }
      );
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setAccount(res.data);
      }
    } catch (err) {
      setError("Request failed");
    }
  };

  return (
    <div>
      <h2>Mass Assignment Challenge</h2>
      <p>
        In insecure mode, the API accepts <code>is_admin</code> from the client
        and updates it directly. In secure mode, only the <code>plan</code> can
        be changed.
      </p>

      <div style={{ marginBottom: "10px" }}>
        <label>
          Mode:&nbsp;
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="insecure">Insecure (mass assignment)</option>
            <option value="secure">Secure (whitelisted fields)</option>
          </select>
        </label>
      </div>

      <form onSubmit={submit}>
        <div style={{ marginBottom: "8px" }}>
          <label>
            Plan:&nbsp;
            <select value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="free">free</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: "8px" }}>
          <label>
            is_admin (client-controlled):&nbsp;
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
          </label>
        </div>

        <button type="submit">Update account</button>
      </form>

      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

      {account && (
        <div style={{ marginTop: "15px" }}>
          <h3>Current account state</h3>
          <p>
            <b>Plan:</b> {account.plan}
            <br />
            <b>is_admin:</b>{" "}
            <span style={{ color: account.is_admin ? "green" : "black" }}>
              {String(account.is_admin)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
