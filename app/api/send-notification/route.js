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
    <div style="background-color:#ffffff;padding:32px 24px;text-align:center;border-radius:12px 12px 0 0;border:1px solid #e5e7eb;border-bottom:3px solid #1E3A5F;">
      <img src="${LOGO_URL}" alt="Lighthouse" style="max-height:95px;margin-bottom:18px;" /><br>
      <span style="color:#1E3A5F;font-size:13px;font-weight:600;letter-spacing:0.5px;">FRANCE</span>
      <p style="color:#6b7280;font-size:12px;margin:6px 0 0;">Portail Client — Service &amp; Calibration</p>
    </div>
    <div style="background:#ffffff;padding:32px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      ${content}
    </div>
    <div style="background:#f9fafb;padding:20px 24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5;text-align:center;">
        Cet email est envoyé automatiquement. Merci de ne pas y répondre.<br>
        Lighthouse France — 16 Rue Paul Séjourné, 94000 Créteil<br>
        <a href="mailto:france@golighthouse.com" style="color:#3B7AB4;text-decoration:none;">france@golighthouse.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function deviceTableHtml(devices, borderColor = '#d1dbe6') {
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
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">📋 Nouvelle demande de service</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      Votre demande de service a été enregistrée sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> pour ${deviceCount || 0} appareil${(deviceCount || 0) > 1 ? 's' : ''}. Un devis a été préparé et est disponible pour votre examen.
    </p>
    <div style="background:#f0f4f8;border:1px solid #d1dbe6;border-radius:8px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Votre référence</p>
      <p style="font-weight:700;color:#1E3A5F;font-size:28px;font-family:monospace;margin:0;">RMA# ${rmaNumber}</p>
      <p style="color:#6b7280;font-size:13px;margin:8px 0 0;">${deviceCount || 0} appareil${(deviceCount || 0) > 1 ? 's' : ''}</p>
      <div style="margin-top:12px;">
        <span style="display:inline-block;background:#e8f0fe;color:#1E3A5F;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;">📄 Devis disponible</span>
      </div>
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Connectez-vous à votre portail client pour consulter le devis et approuver la commande afin que nous puissions commencer le traitement.
    </p>
    ${ctaButton('Voir mon devis →')}`;
  return {
    subject: `Lighthouse France — RMA# ${rmaNumber} — Devis disponible`,
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
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">📦 Réception confirmée</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      ${count > 1
        ? `Les ${count} appareils suivants sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> ont été réceptionnés dans nos locaux.`
        : `L'appareil suivant sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> a été réceptionné dans nos locaux.`}
    </p>
    <div style="background:#f0f4f8;border:1px solid #d1dbe6;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${deviceTableHtml(devices)}
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Nos techniciens commenceront le traitement sous peu. Vous serez notifié à chaque étape de l'avancement.
    </p>
    ${ctaButton('Suivre mes appareils →')}`;
  return {
    subject: `Lighthouse France — RMA# ${rmaNumber} — ${count} appareil${count > 1 ? 's' : ''} reçu${count > 1 ? 's' : ''}`,
    html: baseLayout(content)
  };
}

// ============================================
// 3. INSPECTION QUOTE (repair + supplement)
// ============================================
function inspectionQuoteEmail(data) {
  const { rmaNumber, devices } = data;
  const count = (devices || []).length;
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">🔧 Devis disponible — Action requise</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      Suite à l'inspection de ${count > 1 ? 'vos appareils' : 'votre appareil'} sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong>, nos techniciens ont identifié des anomalies qui doivent être corrigées. Un devis a été préparé pour les travaux nécessaires.
    </p>
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:0 0 20px;">
      <div style="margin-bottom:8px;">
        <span style="display:inline-block;background:#fef9c3;color:#854d0e;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid #fde68a;">⚠️ Approbation requise</span>
      </div>
      ${deviceTableHtml(devices, '#fde68a')}
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Connectez-vous à votre portail client pour consulter le devis et l'approuver afin que nous puissions procéder aux travaux.
    </p>
    <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:8px 0 0;">
      Les travaux sont en attente de votre approbation.
    </p>
    ${ctaButton('Voir mon devis →', '#d97706')}`;
  return {
    subject: `Lighthouse France — RMA# ${rmaNumber} — Devis en attente d'approbation`,
    html: baseLayout(content)
  };
}

// ============================================
// 4. ALL QC COMPLETE
// ============================================
function qcCompleteEmail(data) {
  const { rmaNumber, devices } = data;
  const count = (devices || []).length;
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">✅ Contrôle qualité terminé</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      ${count > 1
        ? `Tous les appareils sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> ont passé le contrôle qualité avec succès et sont en cours de préparation pour l'expédition.`
        : `L'appareil sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> a passé le contrôle qualité avec succès et est en cours de préparation pour l'expédition.`}
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 20px;">
      <div style="margin-bottom:8px;">
        <span style="display:inline-block;background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">✅ QC validé</span>
      </div>
      ${deviceTableHtml(devices, '#bbf7d0')}
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Vous recevrez une notification avec les informations de suivi dès que vos appareils auront été expédiés.
    </p>
    ${ctaButton('Suivre mes appareils →')}`;
  return {
    subject: `Lighthouse France — RMA# ${rmaNumber} — Prêt pour expédition`,
    html: baseLayout(content)
  };
}

// ============================================
// 5. DEVICES SHIPPED
// ============================================
function shippedEmail(data) {
  const { rmaNumber, devices, trackingNumber, carrier } = data;
  const count = (devices || []).length;
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">🚚 Expédition confirmée</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      ${count > 1
        ? `Les appareils suivants sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> ont été expédiés et sont en route vers votre site.`
        : `L'appareil suivant sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> a été expédié et est en route vers votre site.`}
    </p>
    <div style="background:#f0f4f8;border:1px solid #d1dbe6;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${deviceTableHtml(devices)}
      ${trackingNumber || carrier ? `
      <div style="margin-top:16px;padding-top:16px;border-top:2px solid #d1dbe6;">
        <table style="width:100%;border-collapse:collapse;">
          ${carrier ? `<tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;">Transporteur</td>
            <td style="padding:4px 0;font-weight:600;color:#1E3A5F;font-size:14px;">${carrier}</td>
          </tr>` : ''}
          ${trackingNumber ? `<tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;">N° de suivi</td>
            <td style="padding:4px 0;font-weight:700;color:#1E3A5F;font-size:14px;font-family:monospace;">${trackingNumber}</td>
          </tr>` : ''}
        </table>
      </div>` : ''}
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Pour toute question concernant votre envoi, n'hésitez pas à nous contacter via le portail client.
    </p>
    ${ctaButton('Voir les détails →')}`;
  return {
    subject: `Lighthouse France — RMA# ${rmaNumber} — Expédié${trackingNumber ? ' — Suivi: ' + trackingNumber : ''}`,
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
      Une facture a été émise pour le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong>. Vous pouvez la consulter et la télécharger depuis votre portail client.
    </p>
    <div style="background:#f0f4f8;border:1px solid #d1dbe6;border-radius:8px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Facture</p>
      <p style="font-weight:700;color:#1E3A5F;font-size:22px;font-family:monospace;margin:0;">${invoiceNumber}</p>
      <p style="color:#3B7AB4;font-size:13px;font-weight:600;margin:10px 0 0;">RMA# ${rmaNumber}</p>
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Connectez-vous à votre portail client pour consulter les détails et télécharger le PDF.
    </p>
    ${ctaButton('Voir ma facture →')}`;
  return {
    subject: `Lighthouse France — Facture ${invoiceNumber} — RMA# ${rmaNumber}`,
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
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">Appareil reçu sans demande de service</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      Nous avons reçu l'appareil <strong style="color:#1E3A5F;">${modelName || ''} SN ${serialNumber || ''}</strong> dans nos locaux, mais aucune demande de service n'est actuellement associée à cet appareil.
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
      Sans demande de service, nous ne sommes pas en mesure d'effectuer de travaux sur cet appareil.
    </p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Connectez-vous à votre portail client pour soumettre une demande de service.
    </p>
    ${ctaButton('Ouvrir une demande →', '#dc2626')}`;
  return {
    subject: `Lighthouse France — ⚠ Appareil reçu sans demande de service`,
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
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">Appareil reçu — Commande non approuvée</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      L'appareil <strong style="color:#1E3A5F;">${modelName || ''} SN ${serialNumber || ''}</strong> sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> a été réceptionné dans nos locaux. Cependant, la commande n'a pas encore été approuvée.
    </p>
    <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:16px;margin:0 0 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">RMA#</td>
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
      Nous ne pouvons pas commencer les travaux tant que la commande n'a pas été approuvée.
    </p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Connectez-vous à votre portail client pour approuver la commande.
    </p>
    ${ctaButton('Approuver ma commande →', '#ea580c')}`;
  return {
    subject: `Lighthouse France — RMA# ${rmaNumber} — En attente d'approbation`,
    html: baseLayout(content)
  };
}

// ============================================
// TEMPLATE ROUTER
// ============================================
// ============================================
// 9. SHIPPING DOCS REQUIRED (own_label return)
// ============================================
function shippingDocsRequiredEmail(data) {
  const { rmaNumber, devices } = data;
  const count = (devices || []).length;
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">📦 Documents de transport requis</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      ${count > 1
        ? `Les appareils suivants sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> sont <strong>prêts pour expédition</strong>.`
        : `L'appareil suivant sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> est <strong>prêt pour expédition</strong>.`}
    </p>
    <div style="background:#f0f4f8;border:1px solid #d1dbe6;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${deviceTableHtml(devices)}
    </div>
    <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="color:#92400e;font-size:14px;font-weight:600;margin:0 0 8px;">⚠️ Action requise — Étiquette de transport</p>
      <p style="color:#92400e;font-size:13px;line-height:1.5;margin:0;">
        Vous avez choisi de fournir votre propre étiquette de retour. Veuillez vous connecter à votre portail client pour soumettre :<br>
        • Votre <strong>étiquette de transport</strong> (PDF ou image)<br>
        • Le nom de votre <strong>transporteur</strong><br>
        • La <strong>date d'enlèvement</strong> prévue
      </p>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 4px;">
      Une fois vos documents soumis, notre équipe les vérifiera et confirmera l'enlèvement.
    </p>
    ${ctaButton('Soumettre mes documents →')}`;
  return {
    subject: `Lighthouse France — RMA# ${rmaNumber} — ⚠️ Documents de transport requis`,
    html: baseLayout(content)
  };
}

// ============================================
// 10. PICKUP READY (customer picks up device)
// ============================================
function pickupReadyEmail(data) {
  const { rmaNumber, devices } = data;
  const count = (devices || []).length;
  const content = `
    <h2 style="color:#1E3A5F;font-size:18px;margin:0 0 8px;">✅ Votre appareil est prêt</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Bonjour,<br><br>
      ${count > 1
        ? `Les appareils suivants sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> sont prêts et peuvent être récupérés à notre atelier.`
        : `L'appareil suivant sous le <strong style="color:#1E3A5F;">RMA# ${rmaNumber}</strong> est prêt et peut être récupéré à notre atelier.`}
    </p>
    <div style="background:#f0f4f8;border:1px solid #d1dbe6;border-radius:8px;padding:16px;margin:0 0 20px;">
      ${deviceTableHtml(devices)}
    </div>
    <div style="background:#ecfdf5;border:2px solid #10b981;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="color:#065f46;font-size:14px;font-weight:700;margin:0 0 10px;">🏢 Retrait sur place</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;color:#065f46;font-size:13px;width:90px;vertical-align:top;font-weight:600;">Adresse</td>
          <td style="padding:4px 0;color:#065f46;font-size:13px;">Lighthouse France<br>16 Rue Paul Séjourné<br>94000 Créteil</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#065f46;font-size:13px;font-weight:600;">Horaires</td>
          <td style="padding:4px 0;color:#065f46;font-size:13px;">
            <strong>Matin :</strong> 9h00 – 12h30<br>
            <strong>Après-midi :</strong> 14h00 – 17h30
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#065f46;font-size:13px;font-weight:600;">Téléphone</td>
          <td style="padding:4px 0;color:#065f46;font-size:13px;">+33 (0)1 43 77 28 07</td>
        </tr>
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 4px;">
      Merci de vous munir d'une pièce d'identité lors du retrait. Pour toute question, contactez-nous via le portail client.
    </p>
    ${ctaButton('Voir les détails →')}`;
  return {
    subject: `Lighthouse France — RMA# ${rmaNumber} — ✅ Prêt pour retrait`,
    html: baseLayout(content)
  };
}

const TEMPLATES = {
  rma_created: rmaCreatedEmail,
  device_received: deviceReceivedEmail,
  inspection_quote: inspectionQuoteEmail,
  qc_complete: qcCompleteEmail,
  shipped: shippedEmail,
  invoice_sent: invoiceSentEmail,
  no_rma: noRmaEmail,
  no_bc: noBcEmail,
  shipping_docs_required: shippingDocsRequiredEmail,
  pickup_ready: pickupReadyEmail,
};

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

    let query = supabase
      .from('profiles')
      .select('id, email, full_name, can_invoice')
      .eq('company_id', companyId)
      .eq('role', 'admin')
      .eq('is_active', true);

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
