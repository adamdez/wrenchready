import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          background: "linear-gradient(145deg, #ff7a1a 0%, #e55d00 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "0.08em",
          }}
        >
          WR
        </span>
      </div>
    ),
    { ...size },
  );
}
