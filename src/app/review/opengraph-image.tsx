import { ImageResponse } from "next/og";

export const alt = "Leave a Google Review for WrenchReady Mobile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ReviewOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#06101f",
          padding: "58px 70px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "76px",
              height: "76px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "18px",
              border: "2px solid #4ed6e8",
              background: "rgba(78,214,232,0.10)",
              color: "#4ed6e8",
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "0.16em",
            }}
          >
            WR
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                color: "#4ed6e8",
                fontSize: "17px",
                fontWeight: 800,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
              }}
            >
              WrenchReady Mobile
            </span>
            <span style={{ color: "#d8e2ee", fontSize: "27px", fontWeight: 650 }}>
              Spokane mobile auto service
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              width: "190px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "999px",
              border: "1px solid rgba(78,214,232,0.45)",
              background: "rgba(78,214,232,0.10)",
              color: "#a9f2fb",
              padding: "12px 18px",
              fontSize: "19px",
              fontWeight: 750,
            }}
          >
            5-star review
          </div>
          <h1
            style={{
              margin: 0,
              maxWidth: "890px",
              color: "#ffffff",
              fontSize: "60px",
              fontWeight: 820,
              lineHeight: 1.04,
            }}
          >
            Leave a Google review for WrenchReady
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: "790px",
              color: "rgba(216,226,238,0.76)",
              fontSize: "26px",
              lineHeight: 1.35,
            }}
          >
            Tap to open Google&apos;s star rating and review form.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(216,226,238,0.62)",
            fontSize: "19px",
            fontWeight: 650,
          }}
        >
          <span>wrenchreadymobile.com/review</span>
          <span>(509) 309-0617</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
