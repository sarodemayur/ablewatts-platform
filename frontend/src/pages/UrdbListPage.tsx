import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { UrdbRate, UrdbRateListResponse } from "../api/types";
import { US_STATES } from "../constants/usStates";
import { EyeIcon, PencilIcon, PlusIcon, ResetIcon, SearchIcon, ThumbsDownIcon, ThumbsUpIcon, TrashIcon } from "../components/icons";

const ORDER_OPTIONS = [
  { value: "updatedAt", label: "Latest Update" },
  { value: "utility", label: "Utility Name" },
  { value: "name", label: "Rate Name" },
  { value: "startDate", label: "Effective Date" },
];

export function UrdbListPage() {
  const [state, setState] = useState("");
  const [utility, setUtility] = useState("");
  const [utilities, setUtilities] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [effectiveAsOf, setEffectiveAsOf] = useState("");
  const [status, setStatus] = useState("");
  const [orderBy, setOrderBy] = useState("updatedAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const [rows, setRows] = useState<UrdbRate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state) {
      setUtilities([]);
      setUtility("");
      return;
    }
    api.get<string[]>(`/urdb-rates/filters/utilities?state=${encodeURIComponent(state)}`).then(setUtilities);
  }, [state]);

  async function search() {
    setLoading(true);
    const params = new URLSearchParams();
    if (state) params.set("state", state);
    if (utility) params.set("utility", utility);
    if (sector) params.set("sector", sector);
    if (effectiveAsOf) params.set("effectiveAsOf", effectiveAsOf);
    if (status) params.set("status", status);
    params.set("orderBy", orderBy);
    params.set("direction", direction);
    params.set("limit", "100");

    const result = await api.get<UrdbRateListResponse>(`/urdb-rates?${params.toString()}`);
    setRows(result.rows);
    setTotal(result.total);
    setLoading(false);
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    search();
  }

  function handleReset() {
    setState("");
    setUtility("");
    setSector("");
    setEffectiveAsOf("");
    setStatus("");
    setOrderBy("updatedAt");
    setDirection("desc");
    setTimeout(search, 0);
  }

  async function toggleApproval(rate: UrdbRate) {
    const action = rate.status === "approved" ? "unapprove" : "approve";
    await api.post(`/urdb-rates/${rate.id}/${action}`);
    search();
  }

  async function remove(rate: UrdbRate) {
    if (!confirm(`Delete rate "${rate.name}"?`)) return;
    await api.delete(`/urdb-rates/${rate.id}`);
    search();
  }

  return (
    <div>
      <div className="urdb-card">
        <div className="urdb-card-header">
          <span>Utility Rate Database</span>
          <Link to="/urdb-rates/new" className="icon-square-btn" title="Add Utility Rate">
            <PlusIcon />
          </Link>
        </div>

        <form className="urdb-filter-form" onSubmit={handleSearch}>
          <div className="filter-row">
            <label>State :</label>
            <select value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Select</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <label>Utility Name :</label>
            <select value={utility} onChange={(e) => setUtility(e.target.value)} disabled={!state}>
              <option value="">{state ? "All" : "Empty"}</option>
              {utilities.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <label>Sector(s):</label>
            <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. Residential" />
          </div>
          <div className="filter-row">
            <label>Effective As Of :</label>
            <input type="date" value={effectiveAsOf} onChange={(e) => setEffectiveAsOf(e.target.value)} />
          </div>
          <div className="filter-row">
            <label>Approved/Unapproved :</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="approved">Approved</option>
              <option value="unapproved">Unapproved</option>
            </select>
          </div>
          <div className="filter-row">
            <label>Order By :</label>
            <select value={orderBy} onChange={(e) => setOrderBy(e.target.value)}>
              {ORDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <label>Display Results :</label>
            <div className="radio-group">
              <label className="radio-label">
                <input type="radio" checked={direction === "asc"} onChange={() => setDirection("asc")} /> Ascending
              </label>
              <label className="radio-label">
                <input type="radio" checked={direction === "desc"} onChange={() => setDirection("desc")} /> Descending
              </label>
            </div>
          </div>

          <div className="filter-actions">
            <button type="button" className="btn-link" onClick={handleReset}>
              <ResetIcon size={14} /> Reset
            </button>
            <button type="submit" className="btn-search">
              <SearchIcon size={14} /> Search
            </button>
          </div>
        </form>
      </div>

      <div className="urdb-result-banner">{total} result{total === 1 ? "" : "s"}</div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Utility Name</th>
              <th>Rate Name</th>
              <th>Supersedes</th>
              <th>Sector</th>
              <th>Approved</th>
              <th>Effective Date</th>
              <th>End Date</th>
              <th>Latest Update</th>
              <th>Created By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rate) => (
              <tr key={rate.id}>
                <td>{rate.utility}</td>
                <td>{rate.name}</td>
                <td>{rate.supersedesLabel ?? "—"}</td>
                <td>{rate.sector}</td>
                <td>
                  <span className={`pill ${rate.status}`}>{rate.status}</span>
                </td>
                <td>{new Date(rate.startDate).toLocaleDateString()}</td>
                <td>{rate.endDate ? new Date(rate.endDate).toLocaleDateString() : "—"}</td>
                <td>{new Date(rate.updatedAt).toLocaleDateString()}</td>
                <td>{rate.createdBy ? `${rate.createdBy.firstName} ${rate.createdBy.lastName}` : "—"}</td>
                <td className="row-actions">
                  <Link to={`/urdb-rates/${rate.id}?mode=view`} className="icon-btn" title="View">
                    <EyeIcon size={15} />
                  </Link>
                  <Link to={`/urdb-rates/${rate.id}`} className="icon-btn" title="Edit">
                    <PencilIcon size={15} />
                  </Link>
                  <button
                    className="icon-btn"
                    title={rate.status === "approved" ? "Unapprove" : "Approve"}
                    onClick={() => toggleApproval(rate)}
                  >
                    {rate.status === "approved" ? <ThumbsDownIcon size={15} /> : <ThumbsUpIcon size={15} />}
                  </button>
                  <button className="icon-btn danger" title="Delete" onClick={() => remove(rate)}>
                    <TrashIcon size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="muted">
                  No rates found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div className="action-legend">
        <span>
          <EyeIcon size={14} /> View
        </span>
        <span>
          <PencilIcon size={14} /> Edit
        </span>
        <span>
          <ThumbsUpIcon size={14} /> Approve
        </span>
        <span>
          <ThumbsDownIcon size={14} /> Unapprove
        </span>
        <span>
          <TrashIcon size={14} /> Delete
        </span>
      </div>
    </div>
  );
}
