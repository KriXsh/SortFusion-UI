import {ImageResponse} from 'next/og';

export const size = {width: 64, height: 64};
export const contentType = 'image/png';

/** Four rising bars on the brand gradient. */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 5,
        padding: 13,
        borderRadius: 16,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6 55%, #06b6d4)',
      }}
    >
      {[14, 22, 30, 38].map(h => (
        <div
          key={h}
          style={{width: 7, height: h, borderRadius: 2, background: '#fff'}}
        />
      ))}
    </div>,
    size,
  );
}
