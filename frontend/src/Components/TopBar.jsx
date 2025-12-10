import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function TopBar({ userId }) {
  const navigate = useNavigate();

  const logout = async () => {
    await axios.post(
      "http://localhost:8080/api/auth/logout",
      {},
      { withCredentials: true }
    );
    navigate("/login");
  };

  return (
    <div
      style={{
        width: "100%",
        background: "#eee",
        padding: "12px 20px",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <div>
        <Link to="/">SQLi</Link> | <Link to="/xss">XSS</Link> |{" "}
        <Link to="/idor">IDOR</Link> | <Link to="/mass">Mass</Link> |{" "}
        <Link to="/ssrf">SSRF</Link> | <Link to="/csrf">CSRF</Link>
      </div>

      <div>
        Logged in as <b>{userId}</b> &nbsp;
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
