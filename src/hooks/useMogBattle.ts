import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { loadModels, scoreFace } from '@/src/lib/mogScoring';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/** Convert a 0-100 web score to a tier label matching native app logic (0-10 scale) */
function scoreTier(score100: number): string {
  const s = score100 / 10;
  if (s >= 9.0) return 'S-CLASS';
  if (s >= 8.0) return 'A-CLASS';
  if (s >= 7.0) return 'B-CLASS';
  if (s >= 6.0) return 'C-CLASS';
  if (s >= 5.0) return 'D-CLASS';
  return 'E-CLASS';
}

export function useMogBattle(userId: string) {
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [error, setError] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<string | null>(null);
  const [challengerAvatarUrl, setChallengerAvatarUrl] = useState<string | null>(null);

  // 1. Ensure this web traveler has a consistent UUID for Supabase compatibility
  const [webUserId] = useState(() => {
    if (typeof window === 'undefined') return crypto.randomUUID();
    let id = localStorage.getItem('maxify_web_uid');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('maxify_web_uid', id);
    }
    return id;
  });

  // Load models on mount
  useEffect(() => {
    async function init() {
      try {
        await loadModels();
        setIsLoadingModels(false);
      } catch (err) {
        console.error("Failed to load face-api models", err);
        setToastMessage("Failed to load scanning models");
      }
    }
    init();

    // Proactively fetch challenger avatar
    async function fetchAvatar() {
      try {
        let avatarUrl = null;

        // 1. Try to get the specific image they just took for a mog battle
        const { data: latestBattle } = await supabase
          .from('mog_battles')
          .select('challenger_image_url')
          .eq('challenger_username', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestBattle?.challenger_image_url) {
          avatarUrl = latestBattle.challenger_image_url;
        }

        // 2. Fallbacks
        if (!avatarUrl) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_key, avatar_url')
            .eq('username', userId)
            .maybeSingle();

          avatarUrl = profile?.avatar_url;

          if (!avatarUrl && profile?.user_key) {
             const { data: rmProfile } = await supabase
               .from('rate_me_profiles')
               .select('last_scan_image_url')
               .eq('anonymous_id', profile.user_key)
               .maybeSingle();
             avatarUrl = rmProfile?.last_scan_image_url;
          }

          if (!avatarUrl && profile?.user_key) {
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('avatar_url')
              .eq('user_id', profile.user_key)
              .maybeSingle();
            avatarUrl = userProfile?.avatar_url;
          }
        }

        if (avatarUrl) {
          setChallengerAvatarUrl(avatarUrl);
        }
      } catch (e) {
        console.error("Failed to fetch challenger avatar", e);
      }
    }
    if (userId) fetchAvatar();
  }, [userId]);



  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getDefenderScore = async (): Promise<any> => {
    try {
      // 1. Resolve AskOut slug to true device UUID
      const { data: askoutUser } = await supabase
        .from('askout_users')
        .select('device_id')
        .eq('slug', userId.toLowerCase())
        .maybeSingle();

      const deviceId = askoutUser?.device_id;
      let avatarUrl = null;

      // FIRST: Prioritize the specific photo they submitted for this explicit Mog Battle natively.
      const { data: latestBattle } = await supabase
        .from('mog_battles')
        .select('challenger_image_url')
        .eq('challenger_username', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestBattle?.challenger_image_url) {
        avatarUrl = latestBattle.challenger_image_url;
      }

      if (!avatarUrl && deviceId) {
        // Look up image in rate_me_profiles first (scan backup)
        const { data: rmProfile } = await supabase
          .from('rate_me_profiles')
          .select('last_scan_image_url')
          .eq('anonymous_id', deviceId)
          .maybeSingle();
          
        if (rmProfile?.last_scan_image_url) {
          avatarUrl = rmProfile.last_scan_image_url;
        }

        // Fallback to profiles
        if (!avatarUrl) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('user_key', deviceId)
            .maybeSingle();
          if (profile?.avatar_url) avatarUrl = profile.avatar_url;
        }
        
        if (!avatarUrl) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('avatar_url')
            .eq('user_id', deviceId)
            .maybeSingle();
          if (userProfile?.avatar_url) avatarUrl = userProfile.avatar_url;
        }
      }

      if (avatarUrl) {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = async () => {
            try {
              const score = await scoreFace(img);
              resolve(score || { jawline: 50, eyes: 50, skin: 50, symmetry: 50, total: 50 });
            } catch {
              resolve({ jawline: 50, eyes: 50, skin: 50, symmetry: 50, total: 50 });
            }
          };
          img.onerror = () => {
            resolve({ jawline: 50, eyes: 50, skin: 50, symmetry: 50, total: 50 });
          };
          img.src = avatarUrl;
        });
      }
    } catch (e) {
      console.error(e);
    }
    // Fallback if no avatar
    return { jawline: 50, eyes: 50, skin: 50, symmetry: 50, total: 50 };
  };

  const capture = async (mediaSource: HTMLImageElement) => {
    if (isLoadingModels) {
      showToast("Models still loading, please wait...");
      return;
    }

    setIsCapturing(true);

    try {
      // 1. Score Challenger (the person using camera)
      const challengerScore = await scoreFace(mediaSource);
      if (!challengerScore) {
        showToast("No face detected. Try again.");
        setIsCapturing(false);
        return;
      }

      // 2. Fetch and score Defender (the original link owner)
      const defenderScore = await getDefenderScore();

      // 3. Compare scores
      const defenderWins = defenderScore.total >= challengerScore.total;
      const winnerStr = defenderWins ? 'defender' : 'challenger';

      // Capture local snapshot for result page
      let localSnapshot = '';
      let opponentImageUrl = null;
      const canvas = document.createElement('canvas');
      canvas.width = mediaSource.width;
      canvas.height = mediaSource.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(mediaSource, 0, 0, canvas.width, canvas.height);
        localSnapshot = canvas.toDataURL('image/jpeg', 0.8);
      }
      sessionStorage.setItem('mog_latest_snapshot', localSnapshot);
      sessionStorage.setItem('mog_defender_score', JSON.stringify(defenderScore));
      sessionStorage.setItem('mog_challenger_score', JSON.stringify(challengerScore));

      // Fetch the actual pending battle so we can UPDATE it, rather than creating a zombie duplicate natively
      const { data: pendingBattle } = await supabase
        .from('mog_battles')
        .select('id, challenger_id')
        .eq('challenger_username', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Securely upload anonymous opponent blob up to Supabase to serve the Native App Inbox
      if (localSnapshot) {
        try {
          const res = await fetch(localSnapshot);
          const blob = await res.blob();
          
          // Use the validated bucket 'mog_battles' which we know the native app already set up as public.
          // Store it in the same isolated folder structure it expects
          const fileName = `${userId}/opponent_${crypto.randomUUID()}.jpg`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('mog_battles')
            .upload(fileName, blob, { contentType: 'image/jpeg' });

          if (!uploadErr && uploadData) {
             opponentImageUrl = supabase.storage
               .from('mog_battles')
               .getPublicUrl(uploadData.path).data.publicUrl;
          } else {
             console.error("Opponent image upload dropped by Supabase", uploadErr);
          }
        } catch (e) {
          console.error("Image upload failed securely", e);
        }
      }

      // Find defender's true UUID (user_key / device_id)
      const { data: userRow } = await supabase
        .from('askout_users')
        .select('device_id')
        .eq('slug', userId.toLowerCase())
        .maybeSingle();
        
      const realChallengerId = pendingBattle?.challenger_id || userRow?.device_id || userId;

      // 4. Write to Supabase — Match native mog_battles schema
      // If the native app generated a pending challenge, we MUST update it to avoid duplicate zombies.
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const battleUpdates = {
          opponent_id: webUserId,
          opponent_username: 'Web User',
          opponent_score: challengerScore.total / 10,   // web scales 0-100 to 0-10
          opponent_tier: scoreTier(challengerScore.total),
          opponent_image_url: opponentImageUrl,
          winner_id: defenderWins ? realChallengerId : webUserId,
          status: 'completed',
          updated_at: new Date().toISOString()
      };

      let finalBattleId;

      if (pendingBattle?.id) {
        // UPDATE Existing
        const { error: updateError } = await supabase
           .from('mog_battles')
           .update(battleUpdates)
           .eq('id', pendingBattle.id);
           
        if (updateError) throw updateError;
        finalBattleId = pendingBattle.id;
      } else {
        // FALLBACK: Insert brand new if they forced a battle on a generic link without natively creating it
        const { data, error: insertError } = await supabase
          .from('mog_battles')
          .insert({
            id: crypto.randomUUID(),
            challenger_id: realChallengerId,
            challenger_username: userId,
            challenger_score: defenderScore.total / 10,  
            challenger_tier: scoreTier(defenderScore.total),
            share_link: `askout.link/battle/mogbattle/${userId}`,
            created_at: new Date().toISOString(),
            expires_at: expiresAt,
            ...battleUpdates
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        finalBattleId = data.id;
      }

      // 5. Increment aura if defender won using Egyptian sacred numerology (7 = Perfection/Hathor, 9 = The Ennead)
      if (defenderWins && userRow?.device_id) {
        const ritualAmount = Math.random() > 0.5 ? 7 : 9;
        
        await supabase.rpc('increment_aura', {
          p_user_id: userRow.device_id,
          p_amount: ritualAmount,
          p_battle_id: finalBattleId
        });
      }

      // 6. Return result ID instead of navigating directly
      setBattleResult(finalBattleId);

    } catch (err) {
      console.error(err);
      showToast("An error occurred during analysis.");
      setIsCapturing(false);
    }
  };

  return {
    isLoadingModels,
    isCapturing,
    error,
    toastMessage,
    capture,
    battleResult,
    challengerAvatarUrl
  };
}
