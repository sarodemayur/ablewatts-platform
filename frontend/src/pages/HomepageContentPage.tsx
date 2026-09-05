import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { HomepageContent, HomepageContentKey } from "../api/types";

const PAGES: { key: HomepageContentKey; label: string }[] = [
  { key: "about_us", label: "About Us" },
  { key: "contact_us", label: "Contact Us" },
  { key: "terms_of_service", label: "Terms of Service" },
  { key: "privacy_policy", label: "Privacy Policy" },
];

export function HomepageContentPage() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    api.get<HomepageContent[]>("/homepage-content").then((rows) => {
      const map: Record<string, string> = {};
      for (const row of rows) map[row.key] = row.content;
      setContent(map);
    });
  }, []);

  async function save(key: HomepageContentKey) {
    setSavingKey(key);
    try {
      await api.put(`/homepage-content/${key}`, { content: content[key] ?? "" });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div>
      <h1>Homepage Content</h1>
      <p className="muted">Static text shown to end users (About Us, Contact Us, Terms, Privacy Policy).</p>

      {PAGES.map((page) => (
        <div key={page.key} className="form-card">
          <h2>{page.label}</h2>
          <textarea
            rows={4}
            value={content[page.key] ?? ""}
            onChange={(e) => setContent((c) => ({ ...c, [page.key]: e.target.value }))}
          />
          <button className="btn-primary" onClick={() => save(page.key)} disabled={savingKey === page.key}>
            {savingKey === page.key ? "Saving..." : "Save"}
          </button>
        </div>
      ))}
    </div>
  );
}
