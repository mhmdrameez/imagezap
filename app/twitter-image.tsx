import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #171717 45%, #262626 100%)",
          color: "white",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <div style={{ width: 980, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1.2 }}>
            Bulk Image Resizer
          </div>
          <div style={{ fontSize: 30, opacity: 0.9, lineHeight: 1.35 }}>
            Fast, privacy-friendly image optimization.
          </div>
          <div style={{ fontSize: 22, opacity: 0.85 }}>
            Everything runs locally in your browser.
          </div>
        </div>
      </div>
    ),
    size,
  );
}

