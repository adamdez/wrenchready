import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Wrench Ready Mobile — Mobile Mechanic in Spokane, WA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #080c11 0%, #0d1520 40%, #111a28 100%)",
          padding: "60px 72px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              border: "2px solid rgba(255,122,26,0.35)",
              background: "rgba(255,122,26,0.08)",
              color: "#ff7a1a",
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "0.18em",
            }}
          >
            WR
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.3em",
                textTransform: "uppercase" as const,
                color: "#ff7a1a",
              }}
            >
              Wrench Ready
            </span>
            <span style={{ fontSize: "24px", fontWeight: 600, color: "#f0f0f0" }}>
              Mobile Auto Service
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#ffffff",
              margin: 0,
              maxWidth: "900px",
            }}
          >
            Mobile mechanic service built for repeat business.
          </h1>
          <p
            style={{
              fontSize: "22px",
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.6)",
              margin: 0,
              maxWidth: "800px",
            }}
          >
            Oil changes, brakes, batteries, diagnostics, and inspections at your driveway,
            curb, or workplace across Spokane County.
          </p>
        </div>

        <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
          {["Oil Change", "Brake Service", "Battery", "Diagnostics", "Inspections"].map(
            (s) => (
              <span
                key={s}
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase" as const,
                  color: "rgba(255,122,26,0.8)",
                  padding: "8px 16px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,122,26,0.25)",
                  background: "rgba(255,122,26,0.06)",
                }}
              >
                {s}
              </span>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
