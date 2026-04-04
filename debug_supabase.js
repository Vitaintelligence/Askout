const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

console.log('Supabase URL linked:', supabaseUrl.substring(0, 25) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDebug() {
  console.log('=== Backend Area Debug Session ===\n');

  // 1. Check Profiles table (added aura_score)
  console.log('[1] Checking profiles table for top users & aura_score...');
  const { data: profData, error: profErr } = await supabase
    .from('profiles')
    .select('user_key, username, aura_score')
    .limit(3);
    
  if (profErr) {
    if (profErr.code === 'PGRST116') {
      console.log('  -> Need valid authenticated token to read profiles (expected under strict RLS)');
    } else {
      console.error('  -> Error:', profErr.message);
    }
  } else {
    console.log('  -> Success! Found', profData?.length, 'profiles.');
    if (profData?.length > 0) {
      console.log('  -> Sample aura_score is present:', profData[0].aura_score !== undefined ? 'YES' : 'NO');
    }
  }

  // 2. Check mog_battles table layout
  console.log('\n[2] Checking mog_battles schema update...');
  const { data: mogData, error: mogErr } = await supabase
    .from('mog_battles')
    .select('id, jawline_challenger, winner')
    .limit(1);

  if (mogErr) {
    if (mogErr.code === 'PGRST116') {
      console.log('  -> Need valid authenticated token to read mog_battles');
    } else if (mogErr.code === 'PGRST204') {
      console.log('  -> Error: Column not found (migration failed or not run!)');
    } else {
      console.error('  -> Error:', mogErr.message);
    }
  } else {
    console.log('  -> Success! New mog_battles columns (jawline_challenger, winner) exist.');
  }

  // 3. Confirm aura_transactions table presence
  console.log('\n[3] Checking aura_transactions presence...');
  const { data: txnData, error: txnErr } = await supabase
    .from('aura_transactions')
    .select('id')
    .limit(1);

  if (txnErr) {
    if (txnErr.message.includes('does not exist')) {
       console.log('  -> Error: aura_transactions table does not exist.');
    } else {
       console.log('  -> aura_transactions exists (could not fetch rows, likely RLS protection: ' + txnErr.message + ')');
    }
  } else {
    console.log('  -> Success! aura_transactions table exists.');
  }
}

runDebug();
