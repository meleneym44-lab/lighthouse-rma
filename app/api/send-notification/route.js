// ============================================
// /app/api/send-notification/route.js
// Email notification system for Lighthouse France RMA Portal
// 8 templates — French only, navy blue theme
// ============================================

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS = '"Lighthouse France" <noreplyfrance@golighthouse.com>';
const PORTAL_URL = 'https://lighthouse-rma.vercel.app/customer';
const LOGO_URL = 'https://lighthouse-rma.vercel.app/images/logos/Lighthouse-color-logo.jpg';

// ============================================
// SHARED LAYOUT + HELPERS
// ============================================

function baseLayout(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background-color:#ffffff;padding:32px 24px;text-align:center;border-radius:12px 12px 0 0;border:1px solid #e5e7eb;border-bottom:3px solid #1E3A5F;">
      <img src="${LOGO_URL}" alt="Lighthouse" style="max-height:95px;margin-bottom:18px;" /><br>
      <span style="color:#1E3A5F;font-size:13px;font-weight:600;letter-spacing:0.5px;">FRANCE</span>
      <p style="color:#6b7280;font-size:12px;margin:6px 0 0;">Portail Client — Service &amp; Calibration</p>
    </div>
    <!-- Body -->
    <div style="background:#ffffff;padding:32px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5;text-align:center;">
        Cet email est envoyé automatiquement. Merci de ne pas y répondre.<br>
        Lighthouse France — 6 Rue Michael Faraday, 94000 Créteil<br>
        <a href="mailto:france@golighthouse.com" style="color:#3B7AB4;text-decoration:none;">france@golighthouse.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function deviceTableHtml(devices, borderColor = '#e5e7eb') {
  if (!devices || devices.length === 0) return '';
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr style="border-bottom:2px solid ${borderColor};">
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;">Modèle</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;">N° de série</th>
        </tr>
      </thead>
      <tbody>
        ${devices.map(d => `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#1E3A5F;">${d.model || d.model_name || ''}</td>
            <td style="padding:8px 12px;font-size:13px;font-family:monospace;color:#4b5563;">${d.serial || d.serial_number || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function rmaHeaderHtml(rmaNumber, badgeHtml = '') {
  return `
    <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div>
        <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">RMA</span>
        <span style="font-weight:700;color:#1E3A5F;font-size:15px;font-family:monospace;margin-left:8px;">${rmaNumber}</span>
      </div>
      ${badgeHtml}
    </div>`;
}

function ctaButton(text, bgStyle = 'linear-gradient(135deg,#3B7AB4,#1E3A5F)') {
  return `
    <div style="text-align:center;margin:28px 0 0;">
      <a href="${PORTAL_URL}" style="display:inline-block;background:${bgStyle};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;">
        ${text}
      </a>
    </div>`;
}

// ============================================
// 1. RMA CREATED
// ============================================
function rmaCreatedEmail(data) {
  const { rmaNumber, deviceCount } = data;
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">📋 Votre RMA a été créé</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      Votre demande de service a été enregistrée sous le numéro RMA <strong style="color:#1E3A5F;">${rmaNumber}</strong>. Un devis a été préparé et est disponible pour votre examen et approbation.
    </p>
    <div style="background:#f0f4f8;border:1px solid #d1dbe6;border-radius:8px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Votre numéro RMA</p>
      <p style="font-weight:700;color:#1E3A5F;font-size:28px;font-family:monospace;margin:0;">${rmaNumber}</p>
      <p style="color:#6b7280;font-size:13px;margin:8px 0 0;">${deviceCount || 0} appareil${(deviceCount || 0) > 1 ? 's' : ''}</p>
      <div style="margin-top:12px;">
        <span style="display:inline-block;background:#e8f0fe;color:#1E3A5F;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;">📄 Devis disponible</span>
      </div>
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Veuillez vous connecter à votre portail client pour consulter le devis et approuver la commande afin que nous puissions commencer le traitement de vos appareils.
    </p>
    ${ctaButton('Voir mon devis →')}`;
  return {
    subject: `Lighthouse France — RMA ${rmaNumber} — Devis disponible pour examen`,
    html: baseLayout(content)
  };
}

// ============================================
// 2. DEVICES RECEIVED
// ============================================
function deviceReceivedEmail(data) {
  const { rmaNumber, devices } = data;
  const count = (devices || []).length;
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">📦 ${count > 1 ? count + ' appareils reçus' : 'Appareil reçu'}</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      Nous avons réceptionné ${count > 1 ? 'les appareils suivants' : "l'appareil suivant"} dans nos locaux pour le RMA <strong style="color:#1E3A5F;">${rmaNumber}</strong>.
    </p>
    <div style="background:#f0f4f8;border:1px solid #d1dbe6;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${rmaHeaderHtml(rmaNumber)}
      ${deviceTableHtml(devices, '#d1dbe6')}
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Nos techniciens commenceront le traitement sous peu. Vous serez notifié à chaque étape de l'avancement.
    </p>
    ${ctaButton('Suivre mes appareils →')}`;
  return {
    subject: `Lighthouse France — RMA ${rmaNumber} — ${count} appareil${count > 1 ? 's' : ''} reçu${count > 1 ? 's' : ''}`,
    html: baseLayout(content)
  };
}

// ============================================
// 3. INSPECTION QUOTE (repair + supplement)
// ============================================
function inspectionQuoteEmail(data) {
  const { rmaNumber, devices } = data;
  const count = (devices || []).length;
  const badge = `<span style="display:inline-block;background:#fef9c3;color:#854d0e;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid #fde68a;">⚠️ Approbation requise</span>`;
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">🔧 Devis disponible — Action requise</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      Après l'inspection de ${count > 1 ? 'vos appareils' : 'votre appareil'} dans le cadre du RMA <strong style="color:#1E3A5F;">${rmaNumber}</strong>, nos techniciens ont identifié des anomalies qui doivent être corrigées pour garantir le bon fonctionnement de votre équipement.
    </p>
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${rmaHeaderHtml(rmaNumber, badge)}
      ${deviceTableHtml(devices, '#fde68a')}
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Un devis a été préparé pour les travaux nécessaires. Veuillez vous connecter à votre portail client pour le consulter et l'approuver afin que nous puissions procéder.
    </p>
    <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:8px 0 0;">
      Les travaux sur les appareils concernés sont en attente de votre approbation.
    </p>
    ${ctaButton('Voir mon devis →', '#d97706')}`;
  return {
    subject: `Lighthouse France — RMA ${rmaNumber} — Devis en attente d'approbation`,
    html: baseLayout(content)
  };
}

// ============================================
// 4. ALL QC COMPLETE
// ============================================
function qcCompleteEmail(data) {
  const { rmaNumber, devices } = data;
  const count = (devices || []).length;
  const badge = `<span style="display:inline-block;background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">✅ Tous QC validés</span>`;
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">✅ Tous les appareils prêts pour expédition</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      ${count > 1 ? 'Les ' + count + ' appareils' : "L'appareil"} de votre RMA <strong style="color:#1E3A5F;">${rmaNumber}</strong> ${count > 1 ? 'ont' : 'a'} passé le contrôle qualité avec succès et ${count > 1 ? 'sont' : 'est'} en cours de préparation pour l'expédition.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${rmaHeaderHtml(rmaNumber, badge)}
      ${deviceTableHtml(devices, '#bbf7d0')}
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Vous recevrez une notification avec les informations de suivi dès que vos appareils auront été expédiés.
    </p>
    ${ctaButton('Suivre mes appareils →')}`;
  return {
    subject: `Lighthouse France — RMA ${rmaNumber} — Tous les appareils prêts pour expédition`,
    html: baseLayout(content)
  };
}

// ============================================
// 5. DEVICES SHIPPED
// ============================================
function shippedEmail(data) {
  const { rmaNumber, devices, trackingNumber, carrier } = data;
  const count = (devices || []).length;
  const carrierBadge = carrier ? `<span style="display:inline-block;background:#e8f0fe;color:#1E3A5F;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${carrier}</span>` : '';
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">🚚 ${count > 1 ? count + ' appareils expédiés' : 'Appareil expédié'}</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      ${count > 1 ? 'Les appareils suivants' : "L'appareil suivant"} de votre RMA <strong style="color:#1E3A5F;">${rmaNumber}</strong> ${count > 1 ? 'ont été expédiés et sont' : 'a été expédié et est'} en route.
    </p>
    <div style="background:#f0f4f8;border:1px solid #d1dbe6;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${rmaHeaderHtml(rmaNumber, carrierBadge)}
      ${deviceTableHtml(devices, '#d1dbe6')}
      ${trackingNumber ? `
      <div style="margin-top:16px;padding-top:16px;border-top:2px solid #d1dbe6;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;">N° de suivi</td>
            <td style="padding:4px 0;font-weight:700;color:#1E3A5F;font-size:14px;font-family:monospace;">${trackingNumber}</td>
          </tr>
          ${carrier ? `<tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">Transporteur</td>
            <td style="padding:4px 0;font-weight:600;color:#1E3A5F;font-size:14px;">${carrier}</td>
          </tr>` : ''}
        </table>
      </div>` : ''}
    </div>
    ${trackingNumber ? `
    <div style="text-align:center;margin:0 0 16px;">
      <a href="https://www.ups.com/track?tracknum=${trackingNumber}" style="display:inline-block;background:#fef3c7;color:#92400e;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:13px;border:1px solid #fde68a;">
        📦 Suivre le colis sur UPS →
      </a>
    </div>` : ''}
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Pour toute question concernant votre envoi, n'hésitez pas à nous contacter via le portail client.
    </p>
    ${ctaButton('Voir les détails →')}`;
  return {
    subject: `Lighthouse France — RMA ${rmaNumber} — ${count} appareil${count > 1 ? 's' : ''} expédié${count > 1 ? 's' : ''}${trackingNumber ? ' — Suivi: ' + trackingNumber : ''}`,
    html: baseLayout(content)
  };
}

// ============================================
// 6. INVOICE SENT (can_invoice users only)
// ============================================
function invoiceSentEmail(data) {
  const { rmaNumber, invoiceNumber } = data;
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">🧾 Facture disponible</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      Une facture a été émise pour votre RMA <strong style="color:#1E3A5F;">${rmaNumber}</strong>. Vous pouvez la consulter et la télécharger depuis l'onglet Factures de votre portail client.
    </p>
    <div style="background:#f0f4f8;border:1px solid #d1dbe6;border-radius:8px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Facture pour le RMA</p>
      <p style="font-weight:700;color:#1E3A5F;font-size:24px;font-family:monospace;margin:0;">${rmaNumber}</p>
      <p style="color:#3B7AB4;font-size:14px;font-weight:600;margin:10px 0 0;">Facture: ${invoiceNumber}</p>
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Veuillez vous connecter à votre portail client pour consulter les détails de la facture et télécharger le PDF.
    </p>
    ${ctaButton('Voir ma facture →')}`;
  return {
    subject: `Lighthouse France — Facture ${invoiceNumber} — RMA ${rmaNumber}`,
    html: baseLayout(content)
  };
}

// ============================================
// 7. NO RMA — Device received without open RMA
// ============================================
function noRmaEmail(data) {
  const { serialNumber, modelName, receivedDate } = data;
  const content = `
    <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 20px;text-align:center;">
      <p style="font-size:32px;margin:0 0 8px;">🚨</p>
      <p style="color:#991b1b;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0;">Action requise</p>
    </div>
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">Appareil reçu sans RMA ouvert</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      Nous avons reçu un appareil dans nos locaux qui est enregistré auprès de votre entreprise, mais il n'y a actuellement <strong>aucune demande de service (RMA) ouverte</strong> associée à cet appareil.
    </p>
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">Modèle</td>
          <td style="padding:6px 0;font-weight:600;color:#1E3A5F;font-size:14px;">${modelName || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">N° de série</td>
          <td style="padding:6px 0;font-weight:700;color:#1E3A5F;font-size:15px;font-family:monospace;">${serialNumber || '—'}</td>
        </tr>
        ${receivedDate ? `<tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">Reçu le</td>
          <td style="padding:6px 0;font-weight:600;color:#1E3A5F;font-size:14px;">${receivedDate}</td>
        </tr>` : ''}
      </table>
    </div>
    <p style="color:#dc2626;font-size:14px;font-weight:600;line-height:1.6;margin:0 0 8px;">
      Sans demande de service ouverte, nous ne sommes pas en mesure d'effectuer de travaux sur cet appareil.
    </p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Veuillez vous connecter à votre portail client et soumettre une demande de service pour cet appareil.
    </p>
    ${ctaButton('Ouvrir une demande de service →', '#dc2626')}`;
  return {
    subject: `Lighthouse France — ⚠ Appareil reçu sans RMA — Action requise`,
    html: baseLayout(content)
  };
}

// ============================================
// 8. NO BC/PO — Device received, no approval
// ============================================
function noBcEmail(data) {
  const { rmaNumber, serialNumber, modelName, receivedDate } = data;
  const content = `
    <div style="background:#fff7ed;border:2px solid #fdba74;border-radius:8px;padding:16px;margin:0 0 20px;text-align:center;">
      <p style="font-size:32px;margin:0 0 8px;">⏳</p>
      <p style="color:#9a3412;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0;">Approbation en attente</p>
    </div>
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">Appareil reçu — En attente d'approbation</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      Nous avons reçu l'appareil suivant dans nos locaux pour le RMA <strong style="color:#1E3A5F;">${rmaNumber}</strong>. Cependant, nous n'avons pas encore reçu l'approbation de cette commande.
    </p>
    <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:16px;margin:0 0 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">N° RMA</td>
          <td style="padding:6px 0;font-weight:700;color:#1E3A5F;font-size:15px;font-family:monospace;">${rmaNumber}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">Modèle</td>
          <td style="padding:6px 0;font-weight:600;color:#1E3A5F;font-size:14px;">${modelName || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">N° de série</td>
          <td style="padding:6px 0;font-weight:700;color:#1E3A5F;font-size:15px;font-family:monospace;">${serialNumber || '—'}</td>
        </tr>
        ${receivedDate ? `<tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">Reçu le</td>
          <td style="padding:6px 0;font-weight:600;color:#1E3A5F;font-size:14px;">${receivedDate}</td>
        </tr>` : ''}
      </table>
    </div>
    <p style="color:#9a3412;font-size:14px;font-weight:600;line-height:1.6;margin:0 0 8px;">
      Nous ne pouvons pas commencer les travaux sur cet appareil tant que la commande n'a pas été approuvée.
    </p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Veuillez vous connecter à votre portail client pour consulter et approuver la commande.
    </p>
    ${ctaButton('Approuver ma commande →', '#ea580c')}`;
  return {
    subject: `Lighthouse France — RMA ${rmaNumber} — Appareil reçu, en attente d'approbation`,
    html: baseLayout(content)
  };
}

// ============================================
// TEMPLATE ROUTER
// ============================================
const TEMPLATES = {
  rma_created: rmaCreatedEmail,
  device_received: deviceReceivedEmail,
  inspection_quote: inspectionQuoteEmail,
  qc_complete: qcCompleteEmail,
  shipped: shippedEmail,
  invoice_sent: invoiceSentEmail,
  no_rma: noRmaEmail,
  no_bc: noBcEmail,
};

// Events where only users with can_invoice = true should receive
const BILLING_ONLY_EVENTS = ['invoice_sent'];

// ============================================
// API HANDLER
// ============================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { event, companyId, data = {} } = body;

    if (!event || !companyId) {
      return Response.json({ error: 'Missing event or companyId' }, { status: 400 });
    }

    const templateFn = TEMPLATES[event];
    if (!templateFn) {
      return Response.json({ error: 'Unknown event: ' + event }, { status: 400 });
    }

    // Get users linked to this company
    let query = supabase
      .from('profiles')
      .select('id, email, full_name, can_invoice')
      .eq('company_id', companyId)
      .eq('role', 'admin')
      .eq('is_active', true);

    // For billing-only events, filter to users with invoice permission
    if (BILLING_ONLY_EVENTS.includes(event)) {
      query = query.eq('can_invoice', true);
    }

    const { data: profiles, error: profileError } = await query;

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return Response.json({ error: 'Failed to fetch company users' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return Response.json({ sent: 0, message: 'No eligible portal users for this company' });
    }

    // Send to each user (always French)
    let sent = 0;
    const errors = [];

    for (const profile of profiles) {
      const { subject, html } = templateFn(data);

      try {
        await transporter.sendMail({
          from: FROM_ADDRESS,
          to: profile.email,
          subject,
          html,
        });
        sent++;
      } catch (mailErr) {
        console.error(`Failed to send to ${profile.email}:`, mailErr.message);
        errors.push({ email: profile.email, error: mailErr.message });
      }
    }

    // Log notification
    try {
      await supabase.from('notification_log').insert({
        event,
        company_id: companyId,
        data,
        recipients: profiles.map(p => p.email),
        sent_count: sent,
        error_count: errors.length,
        errors: errors.length > 0 ? errors : null,
      });
    } catch (logErr) {
      console.error('Notification log error:', logErr);
    }

    return Response.json({
      sent,
      total: profiles.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Notification error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
