import { useEffect, useState } from "react";
import { IconSnow, IconEye, IconEyeOff, IconLock } from "../components/Icons.jsx";
import { isAdminConfigured, verifyPassword, lockRemainingMs, recordFailedLogin, clearFailedLogins } from "../utils/auth.js";

function formatWait(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}

export default function AdminLogin({ onSuccess, notice }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lockMs, setLockMs] = useState(lockRemainingMs);

  useEffect(() => {
    if (lockMs <= 0) return;
    const t = setInterval(() => setLockMs(lockRemainingMs()), 1000);
    return () => clearInterval(t);
  }, [lockMs > 0]);

  if (!isAdminConfigured()) {
    return (
      <div className="adm-gate">
        <div className="adm-gate-card">
          <Brand />
          <h1>Set your admin password</h1>
          <p className="adm-muted">
            For security, the admin panel has no default password. Create one on your computer, in the project folder:
          </p>
          <pre className="adm-code">npm run set-admin-password</pre>
          <p className="adm-muted">
            This saves a secure <b>hash</b> of your password in <code>.env.local</code> (the password itself is never stored).
            Restart <code>npm run dev</code> afterwards. When you deploy, add the same <code>VITE_ADMIN_PASSWORD_HASH</code> value
            to your hosting provider's environment variables.
          </p>
          <a className="adm-link" href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ""; }}>
            ← Back to the store
          </a>
        </div>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const remaining = lockRemainingMs();
    if (remaining > 0) {
      setLockMs(remaining);
      return;
    }
    setBusy(true);
    setError("");
    let ok = false;
    try {
      ok = await verifyPassword(password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setPassword("");
    if (ok) {
      clearFailedLogins();
      onSuccess();
      return;
    }
    const r = recordFailedLogin();
    if (r.lockedMs > 0) {
      setLockMs(r.lockedMs);
      setError("");
    } else {
      setError(`Incorrect password. ${r.attemptsLeft} attempt${r.attemptsLeft === 1 ? "" : "s"} left before a temporary lock.`);
    }
  }

  const locked = lockMs > 0;

  return (
    <div className="adm-gate">
      <form className="adm-gate-card" onSubmit={submit} noValidate>
        <Brand />
        <h1>Welcome back</h1>
        <p className="adm-muted">Sign in to manage products and orders.</p>

        {notice && <p className="adm-notice" role="status">{notice}</p>}

        {/* Hidden username helps password managers; value is not used. */}
        <input type="text" name="username" autoComplete="username" value="frost-admin" readOnly hidden />

        <label className="adm-field">
          <span>Password</span>
          <div className="adm-pw">
            <input
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={256}
              disabled={locked || busy}
              autoFocus
              aria-invalid={error ? "true" : "false"}
              aria-describedby="adm-login-msg"
            />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
              {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </label>

        <div id="adm-login-msg" aria-live="polite">
          {locked ? (
            <p className="adm-error">
              <IconLock size={16} /> Too many failed attempts. Try again in {formatWait(lockMs)}.
            </p>
          ) : (
            error && <p className="adm-error">{error}</p>
          )}
        </div>

        <button className="adm-btn adm-btn-primary adm-btn-block" disabled={locked || busy || !password}>
          {busy ? "Checking…" : "Sign in"}
        </button>

        <a className="adm-link" href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ""; }}>
          ← Back to the store
        </a>
      </form>
    </div>
  );
}

function Brand() {
  return (
    <div className="adm-brand adm-brand-lg">
      <span className="adm-brand-mark">
        <IconSnow size={18} />
      </span>
      <span>
        FROST <small>Admin</small>
      </span>
    </div>
  );
}
