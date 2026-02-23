// Place this file at: /app/api/invite/route.js

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, redirectUrl, resend } = await request.json();

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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // If resending, delete the old auth user first so we can send a fresh invite
    if (resend) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        // Only delete if they haven't created a profile yet (no real account)
        const { data: hasProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', existingUser.id)
          .single();
        
        if (!hasProfile) {
          await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        } else {
          return NextResponse.json({ 
            success: true, 
            alreadyExists: true,
            message: 'Cet utilisateur a déjà activé son compte.'
          });
        }
      }
    }

    // inviteUserByEmail: creates user + sends invite email
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: redirectUrl || `${supabaseUrl}/customer`,
        data: { invited: true }
      }
    );

    if (error) {
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
      message: resend ? 'Invitation resent' : 'Invitation email sent'
    });

  } catch (err) {
    console.error('Invite API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
