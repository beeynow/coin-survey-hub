import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface TheoremReachCallback {
  user_id: string;
  transaction_id: string;
  revenue: number;
  status: string;
  hash: string;
}

/**
 * Generate SHA-256 hash for TheoremReach verification
 * Format: SHA256(user_id + transaction_id + revenue + secret_key)
 */
async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[Callback] CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const timestamp = new Date().toISOString();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Callback:${requestId}] NEW REQUEST - ${timestamp}`);
  console.log(`[Callback:${requestId}] Method: ${req.method}`);
  console.log(`[Callback:${requestId}] URL: ${req.url}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Get secret key from environment
    const theoremReachSecretKey = Deno.env.get('THEOREMREACH_SECRET_KEY');
    
    if (!theoremReachSecretKey) {
      console.error(`[Callback:${requestId}] ❌ CRITICAL: Secret key not found in environment`);
      
      return new Response(JSON.stringify({ 
        error: 'Configuration error - Secret key missing',
        request_id: requestId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Callback:${requestId}] ✅ Secret key loaded (length: ${theoremReachSecretKey.length})`);

    // Parse the incoming payload
    const contentType = req.headers.get('content-type') || '';
    console.log(`[Callback:${requestId}] Content-Type: ${contentType}`);
    
    let payload: TheoremReachCallback;
    
    if (contentType.includes('application/json')) {
      console.log(`[Callback:${requestId}] Parsing JSON body...`);
      const rawPayload = await req.json();
      payload = {
        user_id: rawPayload.user_id || rawPayload.uid, // TheoremReach uses 'uid'
        transaction_id: rawPayload.transaction_id,
        revenue: rawPayload.revenue,
        status: rawPayload.status,
        hash: rawPayload.hash,
      };
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      console.log(`[Callback:${requestId}] Parsing form data...`);
      const formData = await req.formData();
      payload = {
        user_id: (formData.get('user_id') || formData.get('uid')) as string, // TheoremReach uses 'uid'
        transaction_id: formData.get('transaction_id') as string,
        revenue: parseFloat(formData.get('revenue') as string),
        status: formData.get('status') as string,
        hash: formData.get('hash') as string,
      };
    } else {
      // Try parsing as URL parameters
      console.log(`[Callback:${requestId}] Parsing URL parameters...`);
      const url = new URL(req.url);
      payload = {
        user_id: (url.searchParams.get('user_id') || url.searchParams.get('uid')) as string, // TheoremReach uses 'uid'
        transaction_id: url.searchParams.get('transaction_id') as string,
        revenue: parseFloat(url.searchParams.get('revenue') as string),
        status: url.searchParams.get('status') as string,
        hash: url.searchParams.get('hash') as string,
      };
    }

    console.log(`[Callback:${requestId}] 📦 Payload received:`);
    console.log(`[Callback:${requestId}]    User ID: ${payload.user_id}`);
    console.log(`[Callback:${requestId}]    Transaction ID: ${payload.transaction_id}`);
    console.log(`[Callback:${requestId}]    Revenue: $${payload.revenue}`);
    console.log(`[Callback:${requestId}]    Status: ${payload.status}`);
    console.log(`[Callback:${requestId}]    Hash: ${payload.hash ? payload.hash.slice(0, 16) + '...' : 'MISSING'}`);

    // Validate required fields
    if (!payload.user_id || !payload.transaction_id || payload.revenue === undefined || !payload.status || !payload.hash) {
      console.error(`[Callback:${requestId}] ❌ Missing required fields:`);
      console.error(`[Callback:${requestId}]    user_id: ${payload.user_id ? '✓' : '✗'}`);
      console.error(`[Callback:${requestId}]    transaction_id: ${payload.transaction_id ? '✓' : '✗'}`);
      console.error(`[Callback:${requestId}]    revenue: ${payload.revenue !== undefined ? '✓' : '✗'}`);
      console.error(`[Callback:${requestId}]    status: ${payload.status ? '✓' : '✗'}`);
      console.error(`[Callback:${requestId}]    hash: ${payload.hash ? '✓' : '✗'}`);
      
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        required: ['user_id', 'transaction_id', 'revenue', 'status', 'hash'],
        received: {
          user_id: !!payload.user_id,
          transaction_id: !!payload.transaction_id,
          revenue: payload.revenue !== undefined,
          status: !!payload.status,
          hash: !!payload.hash
        },
        request_id: requestId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the hash for security
    const stringToHash = `${payload.user_id}${payload.transaction_id}${payload.revenue}${theoremReachSecretKey}`;
    console.log(`[Callback:${requestId}] 🔐 Generating hash...`);
    console.log(`[Callback:${requestId}]    Format: user_id + transaction_id + revenue + secret_key`);
    
    const expectedHash = await generateHash(stringToHash);
    console.log(`[Callback:${requestId}]    Expected: ${expectedHash}`);
    console.log(`[Callback:${requestId}]    Received: ${payload.hash}`);
    console.log(`[Callback:${requestId}]    Match: ${payload.hash === expectedHash ? '✅' : '❌'}`);

    if (payload.hash !== expectedHash) {
      console.error(`[Callback:${requestId}] ❌ SECURITY ALERT: Hash verification FAILED!`);
      
      return new Response(JSON.stringify({ 
        error: 'Invalid hash - security verification failed',
        request_id: requestId
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Callback:${requestId}] ✅ Hash verified successfully!`);

    // Check survey status
    if (payload.status !== 'completed') {
      console.log(`[Callback:${requestId}] ⏭️ Survey status is '${payload.status}', not 'completed' - skipping reward`);
      return new Response(JSON.stringify({ 
        message: 'Survey not completed',
        status: payload.status,
        request_id: requestId
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Callback:${requestId}] ✅ Survey completed, processing reward...`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error(`[Callback:${requestId}] ❌ Supabase credentials missing`);
      throw new Error('Supabase configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`[Callback:${requestId}] ✅ Supabase client initialized`);

    // Convert revenue to coins (revenue in dollars, multiply by 100)
    const coinAmount = Math.round(payload.revenue * 100);
    console.log(`[Callback:${requestId}] 💰 Revenue: $${payload.revenue} → ${coinAmount} coins`);

    // Check for duplicate transaction
    console.log(`[Callback:${requestId}] 🔍 Checking for duplicate transaction...`);
    const { data: existingTx, error: checkError } = await supabase
      .from('coin_transactions')
      .select('id, created_at')
      .eq('survey_id', payload.transaction_id)
      .maybeSingle();

    if (checkError) {
      console.error(`[Callback:${requestId}] ❌ Error checking duplicates:`, checkError);
      throw checkError;
    }

    if (existingTx) {
      console.log(`[Callback:${requestId}] ⚠️ DUPLICATE TRANSACTION DETECTED!`);
      console.log(`[Callback:${requestId}]    Existing Transaction ID: ${existingTx.id}`);
      console.log(`[Callback:${requestId}]    Action: Skipping (already processed)`);
      
      return new Response(JSON.stringify({ 
        message: 'Transaction already processed',
        transaction_id: payload.transaction_id,
        coins_awarded: coinAmount,
        existing_record_id: existingTx.id,
        request_id: requestId
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Callback:${requestId}] ✅ No duplicate found, creating new transaction...`);

    // Create coin transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('coin_transactions')
      .insert({
        user_id: payload.user_id,
        amount: coinAmount,
        transaction_type: 'theoremreach_survey',
        survey_id: payload.transaction_id,
      })
      .select()
      .single();

    if (transactionError) {
      console.error(`[Callback:${requestId}] ❌ Error creating transaction:`, transactionError);
      throw transactionError;
    }

    console.log(`[Callback:${requestId}] ✅ Transaction created successfully!`);
    console.log(`[Callback:${requestId}]    Transaction ID: ${transaction.id}`);
    console.log(`[Callback:${requestId}]    Amount: ${coinAmount} coins`);

    // Verify user balance was updated
    console.log(`[Callback:${requestId}] 🔍 Verifying user balance update...`);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', payload.user_id)
      .single();

    if (profileError) {
      console.error(`[Callback:${requestId}] ⚠️ Error fetching profile:`, profileError);
    } else {
      console.log(`[Callback:${requestId}] ✅ User balance verified: ${profile.coin_balance} coins`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Callback:${requestId}] ✅✅✅ SUCCESS ✅✅✅`);
    console.log(`[Callback:${requestId}] User ${payload.user_id} awarded ${coinAmount} coins`);
    console.log(`[Callback:${requestId}] Transaction ${payload.transaction_id} processed`);
    console.log(`${'='.repeat(60)}\n`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Reward processed successfully',
      data: {
        coins_awarded: coinAmount,
        user_id: payload.user_id,
        transaction_id: payload.transaction_id,
        new_balance: profile?.coin_balance,
        timestamp: timestamp
      },
      request_id: requestId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(`\n${'='.repeat(60)}`);
    console.error(`[Callback:${requestId}] ❌❌❌ ERROR ❌❌❌`);
    console.error(`[Callback:${requestId}] Error: ${error.message}`);
    console.error(`[Callback:${requestId}] Stack: ${error.stack}`);
    console.error(`${'='.repeat(60)}\n`);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      request_id: requestId,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
