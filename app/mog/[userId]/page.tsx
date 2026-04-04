"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase. Returns a dummy client if environment variables fail.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default function MogChallengePage({ params }: PageProps) {
  // Handle Next.js 15 params API
  const unwrappedParams = typeof (params as any).then === 'function' 
    ? use(params as Promise<{ userId: string }>) 
    : params as unknown as { userId: string };
    
  const userId = unwrappedParams.userId;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [profile, setProfile] = useState<{ id: string, username: string, avatar_url: string, aura_score: number } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_key, username, avatar_url, aura_score')
          .eq('username', userId)
          .single();
          
        if (error || !data) {
          setError(true);
        } else {
          setProfile({ id: data.user_key, username: data.username, avatar_url: data.avatar_url, aura_score: data.aura_score });
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, [userId]);

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Top bar */}
        <div style={{ padding: '24px 24px 16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em' }}>
            MAXIFY
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {loading && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', backgroundColor: '#1a1a1a', marginBottom: '16px' }} />
              <div style={{ width: '120px', height: '24px', backgroundColor: '#1a1a1a', borderRadius: '4px', marginBottom: '8px' }} />
              <div style={{ width: '40px', height: '12px', backgroundColor: '#1a1a1a', borderRadius: '2px', marginBottom: '4px' }} />
              <div style={{ width: '60px', height: '32px', backgroundColor: '#1a1a1a', borderRadius: '4px' }} />
              
              <div style={{ width: '100%', height: '1px', backgroundColor: '#1a1a1a', margin: '32px 0' }} />
              
              <div style={{ width: '80%', height: '36px', backgroundColor: '#1a1a1a', borderRadius: '4px', marginBottom: '12px' }} />
              <div style={{ width: '60%', height: '16px', backgroundColor: '#1a1a1a', borderRadius: '4px' }} />
              
              <div style={{ width: '100%', height: '52px', backgroundColor: '#1a1a1a', borderRadius: '12px', marginTop: '40px' }} />
            </div>
          )}
          
          {error && !loading && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#888888', fontSize: '14px' }}>This mog battle link has expired.</p>
            </div>
          )}

          {!loading && profile && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
              
              {/* Profile section */}
              <div style={{ 
                width: '96px', 
                height: '96px', 
                borderRadius: '50%', 
                border: '1px solid #ffffff',
                backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none',
                backgroundColor: '#111',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: '16px'
              }} />
              
              <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0' }}>
                {profile.username || 'User'}
              </h2>
              
              <span style={{ color: '#666666', fontSize: '11px', letterSpacing: '0.15em', margin: '0 0 4px 0' }}>
                AURA
              </span>
              
              <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 'bold' }}>
                {profile.aura_score || 0}
              </span>
              
              {/* Divider */}
              <div style={{ width: '100%', height: '1px', backgroundColor: '#1a1a1a', margin: '32px 0' }} />
              
              {/* Challenge section */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <h1 style={{ color: '#ffffff', fontSize: '32px', fontWeight: 'bold', lineHeight: 1.1, margin: '0 0 8px 0' }}>
                  Can you MOG {profile.username}?
                </h1>
                <p style={{ color: '#888888', fontSize: '14px', margin: 0, marginTop: '8px' }}>
                  Battle for aura. One face wins.
                </p>
              </div>
              
              {/* CTA Button */}
              <button 
                onClick={() => router.push(`/mog/battle/${userId}`)}
                style={{
                  width: '100%',
                  height: '52px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  letterSpacing: '0.08em',
                  borderRadius: '12px',
                  border: 'none',
                  marginTop: '40px',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                onTouchStart={(e) => e.currentTarget.style.opacity = '0.8'}
                onTouchEnd={(e) => e.currentTarget.style.opacity = '1'}
              >
                START MOG BATTLE
              </button>
              
              {/* Footer note */}
              <p style={{ color: '#555555', fontSize: '11px', textAlign: 'center', margin: '20px 0 32px 0' }}>
                Your result stays anonymous
              </p>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
