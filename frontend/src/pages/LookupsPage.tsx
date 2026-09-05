import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Lookup, LookupCategory } from "../api/types";

const CATEGORIES: { value: LookupCategory; label: string }[] = [
  { value: "sector", label: "Sectors" },
  { value: "unit", label: "Units" },
  { value: "service_type", label: "Service Types" },
  { value: "voltage_category", label: "Voltage Categories" },
  { value: "phase_wire", label: "Phase Wires" },
];

export function LookupsPage() {
  const [category, setCategory] = useState<LookupCategory>("sector");
  const [rows, setRows] = useState<Lookup[]>([]);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const result = await api.get<Lookup[]>(`/lookups/${category}`);
    setRows(result);
  }

  useEffect(() => {
    refresh();
  }, [category]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/lookups/${category}`, { code, label });
      setCode("");
      setLabel("");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: Lookup) {
    await api.put(`/lookups/${category}/${row.id}`, { active: !row.active });
    refresh();
  }

  async function remove(row: Lookup) {
    if (!confirm(`Delete "${row.label}"?`)) return;
    await api.delete(`/lookups/${category}/${row.id}`);
    refresh();
  }

  return (
    <div>
      <h1>URDB Lookups</h1>
      <p className="muted">
        Reference values used by the URDB rate form (sectors, units, service types, voltage categories, phase wires).
      </p>

      <div className="tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={`tab${category === c.value ? " active" : ""}`}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <form className="inline-form" onSubmit={handleAdd}>
        <input placeholder="Code (e.g. ssc_re)" value={code} onChange={(e) => setCode(e.target.value)} required />
        <input placeholder="Label (e.g. Residential)" value={label} onChange={(e) => setLabel(e.target.value)} required />
        <button type="submit" className="btn-primary" disabled={saving}>
          Add
        </button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Label</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.code}</td>
              <td>{row.label}</td>
              <td>
                <span className={`pill ${row.active ? "approved" : "unapproved"}`}>
                  {row.active ? "active" : "inactive"}
                </span>
              </td>
              <td className="row-actions">
                <button className="btn-link" onClick={() => toggleActive(row)}>
                  {row.active ? "Deactivate" : "Activate"}
                </button>
                <button className="btn-link danger" onClick={() => remove(row)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No values yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
