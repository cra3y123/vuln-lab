import { useState } from "react";
import axios from "axios";

export default function IDORPage() {
  const [mode, setMode] = useState("insecure");
  const [targetUserId, setTargetUserId] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const isSecure = mode === "secure";

  const loadProfile = async (e) => {
    e.preventDefault();
    setError("");
    setData(null);

    try {
      const res = await axios.post(
        "http://localhost:8080/api/idor/profile",
        { targetUserId: Number(targetUserId), secure: isSecure },
        { withCredentials: true }
      );
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setData(res.data);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Request failed");
      }
    }
  };

  return (
    <div>
      <h2>IDOR Challenge</h2>
      <p>
        Insecure Direct Object Reference via <code>user_id</code>. In insecure
        mode the server trusts the requested ID (session token ignored); in
        secure mode the session token is enforced and other users' profiles
        return <code>401 Unauthorized</code>.
      </p>

      <div style={{ marginBottom: "10px" }}>
        <label>
          Mode:&nbsp;
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="insecure">Insecure (vulnerable)</option>
            <option value="secure">Secure (enforce session)</option>
          </select>
        </label>
      </div>

      <form onSubmit={loadProfile}>
        <label>
          Target user_id:&nbsp;
          <input
            type="number"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
          />
        </label>
        <button type="submit" style={{ marginLeft: "8px" }}>
          Load profile
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

      {data && data.profile && (
        <div style={{ marginTop: "15px" }}>
          <h3>Profile</h3>
          <p>
            <b>Requested ID:</b> {data.requestedUserId}
            <br />
            <b>Effective ID used by server:</b> {data.effectiveUserId}
          </p>
          <p>
            <b>Email:</b> {data.profile.email}
            <br />
            <b>Bio:</b> {data.profile.bio}
          </p>
        </div>
      )}
    </div>
  );
}
