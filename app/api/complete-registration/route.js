// Place this file at: /app/api/complete-registration/route.js

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId, userEmail, contactName, phone, companyName, address, city, postalCode, country, siret, vatNumber, chorusInvoicing, chorusServiceCode } = await request.json();

    if (!userId || !userEmail || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if profile already exists
    const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).single();
    if (existing) {
      return NextResponse.json({ success: true, alreadyExists: true });
    }

    // Create company
    const { data: company, error: companyErr } = await supabaseAdmin.from('companies').insert({
      name: companyName,
      billing_address: address || null,
      billing_city: city || null,
      billing_postal_code: postalCode || null,
      country: country || 'France',
      siret: siret || null,
      tva_number: vatNumber || null,
      phone: phone || null,
      email: userEmail,
      chorus_invoicing: chorusInvoicing || false,
      chorus_service_code: chorusInvoicing ? (chorusServiceCode || null) : null
    }).select().single();

    if (companyErr) {
      return NextResponse.json({ error: companyErr.message }, { status: 400 });
    }

    // Create profile as admin
    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      email: userEmail.toLowerCase(),
      full_name: contactName || userEmail.split('@')[0],
      role: 'admin',
      company_id: company.id,
      phone: phone || null,
      invitation_status: 'active',
      can_view: true,
      can_request: true,
      can_invoice: true
    });

    if (profileErr) {
      // Cleanup company if profile fails
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    // Create default shipping address
    await supabaseAdmin.from('shipping_addresses').insert({
      company_id: company.id,
      label: 'Principal',
      address_line1: address || '',
      city: city || '',
      postal_code: postalCode || '',
      country: country || 'France',
      is_default: true
    });

    // Confirm email
    await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });

    return NextResponse.json({ success: true, companyId: company.id });

  } catch (err) {
    console.error('Complete registration error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
