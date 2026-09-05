import { useEffect, useState, type FormEvent } from "react";
import { api, ApiClientError } from "../api/client";
import type { AdminType, AdminUser } from "../api/types";

export function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [type, setType] = useState<AdminType>("admin");
  const [accessLevel, setAccessLevel] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [lastTempPassword, setLastTempPassword] = useState<string | null>(null);

  async function refresh() {
    const result = await api.get<AdminUser[]>("/admin-users");
    setRows(result);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await api.post<AdminUser>("/admin-users", {
        firstName,
        lastName,
        email,
        username,
        type,
        accessLevel,
      });
      setLastTempPassword(created.temporaryPassword ?? null);
      setFirstName("");
      setLastName("");
      setEmail("");
      setUsername("");
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create admin");
    }
  }

  async function toggleActive(row: AdminUser) {
    await api.post(`/admin-users/${row.id}/set-active`, { active: !row.active });
    refresh();
  }

  async function resetPassword(row: AdminUser) {
    const result = await api.post<{ temporaryPassword: string }>(`/admin-users/${row.id}/reset-password`);
    setLastTempPassword(result.temporaryPassword);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Admin Users</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Admin"}
        </button>
      </div>

      {lastTempPassword && (
        <div className="alert-error" style={{ background: "#eef2ff", color: "#1d4ed8", borderColor: "#c7d2fe" }}>
          Temporary password: <strong>{lastTempPassword}</strong> (share this with the admin — it won't be shown again)
        </div>
      )}

      {showForm && (
        <form className="form-card" onSubmit={handleCreate}>
          <div className="form-row">
            <label>
              First name
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </label>
            <label>
              Last name
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </label>
          </div>
          <div className="form-row">
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
          </div>
          <div className="form-row">
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value as AdminType)}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <label>
              Access level (0-100)
              <input type="number" min={0} max={100} value={accessLevel} onChange={(e) => setAccessLevel(Number(e.target.value))} />
            </label>
          </div>
          {error && <div className="alert-error">{error}</div>}
          <button type="submit" className="btn-primary">
            Create Admin
          </button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Type</th>
            <th>Access</th>
            <th>Status</th>
            <th>Last login</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.firstName} {row.lastName}
              </td>
              <td>{row.email}</td>
              <td>{row.type}</td>
              <td>{row.accessLevel}</td>
              <td>
                <span className={`pill ${row.active ? "approved" : "unapproved"}`}>
                  {row.active ? "active" : "inactive"}
                </span>
              </td>
              <td>{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "never"}</td>
              <td className="row-actions">
                <button className="btn-link" onClick={() => toggleActive(row)}>
                  {row.active ? "Deactivate" : "Activate"}
                </button>
                <button className="btn-link" onClick={() => resetPassword(row)}>
                  Reset password
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
