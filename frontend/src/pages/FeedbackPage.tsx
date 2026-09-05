import { useEffect, useState } from "react";
import { api, downloadFile } from "../api/client";
import type { Feedback, FeedbackListResponse } from "../api/types";

export function FeedbackPage() {
  const [rows, setRows] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);

  async function refresh() {
    const result = await api.get<FeedbackListResponse>("/feedback?limit=100");
    setRows(result.rows);
    setTotal(result.total);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function remove(row: Feedback) {
    if (!confirm("Delete this feedback entry?")) return;
    await api.delete(`/feedback/${row.id}`);
    refresh();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Feedback ({total})</h1>
        <button className="btn-secondary" onClick={() => downloadFile("/csv/export/feedback", "feedback.csv")}>
          Export CSV
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>From</th>
            <th>Message</th>
            <th>Received</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.appUser?.email ?? row.email ?? row.name ?? "anonymous"}</td>
              <td>{row.message}</td>
              <td>{new Date(row.createdAt).toLocaleString()}</td>
              <td>
                <button className="btn-link danger" onClick={() => remove(row)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No feedback yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
