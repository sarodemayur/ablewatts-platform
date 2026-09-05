import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { api, downloadFile } from "../api/client";
import type { AppUser, AppUserListResponse, AppUserType, CsvImportResult } from "../api/types";

const TYPES: { value: AppUserType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "registered", label: "Registered" },
  { value: "demo", label: "Demo" },
  { value: "beta", label: "Beta" },
  { value: "guest", label: "Guest" },
  { value: "invite", label: "Invite" },
];

export function AppUsersPage() {
  const [type, setType] = useState<AppUserType | "">("");
  const [rows, setRows] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newType, setNewType] = useState<AppUserType>("registered");
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  async function refresh() {
    const query = type ? `?type=${type}&limit=100` : "?limit=100";
    const result = await api.get<AppUserListResponse>(`/app-users${query}`);
    setRows(result.rows);
    setTotal(result.total);
  }

  useEffect(() => {
    refresh();
  }, [type]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post("/app-users", { type: newType, email, firstName, lastName });
    setEmail("");
    setFirstName("");
    setLastName("");
    setShowForm(false);
    refresh();
  }

  async function toggleActive(row: AppUser) {
    await api.post(`/app-users/${row.id}/set-active`, { active: !row.active });
    refresh();
  }

  async function convert(row: AppUser) {
    await api.post(`/app-users/${row.id}/convert`);
    refresh();
  }

  async function remove(row: AppUser) {
    if (!confirm(`Delete ${row.email}?`)) return;
    await api.delete(`/app-users/${row.id}`);
    refresh();
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.post<CsvImportResult>("/csv/import/app-users", formData);
      setImportResult(result);
      refresh();
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>End Users ({total})</h1>
        <div className="row-actions">
          <button className="btn-secondary" onClick={() => downloadFile(`/csv/export/app-users${type ? `?type=${type}` : ""}`, "app-users.csv")}>
            Export CSV
          </button>
          <label className="btn-secondary file-input-label">
            {importing ? "Importing..." : "Import CSV"}
            <input type="file" accept=".csv" hidden onChange={handleImport} disabled={importing} />
          </label>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ New User"}
          </button>
        </div>
      </div>

      {importResult && (
        <div className="alert-error" style={{ background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}>
          Imported {importResult.created}, skipped {importResult.skipped}.
          {importResult.errors.length > 0 && <div>{importResult.errors.join("; ")}</div>}
        </div>
      )}

      <div className="tabs">
        {TYPES.map((t) => (
          <button key={t.value} className={`tab${type === t.value ? " active" : ""}`} onClick={() => setType(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {showForm && (
        <form className="form-card" onSubmit={handleCreate}>
          <div className="form-row">
            <label>
              Type
              <select value={newType} onChange={(e) => setNewType(e.target.value as AppUserType)}>
                <option value="registered">Registered</option>
                <option value="demo">Demo</option>
                <option value="beta">Beta</option>
                <option value="guest">Guest</option>
                <option value="invite">Invite</option>
              </select>
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
          </div>
          <div className="form-row">
            <label>
              First name
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label>
              Last name
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>
          <button type="submit" className="btn-primary">
            Create
          </button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Type</th>
            <th>Converted</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.email}</td>
              <td>
                {row.firstName} {row.lastName}
              </td>
              <td>{row.type}</td>
              <td>{row.isConverted ? "yes" : "no"}</td>
              <td>
                <span className={`pill ${row.active ? "approved" : "unapproved"}`}>
                  {row.active ? "active" : "inactive"}
                </span>
              </td>
              <td className="row-actions">
                <button className="btn-link" onClick={() => toggleActive(row)}>
                  {row.active ? "Deactivate" : "Activate"}
                </button>
                {row.type !== "registered" && (
                  <button className="btn-link" onClick={() => convert(row)}>
                    Convert
                  </button>
                )}
                <button className="btn-link danger" onClick={() => remove(row)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                No users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
