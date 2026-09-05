import { useEffect, useState, type ChangeEvent } from "react";
import { api } from "../api/client";
import type { GreenDataFile } from "../api/types";

export function GreenDataPage() {
  const [files, setFiles] = useState<GreenDataFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const result = await api.get<GreenDataFile[]>("/green-data");
    setFiles(result);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/green-data/upload", formData);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Green Data Files</h1>
        <label className="btn-primary file-input-label">
          {uploading ? "Uploading..." : "+ Upload File"}
          <input type="file" accept=".csv" hidden onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {error && <div className="alert-error">{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>File name</th>
            <th>Source</th>
            <th>Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.id}>
              <td>{f.realFileName}</td>
              <td>{f.isSample ? <span className="pill">sample</span> : "uploaded"}</td>
              <td>{new Date(f.uploadedAt).toLocaleString()}</td>
            </tr>
          ))}
          {files.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                No files yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
