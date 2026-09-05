import { useState, type FormEvent } from "react";
import { api, ApiClientError } from "../api/client";

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>Change Password</h1>
      <form className="form-card" onSubmit={handleSubmit}>
        <label>
          Current Password
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </label>
        <label>
          New Password
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
        </label>
        <label>
          Confirm New Password
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </label>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-info">Password updated successfully.</div>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
