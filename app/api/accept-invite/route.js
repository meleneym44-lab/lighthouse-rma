// Place this file at: /app/api/accept-invite/route.js
//
// Server-side route to process invite acceptance.
// Called when a user arrives with a session but no profile.
// Uses service_role key to bypass RLS on team_invitations and profiles.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId, userEmail, fullName, phone } = await request.json();

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'userId and userEmail are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server config error: SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return NextResponse.json({ success: true, alreadyExists: true });
    }

    // Find pending invite for this email
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invitations')
      .select('*')
      .eq('email', userEmail.toLowerCase())
      .is('accepted_at', null)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'No pending invitation found for this email' },
        { status: 404 }
      );
    }

    // Create profile from invite
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      email: userEmail.toLowerCase(),
      full_name: fullName || userEmail.split('@')[0],
      phone: phone || null,
      role: invite.role || 'customer',
      company_id: invite.company_id,
      invitation_status: 'active',
      can_view: invite.can_view !== false,
      can_request: !!invite.can_request,
      can_invoice: !!invite.can_invoice
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // Mark invite as accepted
    await supabaseAdmin
      .from('team_invitations')
      .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq('id', invite.id);

    // Ensure email is confirmed (needed for password reset to work later)
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true
    });

    return NextResponse.json({ 
      success: true,
      companyId: invite.company_id,
      role: invite.role || 'customer'
    });

  } catch (err) {
    console.error('Accept invite API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
