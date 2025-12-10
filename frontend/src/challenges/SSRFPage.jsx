import { useState } from "react";
import axios from "axios";

export default function SSRFPage() {
  const [mode, setMode] = useState("insecure");
  const [url, setUrl] = useState("http://example.com");
  const [resp, setResp] = useState(null);
  const [error, setError] = useState("");

  const isSecure = mode === "secure";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResp(null);

    try {
      const res = await axios.post(
        "http://localhost:8080/api/ssrf/fetch",
        { url, secure: isSecure },
        { withCredentials: true }
      );
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setResp(res.data);
      }
    } catch (err) {
      setError("Request failed");
    }
  };

  return (
    <div>
      <h2>SSRF Challenge</h2>
      <p>
        In insecure mode the server will fetch any URL you specify. In secure
        mode, localhost and private IPs are blocked and only http/https are
        allowed.
      </p>

      <div style={{ marginBottom: "10px" }}>
        <label>
          Mode:&nbsp;
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="insecure">Insecure (SSRF possible)</option>
            <option value="secure">Secure (filter URLs)</option>
          </select>
        </label>
      </div>

      <form onSubmit={submit}>
        <input
          style={{ width: "100%", padding: "6px", marginBottom: "8px" }}
          placeholder="URL to fetch"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit">Fetch</button>
      </form>

      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

      {resp && (
        <div style={{ marginTop: "15px" }}>
          <h3>Response</h3>
          <p>
            <b>Status:</b> {resp.status}
            <br />
            <b>Content-Type:</b> {resp.content_type}
          </p>
          <h4>Body preview (first 1KB)</h4>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "10px",
              maxHeight: "200px",
              overflow: "auto",
            }}
          >
{resp.body_preview}
          </pre>
        </div>
      )}
    </div>
  );
}
