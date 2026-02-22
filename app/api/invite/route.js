// Place this file at: /app/api/invite/route.js
//
// Server-side API route to invite users via email.
// Uses SUPABASE_SERVICE_ROLE_KEY (add to your Vercel env vars).
// Supabase's inviteUserByEmail() creates the auth user AND sends the invite email.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, redirectUrl } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server config error: SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      );
    }

    // Admin client (service_role bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // inviteUserByEmail: creates user + sends invite email in one call
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: redirectUrl || `${supabaseUrl}/customer`,
        data: { invited: true }
      }
    );

    if (error) {
      // If user already exists, that's okay
      if (error.message?.includes('already been registered') || 
          error.message?.includes('already exists') ||
          error.message?.includes('unique')) {
        return NextResponse.json({ 
          success: true, 
          alreadyExists: true,
          message: 'Cet utilisateur a déjà un compte.'
        });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      userId: data?.user?.id,
      message: 'Invitation email sent'
    });

  } catch (err) {
    console.error('Invite API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
