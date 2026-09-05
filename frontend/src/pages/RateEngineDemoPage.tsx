import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { api, ApiClientError } from "../api/client";
import type { CalculateBillResponse, GreenDataFile, Lookup } from "../api/types";
import { US_STATES } from "../constants/usStates";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface RateEngineDemoPageProps {
  responseType: "monthly" | "daily";
}

export function RateEngineDemoPage({ responseType }: RateEngineDemoPageProps) {
  const [state, setState] = useState("");
  const [utility, setUtility] = useState("");
  const [utilities, setUtilities] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const sectors = useLookupSectors();
  const [rateName, setRateName] = useState("");
  const [rateNames, setRateNames] = useState<string[]>([]);

  const [files, setFiles] = useState<GreenDataFile[]>([]);
  const [uploadedFileId, setUploadedFileId] = useState<number | "">("");
  const [sampleFileId, setSampleFileId] = useState<number | "">("");
  const [uploading, setUploading] = useState(false);

  const [result, setResult] = useState<CalculateBillResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function refreshFiles() {
    api.get<GreenDataFile[]>("/green-data").then(setFiles);
  }

  useEffect(() => {
    refreshFiles();
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

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/green-data/upload", formData);
      refreshFiles();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleReset() {
    setState("");
    setUtility("");
    setSector("");
    setRateName("");
    setUploadedFileId("");
    setSampleFileId("");
    setResult(null);
    setError(null);
  }

  async function handleCalculate(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const greenDataFileId = uploadedFileId || sampleFileId;
    if (!state || !utility || !sector || !greenDataFileId) {
      setError("State, Utility, Sector, and a green-data file are required.");
      return;
    }
    if (!rateName) {
      setError("Rate Name is required.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await api.post<CalculateBillResponse>("/rate-engine/calculate", {
        utility,
        sector,
        name: rateName,
        greenDataFileId,
        responseType,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  }

  const uploadedFiles = files.filter((f) => !f.isSample);
  const sampleFiles = files.filter((f) => f.isSample);

  const monthlyTotal = result?.monthly?.reduce((sum, m) => sum + m.total, 0) ?? 0;
  const dailyTotal = result?.daily?.reduce((sum, d) => sum + d.total, 0) ?? 0;

  return (
    <div>
      <div className="urdb-card">
        <div className="urdb-card-header">
          <span>Utility Rate Engine (Demo)</span>
        </div>

        <form className="urdb-filter-form" onSubmit={handleCalculate}>
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
            <label>Upload Green Data :</label>
            <div>
              <input type="file" accept=".csv" onChange={handleUpload} disabled={uploading} />
              {uploading && <span className="muted"> Uploading...</span>}
              <div className="muted" style={{ fontSize: "0.78rem", marginTop: "0.3rem" }}>
                Upload New Maximum 1 year Green Data File (Supported format .csv)
              </div>
            </div>
          </div>
          <div className="filter-row">
            <label>* Select Uploaded Green Data :</label>
            <select
              value={uploadedFileId}
              onChange={(e) => {
                setUploadedFileId(Number(e.target.value) || "");
                if (e.target.value) setSampleFileId("");
              }}
            >
              <option value="">Select</option>
              {uploadedFiles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.realFileName}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <label style={{ textAlign: "right", width: 160 }}>OR</label>
            <span />
          </div>
          <div className="filter-row">
            <label>* Sample Green Data :</label>
            <select
              value={sampleFileId}
              onChange={(e) => {
                setSampleFileId(Number(e.target.value) || "");
                if (e.target.value) setUploadedFileId("");
              }}
            >
              <option value="">Select</option>
              {sampleFiles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.realFileName}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-actions">
            <button type="button" className="btn-link" onClick={handleReset}>
              ⟲ Reset
            </button>
            <button type="submit" className="btn-search" disabled={loading}>
              📊 {loading ? "Calculating..." : "Calculate"}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {result && responseType === "monthly" && result.monthly && (
        <div className="card">
          <h2>
            {result.rate.name} — {result.rate.utility}
          </h2>
          <p className="muted">
            Interval: {result.greenDataDurationMinutes} min · Range:{" "}
            {new Date(result.greenDataRange.start).toLocaleDateString()} –{" "}
            {new Date(result.greenDataRange.end).toLocaleDateString()}
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Energy (kWh)</th>
                <th>Energy ($)</th>
                <th>Demand ($)</th>
                <th>Flat Demand ($)</th>
                <th>Fixed ($)</th>
                <th>Total ($)</th>
              </tr>
            </thead>
            <tbody>
              {result.monthly.map((m) => (
                <tr key={`${m.year}-${m.month}`}>
                  <td>
                    {MONTH_NAMES[m.month - 1]} {m.year}
                  </td>
                  <td>{m.energy.consumptionTotal.toFixed(2)}</td>
                  <td>{m.energy.contributionTotal.toFixed(2)}</td>
                  <td>{m.demand.contributionTotal.toFixed(2)}</td>
                  <td>{m.flatDemand.contributionTotal.toFixed(2)}</td>
                  <td>{m.fixedCharge.toFixed(2)}</td>
                  <td>
                    <strong>{m.total.toFixed(2)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}>Grand total</td>
                <td>
                  <strong>${monthlyTotal.toFixed(2)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {result && responseType === "daily" && result.daily && (
        <div className="card">
          <h2>
            {result.rate.name} — {result.rate.utility}
          </h2>
          <p className="muted">
            Interval: {result.greenDataDurationMinutes} min · Range:{" "}
            {new Date(result.greenDataRange.start).toLocaleDateString()} –{" "}
            {new Date(result.greenDataRange.end).toLocaleDateString()}
          </p>
          <p className="muted">Flat/seasonal demand and fixed/minimum monthly charges aren't shown here (monthly-only concepts).</p>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Energy (kWh)</th>
                <th>Energy ($)</th>
                <th>Demand ($)</th>
                <th>Total ($)</th>
              </tr>
            </thead>
            <tbody>
              {result.daily.map((d) => (
                <tr key={`${d.year}-${d.month}-${d.day}`}>
                  <td>
                    {MONTH_NAMES[d.month - 1]} {d.day}, {d.year}
                  </td>
                  <td>{d.energy.consumptionTotal.toFixed(2)}</td>
                  <td>{d.energy.contributionTotal.toFixed(2)}</td>
                  <td>{d.demand.contributionTotal.toFixed(2)}</td>
                  <td>
                    <strong>{d.total.toFixed(2)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Grand total</td>
                <td>
                  <strong>${dailyTotal.toFixed(2)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function useLookupSectors() {
  const [rows, setRows] = useState<Lookup[]>([]);
  useEffect(() => {
    api.get<Lookup[]>("/lookups/sector").then(setRows);
  }, []);
  return rows;
}
