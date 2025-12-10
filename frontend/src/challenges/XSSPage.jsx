import { useEffect, useState } from "react";
import axios from "axios";

const XSS_TYPES = [
  { value: "reflected", label: "Reflected XSS" },
  { value: "stored", label: "Stored XSS" },
  { value: "dom", label: "DOM XSS (front-end only)" },
];

export default function XSSPage() {
  const [mode, setMode] = useState("insecure"); // insecure | secure
  const [type, setType] = useState("reflected");

  // reflected
  const [reflectedInput, setReflectedInput] = useState("");
  const [reflectedOutput, setReflectedOutput] = useState("");

  // stored
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);

  // DOM XSS
  const [domInput, setDomInput] = useState("");        // Source 2: user input
  const [urlHashSource, setUrlHashSource] = useState(""); // Source 1: URL hash
  const [domChosenSource, setDomChosenSource] = useState(""); // "text" | "hash" | ""
  const [domFlowPayload, setDomFlowPayload] = useState("");  // payload in flow
  const [domSinkContent, setDomSinkContent] = useState("");  // written to sink

  const [error, setError] = useState("");

  const isSecure = mode === "secure";

  // ------- Stored comments -------

  const fetchComments = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/xss/comments", {
        withCredentials: true,
      });
      setComments(res.data.comments || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  // ------- DOM source from URL hash -------

  useEffect(() => {
    const hash = window.location.hash || "";
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    setUrlHashSource(raw);
  }, []);

  // ------- Handlers -------

  const submitReflected = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post(
        "http://localhost:8080/api/xss/reflected",
        { input: reflectedInput, secure: isSecure },
        { withCredentials: true }
      );
      setReflectedOutput(res.data.echo || "");
    } catch (err) {
      setError("Request failed");
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(
        "http://localhost:8080/api/xss/comment",
        { content: comment, secure: isSecure },
        { withCredentials: true }
      );
      setComment("");
      fetchComments();
    } catch (err) {
      setError("Request failed");
    }
  };

  // DOM XSS: build clear SOURCE → FLOW → SINK visualization
  const submitDomXSS = (e) => {
    e.preventDefault();
    setError("");

    // Source choice: user input wins; otherwise URL hash
    const trimmedInput = domInput.trim();
    const trimmedHash = urlHashSource.trim();

    let payload = "";
    let source = "";

    if (trimmedInput !== "") {
      payload = trimmedInput;
      source = "text";
    } else if (trimmedHash !== "") {
      payload = trimmedHash;
      source = "hash";
    } else {
      payload = "";
      source = "";
    }

    setDomChosenSource(source);
    setDomFlowPayload(payload || "(empty)");

    if (!payload) {
      setDomSinkContent("");
      return;
    }

    if (!isSecure) {
      // 🔴 INSECURE: payload goes untouched to sink (innerHTML)
      setDomSinkContent(payload);
    } else {
      // ✅ SECURE: escape before sending to sink
      const escaped = payload
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      setDomSinkContent(escaped);
    }
  };

  return (
    <div>
      <h2>XSS Challenge</h2>
      <p>
        Demonstrates reflected, stored, and DOM XSS. Use the mode dropdown to
        switch between insecure and secure behaviour.
      </p>

      <div style={{ marginBottom: "10px" }}>
        <label>
          Type:&nbsp;
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {XSS_TYPES.map((t) => (
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
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="insecure">Insecure (vulnerable)</option>
            <option value="secure">Secure (escaped)</option>
          </select>
        </label>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* ---------------- Reflected XSS ---------------- */}
      {type === "reflected" && (
        <div style={{ marginTop: "15px" }}>
          <h3>Reflected XSS</h3>
          <form onSubmit={submitReflected}>
            <input
              style={{ width: "100%", padding: "6px", marginBottom: "8px" }}
              placeholder="Enter text or payload"
              value={reflectedInput}
              onChange={(e) => setReflectedInput(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>

          <h4 style={{ marginTop: "10px" }}>Output (sink)</h4>
          <div
            style={{
              border: "1px solid #ddd",
              padding: "10px",
              minHeight: "40px",
            }}
          >
            {isSecure ? (
              <span>{reflectedOutput}</span>
            ) : (
              <span
                dangerouslySetInnerHTML={{ __html: reflectedOutput }}
              ></span>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Stored XSS ---------------- */}
      {type === "stored" && (
        <div style={{ marginTop: "15px" }}>
          <h3>Stored XSS – Comments</h3>
          <form onSubmit={submitComment}>
            <textarea
              style={{ width: "100%", padding: "6px", marginBottom: "8px" }}
              rows={3}
              placeholder="Comment (can contain payload)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button type="submit">Post comment</button>
          </form>

          <h4 style={{ marginTop: "10px" }}>Latest comments (sink)</h4>
          <ul>
            {comments.map((c) => (
              <li key={c.id}>
                {isSecure ? (
                  <span>{c.content}</span>
                ) : (
                  <span
                    dangerouslySetInnerHTML={{ __html: c.content }}
                  ></span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------------- DOM XSS: SOURCE → FLOW → SINK ---------------- */}
      {type === "dom" && (
        <div style={{ marginTop: "15px" }}>
          <h3>DOM XSS (front-end only)</h3>
          <p style={{ maxWidth: "600px" }}>
            This demo never talks to the backend. It shows how untrusted data
            from the DOM (URL hash or user input) flows into an{" "}
            <code>innerHTML</code> sink.
          </p>

          {/* Three-column flow: Source → Flow → Sink */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr 1.2fr",
              gap: "16px",
              alignItems: "stretch",
              marginTop: "16px",
            }}
          >
            {/* SOURCE column */}
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "6px",
                padding: "10px",
              }}
            >
              <h4>DOM Sources</h4>

              <div style={{ marginBottom: "10px", fontSize: "14px" }}>
                <strong>Source 1 – URL hash</strong>
                <div>
                  <code>window.location.hash</code>:
                  <br />
                  <code>{window.location.hash || "(empty)"}</code>
                </div>
                <div style={{ marginTop: "4px" }}>
                  Parsed payload:
                  <br />
                  <code>{urlHashSource || "(none)"}</code>
                </div>
                <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                  Try:{" "}
                  <code>#&lt;img src=x onerror=prompt(1)&gt;</code> in the URL.
                </div>
              </div>

              <div style={{ fontSize: "14px" }}>
                <strong>Source 2 – Text input</strong>
                <form onSubmit={submitDomXSS}>
                  <input
                    style={{
                      width: "100%",
                      padding: "6px",
                      marginTop: "4px",
                      marginBottom: "8px",
                    }}
                    placeholder="DOM payload (e.g., <img src=x onerror=prompt(8)>)"
                    value={domInput}
                    onChange={(e) => setDomInput(e.target.value)}
                  />
                  <button type="submit">Send through flow →</button>
                </form>
                <div style={{ fontSize: "12px", color: "#555" }}>
                  If this input is empty, the URL hash payload is used instead.
                </div>
              </div>
            </div>

            {/* FLOW column */}
            <div
              style={{
                border: "1px dashed #aaa",
                borderRadius: "6px",
                padding: "10px",
                textAlign: "center",
                fontSize: "14px",
                background:
                  domFlowPayload && !isSecure ? "#fff8e1" : "#fafafa",
              }}
            >
              <h4>Flow</h4>
              <p style={{ marginBottom: "6px" }}>
                Chosen payload moving from source to sink:
              </p>
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: "4px",
                  padding: "6px",
                  minHeight: "40px",
                  background: "#ffffff",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {domFlowPayload || "(click the button to start flow)"}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#555",
                  marginTop: "6px",
                }}
              >
                Chosen source:{" "}
                {domChosenSource === "text"
                  ? "Text input"
                  : domChosenSource === "hash"
                  ? "URL hash"
                  : "(none yet)"}
                .
              </div>
              <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                In {isSecure ? "secure" : "insecure"} mode the same payload
                reaches the sink, but it may be escaped first.
              </div>
            </div>

            {/* SINK column */}
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "6px",
                padding: "10px",
              }}
            >
              <h4>DOM Sink</h4>
              <p style={{ fontSize: "13px", color: "#555", marginBottom: "6px" }}>
                This is a dangerous sink like <code>innerHTML</code>. In
                insecure mode we assign the payload directly; in secure mode we
                escape it first.
              </p>

              {/* Rendered DOM (innerHTML) */}
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: "4px",
                  padding: "8px",
                  minHeight: "40px",
                  marginBottom: "8px",
                  background: !isSecure && domSinkContent ? "#fff8e1" : "#ffffff",
                }}
                // innerHTML sink – will execute in insecure mode
                dangerouslySetInnerHTML={{ __html: domSinkContent }}
              />

              {/* Raw HTML string in the sink */}
              <h5 style={{ margin: "8px 0 4px" }}>Raw HTML in sink</h5>
              <pre
                style={{
                  border: "1px solid #eee",
                  borderRadius: "4px",
                  padding: "6px",
                  minHeight: "40px",
                  background: "#fafafa",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {domSinkContent || "(sink not updated yet)"}
              </pre>

              {/* Code snippet showing the flow */}
              <h5 style={{ margin: "8px 0 4px" }}>Code path</h5>
              <pre
                style={{
                  border: "1px solid #eee",
                  borderRadius: "4px",
                  padding: "6px",
                  background: "#fafafa",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap",
                }}
              >{`// Source: DOM (text input or location.hash)
const payload = domFlowPayload;

if (mode === "insecure") {
  // 🔴 vulnerable sink
  sink.innerHTML = payload;
} else {
  // ✅ safe variant
  sink.textContent = payload;
}`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
