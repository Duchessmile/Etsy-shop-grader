'use client';

import { useState } from 'react';

type Grade = {
  letter: string;
  score: number;
  metrics: Record<string, number | string>;
  tips: string[];
};

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setGrade(null);
    try {
      const r = await fetch(`/api/grade?shop=${encodeURIComponent(input)}`);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setGrade(data);
    } catch (err: any) {
      setError(err.message || "Something broke.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Etsy Shop Grader</h1>
      <p style={{ color: "#555" }}>Paste your shop URL (e.g. <i>https://www.etsy.com/shop/YourShop</i>) or just the shop name, then hit Grade.</p>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Shop URL or name"
          required
          style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
        />
        <button disabled={loading} style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "white" }}>
          {loading ? "Grading..." : "Grade"}
        </button>
      </form>

      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      {grade && (
        <div style={{ marginTop: 24, border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Grade: {grade.letter} ({grade.score}/100)</h2>
          <h3 style={{ marginBottom: 8 }}>Key metrics</h3>
          <ul style={{ marginTop: 0 }}>
            {Object.entries(grade.metrics).map(([k, v]) => (
              <li key={k}><b>{k}:</b> {String(v)}</li>
            ))}
          </ul>
          <h3 style={{ marginBottom: 8 }}>Fix-first tips</h3>
          <ol style={{ marginTop: 0 }}>
            {grade.tips.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
