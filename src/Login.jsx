import { useState } from "react";
import { USUARIOS_SUPERVISOR } from "./shared.js";
import { BIGGY_IMG } from "./biggy-img.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  const login = () => {
    const u = USUARIOS_SUPERVISOR[email.toLowerCase()];
    if (!u || u.pass !== pass) {
      setError("Credenciales incorrectas");
      return;
    }
    onLogin({ email, nombre: u.nombre, sc_id: u.sc_id });
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src={BIGGY_IMG}
            alt="Biggy"
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: 12,
            }}
          />
          <div style={{ fontSize: 26, fontWeight: 800 }}>
            <span style={{ color: "#1a3a6b" }}>Big</span>
            <span style={{ color: "#F47B20" }}>ticket</span>
          </div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
            Bitácora del Supervisor
          </div>
        </div>
        {error && (
          <div
            style={{
              background: "#fee2e2",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#c0392b",
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}
        <div className="field-row">
          <span className="field-label">Correo electrónico</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
        </div>
        <div className="field-row">
          <span className="field-label">Contraseña</span>
          <div style={{ position: "relative" }}>
            <input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              type={show ? "text" : "password"}
              style={{ paddingRight: 40 }}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <button
              onClick={() => setShow(!show)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#888",
                fontSize: 16,
              }}
            >
              {show ? "🙈" : "👁"}
            </button>
          </div>
        </div>
        <button className="btn-blue" onClick={login} style={{ width: "100%", marginTop: 8 }}>
          Ingresar
        </button>
      </div>
    </div>
  );
}
