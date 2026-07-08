import { ImageResponse } from "next/og";

// iOS home-screen / Safari tab icon — same cap/column/base mark as the
// favicon (app/icon.tsx), scaled up to Apple's recommended 180x180.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0FA37F",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 11,
        }}
      >
        <div style={{ width: 96, height: 17, background: "#FAFAFA", borderRadius: 6 }} />
        <div style={{ width: 39, height: 51, background: "#FAFAFA" }} />
        <div style={{ width: 118, height: 22, background: "#FAFAFA", borderRadius: 6 }} />
      </div>
    ),
    { ...size },
  );
}
