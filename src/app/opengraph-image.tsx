import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/seo/config';

export const alt = 'SYNQ — Get your business found online and find new customers';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Branded 1200x630 social card, generated at request time (no design asset needed). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #131c3a 0%, #0a0e1a 55%, #070a14 100%)',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0e1a',
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ color: '#e7ecff', fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>SYNQ</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ color: '#ffffff', fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 960 }}>
            Get found online. Get more customers.
          </div>
          <div style={{ color: '#9fb0d6', fontSize: 30, fontWeight: 400, lineHeight: 1.35, maxWidth: 900 }}>
            SYNQ helps your business get discovered and connects you with people ready to buy.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ height: 8, width: 56, borderRadius: 8, background: 'linear-gradient(90deg, #6366f1, #22d3ee)' }} />
          <div style={{ color: '#7f8fb8', fontSize: 26, fontWeight: 500 }}>
            {SITE.url.replace(/^https?:\/\//, '')}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
