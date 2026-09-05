import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Lookup, OtherAttributeRow, UrdbRateListResponse } from "../api/types";
import { US_STATES } from "../constants/usStates";
import { PlusIcon, ResetIcon, SearchIcon } from "../components/icons";

const GROUP_OPTIONS = [
  { value: "", label: "All" },
  { value: "demand", label: "Demand" },
  { value: "energy", label: "Energy" },
  { value: "fixed", label: "Fixed Charges" },
];

const ORDER_OPTIONS = [
  { value: "attribute", label: "Attribute" },
  { value: "utility", label: "Utility Name" },
  { value: "sector", label: "Sector" },
  { value: "name", label: "Rate Name" },
  { value: "updatedAt", label: "Latest Update" },
];

export function OtherAttributesPage() {
  const navigate = useNavigate();
  const [state, setState] = useState("");
  const [utility, setUtility] = useState("");
  const [utilities, setUtilities] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [sectors, setSectors] = useState<Lookup[]>([]);
  const [rateName, setRateName] = useState("");
  const [rateNames, setRateNames] = useState<string[]>([]);
  const [attributeGroup, setAttributeGroup] = useState("");
  const [orderBy, setOrderBy] = useState("attribute");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const [rows, setRows] = useState<OtherAttributeRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Lookup[]>("/lookups/sector").then(setSectors);
  }, []);

  useEffect(() => {
    if (!state) {
      setUtilities([]);
      setUtility("");
      return;
    }
    api.get<string[]>(`/urdb-rates/filters/utilities?state=${encodeURIComponent(state)}`).then(setUtilities);
  }, [state]);

  useEffect(() => {
    if (!utility || !sector) {
      setRateNames([]);
      return;
    }
    api
      .get<string[]>(`/urdb-rates/filters/names?utility=${encodeURIComponent(utility)}&sector=${encodeURIComponent(sector)}`)
      .then(setRateNames);
  }, [utility, sector]);

  async function search() {
    const params = new URLSearchParams();
    if (state) params.set("state", state);
    if (utility) params.set("utility", utility);
    if (sector) params.set("sector", sector);
    if (rateName) params.set("name", rateName);
    if (attributeGroup) params.set("attributeGroup", attributeGroup);
    params.set("orderBy", orderBy);
    params.set("direction", direction);

    const result = await api.get<OtherAttributeRow[]>(`/urdb-rates/other-attributes?${params.toString()}`);
    setRows(result);
    setSearched(true);
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    search();
  }

  function handleReset() {
    setState("");
    setUtility("");
    setSector("");
    setRateName("");
    setAttributeGroup("");
    setOrderBy("attribute");
    setDirection("desc");
    setRows([]);
    setSearched(false);
  }

  async function handleAdd() {
    setAddError(null);
    if (!state || !utility || !sector || !rateName) {
      setAddError("Select State, Utility, Sector, and Rate Name to add an attribute to a specific rate.");
      return;
    }
    const result = await api.get<UrdbRateListResponse>(
      `/urdb-rates?state=${encodeURIComponent(state)}&utility=${encodeURIComponent(utility)}&sector=${encodeURIComponent(sector)}&limit=200`
    );
    const match = result.rows.find((r) => r.name === rateName);
    if (!match) {
      setAddError("Could not find a matching rate.");
      return;
    }
    navigate(`/urdb-rates/${match.id}?tab=other-attributes`);
  }

  return (
    <div>
      <div className="urdb-card">
        <div className="urdb-card-header">
          <span>Other Attributes</span>
          <button type="button" className="icon-square-btn" title="Add Attribute" onClick={handleAdd}>
            <PlusIcon />
          </button>
        </div>

        <form className="urdb-filter-form" onSubmit={handleSearch}>
          <div className="filter-row">
            <label>* State :</label>
            <select value={state} onChange={(e) => setState(e.target.value)} required>
              <option value="">Select</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <label>* Utility Name :</label>
            <select value={utility} onChange={(e) => setUtility(e.target.value)} disabled={!state} required>
              <option value="">{state ? "Select" : "Empty"}</option>
              {utilities.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <label>* Sector :</label>
            <select value={sector} onChange={(e) => setSector(e.target.value)} required>
              <option value="">Select</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <label>Rate Name :</label>
            <select value={rateName} onChange={(e) => setRateName(e.target.value)} disabled={!utility || !sector}>
              <option value="">{utility && sector ? "Select" : "Empty"}</option>
              {rateNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <label>Select Attribute Group :</label>
            <select value={attributeGroup} onChange={(e) => setAttributeGroup(e.target.value)}>
              {GROUP_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
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

      {addError && <div className="alert-error">{addError}</div>}

      {searched && <div className="urdb-result-banner">Found {rows.length} rates for this search</div>}

      {searched && (
        <table className="table">
          <thead>
            <tr>
              <th>Attribute</th>
              <th>State</th>
              <th>Utility Name</th>
              <th>Sector</th>
              <th>Rate Name</th>
              <th>Attribute Group</th>
              <th>Status</th>
              <th>Latest Update</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="clickable-row" onClick={() => navigate(`/urdb-rates/${row.rateId}?tab=other-attributes`)}>
                <td>{row.attribute}</td>
                <td>{row.state ?? "—"}</td>
                <td>{row.utility}</td>
                <td>{row.sector}</td>
                <td>{row.name}</td>
                <td>{row.attributeGroup}</td>
                <td>
                  <span className={`pill ${row.status}`}>{row.status}</span>
                </td>
                <td>{new Date(row.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  No attributes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <p className="muted" style={{ marginTop: "1rem" }}>
        Timezone: New York (NY) USA (Eastern Timezone)
      </p>
    </div>
  );
}
