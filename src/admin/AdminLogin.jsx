import { useState } from "react";
import { IconSnow, IconEye, IconEyeOff, IconLock } from "../components/Icons.jsx";
import { api } from "../api.js";

export default function AdminLogin({ onSuccess, notice }) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.admin.login(password, code.replace(/\s/g, ""));
      setPassword("");
      setCode("");
      onSuccess();
    } catch (err) {
      setError(err.message);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-gate">
      <form className="adm-gate-card" onSubmit={submit} noValidate>
        <div className="adm-brand adm-brand-lg">
          <span className="adm-brand-mark">
            <IconSnow size={18} />
          </span>
          <span>
            FROST <small>Dashboard</small>
          </span>
        </div>
        <h1>Welcome back</h1>
        <p className="adm-muted">Sign in with your password and the 6-digit code from your authenticator app.</p>

        {notice && (
          <p className="adm-notice" role="status">
            {notice}
          </p>
        )}

        {/* Hidden username helps password managers; not sent anywhere. */}
        <input type="text" name="username" autoComplete="username" value="frost-owner" readOnly hidden />

        <label className="adm-field">
          <span>Password</span>
          <div className="adm-pw">
            <input
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={256}
              disabled={busy}
              autoFocus
              aria-invalid={error ? "true" : "false"}
            />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
              {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </label>

        <label className="adm-field">
          <span>Authenticator code</span>
          <input
            className="adm-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            placeholder="123 456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, "").slice(0, 7))}
            disabled={busy}
            aria-invalid={error ? "true" : "false"}
          />
        </label>

        <div aria-live="polite">
          {error && (
            <p className="adm-error">
              <IconLock size={16} /> {error}
            </p>
          )}
        </div>

        <button className="adm-btn adm-btn-primary adm-btn-block" disabled={busy || !password || code.replace(/\s/g, "").length !== 6}>
          {busy ? "Checking…" : "Sign in"}
        </button>

        <a className="adm-link" href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ""; }}>
          ← Back to the store
        </a>
      </form>
    </div>
  );
}
