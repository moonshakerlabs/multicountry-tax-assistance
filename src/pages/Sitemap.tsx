import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/appConfig";

const sections = [
  {
    title: "Public Pages",
    links: [
      { label: "Home", to: "/" },
      { label: "Pricing", to: "/pricing" },
      { label: "Blog", to: "/blog" },
      { label: "TaxOverFlow (Public)", to: "/taxoverflow" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms & Conditions", to: "/terms" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign In / Sign Up", to: "/auth" },
      { label: "Reset Password", to: "/reset-password" },
    ],
  },
  {
    title: "User Area",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Document Vault", to: "/vault" },
      { label: "AI Tools", to: "/ai-tools" },
      { label: "Community", to: "/community" },
      { label: "Profile", to: "/profile" },
      { label: "Support", to: "/support" },
    ],
  },
];

const Sitemap = () => (
  <div style={{ minHeight: "100vh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>{APP_NAME} — Sitemap</h1>
      <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: "2.5rem", fontSize: "0.95rem" }}>
        A complete overview of all pages on {APP_NAME}.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))", gap: "2rem" }}>
        {sections.map((s) => (
          <div key={s.title}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.75rem", color: "hsl(var(--primary))" }}>
              {s.title}
            </h2>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {s.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    style={{ color: "hsl(var(--foreground))", textDecoration: "none", fontSize: "0.9rem" }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "3rem", textAlign: "center" }}>
        <Link to="/" style={{ color: "hsl(var(--primary))", fontSize: "0.875rem" }}>← Back to Home</Link>
      </div>
    </div>
  </div>
);

export default Sitemap;
