import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TheoremReachCallback {
  user_id: string;
  transaction_id: string;
  revenue: number;
  status: string;
  hash: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const theoremReachSecretKey = Deno.env.get('THEOREMREACH_SECRET_KEY');
    
    if (!theoremReachSecretKey) {
      console.error('TheoremReach Secret Key not configured');
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: TheoremReachCallback = await req.json();
    console.log('Received TheoremReach callback:', payload);

    // Verify the hash for security
    const expectedHash = await generateHash(
      payload.user_id,
      payload.transaction_id,
      payload.revenue.toString(),
      theoremReachSecretKey
    );

    if (payload.hash !== expectedHash) {
      console.error('Invalid hash verification');
      return new Response(JSON.stringify({ error: 'Invalid hash' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only process completed surveys
    if (payload.status !== 'completed') {
      console.log('Survey not completed, skipping:', payload.status);
      return new Response(JSON.stringify({ message: 'Survey not completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Award coins to user
    const coinAmount = Math.round(payload.revenue * 100); // Convert revenue to coins

    const { error: transactionError } = await supabase
      .from('coin_transactions')
      .insert({
        user_id: payload.user_id,
        amount: coinAmount,
        transaction_type: 'theoremreach_survey',
        survey_id: payload.transaction_id,
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      throw transactionError;
    }

    console.log(`Awarded ${coinAmount} coins to user ${payload.user_id}`);

    return new Response(JSON.stringify({ success: true, coins_awarded: coinAmount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing TheoremReach callback:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateHash(
  userId: string,
  transactionId: string,
  revenue: string,
  secretKey: string
): Promise<string> {
  const data = `${userId}${transactionId}${revenue}${secretKey}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
