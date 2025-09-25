export const metadata = {
  title: "Etsy Shop Grader",
  description: "Paste your Etsy shop URL. Get a quick grade + fixes."
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
          <main>{children}</main>
          <aside>
            {/* Sidebar Ad (non-intrusive) */}
            <div style={{ position: "sticky", top: 16, border: "1px dashed #ccc", padding: 16, borderRadius: 12 }}>
              <b>Ad space</b>
              <p style={{ marginTop: 8, fontSize: 14 }}>Your 300×250/300×600 here.</p>
            </div>
          </aside>
        </div>
        <footer style={{ borderTop: "1px solid #eee", padding: 16, textAlign: "center" }}>
          <div style={{ display: "inline-block", minWidth: 320, border: "1px dashed #ccc", padding: 12, borderRadius: 12 }}>
            <b>Bottom Ad</b>
            <div style={{ fontSize: 13, opacity: 0.8 }}>728×90 or responsive</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
