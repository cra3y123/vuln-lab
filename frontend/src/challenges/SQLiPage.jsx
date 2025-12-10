import { useState } from "react";
import axios from "axios";

const TYPES = [
  {
    value: "error",
    label: "Error-based",
    tip: "Break the query and observe detailed DB error messages.",
    example: "' OR 1=1--"
  },
  {
    value: "boolean",
    label: "Boolean-based (blind)",
    tip: "Use payloads that change the TRUE/FALSE condition. Compare row counts.",
    example: "' OR 'a'='a--"
  },
  {
    value: "time",
    label: "Time-based (blind)",
    tip: "In insecure mode, notice the big delay with certain payloads.",
    example: "' OR 'a'='a--"
  },
  {
    value: "union",
    label: "Union-based",
    tip: "Use UNION SELECT payloads to try and extract additional data.",
    example: "' UNION SELECT 1, username FROM users--"
  },
  {
    value: "oob",
    label: "Out-of-band (simulated)",
    tip: "Assume payloads could trigger external channels (logs, DNS, etc.).",
    example: "'; -- OOB payload here"
  }
];

export default function SQLiPage() {
  const [term, setTerm] = useState("");
  const [type, setType] = useState("error");
  const [secureMode, setSecureMode] = useState("insecure"); // "secure" | "insecure"
  const [results, setResults] = useState([]);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");

  const currentType = TYPES.find((t) => t.value === type);

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setType(newType);
    const t = TYPES.find((tt) => tt.value === newType);
    if (t && t.example) {
      setTerm(t.example);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setInfo(null);

    try {
      const res = await axios.post(
        "http://localhost:8080/api/sqli/search",
        {
          term,
          type,
          secure: secureMode === "secure"
        },
        { withCredentials: true }
      );

      setResults(res.data.results || []);
      setInfo({
        secure: res.data.secure,
        type: res.data.type,
        query: res.data.query,
        rawError: res.data.error || "",
        rowCount: res.data.row_count ?? 0,
        elapsedMs: res.data.elapsed_ms ?? null
      });
    } catch (err) {
      setError("Request failed. Check browser console / network tab.");
      console.error(err);
    }
  };

  return (
    <div>
      <h2>SQL Injection Challenge</h2>
      <p>
        This lab uses the <code>users</code> table in PostgreSQL. Search is
        always the same, but you can switch SQLi <b>type</b> and
        <b> secure / insecure</b> behaviour.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: "15px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label>
            SQLi type:&nbsp;
            <select value={type} onChange={handleTypeChange}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>
            Mode:&nbsp;
            <select
              value={secureMode}
              onChange={(e) => setSecureMode(e.target.value)}
            >
              <option value="insecure">Insecure (vulnerable)</option>
              <option value="secure">Secure (parameterized)</option>
            </select>
          </label>
        </div>

        {currentType && (
          <div style={{ marginBottom: "10px", fontSize: "0.9rem" }}>
            <b>Tip ({currentType.label}):</b> {currentType.tip}
          </div>
        )}

        <div style={{ marginBottom: "10px" }}>
          <input
            style={{ width: "100%", padding: "6px" }}
            placeholder="Search term / payload"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>

        <button type="submit" style={{ padding: "6px 12px" }}>
          Run search
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: "10px" }}>
          {error}
        </p>
      )}

      {info && (
        <div style={{ marginTop: "20px" }}>
          <h3>Executed Query</h3>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "10px",
              overflowX: "auto"
            }}
          >
{info.query}
          </pre>

          <p>
            <b>Mode:</b>{" "}
            {info.secure
              ? "SECURE (parameterized)"
              : "INSECURE (string concatenation)"}
            <br />
            <b>Type selected:</b> {info.type}
            <br />
            <b>Row count:</b> {info.rowCount}
            {info.elapsedMs !== null && (
              <>
                <br />
                <b>Response time:</b> {info.elapsedMs} ms
              </>
            )}
          </p>

          {/* Only show DB error prominently for error-based SQLi */}
          {info.rawError && type === "error" && (
            <p style={{ color: "darkred" }}>
              <b>DB error (for error-based SQLi):</b> {info.rawError}
            </p>
          )}
        </div>
      )}

      {results && results.length > 0 && (
        <div style={{ marginTop: "15px" }}>
          <h3>Results</h3>
          <table
            style={{
              borderCollapse: "collapse",
              minWidth: "300px"
            }}
          >
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: "4px 8px" }}>
                  ID
                </th>
                <th style={{ border: "1px solid #ccc", padding: "4px 8px" }}>
                  Username
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id}>
                  <td style={{ border: "1px solid #ccc", padding: "4px 8px" }}>
                    {r.id}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "4px 8px" }}>
                    {r.username}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
