import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div style={{ fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
      📝
    </div>,
    { ...size },
  );
}
