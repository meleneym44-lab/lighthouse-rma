// ============================================
// /app/api/send-notification/route.js
// Email notification system for Lighthouse France RMA Portal
// 8 templates: rma_created, device_received, inspection_quote,
//   qc_complete, shipped, invoice_sent, no_rma, no_bc
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

// ============================================
// SHARED LAYOUT + HELPERS
// ============================================

function baseLayout(content, lang = 'fr') {
  const fr = lang === 'fr';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#00A651,#008C44);border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">LIGHTHOUSE FRANCE</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Service &amp; Calibration</p>
    </div>
    <div style="background:#fff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      ${content}
    </div>
    <div style="background:#1a1a2e;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;">
        ${fr ? 'Cet email est envoyé automatiquement. Merci de ne pas y répondre.' : 'This is an automated email. Please do not reply.'}
      </p>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.5);font-size:11px;">
        Lighthouse France · 6 Rue Michael Faraday · 94000 Créteil
      </p>
      <p style="margin:8px 0 0;">
        <a href="${PORTAL_URL}" style="color:#00A651;font-size:12px;text-decoration:none;">
          ${fr ? 'Accéder au portail client →' : 'Access client portal →'}
        </a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function deviceTableHtml(devices, lang, borderColor = '#e5e7eb') {
  const fr = lang === 'fr';
  if (!devices || devices.length === 0) return '';
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:4px;">
      <thead>
        <tr style="border-bottom:2px solid ${borderColor};">
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;">${fr ? 'Modèle' : 'Model'}</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;">${fr ? 'N° de série' : 'Serial Number'}</th>
        </tr>
      </thead>
      <tbody>
        ${devices.map(d => `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#1a1a2e;">${d.model || d.model_name || ''}</td>
            <td style="padding:8px 12px;font-size:13px;font-family:monospace;color:#4b5563;">${d.serial || d.serial_number || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function rmaHeaderHtml(rmaNumber, badgeHtml = '') {
  return `
    <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div>
        <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">RMA</span>
        <span style="font-weight:700;color:#00A651;font-size:15px;font-family:monospace;margin-left:8px;">${rmaNumber}</span>
      </div>
      ${badgeHtml}
    </div>`;
}

function ctaButton(text, color = '#00A651') {
  return `
    <div style="text-align:center;">
      <a href="${PORTAL_URL}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
        ${text}
      </a>
    </div>`;
}

// ============================================
// 1. RMA CREATED
// ============================================
function rmaCreatedEmail(data, lang) {
  const fr = lang === 'fr';
  const { rmaNumber, deviceCount } = data;
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">
      ${fr ? '📋 Votre RMA a été créé' : '📋 Your RMA Has Been Created'}
    </h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${fr
        ? `Bonjour,<br><br>Votre demande de service a été enregistrée sous le numéro RMA <strong>${rmaNumber}</strong>. Un devis a été préparé et est disponible pour votre examen et approbation.`
        : `Hello,<br><br>Your service request has been registered and assigned RMA number <strong>${rmaNumber}</strong>. A quote has been prepared and is available for your review and approval.`}
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">${fr ? 'Votre numéro RMA' : 'Your RMA Number'}</p>
      <p style="font-weight:700;color:#00A651;font-size:28px;font-family:monospace;margin:0;">${rmaNumber}</p>
      <p style="color:#6b7280;font-size:13px;margin:8px 0 0;">${deviceCount || 0} ${fr ? (deviceCount > 1 ? 'appareils' : 'appareil') : (deviceCount > 1 ? 'devices' : 'device')}</p>
      <div style="margin-top:12px;">
        <span style="display:inline-block;background:#f3e8ff;color:#7c3aed;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;">${fr ? '📄 Devis disponible' : '📄 Quote Available'}</span>
      </div>
    </div>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${fr
        ? 'Veuillez vous connecter à votre portail client pour consulter le devis et approuver la commande afin que nous puissions commencer le traitement de vos appareils.'
        : 'Please log in to your client portal to review the quote and approve the order so we can begin processing your devices.'}
    </p>
    ${ctaButton(fr ? 'Voir mon devis →' : 'Review My Quote →')}`;
  return {
    subject: fr
      ? `Lighthouse France — RMA ${rmaNumber} — Devis disponible pour examen`
      : `Lighthouse France — RMA ${rmaNumber} — Quote Available for Review`,
    html: baseLayout(content, lang)
  };
}

// ============================================
// 2. DEVICES RECEIVED
// ============================================
function deviceReceivedEmail(data, lang) {
  const fr = lang === 'fr';
  const { rmaNumber, devices } = data;
  const count = (devices || []).length;
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">
      ${fr ? `📦 ${count > 1 ? count + ' appareils reçus' : 'Appareil reçu'}` : `📦 ${count > 1 ? count + ' Devices' : 'Device'} Received`}
    </h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${fr
        ? `Bonjour,<br><br>Nous avons réceptionné ${count > 1 ? 'les appareils suivants' : "l'appareil suivant"} dans nos locaux pour le RMA <strong>${rmaNumber}</strong>. Vous pouvez désormais suivre l'avancement du service depuis votre portail client.`
        : `Hello,<br><br>We have received the following ${count > 1 ? 'devices' : 'device'} at our facility for RMA <strong>${rmaNumber}</strong>. You can now track the service progress from your client portal.`}
    </p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${rmaHeaderHtml(rmaNumber)}
      ${deviceTableHtml(devices, lang, '#bfdbfe')}
    </div>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${fr
        ? 'Nos techniciens commenceront le traitement sous peu. Vous serez notifié lorsque vos appareils seront prêts.'
        : 'Our technicians will begin processing shortly. You will be notified when your devices are ready.'}
    </p>
    ${ctaButton(fr ? 'Suivre mes appareils →' : 'Track My Devices →')}`;
  return {
    subject: fr
      ? `Lighthouse France — RMA ${rmaNumber} — ${count} appareil${count > 1 ? 's' : ''} reçu${count > 1 ? 's' : ''}`
      : `Lighthouse France — RMA ${rmaNumber} — ${count} Device${count > 1 ? 's' : ''} Received`,
    html: baseLayout(content, lang)
  };
}

// ============================================
// 3. INSPECTION QUOTE (repair + supplement)
// ============================================
function inspectionQuoteEmail(data, lang) {
  const fr = lang === 'fr';
  const { rmaNumber, devices } = data;
  const count = (devices || []).length;
  const badge = `<span style="display:inline-block;background:#fef9c3;color:#854d0e;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid #fde68a;">${fr ? '⚠️ Approbation requise' : '⚠️ Approval Needed'}</span>`;
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">
      ${fr ? '🔧 Devis disponible — Action requise' : '🔧 Quote Available — Action Required'}
    </h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${fr
        ? `Bonjour,<br><br>Après l'inspection de ${count > 1 ? 'vos appareils' : 'votre appareil'} dans le cadre du RMA <strong>${rmaNumber}</strong>, nos techniciens ont identifié des anomalies qui doivent être corrigées pour garantir le bon fonctionnement de votre équipement.`
        : `Hello,<br><br>After inspecting your ${count > 1 ? 'devices' : 'device'} under RMA <strong>${rmaNumber}</strong>, our technicians have identified issues that need to be addressed in order for your equipment to operate correctly.`}
    </p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${rmaHeaderHtml(rmaNumber, badge)}
      ${deviceTableHtml(devices, lang, '#fde68a')}
    </div>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 8px;">
      ${fr
        ? 'Un devis a été préparé pour les travaux nécessaires. Veuillez vous connecter à votre portail client pour le consulter et l\'approuver afin que nous puissions procéder.'
        : 'A quote has been prepared for the required work. Please log in to your client portal to review and approve so we can proceed.'}
    </p>
    <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0 0 24px;">
      ${fr
        ? 'Les travaux sur les appareils concernés sont en attente de votre approbation.'
        : 'Work on the affected devices is on hold until the quote is approved.'}
    </p>
    ${ctaButton(fr ? 'Voir mon devis →' : 'Review My Quote →', '#d97706')}`;
  return {
    subject: fr
      ? `Lighthouse France — RMA ${rmaNumber} — Devis en attente d'approbation`
      : `Lighthouse France — RMA ${rmaNumber} — Quote Requires Your Approval`,
    html: baseLayout(content, lang)
  };
}

// ============================================
// 4. ALL QC COMPLETE
// ============================================
function qcCompleteEmail(data, lang) {
  const fr = lang === 'fr';
  const { rmaNumber, devices } = data;
  const count = (devices || []).length;
  const badge = `<span style="display:inline-block;background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${fr ? '✅ Tous QC validés' : '✅ All QC Passed'}</span>`;
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">
      ${fr ? '✅ Tous les appareils prêts pour expédition' : '✅ All Devices Ready for Shipment'}
    </h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${fr
        ? `Bonjour,<br><br>${count > 1 ? 'Les ' + count + ' appareils' : "L'appareil"} de votre RMA <strong>${rmaNumber}</strong> ${count > 1 ? 'ont' : 'a'} passé le contrôle qualité avec succès et ${count > 1 ? 'sont' : 'est'} en cours de préparation pour l'expédition.`
        : `Hello,<br><br>All ${count} device${count > 1 ? 's' : ''} in your RMA <strong>${rmaNumber}</strong> have passed quality control and are now being prepared for shipment.`}
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${rmaHeaderHtml(rmaNumber, badge)}
      ${deviceTableHtml(devices, lang, '#bbf7d0')}
    </div>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${fr
        ? 'Vous recevrez une notification avec les informations de suivi dès que vos appareils auront été expédiés.'
        : 'You will receive a notification with tracking information once your devices have been shipped.'}
    </p>
    ${ctaButton(fr ? 'Suivre mes appareils →' : 'Track My Devices →')}`;
  return {
    subject: fr
      ? `Lighthouse France — RMA ${rmaNumber} — Tous les appareils prêts pour expédition`
      : `Lighthouse France — RMA ${rmaNumber} — All Devices Ready for Shipment`,
    html: baseLayout(content, lang)
  };
}

// ============================================
// 5. DEVICES SHIPPED
// ============================================
function shippedEmail(data, lang) {
  const fr = lang === 'fr';
  const { rmaNumber, devices, trackingNumber, carrier } = data;
  const count = (devices || []).length;
  const carrierBadge = carrier ? `<span style="display:inline-block;background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${carrier}</span>` : '';
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">
      ${fr ? `🚚 ${count > 1 ? count + ' appareils expédiés' : 'Appareil expédié'}` : `🚚 ${count > 1 ? count + ' Devices' : 'Device'} Shipped`}
    </h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${fr
        ? `Bonjour,<br><br>${count > 1 ? 'Les appareils suivants' : "L'appareil suivant"} de votre RMA <strong>${rmaNumber}</strong> ${count > 1 ? 'ont été expédiés et sont' : 'a été expédié et est'} en route.`
        : `Hello,<br><br>The following ${count > 1 ? 'devices' : 'device'} from your RMA <strong>${rmaNumber}</strong> ${count > 1 ? 'have' : 'has'} been shipped and ${count > 1 ? 'are' : 'is'} on the way.`}
    </p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${rmaHeaderHtml(rmaNumber, carrierBadge)}
      ${deviceTableHtml(devices, lang, '#a7f3d0')}
      ${trackingNumber ? `
      <div style="margin-top:16px;padding-top:16px;border-top:2px solid #a7f3d0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;">${fr ? 'N° de suivi' : 'Tracking Number'}</td>
            <td style="padding:4px 0;font-weight:700;color:#1a1a2e;font-size:14px;font-family:monospace;">${trackingNumber}</td>
          </tr>
          ${carrier ? `<tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">${fr ? 'Transporteur' : 'Carrier'}</td>
            <td style="padding:4px 0;font-weight:600;color:#1a1a2e;font-size:14px;">${carrier}</td>
          </tr>` : ''}
        </table>
      </div>` : ''}
    </div>
    ${trackingNumber ? `
    <div style="text-align:center;margin:0 0 20px;">
      <a href="https://www.ups.com/track?tracknum=${trackingNumber}" style="display:inline-block;background:#fef3c7;color:#92400e;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:13px;border:1px solid #fde68a;">
        📦 ${fr ? 'Suivre le colis sur UPS →' : 'Track Package on UPS →'}
      </a>
    </div>` : ''}
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${fr
        ? 'Pour toute question concernant votre envoi, n\'hésitez pas à nous contacter via le portail client.'
        : 'For any questions about your shipment, please contact us through the client portal.'}
    </p>
    ${ctaButton(fr ? 'Voir les détails →' : 'View Details →')}`;
  return {
    subject: fr
      ? `Lighthouse France — RMA ${rmaNumber} — ${count} appareil${count > 1 ? 's' : ''} expédié${count > 1 ? 's' : ''}${trackingNumber ? ' — Suivi: ' + trackingNumber : ''}`
      : `Lighthouse France — RMA ${rmaNumber} — ${count} Device${count > 1 ? 's' : ''} Shipped${trackingNumber ? ' — Tracking: ' + trackingNumber : ''}`,
    html: baseLayout(content, lang)
  };
}

// ============================================
// 6. INVOICE SENT (Admin + Facturation only)
// ============================================
function invoiceSentEmail(data, lang) {
  const fr = lang === 'fr';
  const { rmaNumber, invoiceNumber } = data;
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">
      ${fr ? '🧾 Facture disponible' : '🧾 Invoice Available'}
    </h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${fr
        ? `Bonjour,<br><br>Une facture a été émise pour votre RMA <strong>${rmaNumber}</strong>. Vous pouvez la consulter et la télécharger depuis l'onglet Factures de votre portail client.`
        : `Hello,<br><br>An invoice has been issued for your RMA <strong>${rmaNumber}</strong>. You can view and download it from the Invoices tab on your client portal.`}
    </p>
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">${fr ? 'Facture pour le RMA' : 'Invoice for RMA'}</p>
      <p style="font-weight:700;color:#00A651;font-size:24px;font-family:monospace;margin:0;">${rmaNumber}</p>
      <p style="color:#92400e;font-size:14px;font-weight:600;margin:10px 0 0;">${fr ? 'Facture' : 'Invoice'}: ${invoiceNumber}</p>
    </div>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${fr
        ? 'Veuillez vous connecter à votre portail client pour consulter les détails de la facture et télécharger le PDF.'
        : 'Please log in to your client portal to view the full invoice details and download the PDF.'}
    </p>
    ${ctaButton(fr ? 'Voir ma facture →' : 'View My Invoice →')}`;
  return {
    subject: fr
      ? `Lighthouse France — Facture ${invoiceNumber} — RMA ${rmaNumber}`
      : `Lighthouse France — Invoice ${invoiceNumber} — RMA ${rmaNumber}`,
    html: baseLayout(content, lang)
  };
}

// ============================================
// 7. NO RMA — Device received without open RMA
// ============================================
function noRmaEmail(data, lang) {
  const fr = lang === 'fr';
  const { serialNumber, modelName, receivedDate } = data;
  const content = `
    <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 20px;text-align:center;">
      <p style="font-size:32px;margin:0 0 8px;">🚨</p>
      <p style="color:#991b1b;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0;">
        ${fr ? 'Action requise' : 'Action Required'}
      </p>
    </div>
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">
      ${fr ? 'Appareil reçu sans RMA ouvert' : 'Device Received Without an Open RMA'}
    </h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${fr
        ? `Bonjour,<br><br>Nous avons reçu un appareil dans nos locaux qui est enregistré auprès de votre entreprise, mais il n'y a actuellement <strong>aucune demande de service (RMA) ouverte</strong> associée à cet appareil.`
        : `Hello,<br><br>We have received a device at our facility that is registered to your company, but there is currently <strong>no open service request (RMA)</strong> associated with it.`}
    </p>
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">${fr ? 'Modèle' : 'Model'}</td>
          <td style="padding:6px 0;font-weight:600;color:#1a1a2e;font-size:14px;">${modelName || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">${fr ? 'N° de série' : 'Serial Number'}</td>
          <td style="padding:6px 0;font-weight:700;color:#1a1a2e;font-size:15px;font-family:monospace;">${serialNumber || '—'}</td>
        </tr>
        ${receivedDate ? `<tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">${fr ? 'Reçu le' : 'Received'}</td>
          <td style="padding:6px 0;font-weight:600;color:#1a1a2e;font-size:14px;">${receivedDate}</td>
        </tr>` : ''}
      </table>
    </div>
    <p style="color:#dc2626;font-size:14px;font-weight:600;line-height:1.6;margin:0 0 8px;">
      ${fr
        ? 'Sans demande de service ouverte, nous ne sommes pas en mesure d\'effectuer de travaux sur cet appareil.'
        : 'Without an open service request, we are unable to perform any work on this device.'}
    </p>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${fr
        ? 'Veuillez vous connecter à votre portail client et soumettre une demande de service pour cet appareil afin que nous puissions commencer le traitement.'
        : 'Please log in to your client portal and submit a service request for this device so we can begin processing.'}
    </p>
    ${ctaButton(fr ? 'Ouvrir une demande de service →' : 'Open a Service Request →', '#dc2626')}`;
  return {
    subject: fr
      ? `Lighthouse France — ⚠ Appareil reçu sans RMA — Action requise`
      : `Lighthouse France — ⚠ Device Received Without RMA — Action Required`,
    html: baseLayout(content, lang)
  };
}

// ============================================
// 8. NO BC/PO — Device received, no approval
// ============================================
function noBcEmail(data, lang) {
  const fr = lang === 'fr';
  const { rmaNumber, serialNumber, modelName, receivedDate } = data;
  const content = `
    <div style="background:#fff7ed;border:2px solid #fdba74;border-radius:8px;padding:16px;margin:0 0 20px;text-align:center;">
      <p style="font-size:32px;margin:0 0 8px;">⏳</p>
      <p style="color:#9a3412;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0;">
        ${fr ? 'Approbation en attente' : 'Approval Pending'}
      </p>
    </div>
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">
      ${fr ? 'Appareil reçu — En attente d\'approbation' : 'Device Received — Awaiting Order Approval'}
    </h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${fr
        ? `Bonjour,<br><br>Nous avons reçu l'appareil suivant dans nos locaux pour le RMA <strong>${rmaNumber}</strong>. Cependant, nous n'avons pas encore reçu l'approbation de cette commande.`
        : `Hello,<br><br>We have received the following device at our facility for RMA <strong>${rmaNumber}</strong>. However, we have not yet received the approval for this order.`}
    </p>
    <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:16px;margin:0 0 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">${fr ? 'N° RMA' : 'RMA Number'}</td>
          <td style="padding:6px 0;font-weight:700;color:#00A651;font-size:15px;font-family:monospace;">${rmaNumber}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">${fr ? 'Modèle' : 'Model'}</td>
          <td style="padding:6px 0;font-weight:600;color:#1a1a2e;font-size:14px;">${modelName || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">${fr ? 'N° de série' : 'Serial Number'}</td>
          <td style="padding:6px 0;font-weight:700;color:#1a1a2e;font-size:15px;font-family:monospace;">${serialNumber || '—'}</td>
        </tr>
        ${receivedDate ? `<tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">${fr ? 'Reçu le' : 'Received'}</td>
          <td style="padding:6px 0;font-weight:600;color:#1a1a2e;font-size:14px;">${receivedDate}</td>
        </tr>` : ''}
      </table>
    </div>
    <p style="color:#9a3412;font-size:14px;font-weight:600;line-height:1.6;margin:0 0 8px;">
      ${fr
        ? 'Nous ne pouvons pas commencer les travaux sur cet appareil tant que la commande n\'a pas été approuvée.'
        : 'We are unable to begin work on this device until the order has been approved.'}
    </p>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${fr
        ? 'Veuillez vous connecter à votre portail client pour consulter et approuver la commande afin que nous puissions procéder à l\'intervention sur votre appareil.'
        : 'Please log in to your client portal to review and approve the order so we can proceed with servicing your device.'}
    </p>
    ${ctaButton(fr ? 'Approuver ma commande →' : 'Approve My Order →', '#ea580c')}`;
  return {
    subject: fr
      ? `Lighthouse France — RMA ${rmaNumber} — Appareil reçu, en attente d'approbation`
      : `Lighthouse France — RMA ${rmaNumber} — Device Received, Awaiting Approval`,
    html: baseLayout(content, lang)
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

// Events where only Admin + Facturation users receive
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
      .select('id, email, full_name, preferred_language, can_invoice')
      .eq('company_id', companyId)
      .eq('role', 'customer')
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

    // Send to each user in their preferred language
    let sent = 0;
    const errors = [];

    for (const profile of profiles) {
      const userLang = profile.preferred_language || 'fr';
      const { subject, html } = templateFn(data, userLang);

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
