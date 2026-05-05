import { ImageResponse } from "next/og"
import { site } from "@/lib/content"

export const size = { width: 1200, height: 630 }
export const alt = "Diego Newsletter"
export const contentType = "image/png"

// OG image générée en code — aucun fichier à créer manuellement.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0A0A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "80px",
          fontFamily: "Georgia, serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Sunset glow */}
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            right: "-100px",
            width: "700px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(196,129,58,0.25) 0%, rgba(196,129,58,0.05) 50%, transparent 70%)",
          }}
        />
        {/* Top-left emerald accent */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "-80px",
            width: "400px",
            height: "300px",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(30,77,64,0.15) 0%, transparent 60%)",
          }}
        />

        {/* Gold line */}
        <div
          style={{
            position: "absolute",
            top: "80px",
            left: "80px",
            right: "80px",
            height: "1px",
            background:
              "linear-gradient(to right, rgba(196,129,58,0.6), transparent)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Label */}
          <p
            style={{
              color: "rgba(196,129,58,0.8)",
              fontSize: "14px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              margin: "0 0 8px 0",
              fontFamily: "Georgia, serif",
            }}
          >
            Newsletter hebdomadaire — Antsiranana, Madagascar
          </p>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "0" }}>
            <span
              style={{
                color: "#F5F1E8",
                fontSize: "100px",
                fontWeight: 900,
                lineHeight: 0.88,
                letterSpacing: "-0.03em",
              }}
            >
              Diego
            </span>
            <span
              style={{
                color: "#C4813A",
                fontSize: "100px",
                fontWeight: 900,
                lineHeight: 0.88,
              }}
            >
              .
            </span>
          </div>

          {/* Tagline */}
          <p
            style={{
              color: "rgba(245,241,232,0.45)",
              fontSize: "24px",
              margin: "8px 0 0 0",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 400,
            }}
          >
            {site.tagline}
          </p>
        </div>

        {/* Bottom line */}
        <div
          style={{
            position: "absolute",
            bottom: "80px",
            right: "80px",
            color: "rgba(245,241,232,0.15)",
            fontSize: "13px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {site.url}
        </div>
      </div>
    ),
    { ...size },
  )
}
