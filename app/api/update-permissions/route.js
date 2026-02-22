// Place this file at: /app/api/update-permissions/route.js

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { memberId, adminId, companyId, permissions } = await request.json();

    if (!memberId || !adminId || !companyId || !permissions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Verify the requesting user is an admin of the same company
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, company_id')
      .eq('id', adminId)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin' || adminProfile.company_id !== companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify the target member belongs to the same company
    const { data: memberProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', memberId)
      .single();

    if (!memberProfile || memberProfile.company_id !== companyId) {
      return NextResponse.json({ error: 'Member not found in company' }, { status: 404 });
    }

    // Update permissions
    const updateData = {};
    if (permissions.role !== undefined) updateData.role = permissions.role;
    if (permissions.can_view !== undefined) updateData.can_view = permissions.can_view;
    if (permissions.can_request !== undefined) updateData.can_request = permissions.can_request;
    if (permissions.can_invoice !== undefined) updateData.can_invoice = permissions.can_invoice;
    if (permissions.invitation_status !== undefined) updateData.invitation_status = permissions.invitation_status;

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', memberId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Update permissions error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
