// ============================================
// /app/api/b2brouter/route.js
// B2BRouter e-invoicing API proxy
// All calls go through here — API key never exposed to browser
// ============================================

const B2B_API_URL = process.env.B2BROUTER_API_URL || 'https://api-staging.b2brouter.net';
const B2B_API_KEY = process.env.B2BROUTER_API_KEY;
const B2B_ACCOUNT_ID = process.env.B2BROUTER_ACCOUNT_ID;
const B2B_API_VERSION = process.env.B2BROUTER_API_VERSION || '2025-10-13';

function headers() {
  return {
    'X-B2B-API-Key': B2B_API_KEY,
    'X-B2B-API-Version': B2B_API_VERSION,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

function missingConfig() {
  const missing = [];
  if (!B2B_API_KEY) missing.push('B2BROUTER_API_KEY');
  if (!B2B_ACCOUNT_ID) missing.push('B2BROUTER_ACCOUNT_ID');
  return missing;
}

// ============================================
// GET handler — read operations
// ============================================
export async function GET(request) {
  const missing = missingConfig();
  if (missing.length > 0) {
    return Response.json({ error: `Missing env vars: ${missing.join(', ')}` }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // --- Test connection: just fetch account info ---
    if (action === 'test') {
      const res = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json({ success: true, account: data.account || data, api_version: B2B_API_VERSION, environment: B2B_API_URL.includes('staging') ? 'staging' : 'production' });
    }

    // --- Get account details ---
    if (action === 'account') {
      const res = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- List contacts ---
    if (action === 'contacts') {
      const offset = searchParams.get('offset') || '0';
      const limit = searchParams.get('limit') || '25';
      const name = searchParams.get('name') || '';
      let url = `${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/contacts?offset=${offset}&limit=${limit}`;
      if (name) url += `&name=${encodeURIComponent(name)}`;
      const res = await fetch(url, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- List issued invoices ---
    if (action === 'issued_invoices') {
      const offset = searchParams.get('offset') || '0';
      const limit = searchParams.get('limit') || '25';
      const res = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/invoices?type=IssuedInvoice&offset=${offset}&limit=${limit}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- List received invoices ---
    if (action === 'received_invoices') {
      const offset = searchParams.get('offset') || '0';
      const limit = searchParams.get('limit') || '25';
      const res = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/invoices?type=ReceivedInvoice&offset=${offset}&limit=${limit}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- Get single invoice ---
    if (action === 'invoice') {
      const id = searchParams.get('id');
      if (!id) return Response.json({ error: 'Missing invoice id' }, { status: 400 });
      const include = searchParams.get('include') || 'lines';
      const res = await fetch(`${B2B_API_URL}/invoices/${id}?include=${include}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- Get invoice as PDF ---
    if (action === 'invoice_pdf') {
      const id = searchParams.get('id');
      if (!id) return Response.json({ error: 'Missing invoice id' }, { status: 400 });
      const res = await fetch(`${B2B_API_URL}/invoices/${id}/as/pdf.invoice`, { headers: headers() });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: 'Failed to fetch PDF' }));
        return Response.json({ error: errData, status: res.status }, { status: res.status });
      }
      const blob = await res.arrayBuffer();
      return new Response(blob, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="invoice_${id}.pdf"` } });
    }

    // --- Get invoice as original format ---
    if (action === 'invoice_original') {
      const id = searchParams.get('id');
      if (!id) return Response.json({ error: 'Missing invoice id' }, { status: 400 });
      const res = await fetch(`${B2B_API_URL}/invoices/${id}/as/original`, { headers: headers() });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: 'Failed to fetch original' }));
        return Response.json({ error: errData, status: res.status }, { status: res.status });
      }
      const blob = await res.arrayBuffer();
      const ct = res.headers.get('content-type') || 'application/octet-stream';
      return new Response(blob, { headers: { 'Content-Type': ct } });
    }

    // --- List transports ---
    if (action === 'transports') {
      const res = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/transports`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- List events (activity log) ---
    if (action === 'events') {
      const offset = searchParams.get('offset') || '0';
      const limit = searchParams.get('limit') || '25';
      const res = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/events?offset=${offset}&limit=${limit}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- List document types ---
    if (action === 'document_types') {
      const res = await fetch(`${B2B_API_URL}/document_types`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- List transport types ---
    if (action === 'transport_types') {
      const res = await fetch(`${B2B_API_URL}/transport_types`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- List schemes ---
    if (action === 'schemes') {
      const res = await fetch(`${B2B_API_URL}/schemes`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (err) {
    console.error('B2BRouter API error:', err);
    return Response.json({ error: err.message || 'B2BRouter API request failed' }, { status: 500 });
  }
}

// ============================================
// POST handler — write operations
// ============================================
export async function POST(request) {
  const missing = missingConfig();
  if (missing.length > 0) {
    return Response.json({ error: `Missing env vars: ${missing.join(', ')}` }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, ...payload } = body;

    // --- Create a contact ---
    if (action === 'create_contact') {
      const res = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/contacts`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ contact: payload.contact })
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- Create and optionally send an invoice ---
    if (action === 'create_invoice') {
      const invoicePayload = { ...payload.invoice };
      const sendAfter = payload.send_after_import !== undefined ? payload.send_after_import : false;
      const res = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/invoices`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ send_after_import: sendAfter, invoice: invoicePayload })
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- Mark invoice state (accept, refuse, paid) ---
    if (action === 'mark_invoice') {
      const { invoice_id, state, reason, commit } = payload;
      if (!invoice_id || !state) return Response.json({ error: 'Missing invoice_id or state' }, { status: 400 });
      const markBody = { state };
      if (reason) markBody.reason = reason;
      if (commit) markBody.commit = commit;
      const res = await fetch(`${B2B_API_URL}/invoices/${invoice_id}/mark_as`, {
        method: 'POST', headers: headers(), body: JSON.stringify(markBody)
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- Acknowledge received invoice ---
    if (action === 'ack_invoice') {
      const { invoice_id } = payload;
      if (!invoice_id) return Response.json({ error: 'Missing invoice_id' }, { status: 400 });
      const res = await fetch(`${B2B_API_URL}/invoices/${invoice_id}/ack`, {
        method: 'POST', headers: headers()
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- Create a transport (e.g. enable Peppol/Chorus) ---
    if (action === 'create_transport') {
      const res = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/transports`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ transport: payload.transport })
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, status: res.status }, { status: res.status });
      return Response.json(data);
    }

    // --- Send a test invoice (convenience wrapper) ---
    if (action === 'send_test_invoice') {
      // Step 1: Find or create test contact
      let contactId = payload.contact_id;
      if (!contactId) {
        // Try to find existing contact first
        const searchName = payload.contact_name || 'B2Brouter Global S.L.';
        const lookupRes = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/contacts?name=${encodeURIComponent(searchName)}&limit=1`, { headers: headers() });
        const lookupData = await lookupRes.json();
        if (lookupRes.ok && lookupData.contacts && lookupData.contacts.length > 0) {
          contactId = lookupData.contacts[0].id;
        } else {
          // Create if not found
          const contactRes = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/contacts`, {
            method: 'POST', headers: headers(),
            body: JSON.stringify({
              contact: {
                language: 'fr',
                is_client: true,
                is_provider: false,
                name: payload.contact_name || 'B2Brouter Global S.L. (Test)',
                tin_value: payload.contact_tin || 'ESB63276174',
                tin_scheme: '9920',
                country: payload.contact_country || 'es',
                email: payload.contact_email || 'test@b2brouter.net',
                address: payload.contact_address || 'Avda. Diagonal, 433 1º1ª',
                postalcode: payload.contact_postal || '08036',
                city: payload.contact_city || 'Barcelona',
                transport_type_code: 'b2brouter',
                document_type_code: 'xml.ubl.invoice'
              }
            })
          });
          const contactData = await contactRes.json();
          if (!contactRes.ok) return Response.json({ error: contactData, step: 'create_contact', status: contactRes.status }, { status: contactRes.status });
          contactId = contactData.contact?.id;
        }
      }

      // Step 2: Ensure contact has document_type_code set
      const updateRes = await fetch(`${B2B_API_URL}/contacts/${contactId}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ contact: { transport_type_code: 'b2brouter', document_type_code: 'xml.ubl.invoice' } })
      });
      if (!updateRes.ok) {
        const updateErr = await updateRes.json().catch(() => ({}));
        // Non-fatal — continue anyway
        console.warn('Contact update warning:', updateErr);
      }

      // Step 3: Create test invoice (don't auto-send — sending requires transport config)
      const invoiceRes = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/invoices`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          send_after_import: false,
          invoice: {
            type: 'IssuedInvoice',
            contact_id: contactId,
            number: payload.invoice_number || `TEST-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            terms: 'custom',
            currency: 'EUR',
            document_type_code: 'xml.ubl.invoice',
            bank_account: { type: 'iban' },
            invoice_lines_attributes: payload.lines || [
              {
                quantity: 1,
                price: 100,
                description: 'Test - Étalonnage compteur de particules',
                unit: 1,
                taxes_attributes: [{ name: 'TVA', category: 'S', percent: 20 }]
              }
            ]
          }
        })
      });
      const invoiceData = await invoiceRes.json();
      if (!invoiceRes.ok) return Response.json({ error: invoiceData, step: 'create_invoice', status: invoiceRes.status }, { status: invoiceRes.status });
      return Response.json({ success: true, contact_id: contactId, invoice: invoiceData.invoice || invoiceData });
    }

    // --- Create e-invoice with PDF attachment (Phase 2 — Factur-X) ---
    if (action === 'create_einvoice') {
      const { contact_data, invoice_data, pdf_url } = payload;

      // Step 1: Find or create contact in B2BRouter
      let contactId = null;
      if (contact_data.tin_value) {
        // Search by TIN
        const lookupRes = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/contacts?name=${encodeURIComponent(contact_data.name || '')}&limit=5`, { headers: headers() });
        const lookupData = await lookupRes.json();
        if (lookupRes.ok && lookupData.contacts) {
          const match = lookupData.contacts.find(c => c.tin_value === contact_data.tin_value);
          if (match) contactId = match.id;
        }
      }
      if (!contactId) {
        // Create new contact
        const contactBody = {
          contact: {
            language: contact_data.language || 'fr',
            is_client: true,
            is_provider: false,
            name: contact_data.name,
            tin_value: contact_data.tin_value || '',
            tin_scheme: contact_data.tin_scheme || '9957',
            country: contact_data.country || 'fr',
            email: contact_data.email || '',
            address: contact_data.address || '',
            postalcode: contact_data.postalcode || '',
            city: contact_data.city || '',
            transport_type_code: contact_data.transport_type_code || 'b2brouter',
            document_type_code: contact_data.document_type_code || 'xml.ubl.invoice'
          }
        };
        if (contact_data.public_sector) contactBody.contact.public_sector = true;
        const contactRes = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/contacts`, {
          method: 'POST', headers: headers(), body: JSON.stringify(contactBody)
        });
        const contactResult = await contactRes.json();
        if (!contactRes.ok) {
          // If duplicate, try to find it
          if (contactResult.code === 'parameter_taken' || (contactResult.error?.code === 'parameter_taken')) {
            const retryRes = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/contacts?name=${encodeURIComponent(contact_data.name)}&limit=10`, { headers: headers() });
            const retryData = await retryRes.json();
            if (retryRes.ok && retryData.contacts?.length > 0) {
              contactId = retryData.contacts[0].id;
            } else {
              return Response.json({ error: contactResult, step: 'create_contact' }, { status: 400 });
            }
          } else {
            return Response.json({ error: contactResult, step: 'create_contact' }, { status: 400 });
          }
        } else {
          contactId = contactResult.contact?.id;
        }
      }

      // Step 2: Create invoice in B2BRouter
      const b2bInvoice = {
        type: 'IssuedInvoice',
        contact_id: contactId,
        number: invoice_data.number,
        date: invoice_data.date,
        due_date: invoice_data.due_date,
        terms: 'custom',
        currency: invoice_data.currency || 'EUR',
        language: 'fr',
        document_type_code: invoice_data.document_type_code || 'xml.ubl.invoice',
        invoice_lines_attributes: (invoice_data.lines || []).map(line => ({
          description: line.description,
          quantity: line.quantity || 1,
          price: line.unit_price,
          unit: 1,
          ...(line.article_code ? { article_code: line.article_code } : {}),
          taxes_attributes: [{
            name: 'TVA',
            category: line.tva_exempt ? 'E' : 'S',
            percent: line.tva_exempt ? 0 : (line.tva_rate || 20)
          }]
        }))
      };
      // Optional fields
      if (invoice_data.po_number) b2bInvoice.ponumber = invoice_data.po_number;
      if (invoice_data.buyer_reference) b2bInvoice.buyer_reference = invoice_data.buyer_reference;
      if (invoice_data.file_reference) b2bInvoice.file_reference = invoice_data.file_reference;
      if (invoice_data.payment_terms_text) b2bInvoice.payment_terms = invoice_data.payment_terms_text;
      if (invoice_data.notes) b2bInvoice.extra_info = invoice_data.notes;

      const invoiceRes = await fetch(`${B2B_API_URL}/accounts/${B2B_ACCOUNT_ID}/invoices`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ send_after_import: false, invoice: b2bInvoice })
      });
      const invoiceResult = await invoiceRes.json();
      if (!invoiceRes.ok) return Response.json({ error: invoiceResult, step: 'create_invoice' }, { status: 400 });

      const b2bInvoiceId = invoiceResult.invoice?.id;

      // Step 3: Fetch and attach PDF if url provided
      let attachmentResult = null;
      if (pdf_url && b2bInvoiceId) {
        try {
          const pdfRes = await fetch(pdf_url);
          if (pdfRes.ok) {
            const pdfBuffer = await pdfRes.arrayBuffer();
            const filename = invoice_data.number ? `Facture_${invoice_data.number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf` : 'facture.pdf';
            const attachRes = await fetch(
              `${B2B_API_URL}/invoices/${b2bInvoiceId}/add_attachment?filename=${encodeURIComponent(filename)}&use_as_pdf_view=true`,
              {
                method: 'POST',
                headers: {
                  'X-B2B-API-Key': B2B_API_KEY,
                  'X-B2B-API-Version': B2B_API_VERSION,
                  'Content-Type': 'application/octet-stream'
                },
                body: pdfBuffer
              }
            );
            attachmentResult = await attachRes.json().catch(() => ({ status: attachRes.status }));
          }
        } catch (pdfErr) {
          attachmentResult = { error: pdfErr.message, step: 'attach_pdf' };
        }
      }

      return Response.json({
        success: true,
        b2brouter_invoice_id: b2bInvoiceId,
        b2brouter_contact_id: contactId,
        invoice: invoiceResult.invoice,
        attachment: attachmentResult,
        state: invoiceResult.invoice?.state
      });
    }

    // --- Send an already-created e-invoice ---
    if (action === 'send_einvoice') {
      const { b2brouter_invoice_id } = payload;
      if (!b2brouter_invoice_id) return Response.json({ error: 'Missing b2brouter_invoice_id' }, { status: 400 });
      const res = await fetch(`${B2B_API_URL}/invoices/send_invoice/${b2brouter_invoice_id}`, {
        method: 'POST', headers: headers()
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data, step: 'send_invoice', status: res.status }, { status: res.status });
      return Response.json({ success: true, invoice: data.invoice || data });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (err) {
    console.error('B2BRouter API POST error:', err);
    return Response.json({ error: err.message || 'B2BRouter API request failed' }, { status: 500 });
  }
}
