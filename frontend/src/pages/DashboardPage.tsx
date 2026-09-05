import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { GreenDataFile, UrdbRateListResponse } from "../api/types";

export function DashboardPage() {
  const [rateCount, setRateCount] = useState<number | null>(null);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);
  const [fileCount, setFileCount] = useState<number | null>(null);

  useEffect(() => {
    api.get<UrdbRateListResponse>("/urdb-rates?limit=1").then((r) => setRateCount(r.total));
    api.get<UrdbRateListResponse>("/urdb-rates?status=approved&limit=1").then((r) => setApprovedCount(r.total));
    api.get<GreenDataFile[]>("/green-data").then((files) => setFileCount(files.length));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{rateCount ?? "…"}</div>
          <div className="stat-label">URDB Rates</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{approvedCount ?? "…"}</div>
          <div className="stat-label">Approved Rates</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{fileCount ?? "…"}</div>
          <div className="stat-label">Green Data Files</div>
        </div>
      </div>

      <div className="card">
        <h2>Quick actions</h2>
        <div className="quick-actions">
          <Link className="btn-primary" to="/urdb-rates/new">
            + New URDB Rate
          </Link>
          <Link className="btn-secondary" to="/rate-engine/monthly">
            Run Rate Engine (Monthly)
          </Link>
          <Link className="btn-secondary" to="/green-data">
            Manage Green Data
          </Link>
        </div>
      </div>
    </div>
  );
}
