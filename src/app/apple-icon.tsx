import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "40px",
          background: "linear-gradient(145deg, #0d1520 0%, #111a28 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span
          style={{
            fontSize: "72px",
            fontWeight: 800,
            color: "#ff7a1a",
            letterSpacing: "0.12em",
          }}
        >
          WR
        </span>
      </div>
    ),
    { ...size },
  );
}
