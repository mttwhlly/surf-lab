import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get current surf data (simplified for OG image)
    const waveHeight = searchParams.get('height') || '2-3';
    const condition = searchParams.get('condition') || 'Fun';
    const wind = searchParams.get('wind') || '5';
    const temp = searchParams.get('temp') || '72';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(45deg, #e6f3ff 0%, #b3daff 100%)',
            fontSize: 32,
            fontWeight: 600,
          }}
        >
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            marginBottom: '40px'
          }}>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: 'bold',
              color: '#0077cc',
              marginBottom: '10px'
            }}>
              🌊 Can I Surf Today?
            </div>
            <div style={{ 
              fontSize: '28px', 
              color: '#333',
              marginBottom: '20px'
            }}>
              St. Augustine, Florida
            </div>
          </div>

          {/* Main Conditions */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            width: '100%',
            maxWidth: '800px',
            padding: '0 40px'
          }}>
            {/* Wave Height */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '15px',
              minWidth: '150px'
            }}>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
                WAVES
              </div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0077cc' }}>
                {waveHeight}ft
              </div>
            </div>

            {/* Condition */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '15px',
              minWidth: '150px'
            }}>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
                CONDITIONS
              </div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#22c55e' }}>
                {condition}
              </div>
            </div>

            {/* Wind */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '15px',
              minWidth: '150px'
            }}>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
                WIND
              </div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0077cc' }}>
                {wind}kts
              </div>
            </div>

            {/* Temperature */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '15px',
              minWidth: '150px'
            }}>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
                WATER
              </div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0077cc' }}>
                {temp}°F
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '40px',
            fontSize: '20px',
            color: '#666',
            textAlign: 'center'
          }}>
            Real-time AI-powered surf conditions • Updated 4x daily
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`Failed to generate OG image: ${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}