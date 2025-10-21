import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Bootstrap admin function called');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the current user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id, user.email);

    // Use the secure admin_exists() function
    const { data: adminExists, error: adminCheckError } = await supabaseAdmin
      .rpc('admin_exists');

    if (adminCheckError) {
      console.error('Error checking for existing admins:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Failed to check admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If admin already exists, no bootstrap needed
    if (adminExists) {
      console.log('Admin already exists, no bootstrap needed');
      return new Response(
        JSON.stringify({ 
          bootstrapped: false, 
          message: 'Admin already exists' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('No admin exists, bootstrapping current user as admin');

    // Create profile if it doesn't exist (without role field)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to create profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign admin role in user_roles table (SECURE METHOD)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin',
        assigned_by: user.id
      });

    if (roleError) {
      // Check if error is due to duplicate (already admin)
      if (roleError.code === '23505') {
        console.log('User already has admin role');
        return new Response(
          JSON.stringify({ 
            bootstrapped: false, 
            message: 'User already has admin role' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('Error assigning admin role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to assign admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully bootstrapped admin:', user.id);

    return new Response(
      JSON.stringify({ 
        bootstrapped: true, 
        message: 'User promoted to admin successfully',
        userId: user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in bootstrap-admin function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
