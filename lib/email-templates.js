// lib/email-templates.js

const header = `
  <div style="background-color: #ffffff; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; border: 1px solid #e5e7eb; border-bottom: 3px solid #1E3A5F;">
    <img src="https://lighthouse-rma.vercel.app/images/logos/Lighthouse-color-logo.jpg" alt="Lighthouse" style="max-height: 95px; margin-bottom: 18px;" /><br>
    <span style="color: #1E3A5F; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">FRANCE</span>
    <p style="color: #6b7280; font-size: 12px; margin: 6px 0 0;">Portail Client — Service & Calibration</p>
  </div>`;

const footer = `
  <div style="background: #f9fafb; padding: 20px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="color: #9ca3af; font-size: 11px; margin: 0; line-height: 1.5; text-align: center;">
      Lighthouse France — 16 Rue Paul Séjourné, 94000 Créteil<br>
      <a href="mailto:france@golighthouse.com" style="color: #3B7AB4; text-decoration: none;">france@golighthouse.com</a>
    </p>
  </div>`;

function wrap(content) {
  return `<div style="max-width: 520px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">${header}<div style="background: #ffffff; padding: 32px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">${content}</div>${footer}</div>`;
}

function infoBox(rows) {
  const rowsHtml = rows.map(([label, value]) =>
    `<tr><td style="padding: 4px 0; font-weight: 600;">${label}</td><td style="padding: 4px 0;">${value}</td></tr>`
  ).join('');
  return `<div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;"><table style="width: 100%; font-size: 14px; color: #374151;">${rowsHtml}</table></div>`;
}

function button(text, url = 'https://lighthouse-rma.vercel.app/customer') {
  return `<div style="text-align: center; margin: 28px 0;"><a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #3B7AB4, #1E3A5F); color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 15px;">${text}</a></div>`;
}

export function deviceReceivedEmail(customerName, serialNumber, rmaNumber) {
  return {
    subject: `RMA ${rmaNumber} — Appareil reçu`,
    html: wrap(`
      <h2 style="color: #1E3A5F; font-size: 18px; margin: 0 0 8px;">Appareil reçu ✓</h2>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${customerName},<br><br>
        Nous avons bien reçu votre appareil dans nos locaux de Créteil.
      </p>
      ${infoBox([['N° RMA :', rmaNumber], ['N° de série :', serialNumber]])}
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
        Notre équipe va procéder à l'inspection de votre appareil. Vous recevrez une mise à jour dès que le diagnostic sera terminé.
      </p>
      ${button('Suivre mon RMA')}
    `),
  };
}

export function diagnosticCompleteEmail(customerName, serialNumber, rmaNumber) {
  return {
    subject: `RMA ${rmaNumber} — Diagnostic terminé`,
    html: wrap(`
      <h2 style="color: #1E3A5F; font-size: 18px; margin: 0 0 8px;">Diagnostic terminé 🔍</h2>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${customerName},<br><br>
        Le diagnostic de votre appareil est terminé. Vous trouverez les détails et le devis sur votre espace client.
      </p>
      ${infoBox([['N° RMA :', rmaNumber], ['N° de série :', serialNumber]])}
      ${button('Voir le diagnostic')}
    `),
  };
}

export function quoteReadyEmail(customerName, serialNumber, rmaNumber) {
  return {
    subject: `RMA ${rmaNumber} — Devis disponible`,
    html: wrap(`
      <h2 style="color: #1E3A5F; font-size: 18px; margin: 0 0 8px;">Devis disponible 📋</h2>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${customerName},<br><br>
        Un devis pour votre appareil est prêt pour votre validation. Veuillez le consulter sur votre espace client.
      </p>
      ${infoBox([['N° RMA :', rmaNumber], ['N° de série :', serialNumber]])}
      ${button('Consulter le devis')}
    `),
  };
}

export function repairInProgressEmail(customerName, serialNumber, rmaNumber) {
  return {
    subject: `RMA ${rmaNumber} — Réparation en cours`,
    html: wrap(`
      <h2 style="color: #1E3A5F; font-size: 18px; margin: 0 0 8px;">Réparation en cours 🔧</h2>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${customerName},<br><br>
        La réparation de votre appareil est en cours. Nous vous tiendrons informé(e) de l'avancement.
      </p>
      ${infoBox([['N° RMA :', rmaNumber], ['N° de série :', serialNumber]])}
      ${button('Suivre mon RMA')}
    `),
  };
}

export function calibrationInProgressEmail(customerName, serialNumber, rmaNumber) {
  return {
    subject: `RMA ${rmaNumber} — Calibration en cours`,
    html: wrap(`
      <h2 style="color: #1E3A5F; font-size: 18px; margin: 0 0 8px;">Calibration en cours ⚙️</h2>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${customerName},<br><br>
        Votre appareil est actuellement en cours de calibration dans notre laboratoire.
      </p>
      ${infoBox([['N° RMA :', rmaNumber], ['N° de série :', serialNumber]])}
      ${button('Suivre mon RMA')}
    `),
  };
}

export function deviceShippedEmail(customerName, serialNumber, rmaNumber, trackingNumber) {
  const rows = [['N° RMA :', rmaNumber], ['N° de série :', serialNumber]];
  if (trackingNumber) rows.push(['N° de suivi :', trackingNumber]);

  return {
    subject: `RMA ${rmaNumber} — Appareil expédié`,
    html: wrap(`
      <h2 style="color: #1E3A5F; font-size: 18px; margin: 0 0 8px;">Appareil expédié 📦</h2>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${customerName},<br><br>
        Votre appareil a été expédié et est en route vers vous.
      </p>
      ${infoBox(rows)}
      ${button('Suivre mon RMA')}
    `),
  };
}
