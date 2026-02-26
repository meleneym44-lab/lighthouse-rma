'use client';
import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import { supabase } from '@/lib/supabase';

// Expose supabase to window for debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

// France Metropolitan postal code check
// Valid France Metropolitan: 5 digits, starting with 01-95 (includes Corsica 20)
// INVALID (show warning): DOM-TOM (97xxx, 98xxx), foreign addresses, or non-French codes

// French date formatter: "19 février 2026"
const formatDateWrittenFR = (d) => {
  const date = new Date(d);
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
};

const isFranceMetropolitan = (postalCode) => {
  if (!postalCode) return false; // No postal code = can't verify = show warning
  
  // Clean the postal code (remove spaces)
  const cleaned = postalCode.toString().replace(/\s/g, '');
  
  // Must be exactly 5 digits for France
  if (!/^\d{5}$/.test(cleaned)) return false;
  
  // Get first 2 digits (department code)
  const dept = parseInt(cleaned.substring(0, 2), 10);
  
  // France Metropolitan departments: 01-95
  // 01-19: Valid
  // 20: Corsica (2A/2B) - included in metropolitan
  // 21-95: Valid
  // 96: Not used
  // 97-98: DOM-TOM (overseas) - NOT metropolitan
  // 99: Not used
  return dept >= 1 && dept <= 95;
};

// Returns true if address is OUTSIDE France Metropolitan (needs warning)
const isOutsideFranceMetropolitan = (postalCode) => {
  return !isFranceMetropolitan(postalCode);
};

// ============================================
// SERIAL NUMBER DECODER - LIGHTHOUSE PRODUCTS
// ============================================
// Serial number formats:
// 9-digit: YYMMCC### (CC = 2-digit product code)
// 10-digit: YYMMCCC### (CCC = 3-digit product code)
// 8-digit: CCC##### (CCC = 3-digit product code for accessories)

const PRODUCT_CODES = {
  // === 9-DIGIT SERIAL NUMBERS (2-digit CC codes) ===
  // Airborne Particle Counters
  '01': { model: 'Remote CEMS', category: 'particle_counter' },
  '02': { model: 'Handheld 3016', category: 'particle_counter' },
  '03': { model: 'Solair 5100/5100+', category: 'particle_counter' },
  '04': { model: 'Solair 3100/3100+', category: 'particle_counter' },
  '05': { model: 'Solair 1100/1100+', category: 'particle_counter' },
  '06': { model: 'Remote 1100/1104/1100LD/1104LD', category: 'particle_counter' },
  '07': { model: 'Remote 5100', category: 'particle_counter' },
  '08': { model: 'Remote 3010/5010', category: 'particle_counter' },
  '09': { model: 'Mini Manifold 1.0 CFM', category: 'particle_counter' },
  '10': { model: 'Remote 3014P/5014P', category: 'particle_counter' },
  '11': { model: 'Manifold Controller', category: 'other' },
  '12': { model: 'TRH Sensor (0-5V version)', category: 'temp_humidity' },
  '13': { model: 'AV Probe - Instrument', category: 'other' },
  '14': { model: 'DP Sensor - Instrument', category: 'other' },
  '15': { model: 'AMC Sample System', category: 'other' },
  '16': { model: 'Remote 3014/5014', category: 'particle_counter' },
  '17': { model: 'Remote 3012/5012', category: 'particle_counter' },
  '18': { model: 'Remote 5102', category: 'particle_counter' },
  '19': { model: 'Remote 2010', category: 'particle_counter' },
  '20': { model: 'Remote 2014P', category: 'particle_counter' },
  '21': { model: 'Remote 2014', category: 'particle_counter' },
  '22': { model: 'Handheld 2016', category: 'particle_counter' },
  '23': { model: 'Solair 3010+', category: 'particle_counter' },
  '24': { model: 'Remote 3014i/5014i', category: 'particle_counter' },
  '25': { model: 'Remote 50104', category: 'particle_counter' },
  '26': { model: 'Solair 1001+', category: 'particle_counter' },
  '27': { model: 'Handheld 5016', category: 'particle_counter' },
  '28': { model: 'Remote 5104', category: 'particle_counter' },
  '29': { model: 'UM-II (or 32 Port Manifold)', category: 'other' },
  '30': { model: 'Mini Manifold 0.1 CFM', category: 'other' },
  '31': { model: 'Remote 3102', category: 'particle_counter' },
  '32': { model: 'Remote 3104', category: 'particle_counter' },
  '33': { model: 'Boulder Counter', category: 'particle_counter' },
  '34': { model: 'Remote 5104V', category: 'particle_counter' },
  '35': { model: 'Remote 2014i', category: 'particle_counter' },
  '36': { model: 'Remote 3104V', category: 'particle_counter' },
  '37': { model: 'Remote 2012', category: 'particle_counter' },
  '38': { model: 'Solair 5200/5200+', category: 'particle_counter' },
  '39': { model: 'Solair 3200/3200+', category: 'particle_counter' },
  '40': { model: 'Remote LPC 0.2μm/0.3μm/0.5μm (Modbus)', category: 'liquid_counter' },
  '41': { model: 'Remote LPC 0.1μm (Modbus)', category: 'liquid_counter' },
  '42': { model: 'LS-60', category: 'liquid_counter' },
  '43': { model: 'NanoCount/NC50+/NC65C+/NC25+/NC30+', category: 'liquid_counter' },
  '44': { model: 'IAQ Handheld', category: 'particle_counter' },
  '45': { model: 'MiniMultiplexer', category: 'other' },
  '46': { model: 'Remote LPC 0.2μm/0.3μm/0.5μm (4-20mA)', category: 'liquid_counter' },
  '47': { model: 'Remote LPC 0.1μm (4-20mA)', category: 'liquid_counter' },
  '48': { model: 'LS-20', category: 'liquid_counter' },
  '49': { model: 'Remote LPC 1.5μm (Modbus)', category: 'liquid_counter' },
  '50': { model: 'Solair 3100Rx', category: 'particle_counter' },
  '51': { model: 'Solair 5100Rx', category: 'particle_counter' },
  '52': { model: 'Solair 3200Rx', category: 'particle_counter' },
  '53': { model: 'Solair 5200Rx', category: 'particle_counter' },
  '54': { model: 'Remote PN 0.1 CFM (Modbus)', category: 'particle_counter' },
  '55': { model: 'Remote PN 0.1 CFM (4-20mA)', category: 'particle_counter' },
  '56': { model: 'Remote PN 1.0 CFM (Modbus)', category: 'particle_counter' },
  '57': { model: 'Remote PN 1.0 CFM (4-20mA)', category: 'particle_counter' },
  '58': { model: 'TOC, Neptune', category: 'other' },
  '60': { model: 'Handheld 3013', category: 'particle_counter' },
  '61': { model: 'Solair 2010+', category: 'particle_counter' },
  '62': { model: 'Solair 3350/5350/3350Rx/5350Rx', category: 'particle_counter' },
  '65': { model: 'Viable, Remote Active Count', category: 'bio_collector' },
  '70': { model: 'TRH Sensor (SIU)', category: 'temp_humidity' },
  '71': { model: 'DP Sensor - Analog (SIU)', category: 'other' },
  '72': { model: 'Freq. DP Sensor (SIU)', category: 'other' },
  '73': { model: 'Remote 5104P', category: 'particle_counter' },
  '74': { model: 'Remote 3104P', category: 'particle_counter' },
  '75': { model: 'Remote 50104V', category: 'particle_counter' },
  '76': { model: 'Remote 5102V', category: 'particle_counter' },
  '80': { model: 'SIU Standard', category: 'other' },
  '81': { model: 'SIU Lite', category: 'other' },
  '82': { model: 'IDP', category: 'other' },
  '83': { model: 'IIU Gateway', category: 'other' },
  '84': { model: 'IIU HSEM', category: 'other' },
  '85': { model: 'IIU Analog', category: 'other' },
  '86': { model: 'IIU Alarm Controller', category: 'other' },
  '87': { model: 'AAU', category: 'other' },
  '88': { model: '8 Port Alarm Controller', category: 'other' },
  '89': { model: 'Toggle Switch Controller', category: 'other' },
  '92': { model: 'LMS Laptop', category: 'other' },
  '93': { model: 'LMS Computer', category: 'other' },
  '94': { model: 'LMS DataServer', category: 'other' },
  '98': { model: 'S1100LD Standard', category: 'particle_counter' },
  '99': { model: 'Specials', category: 'other' },

  // === 10-DIGIT SERIAL NUMBERS (3-digit CCC codes) ===
  '100': { model: 'ApexR5', category: 'particle_counter' },
  '101': { model: 'ApexR3', category: 'particle_counter' },
  '102': { model: 'ApexR02', category: 'particle_counter' },
  '103': { model: 'ApexR03', category: 'particle_counter' },
  '104': { model: 'ApexR05', category: 'particle_counter' },
  '105': { model: 'ApexP3', category: 'particle_counter' },
  '106': { model: 'ApexP5', category: 'particle_counter' },
  '129': { model: 'ActiveCount25H', category: 'bio_collector' },
  '130': { model: 'ActiveCount100', category: 'bio_collector' },
  '131': { model: 'ActiveCount100H', category: 'bio_collector' },
  '140': { model: 'Apex 1100', category: 'particle_counter' },
  '141': { model: 'ApexZ3', category: 'particle_counter' },
  '142': { model: 'ApexZ30', category: 'particle_counter' },
  '143': { model: 'ApexZ5', category: 'particle_counter' },
  '144': { model: 'ApexZ50', category: 'particle_counter' },
  '150': { model: 'ApexR02P', category: 'particle_counter' },
  '151': { model: 'ApexR03P', category: 'particle_counter' },
  '152': { model: 'ApexR05P', category: 'particle_counter' },
  '153': { model: 'ApexR3P', category: 'particle_counter' },
  '154': { model: 'ApexR5P', category: 'particle_counter' },
  '155': { model: 'ApexBCRp', category: 'bio_collector' },
  '160': { model: 'FILTR', category: 'other' },
  '165': { model: 'Manifold III', category: 'other' },
  '170': { model: 'Vertex50', category: 'liquid_counter' },
  '171': { model: 'Vertex50C', category: 'liquid_counter' },
  '172': { model: 'Vertex100', category: 'liquid_counter' },
  '504': { model: 'Pentagon QIII ST', category: 'other' },
  '505': { model: 'Pentagon QIII SX', category: 'other' },
  '506': { model: 'Pentagon QIII SM', category: 'other' },

  // === 8-DIGIT SERIAL NUMBERS (3-digit CCC codes for accessories) ===
  '100_acc': { model: '0.1 CFM MiniManifold Blower', category: 'other' },
  '101_acc': { model: 'Handheld Battery', category: 'other' },
  '102_acc': { model: 'Solair Battery', category: 'other' },
  '103_acc': { model: 'Engineering Serial Number', category: 'other' },
  '104_acc': { model: '1.0 CFM MiniManifold Blower', category: 'other' },
  '110_acc': { model: 'Remote Display - Remote P', category: 'other' },
  '112_acc': { model: 'Remote Display - NC', category: 'other' },
  '120_acc': { model: 'TRH Probe (Handhelds, R4-Series, TRH Wands)', category: 'temp_humidity' },
  '125_acc': { model: 'TRH Digital Probe', category: 'temp_humidity' },
  '130_acc': { model: 'Current to Frequency Converter', category: 'other' },
  '140_acc': { model: 'Voltage to Frequency Converter', category: 'other' },
  '150_acc': { model: 'IFS, ScanAir, ScanAir Pro', category: 'bio_collector' },
  '160_acc': { model: 'RS485 Gateway', category: 'other' },
  '170_acc': { model: 'DP Switch', category: 'other' },
  '180_acc': { model: 'Particle Diluter', category: 'diluter' },
  '185_acc': { model: 'RA-25 Flow Calibrator', category: 'other' },
  '190_acc': { model: 'RA-100 Flow Calibrator', category: 'other' },
  '250_acc': { model: 'High Pressure Diffuser 1.0 cfm', category: 'other' },
  '260_acc': { model: 'High Pressure Diffuser 0.1 cfm', category: 'other' },
  '270_acc': { model: 'High Pressure Controller 1100', category: 'other' },
  '280_acc': { model: 'High Pressure Diffuser 2.0 cfm', category: 'other' },
  '290_acc': { model: 'High Pressure Diffuser 3.5 cfm, 5-10 PSI', category: 'other' },
  '291_acc': { model: 'High Pressure Diffuser 3.5 cfm, 30-70 PSI', category: 'other' },
  '292_acc': { model: 'High Pressure Diffuser 3.5 cfm, 70-150 PSI', category: 'other' },
  '293_acc': { model: 'High Pressure Diffuser 3.5 cfm, 30-150 PSI', category: 'other' },
  '330_acc': { model: 'TRH Sensor', category: 'temp_humidity' },
  '340_acc': { model: 'TRH Wand', category: 'temp_humidity' },
  '350_acc': { model: 'Data Server HASP Key', category: 'other' },
  '351_acc': { model: 'Web Server HASP Key', category: 'other' },
  '352_acc': { model: 'LMS System HASP Key', category: 'other' },
  '420_acc': { model: 'Liquid Calibration Station 110V', category: 'other' },
  '421_acc': { model: 'Liquid Calibration Station 220V', category: 'other' },
  '510_acc': { model: 'Air Calibration Station', category: 'other' },
  '520_acc': { model: 'System Cabinet', category: 'other' },
};

// Product emoji image mapping — maps model names to custom product images
// Images hosted at /images/products/ in the public folder
const getDeviceImageUrl = (modelName) => {
  if (!modelName) return null;
  const m = modelName.toLowerCase();
  if (m.startsWith('apexp') || m === 'apex p3' || m === 'apex p5') return '/images/products/ApexP-Emoji.png';
  if (m.startsWith('apexr') || m.startsWith('apex r') || m === 'apexbcrp') return '/images/products/ApexR-Emoji.png';
  if (m.startsWith('apexz') || m === 'apex z' || m === 'apex 1100') return '/images/products/ApexZ-Emoji.png';
  if (m.startsWith('solair')) return '/images/products/Solair-Emoji.png';
  if (m.startsWith('ls-') || m === 'ls20' || m === 'ls60') return '/images/products/LS-Emoji.png';
  if (m.startsWith('vertex')) return '/images/products/Vertex-Emoji.png';
  if (m.startsWith('handheld') || m.startsWith('iaq handheld')) return '/images/products/HandHeld-Emoji.png';
  if (m.startsWith('activecount') || m.includes('active count')) return '/images/products/ActiveCount-Emoji.png';
  return null;
};

// Decode serial number to get model and category
const decodeSerialNumber = (serialNumber) => {
  if (!serialNumber) return null;
  
  // Clean the serial number (remove spaces, dashes)
  const sn = serialNumber.toString().replace(/[\s-]/g, '');
  
  // Must be all digits
  if (!/^\d+$/.test(sn)) return null;
  
  const length = sn.length;
  let productCode = null;
  let format = null;
  
  if (length === 9) {
    // 9-digit: YYMMCC### - extract CC (positions 4-5, 0-indexed)
    productCode = sn.substring(4, 6);
    format = '9-digit';
  } else if (length === 10) {
    // 10-digit: YYMMCCC### - extract CCC (positions 4-6, 0-indexed)
    productCode = sn.substring(4, 7);
    format = '10-digit';
  } else if (length === 8) {
    // 8-digit: CCC##### - extract CCC (positions 0-2)
    productCode = sn.substring(0, 3) + '_acc';
    format = '8-digit';
  } else {
    return null;
  }
  
  // Look up the product code
  let product = PRODUCT_CODES[productCode];
  
  // For 8-digit, also try without _acc suffix (some overlap)
  if (!product && format === '8-digit') {
    product = PRODUCT_CODES[sn.substring(0, 3)];
  }
  
  if (product) {
    return {
      model: product.model,
      category: product.category,
      productCode: productCode.replace('_acc', ''),
      format
    };
  }
  
  return null;
};

// ============================================
// QUOTE DISPLAY TEMPLATES
// ============================================
const CALIBRATION_TEMPLATES = {
  particle_counter: {
    icon: '🔬',
    title: "Étalonnage Compteur de Particules Aéroportées",
    prestations: [
      "Vérification des fonctionnalités du compteur",
      "Vérification et réglage du débit",
      "Vérification de la cellule de mesure",
      "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
      "Vérification en nombre par comparaison à un étalon étalonné selon la norme ISO 17025, conformément à la norme ISO 21501-4",
      "Fourniture d'un rapport de test et de calibration"
    ]
  },
  bio_collector: {
    icon: '🧫',
    title: "Étalonnage Bio Collecteur",
    prestations: [
      "Vérification des fonctionnalités de l'appareil",
      "Vérification et réglage du débit",
      "Vérification de la cellule d'impaction",
      "Contrôle des paramètres de collecte",
      "Fourniture d'un rapport de test et de calibration"
    ]
  },
  liquid_counter: {
    icon: '💧',
    title: "Étalonnage Compteur de Particules en Milieu Liquide",
    prestations: [
      "Vérification des fonctionnalités du compteur",
      "Vérification et réglage du débit",
      "Vérification de la cellule de mesure optique",
      "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
      "Vérification en nombre par comparaison à un étalon",
      "Fourniture d'un rapport de test et de calibration"
    ]
  },
  temp_humidity: {
    icon: '🌡️',
    title: "Étalonnage Capteur Température/Humidité",
    prestations: [
      "Vérification des fonctionnalités du capteur",
      "Étalonnage température sur points de référence certifiés",
      "Étalonnage humidité relative",
      "Vérification de la stabilité des mesures",
      "Fourniture d'un certificat d'étalonnage"
    ]
  },
  other: {
    icon: '📦',
    title: "Étalonnage Équipement",
    prestations: [
      "Vérification des fonctionnalités de l'appareil",
      "Étalonnage selon les spécifications du fabricant",
      "Tests de fonctionnement",
      "Fourniture d'un rapport de test"
    ]
  },
  diluter: {
    icon: '🌀',
    title: "Étalonnage Diluteur de Particules",
    prestations: [
      "Vérification des fonctionnalités du diluteur",
      "Contrôle du taux de dilution",
      "Vérification de l'étanchéité du système",
      "Tests de performance",
      "Fourniture d'un rapport de test et de calibration"
    ]
  }
};

const REPAIR_TEMPLATE = {
  icon: '🔧',
  title: "Réparation",
  prestations: [
    "Diagnostic complet de l'appareil",
    "Identification des composants défectueux",
    "Remplacement des pièces défectueuses (pièces facturées en sus)",
    "Tests de fonctionnement complets",
    "Vérification d'étalonnage post-réparation si applicable"
  ]
};

const QUOTE_DISCLAIMERS = [
  "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.",
  "Un devis complémentaire sera établi si des pièces sont trouvées défectueuses et nécessitent un remplacement.",
  "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de maintenance.",
  "Les équipements envoyés devront être décontaminés de toutes substances chimiques, bactériennes ou radioactives."
];

// ============================================
// SHARED QUOTE DOCUMENT VIEW COMPONENT
// Matches the PDF style exactly for all quote types
// ============================================
function QuoteDocumentView({ 
  title = 'OFFRE DE PRIX', docNumber, reference, refLabel = 'RMA',
  date, company = {}, quoteData = {}, conditions = [],
  addressMode = 'both', // 'both' = ship+bill boxes, 'billing_only' = full-width bill box
  children, onClose, onApprove, showApprove = false,
  bcData = null, extraInfoBar = null, extraFooterLeft = null
}) {
  // PDF-matched colors: darkBlue=#1a1a2e (headers/footer), navy=#2D5A7B (titles/total/accents)
  const billingAddr = quoteData.billingAddress || null;
  const shippingAddr = quoteData.shippingAddress || null;
  const submitterName = quoteData.submitterName || null;
  const returnShipping = quoteData.returnShipping || 'standard';
  const qDate = date ? formatDateWrittenFR(new Date(date)) : formatDateWrittenFR(new Date());

  const renderShipTo = () => {
    if (returnShipping === 'pickup') return (
      <><p className="font-bold text-[#1a1a2e]">Enlèvement client</p>
      <p className="text-sm text-gray-600">Le client récupérera la commande dans nos locaux.</p></>
    );
    if (returnShipping === 'own_label') return (
      <><p className="font-bold text-[#1a1a2e]">Expédition client</p>
      <p className="text-sm text-gray-600">Le client fournira son propre transporteur.</p></>
    );
    const addr = shippingAddr;
    const name = addr?.company_name || company.name || 'Client';
    const attn = addr?.attention || submitterName || company.contact_name;
    return (<>
      <p className="font-bold text-[#1a1a2e]">{name}</p>
      {attn && <p className="text-sm text-gray-600">Attn: {attn}</p>}
      {addr ? (<>
        {addr.address_line1 && <p className="text-sm text-gray-600">{addr.address_line1}</p>}
        {(addr.postal_code || addr.city) && <p className="text-sm text-gray-600">{[addr.postal_code, addr.city].filter(Boolean).join(' ')}{addr.country ? `, ${addr.country}` : ''}</p>}
        {addr.phone && <p className="text-sm text-gray-500">Tél: {addr.phone}</p>}
      </>) : (<>
        {(company.billing_address || company.address) && <p className="text-sm text-gray-600">{company.billing_address || company.address}</p>}
        {(company.billing_postal_code || company.postal_code || company.billing_city || company.city) && <p className="text-sm text-gray-600">{[company.billing_postal_code || company.postal_code, company.billing_city || company.city].filter(Boolean).join(' ')}</p>}
        {company.phone && <p className="text-sm text-gray-500">Tél: {company.phone}</p>}
      </>)}
    </>);
  };

  const renderBillTo = () => {
    const addr = billingAddr;
    const name = addr?.company_name || company.name || 'Client';
    return (<>
      <p className="font-bold text-[#1a1a2e]">{name}</p>
      {addr ? (<>
        {addr.attention && <p className="text-sm text-gray-600">Contact: {addr.attention}</p>}
        {addr.address_line1 && <p className="text-sm text-gray-600">{addr.address_line1}</p>}
        {(addr.postal_code || addr.city) && <p className="text-sm text-gray-600">{[addr.postal_code, addr.city].filter(Boolean).join(' ')}{addr.country ? `, ${addr.country}` : ''}</p>}
        {addr.phone && <p className="text-sm text-gray-500">Tél: {addr.phone}</p>}
        {addr.siret && <p className="text-sm font-bold text-[#1a1a2e]">SIRET: {addr.siret}</p>}
        {addr.tva_number && <p className="text-sm font-bold text-[#1a1a2e]">TVA: {addr.tva_number}</p>}
        {addr.chorus_invoicing && <p className="text-xs text-blue-600">Chorus Pro{addr.chorus_service_code ? ` — Service: ${addr.chorus_service_code}` : ''}</p>}
      </>) : (<>
        {(company.billing_address || company.address) && <p className="text-sm text-gray-600">{company.billing_address || company.address}</p>}
        {(company.billing_postal_code || company.postal_code || company.billing_city || company.city) && <p className="text-sm text-gray-600">{[company.billing_postal_code || company.postal_code, company.billing_city || company.city].filter(Boolean).join(' ')}</p>}
        {company.tva_number && <p className="text-sm font-bold text-[#1a1a2e]">TVA: {company.tva_number}</p>}
      </>)}
    </>);
  };

  const shipLabel = returnShipping === 'pickup' ? 'RETRAIT CLIENT' : returnShipping === 'own_label' ? 'TRANSPORT CLIENT' : 'LIVRER À';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#1a1a2e] text-white px-6 py-4 flex justify-between items-center z-10 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-gray-300">{docNumber || reference || ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl">&times;</button>
        </div>

        <div id="quote-doc-content">
          {/* Header */}
          <div className="px-8 pt-8 pb-4 border-b-2 border-[#2D5A7B]">
            <div className="flex justify-between items-start">
              <img src="/images/logos/Lighthouse-color-logo.jpg" alt="Lighthouse France" className="h-20 w-auto"
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
              <div style={{ display: 'none' }}><h1 className="text-3xl font-bold text-[#1a1a2e]">LIGHTHOUSE</h1></div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#2D5A7B]">{title}</p>
                <p className="font-bold text-[#1a1a2e]">N° {docNumber || '—'}</p>
                {reference && docNumber !== reference && <p className="text-xs text-gray-400">{refLabel}: {reference}</p>}
              </div>
            </div>
          </div>

          {/* Info Bar */}
          <div className="bg-[#f5f5f5] px-8 py-3 flex justify-between text-sm border-b">
            <div>
              <p className="text-[10px] text-[#828282] uppercase tracking-wider">DATE</p>
              <p className="font-bold text-[#1a1a2e]">{qDate}</p>
            </div>
            {extraInfoBar ? extraInfoBar : (<>
              <div>
                <p className="text-[10px] text-[#828282] uppercase tracking-wider">VALIDITÉ</p>
                <p className="font-bold text-[#1a1a2e]">30 jours</p>
              </div>
              <div>
                <p className="text-[10px] text-[#828282] uppercase tracking-wider">CONDITIONS</p>
                <p className="font-bold text-[#1a1a2e]">À réception de facture</p>
              </div>
            </>)}
          </div>

          {/* Address Boxes */}
          {addressMode === 'both' ? (
            <div className="px-8 py-4 grid grid-cols-2 gap-4 border-b">
              <div className="border-2 border-[#2D5A7B]/50 rounded p-3">
                <p className="text-[10px] font-bold text-[#2D5A7B] uppercase tracking-wider mb-2">{shipLabel}</p>
                {renderShipTo()}
              </div>
              <div className="border-2 border-[#2D5A7B]/50 rounded p-3">
                <p className="text-[10px] font-bold text-[#2D5A7B] uppercase tracking-wider mb-2">FACTURER À</p>
                {renderBillTo()}
              </div>
            </div>
          ) : (
            <div className="px-8 py-4 border-b">
              <div className="border-2 border-[#2D5A7B]/50 rounded p-3">
                <p className="text-[10px] font-bold text-[#2D5A7B] uppercase tracking-wider mb-2">FACTURER À</p>
                {renderBillTo()}
              </div>
            </div>
          )}

          {children}

          {/* Conditions */}
          {conditions.length > 0 && (
            <div className="px-8 py-4 border-t bg-[#f9fafb]">
              <p className="text-[10px] text-[#828282] uppercase tracking-wider mb-2 font-bold">CONDITIONS</p>
              <ul className="text-xs text-[#505050] space-y-1">
                {conditions.map((d, i) => <li key={i}>- {d}</li>)}
              </ul>
            </div>
          )}

          {/* Signature */}
          <div className="px-8 py-6 border-t flex justify-between items-end">
            <div className="flex items-end gap-6">
              <div>
                <p className="text-[10px] text-[#828282] uppercase tracking-wider mb-1 font-bold">ÉTABLI PAR</p>
                <p className="font-bold text-lg text-[#1a1a2e]">{quoteData.createdBy || 'M. Meleney'}</p>
                <p className="text-[#505050]">Lighthouse France SAS</p>
              </div>
              <img src="/images/logos/capcert-logo.png" alt="Capcert ISO 9001" className="h-24 w-auto" onError={e => { e.target.style.display = 'none'; }} />
            </div>
            {bcData ? (
              <div className="text-right">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <p className="text-xs text-green-600 uppercase mb-1">Approuvé</p>
                  <p className="font-bold text-green-800">{bcData.signedBy || 'Client'}</p>
                  <p className="text-sm text-green-700">{bcData.signedDate ? formatDateWrittenFR(new Date(bcData.signedDate)) : ''}</p>
                  {bcData.signatureUrl && <img src={bcData.signatureUrl} alt="Signature" className="max-h-16 mt-2" />}
                </div>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-xs text-[#828282] mb-1">Signature client</p>
                <div className="w-48 h-20 border-2 border-dashed border-gray-300 rounded"></div>
                <p className="text-xs text-[#828282] mt-1">Lu et approuvé</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-[#1a1a2e] text-white px-8 py-4 text-center text-sm">
            <p className="font-bold">Lighthouse France SAS</p>
            <p className="text-gray-400">16, rue Paul Séjourné • 94000 CRÉTEIL • Tél. 01 43 77 28 07</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gray-100 px-6 py-4 border-t flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Fermer</button>
            {extraFooterLeft}
          </div>
          {showApprove && onApprove && (
            <button onClick={onApprove} className="px-6 py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008f45]">
              ✅ Approuver et soumettre BC
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PDF GENERATION - PROFESSIONAL BLOCK-BASED
// No emojis, signature always at page bottom
// ============================================

const PDF_CALIBRATION_DATA = {
  particle_counter: {
    title: "Étalonnage Compteur de Particules Aéroportées",
    prestations: [
      "Vérification des fonctionnalités du compteur",
      "Vérification et réglage du débit",
      "Vérification de la cellule de mesure",
      "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
      "Vérification en nombre par comparaison à un étalon étalonné selon la norme ISO 17025, conformément à la norme ISO 21501-4",
      "Fourniture d'un rapport de test et de calibration"
    ]
  },
  bio_collector: {
    title: "Étalonnage Bio Collecteur",
    prestations: [
      "Vérification des fonctionnalités de l'appareil",
      "Vérification et réglage du débit",
      "Vérification de la cellule d'impaction",
      "Contrôle des paramètres de collecte",
      "Fourniture d'un rapport de test et de calibration"
    ]
  },
  liquid_counter: {
    title: "Étalonnage Compteur de Particules en Milieu Liquide",
    prestations: [
      "Vérification des fonctionnalités du compteur",
      "Vérification et réglage du débit",
      "Vérification de la cellule de mesure optique",
      "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
      "Vérification en nombre par comparaison à un étalon",
      "Fourniture d'un rapport de test et de calibration"
    ]
  },
  temp_humidity: {
    title: "Étalonnage Capteur Température/Humidité",
    prestations: [
      "Vérification des fonctionnalités du capteur",
      "Étalonnage température sur points de référence certifiés",
      "Étalonnage humidité relative",
      "Vérification de la stabilité des mesures",
      "Fourniture d'un certificat d'étalonnage"
    ]
  },
  other: {
    title: "Étalonnage Equipement",
    prestations: [
      "Vérification des fonctionnalités de l'appareil",
      "Étalonnage selon les specifications du fabricant",
      "Tests de fonctionnement",
      "Fourniture d'un rapport de test"
    ]
  }
};

const PDF_REPAIR_DATA = {
  title: "Réparation",
  prestations: [
    "Diagnostic complet de l'appareil",
    "Identification des composants defectueux",
    "Remplacement des pièces défectueuses (pièces facturées en sus)",
    "Tests de fonctionnement complets",
    "Vérification d'étalonnage post-réparation si applicable"
  ]
};

const PDF_DISCLAIMERS = [
  "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.",
  "Un devis complémentaire sera établi si des pièces sont trouvées défectueuses et nécessitent un remplacement.",
  "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de maintenance.",
  "Les équipements envoyés devront être décontaminés de toutes substances chimiques, bactériennes ou radioactives."
];

function getQuoteDataFromRequest(request) {
  const quoteData = request.quote_data || {};
  const devices = quoteData.devices || request.request_devices || [];
  
  let calibrationTypes = quoteData.requiredSections?.calibrationTypes || [];
  let hasRepair = quoteData.requiredSections?.hasRepair || false;
  
  if (calibrationTypes.length === 0 && devices.length > 0) {
    const calTypes = new Set();
    devices.forEach(d => {
      const deviceType = d.deviceType || d.device_type || 'particle_counter';
      const serviceType = d.serviceType || d.service_type || 'calibration';
      if (serviceType.includes('calibration') || serviceType === 'cal_repair' || serviceType === 'calibration_repair') {
        calTypes.add(deviceType);
      }
      if (serviceType.includes('repair') || serviceType === 'cal_repair' || serviceType === 'calibration_repair') {
        hasRepair = true;
      }
    });
    calibrationTypes = Array.from(calTypes);
  }
  
  if (calibrationTypes.length === 0) calibrationTypes = ['particle_counter'];

  return {
    devices,
    calibrationTypes,
    hasRepair,
    servicesSubtotal: quoteData.servicesSubtotal || request.quote_subtotal || 0,
    shippingTotal: quoteData.shippingTotal || request.quote_shipping || 0,
    grandTotal: quoteData.grandTotal || request.quote_total || 0,
    createdBy: quoteData.createdBy || 'M. Meleney'
  };
}

async function generateQuotePDF(options) {
  const {
    request, isSigned = false,
    signatureName = '', signatureDate = '', signatureImage = null
  } = options;

  // Load jsPDF
  await new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // Get quote data from request (contains breakdown)
  const quoteData = request.quote_data || {};
  const devicePricing = quoteData.devices || [];
  const shipping = quoteData.shipping || { parcels: request.parcels_count || 1, unitPrice: 45, total: (request.parcels_count || 1) * 45 };
  const servicesSubtotal = quoteData.servicesSubtotal || request.quote_subtotal || 0;
  const shippingTotal = quoteData.shippingTotal || request.quote_shipping || shipping.total;
  const grandTotal = quoteData.grandTotal || request.quote_total || (servicesSubtotal + shippingTotal);
  const requiredSections = quoteData.requiredSections || { calibrationTypes: ['particle_counter'], hasRepair: false };
  const createdBy = quoteData.createdBy || 'M. Meleney';
  
  // Revision info
  const revisionCount = request.quote_revision_count || 0;
  const quoteNumber = request.quote_number || null;
  const quoteNumberDisplay = quoteNumber ? (revisionCount > 0 ? `${quoteNumber} Rev-${revisionCount}` : quoteNumber) : null;
  
  const company = request.companies || {};
  
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerHeight = 16;
  
  // Colors
  const navy = [45, 90, 123];
  const darkBlue = [26, 26, 46];
  const gray = [80, 80, 80];
  const lightGray = [130, 130, 130];
  const white = [255, 255, 255];
  
  let y = margin;
  
  // Load logos
  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };
  
  let lighthouseLogo = await loadImageAsBase64('/images/logos/Lighthouse-color-logo.jpg');
  let capcertLogo = await loadImageAsBase64('/images/logos/capcert-logo.png');
  
  const addFooter = () => {
    pdf.setFillColor(...darkBlue);
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    pdf.setTextColor(...white);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Lighthouse France SAS', pageWidth / 2, pageHeight - footerHeight + 6, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.setFontSize(8);
    pdf.text('16, rue Paul Sejourne - 94000 CRETEIL - Tel. 01 43 77 28 07', pageWidth / 2, pageHeight - footerHeight + 11, { align: 'center' });
  };
  
  const getUsableHeight = () => pageHeight - footerHeight - margin;
  
  const checkPageBreak = (needed) => {
    if (y + needed > getUsableHeight()) {
      addFooter();
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // ===== HEADER =====
  if (lighthouseLogo) {
    try {
      const format = lighthouseLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(lighthouseLogo, format, margin, y - 2, 85, 22);
    } catch (e) {
      pdf.setFontSize(26);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkBlue);
      pdf.text('LIGHTHOUSE', margin, y + 8);
    }
  } else {
    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text('LIGHTHOUSE', margin, y + 8);
  }
  
  // Title - show DEVIS SIGNE / DEVIS Rev-N / OFFRE DE PRIX
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...navy);
  let pdfTitle = 'OFFRE DE PRIX';
  if (isSigned) {
    pdfTitle = revisionCount > 0 ? `DEVIS SIGNE Rev-${revisionCount}` : 'DEVIS SIGNE';
  } else if (revisionCount > 0) {
    pdfTitle = `OFFRE DE PRIX Rev-${revisionCount}`;
  }
  pdf.text(pdfTitle, pageWidth - margin, y + 5, { align: 'right' });
  
  // Document number
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('N\u00b0 ' + (quoteNumberDisplay || request.request_number || '\u2014'), pageWidth - margin, y + 11, { align: 'right' });
  
  // RMA reference
  if (request.request_number) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...gray);
    pdf.text('RMA: ' + request.request_number, pageWidth - margin, y + 16, { align: 'right' });
  }
  
  y += 20;
  pdf.setDrawColor(...navy);
  pdf.setLineWidth(1);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;

  // ===== INFO BAR =====
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth, 16, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('DATE', margin + 5, y + 5);
  pdf.text('VALIDITE', margin + 60, y + 5);
  pdf.text('CONDITIONS', margin + 115, y + 5);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  const qDate = request.quoted_at ? new Date(request.quoted_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  pdf.text(qDate, margin + 5, y + 12);
  pdf.text('30 jours', margin + 60, y + 12);
  pdf.text('A reception de facture', margin + 115, y + 12);
  y += 20;

  // ===== CLIENT =====
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('CLIENT', margin, y);
  y += 5;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(company.name || 'Client', margin, y);
  y += 6;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  if (company.billing_address || company.address) {
    pdf.text(company.billing_address || company.address, margin, y);
    y += 5;
  }
  const city = [company.billing_postal_code || company.postal_code, company.billing_city || company.city].filter(Boolean).join(' ');
  if (city) {
    pdf.text(city, margin, y);
    y += 5;
  }
  y += 8;

  // ===== SERVICE DESCRIPTION BLOCKS (page-break aware per line) =====
  const calibrationTypes = requiredSections.calibrationTypes || ['particle_counter'];
  const hasRepair = requiredSections.hasRepair || false;

  const CAL_DATA = {
    particle_counter: {
      title: "Étalonnage Compteur de Particules Aéroportées",
      prestations: [
        "Vérification des fonctionnalités du compteur",
        "Vérification et réglage du débit",
        "Vérification de la cellule de mesure",
        "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
        "Vérification en nombre par comparaison à un étalon étalonné selon la norme ISO 17025, conformément à la norme ISO 21501-4",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    bio_collector: {
      title: "Étalonnage Bio Collecteur",
      prestations: [
        "Vérification des fonctionnalités de l'appareil",
        "Vérification et réglage du débit",
        "Vérification de la cellule d'impaction",
        "Contrôle des paramètres de collecte",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    liquid_counter: {
      title: "Étalonnage Compteur de Particules en Milieu Liquide",
      prestations: [
        "Vérification des fonctionnalités du compteur",
        "Vérification et réglage du débit",
        "Vérification de la cellule de mesure optique",
        "Contrôle et réglage des seuils de mesures granulométrique",
        "Vérification en nombre par comparaison à un étalon",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    temp_humidity: {
      title: "Étalonnage Capteur Température/Humidité",
      prestations: [
        "Vérification des fonctionnalités du capteur",
        "Étalonnage température sur points de référence certifiés",
        "Étalonnage humidité relative",
        "Vérification de la stabilité des mesures",
        "Fourniture d'un certificat d'étalonnage"
      ]
    },
    other: {
      title: "Étalonnage Equipement",
      prestations: [
        "Vérification des fonctionnalités de l'appareil",
        "Étalonnage selon les specifications du fabricant",
        "Tests de fonctionnement",
        "Fourniture d'un rapport de test"
      ]
    }
  };

  const REPAIR_DATA = {
    title: "Réparation",
    prestations: [
      "Diagnostic complet de l'appareil",
      "Identification des composants defectueux",
      "Remplacement des pièces défectueuses (pièces facturées en sus)",
      "Tests de fonctionnement complets",
      "Vérification d'étalonnage post-réparation si applicable"
    ]
  };

  const DISCLAIMERS = [
    "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.",
    "Un devis complémentaire sera établi si des pièces sont trouvées défectueuses et nécessitent un remplacement.",
    "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de maintenance.",
    "Les équipements envoyés devront être décontaminés de toutes substances chimiques, bactériennes ou radioactives."
  ];

  // Draw service blocks - page-break aware per line
  const drawServiceBlock = (data, color) => {
    const lineH = 5;
    const titleH = 10;
    const allLines = [];
    data.prestations.forEach(p => {
      const wrapped = pdf.splitTextToSize(p, contentWidth - 14);
      wrapped.forEach((l, i) => allLines.push({ text: l, isFirst: i === 0 }));
    });
    checkPageBreak(titleH + lineH * 2);
    let vLineStartY = y;
    
    pdf.setDrawColor(...color);
    pdf.setLineWidth(1);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text(data.title, margin + 5, y + 6);
    y += titleH;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...gray);
    allLines.forEach((lineObj) => {
      if (y + lineH > getUsableHeight()) {
        pdf.setDrawColor(...color);
        pdf.setLineWidth(1);
        pdf.line(margin, vLineStartY, margin, y - 2);
        addFooter();
        pdf.addPage();
        y = margin;
        vLineStartY = y;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...gray);
      }
      if (lineObj.isFirst) pdf.text('-', margin + 5, y);
      pdf.text(lineObj.text, margin + 9, y);
      y += lineH;
    });
    
    pdf.setDrawColor(...color);
    pdf.setLineWidth(1);
    const lineEndY = Math.max(vLineStartY + 5, y - 7);
    pdf.line(margin, vLineStartY, margin, lineEndY);
    y += 5;
  };

  calibrationTypes.forEach(type => {
    const data = CAL_DATA[type] || CAL_DATA.particle_counter;
    drawServiceBlock(data, [59, 130, 246]);
  });
  
  if (hasRepair) {
    drawServiceBlock(REPAIR_DATA, [249, 115, 22]);
  }

  // ===== DETAILED PRICING TABLE =====
  y += 5;
  const rowH = 7;
  const colQty = margin;
  const colDesc = margin + 12;
  const colUnit = pageWidth - margin - 45;
  const colTotal = pageWidth - margin - 3;
  
  const drawTableHeader = () => {
    pdf.setFillColor(...darkBlue);
    pdf.rect(margin, y, contentWidth, 9, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...white);
    pdf.text('Qte', colQty + 3, y + 6);
    pdf.text('Désignation', colDesc, y + 6);
    pdf.text('Prix Unit.', colUnit, y + 6, { align: 'right' });
    pdf.text('Total HT', colTotal, y + 6, { align: 'right' });
    y += 9;
  };
  
  const checkTablePageBreak = (needed) => {
    if (y + needed > getUsableHeight()) {
      addFooter();
      pdf.addPage();
      y = margin;
      drawTableHeader();
      return true;
    }
    return false;
  };
  
  const drawTableRow = (qty, desc, unitDisplay, totalDisplay, bgIndex) => {
    checkTablePageBreak(rowH);
    pdf.setFillColor(bgIndex % 2 === 0 ? 255 : 250, bgIndex % 2 === 0 ? 255 : 250, bgIndex % 2 === 0 ? 255 : 250);
    pdf.rect(margin, y, contentWidth, rowH, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkBlue);
    pdf.text(String(qty), colQty + 3, y + 5);
    pdf.text(desc.substring(0, 60), colDesc, y + 5);
    pdf.text(unitDisplay, colUnit, y + 5, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(totalDisplay, colTotal, y + 5, { align: 'right' });
    y += rowH;
  };
  
  // Keep-together logic
  let totalRowCount = 0;
  devicePricing.forEach(device => {
    if (device.needsCalibration) totalRowCount++;
    if (device.needsNettoyage && !device.isContractCovered && device.nettoyagePrice > 0) totalRowCount++;
    if (device.needsRepair) totalRowCount++;
    totalRowCount += (device.additionalParts || []).length;
  });
  totalRowCount += 1; // shipping
  const totalTableHeight = 7 + 9 + (totalRowCount * rowH) + 11 + 4;
  const spaceRemaining = getUsableHeight() - y;
  const freshPageSpace = getUsableHeight() - margin;
  if (totalTableHeight > spaceRemaining && totalTableHeight <= freshPageSpace) {
    addFooter();
    pdf.addPage();
    y = margin;
  }
  
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Récapitulatif des Prix', margin, y);
  y += 7;
  drawTableHeader();

  let rowIndex = 0;
  let hasNettoyage = false;

  devicePricing.forEach((device) => {
    if (device.needsCalibration) {
      const qty = device.calibrationQty || 1;
      const unitPrice = parseFloat(device.calibrationPrice) || 0;
      const lineTotal = qty * unitPrice;
      const isContract = device.isContractCovered;
      const calDesc = `Étalonnage ${device.model || ''} (SN: ${device.serial || ''})${isContract ? ' [CONTRAT]' : ''}`;
      drawTableRow(qty, calDesc, isContract ? 'Contrat' : unitPrice.toFixed(2) + ' EUR', isContract ? 'Contrat' : lineTotal.toFixed(2) + ' EUR', rowIndex);
      rowIndex++;
    }
    if (device.needsNettoyage && !device.isContractCovered && device.nettoyagePrice > 0) {
      hasNettoyage = true;
      const qty = device.nettoyageQty || 1;
      const unitPrice = parseFloat(device.nettoyagePrice) || 0;
      const lineTotal = qty * unitPrice;
      drawTableRow(qty, 'Nettoyage cellule - si requis selon etat du capteur', unitPrice.toFixed(2) + ' EUR', lineTotal.toFixed(2) + ' EUR', rowIndex);
      rowIndex++;
    }
    if (device.needsRepair) {
      const qty = device.repairQty || 1;
      const unitPrice = parseFloat(device.repairPrice) || 0;
      const lineTotal = qty * unitPrice;
      const repDesc = `Réparation ${device.model || ''} (SN: ${device.serial || ''})`;
      drawTableRow(qty, repDesc, unitPrice.toFixed(2) + ' EUR', lineTotal.toFixed(2) + ' EUR', rowIndex);
      rowIndex++;
    }
    (device.additionalParts || []).forEach(part => {
      const qty = parseInt(part.quantity) || 1;
      const unitPrice = parseFloat(part.price) || 0;
      const lineTotal = qty * unitPrice;
      const partDesc = part.partNumber ? `[${part.partNumber}] ${part.description || 'Piece'}` : (part.description || 'Piece/Service');
      drawTableRow(qty, partDesc, unitPrice.toFixed(2) + ' EUR', lineTotal.toFixed(2) + ' EUR', rowIndex);
      rowIndex++;
    });
  });
  
  // Shipping + Total kept together
  checkTablePageBreak(rowH + 11 + 4);
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth, rowH, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkBlue);
  pdf.text(String(shipping.parcels || 1), colQty + 3, y + 5);
  const shipDesc = shipping.parcels > 1 ? `Frais de port (${shipping.parcels} colis)` : 'Frais de port';
  pdf.text(shipDesc, colDesc, y + 5);
  pdf.text((shipping.unitPrice || 45).toFixed(2) + ' EUR', colUnit, y + 5, { align: 'right' });
  pdf.setFont('helvetica', 'bold');
  pdf.text(shippingTotal.toFixed(2) + ' EUR', colTotal, y + 5, { align: 'right' });
  y += rowH;

  // Total row
  pdf.setFillColor(...navy);
  pdf.rect(margin, y, contentWidth, 11, 'F');
  pdf.setTextColor(...white);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL HT', colUnit - 30, y + 7.5);
  pdf.setFontSize(16);
  pdf.text(grandTotal.toFixed(2) + ' EUR', colTotal, y + 8, { align: 'right' });
  y += 15;
  
  // Nettoyage disclaimer
  if (hasNettoyage) {
    checkPageBreak(8);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...lightGray);
    pdf.text('* Le nettoyage cellule sera facture uniquement si necessaire selon l\'etat du capteur a reception.', margin, y);
    y += 5;
  }

  // ===== CONDITIONS/DISCLAIMERS =====
  y += 3;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...lightGray);
  pdf.text('CONDITIONS', margin, y);
  y += 4;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  DISCLAIMERS.forEach(d => {
    checkPageBreak(5);
    const wrapped = pdf.splitTextToSize('- ' + d, contentWidth);
    wrapped.forEach(line => {
      checkPageBreak(4);
      pdf.text(line, margin, y);
      y += 4;
    });
  });
  y += 3;

  // ===== SIGNATURE SECTION - ALWAYS ON LAST PAGE =====
  // Signature box extends ~39mm below sigY. Footer starts at pageHeight-footerHeight=281.
  // So we need sigY + 39 < 281, meaning y + 3 + 39 < 281, meaning y < 239.
  // Use tighter check against footer rather than conservative usableHeight.
  const signatureNeeded = 42; // 3mm gap + 39mm content
  const signatureLimit = pageHeight - footerHeight - 2; // 2mm padding before footer
  if (y + signatureNeeded > signatureLimit) {
    addFooter();
    pdf.addPage();
    y = margin;
  }
  // Position signature: push to bottom only if there's lots of space, otherwise just below content
  const sigBottomTarget = signatureLimit - 39; // where sigY should be to sit near bottom
  const sigY = Math.max(y + 3, sigBottomTarget);
  
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, sigY, pageWidth - margin, sigY);
  
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('ETABLI PAR', margin, sigY + 7);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(createdBy, margin, sigY + 14);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('Lighthouse France', margin, sigY + 20);

  // Capcert logo
  if (capcertLogo) {
    try {
      const format = capcertLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(capcertLogo, format, margin + 52, sigY + 3, 32, 32);
    } catch (e) {}
  }

  // Signature box
  const sigBoxX = pageWidth - margin - 62;
  
  if (isSigned && signatureName) {
    // Signed version - green box with signature
    pdf.setFillColor(245, 255, 250);
    pdf.setDrawColor(...navy);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(sigBoxX, sigY + 3, 62, 36, 2, 2, 'FD');
    
    pdf.setFontSize(8);
    pdf.setTextColor(...navy);
    pdf.text('APPROUVE PAR', sigBoxX + 4, sigY + 10);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text(signatureName, sigBoxX + 4, sigY + 17);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...gray);
    pdf.text('Date: ' + signatureDate, sigBoxX + 4, sigY + 24);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...navy);
    pdf.text('Lu et approuve', sigBoxX + 4, sigY + 30);
    
    if (signatureImage) {
      try { pdf.addImage(signatureImage, 'PNG', sigBoxX + 40, sigY + 9, 18, 16); } catch(e) {}
    }
  } else {
    // Unsigned version - dashed box
    pdf.setFontSize(8);
    pdf.setTextColor(...lightGray);
    pdf.text('Signature client', sigBoxX + 16, sigY + 7);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.roundedRect(sigBoxX + 5, sigY + 10, 52, 22, 2, 2, 'D');
    pdf.setLineDashPattern([], 0);
    pdf.text('Lu et approuve', sigBoxX + 18, sigY + 37);
  }

  addFooter();
  
  // Page numbers for multi-page quotes
  const totalPages = pdf.internal.getNumberOfPages();
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7);
      pdf.setTextColor(180, 180, 180);
      pdf.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 2, { align: 'right' });
    }
  }
  
  return pdf.output('blob');
}

// ============================================
// PARTS ORDER QUOTE PDF GENERATOR
// ============================================
async function generatePartsQuotePDF(options) {
  const {
    request, isSigned = false,
    signatureName = '', signatureDate = '', signatureImage = null
  } = options;

  // Load jsPDF
  await new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const quoteData = request.quote_data || {};
  const parts = quoteData.parts || [];
  const shipping = quoteData.shipping || { parcels: 1, unitPrice: 45, total: 45 };
  const partsTotal = quoteData.partsTotal || parts.reduce((sum, p) => sum + (p.lineTotal || 0), 0);
  const grandTotal = quoteData.grandTotal || (partsTotal + (shipping.total || 0));
  const createdBy = quoteData.createdBy || 'Lighthouse France';
  const quoteRef = quoteData.quoteRef || request.request_number;
  
  const company = request.companies || {};
  
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerHeight = 16;
  
  // Colors
  const navy = [45, 90, 123];
  const darkBlue = [26, 26, 46];
  const gray = [80, 80, 80];
  const lightGray = [130, 130, 130];
  const white = [255, 255, 255];
  
  let y = margin;
  
  // Load logo
  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };
  
  let lighthouseLogo = await loadImageAsBase64('/images/logos/Lighthouse-color-logo.jpg');
  
  const addFooter = () => {
    pdf.setFillColor(...darkBlue);
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    pdf.setTextColor(...white);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Lighthouse France SAS', pageWidth / 2, pageHeight - footerHeight + 6, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.setFontSize(8);
    pdf.text('16, rue Paul Sejourne - 94000 CRETEIL - Tel. 01 43 77 28 07', pageWidth / 2, pageHeight - footerHeight + 11, { align: 'center' });
  };

  // ===== HEADER =====
  if (lighthouseLogo) {
    try {
      const format = lighthouseLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(lighthouseLogo, format, margin, y, 85, 22);
    } catch (e) {
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkBlue);
      pdf.text('LIGHTHOUSE', margin, y + 10);
    }
  } else {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text('LIGHTHOUSE', margin, y + 10);
  }
  
  // Title - Right side
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...navy);
  pdf.text('DEVIS PIECES', pageWidth - margin, y + 5, { align: 'right' });
  pdf.setFontSize(10);
  pdf.setTextColor(...gray);
  pdf.text(quoteRef, pageWidth - margin, y + 12, { align: 'right' });
  
  y += 20;
  
  // Amber accent line
  pdf.setFillColor(...navy);
  pdf.rect(0, y, pageWidth, 1.5, 'F');
  y += 8;
  
  // Date and validity
  pdf.setFillColor(249, 250, 251);
  pdf.rect(margin, y, contentWidth, 10, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(...gray);
  const quoteDate = quoteData.createdAt ? new Date(quoteData.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  pdf.text(`Date: ${quoteDate}`, margin + 5, y + 6);
  pdf.text('Validite: 30 jours', pageWidth - margin - 5, y + 6, { align: 'right' });
  y += 16;
  
  // Client info
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('CLIENT', margin, y);
  y += 5;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(company.name || 'Client', margin, y);
  y += 5;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  if (company.billing_address) {
    pdf.text(company.billing_address, margin, y);
    y += 4;
  }
  pdf.text(`${company.billing_postal_code || ''} ${company.billing_city || ''}`.trim(), margin, y);
  y += 12;
  
  // Parts Table Header
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Pieces Commandees', margin, y);
  y += 6;
  
  // Table header
  const colQty = margin;
  const colRef = margin + 15;
  const colDesc = margin + 50;
  const colUnit = pageWidth - margin - 40;
  const colTotal = pageWidth - margin - 5;
  
  pdf.setFillColor(...darkBlue);
  pdf.rect(margin, y, contentWidth, 8, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...white);
  pdf.text('Qte', colQty + 2, y + 5.5);
  pdf.text('Reference', colRef, y + 5.5);
  pdf.text('Désignation', colDesc, y + 5.5);
  pdf.text('Prix Unit.', colUnit, y + 5.5, { align: 'right' });
  pdf.text('Total HT', colTotal, y + 5.5, { align: 'right' });
  y += 10;
  
  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  parts.forEach((part, idx) => {
    const rowHeight = 8;
    if (idx % 2 === 0) {
      pdf.setFillColor(255, 255, 255);
    } else {
      pdf.setFillColor(249, 250, 251);
    }
    pdf.rect(margin, y, contentWidth, rowHeight, 'F');
    
    pdf.setTextColor(...darkBlue);
    pdf.text(String(part.quantity || 1), colQty + 5, y + 5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(part.partNumber || '-', colRef, y + 5.5);
    pdf.setFontSize(9);
    
    // Truncate description if too long
    let desc = part.description || '';
    if (desc.length > 45) desc = desc.substring(0, 42) + '...';
    pdf.text(desc, colDesc, y + 5.5);
    
    pdf.text((part.unitPrice || 0).toFixed(2) + ' EUR', colUnit, y + 5.5, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text((part.lineTotal || 0).toFixed(2) + ' EUR', colTotal, y + 5.5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    
    y += rowHeight;
  });
  
  // Shipping row
  if (shipping.total > 0) {
    pdf.setFillColor(239, 246, 255);
    pdf.rect(margin, y, contentWidth, 8, 'F');
    pdf.setTextColor(30, 64, 175);
    pdf.text(String(shipping.parcels || 1), colQty + 5, y + 5.5);
    pdf.setFontSize(8);
    pdf.text('Shipping', colRef, y + 5.5);
    pdf.setFontSize(9);
    pdf.text(`Frais de port (${shipping.parcels || 1} colis)`, colDesc, y + 5.5);
    pdf.text((shipping.unitPrice || 45).toFixed(2) + ' EUR', colUnit, y + 5.5, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text((shipping.total || 0).toFixed(2) + ' EUR', colTotal, y + 5.5, { align: 'right' });
    y += 8;
  }
  
  // Total row
  pdf.setFillColor(...navy);
  pdf.rect(margin, y, contentWidth, 10, 'F');
  pdf.setTextColor(...white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('TOTAL HT', colUnit - 20, y + 7, { align: 'right' });
  pdf.text(grandTotal.toFixed(2) + ' EUR', colTotal, y + 7, { align: 'right' });
  y += 20;
  
  // Conditions
  pdf.setFillColor(249, 250, 251);
  pdf.rect(0, y, pageWidth, 28, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Conditions:', margin, y + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('- Devis valable 30 jours', margin + 5, y + 12);
  pdf.text('- Paiement: 30 jours fin de mois', margin + 5, y + 17);
  pdf.text('- Livraison: Sous reserve de disponibilite', margin + 5, y + 22);
  y += 35;
  
  // Signature section
  const sigY = y;
  
  // Left side - Etabli par
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('ETABLI PAR', margin, sigY);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(createdBy, margin, sigY + 6);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('Lighthouse France', margin, sigY + 11);
  
  // Right side - Signature box
  const sigBoxX = pageWidth - margin - 62;
  
  if (isSigned && signatureName) {
    // Signed version
    pdf.setFillColor(245, 255, 250);
    pdf.setDrawColor(...navy);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(sigBoxX, sigY - 2, 62, 36, 2, 2, 'FD');
    
    pdf.setFontSize(8);
    pdf.setTextColor(...navy);
    pdf.text('APPROUVE PAR', sigBoxX + 4, sigY + 5);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text(signatureName, sigBoxX + 4, sigY + 12);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...gray);
    pdf.text('Date: ' + signatureDate, sigBoxX + 4, sigY + 19);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...navy);
    pdf.text('Lu et approuve', sigBoxX + 4, sigY + 26);
    
    if (signatureImage) {
      try { pdf.addImage(signatureImage, 'PNG', sigBoxX + 40, sigY + 4, 18, 16); } catch(e) {}
    }
  } else {
    // Unsigned version
    pdf.setFontSize(8);
    pdf.setTextColor(...lightGray);
    pdf.text('Bon pour accord', sigBoxX + 14, sigY + 2);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.roundedRect(sigBoxX + 5, sigY + 5, 52, 22, 2, 2, 'D');
    pdf.setLineDashPattern([], 0);
    pdf.text('Signature et cachet', sigBoxX + 12, sigY + 32);
  }

  addFooter();
  return pdf.output('blob');
}

// Contract Quote PDF Generator - IDENTICAL structure to RMA
async function generateContractQuotePDF(options) {
  const {
    contract, devices = [], totalPrice = 0, totalTokens = 0,
    calibrationTypes = ['particle_counter'], isSigned = false,
    signatureName = '', signatureDate = '', signatureImage = null
  } = options;

  // Get quote_data for detailed breakdown
  const quoteData = contract.quote_data || {};
  const quoteDevices = quoteData.devices || [];
  const shipping = quoteData.shipping || { parcels: 1, unitPrice: 45, total: 45 };
  const servicesSubtotal = quoteData.servicesSubtotal || totalPrice;
  const shippingTotal = quoteData.shippingTotal || shipping.total || 0;
  const grandTotal = quoteData.grandTotal || (servicesSubtotal + shippingTotal);

  await new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerHeight = 16;
  const signatureBlockHeight = 42;
  
  const green = [0, 166, 81];
  const darkBlue = [26, 26, 46];
  const gray = [80, 80, 80];
  const lightGray = [130, 130, 130];
  const white = [255, 255, 255];
  
  let y = margin;
  
  // === LOGO LOADING ===
  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    }
  };
  
  let lighthouseLogo = null;
  let capcertLogo = null;
  try {
    const results = await Promise.all([
      loadImageAsBase64('/images/logos/Lighthouse-color-logo.jpg'),
      loadImageAsBase64('/images/logos/capcert-logo.png')
    ]);
    lighthouseLogo = results[0];
    capcertLogo = results[1];
  } catch (e) {}
  
  const addFooter = () => {
    pdf.setFillColor(...darkBlue);
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    pdf.setTextColor(...white);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Lighthouse France SAS', pageWidth / 2, pageHeight - footerHeight + 6, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.setFontSize(8);
    pdf.text('16, rue Paul Sejourne - 94000 CRETEIL - Tel. 01 43 77 28 07', pageWidth / 2, pageHeight - footerHeight + 11, { align: 'center' });
  };
  
  const getUsableHeight = () => pageHeight - footerHeight - margin;
  
  const checkPageBreak = (needed) => {
    if (y + needed > getUsableHeight()) {
      addFooter();
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // ===== HEADER WITH LOGO =====
  // The Lighthouse logo needs proper aspect ratio - it's quite wide
  // Looking at modal, logo is about 5:1 ratio (width:height)
  let logoAdded = false;
  if (lighthouseLogo) {
    try {
      const format = lighthouseLogo.includes('image/png') ? 'PNG' : 'JPEG';
      // Bigger logo: 70mm wide x 14mm tall 
      pdf.addImage(lighthouseLogo, format, margin, y, 85, 22);
      logoAdded = true;
    } catch (e) {
      logoAdded = false;
    }
  }
  
  if (!logoAdded) {
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text('LIGHTHOUSE', margin, y + 8);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('FRANCE', margin + 52, y + 8);
  }
  
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...green);
  pdf.text('DEVIS CONTRAT', pageWidth - margin, y + 8, { align: 'right' });
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('N. ' + (contract.contract_number || 'CTR-XXXXX'), pageWidth - margin, y + 14, { align: 'right' });
  
  y += 18;
  pdf.setDrawColor(...green);
  pdf.setLineWidth(1);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;

  // ===== INFO BAR =====
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth, 16, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('DATE', margin + 5, y + 5);
  pdf.text('PERIODE DU CONTRAT', margin + 55, y + 5);
  pdf.text('VALIDITE DEVIS', margin + 135, y + 5);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  const qDate = contract.quote_sent_at ? new Date(contract.quote_sent_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  pdf.text(qDate, margin + 5, y + 12);
  const startDate = new Date(contract.start_date).toLocaleDateString('fr-FR');
  const endDate = new Date(contract.end_date).toLocaleDateString('fr-FR');
  pdf.text(startDate + ' - ' + endDate, margin + 55, y + 12);
  pdf.text('30 jours', margin + 135, y + 12);
  y += 20;

  // ===== CLIENT INFO =====
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('CLIENT', margin, y);
  y += 5;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(contract.companies?.name || 'Client', margin, y);
  y += 6;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  if (contract.companies?.billing_address) {
    pdf.text(contract.companies.billing_address, margin, y);
    y += 5;
  }
  const city = [contract.companies?.billing_postal_code, contract.companies?.billing_city].filter(Boolean).join(' ');
  if (city) {
    pdf.text(city, margin, y);
    y += 5;
  }
  if (contract.companies?.phone) {
    pdf.text('Tel: ' + contract.companies.phone, margin, y);
    y += 5;
  }
  // Don't show email - modal doesn't show it
  y += 5;

  // ===== SERVICE DESCRIPTION BLOCKS (like RMA) =====
  const CAL_DATA = {
    particle_counter: {
      title: "Étalonnage Compteur de Particules Aéroportées",
      prestations: [
        "Vérification des fonctionnalités du compteur",
        "Vérification et réglage du débit",
        "Vérification de la cellule de mesure",
        "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
        "Vérification en nombre par comparaison à un étalon étalonné selon la norme ISO 17025, conformément à la norme ISO 21501-4",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    bio_collector: {
      title: "Étalonnage Bio Collecteur",
      prestations: [
        "Vérification des fonctionnalités de l'appareil",
        "Vérification et réglage du débit",
        "Vérification de la cellule d'impaction",
        "Contrôle des paramètres de collecte",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    liquid_counter: {
      title: "Étalonnage Compteur de Particules en Milieu Liquide",
      prestations: [
        "Vérification des fonctionnalités du compteur",
        "Vérification et réglage du débit",
        "Vérification de la cellule de mesure optique",
        "Contrôle et réglage des seuils de mesures granulométrique",
        "Vérification en nombre par comparaison à un étalon",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    temp_humidity: {
      title: "Étalonnage Capteur Température/Humidité",
      prestations: [
        "Vérification des fonctionnalités du capteur",
        "Étalonnage température sur points de référence certifiés",
        "Étalonnage humidité relative",
        "Vérification de la stabilité des mesures",
        "Fourniture d'un certificat d'étalonnage"
      ]
    },
    other: {
      title: "Étalonnage Equipement",
      prestations: [
        "Vérification des fonctionnalités de l'appareil",
        "Étalonnage selon les specifications du fabricant",
        "Tests de fonctionnement",
        "Fourniture d'un rapport de test"
      ]
    }
  };

  const drawServiceBlock = (data, color) => {
    const lineH = 4.5;
    let lines = [];
    data.prestations.forEach(p => {
      const wrapped = pdf.splitTextToSize(p, contentWidth - 12);
      wrapped.forEach(l => lines.push(l));
    });
    const textHeight = 7 + (lines.length * lineH); // Title + prestations only
    checkPageBreak(textHeight + 8);
    
    const startY = y;
    
    // Title
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text(data.title, margin + 5, y + 7);
    y += 11;
    
    // Prestations list
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    data.prestations.forEach(p => {
      const wrapped = pdf.splitTextToSize(p, contentWidth - 12);
      wrapped.forEach((line, i) => {
        if (i === 0) {
          pdf.setTextColor(160, 160, 160);
          pdf.text('-', margin + 5, y);
          pdf.setTextColor(100, 100, 100);
        }
        pdf.text(line, margin + 8, y);
        y += lineH;
      });
    });
    
    // Blue left border line - only spans from title to end of prestations
    pdf.setDrawColor(...color);
    pdf.setLineWidth(1.5);
    pdf.line(margin, startY + 3, margin, y - 2);
    
    y += 5;
  };

  // Get device types from quote_data or devices
  const deviceTypesSet = new Set();
  (quoteDevices.length > 0 ? quoteDevices : devices).forEach(d => {
    deviceTypesSet.add(d.deviceType || d.device_type || 'particle_counter');
  });

  // Draw service blocks for each device type
  deviceTypesSet.forEach(type => {
    const data = CAL_DATA[type] || CAL_DATA.particle_counter;
    drawServiceBlock(data, [59, 130, 246]); // blue
  });

  // ===== CONDITIONS SECTION - Full-width gray background like modal =====
  const contractDates = quoteData.contractDates || { start_date: contract.start_date, end_date: contract.end_date };
  const totalTokensDisplay = quoteData.totalTokens || totalTokens;
  
  checkPageBreak(38);
  
  // Full-width gray background (edge to edge, no margins)
  pdf.setFillColor(249, 250, 251); // gray-50
  pdf.rect(0, y, pageWidth, 34, 'F');
  
  y += 5;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('CONDITIONS', margin, y);
  y += 5;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };
  
  const conditions = [
    `Periode du contrat: ${formatDate(contractDates.start_date)} au ${formatDate(contractDates.end_date)}`,
    `${totalTokensDisplay} étalonnage(s) inclus pendant la période contractuelle`,
    "Étalonnages supplementaires factures au tarif standard",
    "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables",
    "Un devis complémentaire sera établi si des pièces sont trouvées défectueuses",
    "Paiement a 30 jours date de facture"
  ];
  
  conditions.forEach(c => {
    pdf.text('• ' + c, margin, y);
    y += 4;
  });
  y += 10;

  // ===== DETAILED PRICING TABLE (Qté | Désignation | Prix Unit. | Total HT) =====
  const rowH = 7;
  const colQty = margin;
  const colDesc = margin + 12;
  const colUnit = pageWidth - margin - 45;
  const colTotal = pageWidth - margin - 3;
  
  // Use quoteDevices if available, otherwise fall back to devices
  const pricingDevices = quoteDevices.length > 0 ? quoteDevices : devices.map(d => ({
    model: d.model_name || d.model || '',
    serial: d.serial_number || d.serial || '',
    tokens_total: d.tokens_total || 1,
    needsCalibration: true,
    calibrationPrice: d.unit_price || 350,
    calibrationQty: 1,
    needsNettoyage: (d.device_type || 'particle_counter') === 'particle_counter',
    nettoyagePrice: 0,
    nettoyageQty: 1
  }));

  // Only check if we have room for the header + at least 2 rows
  // Don't try to fit everything - let it flow naturally across pages
  checkPageBreak(25);

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Récapitulatif des Prix', margin, y);
  y += 7;

  // Header row
  pdf.setFillColor(...darkBlue);
  pdf.rect(margin, y, contentWidth, 9, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...white);
  pdf.text('Qte', colQty + 3, y + 6);
  pdf.text('Désignation', colDesc, y + 6);
  pdf.text('Prix Unit.', colUnit, y + 6, { align: 'right' });
  pdf.text('Total HT', colTotal, y + 6, { align: 'right' });
  y += 9;

  let rowIndex = 0;
  let hasNettoyage = false;

  // Build line items - DEVICE + NETTOYAGE TOGETHER
  pricingDevices.forEach((device) => {
    // Calibration row
    if (device.needsCalibration !== false) {
      const qty = device.tokens_total || device.calibrationQty || 1;
      const unitPrice = parseFloat(device.calibrationPrice) || parseFloat(device.unit_price) || 0;
      const lineTotal = qty * unitPrice;
      
      checkPageBreak(rowH);
      pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250);
      pdf.rect(margin, y, contentWidth, rowH, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...darkBlue);
      pdf.text(String(qty), colQty + 3, y + 5);
      const calDesc = `Étalonnage ${device.model || ''} (SN: ${device.serial || ''})`;
      pdf.text(calDesc.substring(0, 65), colDesc, y + 5);
      pdf.text(unitPrice.toFixed(2) + ' €', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(lineTotal.toFixed(2) + ' €', colTotal, y + 5, { align: 'right' });
      y += rowH;
      rowIndex++;
    }
    
    // Nettoyage row - IMMEDIATELY AFTER DEVICE
    if (device.needsNettoyage && device.nettoyagePrice > 0) {
      hasNettoyage = true;
      const qty = device.nettoyageQty || 1;
      const unitPrice = parseFloat(device.nettoyagePrice) || 0;
      const lineTotal = qty * unitPrice;
      
      checkPageBreak(rowH);
      pdf.setFillColor(255, 251, 235); // amber-50
      pdf.rect(margin, y, contentWidth, rowH, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(146, 64, 14); // amber-800
      pdf.text(String(qty), colQty + 3, y + 5);
      pdf.text('Nettoyage cellule - si requis selon etat du capteur', colDesc, y + 5);
      pdf.text(unitPrice.toFixed(2) + ' €', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(lineTotal.toFixed(2) + ' €', colTotal, y + 5, { align: 'right' });
      y += rowH;
      rowIndex++;
    }
  });

  // Shipping row
  if (shippingTotal > 0) {
    checkPageBreak(rowH);
    pdf.setFillColor(239, 246, 255); // blue-50
    pdf.rect(margin, y, contentWidth, rowH, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 64, 175); // blue-800
    pdf.text(String(shipping.parcels || 1), colQty + 3, y + 5);
    pdf.text('Frais de port (' + (shipping.parcels || 1) + ' colis)', colDesc, y + 5);
    pdf.text((shipping.unitPrice || 45).toFixed(2) + ' €', colUnit, y + 5, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(shippingTotal.toFixed(2) + ' €', colTotal, y + 5, { align: 'right' });
    y += rowH;
  }

  // Total row - keep with at least shipping or last item
  checkPageBreak(12);
  pdf.setFillColor(...green);
  pdf.rect(margin, y, contentWidth, 12, 'F');
  pdf.setTextColor(...white);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('', colQty + 3, y + 8);
  pdf.text('', colDesc, y + 8);
  pdf.text('TOTAL HT', colUnit, y + 8, { align: 'right' });
  pdf.setFontSize(12);
  pdf.text(grandTotal.toFixed(2) + ' €', colTotal, y + 8, { align: 'right' });
  y += 15;

  // Nettoyage disclaimer
  if (hasNettoyage) {
    checkPageBreak(10);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(146, 64, 14);
    pdf.text('* Le nettoyage de la cellule sera effectue si necessaire selon l\'etat du capteur constate lors de l\'intervention.', margin, y);
    y += 8;
  }

  // ===== SIGNATURE SECTION =====
  // Ensure we have room for signature block, otherwise new page
  checkPageBreak(signatureBlockHeight + 10);
  
  // Put signature right after content, not forced to bottom
  y += 5;
  
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  
  // Left side - Etabli par + Capcert logo
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('ETABLI PAR', margin, y + 7);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(quoteData.createdBy || 'Lighthouse France', margin, y + 14);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('Lighthouse France', margin, y + 20);

  // Capcert logo
  if (capcertLogo) {
    try {
      const format = capcertLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(capcertLogo, format, margin + 55, y + 3, 30, 30);
    } catch (e) {}
  }

  // Right side - Signature box
  const sigBoxX = pageWidth - margin - 62;
  
  if (isSigned && signatureName) {
    pdf.setFillColor(245, 255, 250);
    pdf.setDrawColor(...green);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(sigBoxX, y + 3, 62, 36, 2, 2, 'FD');
    
    pdf.setFontSize(8);
    pdf.setTextColor(...green);
    pdf.text('APPROUVE PAR', sigBoxX + 4, y + 10);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text(signatureName, sigBoxX + 4, y + 17);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...gray);
    pdf.text('Date: ' + signatureDate, sigBoxX + 4, y + 24);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...green);
    pdf.text('Lu et approuve', sigBoxX + 4, y + 30);
    
    if (signatureImage) {
      try { pdf.addImage(signatureImage, 'PNG', sigBoxX + 40, y + 9, 18, 16); } catch(e) {}
    }
  } else {
    pdf.setFontSize(8);
    pdf.setTextColor(...lightGray);
    pdf.text('Signature client', sigBoxX + 16, y + 7);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.roundedRect(sigBoxX + 5, y + 10, 52, 22, 2, 2, 'D');
    pdf.setLineDashPattern([], 0);
    pdf.text('Lu et approuve', sigBoxX + 18, y + 37);
  }

  addFooter();
  return pdf.output('blob');
}

async function generateSignedAvenantPDF(options) {
  const {
    request, isSigned = false,
    signatureName = '', signatureDate = '', signatureImage = null
  } = options;

  // Load jsPDF
  await new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const company = request.companies || {};
  const devices = (request.request_devices || []).filter(d => d.additional_work_needed && d.additional_work_items?.length > 0);
  
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerHeight = 16;
  
  // Colors - green for supplement (matching main quote)
  const green = [0, 166, 81];
  const darkBlue = [26, 26, 46];
  const gray = [80, 80, 80];
  const lightGray = [130, 130, 130];
  const white = [255, 255, 255];
  
  let y = margin;
  
  // Load logos
  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };
  
  let lighthouseLogo = await loadImageAsBase64('/images/logos/lighthouse-logo.png');
  let capcertLogo = await loadImageAsBase64('/images/logos/capcert-logo.png');
  
  const addFooter = () => {
    pdf.setFillColor(...darkBlue);
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    pdf.setTextColor(...white);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Lighthouse France SAS', pageWidth / 2, pageHeight - footerHeight + 6, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.setFontSize(8);
    pdf.text('16, rue Paul Sejourne - 94000 CRETEIL - Tel. 01 43 77 28 07', pageWidth / 2, pageHeight - footerHeight + 11, { align: 'center' });
  };
  
  const getUsableHeight = () => pageHeight - footerHeight - margin;
  
  const checkPageBreak = (needed) => {
    if (y + needed > getUsableHeight()) {
      addFooter();
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // ===== HEADER =====
  if (lighthouseLogo) {
    try {
      const format = lighthouseLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(lighthouseLogo, format, margin, y - 2, 55, 14);
    } catch (e) {
      pdf.setFontSize(26);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkBlue);
      pdf.text('LIGHTHOUSE', margin, y + 8);
    }
  } else {
    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text('LIGHTHOUSE', margin, y + 8);
  }
  
  // Title - SUPPLEMENT in green
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...green);
  pdf.text(isSigned ? 'SUPPLEMENT SIGNE' : 'SUPPLEMENT AU DEVIS', pageWidth - margin, y + 8, { align: 'right' });
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('N° ' + (request.supplement_number || '—'), pageWidth - margin, y + 14, { align: 'right' });
  
  y += 18;
  pdf.setDrawColor(...green);
  pdf.setLineWidth(1);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;

  // ===== INFO BAR =====
  pdf.setFillColor(240, 253, 244); // Light green background
  pdf.rect(margin, y, contentWidth, 16, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('DATE', margin + 5, y + 5);
  pdf.text('VALIDITE', margin + 60, y + 5);
  pdf.text('CONDITIONS', margin + 115, y + 5);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  const qDate = request.avenant_sent_at ? new Date(request.avenant_sent_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  pdf.text(qDate, margin + 5, y + 12);
  pdf.text('30 jours', margin + 60, y + 12);
  pdf.text('A reception de facture', margin + 115, y + 12);
  y += 20;

  // ===== CLIENT =====
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('CLIENT', margin, y);
  y += 5;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(company.name || 'Client', margin, y);
  y += 6;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  if (company.billing_address || company.address) {
    pdf.text(company.billing_address || company.address, margin, y);
    y += 5;
  }
  const city = [company.billing_postal_code || company.postal_code, company.billing_city || company.city].filter(Boolean).join(' ');
  if (city) {
    pdf.text(city, margin, y);
    y += 5;
  }
  y += 3;
  
  // Original quote reference
  pdf.setFontSize(9);
  pdf.setTextColor(...lightGray);
  pdf.text('Devis initial: ' + request.request_number, margin, y);
  y += 8;

  // ===== INTRODUCTION =====
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(...green);
  pdf.setLineWidth(0.5);
  pdf.rect(margin, y, contentWidth, 14, 'FD');
  pdf.setFontSize(9);
  pdf.setTextColor(22, 101, 52); // Dark green text
  pdf.text("Suite a l'inspection de vos appareils, nous avons constate des travaux supplementaires necessaires.", margin + 5, y + 5);
  pdf.text("Veuillez trouver ci-dessous le detail des interventions recommandees.", margin + 5, y + 10);
  y += 18;

  // ===== DETAILED PRICING TABLE =====
  const rowH = 7;
  const colQty = margin;
  const colDesc = margin + 12;
  const colUnit = pageWidth - margin - 45;
  const colTotal = pageWidth - margin - 3;
  
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Travaux Supplementaires', margin, y);
  y += 7;

  // Header row
  pdf.setFillColor(...darkBlue);
  pdf.rect(margin, y, contentWidth, 9, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...white);
  pdf.text('Qte', colQty + 3, y + 6);
  pdf.text('Désignation', colDesc, y + 6);
  pdf.text('Prix Unit.', colUnit, y + 6, { align: 'right' });
  pdf.text('Total HT', colTotal, y + 6, { align: 'right' });
  y += 9;

  let rowIndex = 0;
  let grandTotal = 0;

  // Build line items from devices with additional work
  devices.forEach((device) => {
    // Device header row
    checkPageBreak(15);
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, y, contentWidth, 8, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    const deviceHeader = (device.model_name || 'Appareil') + ' (SN: ' + (device.serial_number || 'N/A') + ')';
    pdf.text(deviceHeader, colDesc, y + 5.5);
    y += 8;
    
    // Findings (if any)
    if (device.service_findings) {
      checkPageBreak(10);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(...lightGray);
      const findingsText = ('Constat: ' + device.service_findings).substring(0, 90);
      pdf.text(findingsText, colDesc, y + 4);
      y += 6;
    }
    
    // Additional work items
    (device.additional_work_items || []).forEach((item) => {
      checkPageBreak(rowH + 2);
      const qty = parseInt(item.quantity) || 1;
      const unitPrice = parseFloat(item.price) || 0;
      const lineTotal = qty * unitPrice;
      grandTotal += lineTotal;
      
      pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250);
      pdf.rect(margin, y, contentWidth, rowH, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...darkBlue);
      pdf.text(String(qty), colQty + 3, y + 5);
      
      // Description with part number if available
      const desc = item.partNumber ? '[' + item.partNumber + '] ' + (item.description || 'Piece') : (item.description || 'Service');
      pdf.text(desc.substring(0, 55), colDesc, y + 5);
      pdf.text(unitPrice.toFixed(2) + ' EUR', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(lineTotal.toFixed(2) + ' EUR', colTotal, y + 5, { align: 'right' });
      y += rowH;
      rowIndex++;
    });
    
    y += 3; // Space between devices
  });

  // Total row
  checkPageBreak(15);
  pdf.setFillColor(...green);
  pdf.rect(margin, y, contentWidth, 11, 'F');
  pdf.setTextColor(...white);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL SUPPLEMENT HT', colUnit - 35, y + 7.5);
  pdf.setFontSize(16);
  pdf.text(grandTotal.toFixed(2) + ' EUR', colTotal, y + 8, { align: 'right' });
  y += 15;

  // ===== CONDITIONS =====
  checkPageBreak(25);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('CONDITIONS:', margin, y);
  y += 4;
  pdf.text("• Ce devis complémentaire est valable 30 jours à compter de sa date d'émission.", margin + 3, y);
  y += 4;
  pdf.text('• Les travaux seront effectues apres reception de votre accord ecrit.', margin + 3, y);
  y += 4;
  pdf.text('• Conditions de reglement: 30 jours fin de mois.', margin + 3, y);
  y += 8;

  // ===== SIGNATURE SECTION =====
  const sigY = Math.max(y + 5, pageHeight - footerHeight - 45);
  
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, sigY, pageWidth - margin, sigY);
  
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('ETABLI PAR', margin, sigY + 7);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Service Technique', margin, sigY + 14);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('Lighthouse France', margin, sigY + 20);

  // Capcert logo
  if (capcertLogo) {
    try {
      const format = capcertLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(capcertLogo, format, margin + 52, sigY + 3, 32, 32);
    } catch (e) {}
  }

  // Signature box
  const sigBoxX = pageWidth - margin - 62;
  
  if (isSigned && signatureName) {
    // Signed version - green box with signature
    pdf.setFillColor(240, 253, 244); // Light green background
    pdf.setDrawColor(...green);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(sigBoxX, sigY + 3, 62, 36, 2, 2, 'FD');
    
    pdf.setFontSize(8);
    pdf.setTextColor(...green);
    pdf.text('APPROUVE PAR', sigBoxX + 4, sigY + 10);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text(signatureName, sigBoxX + 4, sigY + 17);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...gray);
    pdf.text('Date: ' + signatureDate, sigBoxX + 4, sigY + 24);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...green);
    pdf.text('Lu et approuve', sigBoxX + 4, sigY + 30);
    
    if (signatureImage) {
      try { pdf.addImage(signatureImage, 'PNG', sigBoxX + 40, sigY + 9, 18, 16); } catch(e) {}
    }
  } else {
    // Unsigned version - dashed box
    pdf.setFontSize(8);
    pdf.setTextColor(...lightGray);
    pdf.text('Signature client', sigBoxX + 16, sigY + 7);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.roundedRect(sigBoxX + 5, sigY + 10, 52, 22, 2, 2, 'D');
    pdf.setLineDashPattern([], 0);
    pdf.text('Lu et approuve', sigBoxX + 18, sigY + 37);
  }

  addFooter();
  return pdf.output('blob');
}


// ============================================
// RENTAL QUOTE PDF GENERATOR (Customer Portal)
// ============================================
async function generateRentalQuotePDF(options) {
  const { rental, isSigned = false, signatureName = '', signatureDate = '', signatureImage = null } = options;
  
  await new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');

  const qd = rental.quote_data || {};
  const company = rental.companies || {};
  const items = qd.quoteItems || qd.items || rental.rental_request_items || [];
  const period = qd.rentalPeriod || { start: rental.start_date, end: rental.end_date, days: Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000*60*60*24)) + 1 };

  // French date formatter: "19 février 2026"
  const formatDateFR = (d) => {
    const date = new Date(d);
    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
  };

  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerHeight = 16;

  const navy = [45, 90, 123];
  const darkBlue = [26, 26, 46];
  const gray = [80, 80, 80];
  const lightGray = [130, 130, 130];
  const white = [255, 255, 255];

  let y = 8;

  const loadImg = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) { return null; }
  };

  let lighthouseLogo = await loadImg('/images/logos/Lighthouse-color-logo.jpg');
  let capcertLogo = await loadImg('/images/logos/capcert-logo.png');

  const addFooter = () => {
    pdf.setFillColor(...darkBlue);
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    pdf.setTextColor(...white);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Lighthouse France SAS', pageWidth / 2, pageHeight - footerHeight + 6, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.setFontSize(8);
    pdf.text('16, rue Paul Sejourne - 94000 CRETEIL - Tel. 01 43 77 28 07', pageWidth / 2, pageHeight - footerHeight + 11, { align: 'center' });
  };

  const getUsableHeight = () => pageHeight - footerHeight - margin;

  const checkPageBreak = (needed) => {
    if (y + needed > getUsableHeight()) { addFooter(); pdf.addPage(); y = margin; return true; }
    return false;
  };

  // ===== HEADER =====
  if (lighthouseLogo) {
    try {
      const format = lighthouseLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(lighthouseLogo, format, margin, y - 5, 80, 20);
    } catch (e) {
      pdf.setFontSize(24); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...darkBlue);
      pdf.text('LIGHTHOUSE', margin, y + 8);
    }
  } else {
    pdf.setFontSize(24); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...darkBlue);
    pdf.text('LIGHTHOUSE', margin, y + 8);
  }

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...navy);
  pdf.text('DEVIS LOCATION', pageWidth - margin, y + 5, { align: 'right' });

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('N\u00B0 ' + (rental.rental_number || '\u2014'), pageWidth - margin, y + 11, { align: 'right' });

  y += 17;
  pdf.setDrawColor(...navy);
  pdf.setLineWidth(1);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 3;

  // ===== INFO BAR =====
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth, 16, 'F');
  pdf.setFontSize(7);
  pdf.setTextColor(...lightGray);
  pdf.text('DATE', margin + 5, y + 4);
  pdf.text('VALIDITE', margin + 65, y + 4);
  pdf.text('CONDITIONS', margin + 120, y + 4);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(formatDateFR(new Date()), margin + 5, y + 11);
  pdf.text('30 jours', margin + 65, y + 11);
  pdf.setFontSize(9);
  pdf.text(qd.paymentTerms || 'A reception de facture', margin + 120, y + 11);
  y += 20;

  // ===== CLIENT =====
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('CLIENT', margin, y);
  y += 5;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(qd.clientName || company.name || 'Client', margin, y);
  y += 6;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  const addr = qd.clientAddress || company.billing_address || company.address || '';
  if (addr) { pdf.text(addr, margin, y); y += 5; }
  const cityLine = [qd.clientPostalCode || company.billing_postal_code || company.postal_code, qd.clientCity || company.billing_city || company.city].filter(Boolean).join(' ');
  if (cityLine) { pdf.text(cityLine, margin, y); y += 5; }
  y += 5;

  // ===== RENTAL PERIOD BLOCK =====
  checkPageBreak(16);
  const periodStartY = y;
  pdf.setDrawColor(139, 92, 246);
  pdf.setLineWidth(1);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Location de Materiel', margin + 5, y + 4);
  y += 11;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('- Periode: du ' + formatDateFR(period.start) + ' au ' + formatDateFR(period.end) + ' (' + period.days + ' jours)', margin + 9, y);
  y += 5;
  if (qd.deliveryTerms) { pdf.text('- Delai de livraison: ' + qd.deliveryTerms, margin + 9, y); y += 5; }
  pdf.text('- Assurance \u00AB Bien Confie \u00BB obligatoire (vol, incendie, degats des eaux, bris accidentel)', margin + 9, y);
  y += 3;
  pdf.line(margin, periodStartY, margin, y);
  y += 8;

  // ===== PRICING TABLE =====
  const rowH = 7;
  const colQty = margin;
  const colDesc = margin + 12;
  const colRate = pageWidth - margin - 68;
  const colDuration = pageWidth - margin - 38;
  const colTotal = pageWidth - margin - 3;

  const drawTableHeader = () => {
    pdf.setFillColor(...darkBlue);
    pdf.rect(margin, y, contentWidth, 9, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...white);
    pdf.text('Qte', colQty + 3, y + 6);
    pdf.text('Désignation', colDesc, y + 6);
    pdf.text('Tarif', colRate, y + 6, { align: 'right' });
    pdf.text('Duree', colDuration, y + 6, { align: 'right' });
    pdf.text('Total HT', colTotal, y + 6, { align: 'right' });
    y += 9;
  };

  const checkTablePageBreak = (needed) => {
    if (y + needed > getUsableHeight()) { addFooter(); pdf.addPage(); y = margin; drawTableHeader(); return true; }
    return false;
  };

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Récapitulatif des Prix', margin, y);
  y += 6;
  drawTableHeader();

  let rowIndex = 0;

  items.forEach((item) => {
    const rateLabel = item.rate_type === 'semaine' ? '/sem' : item.rate_type === 'mois' ? '/mois' : item.rate_type === 'forfait' ? '' : '/jour';
    const appliedRate = parseFloat(item.applied_rate) || 0;
    const lineTotal = parseFloat(item.line_total) || 0;
    const retailVal = parseFloat(item.retail_value) || 0;
    const daysDisplay = (item.rental_days || period.days) + 'j';
    
    // Build device name - avoid duplicate serial
    const rawName = item.item_name || 'Equipement';
    const serial = item.serial_number || '';
    const nameHasSerial = serial && rawName.includes(serial);
    const deviceName = nameHasSerial ? rawName : (serial ? rawName + ' (SN: ' + serial + ')' : rawName);
    
    const specs = item.specs || item.description || '';
    const hasSpecs = specs.length > 0;
    
    const mainLineH = 7;
    const specsLineH = hasSpecs ? 5 : 0;
    const insuranceLineH = retailVal > 0 ? 5 : 0;
    const totalRowH = mainLineH + specsLineH + insuranceLineH + 2;
    
    checkTablePageBreak(totalRowH);
    
    pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 248, rowIndex % 2 === 0 ? 255 : 248, rowIndex % 2 === 0 ? 255 : 248);
    pdf.rect(margin, y, contentWidth, totalRowH, 'F');
    
    const textY = y + 5;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkBlue);
    pdf.text('1', colQty + 3, textY);
    pdf.setFont('helvetica', 'bold');
    pdf.text(deviceName.substring(0, 52), colDesc, textY);
    
    pdf.setFont('helvetica', 'normal');
    if (appliedRate > 0) pdf.text(appliedRate.toFixed(2) + ' EUR' + rateLabel, colRate, textY, { align: 'right' });
    pdf.text(daysDisplay, colDuration, textY, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(lineTotal.toFixed(2) + ' EUR', colTotal, textY, { align: 'right' });
    
    let subY = textY + mainLineH;
    
    if (hasSpecs) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...lightGray);
      pdf.text(specs.substring(0, 80), colDesc, subY - 1);
      subY += specsLineH;
    }
    
    if (retailVal > 0) {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(...lightGray);
      pdf.text('Valeur neuf (assurance): ' + retailVal.toFixed(2) + ' EUR', colDesc, subY - 1);
    }
    
    y += totalRowH;
    rowIndex++;
  });

  // Shipping
  const shippingVal = parseFloat(qd.shipping) || 0;
  if (shippingVal > 0) {
    checkTablePageBreak(rowH);
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, y, contentWidth, rowH, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...darkBlue);
    pdf.text('1', colQty + 3, y + 5);
    pdf.text('Frais de port', colDesc, y + 5);
    pdf.text(shippingVal.toFixed(2) + ' EUR', colRate, y + 5, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(shippingVal.toFixed(2) + ' EUR', colTotal, y + 5, { align: 'right' });
    y += rowH;
  }

  // Discount
  const discountAmount = parseFloat(qd.discountAmount) || 0;
  if (discountAmount > 0) {
    checkTablePageBreak(rowH);
    pdf.setFillColor(255, 251, 235);
    pdf.rect(margin, y, contentWidth, rowH, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(180, 30, 30);
    pdf.text('1', colQty + 3, y + 5);
    pdf.text(qd.discountType === 'percent' ? 'Remise (' + qd.discount + '%)' : 'Remise', colDesc, y + 5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('-' + discountAmount.toFixed(2) + ' EUR', colTotal, y + 5, { align: 'right' });
    y += rowH;
  }

  // Total
  checkPageBreak(14);
  pdf.setFillColor(...navy);
  pdf.rect(margin, y, contentWidth, 12, 'F');
  pdf.setTextColor(...white);
  pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL HT', colDuration - 20, y + 8);
  pdf.setFontSize(16);
  pdf.text((qd.totalHT || 0).toFixed(2) + ' EUR', colTotal, y + 8, { align: 'right' });
  y += 16;

  // Conditions
  const RENTAL_CONDITIONS = [
    'Le materiel reste la propriete de Lighthouse France. La garde est transferee au client des reception jusqu\'a restitution.',
    'Utilisation conforme par personnel qualifie. Sous-location interdite sans accord ecrit. Tout incident doit etre signale sous 48h par ecrit.',
    'Le client doit souscrire une assurance \u00AB Bien Confie \u00BB couvrant: vol, incendie, degats des eaux, bris accidentel.',
    'Le materiel doit etre restitue en bon etat a la date convenue. Les dommages ou pieces manquantes seront factures au cout de remise en etat.',
    'Les jours de retard seront factures au tarif journalier majore de 50%. Lighthouse France pourra recuperer le materiel a tout moment.',
    'Le non-respect des conditions peut entrainer la resiliation immediate du contrat de location.'
  ];

  y += 5;
  checkPageBreak(8 + RENTAL_CONDITIONS.length * 5);
  pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...lightGray);
  pdf.text('CONDITIONS GENERALES DE LOCATION', margin, y);
  y += 5;
  pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...gray);
  RENTAL_CONDITIONS.forEach((d, i) => {
    checkPageBreak(5);
    const wrapped = pdf.splitTextToSize((i + 1) + '. ' + d, contentWidth);
    wrapped.forEach(line => { checkPageBreak(4.5); pdf.text(line, margin, y); y += 4.5; });
  });

  if (qd.notes) {
    y += 2;
    checkPageBreak(10);
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...lightGray);
    pdf.text('NOTES', margin, y);
    y += 3;
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...gray);
    const noteLines = pdf.splitTextToSize(qd.notes, contentWidth);
    noteLines.forEach(line => { checkPageBreak(3.5); pdf.text(line, margin, y); y += 3.5; });
  }

  // ===== SIGNATURE SECTION =====
  const signatureHeight = 36;
  const signatureLimit = pageHeight - footerHeight - 2;
  if (y + signatureHeight > signatureLimit) { addFooter(); pdf.addPage(); y = margin; }
  const sigY = Math.max(y + 3, signatureLimit - signatureHeight);

  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, sigY, pageWidth - margin, sigY);

  pdf.setFontSize(7); pdf.setTextColor(...lightGray);
  pdf.text('ETABLI PAR', margin, sigY + 6);
  pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...darkBlue);
  pdf.text(qd.businessSettings?.quote_signatory || 'M. Meleney', margin, sigY + 12);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...gray);
  pdf.text(qd.businessSettings?.company_name || 'Lighthouse France', margin, sigY + 17);

  if (capcertLogo) {
    try {
      const format = capcertLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(capcertLogo, format, margin + 50, sigY + 2, 28, 28);
    } catch (e) {}
  }

  if (isSigned && signatureName) {
    const sigBoxX = pageWidth - margin - 60;
    pdf.setFillColor(240, 253, 244);
    pdf.rect(sigBoxX, sigY + 2, 60, 30, 'F');
    pdf.setDrawColor(0, 166, 81);
    pdf.setLineWidth(0.5);
    pdf.rect(sigBoxX, sigY + 2, 60, 30, 'S');
    
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 166, 81);
    pdf.text('BON POUR ACCORD', sigBoxX + 10, sigY + 9);
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...darkBlue);
    pdf.text('Signe par: ' + signatureName, sigBoxX + 3, sigY + 15);
    pdf.text('Date: ' + signatureDate, sigBoxX + 3, sigY + 20);
    
    if (signatureImage) {
      try { pdf.addImage(signatureImage, 'PNG', sigBoxX + 8, sigY + 21, 38, 9); } catch (e) {}
    }
  } else {
    const sigBoxX = pageWidth - margin - 60;
    pdf.setFontSize(7); pdf.setTextColor(...lightGray);
    pdf.text('Signature client', sigBoxX + 16, sigY + 6);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.roundedRect(sigBoxX + 5, sigY + 9, 50, 18, 2, 2, 'D');
    pdf.setLineDashPattern([], 0);
    pdf.text('Lu et approuve', sigBoxX + 17, sigY + 30);
  }

  addFooter();

  const totalPages = pdf.internal.getNumberOfPages();
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7);
      pdf.setTextColor(180, 180, 180);
      pdf.text('Page ' + i + ' / ' + totalPages, pageWidth - margin, pageHeight - 2, { align: 'right' });
    }
  }

  return pdf.output('blob');
}


// Translations
const T = {
  fr: {
    dashboard: 'Tableau de Bord', newRequest: 'Nouvelle Demande', myRequests: 'Mes Demandes',
    myEquipment: 'Mes Équipements', settings: 'Paramètres', logout: 'Déconnexion',
    welcome: 'Bienvenue', totalDevices: 'Appareils', inProgress: 'En cours', completed: 'Terminés',
    submitRequest: 'Soumettre une Demande', viewAll: 'Voir tout',
    // Request form
    deviceInfo: 'Information Appareil', deviceNumber: 'Appareil', brand: 'Marque', deviceType: 'Type d\'appareil',
    model: 'Modèle', serialNumber: 'N° Série', serviceType: 'Type de Service', 
    notesForTech: 'Notes pour le Technicien', accessories: 'Accessoires Inclus',
    charger: 'Chargeur', battery: 'Batterie', powerCable: 'Câble d\'alimentation', 
    carryingCase: 'Mallette', otherAccessories: 'Autres accessoires',
    uploadPhotos: 'Photos (optionnel)', addDevice: 'Ajouter un Appareil', removeDevice: 'Retirer',
    // Shipping
    shippingInfo: 'Information d\'Expédition', attention: 'À l\'attention de', selectAddress: 'Adresse d\'expédition',
    addNewAddress: 'Ajouter une adresse',
    // Actions
    submit: 'Soumettre', cancel: 'Annuler', save: 'Enregistrer', edit: 'Modifier', delete: 'Supprimer',
    loading: 'Chargement...', saving: 'Enregistrement...', saved: 'Enregistré!',
    // Service types
    repair: 'Réparation', calibration: 'Étalonnage', maintenance: 'Maintenance', inspection: 'Inspection',
    // Device types
    particle_counter: 'Compteur de particules', air_sampler: 'Échantillonneur d\'air', 
    flow_meter: 'Débitmètre', temp_humidity: 'Capteur Temp/Humidité', other: 'Autre',
    // Status
    submitted: 'Soumise', quoted: 'Devis envoyé', approved: 'Approuvée', received: 'Reçue',
    in_progress: 'En cours', quality_check: 'Contrôle qualité', shipped: 'Expédiée',
    // Settings
    accountInfo: 'Information du Compte', shippingAddresses: 'Adresses d\'Expédition',
    billingAddresses: 'Adresses de Facturation', contact: 'Contact', company: 'Société',
    email: 'Email', phone: 'Téléphone', address: 'Adresse', city: 'Ville', postalCode: 'Code Postal',
    country: 'Pays', setDefault: 'Définir par défaut', default: 'Par défaut',
    // Messages
    noEquipment: 'Aucun équipement enregistré', noRequests: 'Aucune demande',
    addEquipmentFirst: 'Ajoutez d\'abord vos équipements', charactersRemaining: 'caractères restants'
  },
  en: {
    dashboard: 'Dashboard', newRequest: 'New Request', myRequests: 'My Requests',
    myEquipment: 'My Equipment', settings: 'Settings', logout: 'Logout',
    welcome: 'Welcome', totalDevices: 'Devices', inProgress: 'In Progress', completed: 'Completed',
    submitRequest: 'Submit Request', viewAll: 'View all',
    // Request form
    deviceInfo: 'Device Information', deviceNumber: 'Device', brand: 'Brand', deviceType: 'Device Type',
    model: 'Model', serialNumber: 'Serial #', serviceType: 'Service Type',
    notesForTech: 'Notes for Technician', accessories: 'Accessories Included',
    charger: 'Charger', battery: 'Battery', powerCable: 'Power Cable',
    carryingCase: 'Carrying Case', otherAccessories: 'Other accessories',
    uploadPhotos: 'Photos (optional)', addDevice: 'Add Device', removeDevice: 'Remove',
    // Shipping
    shippingInfo: 'Shipping Information', attention: 'Attention', selectAddress: 'Shipping Address',
    addNewAddress: 'Add new address',
    // Actions
    submit: 'Submit', cancel: 'Cancel', save: 'Save', edit: 'Edit', delete: 'Delete',
    loading: 'Loading...', saving: 'Saving...', saved: 'Saved!',
    // Service types
    repair: 'Repair', calibration: 'Calibration', maintenance: 'Maintenance', inspection: 'Inspection',
    // Device types
    particle_counter: 'Particle Counter', air_sampler: 'Air Sampler',
    flow_meter: 'Flow Meter', temp_humidity: 'Temp/Humidity Monitor', other: 'Other',
    // Status
    submitted: 'Submitted', quoted: 'Quoted', approved: 'Approved', received: 'Received',
    in_progress: 'In Progress', quality_check: 'Quality Check', shipped: 'Shipped',
    // Settings
    accountInfo: 'Account Information', shippingAddresses: 'Shipping Addresses',
    billingAddresses: 'Billing Addresses', contact: 'Contact', company: 'Company',
    email: 'Email', phone: 'Phone', address: 'Address', city: 'City', postalCode: 'Postal Code',
    country: 'Country', setDefault: 'Set as default', default: 'Default',
    // Messages
    noEquipment: 'No equipment registered', noRequests: 'No requests',
    addEquipmentFirst: 'Add your equipment first', charactersRemaining: 'characters remaining'
  }
};

// Status styles
const STATUS_STYLES = {
  // === BOTH FLOWS - INITIAL ===
  submitted: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'Soumis', icon: '○', progress: 5 },
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'Soumis', icon: '○', progress: 5 },
  
  // === BOTH FLOWS - APPROVAL/BC ===
  waiting_approval: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'En attente d\'approbation', icon: '◐', progress: 10 },
  approved: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'Approuvé - En attente BC', icon: '◑', progress: 20 },
  waiting_bc: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'Approuvé - En attente BC', icon: '◑', progress: 20 },
  waiting_po: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'Approuvé - En attente BC', icon: '◑', progress: 20 },
  // BC SUBMITTED - PENDING REVIEW
  bc_review: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'BC soumis - En vérification', icon: '📄', progress: 25 },
  bc_rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'BC rejeté - Action requise', icon: '❌', progress: 22 },
  // CUSTOMER ACTION REQUIRED - RED
  waiting_customer: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Action client requise', icon: '!', progress: 20 },
  
  // === BOTH FLOWS - WAITING FOR DEVICE ===
  waiting_device: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'En attente réception', icon: '◔', progress: 30 },
  
  // === CALIBRATION FLOW ===
  received_calibration: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Reçu - En attente étalonnage', icon: '◕', progress: 40 },
  calibration_in_progress: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', label: 'Étalonnage en cours', icon: '◉', progress: 60 },
  
  // === REPAIR FLOW ===
  received_repair: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Reçu - En attente inspection', icon: '◕', progress: 35 },
  inspection_complete: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Inspection terminée - En attente approbation client', icon: '◎', progress: 40 },
  repair_declined: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Réparation refusée par client', icon: '✕', progress: 45 },
  order_received: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'Commande reçue', icon: '✓', progress: 50 },
  waiting_parts: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', label: 'En attente de pièces', icon: '◐', progress: 55 },
  repair_in_progress: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', label: 'Réparation en cours', icon: '◉', progress: 65 },
  repair_complete: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300', label: 'Réparation terminée', icon: '●', progress: 75 },
  
  // === PARTS ORDER STATUSES (using existing db statuses) ===
  // processing = parts ordered, in_progress = parts received
  
  // === LEGACY (for backwards compatibility) ===
  received: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Reçu', icon: '◕', progress: 40 },
  in_progress: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', label: 'En cours', icon: '◉', progress: 60 },
  quote_sent: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Devis envoyé - Action requise', icon: '💰', progress: 45 },
  quote_revision_requested: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'Modification demandée', icon: '✏️', progress: 40 },
  quote_revision_declined: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Modification refusée - Action requise', icon: '❌', progress: 45 },
  quoted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Devis envoyé', icon: '◎', progress: 45 },
  
  // === BOTH FLOWS - FINAL STAGES ===
  final_qc: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300', label: 'Contrôle qualité final', icon: '◈', progress: 85 },
  quality_check: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300', label: 'Contrôle qualité final', icon: '◈', progress: 85 },
  ready_to_ship: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', label: 'Prêt pour expédition', icon: '◆', progress: 95 },
  shipped: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'Expédié', icon: '▸', progress: 100 },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400', label: 'Livré', icon: '●', progress: 100 },
  completed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400', label: 'Terminé', icon: '●', progress: 100 },
  
  // === HOLD/ISSUES ===
  on_hold: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'En attente', icon: '!', progress: 0 },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400', label: 'Annulé', icon: '✕', progress: 0 }
};

// Step Progress Tracker Component (Chevron Style)
const StepProgress = ({ status, serviceType, bcApproved = true }) => {
  // Define steps based on service type
  // RENTAL: 6 steps
  const rentalSteps = [
    { id: 'submitted', label: 'Demande Soumise', shortLabel: 'Soumis' },
    { id: 'quote', label: 'Devis Envoyé', shortLabel: 'Devis' },
    { id: 'approved', label: 'BC Approuvé', shortLabel: 'Approuvé' },
    { id: 'shipped', label: 'Expédié / En Location', shortLabel: 'En cours' },
    { id: 'returned', label: 'Retourné', shortLabel: 'Retourné' },
    { id: 'inspection', label: 'Inspection', shortLabel: 'Inspection' },
    { id: 'completed', label: 'Terminé', shortLabel: 'Terminé' }
  ];
  
  // CALIBRATION: 10 steps
  const calibrationSteps = [
    { id: 'submitted', label: 'Soumis', shortLabel: 'Soumis' },
    { id: 'rma_created', label: 'RMA/Devis Créé', shortLabel: 'Devis' },
    { id: 'approved', label: 'Devis Approuvé', shortLabel: 'Approuvé' },
    { id: 'waiting', label: 'En attente réception', shortLabel: 'Attente' },
    { id: 'received', label: 'Reçu', shortLabel: 'Reçu' },
    { id: 'queue', label: 'File d\'attente', shortLabel: 'File' },
    { id: 'calibration', label: 'Étalonnage', shortLabel: 'Étal.' },
    { id: 'qc', label: 'Contrôle QC', shortLabel: 'QC' },
    { id: 'ready', label: 'Prêt', shortLabel: 'Prêt' },
    { id: 'shipped', label: 'Expédié', shortLabel: 'Expédié' }
  ];

  // REPAIR: 12 steps
  const repairSteps = [
    { id: 'submitted', label: 'Soumis', shortLabel: 'Soumis' },
    { id: 'rma_created', label: 'RMA/Devis Créé', shortLabel: 'Devis' },
    { id: 'approved', label: 'Devis Approuvé', shortLabel: 'Approuvé' },
    { id: 'waiting', label: 'En attente réception', shortLabel: 'Attente' },
    { id: 'received', label: 'Reçu', shortLabel: 'Reçu' },
    { id: 'queue', label: "File d'attente", shortLabel: 'File' },
    { id: 'inspection', label: 'Inspection', shortLabel: 'Insp.' },
    { id: 'approval', label: 'Approbation', shortLabel: 'Appr.' },
    { id: 'repair', label: 'Réparation', shortLabel: 'Rép.' },
    { id: 'qc', label: 'Contrôle QC', shortLabel: 'QC' },
    { id: 'ready', label: 'Prêt', shortLabel: 'Prêt' },
    { id: 'shipped', label: 'Expédié', shortLabel: 'Expédié' }
  ];

  // PARTS ORDER: 6 steps
  const partsSteps = [
    { id: 'submitted', label: 'Soumis', shortLabel: 'Soumis' },
    { id: 'quote_sent', label: 'Devis Envoyé', shortLabel: 'Devis' },
    { id: 'bc_approved', label: 'BC Approuvé', shortLabel: 'BC' },
    { id: 'in_progress', label: 'Commande en traitement', shortLabel: 'Traitement' },
    { id: 'ready_to_ship', label: 'Prêt à expédier', shortLabel: 'Prêt' },
    { id: 'shipped', label: 'Expédié', shortLabel: 'Expédié' }
  ];

  const isRepair = serviceType === 'repair' || serviceType === 'réparation';
  const isRental = serviceType === 'rental' || serviceType === 'location';
  const isParts = serviceType === 'parts';
  const steps = isParts ? partsSteps : isRental ? rentalSteps : isRepair ? repairSteps : calibrationSteps;

  // Map current status to step index
  const getStepIndex = (currentStatus) => {
    if (!currentStatus) return 0;
    
    if (isRental) {
      const rentalMap = {
        'requested': 0, 'submitted': 0, 'pending': 0,
        'pending_quote_review': 1, 'quote_sent': 1,
        'waiting_bc': 2, 'bc_review': 2, 'bc_approved': 2,
        'shipped': 3, 'in_rental': 3,
        'return_pending': 4, 'returned': 4,
        'inspection': 5, 'inspection_issue': 5,
        'completed': 6, 'cancelled': 0
      };
      return rentalMap[currentStatus] ?? 0;
    } else if (isParts) {
      const partsMap = {
        'submitted': 0, 'pending': 0, 'pending_quote_review': 0,
        'quote_sent': 1, 'quote_revision_requested': 1, 'quote_revision_declined': 1,
        'waiting_bc': 1, 'waiting_po': 1, 'approved': 1,
        'bc_review': 2, 'bc_submitted': 2, 'bc_approved': 2, 'waiting_reception': 2,
        'in_progress': 3, 'received': 3, 'inspection': 3, 'repair': 3, 'repair_in_progress': 3,
        'ready_to_ship': 4, 'qc': 4, 'final_qc': 4,
        'shipped': 5, 'completed': 5, 'delivered': 5
      };
      return partsMap[currentStatus] ?? 0;
    } else if (isRepair) {
      // Repair flow mapping (12 steps: 0-11)
      const repairMap = {
        'submitted': 0, 'pending': 0,
        'quote_sent': 1, 'quote_revision_requested': 1, 'quote_revision_declined': 1,
        'bc_pending': 2, 'bc_review': 2, 'waiting_bc': 2,
        'waiting_device': 3,
        'received': 4, 'received_repair': 4,
        'in_queue': 5, 'queued': 5,
        'inspection': 6, 'inspection_complete': 6,
        'customer_approval': 7, 'waiting_approval': 7,
        'repair_in_progress': 8, 'in_progress': 8, 'waiting_parts': 8,
        'final_qc': 9, 'quality_check': 9,
        'ready_to_ship': 10,
        'shipped': 11, 'delivered': 11, 'completed': 11
      };
      const index = repairMap[currentStatus] ?? 0;
      return index;
    } else {
      // Calibration flow mapping (10 steps: 0-9)
      const calibrationMap = {
        'submitted': 0, 'pending': 0,
        'quote_sent': 1, 'quote_revision_requested': 1, 'quote_revision_declined': 1,
        'bc_pending': 2, 'bc_review': 2, 'waiting_bc': 2,
        'waiting_device': 3,
        'received': 4, 'received_calibration': 4,
        'in_queue': 5, 'queued': 5,
        'in_progress': 6, 'calibration_in_progress': 6,
        'final_qc': 7, 'quality_check': 7,
        'ready_to_ship': 8,
        'shipped': 9, 'delivered': 9, 'completed': 9
      };
      const index = calibrationMap[currentStatus] ?? 0;
      return index;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="w-full">
      {/* Desktop version */}
      <div className="hidden md:flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === steps.length - 1;
          // Red highlight on "Devis Approuvé" (index 2) when device received but BC not approved
          const isBCStepRed = !bcApproved && index === 2 && currentIndex > 2;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div 
                className={`
                  relative flex items-center justify-center flex-1 py-2 px-1 text-xs font-medium
                  ${isBCStepRed ? 'bg-red-500 text-white animate-pulse' : isCompleted ? 'bg-[#3B7AB4] text-white' : isCurrent ? 'bg-[#1E3A5F] text-white' : 'bg-gray-200 text-gray-500'}
                  ${index === 0 ? 'rounded-l-md' : ''}
                  ${isLast ? 'rounded-r-md' : ''}
                `}
                style={{
                  clipPath: isLast 
                    ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%)' 
                    : index === 0 
                      ? 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)'
                      : 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)'
                }}
              >
                <span className="truncate px-1">{isBCStepRed ? '⚠️ Pas de BC!' : step.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Mobile version - simplified */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#1E3A5F]">
            Étape {currentIndex + 1} sur {steps.length}
          </span>
          <span className="text-sm text-gray-500">{steps[currentIndex]?.label}</span>
        </div>
        <div className="flex gap-1">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`h-2 flex-1 rounded-full ${
                !bcApproved && index === 2 && currentIndex > 2 ? 'bg-red-500 animate-pulse' :
                index < currentIndex ? 'bg-[#3B7AB4]' : 
                index === currentIndex ? 'bg-[#1E3A5F]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper to get status label
const getStatusLabel = (status) => {
  return STATUS_STYLES[status]?.label || status || 'Inconnu';
};

// CALIBRATION FLOW (9 steps):
// 1. submitted - Soumis
// 2. waiting_approval - En attente d'approbation
// 3. approved - Approuvé - En attente BC
// 4. waiting_device - En attente réception
// 5. received_calibration - Reçu - En attente étalonnage
// 6. calibration_in_progress - Étalonnage en cours
// 7. final_qc - Contrôle qualité final
// 8. ready_to_ship - Prêt pour expédition
// 9. shipped - Expédié

// REPAIR FLOW (14 steps):
// 1. submitted - Soumis
// 2. waiting_approval - En attente d'approbation
// 3. approved - Approuvé - En attente BC
// 4. waiting_device - En attente réception
// 5. received_repair - Reçu - En attente inspection
// 6. inspection_complete - Inspection terminée - En attente approbation client
// 6a. repair_declined - Réparation refusée par client (branch)
// 7. order_received - Commande reçue
// 8. waiting_parts - En attente de pièces (optional)
// 9. repair_in_progress - Réparation en cours
// 10. repair_complete - Réparation terminée
// 11. final_qc - Contrôle qualité final
// 12. ready_to_ship - Prêt pour expédition
// 13. shipped - Expédié

// Model options by device type
const MODELS_BY_TYPE = {
  particle_counter: ['Solair 3100', 'Solair 3200', 'Solair 1100', 'ApexZ', 'ApexR', 'Handheld 3016', 'Handheld 5016'],
  air_sampler: ['SAS Super 180', 'SAS Super 360', 'MAS-100 NT', 'MAS-100 Eco'],
  flow_meter: ['Gilibrator-2', 'Defender 520', 'Mini-Buck'],
  temp_humidity: ['TR-72nw', 'TR-73U', 'Onset HOBO'],
  other: ['Other - Specify in notes']
};

// Brands
const BRANDS = ['Lighthouse', 'TSI', 'Particle Measuring Systems', 'Beckman Coulter', 'Other'];

// Service types
const SERVICE_TYPES = ['repair', 'calibration', 'maintenance', 'inspection'];

// Device types
const DEVICE_TYPES = ['particle_counter', 'air_sampler', 'flow_meter', 'temp_humidity', 'other'];

// Accessories
const ACCESSORIES = ['charger', 'battery', 'powerCable', 'carryingCase'];

export default function CustomerPortal() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('fr');
  const [page, setPage] = useState('dashboard');
  const [previousPage, setPreviousPage] = useState('dashboard');
  const [pendingRentalId, setPendingRentalId] = useState(null);
  const [pendingContractId, setPendingContractId] = useState(null);
  const [unseenInvoiceCount, setUnseenInvoiceCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [cookieConsent, setCookieConsent] = useState(() => {
    try { return localStorage.getItem('lhf_cookie_consent') === 'accepted'; } catch { return false; }
  });
  const [showLegalPage, setShowLegalPage] = useState(null); // 'privacy' | 'mentions' | null
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  
  // Data
  const [requests, setRequests] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const t = useCallback((k) => T[lang]?.[k] || k, [lang]);
  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load data
  const loadData = useCallback(async (p) => {
    if (!p?.company_id) return;
    
    const [reqRes, addrRes, contractsRes] = await Promise.all([
      supabase.from('service_requests')
        .select('*, request_devices(*), companies(*)')
        .eq('company_id', p.company_id)
        .order('created_at', { ascending: false }),
      supabase.from('shipping_addresses')
        .select('*')
        .eq('company_id', p.company_id)
        .order('is_default', { ascending: false }),
      supabase.from('contracts')
        .select('*, contract_devices(*), companies(*)')
        .eq('company_id', p.company_id)
        .order('created_at', { ascending: false })
    ]);
    
    if (reqRes.data) setRequests(reqRes.data);
    if (addrRes.data) setAddresses(addrRes.data);
    if (contractsRes.data) setContracts(contractsRes.data);

    // Count unseen invoices for nav badge
    try {
      const { data: invData } = await supabase
        .from('invoices')
        .select('id')
        .eq('company_id', p.company_id)
        .eq('status', 'sent');
      if (invData) {
        const seen = JSON.parse(localStorage.getItem('lhf_seen_invoices') || '[]');
        setUnseenInvoiceCount(invData.filter(i => !seen.includes(i.id)).length);
      }
    } catch (e) { /* invoices table may not exist yet */ }
  }, []);

  const refresh = useCallback(() => loadData(profile), [loadData, profile]);

  const processInviteOnFirstLogin = async (userId, userEmail) => {
    console.log('[Invite] Processing invite for:', userEmail);
    
    // Call server-side API to accept invite (bypasses RLS)
    try {
      const res = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          userEmail,
          fullName: userEmail.split('@')[0],
          phone: null
        })
      });
      
      const result = await res.json();
      console.log('[Invite] Accept result:', result);
      
      if (res.ok && result.success) {
        return 'invite';
      } else {
        console.error('[Invite] Accept failed:', result.error);
      }
    } catch (err) {
      console.error('[Invite] Accept API error:', err);
    }

    // Check for pending normal registration (localStorage fallback)
    const pendingReg = localStorage.getItem('lhf_pending_registration');
    if (pendingReg) {
      try {
        const reg = JSON.parse(pendingReg);
        console.log('[Auth] Found pending registration, completing via API...');
        const res = await fetch('/api/complete-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            userEmail,
            contactName: reg.contactName,
            phone: reg.phone,
            companyName: reg.companyName,
            address: reg.address,
            city: reg.city,
            postalCode: reg.postalCode,
            country: reg.country || 'France',
            siret: reg.siret,
            vatNumber: reg.vatNumber,
            chorusInvoicing: reg.chorusInvoicing || false,
            chorusServiceCode: reg.chorusServiceCode || ''
          })
        });
        const result = await res.json();
        console.log('[Auth] Registration result:', result);
        if (res.ok && result.success) {
          localStorage.removeItem('lhf_pending_registration');
          return 'registration';
        } else {
          console.error('[Auth] Registration API error:', result.error);
        }
      } catch (err) {
        console.error('Pending registration error:', err);
      }
    }

    return false;
  };
  // Auth check
  useEffect(() => {
    let cancelled = false;
    const hasHashTokens = window.location.hash?.includes('access_token');
    const hasErrorHash = window.location.hash?.includes('error=');

    // If URL has error hash (expired link etc), show login page
    if (hasErrorHash) {
      console.log('[Auth] Error in URL hash:', window.location.hash);
      // Strip the error hash so it doesn't persist
      window.history.replaceState(null, '', window.location.pathname);
      setLoading(false);
      return;
    }

    const processUser = async (session) => {
      if (!session?.user || cancelled) return false;
      console.log('[Auth] Processing user:', session.user.email);

      let p = null;
      try {
        const res = await supabase.from('profiles').select('*, companies(*)').eq('id', session.user.id).single();
        p = res.data;
      } catch (e) { console.error('[Auth] Profile query error:', e); }

      if (p) {
        if (p.role === 'lh_admin' || p.role === 'lh_employee') { window.location.href = '/admin'; return true; }
        if (p.invitation_status === 'deactivated' || p.invitation_status === 'gdpr_erased') {
          await supabase.auth.signOut({ scope: 'local' }); return false;
        }
        setUser(session.user);
        setProfile(p);
        setLang(p.preferred_language || 'fr');
        try { await loadData(p); } catch (e) { console.error('[Auth] loadData error:', e); }
        return true;
      } else {
        // No profile - try invite or pending registration
        console.log('[Auth] No profile, trying invite for:', session.user.email);
        try {
          const processed = await processInviteOnFirstLogin(session.user.id, session.user.email);
          if (processed) {
            const { data: newP } = await supabase.from('profiles').select('*, companies(*)').eq('id', session.user.id).single();
            if (newP) {
              setUser(session.user);
              setProfile(newP);
              setLang(newP.preferred_language || 'fr');
              if (processed === 'invite') {
                setNeedsSetup(true); // Invite users need to set name + password
              } else {
                setPage('dashboard'); // Registration users already set everything
              }
              try { await loadData(newP); } catch (e) { console.error('[Auth] loadData error:', e); }
              return true;
            }
          }
        } catch (e) { console.error('[Auth] Invite error:', e); }
        await supabase.auth.signOut({ scope: 'local' });
        return false;
      }
    };

    // Listen for auth events - this handles hash tokens (invite links, email confirmation, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Event:', event);
      if (cancelled) return;
      
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setUser(session?.user || null);
        setLoading(false);
        // Strip hash
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user && hasHashTokens) {
        // This fires when Supabase processes hash tokens from email links
        console.log('[Auth] SIGNED_IN from hash tokens for:', session.user.email);
        // Strip hash tokens from URL now that they're processed
        window.history.replaceState(null, '', window.location.pathname);
        await processUser(session);
        if (!cancelled) setLoading(false);
      }
    });

    // Normal page load - check for existing session (no hash tokens)
    if (!hasHashTokens) {
      const checkAuth = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await processUser(session);
          }
        } catch (err) {
          console.error('[Auth] Fatal error:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      checkAuth();
    } else {
      // Has hash tokens - wait for onAuthStateChange SIGNED_IN to fire
      // Set a timeout fallback in case Supabase fails to process tokens
      console.log('[Auth] Waiting for Supabase to process hash tokens...');
      const fallback = setTimeout(() => {
        if (!cancelled) {
          console.log('[Auth] Hash token processing timed out');
          window.history.replaceState(null, '', window.location.pathname);
          setLoading(false);
        }
      }, 5000);
      return () => { cancelled = true; clearTimeout(fallback); subscription?.unsubscribe(); };
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('invite')) setPage('register');

    return () => { cancelled = true; subscription?.unsubscribe(); };
  }, [loadData]);

  const logout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) { 
      console.warn('Sign out error, clearing manually:', error);
      localStorage.clear(); 
      sessionStorage.clear(); 
    }
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#3B7AB4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login function
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    
    const { data: p } = await supabase.from('profiles')
      .select('*, companies(*)')
      .eq('id', data.user.id)
      .single();
    
    if (p) {
      if (p.role === 'lh_admin' || p.role === 'lh_employee') {
        window.location.href = '/admin';
        return null;
      }
      if (p.invitation_status === 'deactivated' || p.invitation_status === 'gdpr_erased') {
        await supabase.auth.signOut({ scope: 'local' });
        return p.invitation_status === 'gdpr_erased' 
          ? 'Ce compte a été supprimé suite à une demande RGPD.'
          : 'Compte désactivé. Veuillez contacter votre administrateur.';
      }
      setUser(data.user);
      setProfile(p);
      if (p.preferred_language) setLang(p.preferred_language);
      else setLang('fr');
      setPage('dashboard');
      await loadData(p);
    } else {
      // No profile yet - try processing pending invite or registration
      const processed = await processInviteOnFirstLogin(data.user.id, data.user.email);
      if (processed) {
        // Reload profile
        const { data: newP } = await supabase.from('profiles')
          .select('*, companies(*)')
          .eq('id', data.user.id)
          .single();
        if (newP) {
          setUser(data.user);
          setProfile(newP);
          if (newP.preferred_language) setLang(newP.preferred_language);
          else setLang('fr');
          if (processed === 'invite') {
            setNeedsSetup(true); // Invite users need to set name + password
          } else {
            setPage('dashboard'); // Registration users already set everything
          }
          await loadData(newP);
          return null;
        }
      }
      await supabase.auth.signOut({ scope: 'local' });
      return 'Aucun profil trouvé. Veuillez contacter votre administrateur.';
    }
    return null;
  };

  // Register function
  const register = async (formData) => {
    // Get the redirect URL for email verification
    const redirectUrl = window.location.origin + window.location.pathname;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: formData.contactName,
          phone: formData.phone || null,
          invite_token: formData.inviteToken || null
        }
      }
    });
    if (authError) return authError.message;

    // For invite mode: profile will be created on first login
    if (formData.inviteToken) {
      notify("Compte créé ! Vérifiez votre email puis connectez-vous.");
      setPage('login');
      return null;
    }
    
    // Normal registration - create new company
    // (This works because non-invite signups may get a session immediately,
    //  but we also handle it on first login as a fallback)
    try {
      const { data: company, error: companyError } = await supabase.from('companies').insert({
        name: formData.companyName,
        billing_address: formData.address,
        billing_city: formData.city,
        billing_postal_code: formData.postalCode,
        country: formData.country || 'France',
        phone: formData.phone,
        email: formData.email
      }).select().single();
      
      if (companyError) {
        // If RLS blocked it (no session yet), user will need to verify email first
        if (companyError.code === '42501' || companyError.message?.includes('policy')) {
          notify('Compte créé ! Vérifiez votre email puis connectez-vous pour finaliser l\'inscription.');
          // Store pending registration data in localStorage for completion on first login
          localStorage.setItem('lhf_pending_registration', JSON.stringify({
            contactName: formData.contactName,
            phone: formData.phone,
            companyName: formData.companyName,
            address: formData.address,
            city: formData.city,
            postalCode: formData.postalCode,
            country: formData.country || 'France',
            siret: formData.siret,
            vatNumber: formData.vatNumber,
            chorusInvoicing: formData.chorusInvoicing || false,
            chorusServiceCode: formData.chorusServiceCode || ''
          }));
          setPage('login');
          return null;
        }
        return companyError.message;
      }
      
      // Create profile as admin of new company
      await supabase.from('profiles').insert({
        id: authData.user.id,
        email: formData.email,
        full_name: formData.contactName,
        role: 'admin',
        company_id: company.id,
        phone: formData.phone,
        invitation_status: 'active',
        can_view: true,
        can_request: true,
        can_invoice: true
      });
      
      // Create default shipping address from registration info
      await supabase.from('shipping_addresses').insert({
        company_id: company.id,
        label: 'Principal',
        company_name: formData.companyName,
        attention: formData.contactName,
        phone: formData.phone,
        address_line1: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        country: formData.country || 'France',
        is_default: true
      });

      // Create primary billing/invoicing address with SIRET/TVA/Chorus
      await supabase.from('shipping_addresses').insert({
        company_id: company.id,
        label: 'Facturation principale',
        company_name: formData.companyName,
        attention: formData.contactName,
        phone: formData.phone,
        address_line1: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        country: formData.country || 'France',
        is_billing: true,
        is_default: false,
        siret: formData.siret || null,
        tva_number: formData.vatNumber || null,
        chorus_invoicing: formData.chorusInvoicing || false,
        chorus_service_code: formData.chorusInvoicing ? (formData.chorusServiceCode || null) : null
      });
    } catch (err) {
      console.error('Registration error:', err);
    }
    
    notify('Compte créé ! Vérifiez votre email puis connectez-vous.');
    setPage('login');
    return null;
  };

  // Process pending invite on first login (when user has session but no profile)

  // Permissions
  const isAdmin = profile?.role === 'admin';
  const perms = {
    canView: isAdmin || profile?.can_view !== false,
    canRequest: isAdmin || !!profile?.can_request,
    canInvoice: isAdmin || !!profile?.can_invoice,
    isAdmin
  };

  // Password recovery mode
  if (recoveryMode) {
    return (
      <>
        {toast && (
          <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-white font-medium ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {toast.msg}
          </div>
        )}
        <PasswordRecoveryPage
          supabase={supabase}
          notify={notify}
          onComplete={() => {
            setRecoveryMode(false);
            window.location.href = window.location.pathname;
          }}
        />
      </>
    );
  }

  // Show login/register if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F9F9F9]">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-white font-medium ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {toast.msg}
          </div>
        )}
        
        {page === 'login' && <LoginPage t={t} login={login} setPage={setPage} />}
        {page === 'register' && <RegisterPage t={t} register={register} setPage={setPage} notify={notify} />}
        {(page !== 'login' && page !== 'register') && <HomePage t={t} setPage={setPage} setShowLegalPage={setShowLegalPage} />}

        {!cookieConsent && (
          <CookieBanner onAccept={() => { setCookieConsent(true); try { localStorage.setItem('lhf_cookie_consent', 'accepted'); } catch {} }} onShowPolicy={() => setShowLegalPage('privacy')} />
        )}
        {showLegalPage && <LegalPageModal page={showLegalPage} onClose={() => setShowLegalPage(null)} />}
      </div>
    );
  }

  // Account setup for invited users (need to set name + password)
  if (needsSetup && user && profile) {
    return (
      <div className="min-h-screen">
        {/* Fixed Background - same as login page */}
        <div className="fixed inset-0 z-0">
          <img 
            src="/images/products/hero-background.png" 
            alt="" 
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/90 via-[#1a1a2e]/85 to-[#1a1a2e]/80"></div>
        </div>
        
        <div className="relative z-10">
          {/* Header */}
          <header className="bg-[#1a1a2e]/50 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-3">
                  <img 
                    src="/images/logos/lighthouse-logo.png" 
                    alt="Lighthouse France" 
                    className="h-10 w-auto invert brightness-0 invert"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="items-center gap-2 hidden text-white">
                    <span className="font-bold text-2xl tracking-tight">LIGHTHOUSE</span>
                    <span className="font-semibold text-sm text-[#00A651]">FRANCE</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Setup Form */}
          <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
            {toast && (
              <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-white font-medium ${
                toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {toast.msg}
              </div>
            )}
            <AccountSetupPage 
              profile={profile}
              notify={notify}
              onComplete={async (fullName, password) => {
                try {
                  const { error: authErr } = await supabase.auth.updateUser({ password });
                  if (authErr) {
                    notify(`Erreur mot de passe: ${authErr.message}`, 'error');
                    return;
                  }
                  await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id);
                  setProfile({ ...profile, full_name: fullName });
                  setNeedsSetup(false);
                  setPage('dashboard');
                  notify('Bienvenue ! Votre compte est prêt.');
                } catch (err) {
                  notify(`Erreur: ${err.message}`, 'error');
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-white font-medium ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-[#1a1a2e] shadow-lg sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage('dashboard')}>
              <img 
                src="/images/logos/lighthouse-logo.png" 
                alt="Lighthouse France" 
                className="h-10 w-auto invert brightness-0 invert"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="items-center gap-2 hidden">
                <span className="text-white font-bold text-2xl tracking-tight">LIGHTHOUSE</span>
                <span className="text-[#00A651] font-semibold text-sm">FRANCE</span>
              </div>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => setPage('dashboard')} className={`font-medium ${page === 'dashboard' ? 'text-[#00A651]' : 'text-white/70 hover:text-white'}`}>
                {t('dashboard')}
              </button>
              {perms.canRequest && (
              <button onClick={() => setPage('new-request')} className={`font-medium ${page === 'new-request' ? 'text-[#00A651]' : 'text-white/70 hover:text-white'}`}>
                {t('newRequest')}
              </button>
              )}
              <button onClick={() => setPage('my-orders')} className={`font-medium ${page === 'my-orders' ? 'text-[#00A651]' : 'text-white/70 hover:text-white'}`}>
                {lang === 'en' ? 'My Orders' : 'Mes Commandes'}
              </button>
              <button onClick={() => setPage('equipment')} className={`font-medium ${page === 'equipment' ? 'text-[#00A651]' : 'text-white/70 hover:text-white'}`}>
                {t('myEquipment')}
              </button>
              {perms.canInvoice && (
              <button onClick={() => setPage('invoices')} className={`font-medium relative ${page === 'invoices' ? 'text-[#00A651]' : 'text-white/70 hover:text-white'}`}>
                {lang === 'en' ? 'Invoices' : 'Factures'}
                {unseenInvoiceCount > 0 && (
                  <span className="absolute -top-2 -right-4 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {unseenInvoiceCount}
                  </span>
                )}
              </button>
              )}
              <button onClick={() => setPage('settings')} className={`font-medium ${page === 'settings' ? 'text-[#00A651]' : 'text-white/70 hover:text-white'}`}>
                {t('settings')}
              </button>
              <button onClick={logout} className="text-white/50 hover:text-white/80">
                {t('logout')}
              </button>
            </nav>

            {/* Lang toggle */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setLang('fr'); if (profile?.id) supabase.from('profiles').update({ preferred_language: 'fr' }).eq('id', profile.id); }} 
                className={`px-2 py-1 rounded text-sm font-bold ${lang === 'fr' ? 'bg-[#00A651] text-white' : 'text-white/50'}`}
              >
                FR
              </button>
              <button 
                onClick={() => { setLang('en'); if (profile?.id) supabase.from('profiles').update({ preferred_language: 'en' }).eq('id', profile.id); }} 
                className={`px-2 py-1 rounded text-sm font-bold ${lang === 'en' ? 'bg-[#00A651] text-white' : 'text-white/50'}`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          <nav className="md:hidden flex gap-2 pb-3 overflow-x-auto">
            {['dashboard', ...(perms.canRequest ? ['new-request'] : []), 'my-orders', 'equipment', ...(perms.canInvoice ? ['invoices'] : []), 'settings'].map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap relative ${
                  page === p ? 'bg-[#00A651] text-white' : 'bg-white/10 text-white/70'
                }`}
              >
                {p === 'new-request' ? t('newRequest') : p === 'my-orders' ? (lang === 'en' ? 'My Orders' : 'Mes Commandes') : p === 'invoices' ? (lang === 'en' ? 'Invoices' : 'Factures') : t(p)}
                {p === 'invoices' && unseenInvoiceCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unseenInvoiceCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        {page === 'dashboard' && (
          <Dashboard 
            profile={profile} 
            requests={requests}
            contracts={contracts}
            t={t} 
            setPage={setPage}
            setSelectedRequest={setSelectedRequest}
            setPreviousPage={setPreviousPage}
            setPendingRentalId={setPendingRentalId}
            setPendingContractId={setPendingContractId}
            perms={perms}
          />
        )}
        
        {page === 'new-request' && perms.canRequest && (
          <NewRequestForm 
            profile={profile}
            addresses={addresses}
            t={t} 
            notify={notify}
            refresh={refresh}
            setPage={setPage}
          />
        )}
        
        {page === 'settings' && (
          <SettingsPage 
            profile={profile}
            addresses={addresses}
            requests={requests}
            t={t}
            notify={notify}
            refresh={refresh}
            lang={lang}
            setLang={setLang}
            perms={perms}
            setShowLegalPage={setShowLegalPage}
          />
        )}
        
        {page === 'equipment' && (
          <EquipmentPage 
            profile={profile}
            t={t}
            notify={notify}
            refresh={refresh}
            setPage={setPage}
            setSelectedRequest={setSelectedRequest}
            requests={requests}
            setPreviousPage={setPreviousPage}
          />
        )}
        
        {page === 'request-detail' && selectedRequest && (
          <RequestDetail 
            request={selectedRequest}
            profile={profile}
            t={t}
            setPage={setPage}
            notify={notify}
            refresh={refresh}
            previousPage={previousPage}
            perms={perms}
          />
        )}
        
        {page === 'device-history' && (
          <DeviceHistoryPage 
            profile={profile}
            requests={requests}
            t={t}
            setPage={setPage}
            setSelectedRequest={setSelectedRequest}
          />
        )}
        
        {page === 'my-orders' && (
          <MyOrdersPage 
            profile={profile}
            requests={requests}
            contracts={contracts}
            t={t}
            lang={lang}
            setPage={setPage}
            setSelectedRequest={setSelectedRequest}
            setPreviousPage={setPreviousPage}
            setPendingRentalId={setPendingRentalId}
            setPendingContractId={setPendingContractId}
            perms={perms}
          />
        )}

        {page === 'invoices' && perms.canInvoice && (
          <InvoicesPage 
            profile={profile}
            t={t}
            lang={lang}
            notify={notify}
            setUnseenInvoiceCount={setUnseenInvoiceCount}
          />
        )}

        {page === 'contracts' && (
          <ContractsPage 
            profile={profile}
            t={t}
            notify={notify}
            setPage={setPage}
            perms={perms}
            pendingContractId={pendingContractId}
            setPendingContractId={setPendingContractId}
          />
        )}
        
        {page === 'rentals' && (
          <RentalsPage 
            profile={profile}
            addresses={addresses}
            t={t}
            notify={notify}
            setPage={setPage}
            refresh={refresh}
            pendingRentalId={pendingRentalId}
            setPendingRentalId={setPendingRentalId}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-lg mb-3">LIGHTHOUSE FRANCE</h4>
              <p className="text-white/60 text-sm leading-relaxed">
                Filiale française de Lighthouse Worldwide Solutions, leader mondial des solutions de monitoring de contamination.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-3">Contact</h4>
              <p className="text-white/60 text-sm">16 Rue Paul Séjourné</p>
              <p className="text-white/60 text-sm">94000 Créteil, France</p>
              <p className="text-white/60 text-sm mt-2">Tél : +33 (0)1 43 77 28 07</p>
              <p className="text-white/60 text-sm">France@golighthouse.com</p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-3">Liens rapides</h4>
              <div className="space-y-2">
                <button onClick={() => setPage('dashboard')} className="block text-white/60 text-sm hover:text-[#00A651] transition-colors">Tableau de bord</button>
                <button onClick={() => setPage('my-orders')} className="block text-white/60 text-sm hover:text-[#00A651] transition-colors">Mes Commandes</button>
                <button onClick={() => setPage('invoices')} className="block text-white/60 text-sm hover:text-[#00A651] transition-colors">Factures</button>
                <a href="https://golighthouse.fr" target="_blank" rel="noopener noreferrer" className="block text-white/60 text-sm hover:text-[#00A651] transition-colors">Lighthouse France</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-white/40 text-sm">© {new Date().getFullYear()} Lighthouse France SAS. Tous droits réservés.</p>
            <div className="mt-2 flex justify-center gap-4">
              <button onClick={() => setShowLegalPage('mentions')} className="text-white/30 text-xs hover:text-white/60">Mentions légales</button>
              <span className="text-white/20">|</span>
              <button onClick={() => setShowLegalPage('privacy')} className="text-white/30 text-xs hover:text-white/60">Politique de confidentialité</button>
            </div>
          </div>
        </div>
      </footer>

      {!cookieConsent && (
        <CookieBanner onAccept={() => { setCookieConsent(true); try { localStorage.setItem('lhf_cookie_consent', 'accepted'); } catch {} }} onShowPolicy={() => setShowLegalPage('privacy')} />
      )}
      {showLegalPage && <LegalPageModal page={showLegalPage} onClose={() => setShowLegalPage(null)} />}
    </div>
  );
}

// ============================================
// DASHBOARD COMPONENT (Enhanced)
// ============================================
function Dashboard({ profile, requests, contracts, t, setPage, setSelectedRequest, setPreviousPage, setPendingRentalId, setPendingContractId, perms }) {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'service', 'parts', 'messages'
  const [deviceSearch, setDeviceSearch] = useState('');
  const [rentalActions, setRentalActions] = useState([]);
  const [rentalThreadData, setRentalThreadData] = useState([]);

  // Load messages + rental actions
  useEffect(() => {
    const loadMessages = async () => {
      if (!profile?.company_id) return;
      
      const requestIds = requests.map(r => r.id);
      
      // Load rental messages for this company (always)
      const { data: rentalMsgs } = await supabase
        .from('messages')
        .select('*, rental_requests!inner(company_id)')
        .eq('rental_requests.company_id', profile.company_id)
        .not('rental_request_id', 'is', null)
        .order('created_at', { ascending: false });

      if (requestIds.length === 0) {
        // Still load rental actions even with no requests
        const { data: rentalData } = await supabase
          .from('rental_requests')
          .select('id, rental_number, status, quote_total_ht, rental_request_items(item_name)')
          .eq('company_id', profile.company_id)
          .in('status', ['quote_sent']);
        if (rentalData) setRentalActions(rentalData);
        // Load rental thread data
        const { data: rentalAll } = await supabase
          .from('rental_requests')
          .select('id, rental_number, status, created_at, companies(name)')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });
        if (rentalAll) setRentalThreadData(rentalAll);
        const allMessages = rentalMsgs || [];
        setMessages(allMessages);
        setUnreadCount(allMessages.filter(m => !m.is_read && m.sender_id !== profile.id).length);
        return;
      }
      
      const { data } = await supabase
        .from('messages')
        .select('*')
        .in('request_id', requestIds)
        .order('created_at', { ascending: false });

      const allMessages = [...(data || []), ...(rentalMsgs || [])];
      setMessages(allMessages);
      setUnreadCount(allMessages.filter(m => !m.is_read && m.sender_id !== profile.id).length);
      
      // Load rental actions
      const { data: rentalData } = await supabase
        .from('rental_requests')
        .select('id, rental_number, status, quote_total_ht, rental_request_items(item_name)')
        .eq('company_id', profile.company_id)
        .in('status', ['quote_sent']);
      if (rentalData) setRentalActions(rentalData);

      // Load rental threads for messages tab
      const { data: rentalAll } = await supabase
        .from('rental_requests')
        .select('id, rental_number, status, created_at, companies(name)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      if (rentalAll) setRentalThreadData(rentalAll);
    };
    loadMessages();
  }, [profile, requests]);

  // Separate service requests from parts orders
  const serviceRequests = requests.filter(r => r.request_type !== 'parts');
  const partsOrders = requests.filter(r => r.request_type === 'parts');

  // Get all devices from service requests
  const allDevices = serviceRequests.flatMap(req => 
    (req.request_devices || []).map(dev => ({
      ...dev,
      request_number: req.request_number,
      request_id: req.id,
      request_status: req.status,
      request_date: req.created_at
    }))
  );

  // Stats
  const stats = [
    { 
      label: 'Demandes Service', 
      value: serviceRequests.filter(r => !['shipped', 'completed', 'delivered'].includes(r.status)).length,
      total: serviceRequests.length,
      color: 'bg-[#3B7AB4]',
      icon: '🔧',
      tab: 'service'
    },
    { 
      label: 'Commandes Pièces', 
      value: partsOrders.filter(r => !['shipped', 'completed', 'delivered'].includes(r.status)).length,
      total: partsOrders.length,
      color: 'bg-amber-500',
      icon: '📦',
      tab: 'parts'
    },
    { 
      label: 'Messages', 
      value: unreadCount,
      color: unreadCount > 0 ? 'bg-red-500' : 'bg-gray-400',
      icon: '💬',
      highlight: unreadCount > 0,
      tab: 'messages'
    }
  ];

  const viewRequest = (req) => {
    if (setPreviousPage) setPreviousPage('dashboard');
    setSelectedRequest(req);
    setPage('request-detail');
    // Scroll to top when opening detail page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const viewDeviceHistory = (serialNumber) => {
    setPage('device-history');
    sessionStorage.setItem('viewDeviceSerial', serialNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter by status
  const pendingService = serviceRequests.filter(r => ['submitted', 'waiting_approval'].includes(r.status));
  const inProgressService = serviceRequests.filter(r => !['submitted', 'waiting_approval', 'shipped', 'completed', 'delivered', 'repair_declined', 'cancelled'].includes(r.status));
  const completedService = serviceRequests.filter(r => ['shipped', 'completed', 'delivered'].includes(r.status));

  const pendingParts = partsOrders.filter(r => r.status === 'submitted');
  // All parts orders that are not completed/cancelled and not needing action (quote_sent without bc)
  const activePartsOrders = partsOrders.filter(r => 
    !['shipped', 'completed', 'delivered', 'cancelled'].includes(r.status) &&
    !(r.status === 'quote_sent' && !r.bc_submitted_at)
  );
  const completedParts = partsOrders.filter(r => ['shipped', 'completed', 'delivered'].includes(r.status));
  const partsNeedingAction = partsOrders.filter(r => r.status === 'quote_sent' && !r.bc_submitted_at);

  return (
    <div>
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Bonjour, {profile?.full_name?.split(' ')[0] || 'Client'}</h1>
          <p className="text-gray-600">Bienvenue sur votre espace client Lighthouse France</p>
        </div>
        {perms?.canRequest && (
        <button 
          onClick={() => setPage('new-request')}
          className="px-6 py-3 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F] transition-colors"
        >
          + Nouvelle Demande
        </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className={`bg-white rounded-lg p-4 shadow-sm border ${stat.highlight ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'} cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => stat.tab && setActiveTab(stat.tab)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                  {stat.total !== undefined && <span className="text-sm text-gray-400 font-normal">/{stat.total}</span>}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
        {[
          { id: 'overview', label: 'Aperçu', icon: '📋' },
          { id: 'service', label: 'Demandes Service', icon: '🔧', badge: pendingService.length },
          { id: 'parts', label: 'Commandes Pièces', icon: '📦', badge: pendingParts.length },
          { id: 'messages', label: 'Messages', icon: '💬', badge: unreadCount }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-[#3B7AB4] shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.badge > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* ACTION REQUIRED - Combined RMA, Parts Orders, and Contracts */}
          {(serviceRequests.filter(r => 
            // Regular action needed
            (['approved', 'waiting_bc', 'waiting_po', 'waiting_customer', 'inspection_complete', 'quote_sent'].includes(r.status) && r.status !== 'bc_review' && !r.bc_submitted_at) ||
            // Supplement pending - needs customer action
            (r.avenant_sent_at && r.avenant_total > 0 && !r.avenant_approved_at) ||
            // Device received but BC not approved
            (!r.bc_approved_at && !r.bc_submitted_at && r.received_at)
          ).length > 0 || 
            partsNeedingAction.length > 0 ||
            (contracts && contracts.filter(c => c.status === 'quote_sent' || c.status === 'bc_rejected').length > 0) ||
            rentalActions.length > 0) && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <span className="animate-pulse">⚠</span> Action requise
              </h3>
              <p className="text-sm text-red-600 mb-3">Les demandes suivantes nécessitent votre attention</p>
              {!perms?.canRequest && (
                <p className="text-xs text-red-400 mb-3 italic">🔒 Contactez votre administrateur pour approuver ces demandes</p>
              )}
              <div className="space-y-2">
                {/* All action items combined and sorted newest first */}
                {(() => {
                  const actionItems = [];
                  // RMA Requests
                  serviceRequests
                    .filter(r => ['approved', 'waiting_bc', 'waiting_po', 'waiting_customer', 'inspection_complete', 'quote_sent'].includes(r.status) && r.status !== 'bc_review' && !r.bc_submitted_at)
                    .forEach(req => actionItems.push({
                      key: req.id, type: 'rma', sortDate: req.quoted_at || req.updated_at || req.created_at,
                      onClick: () => viewRequest(req),
                      icon: null,
                      number: req.request_number || 'En attente',
                      label: req.status === 'approved' || req.status === 'waiting_bc' || req.status === 'waiting_po' 
                        ? 'Soumettre bon de commande' 
                        : req.status === 'inspection_complete' || req.status === 'quote_sent'
                        ? 'Approuver le devis'
                        : 'Action requise'
                    }));
                  // Device received but no BC
                  serviceRequests
                    .filter(r => !r.bc_approved_at && !r.bc_submitted_at && r.received_at &&
                      !['approved', 'waiting_bc', 'waiting_po', 'waiting_customer', 'inspection_complete', 'quote_sent'].includes(r.status))
                    .forEach(req => actionItems.push({
                      key: 'nobc-' + req.id, type: 'rma_urgent', sortDate: req.received_at || req.updated_at || req.created_at,
                      onClick: () => viewRequest(req),
                      icon: null, pulse: true,
                      number: req.request_number,
                      label: '⚠️ Appareil reçu — Approbation requise'
                    }));
                  // Supplement Pending
                  serviceRequests
                    .filter(r => r.avenant_sent_at && r.avenant_total > 0 && !r.avenant_approved_at && !r.avenant_bc_submitted_at &&
                      !(['approved', 'waiting_bc', 'waiting_po', 'waiting_customer', 'inspection_complete', 'quote_sent'].includes(r.status) && !r.bc_submitted_at))
                    .forEach(req => actionItems.push({
                      key: `sup-${req.id}`, type: 'supplement', sortDate: req.avenant_sent_at || req.updated_at,
                      onClick: () => viewRequest(req),
                      icon: '⚠️',
                      number: req.request_number,
                      label: `Travaux supplémentaires - Action requise (${req.avenant_total?.toFixed(2)} €)`
                    }));
                  // Parts Orders
                  partsNeedingAction.forEach(req => actionItems.push({
                    key: req.id, type: 'parts', sortDate: req.quoted_at || req.updated_at || req.created_at,
                    onClick: () => viewRequest(req),
                    icon: '📦',
                    number: req.request_number || 'En attente',
                    label: 'Approuver le devis pièces'
                  }));
                  // Contract Quotes
                  if (perms?.canInvoice && contracts) {
                    contracts.filter(c => c.status === 'quote_sent' || c.status === 'bc_rejected')
                      .forEach(contract => actionItems.push({
                        key: contract.id, type: 'contract', sortDate: contract.quote_sent_at || contract.updated_at || contract.created_at,
                        onClick: () => { if (setPendingContractId) setPendingContractId(contract.id); setPage('contracts'); },
                        icon: '📋',
                        number: contract.contract_number || 'Nouveau Contrat',
                        label: contract.status === 'quote_sent' ? 'Approuver le devis contrat' : 'Resoumettre BC contrat'
                      }));
                  }
                  // Rental Quotes
                  rentalActions.forEach(rental => actionItems.push({
                    key: rental.id, type: 'rental', sortDate: rental.quote_sent_at || rental.updated_at || rental.created_at,
                    onClick: () => { if (setPendingRentalId) setPendingRentalId(rental.id); setPage('rentals'); },
                    icon: '📦',
                    number: rental.rental_number,
                    label: 'Approuver le devis location'
                  }));
                  // Sort newest first
                  actionItems.sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));
                  return actionItems.map(item => (
                    <div 
                      key={item.key}
                      onClick={item.onClick}
                      className="flex justify-between items-center p-3 bg-white rounded-lg cursor-pointer hover:bg-red-100 border border-red-200"
                    >
                      <div className="flex items-center gap-3">
                        {item.icon && <span>{item.icon}</span>}
                        <span className="font-mono font-bold text-red-700">{item.number}</span>
                        <span className="text-sm text-red-600">{item.label}</span>
                      </div>
                      <span className={`px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full ${item.pulse ? 'animate-pulse' : ''}`}>
                        Agir →
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Pending Service Requests */}
          {pendingService.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
              <h3 className="font-bold text-amber-800 mb-2">⏳ En attente de création RMA</h3>
              <p className="text-xs text-amber-600 mb-3">Ces demandes sont en cours de traitement par notre équipe</p>
              <div className="space-y-2">
                {pendingService.map(req => (
                  <div 
                    key={req.id}
                    onClick={() => viewRequest(req)}
                    className="flex justify-between items-center p-2 bg-white rounded cursor-pointer hover:bg-amber-100"
                  >
                    <div>
                      <span className="font-medium text-amber-700">En attente</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {req.request_devices?.length || 0} appareil(s)
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(req.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* In Progress Service */}
          {inProgressService.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-[#1E3A5F] text-lg">🔧 Service en cours</h2>
                <span className="text-sm text-gray-500">{inProgressService.length} demande(s)</span>
              </div>
              <div className="divide-y divide-gray-100">
                {inProgressService.slice(0, 5).map(req => {
                  const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
                  const needsAction = ['approved', 'waiting_bc', 'waiting_po', 'waiting_customer', 'inspection_complete', 'quote_sent'].includes(req.status);
                  const hasSupplementPending = req.avenant_sent_at && req.avenant_total > 0 && !req.avenant_approved_at;
                  const supplementNeedsAction = hasSupplementPending && !req.avenant_bc_submitted_at;
                  const supplementUnderReview = hasSupplementPending && req.avenant_bc_submitted_at;
                  return (
                    <div 
                      key={req.id}
                      onClick={() => viewRequest(req)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${(needsAction || supplementNeedsAction) ? 'bg-red-50/50' : ''}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[#3B7AB4]">{req.request_number || 'En attente'}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                          {needsAction && (
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                              ⚠ Action requise
                            </span>
                          )}
                          {supplementNeedsAction && !needsAction && (
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                              ⚠️ Travaux supplémentaires - Action requise
                            </span>
                          )}
                          {supplementUnderReview && !needsAction && (
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">
                              📄 BC Supplément en vérification
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {req.request_devices?.length || 0} appareil(s)
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(req.request_devices || []).slice(0, 3).map((dev, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded inline-flex items-center gap-1">
                            {getDeviceImageUrl(dev.model_name) && <img src={getDeviceImageUrl(dev.model_name)} alt="" className="w-4 h-4 object-contain" />}
                            {dev.model_name} - {dev.serial_number}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {inProgressService.length > 5 && (
                <div className="px-6 py-3 bg-gray-50 text-center">
                  <button onClick={() => setActiveTab('service')} className="text-[#3B7AB4] text-sm font-medium">
                    Voir toutes les demandes service →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Parts Orders - All active (not completed, not needing action) */}
          {activePartsOrders.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-[#1E3A5F] text-lg">📦 Commandes pièces</h2>
                <span className="text-sm text-gray-500">{activePartsOrders.length} commande(s)</span>
              </div>
              <div className="divide-y divide-gray-100">
                {activePartsOrders.slice(0, 5).map(req => {
                  const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
                  return (
                    <div 
                      key={req.id}
                      onClick={() => viewRequest(req)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-amber-600">{req.request_number || 'En attente'}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(req.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">{req.problem_description}</p>
                    </div>
                  );
                })}
              </div>
              {activePartsOrders.length > 5 && (
                <div className="px-6 py-3 bg-gray-50 text-center">
                  <button onClick={() => setActiveTab('parts')} className="text-amber-600 text-sm font-medium">
                    Voir toutes les commandes pièces →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {requests.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-500 mb-4">Aucune demande pour le moment</p>
              {perms?.canRequest && (
              <button 
                onClick={() => setPage('new-request')}
                className="px-6 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium"
              >
                Soumettre votre première demande
              </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Service Requests Tab */}
      {activeTab === 'service' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-[#1E3A5F] text-lg">Demandes de Service (Étalonnage / Réparation)</h2>
            <p className="text-sm text-gray-500">{serviceRequests.length} demande(s) au total</p>
          </div>
          
          {serviceRequests.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🔧</p>
              <p className="text-gray-500 mb-4">Aucune demande de service</p>
              {perms?.canRequest && (
              <button 
                onClick={() => setPage('new-request')}
                className="px-6 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium"
              >
                Soumettre une demande
              </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {serviceRequests.map(req => {
                const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
                return (
                  <div 
                    key={req.id}
                    onClick={() => viewRequest(req)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[#3B7AB4]">{req.request_number}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(req.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(req.request_devices || []).map((dev, i) => (
                        <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded inline-flex items-center gap-1">
                          {getDeviceImageUrl(dev.model_name) && <img src={getDeviceImageUrl(dev.model_name)} alt="" className="w-4 h-4 object-contain" />}
                          {dev.model_name} - {dev.serial_number}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Parts Orders Tab */}
      {activeTab === 'parts' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-[#1E3A5F] text-lg">Commandes de Pièces</h2>
            <p className="text-sm text-gray-500">{partsOrders.length} commande(s) au total</p>
          </div>
          
          {partsOrders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-500 mb-4">Aucune commande de pièces</p>
              {perms?.canRequest && (
              <button 
                onClick={() => setPage('new-request')}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium"
              >
                Commander des pièces
              </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {partsOrders.map(req => {
                const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
                return (
                  <div 
                    key={req.id}
                    onClick={() => viewRequest(req)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-amber-600">
                          {req.request_number || 'En attente'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(req.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{req.problem_description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Devices Tab - Keep existing */}
      {activeTab === 'devices' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-[#1E3A5F] text-lg">Suivi de vos appareils</h2>
                <p className="text-sm text-gray-500">Tous les appareils que vous avez envoyés en service</p>
              </div>
            </div>
            {/* Search bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Rechercher par N° de série, modèle..."
                value={deviceSearch || ''}
                onChange={e => setDeviceSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7AB4] text-sm"
              />
              {deviceSearch && (
                <button 
                  onClick={() => setDeviceSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >✕</button>
              )}
            </div>
          </div>
          
          {(() => {
            const searchTerm = (deviceSearch || '').toLowerCase().trim();
            const filteredDevices = searchTerm 
              ? allDevices.filter(d => 
                  d.serial_number?.toLowerCase().includes(searchTerm) ||
                  d.model_name?.toLowerCase().includes(searchTerm) ||
                  d.request_number?.toLowerCase().includes(searchTerm)
                )
              : allDevices;
            
            return filteredDevices.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-4xl mb-3">{searchTerm ? '🔍' : '🔧'}</p>
                <p className="text-gray-500">{searchTerm ? `Aucun appareil trouvé pour "${deviceSearch}"` : 'Aucun appareil en cours de traitement'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Appareil</th>
                      <th className="px-4 py-3 font-medium">N° Série</th>
                      <th className="px-4 py-3 font-medium">Demande</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDevices.map((dev, i) => {
                      const status = dev.status || dev.request_status || 'pending';
                      const style = STATUS_STYLES[status] || STATUS_STYLES.submitted;
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-[#1E3A5F]">
                            <div className="flex items-center gap-2">
                              {getDeviceImageUrl(dev.model_name) && (
                                <img src={getDeviceImageUrl(dev.model_name)} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
                              )}
                              {dev.model_name || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">{dev.serial_number}</td>
                          <td className="px-4 py-3">
                            <span className="text-[#3B7AB4] font-mono text-sm">{dev.request_number}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(dev.request_date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3">
                            <button 
                              onClick={() => viewDeviceHistory(dev.serial_number)}
                              className="text-[#3B7AB4] text-sm hover:underline"
                            >
                              Historique →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {searchTerm && (
                  <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
                    {filteredDevices.length} résultat(s) pour "{deviceSearch}"
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <MessagesPanel 
          messages={messages} 
          requests={requests} 
          profile={profile} 
          setMessages={setMessages}
          setUnreadCount={setUnreadCount}
          rentalThreadData={rentalThreadData}
        />
      )}
    </div>
  );
}

// ============================================
// MESSAGES PANEL COMPONENT
// ============================================
function MessagesPanel({ messages, requests, profile, setMessages, setUnreadCount, rentalThreadData = [] }) {
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Group messages by request (RMA + Parts)
  const serviceThreads = requests.map(req => {
    const reqMessages = messages.filter(m => m.request_id === req.id);
    const unread = reqMessages.filter(m => !m.is_read && m.sender_id !== profile.id).length;
    const lastMessage = reqMessages[0];
    return {
      request: req,
      _type: req.request_type === 'parts' ? 'parts' : 'rma',
      messages: reqMessages,
      unreadCount: unread,
      lastMessage
    };
  }).filter(t => t.messages.length > 0 || t.request.status !== 'completed');

  // Rental threads
  const rentalThreads = rentalThreadData.map(rental => {
    const rMsgs = messages.filter(m => m.rental_request_id === rental.id);
    const unread = rMsgs.filter(m => !m.is_read && m.sender_id !== profile.id).length;
    const lastMessage = rMsgs[0];
    return {
      request: { ...rental, request_number: rental.rental_number, id: rental.id },
      _type: 'rental',
      _rentalId: rental.id,
      messages: rMsgs,
      unreadCount: unread,
      lastMessage
    };
  }).filter(t => t.messages.length > 0);

  const messagesByRequest = [...serviceThreads, ...rentalThreads]
    .sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      const dateA = a.lastMessage?.created_at || a.request.created_at;
      const dateB = b.lastMessage?.created_at || b.request.created_at;
      return new Date(dateB) - new Date(dateA);
    });

  const markAsRead = async (thread) => {
    const threadId = thread._rentalId || thread.request?.id;
    const isRental = thread._type === 'rental';
    const unreadMessages = messages.filter(m => {
      const matchesThread = isRental ? m.rental_request_id === threadId : m.request_id === threadId;
      return matchesThread && !m.is_read && m.sender_id !== profile.id;
    });
    
    if (unreadMessages.length === 0) return;
    
    for (const msg of unreadMessages) {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', msg.id);
    }
    
    // Update local state
    setMessages(messages.map(m => 
      unreadMessages.find(um => um.id === m.id) 
        ? { ...m, is_read: true } 
        : m
    ));
    setUnreadCount(prev => Math.max(0, prev - unreadMessages.length));
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedThread) return;
    
    setSending(true);
    try {
      const insertData = {
        sender_id: profile.id,
        sender_type: 'customer',
        sender_name: profile.full_name || 'Client',
        content: newMessage.trim()
      };
      if (selectedThread._type === 'rental') {
        insertData.rental_request_id = selectedThread._rentalId || selectedThread.request.id;
      } else {
        insertData.request_id = selectedThread.request.id;
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single();
      
      if (!error && data) {
        setMessages(prevMessages => [data, ...prevMessages]);
        setNewMessage('');
        setTimeout(scrollToBottom, 100);
      } else if (error) {
        console.error('Message send error:', error);
        alert('Erreur envoi: ' + (error.message || error.details || JSON.stringify(error)));
      }
    } catch (err) {
      console.error('Message send exception:', err);
      alert('Erreur: ' + err.message);
    }
    setSending(false);
  };

  const openThread = (thread) => {
    setSelectedThread(thread);
    markAsRead(thread);
    setTimeout(scrollToBottom, 100);
  };

  // Scroll to bottom when selected thread changes
  useEffect(() => {
    if (selectedThread) {
      setTimeout(scrollToBottom, 100);
    }
  }, [selectedThread?.request.id]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="grid md:grid-cols-3 h-[600px]">
        {/* Thread List */}
        <div className="border-r border-gray-100 overflow-y-auto">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 sticky top-0">
            <h3 className="font-bold text-[#1E3A5F]">Conversations</h3>
          </div>
          
          {messagesByRequest.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-sm">Aucune conversation</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {messagesByRequest.map(thread => {
                const threadKey = `${thread._type || 'rma'}-${thread.request.id}`;
                const selectedKey = selectedThread ? `${selectedThread._type || 'rma'}-${selectedThread.request.id}` : null;
                const typeIcon = thread._type === 'rental' ? '📅' : thread._type === 'parts' ? '🔩' : '🔧';
                return (
                <div
                  key={threadKey}
                  onClick={() => openThread(thread)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedKey === threadKey
                      ? 'bg-[#E8F2F8]' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono font-medium text-[#3B7AB4] text-sm">
                      {typeIcon} {thread.request.request_number}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  {thread.lastMessage && (
                    <p className="text-sm text-gray-600 truncate">
                      {thread.lastMessage.content}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {thread.lastMessage 
                      ? new Date(thread.lastMessage.created_at).toLocaleDateString('fr-FR')
                      : 'Pas de messages'
                    }
                  </p>
                </div>
              );})}
            </div>
          )}
        </div>

        {/* Message Thread */}
        <div className="md:col-span-2 flex flex-col h-full overflow-hidden">
          {selectedThread ? (
            (() => {
              // Get current messages for selected thread from state (not from cached selectedThread)
              const currentMessages = selectedThread._type === 'rental'
                ? messages.filter(m => m.rental_request_id === (selectedThread._rentalId || selectedThread.request.id))
                : messages.filter(m => m.request_id === selectedThread.request.id);
              return (
                <>
                  {/* Thread Header */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                    <h3 className="font-bold text-[#1E3A5F]">
                      {selectedThread._type === 'rental' ? '📅 Location' : selectedThread._type === 'parts' ? '🔩 Commande Pièces' : '🔧 Demande'} {selectedThread.request.request_number}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedThread.request.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  {/* Messages - scrollable area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                    {currentMessages.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <p>Aucun message pour cette demande</p>
                        <p className="text-sm">Envoyez un message pour démarrer la conversation</p>
                      </div>
                    ) : (
                      [...currentMessages].reverse().map(msg => {
                        const isMe = msg.sender_id === profile.id;
                        return (
                          <div 
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] rounded-lg p-3 ${
                              isMe 
                                ? 'bg-[#3B7AB4] text-white' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              <div className={`text-xs mb-1 font-medium ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
                                {isMe ? 'Vous' : (msg.sender_name || 'Lighthouse France')}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              {msg.attachment_url && (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`text-xs mt-2 block ${isMe ? 'text-white/80 hover:text-white' : 'text-blue-600 hover:underline'}`}>
                                  📎 {msg.attachment_name || 'Télécharger le fichier'}
                                </a>
                              )}
                              <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                {new Date(msg.created_at).toLocaleString('fr-FR', {
                                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} />
                  </div>

              {/* Message Input - fixed at bottom */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex-shrink-0 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7AB4]"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {sending ? '...' : 'Envoyer'}
                  </button>
                </div>
              </form>
            </>
              );
            })()
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-4xl mb-2">💬</p>
                <p>Sélectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// NEW REQUEST FORM - Type Selection First
// ============================================
function NewRequestForm({ profile, addresses, t, notify, refresh, setPage }) {
  const [requestType, setRequestType] = useState(null); // 'service', 'parts', 'contract', or 'rental'
  
  // If no type selected, show selection screen
  if (!requestType) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Nouvelle Demande</h1>
        <p className="text-gray-600 mb-8">Quel type de demande souhaitez-vous soumettre?</p>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Service Request */}
          <button
            onClick={() => setRequestType('service')}
            className="bg-white rounded-xl p-8 shadow-sm border-2 border-gray-200 hover:border-[#3B7AB4] hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-3xl group-hover:bg-blue-100 transition-colors">🔧</div>
              <h2 className="text-xl font-bold text-[#1E3A5F] group-hover:text-[#3B7AB4]">
                Étalonnage / Réparation
              </h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Soumettez une demande de calibration, réparation ou maintenance pour vos compteurs de particules et instruments de mesure. Nous vous enverrons un devis détaillé avant toute intervention.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Calibration ISO 21501-4</span>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Réparation</span>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Maintenance préventive</span>
            </div>
          </button>
          
          {/* Parts Order */}
          <button
            onClick={() => setRequestType('parts')}
            className="bg-white rounded-xl p-8 shadow-sm border-2 border-gray-200 hover:border-[#F59E0B] hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center text-3xl group-hover:bg-amber-100 transition-colors">📦</div>
              <h2 className="text-xl font-bold text-[#1E3A5F] group-hover:text-[#F59E0B]">
                Commande de Pièces
              </h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Commandez des pièces de rechange, consommables ou accessoires pour vos équipements Lighthouse. Filtres, sondes, câbles, batteries et plus encore.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full">Pièces détachées</span>
              <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full">Consommables</span>
              <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full">Accessoires</span>
            </div>
          </button>
          
          {/* Contract Request */}
          <button
            onClick={() => setRequestType('contract')}
            className="bg-white rounded-xl p-8 shadow-sm border-2 border-gray-200 hover:border-[#00A651] hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center text-3xl group-hover:bg-green-100 transition-colors">📋</div>
              <h2 className="text-xl font-bold text-[#1E3A5F] group-hover:text-[#00A651]">
                Contrat d'Étalonnage
              </h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Souscrivez un contrat annuel de calibration pour l'ensemble de votre parc d'appareils. Bénéficiez de tarifs préférentiels, d'un suivi prioritaire et d'une planification simplifiée.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">Tarifs réduits</span>
              <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">Suivi prioritaire</span>
              <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">Planification annuelle</span>
            </div>
          </button>
          
          {/* Rental Request */}
          <button
            onClick={() => setRequestType('rental')}
            className="bg-white rounded-xl p-8 shadow-sm border-2 border-gray-200 hover:border-[#8B5CF6] hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center text-3xl group-hover:bg-purple-100 transition-colors">📅</div>
              <h2 className="text-xl font-bold text-[#1E3A5F] group-hover:text-[#8B5CF6]">
                Location d'Équipement
              </h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Louez des compteurs de particules pour vos qualifications de salles propres, audits ponctuels ou besoins temporaires. Appareils livrés calibrés et prêts à l'emploi.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full">Location courte durée</span>
              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full">Appareils calibrés</span>
              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full">Livraison incluse</span>
            </div>
          </button>
        </div>
        
        <button
          onClick={() => setPage('dashboard')}
          className="mt-8 text-gray-500 hover:text-gray-700"
        >
          ← Retour au tableau de bord
        </button>
      </div>
    );
  }
  
  // Show appropriate form based on type
  if (requestType === 'parts') {
    return (
      <PartsOrderForm 
        profile={profile}
        addresses={addresses}
        t={t}
        notify={notify}
        refresh={refresh}
        setPage={setPage}
        goBack={() => setRequestType(null)}
      />
    );
  }
  
  if (requestType === 'contract') {
    return (
      <ContractRequestForm 
        profile={profile}
        addresses={addresses}
        t={t}
        notify={notify}
        refresh={refresh}
        setPage={setPage}
        goBack={() => setRequestType(null)}
      />
    );
  }
  
  if (requestType === 'rental') {
    // Navigate to rentals page with new rental form
    setPage('rentals');
    return null;
  }
  
  return (
    <ServiceRequestForm
      profile={profile}
      addresses={addresses}
      t={t}
      notify={notify}
      refresh={refresh}
      setPage={setPage}
      goBack={() => setRequestType(null)}
    />
  );
}

// ============================================
// SERVICE REQUEST FORM (Cal/Rep)
// ============================================
function ServiceRequestForm({ profile, addresses, t, notify, refresh, setPage, goBack }) {
  const [devices, setDevices] = useState([createNewDevice(1)]);
  const [savedEquipment, setSavedEquipment] = useState([]);
  const billingAddresses = addresses.filter(a => a.is_billing);
  const shippingAddresses = addresses.filter(a => !a.is_billing);
  const [billingAddressId, setBillingAddressId] = useState(billingAddresses[0]?.id || '');
  const [showNewBillingForm, setShowNewBillingForm] = useState(false);
  const [newBillingAddress, setNewBillingAddress] = useState({ label: '', company_name: '', address_line1: '', city: '', postal_code: '', country: 'France', attention: '', phone: '', siret: '', tva_number: '', chorus_invoicing: false, chorus_service_code: '' });
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [shipping, setShipping] = useState({ 
    address_id: shippingAddresses.find(a => a.is_default)?.id || '',
    showNewForm: false,
    newAddress: { label: '', company_name: '', attention: '', address_line1: '', city: '', postal_code: '', country: 'France', phone: '' },
    parcels: 0,
    return_shipping: 'standard' // 'standard', 'own_label', 'pickup'
  });
  const [saving, setSaving] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // Get selected billing address for SIRET/TVA/Chorus display
  const selectedBillingAddr = showNewBillingForm ? newBillingAddress : billingAddresses.find(a => a.id === billingAddressId);
  
  // Detect if return address is outside metropolitan France → disable standard return
  const returnPostalCode = shippingSameAsBilling 
    ? (selectedBillingAddr?.postal_code || '')
    : (shipping.showNewForm ? shipping.newAddress.postal_code : (shippingAddresses.find(a => a.id === shipping.address_id)?.postal_code || ''));
  const isReturnNonMetro = returnPostalCode ? !isFranceMetropolitan(returnPostalCode) : false;
  
  // Auto-switch away from standard if address is non-metro
  useEffect(() => {
    if (isReturnNonMetro && (shipping.return_shipping === 'standard' || !shipping.return_shipping)) {
      setShipping(prev => ({ ...prev, return_shipping: 'own_label' }));
    }
  }, [isReturnNonMetro]);

  // Detect if ANY device has a per-device return address → force standard shipping
  const hasPerDeviceAddress = devices.some(d => d.shipping_address_id);
  
  // Auto-switch to standard if a per-device address is set (own_label/pickup don't make sense)
  useEffect(() => {
    if (hasPerDeviceAddress && shipping.return_shipping !== 'standard') {
      setShipping(prev => ({ ...prev, return_shipping: 'standard' }));
    }
  }, [hasPerDeviceAddress]);

  // Load saved equipment on mount
  useEffect(() => {
    const loadEquipment = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', profile.company_id)
        .or('hidden_by_customer.is.null,hidden_by_customer.eq.false')
        .order('created_at', { ascending: false });
      if (data) setSavedEquipment(data);
    };
    loadEquipment();
  }, [profile?.company_id]);

  function createNewDevice(num) {
    return {
      id: `device_${Date.now()}_${num}`,
      num,
      device_type: '', // particle_counter, bio_collector, liquid_counter, temp_humidity, other
      brand: 'Lighthouse',
      brand_other: '',
      nickname: '',
      model: '',
      serial_number: '',
      service_type: '',
      service_other: '',
      notes: '',
      accessories: [],
      other_accessories: '',
      saveDevice: false, // Option to save this device
      fromSaved: null, // ID if loaded from saved
      shipping_address_id: null, // Per-device return address (null = use default)
      custom_shipping_address: null // Inline new address for this device
    };
  }

  // Load from saved equipment
  const loadFromSaved = (deviceId, equipmentId) => {
    const equip = savedEquipment.find(e => e.id === equipmentId);
    if (!equip) return;
    
    setDevices(devices.map(d => {
      if (d.id !== deviceId) return d;
      return {
        ...d,
        brand: equip.brand || 'Lighthouse',
        brand_other: equip.brand_other || '',
        nickname: equip.nickname || '',
        model: equip.model_name || '',
        serial_number: equip.serial_number || '',
        device_type: equip.equipment_type || '',
        fromSaved: equipmentId,
        saveDevice: false // Already saved
      };
    }));
  };

  const addDevice = () => {
    setDevices([...devices, createNewDevice(devices.length + 1)]);
  };

  const removeDevice = (id) => {
    if (devices.length === 1) return;
    setDevices(devices.filter(d => d.id !== id).map((d, i) => ({ ...d, num: i + 1 })));
  };

  const updateDevice = (id, field, value) => {
    setDevices(devices.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const updateDeviceMultiple = (id, updates) => {
    setDevices(devices.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const toggleAccessory = (deviceId, accessory) => {
    setDevices(devices.map(d => {
      if (d.id !== deviceId) return d;
      const acc = d.accessories.includes(accessory)
        ? d.accessories.filter(a => a !== accessory)
        : [...d.accessories, accessory];
      return { ...d, accessories: acc };
    }));
  };

  // Save new address
  const saveNewAddress = async () => {
    const addr = shipping.newAddress;
    if (!addr.company_name || !addr.address_line1 || !addr.attention || !addr.phone || !addr.city || !addr.postal_code) {
      notify('Veuillez remplir tous les champs obligatoires de l\'adresse', 'error');
      return null;
    }
    
    const { data, error } = await supabase.from('shipping_addresses').insert({
      company_id: profile.company_id,
      label: addr.label || addr.company_name,
      company_name: addr.company_name,
      attention: addr.attention,
      phone: addr.phone,
      address_line1: addr.address_line1,
      city: addr.city,
      postal_code: addr.postal_code,
      country: addr.country || 'France',
      is_default: false
    }).select().single();
    
    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
      return null;
    }
    
    notify('Adresse enregistrée!');
    refresh();
    return data.id;
  };

  const openReview = (e) => {
    e.preventDefault();
    
    // Validate devices
    for (const d of devices) {
      if (!d.device_type || !d.model || !d.serial_number || !d.service_type) {
        notify('Veuillez remplir tous les champs obligatoires pour chaque appareil (type, modèle, n° série, service)', 'error');
        return;
      }
      const needsNotes = d.service_type === 'repair' || d.service_type === 'calibration_repair' || d.service_type === 'other';
      if (needsNotes && !d.notes) {
        notify('Veuillez décrire le problème ou la demande dans les notes pour les réparations', 'error');
        return;
      }
      if (d.brand === 'other' && !d.brand_other) {
        notify('Veuillez préciser la marque', 'error');
        return;
      }
      if (d.service_type === 'other' && !d.service_other) {
        notify('Veuillez préciser le type de service', 'error');
        return;
      }
    }

    // Validate address (only needed for standard return)
    const isStandardReturn = shipping.return_shipping === 'standard' || !shipping.return_shipping;
    if (isStandardReturn && !shippingSameAsBilling && !shipping.showNewForm && !shipping.address_id) {
      notify('Veuillez sélectionner ou ajouter une adresse de retour', 'error');
      return;
    }
    
    // Validate parcels (only for standard shipping)
    if (isStandardReturn && (!shipping.parcels || shipping.parcels < 1)) {
      notify('Veuillez indiquer le nombre de colis', 'error');
      return;
    }

    // Validate billing address
    if (!billingAddressId && !showNewBillingForm) {
      notify('Veuillez sélectionner une adresse de facturation', 'error');
      return;
    }

    // Validate Chorus fields on selected billing address
    if (selectedBillingAddr?.chorus_invoicing) {
      if (!selectedBillingAddr.siret) {
        notify('Le numéro SIRET est requis sur l\'adresse de facturation pour Chorus Pro.', 'error');
        return;
      }
      if (!selectedBillingAddr.chorus_service_code?.trim()) {
        notify('Le numéro de service Chorus Pro est requis sur l\'adresse de facturation.', 'error');
        return;
      }
    }

    setShowReviewModal(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    setSaving(true);
    
    try {
      // Handle billing address first
      let finalBillingAddressId = billingAddressId || null;
      if (showNewBillingForm) {
        const ba = newBillingAddress;
        if (!ba.label || !ba.company_name || !ba.attention || !ba.address_line1 || !ba.postal_code || !ba.city) {
          notify('Veuillez remplir les champs obligatoires de la nouvelle adresse de facturation', 'error');
          setSaving(false);
          return;
        }
        const { data: baData, error: baErr } = await supabase.from('shipping_addresses').insert({
          ...ba, company_id: profile.company_id, is_billing: true, is_default: false
        }).select().single();
        if (baErr) {
          notify("Erreur lors de la création de l'adresse de facturation", 'error');
          setSaving(false);
          return;
        }
        finalBillingAddressId = baData.id;
      }

      // Handle shipping/return address
      const isStandardReturn = shipping.return_shipping === 'standard' || !shipping.return_shipping;
      let addressId = null;
      if (isStandardReturn) {
        // Standard return needs a return address
        if (shippingSameAsBilling) {
          addressId = finalBillingAddressId;
        } else if (shipping.showNewForm) {
          addressId = await saveNewAddress();
          if (!addressId) { setSaving(false); return; }
        } else {
          addressId = shipping.address_id;
        }
      } else {
        // Non-standard (own_label/pickup) — no return address needed, use billing as fallback
        addressId = finalBillingAddressId;
      }

      // Get SIRET/TVA/Chorus from billing address
      const billingAddr = showNewBillingForm ? newBillingAddress : billingAddresses.find(a => a.id === finalBillingAddressId);

      // No number assigned yet - will get FR-XXXXX after approval
      const { data: request, error: reqErr } = await supabase
        .from('service_requests')
        .insert({
          request_number: null,
          company_id: profile.company_id,
          submitted_by: profile.id,
          request_type: 'service',
          serial_number: devices[0].serial_number,
          equipment_type: 'particle_counter',
          requested_service: devices[0].service_type === 'other' ? devices[0].service_other : devices[0].service_type,
          problem_description: devices.map(d => `[${d.brand === 'other' ? d.brand_other : 'Lighthouse'}] ${d.model} - ${d.serial_number}\nService: ${d.service_type === 'other' ? d.service_other : d.service_type}\nAccessoires: ${d.accessories.join(', ') || 'Aucun'}\nNotes: ${d.notes}`).join('\n\n---\n\n') + (shipping.return_shipping !== 'standard' ? `\n\n--- RETOUR ---\n${shipping.return_shipping === 'own_label' ? '⚠️ Le client fournira sa propre étiquette de retour' : '⚠️ Le client récupérera l\'appareil lui-même'}` : ''),
          urgency: 'normal',
          shipping_address_id: addressId,
          billing_address_id: finalBillingAddressId,
          billing_siret: billingAddr?.siret || null,
          billing_tva: billingAddr?.tva_number || null,
          parcels_count: shipping.return_shipping === 'standard' ? (shipping.parcels || 1) : 0,
          return_shipping: shipping.return_shipping || 'standard',
          chorus_invoicing: billingAddr?.chorus_invoicing || false,
          chorus_service_code: billingAddr?.chorus_invoicing ? (billingAddr?.chorus_service_code || null) : null,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (reqErr) throw reqErr;

      // Save devices with full details
      for (const d of devices) {
        // Handle per-device custom shipping address
        let deviceAddressId = d.shipping_address_id || null;
        if (d.shipping_address_id === 'new' && d.custom_shipping_address) {
          const ca = d.custom_shipping_address;
          if (!ca.company_name || !ca.attention || !ca.address_line1 || !ca.postal_code || !ca.city || !ca.phone) {
            notify(`Veuillez remplir tous les champs obligatoires de l'adresse pour l'appareil ${d.model || d.serial_number}`, 'error');
            setSaving(false);
            return;
          }
          const { data: newAddr, error: addrErr } = await supabase.from('shipping_addresses').insert({
            company_id: profile.company_id,
            label: `${ca.company_name} - ${ca.city}`,
            company_name: ca.company_name,
            attention: ca.attention,
            address_line1: ca.address_line1,
            city: ca.city,
            postal_code: ca.postal_code,
            country: ca.country || 'France',
            phone: ca.phone,
            is_billing: false,
            is_default: false
          }).select().single();
          if (addrErr) {
            notify("Erreur lors de la création de l'adresse pour " + (d.model || d.serial_number), 'error');
            setSaving(false);
            return;
          }
          deviceAddressId = newAddr.id;
        }

        await supabase.from('request_devices').insert({
          request_id: request.id,
          serial_number: d.serial_number,
          model_name: d.model,
          device_type: d.device_type,
          equipment_type: d.brand === 'other' ? d.brand_other : 'Lighthouse',
          service_type: d.service_type === 'other' ? d.service_other : d.service_type,
          notes: d.notes,
          accessories: d.accessories,
          shipping_address_id: deviceAddressId
        });

        // Auto-save device to equipment (always, so customer can track history)
        if (!d.fromSaved) {
          await supabase.from('equipment').upsert({
            company_id: profile.company_id,
            serial_number: d.serial_number,
            model_name: d.model,
            nickname: d.nickname || null,
            brand: d.brand === 'other' ? d.brand_other : 'Lighthouse',
            equipment_type: d.device_type || 'particle_counter',
            added_by: profile.id
          }, { onConflict: 'serial_number' }).then(() => {});
        }
      }

      refresh();
      setShowReviewModal(false);
      setShowSuccess(true);
    } catch (err) {
      notify(`Erreur: ${err.message}`, 'error');
    }
    
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={goBack} className="text-gray-500 hover:text-gray-700">←</button>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Demande Étalonnage / Réparation</h1>
      </div>
      
      <form onSubmit={openReview}>
        {/* Devices */}
        <div className="space-y-6 mb-8">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              updateDevice={updateDevice}
              updateDeviceMultiple={updateDeviceMultiple}
              toggleAccessory={toggleAccessory}
              removeDevice={removeDevice}
              canRemove={devices.length > 1}
              savedEquipment={savedEquipment}
              loadFromSaved={loadFromSaved}
              addresses={addresses}
              defaultAddressId={shipping.address_id}
              returnShipping={shipping.return_shipping || 'standard'}
            />
          ))}
        </div>

        {/* Add Device Button */}
        <button
          type="button"
          onClick={addDevice}
          className="mb-8 px-4 py-2 border-2 border-[#3B7AB4] text-[#3B7AB4] rounded-lg font-medium hover:bg-[#E8F2F8] transition-colors"
        >
          + Ajouter un Appareil
        </button>

        {/* ====== 1. BILLING / INVOICING ADDRESS (first) ====== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-[#1E3A5F] mb-3 pb-3 border-b border-gray-100">💳 Adresse de facturation</h2>
          <select
            value={showNewBillingForm ? '__new__' : billingAddressId}
            onChange={e => {
              if (e.target.value === '__new__') { setShowNewBillingForm(true); setBillingAddressId(''); }
              else { setBillingAddressId(e.target.value); setShowNewBillingForm(false); }
            }}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm ${!billingAddressId && !showNewBillingForm ? 'border-gray-300 text-gray-400' : 'border-gray-300'}`}
          >
            <option value="">Sélectionner une adresse de facturation...</option>
            {billingAddresses.map(a => (
              <option key={a.id} value={a.id}>
                {a.company_name || a.label} — {a.address_line1}, {a.postal_code} {a.city}
                {a.siret ? ` (SIRET: ${a.siret})` : ''}
              </option>
            ))}
            <option value="__new__">+ Nouvelle adresse de facturation...</option>
          </select>

          {/* Show selected billing address details */}
          {selectedBillingAddr && !showNewBillingForm && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="font-medium text-[#1E3A5F] text-sm">{selectedBillingAddr.company_name || selectedBillingAddr.label}</p>
              {selectedBillingAddr.attention && <p className="text-xs text-gray-600">Attn: {selectedBillingAddr.attention}</p>}
              <p className="text-xs text-gray-600">{selectedBillingAddr.address_line1}, {selectedBillingAddr.postal_code} {selectedBillingAddr.city}</p>
              <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-3">
                <span className={selectedBillingAddr.siret ? 'text-xs text-green-600' : 'text-xs text-amber-500'}>
                  SIRET: {selectedBillingAddr.siret ? <span className="font-mono">{selectedBillingAddr.siret}</span> : 'Non renseigné'}
                </span>
                <span className={selectedBillingAddr.tva_number ? 'text-xs text-green-600' : 'text-xs text-amber-500'}>
                  TVA: {selectedBillingAddr.tva_number ? <span className="font-mono">{selectedBillingAddr.tva_number}</span> : 'Non renseigné'}
                </span>
              </div>
              {selectedBillingAddr.chorus_invoicing && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">📋 Chorus Pro</span>
                  {selectedBillingAddr.chorus_service_code && <span className="text-xs text-gray-500 ml-2">Service: <span className="font-mono">{selectedBillingAddr.chorus_service_code}</span></span>}
                </div>
              )}
              {(!selectedBillingAddr.siret || !selectedBillingAddr.tva_number) && (
                <button type="button" onClick={() => setPage('settings')} className="text-xs text-[#3B7AB4] underline mt-1">Compléter dans les paramètres</button>
              )}
            </div>
          )}

          {/* New billing address form */}
          {showNewBillingForm && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-[#3B7AB4]">
              <h3 className="font-bold text-[#1E3A5F] mb-3 text-sm">Nouvelle adresse de facturation</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <input type="text" value={newBillingAddress.label} onChange={e => setNewBillingAddress({ ...newBillingAddress, label: e.target.value })} placeholder="Nom (ex: Siège social, Comptabilité) *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="text" value={newBillingAddress.company_name || ''} onChange={e => setNewBillingAddress({ ...newBillingAddress, company_name: e.target.value })} placeholder="Nom de la société *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="text" value={newBillingAddress.attention} onChange={e => setNewBillingAddress({ ...newBillingAddress, attention: e.target.value })} placeholder="À l'attention de *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="md:col-span-2">
                  <input type="text" value={newBillingAddress.address_line1} onChange={e => setNewBillingAddress({ ...newBillingAddress, address_line1: e.target.value })} placeholder="Adresse *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="tel" value={newBillingAddress.phone || ''} onChange={e => setNewBillingAddress({ ...newBillingAddress, phone: e.target.value })} placeholder="Téléphone *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="text" value={newBillingAddress.country} onChange={e => setNewBillingAddress({ ...newBillingAddress, country: e.target.value })} placeholder="Pays" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="text" value={newBillingAddress.postal_code} onChange={e => setNewBillingAddress({ ...newBillingAddress, postal_code: e.target.value })} placeholder="Code postal *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="text" value={newBillingAddress.city} onChange={e => setNewBillingAddress({ ...newBillingAddress, city: e.target.value })} placeholder="Ville *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="text" value={newBillingAddress.siret || ''} onChange={e => setNewBillingAddress({ ...newBillingAddress, siret: e.target.value })} placeholder="SIRET" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="text" value={newBillingAddress.tva_number || ''} onChange={e => setNewBillingAddress({ ...newBillingAddress, tva_number: e.target.value })} placeholder="N° TVA" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={newBillingAddress.chorus_invoicing} onChange={e => setNewBillingAddress({ ...newBillingAddress, chorus_invoicing: e.target.checked })} className="w-4 h-4 text-[#3B7AB4]" />
                    Facturation via Chorus Pro
                  </label>
                  {newBillingAddress.chorus_invoicing && (
                    <input type="text" value={newBillingAddress.chorus_service_code || ''} onChange={e => setNewBillingAddress({ ...newBillingAddress, chorus_service_code: e.target.value })} placeholder="N° Service Chorus Pro *" className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====== 2. OPTIONS DE RETOUR ====== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mt-6">
          <h2 className="text-lg font-bold text-[#1E3A5F] mb-3 pb-3 border-b border-gray-100">🚚 Options de retour</h2>
          
          <div className="space-y-3">
            {/* Standard return - disabled if non-metro */}
            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
              isReturnNonMetro ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' :
              (shipping.return_shipping === 'standard' || !shipping.return_shipping)
                ? 'border-[#3B7AB4] bg-blue-50 cursor-pointer' : 'border-gray-200 hover:border-gray-300 cursor-pointer'
            }`}>
              <input type="radio" name="return_shipping_main" disabled={isReturnNonMetro} checked={!isReturnNonMetro && (shipping.return_shipping === 'standard' || !shipping.return_shipping)} onChange={() => setShipping({ ...shipping, return_shipping: 'standard' })} className="mt-1 w-4 h-4 text-[#3B7AB4]" />
              <div>
                <span className={`font-medium ${isReturnNonMetro ? 'text-gray-400' : 'text-[#1E3A5F]'}`}>🚚 Retour standard par Lighthouse</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isReturnNonMetro 
                    ? 'Non disponible pour les adresses hors France métropolitaine'
                    : 'Nous organisons le retour de vos appareils après service (frais de port inclus dans le devis)'}
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
              hasPerDeviceAddress ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' :
              shipping.return_shipping === 'own_label' ? 'border-amber-400 bg-amber-50 cursor-pointer' : 'border-gray-200 hover:border-gray-300 cursor-pointer'
            }`}>
              <input type="radio" name="return_shipping_main" disabled={hasPerDeviceAddress} checked={shipping.return_shipping === 'own_label'} onChange={() => setShipping({ ...shipping, return_shipping: 'own_label' })} className="mt-1 w-4 h-4 text-amber-500" />
              <div>
                <span className={`font-medium ${hasPerDeviceAddress ? 'text-gray-400' : 'text-[#1E3A5F]'}`}>🏷️ Je fournis ma propre étiquette de retour</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {hasPerDeviceAddress
                    ? 'Non disponible — vous avez défini une adresse de retour spécifique pour un appareil'
                    : 'Vous nous enverrez votre étiquette de transport pour le retour'}
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
              hasPerDeviceAddress ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' :
              shipping.return_shipping === 'pickup' ? 'border-green-400 bg-green-50 cursor-pointer' : 'border-gray-200 hover:border-gray-300 cursor-pointer'
            }`}>
              <input type="radio" name="return_shipping_main" disabled={hasPerDeviceAddress} checked={shipping.return_shipping === 'pickup'} onChange={() => setShipping({ ...shipping, return_shipping: 'pickup' })} className="mt-1 w-4 h-4 text-green-500" />
              <div>
                <span className={`font-medium ${hasPerDeviceAddress ? 'text-gray-400' : 'text-[#1E3A5F]'}`}>🏢 Je récupère les appareils moi-même</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {hasPerDeviceAddress
                    ? 'Non disponible — vous avez défini une adresse de retour spécifique pour un appareil'
                    : 'Vous viendrez récupérer vos appareils à notre atelier à Créteil'}
                </p>
              </div>
            </label>
          </div>

          {/* === STANDARD RETURN: show parcels + return address === */}
          {(shipping.return_shipping === 'standard' || !shipping.return_shipping) && (
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
              {/* Parcels */}
              <div className="p-4 bg-[#E8F2F8] rounded-lg border border-[#3B7AB4]/30">
                <label className="block text-sm font-bold text-[#1E3A5F] mb-2">📦 Nombre de colis *</label>
                <p className="text-sm text-gray-600 mb-3">Indiquez le nombre de colis/boîtes dans lesquels vous enverrez vos appareils.</p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setShipping({ ...shipping, parcels: Math.max(0, (shipping.parcels || 0) - 1) })} className="w-10 h-10 rounded-lg bg-white border border-gray-300 text-gray-600 font-bold hover:bg-gray-50">−</button>
                  <input type="number" min="0" value={shipping.parcels || 0} onChange={e => setShipping({ ...shipping, parcels: Math.max(0, parseInt(e.target.value) || 0) })} className={`w-20 px-3 py-2 text-center border rounded-lg font-bold text-lg ${(shipping.parcels || 0) === 0 ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                  <button type="button" onClick={() => setShipping({ ...shipping, parcels: (shipping.parcels || 0) + 1 })} className="w-10 h-10 rounded-lg bg-white border border-gray-300 text-gray-600 font-bold hover:bg-gray-50">+</button>
                  <span className="text-gray-600 ml-2">colis</span>
                </div>
                {(shipping.parcels || 0) === 0 && <p className="text-red-600 text-sm mt-2 font-medium">⚠️ Veuillez indiquer le nombre de colis</p>}
              </div>

              {/* Return address */}
              <div>
                <label className="block text-sm font-bold text-[#1E3A5F] mb-3">📍 Adresse de retour</label>
                
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border cursor-pointer mb-4">
                  <input type="checkbox" checked={shippingSameAsBilling} onChange={e => setShippingSameAsBilling(e.target.checked)} className="w-4 h-4 text-[#3B7AB4]" />
                  <span className="text-sm font-medium">Identique à l'adresse de facturation</span>
                </label>

                {shippingSameAsBilling && selectedBillingAddr && (
                  <p className="text-sm text-gray-500 italic">
                    ✓ {selectedBillingAddr.company_name || selectedBillingAddr.label}, {selectedBillingAddr.address_line1}, {selectedBillingAddr.postal_code} {selectedBillingAddr.city}
                  </p>
                )}

                {!shippingSameAsBilling && (
                  <ReturnAddressPicker
                    shipping={shipping}
                    setShipping={setShipping}
                    addresses={addresses}
                    profile={profile}
                    notify={notify}
                    refresh={refresh}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={() => setPage('dashboard')}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F] transition-colors disabled:opacity-50"
          >
            {saving ? 'Envoi en cours...' : 'Vérifier et Soumettre →'}
          </button>
        </div>
      </form>

      {/* Review Modal */}
      {showReviewModal && (() => {
        const billingAddr = showNewBillingForm ? newBillingAddress : billingAddresses.find(a => a.id === billingAddressId);
        const shippingAddr = shippingSameAsBilling ? billingAddr : (shipping.showNewForm ? shipping.newAddress : addresses.find(a => a.id === shipping.address_id));
        const co = profile?.companies || {};
        const serviceLabels = { calibration: 'Étalonnage', repair: 'Réparation', calibration_repair: 'Étalonnage + Réparation', other: 'Autre' };
        const returnShippingLabels = {
          standard: '🚚 Retour standard par Lighthouse',
          own_label: '🏷️ Le client fournit sa propre étiquette de retour',
          pickup: '🏢 Le client récupère les appareils sur place'
        };

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-200 shrink-0 bg-[#1E3A5F] rounded-t-2xl">
                <h2 className="text-xl font-bold text-white">📋 Récapitulatif de votre demande</h2>
                <p className="text-white/60 text-sm mt-1">Vérifiez les informations avant de soumettre</p>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Devices */}
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-3 flex items-center gap-2">
                    🔧 Appareils ({devices.length})
                  </h3>
                  <div className="space-y-3">
                    {devices.map((d, i) => {
                      const devAddr = d.shipping_address_id === 'new' ? d.custom_shipping_address : (d.shipping_address_id ? addresses.find(a => a.id === d.shipping_address_id) : null);
                      return (
                        <div key={d.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-[#1E3A5F]">
                                {d.brand === 'other' ? d.brand_other : 'Lighthouse'} {d.model}
                              </p>
                              <p className="text-sm text-gray-500 font-mono">S/N: {d.serial_number}</p>
                            </div>
                            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                              {serviceLabels[d.service_type] || d.service_other || '—'}
                            </span>
                          </div>
                          {d.notes && <p className="text-xs text-gray-500 mt-2 italic">"{d.notes}"</p>}
                          {d.accessories?.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">Accessoires : {d.accessories.join(', ')}</p>
                          )}
                          {devAddr && (
                            <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                              <p className="text-xs font-medium text-amber-700">📍 Adresse de retour spécifique :</p>
                              <p className="text-xs text-amber-800">{devAddr.company_name || devAddr.label}, {devAddr.attention ? `Attn: ${devAddr.attention}` : ''}</p>
                              <p className="text-xs text-amber-600">{devAddr.address_line1}, {devAddr.postal_code} {devAddr.city}{devAddr.phone ? ` • Tél: ${devAddr.phone}` : ''}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <hr className="border-gray-200" />

                {/* Billing Address */}
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-3 flex items-center gap-2">
                    💳 Facturation
                  </h3>
                  {billingAddr && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <p className="font-medium text-[#1E3A5F]">{billingAddr.company_name || billingAddr.label || co.name}</p>
                      {billingAddr.attention && <p className="text-sm text-gray-600">Attn: {billingAddr.attention}</p>}
                      <p className="text-sm text-gray-600">{billingAddr.address_line1}</p>
                      <p className="text-sm text-gray-600">{billingAddr.postal_code} {billingAddr.city}, {billingAddr.country || 'France'}</p>
                      {(billingAddr.siret || billingAddr.tva_number) && (
                        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-0.5">
                          {billingAddr.siret && <p>SIRET: <span className="font-mono">{billingAddr.siret}</span></p>}
                          {billingAddr.tva_number && <p>TVA: <span className="font-mono">{billingAddr.tva_number}</span></p>}
                        </div>
                      )}
                      {billingAddr.chorus_invoicing && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">📋 Chorus Pro</span>
                          {billingAddr.chorus_service_code && <span className="text-xs text-gray-500 ml-2">Service: <span className="font-mono">{billingAddr.chorus_service_code}</span></span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Return Method */}
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-3 flex items-center gap-2">
                    🚚 Retour des appareils
                  </h3>
                  <div className={`rounded-lg p-4 border ${
                    shipping.return_shipping === 'own_label' ? 'bg-amber-50 border-amber-200' 
                    : shipping.return_shipping === 'pickup' ? 'bg-green-50 border-green-200' 
                    : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className="font-medium text-sm">{returnShippingLabels[shipping.return_shipping] || returnShippingLabels.standard}</p>
                    {(shipping.return_shipping === 'standard' || !shipping.return_shipping) && (
                      <p className="text-xs text-gray-500 mt-1">📦 {shipping.parcels} colis</p>
                    )}
                  </div>
                </div>

                {/* Return Address - only for standard return */}
                {(shipping.return_shipping === 'standard' || !shipping.return_shipping) && (
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-3 flex items-center gap-2">
                    📍 Adresse de retour
                  </h3>
                  {devices.some(d => d.shipping_address_id) ? (
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <p className="font-medium text-amber-800 text-sm">⚠️ Adresses de retour multiples</p>
                      <p className="text-xs text-amber-600 mt-1">Certains appareils seront retournés à des adresses différentes. Voir le détail par appareil ci-dessus.</p>
                    </div>
                  ) : shippingSameAsBilling ? (
                    <p className="text-sm text-gray-500 italic">Identique à l'adresse de facturation</p>
                  ) : shippingAddr && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <p className="font-medium text-[#1E3A5F]">{shippingAddr.company_name || shippingAddr.label || co.name}</p>
                      {shippingAddr.attention && <p className="text-sm text-gray-600">Attn: {shippingAddr.attention}</p>}
                      <p className="text-sm text-gray-600">{shippingAddr.address_line1}</p>
                      <p className="text-sm text-gray-600">{shippingAddr.postal_code} {shippingAddr.city}, {shippingAddr.country || 'France'}</p>
                      {shippingAddr.phone && <p className="text-sm text-gray-500">📞 {shippingAddr.phone}</p>}
                    </div>
                  )}
                </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
                <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 py-3 bg-white border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-100">
                  ← Modifier
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e)}
                  disabled={saving}
                  className="flex-1 py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008C44] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Envoi en cours...' : '✓ Confirmer et envoyer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Success Page */}
      {showSuccess && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full text-center">
            <div className="w-20 h-20 bg-[#00A651] rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-white">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-3">Merci pour votre demande !</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Nous allons examiner votre demande et vous envoyer un devis sous peu. 
              Après approbation du devis, vous pourrez envoyer vos appareils à l'adresse suivante :
            </p>
            
            <div className="bg-[#E8F2F8] rounded-xl p-6 mb-8 text-left border-2 border-[#3B7AB4]/30">
              <p className="text-xs font-bold text-[#3B7AB4] uppercase tracking-wider mb-3">📦 Adresse d'envoi des appareils</p>
              <p className="font-bold text-[#1E3A5F] text-lg">Lighthouse France SAS</p>
              <p className="text-gray-700">À l'attention de Marshall Meleney</p>
              <p className="text-gray-700">16 Rue Paul Séjourné</p>
              <p className="text-gray-700">94000 Créteil, France</p>
              <p className="text-gray-700 mt-2">📞 +33 (0)1 43 77 28 07</p>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 mb-8 text-left border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Important :</strong> N'envoyez pas vos appareils avant d'avoir reçu et approuvé notre devis. 
                Nous vous contacterons dès que le devis sera prêt.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setPage('my-orders')} 
                className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Voir mes commandes
              </button>
              <button 
                onClick={() => setPage('dashboard')} 
                className="flex-1 py-3 bg-[#1E3A5F] text-white rounded-lg font-bold hover:bg-[#2a4f7a]"
              >
                Retour au tableau de bord
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PARTS ORDER FORM
// ============================================
function PartsOrderForm({ profile, addresses, t, notify, refresh, setPage, goBack }) {
  const [parts, setParts] = useState([createNewPart(1)]);
  const billingAddresses = addresses.filter(a => a.is_billing);
  const shippingAddresses = addresses.filter(a => !a.is_billing);
  const [billingAddressId, setBillingAddressId] = useState(billingAddresses[0]?.id || '');
  const [showNewBillingForm, setShowNewBillingForm] = useState(false);
  const [newBillingAddress, setNewBillingAddress] = useState({ label: '', company_name: '', address_line1: '', city: '', postal_code: '', country: 'France', attention: '', phone: '', siret: '', tva_number: '', chorus_invoicing: false, chorus_service_code: '' });
  const [deliveryMethod, setDeliveryMethod] = useState('standard'); // 'standard', 'own_label', 'pickup'
  const [shipping, setShipping] = useState({ 
    address_id: shippingAddresses.find(a => a.is_default)?.id || '',
    showNewForm: false,
    newAddress: { label: '', company_name: '', attention: '', address_line1: '', city: '', postal_code: '', country: 'France', phone: '' }
  });
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const selectedBillingAddr = billingAddresses.find(a => a.id === billingAddressId);

  function createNewPart(num) {
    return {
      id: `part_${Date.now()}_${num}`,
      num,
      device_for: '',
      part_number: '',
      description: '',
      quantity: 1,
      photos: [] // Array of { file, preview, url }
    };
  }

  const addPart = () => {
    setParts([...parts, createNewPart(parts.length + 1)]);
  };

  const removePart = (id) => {
    if (parts.length === 1) return;
    setParts(parts.filter(p => p.id !== id).map((p, i) => ({ ...p, num: i + 1 })));
  };

  const updatePart = (id, field, value) => {
    setParts(parts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Handle photo selection
  const handlePhotoSelect = (partId, files) => {
    const fileArray = Array.from(files);
    const photosWithPreview = fileArray.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      url: null
    }));
    
    setParts(parts.map(p => {
      if (p.id !== partId) return p;
      return { ...p, photos: [...p.photos, ...photosWithPreview] };
    }));
  };

  // Remove photo
  const removePhoto = (partId, photoIndex) => {
    setParts(parts.map(p => {
      if (p.id !== partId) return p;
      const newPhotos = [...p.photos];
      // Revoke object URL to prevent memory leaks
      if (newPhotos[photoIndex]?.preview) {
        URL.revokeObjectURL(newPhotos[photoIndex].preview);
      }
      newPhotos.splice(photoIndex, 1);
      return { ...p, photos: newPhotos };
    }));
  };

  // Upload photos to storage
  const uploadPhotos = async (partPhotos, requestId) => {
    const uploadedUrls = [];
    for (const photo of partPhotos) {
      if (!photo.file) continue;
      const fileExt = photo.file.name.split('.').pop();
      const fileName = `${requestId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('request-attachments')
        .upload(fileName, photo.file);
      
      if (error) {
        console.error('Photo upload error:', error);
        continue;
      }
      
      const { data: urlData } = supabase.storage
        .from('request-attachments')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(urlData.publicUrl);
    }
    return uploadedUrls;
  };

  const openReview = (e) => {
    e.preventDefault();
    for (const p of parts) {
      if (!p.description) { notify('Veuillez décrire la pièce demandée', 'error'); return; }
    }
    if (!billingAddressId && !showNewBillingForm) { notify('Veuillez sélectionner une adresse de facturation', 'error'); return; }
    if (deliveryMethod === 'standard' && !shippingSameAsBilling && !shipping.showNewForm && !shipping.address_id) {
      notify('Veuillez sélectionner une adresse de livraison', 'error'); return;
    }
    setShowReviewModal(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Handle billing address
    let finalBillingAddressId = billingAddressId || null;
    if (showNewBillingForm) {
      const ba = newBillingAddress;
      if (!ba.company_name || !ba.attention || !ba.address_line1 || !ba.postal_code || !ba.city) {
        notify('Veuillez remplir les champs obligatoires de l\'adresse de facturation', 'error');
        return;
      }
      const { data: baData, error: baErr } = await supabase.from('shipping_addresses').insert({
        ...ba, company_id: profile.company_id, is_billing: true, is_default: false
      }).select().single();
      if (baErr) { notify("Erreur lors de la création de l'adresse de facturation", 'error'); return; }
      finalBillingAddressId = baData.id;
    }

    // Handle shipping address based on delivery method
    let addressId = null;
    if (deliveryMethod === 'standard') {
      if (shippingSameAsBilling) {
        addressId = finalBillingAddressId;
      } else if (shipping.showNewForm) {
        const addr = shipping.newAddress;
        if (!addr.company_name || !addr.address_line1 || !addr.attention || !addr.phone || !addr.city || !addr.postal_code) {
          notify('Veuillez remplir tous les champs obligatoires de l\'adresse de livraison', 'error');
          return;
        }
        const { data, error } = await supabase.from('shipping_addresses').insert({
          company_id: profile.company_id, label: addr.label || addr.company_name, company_name: addr.company_name,
          attention: addr.attention, phone: addr.phone, address_line1: addr.address_line1,
          city: addr.city, postal_code: addr.postal_code, country: addr.country || 'France', is_default: false
        }).select().single();
        if (error) { notify(`Erreur adresse: ${error.message}`, 'error'); return; }
        addressId = data.id;
        refresh();
      } else {
        addressId = shipping.address_id;
      }
      if (!addressId) {
        notify('Veuillez sélectionner ou ajouter une adresse de livraison', 'error');
        return;
      }
    } else {
      addressId = finalBillingAddressId; // fallback
    }

    const billingAddr = showNewBillingForm ? newBillingAddress : billingAddresses.find(a => a.id === finalBillingAddressId);

    setSaving(true);
    
    try {
      const partsDescription = parts.map(p => 
        `Pièce ${p.num}: ${p.description}${p.part_number ? ` (Réf: ${p.part_number})` : ''}${p.device_for ? ` - Pour: ${p.device_for}` : ''} - Qté: ${p.quantity}`
      ).join('\n');

      const { data, error } = await supabase
        .from('service_requests')
        .insert({
          request_number: null,
          company_id: profile.company_id,
          submitted_by: profile.id,
          request_type: 'parts',
          requested_service: 'calibration',
          problem_description: partsDescription,
          urgency: 'normal',
          shipping_address_id: addressId,
          billing_address_id: finalBillingAddressId,
          billing_siret: billingAddr?.siret || null,
          billing_tva: billingAddr?.tva_number || null,
          return_shipping: deliveryMethod,
          chorus_invoicing: billingAddr?.chorus_invoicing || false,
          chorus_service_code: billingAddr?.chorus_invoicing ? (billingAddr?.chorus_service_code || null) : null,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Parts order insert error:', error);
        notify(`Erreur: ${error.message}`, 'error');
        setSaving(false);
        return;
      }

      // Upload photos for each part
      setUploadingPhotos(true);
      const partsWithPhotos = [];
      for (const part of parts) {
        let photoUrls = [];
        if (part.photos && part.photos.length > 0) {
          photoUrls = await uploadPhotos(part.photos, data.id);
        }
        partsWithPhotos.push({
          num: part.num,
          device_for: part.device_for,
          part_number: part.part_number,
          description: part.description,
          quantity: part.quantity,
          photos: photoUrls
        });
      }

      // Update request with structured parts_data
      await supabase
        .from('service_requests')
        .update({
          parts_data: { parts: partsWithPhotos }
        })
        .eq('id', data.id);

      setUploadingPhotos(false);
      console.log('Parts order created:', data);
      notify('Commande de pièces soumise avec succès!');
      refresh();
      setPage('dashboard');
    } catch (err) {
      console.error('Parts order exception:', err);
      notify(`Erreur: ${err.message}`, 'error');
    }
    
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={goBack} className="text-gray-500 hover:text-gray-700">←</button>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Commande de Pièces</h1>
      </div>
      
      <form onSubmit={openReview}>
        {/* Parts List */}
        <div className="space-y-6 mb-8">
          {parts.map((part) => (
            <div key={part.id} className="bg-[#F5F5F5] rounded-lg p-6 border-l-4 border-amber-500">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[#1E3A5F]">Pièce #{part.num}</h3>
                {parts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePart(part.id)}
                    className="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded hover:bg-white"
                  >
                    Retirer
                  </button>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Pour quel appareil? (optionnel)</label>
                  <input
                    type="text"
                    value={part.device_for}
                    onChange={e => updatePart(part.id, 'device_for', e.target.value)}
                    placeholder="ex: Solair 3100 - SN: LC-1234"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Numéro de Pièce (optionnel)</label>
                  <input
                    type="text"
                    value={part.part_number}
                    onChange={e => updatePart(part.id, 'part_number', e.target.value)}
                    placeholder="ex: PN-12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Quantité *</label>
                  <input
                    type="number"
                    min="1"
                    value={part.quantity}
                    onChange={e => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description de la Pièce *</label>
                  <textarea
                    value={part.description}
                    onChange={e => updatePart(part.id, 'description', e.target.value)}
                    placeholder="Décrivez la pièce que vous recherchez..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Photos (optionnel)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handlePhotoSelect(part.id, e.target.files)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Ajoutez des photos de la pièce ou de son emplacement sur l'appareil
                  </p>
                  
                  {/* Photo previews */}
                  {part.photos && part.photos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {part.photos.map((photo, idx) => (
                        <div key={idx} className="relative">
                          <img 
                            src={photo.preview} 
                            alt={`Photo ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(part.id, idx)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addPart}
          className="mb-8 px-4 py-2 border-2 border-amber-500 text-amber-600 rounded-lg font-medium hover:bg-amber-50 transition-colors"
        >
          + Ajouter une Pièce
        </button>

        {/* ====== BILLING ADDRESS ====== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1E3A5F] mb-3 pb-3 border-b border-gray-100">💳 Adresse de facturation</h2>
          <select
            value={showNewBillingForm ? '__new__' : billingAddressId}
            onChange={e => {
              if (e.target.value === '__new__') { setShowNewBillingForm(true); setBillingAddressId(''); }
              else { setBillingAddressId(e.target.value); setShowNewBillingForm(false); }
            }}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm ${!billingAddressId && !showNewBillingForm ? 'border-gray-300 text-gray-400' : 'border-gray-300'}`}
          >
            <option value="">Sélectionner une adresse de facturation...</option>
            {billingAddresses.map(a => (
              <option key={a.id} value={a.id}>
                {a.company_name || a.label} — {a.address_line1}, {a.postal_code} {a.city}
                {a.siret ? ` (SIRET: ${a.siret})` : ''}
              </option>
            ))}
            <option value="__new__">+ Nouvelle adresse de facturation...</option>
          </select>
          {selectedBillingAddr && !showNewBillingForm && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border text-sm">
              <p className="font-medium text-[#1E3A5F]">{selectedBillingAddr.company_name}</p>
              <p className="text-gray-600">{selectedBillingAddr.address_line1}</p>
              <p className="text-gray-600">{selectedBillingAddr.postal_code} {selectedBillingAddr.city}</p>
              {selectedBillingAddr.siret && <p className="text-green-600 mt-1">SIRET: {selectedBillingAddr.siret} {selectedBillingAddr.tva_number ? ` TVA: ${selectedBillingAddr.tva_number}` : ''}</p>}
              {selectedBillingAddr.chorus_invoicing && <p className="text-blue-600 mt-1">🏛️ Chorus Pro{selectedBillingAddr.chorus_service_code ? `: ${selectedBillingAddr.chorus_service_code}` : ''}</p>}
            </div>
          )}
          {showNewBillingForm && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 mb-1">Société *</label><input type="text" value={newBillingAddress.company_name} onChange={e => setNewBillingAddress({...newBillingAddress, company_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">Contact / Attn *</label><input type="text" value={newBillingAddress.attention} onChange={e => setNewBillingAddress({...newBillingAddress, attention: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">Téléphone</label><input type="tel" value={newBillingAddress.phone} onChange={e => setNewBillingAddress({...newBillingAddress, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 mb-1">Adresse *</label><input type="text" value={newBillingAddress.address_line1} onChange={e => setNewBillingAddress({...newBillingAddress, address_line1: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">Code Postal *</label><input type="text" value={newBillingAddress.postal_code} onChange={e => setNewBillingAddress({...newBillingAddress, postal_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">Ville *</label><input type="text" value={newBillingAddress.city} onChange={e => setNewBillingAddress({...newBillingAddress, city: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">SIRET</label><input type="text" value={newBillingAddress.siret} onChange={e => setNewBillingAddress({...newBillingAddress, siret: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">N° TVA</label><input type="text" value={newBillingAddress.tva_number} onChange={e => setNewBillingAddress({...newBillingAddress, tva_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="md:col-span-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newBillingAddress.chorus_invoicing} onChange={e => setNewBillingAddress({...newBillingAddress, chorus_invoicing: e.target.checked})} className="w-4 h-4" />Facturation via Chorus Pro</label>
                  {newBillingAddress.chorus_invoicing && <input type="text" value={newBillingAddress.chorus_service_code || ''} onChange={e => setNewBillingAddress({...newBillingAddress, chorus_service_code: e.target.value})} placeholder="N° Service Chorus Pro" className="w-full mt-2 px-3 py-2 border rounded-lg text-sm" />}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====== DELIVERY OPTIONS ====== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1E3A5F] mb-3 pb-3 border-b border-gray-100">🚚 Options de livraison</h2>
          <div className="space-y-3">
            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${deliveryMethod === 'standard' ? 'border-[#3B7AB4] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="parts_delivery" checked={deliveryMethod === 'standard'} onChange={() => setDeliveryMethod('standard')} className="mt-1 w-4 h-4 text-[#3B7AB4]" />
              <div>
                <span className="font-medium text-[#1E3A5F]">🚚 Livraison standard par Lighthouse</span>
                <p className="text-xs text-gray-500 mt-0.5">Nous expédions les pièces à votre adresse (frais de port inclus dans le devis)</p>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${deliveryMethod === 'own_label' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="parts_delivery" checked={deliveryMethod === 'own_label'} onChange={() => setDeliveryMethod('own_label')} className="mt-1 w-4 h-4 text-amber-500" />
              <div>
                <span className="font-medium text-[#1E3A5F]">🏷️ Mon propre transporteur</span>
                <p className="text-xs text-gray-500 mt-0.5">Vous nous enverrez votre étiquette ou organiserez l'enlèvement</p>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${deliveryMethod === 'pickup' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="parts_delivery" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')} className="mt-1 w-4 h-4 text-green-500" />
              <div>
                <span className="font-medium text-[#1E3A5F]">🏢 Je récupère sur place</span>
                <p className="text-xs text-gray-500 mt-0.5">Vous viendrez récupérer les pièces à notre atelier à Créteil</p>
              </div>
            </label>
          </div>

          {/* Shipping address - only for standard delivery */}
          {deliveryMethod === 'standard' && (
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={shippingSameAsBilling} onChange={e => setShippingSameAsBilling(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[#3B7AB4]" />
                <span className="text-sm font-medium text-gray-700">Même adresse que la facturation</span>
              </label>
              
              {!shippingSameAsBilling && (
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F] mb-3">📍 Adresse de livraison</h3>
                  <ReturnAddressPicker shipping={shipping} setShipping={setShipping} addresses={addresses} profile={profile} notify={notify} refresh={refresh} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setPage('dashboard')}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600"
          >
            Vérifier et soumettre →
          </button>
        </div>
      </form>

      {/* ====== REVIEW MODAL ====== */}
      {showReviewModal && (() => {
        const billingAddr = showNewBillingForm ? newBillingAddress : billingAddresses.find(a => a.id === billingAddressId);
        const shippingAddr = shippingSameAsBilling ? billingAddr : (shipping.showNewForm ? shipping.newAddress : addresses.find(a => a.id === shipping.address_id));
        const deliveryLabels = { standard: '🚚 Livraison standard par Lighthouse', own_label: '🏷️ Le client fournit son propre transporteur', pickup: '🏢 Récupération sur place à Créteil' };
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 border-b shrink-0 bg-amber-500 rounded-t-2xl">
                <h2 className="text-xl font-bold text-white">📦 Récapitulatif de votre commande</h2>
                <p className="text-white/70 text-sm mt-1">Vérifiez les informations avant de soumettre</p>
              </div>
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Parts */}
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-3">📦 Pièces ({parts.length})</h3>
                  <div className="space-y-2">
                    {parts.map(p => (
                      <div key={p.id} className="bg-gray-50 rounded-lg p-3 border text-sm">
                        <p className="font-medium text-[#1E3A5F]">{p.description}</p>
                        <p className="text-gray-500">{p.part_number ? `Réf: ${p.part_number} • ` : ''}Qté: {p.quantity}{p.device_for ? ` • Pour: ${p.device_for}` : ''}</p>
                        {p.photos?.length > 0 && <p className="text-gray-400 text-xs mt-1">📷 {p.photos.length} photo(s)</p>}
                      </div>
                    ))}
                  </div>
                </div>
                <hr className="border-gray-200" />
                {/* Billing */}
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-3">💳 Facturation</h3>
                  {billingAddr && (
                    <div className="bg-gray-50 rounded-lg p-3 border text-sm">
                      <p className="font-medium">{billingAddr.company_name}</p>
                      <p className="text-gray-600">{billingAddr.address_line1}, {billingAddr.postal_code} {billingAddr.city}</p>
                      {billingAddr.siret && <p className="text-gray-500 text-xs mt-1">SIRET: {billingAddr.siret}{billingAddr.tva_number ? ` • TVA: ${billingAddr.tva_number}` : ''}</p>}
                      {billingAddr.chorus_invoicing && <span className="inline-flex items-center mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">🏛️ Chorus Pro</span>}
                    </div>
                  )}
                </div>
                {/* Delivery */}
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-3">🚚 Livraison</h3>
                  <div className={`rounded-lg p-3 border text-sm ${deliveryMethod === 'pickup' ? 'bg-green-50 border-green-200' : deliveryMethod === 'own_label' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                    <p className="font-medium">{deliveryLabels[deliveryMethod]}</p>
                  </div>
                  {deliveryMethod === 'standard' && shippingAddr && (
                    <div className="mt-2 bg-gray-50 rounded-lg p-3 border text-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Adresse de livraison</p>
                      <p className="font-medium">{shippingAddr.company_name || shippingAddr.label}</p>
                      {shippingAddr.attention && <p className="text-gray-600">Attn: {shippingAddr.attention}</p>}
                      <p className="text-gray-600">{shippingAddr.address_line1}, {shippingAddr.postal_code} {shippingAddr.city}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t flex gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
                <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 py-3 bg-white border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-100">← Modifier</button>
                <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 disabled:opacity-50">
                  {saving ? (uploadingPhotos ? 'Envoi des photos...' : 'Envoi en cours...') : '✓ Confirmer et envoyer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ============================================
// CONTRACT REQUEST FORM
// ============================================
function ContractRequestForm({ profile, addresses, t, notify, refresh, setPage, goBack }) {
  const [devices, setDevices] = useState([createContractDevice(1)]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedEquipment, setSavedEquipment] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Billing address
  const billingAddresses = addresses.filter(a => a.is_billing);
  const [billingAddressId, setBillingAddressId] = useState(billingAddresses[0]?.id || '');
  const [showNewBillingForm, setShowNewBillingForm] = useState(false);
  const [newBillingAddress, setNewBillingAddress] = useState({ label: '', company_name: '', address_line1: '', city: '', postal_code: '', country: 'France', attention: '', phone: '', siret: '', tva_number: '', chorus_invoicing: false, chorus_service_code: '' });
  const selectedBillingAddr = billingAddresses.find(a => a.id === billingAddressId);

  // Load saved equipment on mount
  useEffect(() => {
    const loadEquipment = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', profile.company_id)
        .or('hidden_by_customer.is.null,hidden_by_customer.eq.false')
        .order('created_at', { ascending: false });
      if (data) setSavedEquipment(data);
    };
    loadEquipment();
  }, [profile?.company_id]);

  function createContractDevice(num) {
    return {
      id: `contract_device_${Date.now()}_${num}`,
      num,
      nickname: '',
      serial_number: '',
      model_name: '',
      device_type: '',
      calibrations_per_year: 1
    };
  }

  const addDevice = () => {
    setDevices([...devices, createContractDevice(devices.length + 1)]);
  };

  const addMultipleDevices = (count) => {
    const newDevices = [];
    for (let i = 0; i < count; i++) {
      newDevices.push(createContractDevice(devices.length + i + 1));
    }
    setDevices([...devices, ...newDevices]);
  };

  const removeDevice = (id) => {
    if (devices.length === 1) return;
    setDevices(devices.filter(d => d.id !== id).map((d, i) => ({ ...d, num: i + 1 })));
  };

  const updateDevice = (id, field, value) => {
    setDevices(devices.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const updateDeviceMultiple = (id, updates) => {
    setDevices(devices.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  // Handle serial number change with auto-decode
  const handleSerialNumberChange = (deviceId, sn) => {
    const decoded = decodeSerialNumber(sn);
    if (decoded) {
      updateDeviceMultiple(deviceId, {
        serial_number: sn,
        model_name: decoded.model,
        device_type: decoded.category
      });
    } else {
      updateDevice(deviceId, 'serial_number', sn);
    }
  };

  // Load from saved equipment
  const loadFromSaved = (deviceId, equipmentId) => {
    const equip = savedEquipment.find(e => e.id === equipmentId);
    if (!equip) return;
    
    updateDeviceMultiple(deviceId, {
      nickname: equip.nickname || '',
      serial_number: equip.serial_number || '',
      model_name: equip.model_name || '',
      device_type: equip.equipment_type || '',
      calibrations_per_year: 1
    });
  };

  // Load all saved equipment at once
  const loadAllSavedEquipment = () => {
    if (!savedEquipment || savedEquipment.length === 0) {
      notify('Aucun appareil enregistré', 'error');
      return;
    }
    
    const newDevices = savedEquipment.map((equip, i) => ({
      id: `contract_device_${Date.now()}_${i + 1}`,
      num: i + 1,
      nickname: equip.nickname || '',
      serial_number: equip.serial_number || '',
      model_name: equip.model_name || '',
      device_type: equip.equipment_type || '',
      calibrations_per_year: 1
    }));
    
    setDevices(newDevices);
    notify(`${newDevices.length} appareils chargés`, 'success');
  };

  const openContractReview = (e) => {
    e.preventDefault();
    for (const d of devices) {
      if (!d.serial_number || !d.model_name) {
        notify('Veuillez remplir le numéro de série et le modèle pour chaque appareil', 'error'); return;
      }
    }
    if (devices.length === 0) { notify('Veuillez ajouter au moins un appareil', 'error'); return; }
    if (!billingAddressId && !showNewBillingForm) { notify('Veuillez sélectionner une adresse de facturation', 'error'); return; }
    setShowReviewModal(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();    if (devices.length === 0) {
      notify('Veuillez ajouter au moins un appareil', 'error');
      return;
    }

    setSaving(true);

    try {
      // Handle billing address
      let finalBillingAddressId = billingAddressId || null;
      if (showNewBillingForm) {
        const ba = newBillingAddress;
        if (!ba.company_name || !ba.attention || !ba.address_line1 || !ba.postal_code || !ba.city) {
          notify('Veuillez remplir les champs obligatoires de l\'adresse de facturation', 'error');
          setSaving(false);
          return;
        }
        const { data: baData, error: baErr } = await supabase.from('shipping_addresses').insert({
          ...ba, company_id: profile.company_id, is_billing: true, is_default: false
        }).select().single();
        if (baErr) { notify("Erreur lors de la création de l'adresse de facturation", 'error'); setSaving(false); return; }
        finalBillingAddressId = baData.id;
      }
      const billingAddr = showNewBillingForm ? newBillingAddress : billingAddresses.find(a => a.id === finalBillingAddressId);

      // Create contract - number will be assigned admin-side when quote is sent
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: profile.company_id,
          status: 'requested',
          billing_address_id: finalBillingAddressId,
          billing_siret: billingAddr?.siret || null,
          billing_tva: billingAddr?.tva_number || null,
          chorus_invoicing: billingAddr?.chorus_invoicing || false,
          chorus_service_code: billingAddr?.chorus_invoicing ? (billingAddr?.chorus_service_code || null) : null,
          start_date: '2027-01-01',
          end_date: '2027-12-31'
        })
        .select()
        .single();

      if (contractError) {
        console.error('Contract insert error:', contractError);
        throw contractError;
      }

      // Add devices to contract
      const deviceInserts = devices.map(d => ({
        contract_id: contract.id,
        serial_number: d.serial_number,
        model_name: d.model_name,
        device_type: d.device_type,
        nickname: d.nickname || null,
        tokens_total: d.calibrations_per_year || 1,
        tokens_used: 0
      }));

      const { error: devicesError } = await supabase
        .from('contract_devices')
        .insert(deviceInserts);

      if (devicesError) {
        console.error('Devices insert error:', devicesError);
        throw devicesError;
      }

      notify('Demande de contrat envoyée avec succès!', 'success');
      await refresh();
      setPage('dashboard');
    } catch (err) {
      console.error('Error creating contract request:', err);
      notify('Erreur lors de la création de la demande: ' + (err.message || 'Erreur inconnue'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button 
        onClick={goBack}
        className="mb-4 text-gray-500 hover:text-gray-700 flex items-center gap-2"
      >
        ← Retour au choix du type
      </button>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">📋</span>
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">Demande de Contrat d'Étalonnage</h1>
            <p className="text-gray-600">Ajoutez tous les appareils que vous souhaitez inclure dans votre contrat annuel</p>
          </div>
        </div>

        {/* 2027 Contract Notice */}
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-bold text-blue-800 text-sm">Contrats 2026 clôturés — Demandes ouvertes pour 2027</p>
              <p className="text-blue-700 text-sm mt-1">
                Les contrats d'étalonnage couvrent la période du <strong>1er janvier au 31 décembre</strong> de l'année concernée. 
                Les demandes actuelles sont pour des contrats <strong>2027</strong>.
              </p>
              <p className="text-blue-600 text-xs mt-2 italic">
                Si vous souhaitez une durée de contrat différente (pluriannuel, démarrage en cours d'année, etc.), 
                veuillez le préciser dans la section « Notes / Commentaires » ci-dessous.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 p-4 bg-[#E8F2F8] rounded-lg border border-[#3B7AB4]/20">
          <h3 className="font-bold text-[#1E3A5F] mb-3">Actions Rapides</h3>
          <div className="flex flex-wrap gap-3">
            {savedEquipment && savedEquipment.length > 0 && (
              <button
                type="button"
                onClick={loadAllSavedEquipment}
                className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg text-sm hover:bg-[#1E3A5F]"
              >
                📋 Charger tous mes appareils ({savedEquipment.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => addMultipleDevices(5)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              + Ajouter 5 lignes
            </button>
            <button
              type="button"
              onClick={() => addMultipleDevices(10)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              + Ajouter 10 lignes
            </button>
          </div>
        </div>

        <form onSubmit={openContractReview}>
          {/* Device Count Summary */}
          <div className="mb-4 text-sm text-gray-600">
            <span className="font-bold text-[#1E3A5F]">{devices.length}</span> appareil{devices.length > 1 ? 's' : ''} — <span className="font-bold text-[#00A651]">{devices.reduce((sum, d) => sum + (d.calibrations_per_year || 1), 0)}</span> étalonnage{devices.reduce((sum, d) => sum + (d.calibrations_per_year || 1), 0) > 1 ? 's' : ''} /an au total
          </div>

          {/* Devices Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 border">#</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 border">Surnom (optionnel)</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 border">N° de Série *</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 border">Modèle *</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 border">Type</th>
                  <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 border">Étal./an *</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 border w-10"></th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device, idx) => (
                  <tr key={device.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 border text-center text-sm text-gray-500">{device.num}</td>
                    <td className="px-2 py-1 border">
                      <input
                        type="text"
                        value={device.nickname}
                        onChange={e => updateDevice(device.id, 'nickname', e.target.value)}
                        placeholder="ex: Salle Blanche 1"
                        className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-[#3B7AB4] rounded"
                      />
                    </td>
                    <td className="px-2 py-1 border">
                      <input
                        type="text"
                        value={device.serial_number}
                        onChange={e => handleSerialNumberChange(device.id, e.target.value)}
                        placeholder="ex: 2101280015"
                        className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-[#3B7AB4] rounded font-mono"
                        required
                      />
                    </td>
                    <td className="px-2 py-1 border">
                      <input
                        type="text"
                        value={device.model_name}
                        onChange={e => updateDevice(device.id, 'model_name', e.target.value)}
                        placeholder="ex: ApexZ3"
                        className={`w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-[#3B7AB4] rounded ${
                          device.model_name ? 'bg-green-50' : ''
                        }`}
                        required
                      />
                    </td>
                    <td className="px-2 py-1 border">
                      <select
                        value={device.device_type}
                        onChange={e => updateDevice(device.id, 'device_type', e.target.value)}
                        className={`w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-[#3B7AB4] rounded ${
                          device.device_type ? 'bg-green-50' : ''
                        }`}
                      >
                        <option value="">—</option>
                        <option value="particle_counter">🔬 Compteur Air</option>
                        <option value="bio_collector">🧫 Bio Collecteur</option>
                        <option value="liquid_counter">💧 Compteur Liquide</option>
                        <option value="temp_humidity">🌡️ Temp/Humidité</option>
                        <option value="other">📦 Autre</option>
                      </select>
                    </td>
                    <td className="px-2 py-1 border text-center">
                      <select
                        value={device.calibrations_per_year || 1}
                        onChange={e => updateDevice(device.id, 'calibrations_per_year', parseInt(e.target.value))}
                        className="px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-[#3B7AB4] rounded bg-green-50 font-bold text-center w-16"
                      >
                        <option value={1}>1×</option>
                        <option value={2}>2×</option>
                        <option value={3}>3×</option>
                        <option value={4}>4×</option>
                      </select>
                    </td>
                    <td className="px-2 py-1 border text-center">
                      {devices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDevice(device.id)}
                          className="text-red-500 hover:text-red-700 text-lg"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Device Button */}
          <button
            type="button"
            onClick={addDevice}
            className="mb-6 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg w-full hover:border-[#3B7AB4] hover:text-[#3B7AB4]"
          >
            + Ajouter un appareil
          </button>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Notes / Commentaires (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Précisions sur votre demande (durée pluriannuelle, démarrage en cours d'année, fréquence spécifique, conditions particulières, etc.)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Billing Address */}
          <div className="mb-6 p-4 bg-white rounded-lg border">
            <h4 className="font-bold text-[#1E3A5F] mb-3">💳 Adresse de facturation</h4>
            <select value={showNewBillingForm ? '__new__' : billingAddressId} onChange={e => { if (e.target.value === '__new__') { setShowNewBillingForm(true); setBillingAddressId(''); } else { setBillingAddressId(e.target.value); setShowNewBillingForm(false); } }} className="w-full px-3 py-2.5 border rounded-lg text-sm">
              <option value="">Sélectionner une adresse de facturation...</option>
              {billingAddresses.map(a => <option key={a.id} value={a.id}>{a.company_name || a.label} — {a.address_line1}, {a.postal_code} {a.city}{a.siret ? ` (SIRET: ${a.siret})` : ''}</option>)}
              <option value="__new__">+ Nouvelle adresse de facturation...</option>
            </select>
            {selectedBillingAddr && !showNewBillingForm && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-sm">
                <p className="font-medium">{selectedBillingAddr.company_name}</p>
                <p className="text-gray-600">{selectedBillingAddr.address_line1}, {selectedBillingAddr.postal_code} {selectedBillingAddr.city}</p>
                {selectedBillingAddr.siret && <p className="text-green-600 mt-1">SIRET: {selectedBillingAddr.siret}{selectedBillingAddr.tva_number ? ` • TVA: ${selectedBillingAddr.tva_number}` : ''}</p>}
                {selectedBillingAddr.chorus_invoicing && <p className="text-blue-600 mt-1">🏛️ Chorus Pro{selectedBillingAddr.chorus_service_code ? `: ${selectedBillingAddr.chorus_service_code}` : ''}</p>}
              </div>
            )}
            {showNewBillingForm && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border grid grid-cols-2 gap-2">
                <div className="col-span-2"><input type="text" value={newBillingAddress.company_name} onChange={e => setNewBillingAddress({...newBillingAddress, company_name: e.target.value})} placeholder="Société *" className="w-full px-2 py-1.5 border rounded text-sm" /></div>
                <input type="text" value={newBillingAddress.attention} onChange={e => setNewBillingAddress({...newBillingAddress, attention: e.target.value})} placeholder="Contact *" className="w-full px-2 py-1.5 border rounded text-sm" />
                <input type="tel" value={newBillingAddress.phone} onChange={e => setNewBillingAddress({...newBillingAddress, phone: e.target.value})} placeholder="Téléphone" className="w-full px-2 py-1.5 border rounded text-sm" />
                <div className="col-span-2"><input type="text" value={newBillingAddress.address_line1} onChange={e => setNewBillingAddress({...newBillingAddress, address_line1: e.target.value})} placeholder="Adresse *" className="w-full px-2 py-1.5 border rounded text-sm" /></div>
                <input type="text" value={newBillingAddress.postal_code} onChange={e => setNewBillingAddress({...newBillingAddress, postal_code: e.target.value})} placeholder="Code postal *" className="w-full px-2 py-1.5 border rounded text-sm" />
                <input type="text" value={newBillingAddress.city} onChange={e => setNewBillingAddress({...newBillingAddress, city: e.target.value})} placeholder="Ville *" className="w-full px-2 py-1.5 border rounded text-sm" />
                <input type="text" value={newBillingAddress.siret} onChange={e => setNewBillingAddress({...newBillingAddress, siret: e.target.value})} placeholder="SIRET" className="w-full px-2 py-1.5 border rounded text-sm" />
                <input type="text" value={newBillingAddress.tva_number} onChange={e => setNewBillingAddress({...newBillingAddress, tva_number: e.target.value})} placeholder="N° TVA" className="w-full px-2 py-1.5 border rounded text-sm" />
                <div className="col-span-2"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newBillingAddress.chorus_invoicing} onChange={e => setNewBillingAddress({...newBillingAddress, chorus_invoicing: e.target.checked})} className="w-4 h-4" />Facturation Chorus Pro</label></div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-bold text-amber-800 mb-2">ℹ️ Comment ça marche?</h4>
            <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1">
              <li>Soumettez votre liste d'appareils</li>
              <li>Notre équipe prépare un devis personnalisé</li>
              <li>Vous recevez et validez le devis</li>
              <li>Signez le bon de commande</li>
              <li>Votre contrat est activé!</li>
            </ol>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPage('dashboard')}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008c44] disabled:opacity-50"
            >
              {saving ? 'Envoi en cours...' : `Vérifier la demande (${devices.length} appareil${devices.length > 1 ? 's' : ''})`}
            </button>
          </div>
        </form>

        {/* Contract Review Modal */}
        {showReviewModal && (() => {
          const billingAddr = showNewBillingForm ? newBillingAddress : billingAddresses.find(a => a.id === billingAddressId);
          return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b shrink-0 bg-[#00A651] rounded-t-2xl">
                  <h2 className="text-xl font-bold text-white">📋 Récapitulatif de votre demande de contrat</h2>
                  <p className="text-white/70 text-sm mt-1">Vérifiez les informations avant de soumettre</p>
                </div>
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                  {/* Contract Period */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-sm">
                    <p className="font-medium text-blue-800">📅 Période du contrat : <strong>1er janvier 2027 — 31 décembre 2027</strong></p>
                    <p className="text-blue-600 text-xs mt-1">Total étalonnages demandés : {devices.reduce((sum, d) => sum + (d.calibrations_per_year || 1), 0)}</p>
                  </div>
                  {/* Devices */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-3">🔧 Appareils ({devices.length})</h3>
                    <div className="space-y-2">
                      {devices.map(d => (
                        <div key={d.id} className="bg-gray-50 rounded-lg p-3 border text-sm flex justify-between items-center">
                          <div>
                            <p className="font-medium text-[#1E3A5F]">{d.model_name || 'Modèle non spécifié'}</p>
                            <p className="text-gray-500 font-mono text-xs">S/N: {d.serial_number}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {d.nickname && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{d.nickname}</span>}
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{d.calibrations_per_year || 1}× /an</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <hr className="border-gray-200" />
                  {/* Billing */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-3">💳 Facturation</h3>
                    {billingAddr ? (
                      <div className="bg-gray-50 rounded-lg p-3 border text-sm">
                        <p className="font-medium">{billingAddr.company_name}</p>
                        <p className="text-gray-600">{billingAddr.address_line1}, {billingAddr.postal_code} {billingAddr.city}</p>
                        {billingAddr.siret && <p className="text-gray-500 text-xs mt-1">SIRET: {billingAddr.siret}{billingAddr.tva_number ? ` • TVA: ${billingAddr.tva_number}` : ''}</p>}
                        {billingAddr.chorus_invoicing && <span className="inline-flex items-center mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">🏛️ Chorus Pro</span>}
                      </div>
                    ) : <p className="text-gray-400 text-sm italic">Non sélectionnée</p>}
                  </div>
                  {/* Notes */}
                  {notes && (
                    <div>
                      <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-3">📝 Notes</h3>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border italic">"{notes}"</p>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t flex gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
                  <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 py-3 bg-white border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-100">← Modifier</button>
                  <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008c44] disabled:opacity-50">
                    {saving ? 'Envoi en cours...' : `✓ Confirmer et envoyer (${devices.length} appareil${devices.length > 1 ? 's' : ''})`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ============================================
// SHIPPING SECTION (Reusable)
// ============================================
function ReturnAddressPicker({ shipping, setShipping, addresses, profile, notify, refresh }) {
  // Check if selected address is outside France Metropolitan
  const selectedAddress = addresses.find(a => a.id === shipping.address_id);
  const isOutsideMetro = selectedAddress ? isOutsideFranceMetropolitan(selectedAddress.postal_code) : false;
  const newAddressIsOutsideMetro = shipping.showNewForm && shipping.newAddress.postal_code && isOutsideFranceMetropolitan(shipping.newAddress.postal_code);

  return (
    <div>
      {/* Existing Addresses */}
      <div className="mb-4">
        {addresses.filter(a => !a.is_billing).length > 0 ? (
          <div className="space-y-2 mb-4">
            {addresses.filter(a => !a.is_billing).map(addr => {
              const addrIsOutsideMetro = isOutsideFranceMetropolitan(addr.postal_code);
              return (
                <label 
                  key={addr.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    shipping.address_id === addr.id && !shipping.showNewForm
                      ? 'border-[#3B7AB4] bg-[#E8F2F8]' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping_address"
                    checked={shipping.address_id === addr.id && !shipping.showNewForm}
                    onChange={() => setShipping({ ...shipping, address_id: addr.id, showNewForm: false })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[#1E3A5F]">
                      {addr.company_name || addr.label}
                      {addr.is_default && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Par défaut
                        </span>
                      )}
                      {addrIsOutsideMetro && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                          Hors France métropolitaine
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {addr.address_line1}
                    </div>
                    {addr.attention && (
                      <div className="text-sm text-gray-500">
                        À l'attention de: {addr.attention}
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      {addr.postal_code} {addr.city}, {addr.country || 'France'}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 mb-4">Aucune adresse enregistrée</p>
        )}

        {/* Add New Address Option */}
        <label 
          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
            shipping.showNewForm
              ? 'border-[#3B7AB4] bg-[#E8F2F8]' 
              : 'border-dashed border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            type="radio"
            name="shipping_address"
            checked={shipping.showNewForm}
            onChange={() => setShipping({ ...shipping, showNewForm: true, address_id: '' })}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-[#3B7AB4]">+ Ajouter une nouvelle adresse</div>
            <div className="text-sm text-gray-500">Cette adresse sera enregistrée pour vos futures demandes</div>
          </div>
        </label>
      </div>

      {/* New Address Form */}
      {shipping.showNewForm && (
        <div className="mt-4 p-4 bg-[#F5F5F5] rounded-lg border-l-4 border-[#3B7AB4]">
          <h3 className="font-bold text-[#1E3A5F] mb-4">Nouvelle Adresse</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Nom de la Société *</label>
              <input type="text" value={shipping.newAddress.company_name || ''} onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, company_name: e.target.value } })} placeholder="ex: Lighthouse France" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Adresse *</label>
              <input type="text" value={shipping.newAddress.address_line1} onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, address_line1: e.target.value } })} placeholder="ex: 16 Rue Paul Séjourne" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">À l'attention de *</label>
              <input type="text" value={shipping.newAddress.attention || ''} onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, attention: e.target.value } })} placeholder="Nom du destinataire" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Téléphone *</label>
              <input type="tel" value={shipping.newAddress.phone || ''} onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, phone: e.target.value } })} placeholder="+33 1 23 45 67 89" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Code Postal *</label>
              <input type="text" value={shipping.newAddress.postal_code} onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, postal_code: e.target.value } })} placeholder="ex: 94000" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ville *</label>
              <input type="text" value={shipping.newAddress.city} onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, city: e.target.value } })} placeholder="ex: Créteil" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Nom de l'adresse (pour référence)</label>
              <input type="text" value={shipping.newAddress.label} onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, label: e.target.value } })} placeholder="ex: Bureau Principal, Labo 2, etc." className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>

            {/* Warning for outside France Metropolitan in new address form */}
            {newAddressIsOutsideMetro && (
              <div className="md:col-span-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                <p className="text-amber-800 font-medium text-sm">⚠️ Adresse hors France métropolitaine</p>
                <p className="text-amber-700 text-xs mt-1">
                  Pour les adresses situées en dehors de la France métropolitaine, 
                  les frais d'expédition sont à la charge du client. Vous serez contacté pour 
                  organiser le transport.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning for address outside France Metropolitan */}
      {(isOutsideMetro || newAddressIsOutsideMetro) && (
        <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
          <div className="flex gap-3">
            <span className="text-2xl">🚢</span>
            <div>
              <p className="text-amber-800 font-bold">Expédition hors France métropolitaine</p>
              <p className="text-amber-700 text-sm mt-1">
                L'adresse sélectionnée est située en dehors de la France métropolitaine. 
                Les frais d'expédition pour le retour de vos équipements seront à votre charge. 
                Notre équipe vous contactera pour organiser le transport et vous communiquer les options disponibles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// DEVICE CARD COMPONENT (Updated)
// ============================================
function DeviceCard({ device, updateDevice, updateDeviceMultiple, toggleAccessory, removeDevice, canRemove, savedEquipment, loadFromSaved, addresses, defaultAddressId, returnShipping = 'standard' }) {
  const [charCount, setCharCount] = useState(device.notes.length);
  const [showDifferentAddress, setShowDifferentAddress] = useState(!!device.shipping_address_id);
  const maxChars = 500;

  const handleNotesChange = (e) => {
    const value = e.target.value.slice(0, maxChars);
    updateDevice(device.id, 'notes', value);
    setCharCount(value.length);
  };

  // Handle serial number change with auto-decode
  const handleSerialNumberChange = (e) => {
    const sn = e.target.value;
    
    // Always update the serial number first
    // Then try to decode if it's a valid Lighthouse serial
    if (device.brand === 'Lighthouse') {
      const decoded = decodeSerialNumber(sn);
      if (decoded) {
        // Update serial, model, and device_type together
        updateDeviceMultiple(device.id, {
          serial_number: sn,
          model: decoded.model,
          device_type: decoded.category
        });
        return;
      }
    }
    
    // Just update serial number if no decode
    updateDevice(device.id, 'serial_number', sn);
  };

  return (
    <div className="bg-[#F5F5F5] rounded-lg p-6 border-l-4 border-[#3B7AB4]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-[#1E3A5F]">Appareil #{device.num}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={() => removeDevice(device.id)}
            className="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded hover:bg-white"
          >
            Retirer
          </button>
        )}
      </div>

      {/* Saved Equipment Dropdown */}
      <div className="mb-4 p-3 bg-white rounded-lg border border-[#3B7AB4]/30">
        <label className="block text-sm font-bold text-[#3B7AB4] mb-2">
          📋 Charger un appareil enregistré
        </label>
        <select
          value={device.fromSaved || ''}
          onChange={e => {
            if (e.target.value === 'manual') {
              // Clear form for manual entry
              updateDeviceMultiple(device.id, {
                fromSaved: null,
                brand: 'Lighthouse',
                brand_other: '',
                nickname: '',
                model: '',
                serial_number: '',
                device_type: ''
              });
            } else if (e.target.value) {
              loadFromSaved(device.id, e.target.value);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="manual">✏️ Entrer manuellement un nouvel appareil</option>
          {savedEquipment && savedEquipment.length > 0 && (
            <optgroup label="Mes appareils enregistrés">
              {savedEquipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.nickname ? `${eq.nickname} - ` : ''}{eq.model_name} (SN: {eq.serial_number})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        
        {/* NICKNAME - FIRST */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-1">Surnom de l'appareil (optionnel)</label>
          <input
            type="text"
            value={device.nickname || ''}
            onChange={e => updateDevice(device.id, 'nickname', e.target.value)}
            placeholder="ex: Compteur Salle Blanche 1, Portable Labo 3..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">Pour identifier facilement cet appareil dans vos futures demandes</p>
        </div>

        {/* SERIAL NUMBER - SECOND */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-1">N° de Série *</label>
          <input
            type="text"
            value={device.serial_number}
            onChange={handleSerialNumberChange}
            placeholder="ex: 2101280015"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-mono"
            required
          />
          {device.brand === 'Lighthouse' && device.serial_number && decodeSerialNumber(device.serial_number) && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <span>✓</span> Détecté: {decodeSerialNumber(device.serial_number).model}
            </p>
          )}
        </div>

        {/* Brand */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Marque *</label>
          <select
            value={device.brand}
            onChange={e => {
              updateDevice(device.id, 'brand', e.target.value);
              // Re-decode if switching to Lighthouse
              if (e.target.value === 'Lighthouse' && device.serial_number) {
                const decoded = decodeSerialNumber(device.serial_number);
                if (decoded) {
                  updateDeviceMultiple(device.id, {
                    brand: 'Lighthouse',
                    model: decoded.model,
                    device_type: decoded.category
                  });
                }
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            required
          >
            <option value="Lighthouse">Lighthouse</option>
            <option value="other">Autre</option>
          </select>
        </div>

        {/* Other Brand - shown only when "other" selected */}
        {device.brand === 'other' && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Préciser la Marque *</label>
            <input
              type="text"
              value={device.brand_other}
              onChange={e => updateDevice(device.id, 'brand_other', e.target.value)}
              placeholder="Nom de la marque"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
        )}

        {/* Device Type */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Type d'Appareil *</label>
          <select
            value={device.device_type}
            onChange={e => updateDevice(device.id, 'device_type', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-white ${
              device.device_type ? 'border-green-400 bg-green-50' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Sélectionner le type</option>
            <option value="particle_counter">🔬 Compteur de Particules (Air)</option>
            <option value="bio_collector">🧫 Bio Collecteur</option>
            <option value="liquid_counter">💧 Compteur de Particules (Liquide)</option>
            <option value="temp_humidity">🌡️ Capteur Température/Humidité</option>
            <option value="diluter">🌀 Diluteur de Particules</option>
            <option value="other">📦 Autre</option>
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Modèle *</label>
          <input
            type="text"
            value={device.model}
            onChange={e => updateDevice(device.id, 'model', e.target.value)}
            placeholder="ex: Solair 3100, ApexZ3, etc."
            className={`w-full px-3 py-2 border rounded-lg ${
              device.model ? 'border-green-400 bg-green-50' : 'border-gray-300'
            }`}
            required
          />
        </div>

        {/* Service Type */}
        <div className={device.service_type === 'other' ? '' : 'md:col-span-2'}>
          <label className="block text-sm font-bold text-gray-700 mb-1">Type de Service *</label>
          <select
            value={device.service_type}
            onChange={e => updateDevice(device.id, 'service_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            required
          >
            <option value="">Sélectionner le service</option>
            <option value="calibration">Étalonnage</option>
            <option value="repair">Réparation</option>
            <option value="calibration_repair">Étalonnage + Réparation</option>
            <option value="other">Autre</option>
          </select>
        </div>

        {/* Other Service - shown only when "other" selected */}
        {device.service_type === 'other' && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Préciser le Service *</label>
            <input
              type="text"
              value={device.service_other}
              onChange={e => updateDevice(device.id, 'service_other', e.target.value)}
              placeholder="Type de service demandé"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
        )}

        {/* Notes - required only for repair */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Notes / Commentaires {(device.service_type === 'repair' || device.service_type === 'calibration_repair' || device.service_type === 'other') ? '*' : '(optionnel)'}
          </label>
          <textarea
            value={device.notes}
            onChange={handleNotesChange}
            placeholder={device.service_type === 'repair' || device.service_type === 'calibration_repair' 
              ? "Décrivez le problème rencontré avec cet appareil..." 
              : "Informations complémentaires (optionnel)..."}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
            required={device.service_type === 'repair' || device.service_type === 'calibration_repair' || device.service_type === 'other'}
          />
          <p className="text-sm text-gray-500 mt-1">
            {charCount}/{maxChars} caractères
          </p>
        </div>

        {/* Accessories */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-2">Accessoires Inclus</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'charger', label: 'Chargeur' },
              { key: 'battery', label: 'Batterie' },
              { key: 'powerCable', label: 'Câble d\'alimentation' },
              { key: 'carryingCase', label: 'Mallette' }
            ].map(acc => (
              <label key={acc.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={device.accessories.includes(acc.key)}
                  onChange={() => toggleAccessory(device.id, acc.key)}
                  className="w-4 h-4 rounded border-gray-300 text-[#3B7AB4]"
                />
                <span className="text-sm">{acc.label}</span>
              </label>
            ))}
          </div>
          <input
            type="text"
            value={device.other_accessories}
            onChange={e => updateDevice(device.id, 'other_accessories', e.target.value)}
            placeholder="Autres accessoires (préciser)"
            className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Photo Upload */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-1">Photos (optionnel)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
          />
          <p className="text-sm text-gray-500 mt-1">
            Ajoutez des photos de l'appareil montrant les problèmes ou son état
          </p>
        </div>

        {/* Auto-save notice */}
        {!device.fromSaved && (
          <div className="md:col-span-2 mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">✅ Cet appareil sera automatiquement enregistré dans vos équipements</p>
          </div>
        )}

        {device.fromSaved && (
          <div className="md:col-span-2 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">✓ Appareil chargé depuis vos équipements enregistrés</p>
          </div>
        )}

        {/* Per-Device Shipping Address */}
        <div className="md:col-span-2 mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <label className="flex items-center gap-3 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={showDifferentAddress}
              onChange={e => {
                setShowDifferentAddress(e.target.checked);
                if (!e.target.checked) {
                  updateDeviceMultiple(device.id, { shipping_address_id: null, custom_shipping_address: null });
                }
              }}
              className="w-5 h-5 rounded border-amber-400 text-amber-600"
            />
            <div>
              <span className="font-medium text-amber-800">📍 Envoyer à une adresse différente</span>
              <p className="text-xs text-amber-600">Cet appareil sera retourné à une autre adresse que l'adresse de retour principale</p>
            </div>
          </label>
          
          {showDifferentAddress && (
            <div className="mt-2 space-y-2">
              <select
                value={device.shipping_address_id === 'new' ? 'new' : (device.shipping_address_id || '')}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'new') {
                    updateDeviceMultiple(device.id, { shipping_address_id: 'new', custom_shipping_address: { company_name: '', attention: '', address_line1: '', city: '', postal_code: '', country: 'France', phone: '' } });
                  } else {
                    updateDeviceMultiple(device.id, { shipping_address_id: val || null, custom_shipping_address: null });
                  }
                }}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white"
              >
                <option value="">-- Sélectionner une adresse --</option>
                {addresses.filter(a => !a.is_billing).map(addr => (
                  <option key={addr.id} value={addr.id}>
                    {addr.company_name || addr.label} - {addr.address_line1}, {addr.postal_code} {addr.city} {addr.is_default ? '(Par défaut)' : ''}
                  </option>
                ))}
                <option value="new">➕ Nouvelle adresse...</option>
              </select>
              
              {device.shipping_address_id === 'new' && device.custom_shipping_address && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-white rounded-lg border border-amber-200">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-0.5">Société *</label>
                    <input type="text" value={device.custom_shipping_address.company_name} onChange={e => updateDevice(device.id, 'custom_shipping_address', { ...device.custom_shipping_address, company_name: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="Nom de la société" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-0.5">À l'attention de *</label>
                    <input type="text" value={device.custom_shipping_address.attention} onChange={e => updateDevice(device.id, 'custom_shipping_address', { ...device.custom_shipping_address, attention: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="Nom du destinataire" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-0.5">Adresse *</label>
                    <input type="text" value={device.custom_shipping_address.address_line1} onChange={e => updateDevice(device.id, 'custom_shipping_address', { ...device.custom_shipping_address, address_line1: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="Rue, numéro" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Code postal *</label>
                    <input type="text" value={device.custom_shipping_address.postal_code} onChange={e => updateDevice(device.id, 'custom_shipping_address', { ...device.custom_shipping_address, postal_code: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="75001" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Ville *</label>
                    <input type="text" value={device.custom_shipping_address.city} onChange={e => updateDevice(device.id, 'custom_shipping_address', { ...device.custom_shipping_address, city: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="Paris" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Pays</label>
                    <input type="text" value={device.custom_shipping_address.country} onChange={e => updateDevice(device.id, 'custom_shipping_address', { ...device.custom_shipping_address, country: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Téléphone *</label>
                    <input type="text" value={device.custom_shipping_address.phone} onChange={e => updateDevice(device.id, 'custom_shipping_address', { ...device.custom_shipping_address, phone: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="+33 1 23 45 67 89" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SETTINGS PAGE
// ============================================
function SettingsPage({ profile, addresses, requests, t, notify, refresh, lang, setLang, perms, setShowLegalPage }) {
  const [activeSection, setActiveSection] = useState('profile');
  
  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || ''
  });
  
  // Company editing
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: profile?.companies?.name || '',
    billing_address: profile?.companies?.billing_address || '',
    billing_city: profile?.companies?.billing_city || '',
    billing_postal_code: profile?.companies?.billing_postal_code || ''
  });
  
  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '', new: '', confirm: ''
  });
  
  // Address management
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addingBillingAddress, setAddingBillingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '', company_name: '', attention: '', address_line1: '', address_line2: '', city: '', postal_code: '', country: 'France', phone: '', is_default: false, is_billing: false, siret: '', tva_number: '', chorus_invoicing: false, chorus_service_code: ''
  });
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    email_status_updates: true,
    email_quotes: true,
    email_shipping: true,
    email_marketing: false
  });
  
  // Team management
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', access_level: 'viewer' });
  const [lastInviteLink, setLastInviteLink] = useState('');
  const [loadingTeam, setLoadingTeam] = useState(false);
  
  const [saving, setSaving] = useState(false);
  
  // Check if user is admin
  const isAdmin = profile?.role === 'admin';
  
  // Load team members (reloads every time Team tab is selected)
  useEffect(() => {
    if (activeSection !== 'team') return;
    const loadTeam = async () => {
      if (!profile?.company_id || !isAdmin) return;
      setLoadingTeam(true);
      
      // Load team members
      const { data: members } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, invitation_status, can_view, can_request, can_invoice, created_at, gdpr_erased_at')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: true });
      
      if (members) setTeamMembers(members);
      
      // Load pending invites
      const { data: invites } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('company_id', profile.company_id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());
      
      // Filter out invites where user already has a profile (account created)
      const memberEmails = (members || []).map(m => m.email?.toLowerCase());
      const trulyPending = (invites || []).filter(i => !memberEmails.includes(i.email?.toLowerCase()));
      setPendingInvites(trulyPending);
      setLoadingTeam(false);
    };
    loadTeam();
  }, [profile?.company_id, isAdmin, activeSection]);

  // Invite team member
  // Map access level to permissions
  const accessLevelToPerms = (level) => {
    switch (level) {
      case 'admin': return { role: 'admin', can_view: true, can_request: true, can_invoice: true };
      case 'billing': return { role: 'customer', can_view: true, can_request: true, can_invoice: true };
      case 'requester': return { role: 'customer', can_view: true, can_request: true, can_invoice: false };
      case 'viewer': default: return { role: 'customer', can_view: true, can_request: false, can_invoice: false };
    }
  };

  const getAccessLevel = (member) => {
    if (member.role === 'admin') return 'admin';
    if (member.can_invoice) return 'billing';
    if (member.can_request) return 'requester';
    return 'viewer';
  };

  const accessLevelLabels = {
    viewer: { label: '👁 Consultation', desc: 'Voir les demandes et l\'historique, sans pouvoir soumettre ou approuver', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    requester: { label: '📝 Demandes', desc: 'Consulter + soumettre et approuver des demandes de service', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    billing: { label: '💳 Facturation', desc: 'Consulter + soumettre des demandes + accès aux factures', color: 'bg-amber-100 text-amber-700 border-amber-300' },
    admin: { label: '👑 Administrateur', desc: 'Accès complet : gestion de l\'équipe, factures, demandes', color: 'bg-purple-100 text-purple-700 border-purple-300' }
  };

  const inviteTeamMember = async (e) => {
    e.preventDefault();
    if (!inviteData.email) {
      notify('Veuillez entrer un email', 'error');
      return;
    }
    
    setSaving(true);
    
    const token = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const permsForLevel = accessLevelToPerms(inviteData.access_level);
    
    // 1. Create team_invitation record
    const { error } = await supabase.from('team_invitations').insert({
      company_id: profile.company_id,
      email: inviteData.email.toLowerCase(),
      role: permsForLevel.role,
      can_view: permsForLevel.can_view,
      can_request: permsForLevel.can_request,
      can_invoice: permsForLevel.can_invoice,
      invited_by: profile.id,
      token,
      expires_at: expiresAt.toISOString()
    });
    
    if (error) {
      setSaving(false);
      if (error.code === '23505') {
        notify('Une invitation pour cet email existe déjà', 'error');
      } else {
        notify(`Erreur: ${error.message}`, 'error');
      }
      return;
    }

    // 2. Send invite email via server-side API route
    const redirectUrl = window.location.origin + '/customer';
    
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: inviteData.email.toLowerCase(),
          redirectUrl 
        })
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        if (result.alreadyExists) {
          notify(`Invitation créée pour ${inviteData.email}. Cet utilisateur a déjà un compte — il peut se connecter directement.`);
        } else {
          notify(`Email d'invitation envoyé à ${inviteData.email} !`);
        }
      } else {
        // API failed - show manual link as fallback
        console.error('[Invite] API error:', result.error);
        const baseUrl = window.location.origin + '/customer';
        const inviteLink = `${baseUrl}?invite=${token}&email=${encodeURIComponent(inviteData.email.toLowerCase())}`;
        setLastInviteLink(inviteLink);
        notify(`Invitation créée. L'envoi automatique a échoué (${result.error || 'erreur serveur'}) — partagez le lien manuellement.`);
      }
    } catch (fetchErr) {
      console.error('[Invite] Fetch error:', fetchErr);
      const baseUrl = window.location.origin + '/customer';
      const inviteLink = `${baseUrl}?invite=${token}&email=${encodeURIComponent(inviteData.email.toLowerCase())}`;
      setLastInviteLink(inviteLink);
      notify(`Invitation créée. Partagez le lien manuellement.`);
    }
    
    setSaving(false);
    setInviteData({ email: '', access_level: 'viewer' });
    setShowInviteModal(false);
    
    const { data: invites } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('company_id', profile.company_id)
      .is('accepted_at', null);
    if (invites) setPendingInvites(invites);
  };

  // Toggle member permission
  const setMemberAccessLevel = async (memberId, level) => {
    if (memberId === profile.id) {
      notify('Vous ne pouvez pas modifier vos propres permissions', 'error');
      return;
    }
    const permsForLevel = accessLevelToPerms(level);
    
    if (level === 'admin') {
      if (!confirm('Promouvoir ce membre en administrateur? Il pourra gérer toute l\'équipe.')) return;
    }

    try {
      const res = await fetch('/api/update-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          adminId: profile.id,
          companyId: profile.company_id,
          permissions: permsForLevel
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        notify('Niveau d\'accès mis à jour!');
        setTeamMembers(teamMembers.map(m => m.id === memberId ? { ...m, ...permsForLevel } : m));
      } else {
        notify(`Erreur: ${result.error || 'Échec de la mise à jour'}`, 'error');
      }
    } catch (err) {
      notify(`Erreur: ${err.message}`, 'error');
    }
  };

  // Deactivate/reactivate team member
  const toggleMemberStatus = async (memberId, currentStatus) => {
    if (memberId === profile.id) {
      notify('Vous ne pouvez pas désactiver votre propre compte', 'error');
      return;
    }
    
    const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    
    // Prevent deactivating the last admin
    const member = teamMembers.find(m => m.id === memberId);
    if (newStatus === 'deactivated' && member?.role === 'admin') {
      const otherActiveAdmins = teamMembers.filter(m => m.role === 'admin' && m.id !== memberId && m.invitation_status === 'active');
      if (otherActiveAdmins.length === 0) {
        notify('Impossible: il doit rester au moins un administrateur actif', 'error');
        return;
      }
      if (!confirm(`${member.full_name} est administrateur. Voulez-vous vraiment désactiver ce compte?`)) return;
    }
    
    try {
      const res = await fetch('/api/update-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          adminId: profile.id,
          companyId: profile.company_id,
          permissions: { invitation_status: newStatus }
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        notify(newStatus === 'active' ? 'Compte réactivé!' : 'Compte désactivé!');
        setTeamMembers(teamMembers.map(m => m.id === memberId ? { ...m, invitation_status: newStatus } : m));
      } else {
        notify(`Erreur: ${result.error}`, 'error');
      }
    } catch (err) {
      notify(`Erreur: ${err.message}`, 'error');
    }
  };

  // Cancel pending invite
  const cancelInvite = async (inviteId) => {
    const { error } = await supabase.from('team_invitations').delete().eq('id', inviteId);
    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify('Invitation annulée');
      setPendingInvites(pendingInvites.filter(i => i.id !== inviteId));
    }
  };

  const resendInvite = async (invite) => {
    try {
      const redirectUrl = window.location.origin + '/customer';
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: invite.email,
          redirectUrl,
          resend: true
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        // Also refresh the expiry on the invitation record
        await supabase.from('team_invitations')
          .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
          .eq('id', invite.id);
        notify(`Invitation renvoyée à ${invite.email} !`);
      } else {
        notify(`Erreur: ${result.error || 'Échec du renvoi'}`, 'error');
      }
    } catch (err) {
      notify(`Erreur: ${err.message}`, 'error');
    }
  };

  // Save profile
  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileData.full_name,
        phone: profileData.phone
      })
      .eq('id', profile.id);
    
    setSaving(false);
    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify('Profil mis à jour!');
      setEditingProfile(false);
      refresh();
    }
  };

  // Save company
  const saveCompany = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('companies')
      .update(companyData)
      .eq('id', profile.company_id);
    
    setSaving(false);
    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify('Entreprise mise à jour!');
      setEditingCompany(false);
      refresh();
    }
  };


  // Change password
  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      notify('Les mots de passe ne correspondent pas', 'error');
      return;
    }
    if (passwordData.new.length < 8 || !/[A-Z]/.test(passwordData.new) || !/[0-9]/.test(passwordData.new) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.new)) {
      notify('Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial', 'error');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordData.new
    });
    
    setSaving(false);
    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify('Mot de passe modifié!');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    }
  };

  // Save address
  const saveAddress = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // If setting as default, unset others first
    if (newAddress.is_default) {
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('company_id', profile.company_id);
    }
    
    let error;
    if (editingAddress) {
      const result = await supabase
        .from('shipping_addresses')
        .update({ ...newAddress })
        .eq('id', editingAddress.id);
      error = result.error;
    } else {
      const result = await supabase.from('shipping_addresses').insert({
        ...newAddress,
        company_id: profile.company_id
      });
      error = result.error;
    }
    
    setSaving(false);
    
    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
      return;
    }
    
    notify(editingAddress ? 'Adresse modifiée!' : 'Adresse ajoutée!');
    setShowAddAddress(false);
    setEditingAddress(null);
    setAddingBillingAddress(false);
    setNewAddress({ label: '', company_name: '', attention: '', address_line1: '', address_line2: '', city: '', postal_code: '', country: 'France', phone: '', is_default: false, is_billing: false, siret: '', tva_number: '', chorus_invoicing: false, chorus_service_code: '' });
    refresh();
  };

  const deleteAddress = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette adresse?')) return;
    await supabase.from('shipping_addresses').delete().eq('id', id);
    notify('Adresse supprimée');
    refresh();
  };

  const setDefault = async (id) => {
    await supabase.from('shipping_addresses').update({ is_default: false }).eq('company_id', profile.company_id);
    await supabase.from('shipping_addresses').update({ is_default: true }).eq('id', id);
    notify('Adresse par défaut mise à jour');
    refresh();
  };

  const openEditAddress = (addr) => {
    setEditingAddress(addr);
    setNewAddress({
      label: addr.label || '',
      company_name: addr.company_name || '',
      attention: addr.attention || '',
      address_line1: addr.address_line1 || '',
      address_line2: addr.address_line2 || '',
      city: addr.city || '',
      postal_code: addr.postal_code || '',
      country: addr.country || 'France',
      phone: addr.phone || '',
      is_default: addr.is_default || false,
      is_billing: addr.is_billing || false,
      siret: addr.siret || '',
      tva_number: addr.tva_number || '',
      chorus_invoicing: addr.chorus_invoicing || false,
      chorus_service_code: addr.chorus_service_code || ''
    });
    setAddingBillingAddress(!!addr.is_billing);
    setShowAddAddress(true);
  };

  const sections = [
    { id: 'profile', label: lang === 'en' ? 'Profile' : 'Profil', icon: '👤' },
    { id: 'company', label: lang === 'en' ? 'Company & Addresses' : 'Entreprise & Adresses', icon: '🏢' },
    ...(isAdmin ? [{ id: 'team', label: lang === 'en' ? 'Team' : 'Équipe', icon: '👥' }] : []),
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: lang === 'en' ? 'Security' : 'Sécurité', icon: '🔒' }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1E3A5F]">Paramètres</h1>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeSection === section.id
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Informations personnelles</h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="px-4 py-2 text-[#3B7AB4] border border-[#3B7AB4] rounded-lg hover:bg-[#E8F2F8]"
              >
                ✏️ Modifier
              </button>
            )}
          </div>
          <div className="p-6">
            {editingProfile ? (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+33 1 23 45 67 89"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileData({
                        full_name: profile?.full_name || '',
                        email: profile?.email || '',
                        phone: profile?.phone || ''
                      });
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Nom complet</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Membre depuis</p>
                  <p className="font-medium text-[#1E3A5F]">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Company Section */}
      {activeSection === 'company' && (
        <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E3A5F]">🏢 Informations entreprise</h2>
            {!editingCompany && (
              <button
                onClick={() => setEditingCompany(true)}
                className="px-4 py-2 text-[#3B7AB4] border border-[#3B7AB4] rounded-lg hover:bg-[#E8F2F8]"
              >
                ✏️ Modifier
              </button>
            )}
          </div>
          <div className="p-6">
            {editingCompany ? (
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise *</label>
                  <input
                    type="text"
                    value={companyData.name}
                    onChange={e => setCompanyData({ ...companyData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de facturation</label>
                  <input
                    type="text"
                    value={companyData.billing_address}
                    onChange={e => setCompanyData({ ...companyData, billing_address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                    <input
                      type="text"
                      value={companyData.billing_postal_code}
                      onChange={e => setCompanyData({ ...companyData, billing_postal_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                    <input
                      type="text"
                      value={companyData.billing_city}
                      onChange={e => setCompanyData({ ...companyData, billing_city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setEditingCompany(false);
                      setCompanyData({
                        name: profile?.companies?.name || '',
                        billing_address: profile?.companies?.billing_address || '',
                        billing_city: profile?.companies?.billing_city || '',
                        billing_postal_code: profile?.companies?.billing_postal_code || ''
                      });
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={saveCompany}
                    disabled={saving}
                    className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Nom de l'entreprise</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.companies?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Adresse du siège</p>
                  <p className="font-medium text-[#1E3A5F]">
                    {profile?.companies?.billing_address || '—'}
                    {profile?.companies?.billing_postal_code && `, ${profile?.companies?.billing_postal_code}`}
                    {profile?.companies?.billing_city && ` ${profile?.companies?.billing_city}`}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-400 italic">Les identifiants SIRET, TVA et Chorus Pro sont gérés par adresse de facturation ci-dessous.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#1E3A5F]">📦 Adresses de livraison / retour</h2>
              <p className="text-sm text-gray-500">Adresses pour la réception et le retour des équipements</p>
            </div>
            <button
              onClick={() => {
                setEditingAddress(null);
                setAddingBillingAddress(false);
                setNewAddress({ label: '', company_name: '', attention: '', address_line1: '', address_line2: '', city: '', postal_code: '', country: 'France', phone: '', is_default: false, is_billing: false, siret: '', tva_number: '', chorus_invoicing: false, chorus_service_code: '' });
                setShowAddAddress(true);
              }}
              className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F]"
            >
              + Ajouter une adresse
            </button>
          </div>
          
          <div className="p-6">
            {addresses.filter(a => !a.is_billing).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">📍</p>
                <p>Aucune adresse de livraison</p>
                <p className="text-sm">Ajoutez une adresse pour vos livraisons</p>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.filter(a => !a.is_billing).map(addr => (
                  <div 
                    key={addr.id}
                    className={`p-4 rounded-xl border-2 ${addr.is_default ? 'border-[#3B7AB4] bg-[#E8F2F8]' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-[#1E3A5F]">{addr.label}</h3>
                          {addr.is_default && (
                            <span className="px-2 py-0.5 bg-[#3B7AB4] text-white text-xs rounded-full">
                              Par défaut
                            </span>
                          )}
                        </div>
                        {addr.company_name && <p className="text-sm text-gray-700 font-medium">{addr.company_name}</p>}
                        {addr.attention && <p className="text-sm text-gray-600">À l'attention de: {addr.attention}</p>}
                        <p className="text-sm text-gray-700">{addr.address_line1}</p>
                        {addr.address_line2 && <p className="text-sm text-gray-700">{addr.address_line2}</p>}
                        <p className="text-sm text-gray-700">{addr.postal_code} {addr.city}, {addr.country || 'France'}</p>
                        {addr.phone && <p className="text-sm text-gray-500 mt-1">📞 {addr.phone}</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openEditAddress(addr)}
                          className="px-3 py-1.5 text-sm text-[#3B7AB4] border border-[#3B7AB4] rounded-lg hover:bg-[#E8F2F8]"
                        >
                          ✏️ Modifier
                        </button>
                        {!addr.is_default && (
                          <button
                            onClick={() => setDefault(addr.id)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                          >
                            ⭐ Par défaut
                          </button>
                        )}
                        <button
                          onClick={() => deleteAddress(addr.id)}
                          className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Billing Addresses - admin/canInvoice only */}
        {(perms?.isAdmin || perms?.canInvoice) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#1E3A5F]">💳 Adresses de facturation</h2>
              <p className="text-xs text-gray-400 mt-0.5">Adresses utilisées pour les devis et factures</p>
            </div>
            <button
              onClick={() => {
                setEditingAddress(null);
                setAddingBillingAddress(true);
                setNewAddress({ label: '', company_name: '', attention: '', address_line1: '', address_line2: '', city: '', postal_code: '', country: 'France', phone: '', is_default: false, is_billing: true, siret: '', tva_number: '', chorus_invoicing: false, chorus_service_code: '' });
                setShowAddAddress(true);
              }}
              className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F]"
            >
              + Ajouter
            </button>
          </div>
          <div className="p-6">
            {addresses.filter(a => a.is_billing).length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p>Aucune adresse de facturation</p>
                <p className="text-xs mt-1">{"L'adresse du siège sera utilisée par défaut"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.filter(a => a.is_billing).map(addr => (
                  <div key={addr.id} className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-[#1E3A5F] mb-1">{addr.label}</h3>
                        {addr.company_name && <p className="text-sm text-gray-700 font-medium">{addr.company_name}</p>}
                        {addr.attention && <p className="text-sm text-gray-600">Attn: {addr.attention}</p>}
                        <p className="text-sm text-gray-700">{addr.address_line1}</p>
                        {addr.address_line2 && <p className="text-sm text-gray-700">{addr.address_line2}</p>}
                        <p className="text-sm text-gray-700">{addr.postal_code} {addr.city}, {addr.country || 'France'}</p>
                        {addr.phone && <p className="text-sm text-gray-500 mt-1">📞 {addr.phone}</p>}
                        {/* SIRET / TVA / Chorus */}
                        {(addr.siret || addr.tva_number) && (
                          <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-3">
                            {addr.siret && <span className="text-xs text-gray-500">SIRET: <span className="font-mono font-medium text-gray-700">{addr.siret}</span></span>}
                            {addr.tva_number && <span className="text-xs text-gray-500">TVA: <span className="font-mono font-medium text-gray-700">{addr.tva_number}</span></span>}
                          </div>
                        )}
                        {addr.chorus_invoicing && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">📋 Chorus Pro</span>
                            {addr.chorus_service_code && <span className="text-xs text-gray-500">Service: <span className="font-mono">{addr.chorus_service_code}</span></span>}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => openEditAddress(addr)} className="px-3 py-1.5 text-sm text-[#3B7AB4] border border-[#3B7AB4] rounded-lg hover:bg-[#E8F2F8]">✏️</button>
                        <button onClick={() => deleteAddress(addr.id)} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        </div>
      )}

      {/* Team Section - Admin Only */}
      {activeSection === 'team' && isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#1E3A5F]">Gestion de l'équipe</h2>
              <p className="text-sm text-gray-500">Invitez des membres et gérez leurs accès</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F]"
            >
              + Inviter un membre
            </button>
          </div>
          
          <div className="p-6">
            {loadingTeam ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-[#3B7AB4] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current Team Members */}
                <div>
                  <h3 className="font-medium text-[#1E3A5F] mb-3">Membres actifs ({teamMembers.filter(m => m.invitation_status === 'active').length})</h3>
                  <div className="space-y-3">
                    {teamMembers.filter(m => m.invitation_status === 'active').map(member => (
                      <div key={member.id} className={`p-4 rounded-xl border-2 ${member.id === profile.id ? 'border-[#3B7AB4] bg-[#E8F2F8]' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold">
                              {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-[#1E3A5F]">
                                {member.full_name}
                                {member.id === profile.id && <span className="ml-2 text-xs text-gray-400">(vous)</span>}
                                {member.role === 'admin' && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">👑 Admin</span>}
                              </p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                          {member.id !== profile.id && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Access level selector */}
                              <select
                                value={getAccessLevel(member)}
                                onChange={e => {
                                  const newLevel = e.target.value;
                                  if (newLevel === 'admin' && getAccessLevel(member) !== 'admin') {
                                    setMemberAccessLevel(member.id, newLevel);
                                  } else if (newLevel !== 'admin' && getAccessLevel(member) === 'admin') {
                                    const otherAdmins = teamMembers.filter(m => m.role === 'admin' && m.id !== member.id && m.invitation_status === 'active');
                                    if (otherAdmins.length === 0) {
                                      notify('Impossible: il doit rester au moins un administrateur', 'error');
                                      return;
                                    }
                                    if (!confirm('Rétrograder cet administrateur?')) return;
                                    setMemberAccessLevel(member.id, newLevel);
                                  } else {
                                    setMemberAccessLevel(member.id, newLevel);
                                  }
                                }}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg border cursor-pointer ${accessLevelLabels[getAccessLevel(member)].color}`}
                              >
                                <option value="viewer">👁 Consultation</option>
                                <option value="requester">📝 Demandes</option>
                                <option value="billing">💳 Facturation</option>
                                <option value="admin">👑 Admin</option>
                              </select>
                              <button
                                onClick={() => toggleMemberStatus(member.id, member.invitation_status)}
                                className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                              >
                                Désactiver
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deactivated Members */}
                {teamMembers.filter(m => m.invitation_status === 'deactivated').length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-500 mb-3">Comptes désactivés</h3>
                    <div className="space-y-2">
                      {teamMembers.filter(m => m.invitation_status === 'deactivated').map(member => (
                        <div key={member.id} className="p-3 rounded-lg bg-gray-100 border border-gray-200 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-500">{member.full_name}</p>
                            <p className="text-sm text-gray-400">{member.email}</p>
                          </div>
                          <button
                            onClick={() => toggleMemberStatus(member.id, member.invitation_status)}
                            className="px-3 py-1.5 text-sm text-green-600 border border-green-200 rounded-lg hover:bg-green-50"
                          >
                            Réactiver
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GDPR Erased Members */}
                {teamMembers.filter(m => m.invitation_status === 'gdpr_erased').length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-400 mb-3">Comptes supprimés (RGPD)</h3>
                    <div className="space-y-2">
                      {teamMembers.filter(m => m.invitation_status === 'gdpr_erased').map(member => (
                        <div key={member.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                          <p className="text-gray-400 text-sm">{member.full_name || 'Utilisateur supprimé'}</p>
                          <p className="text-xs text-gray-300">Données anonymisées — {member.gdpr_erased_at ? new Date(member.gdpr_erased_at).toLocaleDateString('fr-FR') : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Invitations */}
                {pendingInvites.length > 0 && (
                  <div>
                    <h3 className="font-medium text-amber-600 mb-3">Invitations en attente ({pendingInvites.length})</h3>
                    <div className="space-y-2">
                      {pendingInvites.map(invite => (
                        <div key={invite.id} className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-amber-800">{invite.email}</p>
                            <p className="text-xs text-amber-600">
                              {accessLevelLabels[invite.role === 'admin' ? 'admin' : invite.can_invoice ? 'billing' : invite.can_request ? 'requester' : 'viewer']?.label || '👁 Consultation'}
                              {' • '}Expire: {new Date(invite.expires_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => resendInvite(invite)}
                              className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                            >
                              Renvoyer
                            </button>
                            <button
                              onClick={() => cancelInvite(invite.id)}
                              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last invite link */}
                {lastInviteLink && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="font-medium text-amber-700 mb-2">⚠️ Lien d'invitation (secours)</p>
                    <p className="text-sm text-amber-600 mb-2">L'envoi automatique a échoué. Partagez ce lien manuellement :</p>
                    <div className="flex gap-2">
                      <input type="text" readOnly value={lastInviteLink} className="flex-1 px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg font-mono" />
                      <button
                        onClick={() => { navigator.clipboard.writeText(lastInviteLink); notify('Lien copié!'); }}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Language Section */}
      {activeSection === 'notifications' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Préférences de notification</h2>
            <p className="text-sm text-gray-500">Choisissez les notifications que vous souhaitez recevoir</p>
          </div>
          <div className="p-6 space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="font-medium text-[#1E3A5F]">Mises à jour de statut</p>
                <p className="text-sm text-gray-500">Recevoir un email quand le statut d'une demande change</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.email_status_updates}
                onChange={e => setNotifications({ ...notifications, email_status_updates: e.target.checked })}
                className="w-5 h-5 text-[#3B7AB4] rounded"
              />
            </label>
            
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="font-medium text-[#1E3A5F]">Devis et factures</p>
                <p className="text-sm text-gray-500">Recevoir un email quand un devis ou une facture est disponible</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.email_quotes}
                onChange={e => setNotifications({ ...notifications, email_quotes: e.target.checked })}
                className="w-5 h-5 text-[#3B7AB4] rounded"
              />
            </label>
            
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="font-medium text-[#1E3A5F]">Notifications d'expédition</p>
                <p className="text-sm text-gray-500">Recevoir un email avec le numéro de suivi lors de l'expédition</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.email_shipping}
                onChange={e => setNotifications({ ...notifications, email_shipping: e.target.checked })}
                className="w-5 h-5 text-[#3B7AB4] rounded"
              />
            </label>
            
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="font-medium text-[#1E3A5F]">Communications marketing</p>
                <p className="text-sm text-gray-500">Recevoir des informations sur nos nouveaux produits et services</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.email_marketing}
                onChange={e => setNotifications({ ...notifications, email_marketing: e.target.checked })}
                className="w-5 h-5 text-[#3B7AB4] rounded"
              />
            </label>
            
            <div className="pt-4">
              <button
                onClick={() => notify('Préférences enregistrées!')}
                className="px-6 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F]"
              >
                Enregistrer les préférences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Section */}
      {activeSection === 'security' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Sécurité du compte</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Password Change */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-[#1E3A5F]">Mot de passe</p>
                <p className="text-sm text-gray-500">Modifiez votre mot de passe régulièrement pour plus de sécurité</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 text-[#3B7AB4] border border-[#3B7AB4] rounded-lg hover:bg-[#E8F2F8]"
              >
                Modifier
              </button>
            </div>
            
            {/* Last Login */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-[#1E3A5F]">Dernière connexion</p>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            {/* GDPR / Data Rights */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-medium text-[#1E3A5F] mb-4">🔐 Données personnelles (RGPD)</h3>
              
              {/* Data Export */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-3">
                <div>
                  <p className="font-medium text-[#1E3A5F]">Exporter mes données</p>
                  <p className="text-sm text-gray-500">Téléchargez une copie de toutes vos données personnelles (Article 20 RGPD)</p>
                </div>
                <button
                  onClick={async () => {
                    notify('Préparation de l\'export...');
                    const exportData = {
                      exported_at: new Date().toISOString(),
                      profile: {
                        name: profile?.full_name,
                        email: profile?.email,
                        phone: profile?.phone,
                        role: profile?.role,
                        created_at: profile?.created_at
                      },
                      company: profile?.companies ? {
                        name: profile.companies.name,
                        country: profile.companies.country
                      } : null,
                      addresses: addresses?.map(a => ({
                        label: a.label, company_name: a.company_name, address: a.address_line1, city: a.city,
                        postal_code: a.postal_code, country: a.country, type: a.is_billing ? 'billing' : 'shipping',
                        ...(a.is_billing ? { siret: a.siret, tva: a.tva_number, chorus_invoicing: a.chorus_invoicing, chorus_service_code: a.chorus_service_code } : {})
                      })) || [],
                      service_requests: requests?.map(r => ({
                        id: r.id, number: r.request_number, status: r.status,
                        created_at: r.created_at, devices: r.request_devices?.length || 0
                      })) || []
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `lighthouse-france-donnees-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    notify('Export téléchargé!');
                  }}
                  className="px-4 py-2 text-[#3B7AB4] border border-[#3B7AB4] rounded-lg hover:bg-[#E8F2F8] whitespace-nowrap"
                >
                  Télécharger
                </button>
              </div>

              {/* Legal Links */}
              {setShowLegalPage && (
                <div className="flex flex-wrap gap-3 mb-6">
                  <button onClick={() => setShowLegalPage('privacy')} className="text-sm text-[#3B7AB4] hover:underline">
                    📄 Politique de confidentialité
                  </button>
                  <button onClick={() => setShowLegalPage('mentions')} className="text-sm text-[#3B7AB4] hover:underline">
                    📋 Mentions légales
                  </button>
                </div>
              )}
            </div>
            
            {/* Danger Zone */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-medium text-red-600 mb-4">Zone de danger</h3>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="font-medium text-red-700">Désactiver le compte</p>
                <p className="text-sm text-red-600 mb-3">Votre compte sera désactivé et vous ne pourrez plus vous connecter. {"L'historique"} de vos demandes et données sera conservé. Contactez votre administrateur pour réactiver votre accès.</p>
                <button 
                  onClick={async () => {
                    if (!confirm('Êtes-vous sûr de vouloir désactiver votre compte? Vous ne pourrez plus vous connecter.')) return;
                    if (!confirm('Dernière confirmation: votre accès sera coupé immédiatement.')) return;
                    
                    if (profile?.role === 'admin') {
                      const { data: otherAdmins } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('company_id', profile.company_id)
                        .eq('role', 'admin')
                        .eq('invitation_status', 'active')
                        .neq('id', profile.id);
                      if (!otherAdmins || otherAdmins.length === 0) {
                        notify('Impossible: vous êtes le seul administrateur. Promouvez un autre membre avant de désactiver votre compte.', 'error');
                        return;
                      }
                    }
                    
                    await supabase.from('profiles').update({ invitation_status: 'deactivated' }).eq('id', profile.id);
                    await supabase.auth.signOut({ scope: 'local' });
                    window.location.href = '/';
                  }}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-100"
                >
                  Désactiver mon compte
                </button>
              </div>

              {/* GDPR Data Erasure */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200 mt-3">
                <p className="font-medium text-red-700">Suppression des données personnelles (RGPD Art. 17)</p>
                <p className="text-sm text-red-600 mb-3">
                  Vos données personnelles (nom, email, téléphone) seront anonymisées. {"L'historique"} des demandes de service, certificats {"d'étalonnage"}, factures et données de traçabilité sera conservé conformément à nos obligations légales (Code de Commerce — 10 ans, ISO 17025).
                </p>
                <button 
                  onClick={async () => {
                    if (!confirm('Êtes-vous sûr? Vos données personnelles seront anonymisées de façon irréversible. Les données liées à vos demandes de service, certificats et factures seront conservées conformément à la loi.')) return;
                    if (!confirm('Dernière confirmation: cette action est IRRÉVERSIBLE. Votre nom, email et téléphone seront supprimés.')) return;
                    
                    if (profile?.role === 'admin') {
                      const { data: otherAdmins } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('company_id', profile.company_id)
                        .eq('role', 'admin')
                        .eq('invitation_status', 'active')
                        .neq('id', profile.id);
                      if (!otherAdmins || otherAdmins.length === 0) {
                        notify('Impossible: vous êtes le seul administrateur. Promouvez un autre membre avant de supprimer vos données.', 'error');
                        return;
                      }
                    }
                    
                    const anonId = profile.id.slice(0, 8);
                    
                    await supabase.from('profiles').update({
                      full_name: 'Utilisateur supprimé',
                      email: `supprime_${anonId}@anonymise.local`,
                      phone: null,
                      invitation_status: 'gdpr_erased',
                      gdpr_erased_at: new Date().toISOString()
                    }).eq('id', profile.id);
                    
                    await supabase.from('request_messages').update({
                      sender_name: 'Utilisateur supprimé'
                    }).eq('sender_id', profile.id);
                    
                    await supabase.auth.signOut({ scope: 'local' });
                    window.location.href = '/';
                  }}
                  className="px-4 py-2 text-red-700 border border-red-400 rounded-lg hover:bg-red-100 font-medium"
                >
                  Supprimer mes données personnelles
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Address Modal */}
      {showAddAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddAddress(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E3A5F]">
                {editingAddress ? 'Modifier' : 'Ajouter'} {addingBillingAddress ? 'adresse de facturation' : 'adresse de livraison'}
              </h3>
            </div>
            <form onSubmit={saveAddress} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'adresse *</label>
                <input
                  type="text"
                  value={newAddress.label}
                  onChange={e => setNewAddress({ ...newAddress, label: e.target.value })}
                  placeholder="ex: Bureau principal, Laboratoire, Entrepôt"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la société *</label>
                <input
                  type="text"
                  value={newAddress.company_name}
                  onChange={e => setNewAddress({ ...newAddress, company_name: e.target.value })}
                  placeholder="ex: Lighthouse France"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">À l'attention de *</label>
                <input
                  type="text"
                  value={newAddress.attention}
                  onChange={e => setNewAddress({ ...newAddress, attention: e.target.value })}
                  placeholder="Nom du contact"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse ligne 1 *</label>
                <input
                  type="text"
                  value={newAddress.address_line1}
                  onChange={e => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                  placeholder="Numéro et nom de rue"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse ligne 2</label>
                <input
                  type="text"
                  value={newAddress.address_line2}
                  onChange={e => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                  placeholder="Bâtiment, étage, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code postal *</label>
                  <input
                    type="text"
                    value={newAddress.postal_code}
                    onChange={e => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                <select
                  value={newAddress.country}
                  onChange={e => setNewAddress({ ...newAddress, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                >
                  <option value="France">France</option>
                  <option value="Belgium">Belgique</option>
                  <option value="Switzerland">Suisse</option>
                  <option value="Luxembourg">Luxembourg</option>
                  <option value="Germany">Allemagne</option>
                  <option value="Spain">Espagne</option>
                  <option value="Italy">Italie</option>
                  <option value="United Kingdom">Royaume-Uni</option>
                  <option value="Other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input
                  type="tel"
                  value={newAddress.phone}
                  onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                  placeholder="+33 1 23 45 67 89"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  required
                />
              </div>
              {/* SIRET / TVA / Chorus - only for billing addresses */}
              {(addingBillingAddress || newAddress.is_billing) && (
                <div className="pt-4 mt-2 border-t border-gray-200 space-y-4">
                  <p className="text-sm font-bold text-[#1E3A5F]">Identifiants de facturation</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                      <input
                        type="text"
                        value={newAddress.siret}
                        onChange={e => setNewAddress({ ...newAddress, siret: e.target.value })}
                        placeholder="123 456 789 00012"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">N° TVA</label>
                      <input
                        type="text"
                        value={newAddress.tva_number}
                        onChange={e => setNewAddress({ ...newAddress, tva_number: e.target.value })}
                        placeholder="FR12345678901"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Facturation via Chorus Pro</label>
                      <div className="relative group">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs cursor-help font-bold">?</span>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg invisible group-hover:visible z-50">
                          <p className="font-bold mb-1">Chorus Pro</p>
                          <p>Plateforme de facturation électronique obligatoire pour les entités du secteur public en France.</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewAddress({ ...newAddress, chorus_invoicing: !newAddress.chorus_invoicing })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${newAddress.chorus_invoicing ? 'bg-[#00A651]' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${newAddress.chorus_invoicing ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                  {newAddress.chorus_invoicing && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">N° Service Chorus Pro *</label>
                      <input
                        type="text"
                        value={newAddress.chorus_service_code}
                        onChange={e => setNewAddress({ ...newAddress, chorus_service_code: e.target.value })}
                        placeholder="Ex: SERVICE-12345"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                      />
                    </div>
                  )}
                </div>
              )}
              {!addingBillingAddress && (
              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={newAddress.is_default}
                  onChange={e => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                  className="w-4 h-4 text-[#3B7AB4]"
                />
                <span className="text-sm">Définir comme adresse par défaut</span>
              </label>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAddress(false);
                    setEditingAddress(null);
                  }}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : (editingAddress ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold text-lg text-[#1E3A5F]">Modifier le mot de passe</h3>
            </div>
            <form onSubmit={changePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe *</label>
                <input
                  type="password"
                  value={passwordData.new}
                  onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-400 mt-1">Minimum 6 caractères</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe *</label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3B7AB4] ${
                    passwordData.confirm && passwordData.new !== passwordData.confirm 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  required
                />
                {passwordData.confirm && passwordData.new !== passwordData.confirm && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ current: '', new: '', confirm: '' });
                  }}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || passwordData.new !== passwordData.confirm}
                  className="flex-1 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Team Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold text-lg text-[#1E3A5F]">Inviter un membre</h3>
            </div>
            <form onSubmit={inviteTeamMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email *</label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder="collegue@entreprise.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Niveau d'accès</label>
                <div className="space-y-2">
                  {(['viewer', 'requester', 'billing', 'admin']).map(level => (
                    <label key={level} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      inviteData.access_level === level 
                        ? `${accessLevelLabels[level].color} border-current` 
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}>
                      <input 
                        type="radio" 
                        name="access_level" 
                        checked={inviteData.access_level === level} 
                        onChange={() => setInviteData({ ...inviteData, access_level: level })} 
                        className="mt-1 w-4 h-4" 
                      />
                      <div>
                        <p className="font-medium text-sm">{accessLevelLabels[level].label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{accessLevelLabels[level].desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Un lien d'invitation sera généré. Partagez-le avec le nouveau membre pour qu'il puisse créer son compte.
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteData({ email: '', access_level: 'viewer' });
                  }}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? 'Création...' : "Créer l'invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// EQUIPMENT PAGE
// ============================================
function EquipmentPage({ profile, t, notify, refresh, setPage, setSelectedRequest, requests, setPreviousPage }) {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceRMAs, setDeviceRMAs] = useState([]);
  const [loadingRMAs, setLoadingRMAs] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    nickname: '', brand: 'Lighthouse', brand_other: '', model_name: '', serial_number: '', notes: ''
  });
  const [equipSearch, setEquipSearch] = useState('');

  // Load equipment
  useEffect(() => {
    const loadEquipment = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', profile.company_id)
        .or('hidden_by_customer.is.null,hidden_by_customer.eq.false')
        .order('created_at', { ascending: false });
      if (data) setEquipment(data);
      setLoading(false);
    };
    loadEquipment();
  }, [profile?.company_id]);

  // Load RMAs for selected device
  useEffect(() => {
    const loadDeviceRMAs = async () => {
      if (!selectedDevice || !profile?.company_id) return;
      setLoadingRMAs(true);
      
      // Get RMAs for this device from this company only
      const { data } = await supabase
        .from('service_requests')
        .select(`
          *,
          request_devices(*)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      
      // Filter to only requests containing this serial number
      const filteredRMAs = (data || []).filter(req => 
        req.request_devices?.some(d => d.serial_number === selectedDevice.serial_number) ||
        req.serial_number === selectedDevice.serial_number
      );
      
      // Sort: open RMAs first, then by date
      const sortedRMAs = filteredRMAs.sort((a, b) => {
        const aOpen = !['shipped', 'delivered', 'completed', 'cancelled'].includes(a.status);
        const bOpen = !['shipped', 'delivered', 'completed', 'cancelled'].includes(b.status);
        if (aOpen && !bOpen) return -1;
        if (!aOpen && bOpen) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setDeviceRMAs(sortedRMAs);
      setLoadingRMAs(false);
    };
    loadDeviceRMAs();
  }, [selectedDevice, profile?.company_id]);

  const reloadEquipment = async () => {
    const { data } = await supabase
      .from('equipment')
      .select('*')
      .eq('company_id', profile.company_id)
      .or('hidden_by_customer.is.null,hidden_by_customer.eq.false')
      .order('created_at', { ascending: false });
    if (data) setEquipment(data);
  };

  const saveEquipment = async (e) => {
    e.preventDefault();
    if (!newEquipment.serial_number || !newEquipment.model_name) {
      notify('Veuillez remplir le modèle et le numéro de série', 'error');
      return;
    }
    
    setSaving(true);
    const equipData = {
      company_id: profile.company_id,
      nickname: newEquipment.nickname || null,
      brand: newEquipment.brand === 'other' ? newEquipment.brand_other : 'Lighthouse',
      model_name: newEquipment.model_name,
      serial_number: newEquipment.serial_number,
      notes: newEquipment.notes || null,
      equipment_type: 'particle_counter',
      added_by: profile.id
    };

    let error;
    if (editingEquipment) {
      const result = await supabase.from('equipment').update(equipData).eq('id', editingEquipment.id);
      error = result.error;
    } else {
      const result = await supabase.from('equipment').insert(equipData);
      error = result.error;
    }

    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify(editingEquipment ? 'Équipement modifié!' : 'Équipement ajouté!');
      setShowAddModal(false);
      
      // Update selectedDevice if we were editing the currently viewed device
      if (editingEquipment && selectedDevice && editingEquipment.id === selectedDevice.id) {
        setSelectedDevice({ ...selectedDevice, ...equipData, id: editingEquipment.id });
      }
      
      setEditingEquipment(null);
      setNewEquipment({ nickname: '', brand: 'Lighthouse', brand_other: '', model_name: '', serial_number: '', notes: '' });
      await reloadEquipment();
    }
    setSaving(false);
  };

  const deleteEquipment = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet équipement?')) return;
    const { error } = await supabase.from('equipment').update({ hidden_by_customer: true }).eq('id', id);
    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify('Équipement supprimé');
      setSelectedDevice(null);
      await reloadEquipment();
    }
  };

  const openEditModal = (equip, e) => {
    e?.stopPropagation();
    setEditingEquipment(equip);
    setNewEquipment({
      nickname: equip.nickname || '',
      brand: equip.brand === 'Lighthouse' ? 'Lighthouse' : 'other',
      brand_other: equip.brand !== 'Lighthouse' ? equip.brand : '',
      model_name: equip.model_name || '',
      serial_number: equip.serial_number || '',
      notes: equip.notes || ''
    });
    setShowAddModal(true);
  };

  const viewDeviceDetail = (equip) => {
    setSelectedDevice(equip);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const viewRMA = (rma) => {
    if (setSelectedRequest && setPage) {
      if (setPreviousPage) setPreviousPage('equipment');
      setSelectedRequest(rma);
      setPage('request-detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#3B7AB4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Device Detail View
  if (selectedDevice) {
    const isOpen = (status) => !['shipped', 'delivered', 'completed', 'cancelled'].includes(status);
    
    return (
      <>
        <div>
          {/* Back Button */}
          <button
            onClick={() => setSelectedDevice(null)}
            className="flex items-center gap-2 text-[#3B7AB4] font-medium mb-4 hover:underline"
          >
            ← Retour à mes équipements
          </button>

          {/* Device Info Card */}
          <div className="bg-gradient-to-r from-[#1E3A5F] to-[#3B7AB4] rounded-xl p-6 text-white mb-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/70 text-sm uppercase tracking-wide mb-1">Équipement</p>
                <div className="flex items-center gap-4">
                  {getDeviceImageUrl(selectedDevice.model_name) && (
                    <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={getDeviceImageUrl(selectedDevice.model_name)} alt="" className="w-14 h-14 object-contain" />
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold">{selectedDevice.model_name}</p>
                    <p className="font-mono text-lg mt-1">{selectedDevice.serial_number}</p>
                  </div>
                </div>
              </div>
            <div className="flex flex-col items-end gap-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                {selectedDevice.brand || 'Lighthouse'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(selectedDevice)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer cet équipement?')) {
                      deleteEquipment(selectedDevice.id);
                      setSelectedDevice(null);
                    }
                  }}
                  className="px-3 py-1.5 bg-red-500/50 hover:bg-red-500/70 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          </div>
          
          {selectedDevice.nickname && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-white/70 text-sm">Surnom</p>
              <p className="font-medium">{selectedDevice.nickname}</p>
            </div>
          )}
          
          {selectedDevice.notes && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-white/70 text-sm">Notes</p>
              <p className="text-sm">{selectedDevice.notes}</p>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-white/20 flex gap-4 text-sm">
            <div>
              <p className="text-white/70">Ajouté le</p>
              <p>{new Date(selectedDevice.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <p className="text-white/70">Total RMAs</p>
              <p>{deviceRMAs.length}</p>
            </div>
          </div>
        </div>

        {/* RMA History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-[#1E3A5F] text-lg">Historique des RMAs</h2>
            <span className="text-sm text-gray-500">{deviceRMAs.length} demande(s)</span>
          </div>
          
          {loadingRMAs ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#3B7AB4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : deviceRMAs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">📋</p>
              <p>Aucune demande pour cet appareil</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {deviceRMAs.map(rma => {
                const style = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;
                const open = isOpen(rma.status);
                const shipDate = rma.shipped_at || (rma.status === 'shipped' ? rma.updated_at : null);
                
                return (
                  <div 
                    key={rma.id}
                    onClick={() => viewRMA(rma)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${open ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[#3B7AB4]">
                          {rma.request_number || 'En attente'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {open && (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                            En cours
                          </span>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-500">
                          Soumis: {new Date(rma.created_at).toLocaleDateString('fr-FR')}
                        </p>
                        {shipDate && (
                          <p className="text-green-600 font-medium">
                            Expédié: {new Date(shipDate).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        {rma.requested_service === 'calibration' ? '🔬 Étalonnage' : 
                         rma.requested_service === 'repair' ? '🔧 Réparation' :
                         rma.requested_service === 'calibration_repair' ? '🔬🔧 Étal. + Rép.' :
                         rma.requested_service}
                      </span>
                      <span>→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
        
        {/* Add/Edit Equipment Modal - Also available in device detail */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddModal(false)}>
            <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b">
                <h3 className="font-bold text-lg text-[#1E3A5F]">
                  {editingEquipment ? 'Modifier l\'équipement' : 'Ajouter un équipement'}
                </h3>
              </div>
              <form onSubmit={saveEquipment} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surnom (optionnel)</label>
                  <input
                    type="text"
                    value={newEquipment.nickname}
                    onChange={e => setNewEquipment({ ...newEquipment, nickname: e.target.value })}
                    placeholder="ex: Compteur Salle Blanche 1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque *</label>
                  <select
                    value={newEquipment.brand}
                    onChange={e => setNewEquipment({ ...newEquipment, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Lighthouse">Lighthouse</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                
                {newEquipment.brand === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Préciser la marque *</label>
                    <input
                      type="text"
                      value={newEquipment.brand_other}
                      onChange={e => setNewEquipment({ ...newEquipment, brand_other: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modèle *</label>
                  <input
                    type="text"
                    value={newEquipment.model_name}
                    onChange={e => setNewEquipment({ ...newEquipment, model_name: e.target.value })}
                    placeholder="ex: Solair 3100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° de Série *</label>
                  <input
                    type="text"
                    value={newEquipment.serial_number}
                    onChange={e => setNewEquipment({ ...newEquipment, serial_number: e.target.value })}
                    placeholder="ex: 205482857"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                  <textarea
                    value={newEquipment.notes}
                    onChange={e => setNewEquipment({ ...newEquipment, notes: e.target.value })}
                    placeholder="Informations supplémentaires, emplacement, etc."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingEquipment(null);
                    }}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement...' : (editingEquipment ? 'Modifier' : 'Ajouter')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // Equipment List View
  const filteredEquipment = equipment.filter(e => {
    if (!equipSearch.trim()) return true;
    const q = equipSearch.toLowerCase();
    return (
      (e.model_name || '').toLowerCase().includes(q) ||
      (e.serial_number || '').toLowerCase().includes(q) ||
      (e.brand || '').toLowerCase().includes(q) ||
      (e.nickname || '').toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q)
    );
  });
  
  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-[#1E3A5F]">{t('myEquipment')}</h1>
          <button
            onClick={() => {
              setEditingEquipment(null);
              setNewEquipment({ nickname: '', brand: 'Lighthouse', brand_other: '', model_name: '', serial_number: '', notes: '' });
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium"
          >
            + Ajouter un Équipement
          </button>
      </div>
      
      {/* Search Bar */}
      {equipment.length > 0 && (
        <div className="mb-4 relative">
          <input
            type="text"
            placeholder="🔍 Rechercher par modèle, N° de série, marque, surnom..."
            value={equipSearch}
            onChange={e => setEquipSearch(e.target.value)}
            className="w-full px-4 py-2.5 pl-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent bg-white text-sm"
          />
          {equipSearch && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-500">{filteredEquipment.length} sur {equipment.length} appareil(s)</span>
              <button onClick={() => setEquipSearch('')} className="text-sm text-[#3B7AB4] hover:underline">Effacer</button>
            </div>
          )}
        </div>
      )}

      {equipment.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-4xl mb-4">⚙️</p>
          <p className="text-gray-500 mb-4">Aucun équipement enregistré</p>
          <p className="text-gray-400 text-sm mb-6">
            Ajoutez vos appareils pour les retrouver facilement lors de vos prochaines demandes
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium"
          >
            + Ajouter votre premier équipement
          </button>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 mb-2">Aucun résultat pour "{equipSearch}"</p>
          <p className="text-gray-400 text-sm">Essayez un autre terme de recherche</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b text-sm font-bold text-gray-600">
            <div className="col-span-2">Marque</div>
            <div className="col-span-4">Modèle</div>
            <div className="col-span-3">N° de Série</div>
            <div className="col-span-3">Surnom</div>
          </div>
          
          {/* Table Rows - sorted alphabetically by model */}
          {[...filteredEquipment]
            .sort((a, b) => (a.model_name || '').localeCompare(b.model_name || ''))
            .map((equip, index) => (
            <div 
              key={equip.id} 
              onClick={() => viewDeviceDetail(equip)}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#E8F2F8] transition-colors border-b border-gray-100 last:border-b-0 group`}
            >
              <div className="col-span-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                  {equip.brand || 'Lighthouse'}
                </span>
              </div>
              <div className="col-span-4 font-medium text-[#1E3A5F] flex items-center gap-2">
                {getDeviceImageUrl(equip.model_name) && <img src={getDeviceImageUrl(equip.model_name)} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
                {equip.model_name || 'Modèle inconnu'}
                <span className="text-gray-300 group-hover:text-[#3B7AB4] transition-colors">→</span>
              </div>
              <div className="col-span-3 font-mono text-gray-600 text-sm">
                {equip.serial_number}
              </div>
              <div className="col-span-3 text-gray-500 text-sm">
                {equip.nickname || '-'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold text-lg text-[#1E3A5F]">
                {editingEquipment ? 'Modifier l\'équipement' : 'Ajouter un équipement'}
              </h3>
            </div>
            <form onSubmit={saveEquipment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Surnom (optionnel)</label>
                <input
                  type="text"
                  value={newEquipment.nickname}
                  onChange={e => setNewEquipment({ ...newEquipment, nickname: e.target.value })}
                  placeholder="ex: Compteur Salle Blanche 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marque *</label>
                <select
                  value={newEquipment.brand}
                  onChange={e => setNewEquipment({ ...newEquipment, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Lighthouse">Lighthouse</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              
              {newEquipment.brand === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Préciser la marque *</label>
                  <input
                    type="text"
                    value={newEquipment.brand_other}
                    onChange={e => setNewEquipment({ ...newEquipment, brand_other: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modèle *</label>
                <input
                  type="text"
                  value={newEquipment.model_name}
                  onChange={e => setNewEquipment({ ...newEquipment, model_name: e.target.value })}
                  placeholder="ex: Solair 3100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° de Série *</label>
                <input
                  type="text"
                  value={newEquipment.serial_number}
                  onChange={e => setNewEquipment({ ...newEquipment, serial_number: e.target.value })}
                  placeholder="ex: 205482857"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <textarea
                  value={newEquipment.notes}
                  onChange={e => setNewEquipment({ ...newEquipment, notes: e.target.value })}
                  placeholder="Informations supplémentaires, emplacement, etc."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEquipment(null);
                  }}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : (editingEquipment ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

// ============================================
// REQUEST DETAIL PAGE (Enhanced)
// ============================================
function RequestDetail({ request, profile, t, setPage, notify, refresh, previousPage = 'dashboard', perms }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'messages'
  const [shippingAddress, setShippingAddress] = useState(null);
  const [billingAddress, setBillingAddress] = useState(null);
  const [deviceAddresses, setDeviceAddresses] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null); // device object or null
  const [deviceTab, setDeviceTab] = useState('details'); // 'details', 'history', 'documents'
  
  // BC Submission state
  const [showBCModal, setShowBCModal] = useState(false);
  const [bcFile, setBcFile] = useState(null);
  const [signatureName, setSignatureName] = useState(profile?.full_name || '');
  const [signatureDateDisplay, setSignatureDateDisplay] = useState(new Date().toLocaleDateString('fr-FR'));
  const [signatureDateISO, setSignatureDateISO] = useState(new Date().toISOString().split('T')[0]);
  const [luEtApprouve, setLuEtApprouve] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submittingBC, setSubmittingBC] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  
  // Supplement modal
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  
  // Quote review state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [approvingQuote, setApprovingQuote] = useState(false);
  
  const style = STATUS_STYLES[request.status] || STATUS_STYLES.submitted;
  const isPartsOrder = request.request_type === 'parts';
  const isQuoteSent = request.status === 'quote_sent' || request.status === 'quote_revision_declined';
  const needsQuoteAction = isQuoteSent && !request.bc_submitted_at;
  
  // Supplement requires action if sent but not yet approved AND customer hasn't submitted BC yet
  const hasSupplementPending = request.avenant_sent_at && request.avenant_total > 0 && !request.avenant_approved_at;
  const supplementBCSubmitted = hasSupplementPending && request.avenant_bc_submitted_at;
  const needsSupplementAction = hasSupplementPending && !request.avenant_bc_submitted_at;
  
  const needsCustomerAction = ['approved', 'waiting_bc', 'waiting_po', 'waiting_customer', 'inspection_complete', 'bc_rejected'].includes(request.status) && request.status !== 'bc_review' && !request.bc_submitted_at;
  
  // Device received but BC/quote never approved — customer needs to approve
  const receivedWithoutBC = !request.bc_approved_at && !request.bc_submitted_at && 
    (request.received_at || (request.request_devices || []).some(d => d.received_at)) &&
    !needsQuoteAction && !needsCustomerAction;
  
  // Check if submission is valid - need EITHER file OR signature (not both required)
  const hasFile = bcFile !== null;
  const hasSignature = signatureData && luEtApprouve.toLowerCase().trim() === 'lu et approuvé';
  const isSubmissionValid = signatureName.trim().length > 0 && acceptTerms && (hasFile || hasSignature);

  // Quote approval/revision handlers
  const handleApproveQuote = async () => {
    if (!perms?.canRequest) {
      notify('Vous n\'avez pas la permission d\'effectuer cette action', 'error');
      return;
    }
    setApprovingQuote(true);
    const { error } = await supabase.from('service_requests').update({
      status: 'waiting_bc',
      quote_approved_at: new Date().toISOString()
    }).eq('id', request.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('✅ Devis approuvé! Veuillez soumettre votre bon de commande.', 'success');
      setShowQuoteModal(false);
      refresh();
    }
    setApprovingQuote(false);
  };
  
  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      notify('Veuillez indiquer les modifications souhaitées.', 'error');
      return;
    }
    
    setApprovingQuote(true);
    const revisionUpdateData = {
      status: 'quote_revision_requested',
      quote_revision_notes: revisionNotes,
      quote_revision_requested_at: new Date().toISOString()
    };
    // Clear decline notes if coming from declined state
    if (request.status === 'quote_revision_declined') {
      revisionUpdateData.admin_decline_notes = null;
    }
    const { error } = await supabase.from('service_requests').update(revisionUpdateData).eq('id', request.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('✅ Demande de modification envoyée!', 'success');
      setShowRevisionModal(false);
      setShowQuoteModal(false);
      refresh();
    }
    setApprovingQuote(false);
  };

  // Signature pad functions
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1E3A5F';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setSignatureData(canvas.toDataURL());
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };

  // Load messages, history, attachments, and shipping address
  useEffect(() => {
    const loadData = async () => {
      // Load messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('request_id', request.id)
        .order('created_at', { ascending: true });
      if (msgs) setMessages(msgs);
      
      // Load device history
      const { data: hist } = await supabase
        .from('device_history')
        .select('*')
        .eq('request_id', request.id)
        .order('event_date', { ascending: false });
      if (hist) setHistory(hist);
      
      // Load attachments
      const { data: files } = await supabase
        .from('request_attachments')
        .select('*')
        .eq('request_id', request.id);
      if (files) setAttachments(files);
      
      // Load shipping address (RMA default)
      if (request.shipping_address_id) {
        const { data: addr } = await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('id', request.shipping_address_id)
          .single();
        if (addr) setShippingAddress(addr);
      }
      
      // Load billing address
      if (request.billing_address_id) {
        const { data: bAddr } = await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('id', request.billing_address_id)
          .single();
        if (bAddr) setBillingAddress(bAddr);
      }
      
      // Load per-device shipping addresses
      const devices = request.request_devices || [];
      const addressIds = new Set();
      if (request.shipping_address_id) addressIds.add(request.shipping_address_id);
      devices.forEach(d => { if (d.shipping_address_id) addressIds.add(d.shipping_address_id); });
      
      if (addressIds.size > 0) {
        const { data: addrs } = await supabase
          .from('shipping_addresses')
          .select('*')
          .in('id', Array.from(addressIds));
        if (addrs) {
          const addrMap = {};
          addrs.forEach(a => { addrMap[a.id] = a; });
          // Map each device to its address (device-specific or RMA default)
          const devAddrMap = {};
          devices.forEach(d => {
            const addrId = d.shipping_address_id || request.shipping_address_id;
            if (addrId && addrMap[addrId]) devAddrMap[d.id] = addrMap[addrId];
          });
          setDeviceAddresses(devAddrMap);
        }
      }
    };
    loadData();
  }, [request.id, request.shipping_address_id, request.billing_address_id]);

  // Submit BC / Approval
  const submitBonCommande = async () => {
    if (!perms?.canRequest) {
      notify('Vous n\'avez pas la permission d\'effectuer cette action', 'error');
      return;
    }
    if (!acceptTerms) {
      notify('Veuillez accepter les conditions générales', 'error');
      return;
    }
    if (!signatureName.trim()) {
      notify('Veuillez entrer votre nom', 'error');
      return;
    }
    
    // Need either file OR signature
    const hasValidSignature = signatureData && luEtApprouve.toLowerCase().trim() === 'lu et approuvé';
    if (!bcFile && !hasValidSignature) {
      notify('Veuillez télécharger un bon de commande OU signer électroniquement', 'error');
      return;
    }
    
    setSubmittingBC(true);
    
    try {
      // Try to upload BC file if provided (may fail if storage not configured)
      let fileUrl = null;
      if (bcFile) {
        try {
          const fileName = `bons-commande/${request.request_number}/bc_${Date.now()}.${bcFile.name.split('.').pop()}`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, bcFile);
          
          if (!uploadError) {
            const { data: publicUrl } = supabase.storage
              .from('documents')
              .getPublicUrl(fileName);
            fileUrl = publicUrl?.publicUrl;
          }
        } catch (e) {
          console.log('File upload skipped - storage not configured');
        }
      }
      
      // Try to upload signature image (may fail if storage not configured)
      let signatureUrl = null;
      if (signatureData) {
        try {
          console.log('🖊️ Uploading signature...');
          const signatureBlob = await fetch(signatureData).then(r => r.blob());
          const signatureFileName = `signatures/${request.request_number}/sig_bc_${Date.now()}.png`;
          console.log('🖊️ Signature file name:', signatureFileName);
          
          const { data: sigUploadData, error: sigError } = await supabase.storage
            .from('documents')
            .upload(signatureFileName, signatureBlob);
          
          console.log('🖊️ Signature upload result:', { sigUploadData, sigError });
          
          if (!sigError) {
            const { data: sigUrl } = supabase.storage
              .from('documents')
              .getPublicUrl(signatureFileName);
            signatureUrl = sigUrl?.publicUrl;
            console.log('🖊️ Signature URL:', signatureUrl);
          } else {
            console.error('🖊️ Signature upload error:', sigError);
          }
        } catch (e) {
          console.error('🖊️ Signature upload exception:', e);
        }
      } else {
        console.log('🖊️ No signature data to upload');
      }
      
      // Detect if this is a supplement (avenant) BC submission
      const isSubmittingAvenantBC = !!request.avenant_sent_at && !request.avenant_approved_at;
      
      // Generate signed quote PDF - use correct generator based on request type
      let signedQuotePdfUrl = null;
      let pdfFileName = null;
      if (hasValidSignature) {
        try {
          console.log('📄 Generating signed quote PDF... isAvenantBC:', isSubmittingAvenantBC);
          
          // Check if this is a parts order
          const isPartsRequest = request.request_type === 'parts';
          
          let pdfBlob;
          if (isSubmittingAvenantBC) {
            // Generate signed supplement PDF
            pdfBlob = await generateSignedAvenantPDF({
              request,
              isSigned: true,
              signatureName: signatureName,
              signatureDate: new Date(signatureDateISO).toLocaleDateString('fr-FR'),
              signatureImage: signatureData
            });
            pdfFileName = `supplement_signe_${request.supplement_number || request.request_number}_${Date.now()}.pdf`;
          } else if (isPartsRequest) {
            pdfBlob = await generatePartsQuotePDF({
              request,
              isSigned: true,
              signatureName: signatureName,
              signatureDate: new Date(signatureDateISO).toLocaleDateString('fr-FR'),
              signatureImage: signatureData
            });
            pdfFileName = `devis_pieces_signe_${request.request_number}_${Date.now()}.pdf`;
          } else {
            pdfBlob = await generateQuotePDF({
              request,
              isSigned: true,
              signatureName: signatureName,
              signatureDate: new Date(signatureDateISO).toLocaleDateString('fr-FR'),
              signatureImage: signatureData
            });
            pdfFileName = `bons-commande/${request.request_number}/devis_signe_${Date.now()}.pdf`;
          }
          
          console.log('📄 PDF blob generated, size:', pdfBlob?.size);
          
          const { data: pdfUploadData, error: pdfUploadError } = await supabase.storage
            .from('documents')
            .upload(pdfFileName, pdfBlob, { contentType: 'application/pdf' });
          
          console.log('📄 PDF upload result:', { pdfUploadData, pdfUploadError });
          
          if (!pdfUploadError) {
            const { data: pdfUrl } = supabase.storage
              .from('documents')
              .getPublicUrl(pdfFileName);
            signedQuotePdfUrl = pdfUrl?.publicUrl;
            console.log('📄 Signed quote PDF URL:', signedQuotePdfUrl);
          } else {
            console.error('📄 PDF upload error:', pdfUploadError);
          }
        } catch (e) {
          console.error('📄 Signed quote PDF generation error:', e);
        }
      } else {
        console.log('📄 No valid signature, skipping signed PDF generation');
      }
      
      // Update request status - set to bc_review so admin can verify
      // BUT for avenant, DON'T change status - the device is already in progress
      const updatePayload = isSubmittingAvenantBC
        ? {
            // Avenant BC - DON'T change status, device continues its work
            // DON'T overwrite bc_file_url or signed_quote_url - those are the ORIGINAL BC!
            // Avenant BC file goes to attachments with category 'avenant_bc'
            // We just record that avenant BC was submitted, awaiting admin approval
            avenant_bc_submitted_at: new Date().toISOString(),
            avenant_bc_signed_by: signatureName,
            avenant_bc_signature_date: signatureDateISO
            // Note: avenant_approved_at and supplement_bc_number will be set by admin when they approve
          }
        : {
            // Regular BC - set to bc_review for admin verification
            // But don't regress status if device is already received or beyond
            ...(!['received', 'in_queue', 'calibration_in_progress', 'repair_in_progress', 'final_qc', 'ready_to_ship', 'shipped', 'completed'].includes(request.status)
              ? { status: 'bc_review' }
              : {}),
            bc_submitted_at: new Date().toISOString(),
            bc_signed_by: signatureName,
            bc_signature_date: signatureDateISO,
            bc_file_url: fileUrl,
            bc_signature_url: signatureUrl,
            signed_quote_url: signedQuotePdfUrl,
            quote_approved_at: request.status === 'quote_sent' ? new Date().toISOString() : request.quote_approved_at
          };
      
      console.log('📝 Updating service_request with:', updatePayload, 'isAvenantBC:', isSubmittingAvenantBC);
      
      const { error: updateError } = await supabase
        .from('service_requests')
        .update(updatePayload)
        .eq('id', request.id);
      
      if (updateError) {
        console.error('📝 Update error:', updateError);
        throw updateError;
      }
      
      console.log('✅ Service request updated successfully');
      
      // Save documents to request_attachments
      // For regular BC: the file is already saved as bc_file_url on the request, 
      // so only save as attachment if it's an avenant BC
      if (fileUrl && isSubmittingAvenantBC) {
        const { error: bcAttachError } = await supabase.from('request_attachments').insert({
          request_id: request.id,
          file_name: bcFile?.name || 'Bon de Commande Supplément.pdf',
          file_url: fileUrl,
          file_type: bcFile?.type || 'application/pdf',
          file_size: bcFile?.size || 0,
          uploaded_by: profile.id,
          category: 'avenant_bc'
        });
        console.log('📎 Avenant BC attachment saved:', { fileUrl, error: bcAttachError });
      } else if (fileUrl) {
        // Regular BC - save with proper label
        const { error: bcAttachError } = await supabase.from('request_attachments').insert({
          request_id: request.id,
          file_name: `Bon_de_Commande_${request.request_number}.pdf`,
          file_url: fileUrl,
          file_type: bcFile?.type || 'application/pdf',
          file_size: bcFile?.size || 0,
          uploaded_by: profile.id,
          category: 'bon_commande'
        });
        console.log('📎 BC attachment saved:', { fileUrl, error: bcAttachError });
      }
      
      // Save signed quote PDF to attachments (this is the main document)
      if (signedQuotePdfUrl) {
        const { error: pdfAttachError } = await supabase.from('request_attachments').insert({
          request_id: request.id,
          file_name: isSubmittingAvenantBC 
            ? `Supplément_Signé_${request.supplement_number || request.request_number}.pdf`
            : `Devis_Signé_${request.request_number}.pdf`,
          file_url: signedQuotePdfUrl,
          file_type: 'application/pdf',
          file_size: 0,
          uploaded_by: profile.id,
          category: isSubmittingAvenantBC ? 'avenant_signe' : 'devis_signe'
        });
        console.log('📎 Signed PDF attachment saved:', { signedQuotePdfUrl, error: pdfAttachError, isAvenantBC: isSubmittingAvenantBC });
      } else {
        console.log('📎 No signed PDF URL to save as attachment');
      }
      
      console.log('🎉 BC submission complete! Signature URL:', signatureUrl, 'Signed PDF URL:', signedQuotePdfUrl);
      
      notify('Bon de commande soumis avec succès!');
      setShowBCModal(false);
      
      // Delay reload so we can see console logs
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err) {
      notify(`Erreur: ${err.message}`, 'error');
    }
    
    setSubmittingBC(false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          request_id: request.id,
          sender_id: profile.id,
          sender_type: 'customer',
          sender_name: profile.full_name || 'Client',
          content: newMessage.trim()
        })
        .select()
        .single();
      
      if (!error && data) {
        setMessages([...messages, data]);
        setNewMessage('');
        notify('Message envoyé!');
      } else if (error) {
        console.error('Message send error:', error);
        notify('Erreur: ' + (error.message || error.details || JSON.stringify(error)), 'error');
      }
    } catch (err) {
      console.error('Message send exception:', err);
      notify('Erreur: ' + err.message, 'error');
    }
    setSending(false);
  };

  // Generate history from status if no history in DB
  const getStatusHistory = () => {
    const statusHistory = [];
    
    // Always add submission
    statusHistory.push({
      id: 'submitted',
      event_type: 'submitted',
      event_description: 'Demande soumise',
      event_date: request.submitted_at || request.created_at
    });
    
    // Add current status if different from submitted
    if (request.status !== 'submitted') {
      statusHistory.push({
        id: 'current',
        event_type: request.status,
        event_description: style.label,
        event_date: request.updated_at || request.created_at
      });
    }
    
    // Supplement events
    if (request.avenant_sent_at) {
      statusHistory.push({ id: 'sup', event_type: 'supplement_sent', event_description: '📄 Supplément envoyé', event_date: request.avenant_sent_at, color: 'amber' });
    }
    if (request.avenant_approved_at) {
      statusHistory.push({ id: 'sup_ok', event_type: 'supplement_approved', event_description: '✅ Supplément approuvé', event_date: request.avenant_approved_at, color: 'green' });
    }
    
    return statusHistory;
  };

  const displayHistory = history.length > 0 ? history : getStatusHistory();

  return (
    <div>
      <button
        onClick={() => setPage(previousPage)}
        className="mb-6 text-[#3B7AB4] hover:text-[#1E3A5F] font-medium"
      >
        ← {previousPage === 'equipment' ? 'Retour à mes équipements' : 'Retour au tableau de bord'}
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {request.request_number ? (
                  <h1 className="text-2xl font-bold text-[#1E3A5F]">{request.request_number}</h1>
                ) : (
                  <h1 className="text-2xl font-bold text-amber-600">En attente de validation</h1>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {isPartsOrder ? 'Commande de pièces' : 'Demande de service'} • Soumis le {new Date(request.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            {request.quote_total && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">{request.quote_total.toFixed(2)} €</p>
              </div>
            )}
          </div>
          
        </div>

        {/* Quote Sent - Review Required */}
        {needsQuoteAction && perms?.canRequest && (
          <div className="bg-blue-50 border-b border-blue-300 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-2xl">💰</span>
                </div>
                <div>
                  <p className="font-bold text-blue-800 text-lg">
                    {request.quote_revision_count > 0 
                      ? `Devis Rev-${request.quote_revision_count} reçu - Action requise`
                      : 'Devis reçu - Action requise'}
                  </p>
                  <p className="text-sm text-blue-600">
                    {request.quote_revision_count > 0
                      ? `Votre devis révisé (${request.quote_number} Rev-${request.quote_revision_count}) est prêt. Examinez-le puis approuvez et soumettez votre bon de commande.`
                      : 'Examinez le devis, puis approuvez et soumettez votre bon de commande'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuoteModal(true)}
                  className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  👁️ Voir le Devis
                </button>
                <button
                  onClick={() => setShowBCModal(true)}
                  className="px-6 py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008f45] transition-colors"
                >
                  ✅ Approuver et soumettre BC
                </button>
              </div>
            </div>
          </div>
        )}
        {needsQuoteAction && !perms?.canRequest && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <p className="text-sm text-amber-700">⚠️ Ce devis nécessite une approbation. Contactez un utilisateur ayant la permission <strong>Demandes</strong> pour approuver.</p>
          </div>
        )}

        {/* Supplement Pending - Customer Action Required */}
        {needsSupplementAction && perms?.canRequest && (
          <div className="bg-red-50 border-b border-red-300 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-2xl">⚠️</span>
                </div>
                <div>
                  <p className="font-bold text-red-800 text-lg">Travaux supplémentaires - Action requise</p>
                  <p className="text-sm text-red-600">
                    Des travaux supplémentaires ont été identifiés ({request.avenant_total?.toFixed(2)} €). Veuillez approuver le supplément.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSupplementModal(true)}
                  className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors"
                >
                  👁️ Voir le Supplément
                </button>
                <button
                  onClick={() => setShowBCModal(true)}
                  className="px-6 py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008f45] transition-colors"
                >
                  ✅ Approuver et soumettre BC
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Supplement BC Submitted - Under Review */}
        {supplementBCSubmitted && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📄</span>
                </div>
                <div>
                  <p className="font-semibold text-blue-800">BC Supplément soumis - En vérification</p>
                  <p className="text-sm text-blue-600">
                    Votre bon de commande pour les travaux supplémentaires ({request.avenant_total?.toFixed(2)} €) est en cours de vérification.
                  </p>
                  {request.avenant_bc_submitted_at && (
                    <p className="text-xs text-blue-500 mt-1">
                      Soumis le {new Date(request.avenant_bc_submitted_at).toLocaleDateString('fr-FR')} à {new Date(request.avenant_bc_submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowSupplementModal(true)}
                className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                👁️ Voir le Supplément
              </button>
            </div>
          </div>
        )}

        {/* Quote Revision Requested */}
        {request.status === 'quote_revision_requested' && (
          <div className="bg-orange-50 border-b border-orange-300 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 text-2xl">✏️</span>
              </div>
              <div>
                <p className="font-bold text-orange-800">Modification en cours</p>
                <p className="text-sm text-orange-600">
                  Votre demande de modification a été envoyée. Vous recevrez un nouveau devis sous peu.
                </p>
                {request.quote_revision_notes && (
                  <div className="mt-2 p-2 bg-white rounded border border-orange-200">
                    <p className="text-xs text-gray-500">Votre demande :</p>
                    <p className="text-sm text-gray-700">{request.quote_revision_notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quote Revision Declined */}
        {request.status === 'quote_revision_declined' && (
          <div className="bg-red-50 border-b border-red-300 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-2xl">❌</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-red-800">Demande de modification refusée</p>
                <p className="text-sm text-red-600">
                  Votre demande de modification n'a pas pu être acceptée. Le devis original reste en vigueur.
                  Vous pouvez l'approuver ci-dessous ou demander une nouvelle modification.
                </p>
                {request.admin_decline_notes && (
                  <div className="mt-2 p-2 bg-white rounded border border-red-200">
                    <p className="text-xs text-gray-500">Motif du refus :</p>
                    <p className="text-sm text-gray-700">{request.admin_decline_notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Customer Action Required Alert */}
        {needsCustomerAction && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 font-bold text-lg">!</span>
                </div>
                <div>
                  <p className="font-semibold text-red-800">Action requise</p>
                  <p className="text-sm text-red-600">
                    {request.status === 'inspection_complete' || request.status === 'quote_sent' 
                      ? 'Veuillez approuver le devis ou soumettre votre bon de commande'
                      : 'Veuillez soumettre votre bon de commande pour continuer'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBCModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Soumettre BC / Approuver
              </button>
            </div>
          </div>
        )}

        {/* Device Received But No BC/Approval — Urgent alert */}
        {receivedWithoutBC && (
          <div className="bg-red-50 border-b border-red-300 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-2xl">⚠️</span>
                </div>
                <div>
                  <p className="font-bold text-red-800 text-lg">Appareil reçu — Approbation requise</p>
                  <p className="text-sm text-red-600">
                    Votre appareil a été réceptionné dans nos locaux, mais nous n'avons pas encore reçu votre approbation. Veuillez approuver le devis et soumettre votre bon de commande pour que nous puissions commencer les travaux.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuoteModal(true)}
                  className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors"
                >
                  👁️ Voir le Devis
                </button>
                <button
                  onClick={() => setShowBCModal(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors animate-pulse"
                >
                  ✅ Approuver et soumettre BC
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BC Rejected - Customer Must Resubmit */}
        {request.status === 'bc_rejected' && (
          <div className="bg-red-50 border-b border-red-300 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-2xl">❌</span>
                </div>
                <div>
                  <p className="font-bold text-red-800 text-lg">Bon de commande rejeté - Action requise</p>
                  <p className="text-sm text-red-600">
                    Votre bon de commande a été rejeté. Veuillez corriger et soumettre à nouveau.
                  </p>
                  {request.bc_rejection_reason && (
                    <div className="mt-2 p-3 bg-white rounded-lg border-2 border-red-300">
                      <p className="text-xs text-red-600 font-medium uppercase">Raison du rejet :</p>
                      <p className="text-sm text-red-800 font-medium mt-1">{request.bc_rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowBCModal(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                📄 Resoumettre BC
              </button>
            </div>
          </div>
        )}

        {/* BC Submitted - Pending Review */}
        {request.bc_submitted_at && !request.bc_approved_at && !['shipped', 'completed'].includes(request.status) && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-lg">📄</span>
              </div>
              <div>
                <p className="font-semibold text-blue-800">Bon de commande soumis</p>
                <p className="text-sm text-blue-600">
                  Votre BC est en cours de vérification par notre équipe. Vous serez notifié une fois approuvé.
                </p>
                {request.bc_submitted_at && (
                  <p className="text-xs text-blue-500 mt-1">
                    Soumis le {new Date(request.bc_submitted_at).toLocaleDateString('fr-FR')} à {new Date(request.bc_submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BC Submission Modal */}
        {showBCModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-[#1E3A5F]">Soumettre Bon de Commande</h2>
                  <button onClick={() => setShowBCModal(false)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Reference */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Référence demande</p>
                  <p className="font-mono font-bold text-[#1E3A5F]">{request.request_number || 'En attente'}</p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Télécharger votre Bon de Commande (optionnel)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#3B7AB4] transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => setBcFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="bc-file-input"
                    />
                    <label htmlFor="bc-file-input" className="cursor-pointer">
                      {bcFile ? (
                        <div className="flex items-center justify-center gap-2 text-[#3B7AB4]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">{bcFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-600">Cliquez pour télécharger ou glissez-déposez</p>
                          <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-500">ou</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Electronic Signature */}
                <div className="bg-[#F5F9FC] rounded-lg p-4 border border-[#3B7AB4]/20">
                  <h3 className="font-semibold text-[#1E3A5F] mb-4">Signature électronique</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom complet du signataire *
                        </label>
                        <input
                          type="text"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent"
                          placeholder="Prénom et Nom"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="text"
                          value={signatureDateDisplay}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tapez "Lu et approuvé" *
                      </label>
                      <input
                        type="text"
                        value={luEtApprouve}
                        onChange={(e) => setLuEtApprouve(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent font-medium ${
                          luEtApprouve.toLowerCase().trim() === 'lu et approuvé' 
                            ? 'border-green-500 bg-green-50 text-green-800' 
                            : 'border-gray-300'
                        }`}
                        placeholder="Lu et approuvé"
                      />
                    </div>
                    
                    {/* Signature Pad */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Signature manuscrite *
                        </label>
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Effacer
                        </button>
                      </div>
                      <div className={`border-2 rounded-lg bg-white ${signatureData ? 'border-green-500' : 'border-gray-300 border-dashed'}`}>
                        <canvas
                          ref={canvasRef}
                          width={400}
                          height={150}
                          className="w-full cursor-crosshair touch-none"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                      </div>
                      {!signatureData && (
                        <p className="text-xs text-gray-500 mt-1">Dessinez votre signature ci-dessus</p>
                      )}
                      {signatureData && (
                        <p className="text-xs text-green-600 mt-1">✓ Signature enregistrée</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Legal Terms */}
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 text-[#3B7AB4] border-gray-300 rounded focus:ring-[#3B7AB4]"
                    />
                    <span className="text-sm text-gray-700">
                      Je soussigné(e), <strong>{signatureName || '[Nom]'}</strong>, 
                      certifie avoir pris connaissance et accepter les conditions générales de vente de Lighthouse France. 
                      Je m'engage à régler la facture correspondante selon les modalités convenues. 
                      Cette validation électronique a valeur de signature manuscrite conformément aux articles 1366 et 1367 du Code civil français.
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowBCModal(false)}
                  className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={submitBonCommande}
                  disabled={submittingBC || !isSubmissionValid}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    isSubmissionValid 
                      ? 'bg-[#1E3A5F] text-white hover:bg-[#2a4a6f]' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {submittingBC ? 'Envoi en cours...' : 'Valider et soumettre'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSupplementModal && (() => {
          const supplementDoc = attachments.find(a => a.category === 'avenant_quote');
          const supplementUrl = supplementDoc?.file_url;
          const company = request.companies || {};
          const devices = (request.request_devices || []).filter(d => d.additional_work_needed && d.additional_work_items?.length > 0);
          const total = request.avenant_total || devices.reduce((sum, d) => sum + (d.additional_work_items || []).reduce((s, item) => s + (parseFloat(item.price) || 0), 0), 0);
          
          const supQDocData = {
            billingAddress: billingAddress ? {
              company_name: billingAddress.company_name, attention: billingAddress.attention,
              address_line1: billingAddress.address_line1, city: billingAddress.city,
              postal_code: billingAddress.postal_code, country: billingAddress.country,
              phone: billingAddress.phone, siret: billingAddress.siret,
              tva_number: billingAddress.tva_number, chorus_invoicing: billingAddress.chorus_invoicing,
              chorus_service_code: billingAddress.chorus_service_code
            } : null,
            shippingAddress: shippingAddress ? {
              company_name: shippingAddress.company_name, attention: shippingAddress.attention,
              address_line1: shippingAddress.address_line1, city: shippingAddress.city,
              postal_code: shippingAddress.postal_code, country: shippingAddress.country,
              phone: shippingAddress.phone
            } : null,
            submitterName: profile?.full_name || company.contact_name || null,
            returnShipping: request.return_shipping || 'standard',
            createdBy: 'M. Meleney'
          };
          const supConditions = [
            "Ce devis complémentaire est valable 30 jours à compter de sa date d'émission.",
            "Les travaux seront effectués après réception de votre accord écrit (signature ou bon de commande).",
            "Conditions de règlement : 30 jours fin de mois."
          ];
          
          return (
          <QuoteDocumentView
            title="SUPPLÉMENT AU DEVIS"
            docNumber={request.supplement_number || '—'}
            reference={request.request_number}
            refLabel="RMA"
            date={request.avenant_sent_at}
            company={company}
            quoteData={supQDocData}
            conditions={supConditions}
            addressMode="both"
            onClose={() => setShowSupplementModal(false)}
            showApprove={!request.avenant_bc_submitted_at}
            onApprove={() => { setShowSupplementModal(false); setShowBCModal(true); }}
            bcData={request.avenant_bc_submitted_at ? { signedBy: request.avenant_bc_signed_by || 'Client', signedDate: request.avenant_bc_signature_date } : null}
          >
            {/* Introduction Banner */}
            <div className="mx-8 mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium text-sm">
                Suite à l'inspection de vos appareils, nous avons constaté des travaux supplémentaires nécessaires.
              </p>
              <p className="text-green-700 text-sm">
                Veuillez trouver ci-dessous le détail des interventions recommandées.
              </p>
            </div>

            {/* Pricing Table */}
            <div className="px-8 py-6">
              <h3 className="font-bold text-lg text-[#1a1a2e] mb-4">Travaux Supplémentaires</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a1a2e] text-white">
                    <th className="px-3 py-2.5 text-center w-12">Qté</th>
                    <th className="px-3 py-2.5 text-left">Désignation</th>
                    <th className="px-3 py-2.5 text-right w-24">Prix Unit.</th>
                    <th className="px-3 py-2.5 text-right w-24">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device, i) => (
                    <Fragment key={i}>
                      <tr className="bg-gray-100 border-t">
                        <td colSpan={4} className="px-3 py-2 font-bold text-[#1a1a2e]">
                          {device.model_name} (SN: {device.serial_number})
                        </td>
                      </tr>
                      {device.service_findings && (
                        <tr>
                          <td colSpan={4} className="px-3 py-1 text-xs text-gray-500 italic">
                            Constat: {device.service_findings}
                          </td>
                        </tr>
                      )}
                      {(device.additional_work_items || []).map((item, j) => (
                        <tr key={j} className={j % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 text-center">{parseInt(item.quantity) || 1}</td>
                          <td className="px-3 py-2">{item.partNumber ? `[${item.partNumber}] ` : ''}{item.description || item.name}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{parseFloat(item.price || 0).toFixed(2)} €</td>
                          <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{((parseInt(item.quantity) || 1) * parseFloat(item.price || 0)).toFixed(2)} €</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#2D5A7B] text-white">
                    <td colSpan={2} className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-right font-bold text-lg whitespace-nowrap">TOTAL HT</td>
                    <td className="px-3 py-3 text-right font-bold text-xl whitespace-nowrap">{total.toFixed(2)} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </QuoteDocumentView>
          );
        })()}

        {/* Quote Review Modal */}
        {showQuoteModal && (() => {
          const quoteData = request.quote_data || {};
          const company = request.companies || {};
          const isClientReturn = request.return_shipping === 'own_label' || request.return_shipping === 'pickup';
          const qDocData = {
            billingAddress: billingAddress ? {
              company_name: billingAddress.company_name, attention: billingAddress.attention,
              address_line1: billingAddress.address_line1, city: billingAddress.city,
              postal_code: billingAddress.postal_code, country: billingAddress.country,
              phone: billingAddress.phone, siret: billingAddress.siret,
              tva_number: billingAddress.tva_number, chorus_invoicing: billingAddress.chorus_invoicing,
              chorus_service_code: billingAddress.chorus_service_code
            } : null,
            shippingAddress: shippingAddress ? {
              company_name: shippingAddress.company_name, attention: shippingAddress.attention,
              address_line1: shippingAddress.address_line1, city: shippingAddress.city,
              postal_code: shippingAddress.postal_code, country: shippingAddress.country,
              phone: shippingAddress.phone
            } : null,
            submitterName: profile?.full_name || company.contact_name || null,
            returnShipping: request.return_shipping || 'standard',
            createdBy: quoteData.createdBy || 'M. Meleney'
          };
          const bcInfo = request.bc_submitted_at ? {
            signedBy: request.bc_signed_by || 'Client',
            signedDate: request.bc_signature_date || request.bc_submitted_at,
            signatureUrl: request.bc_signature_url
          } : null;

          // === PARTS ORDER ===
          if (isPartsOrder) {
            const parts = quoteData.parts || [];
            const shipping = quoteData.shipping || { parcels: 1, unitPrice: 45, total: 45 };
            const partsTotal = quoteData.partsTotal || parts.reduce((sum, p) => sum + (p.lineTotal || 0), 0);
            const grandTotal = quoteData.grandTotal || (partsTotal + (shipping.total || 0));
            return (
              <QuoteDocumentView
                title="OFFRE DE PRIX" docNumber={quoteData.quoteRef || request.request_number}
                reference={request.request_number} refLabel="Réf"
                date={quoteData.createdAt || request.quoted_at} company={company} quoteData={qDocData}
                conditions={["Devis valable 30 jours.", "Paiement : 30 jours fin de mois.", "Livraison : sous réserve de disponibilité."]}
                onClose={() => setShowQuoteModal(false)}
                showApprove={request.status === 'quote_sent'} onApprove={() => { setShowQuoteModal(false); setShowBCModal(true); }}
                bcData={bcInfo}
              >
                <div className="px-8 py-6">
                  <h3 className="font-bold text-[#1a1a2e] mb-3">Pièces Commandées</h3>
                  <table className="w-full border-collapse mb-4 text-sm">
                    <thead>
                      <tr className="bg-[#1a1a2e] text-white">
                        <th className="px-3 py-2.5 text-center w-12">Qté</th>
                        <th className="px-3 py-2.5 text-left w-24">Réf.</th>
                        <th className="px-3 py-2.5 text-left">Désignation</th>
                        <th className="px-3 py-2.5 text-right w-20">P.U.</th>
                        <th className="px-3 py-2.5 text-right w-20">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map((part, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 border-b border-gray-100 text-center">{part.quantity}</td>
                          <td className="px-3 py-2 border-b border-gray-100 font-mono text-xs">{part.partNumber || '—'}</td>
                          <td className="px-3 py-2 border-b border-gray-100">{part.description}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right whitespace-nowrap">{(part.unitPrice || 0).toFixed(2)} €</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right font-medium whitespace-nowrap">{(part.lineTotal || 0).toFixed(2)} €</td>
                        </tr>
                      ))}
                      {!isClientReturn && shipping.total > 0 && (
                        <tr className="bg-blue-50">
                          <td className="px-3 py-2 border-b border-blue-100 text-center">{shipping.parcels}</td>
                          <td className="px-3 py-2 border-b border-blue-100 font-mono text-xs">PORT</td>
                          <td className="px-3 py-2 border-b border-blue-100 text-blue-800">Frais de port ({shipping.parcels} colis)</td>
                          <td className="px-3 py-2 border-b border-blue-100 text-right whitespace-nowrap">{(shipping.unitPrice || 0).toFixed(2)} €</td>
                          <td className="px-3 py-2 border-b border-blue-100 text-right font-medium whitespace-nowrap">{(shipping.total || 0).toFixed(2)} €</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#2D5A7B] text-white">
                        <td colSpan={4} className="px-3 py-3 text-right font-bold whitespace-nowrap">TOTAL HT</td>
                        <td className="px-3 py-3 text-right font-bold text-lg whitespace-nowrap">{grandTotal.toFixed(2)} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </QuoteDocumentView>
            );
          }

          // === RMA Quote ===
          const devices = quoteData.devices || request.request_devices || [];
          let calibrationTypes = quoteData.requiredSections?.calibrationTypes || [];
          let hasRepair = quoteData.requiredSections?.hasRepair || false;
          if (calibrationTypes.length === 0 && devices.length > 0) {
            const calTypes = new Set();
            devices.forEach(d => {
              const deviceType = d.deviceType || d.device_type || 'particle_counter';
              const serviceType = d.serviceType || d.service_type || 'calibration';
              if (serviceType.includes('calibration') || serviceType === 'cal_repair' || serviceType === 'calibration_repair') calTypes.add(deviceType);
              if (serviceType.includes('repair') || serviceType === 'cal_repair' || serviceType === 'calibration_repair') hasRepair = true;
            });
            calibrationTypes = Array.from(calTypes);
          }
          const servicesSubtotal = quoteData.servicesSubtotal || request.quote_subtotal || 0;
          const isFullyContractCovered = devices.length > 0 && devices.every(d => d.isContractCovered);
          const shippingTotal = isFullyContractCovered ? 0 : (quoteData.shippingTotal || request.quote_shipping || 0);
          const grandTotal = isFullyContractCovered ? 0 : (quoteData.grandTotal || request.quote_total || 0);

          return (
          <QuoteDocumentView
            title={request.quote_revision_count > 0 ? `OFFRE DE PRIX Rev-${request.quote_revision_count}` : 'OFFRE DE PRIX'}
            docNumber={request.quote_number || request.request_number} reference={request.request_number} refLabel="RMA"
            date={request.quoted_at} company={company} quoteData={qDocData} conditions={QUOTE_DISCLAIMERS}
            onClose={() => setShowQuoteModal(false)}
            showApprove={isQuoteSent && !request.bc_submitted_at}
            onApprove={() => { setShowQuoteModal(false); setShowBCModal(true); }}
            bcData={bcInfo}
          >
            {/* Service Descriptions */}
            <div className="px-8 py-6 space-y-6">
              {calibrationTypes.map(type => {
                const template = CALIBRATION_TEMPLATES[type] || CALIBRATION_TEMPLATES.particle_counter;
                return (
                  <div key={type} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-bold text-lg text-[#1a1a2e] mb-3 flex items-center gap-2">
                      <span>{template.icon}</span> {template.title}
                    </h3>
                    <ul className="space-y-1">
                      {template.prestations.map((p, i) => (
                        <li key={i} className="text-gray-700 flex items-start gap-2">
                          <span className="text-[#1a1a2e] mt-1">▸</span><span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {hasRepair && (
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-bold text-lg text-[#1a1a2e] mb-3 flex items-center gap-2">
                    <span>{REPAIR_TEMPLATE.icon}</span> {REPAIR_TEMPLATE.title}
                  </h3>
                  <ul className="space-y-1">
                    {REPAIR_TEMPLATE.prestations.map((p, i) => (
                      <li key={i} className="text-gray-700 flex items-start gap-2">
                        <span className="text-orange-500 mt-1">▸</span><span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Pricing Table */}
            <div className="px-8 py-6 bg-gray-50">
              <h3 className="font-bold text-lg text-[#1a1a2e] mb-4">Récapitulatif des Prix</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a1a2e] text-white">
                    <th className="px-3 py-2.5 text-center w-12">Qté</th>
                    <th className="px-3 py-2.5 text-left">Désignation</th>
                    <th className="px-3 py-2.5 text-right w-24">Prix Unit.</th>
                    <th className="px-3 py-2.5 text-right w-24">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device, i) => {
                    const rows = [];
                    if (device.needsCalibration || (device.serviceType || device.service_type || '').includes('calibration')) {
                      const qty = device.calibrationQty || 1; const unitPrice = parseFloat(device.calibrationPrice) || 0;
                      const lineTotal = qty * unitPrice; const isContract = device.isContractCovered;
                      rows.push(<tr key={`${i}-cal`} className={rows.length % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-center">{qty}</td>
                        <td className="px-3 py-2">Étalonnage {device.model || device.model_name || ''} (SN: {device.serial || device.serial_number || ''})
                          {isContract && <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded">CONTRAT</span>}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{isContract ? <span className="text-emerald-600">Contrat</span> : `${unitPrice.toFixed(2)} €`}</td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{isContract ? <span className="text-emerald-600">Contrat</span> : `${lineTotal.toFixed(2)} €`}</td>
                      </tr>);
                    }
                    if (device.needsNettoyage && !device.isContractCovered && device.nettoyagePrice > 0) {
                      const qty = device.nettoyageQty || 1; const unitPrice = parseFloat(device.nettoyagePrice) || 0; const lineTotal = qty * unitPrice;
                      rows.push(<tr key={`${i}-nett`} className={rows.length % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-center">{qty}</td>
                        <td className="px-3 py-2">Nettoyage cellule - si requis selon l'état du capteur</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{unitPrice.toFixed(2)} €</td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{lineTotal.toFixed(2)} €</td>
                      </tr>);
                    }
                    if (device.needsRepair || (device.serviceType || device.service_type || '').includes('repair')) {
                      const qty = device.repairQty || 1; const unitPrice = parseFloat(device.repairPrice) || 0; const lineTotal = qty * unitPrice;
                      rows.push(<tr key={`${i}-rep`} className={rows.length % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-center">{qty}</td>
                        <td className="px-3 py-2">Réparation {device.model || device.model_name || ''} (SN: {device.serial || device.serial_number || ''})</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{unitPrice.toFixed(2)} €</td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{lineTotal.toFixed(2)} €</td>
                      </tr>);
                    }
                    (device.additionalParts || []).forEach((part, pi) => {
                      const qty = parseInt(part.quantity) || 1; const unitPrice = parseFloat(part.price) || 0; const lineTotal = qty * unitPrice;
                      rows.push(<tr key={`${i}-p-${pi}`} className={rows.length % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-center">{qty}</td>
                        <td className="px-3 py-2">{part.partNumber && <span className="text-gray-500 mr-1">[{part.partNumber}]</span>}{part.description || 'Pièce/Service'}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{unitPrice.toFixed(2)} €</td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{lineTotal.toFixed(2)} €</td>
                      </tr>);
                    });
                    return rows;
                  })}
                  {!isClientReturn && (
                    <tr className={isFullyContractCovered ? "bg-emerald-50" : "bg-gray-100"}>
                      <td className="px-3 py-2 text-center">{quoteData.shipping?.parcels || request.parcels_count || 1}</td>
                      <td className="px-3 py-2">Frais de port ({quoteData.shipping?.parcels || request.parcels_count || 1} colis)</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{isFullyContractCovered ? <span className="text-emerald-600">Contrat</span> : `${(quoteData.shipping?.unitPrice || 45).toFixed(2)} €`}</td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{isFullyContractCovered ? <span className="text-emerald-600">Contrat</span> : `${shippingTotal.toFixed(2)} €`}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className={isFullyContractCovered ? "bg-emerald-600 text-white" : "bg-[#2D5A7B] text-white"}>
                    <td colSpan={2} className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-right font-bold text-lg whitespace-nowrap">TOTAL HT</td>
                    <td className="px-3 py-3 text-right font-bold text-xl whitespace-nowrap">{isFullyContractCovered ? 'Contrat' : `${grandTotal.toFixed(2)} €`}</td>
                  </tr>
                </tfoot>
              </table>
              {devices.some(d => d.needsNettoyage && !d.isContractCovered) && (
                <p className="text-xs text-gray-500 mt-3 italic">* Le nettoyage cellule sera facturé uniquement si nécessaire selon l'état du capteur à réception.</p>
              )}
            </div>
          </QuoteDocumentView>
          );
        })()}

        {/* ============================================ */}
        {/* TWO-VIEW PATTERN: RMA Overview vs Device Detail */}
        {/* ============================================ */}
        
        {/* === DEVICE DETAIL SUB-VIEW === */}
        {selectedDevice && !isPartsOrder && (() => {
          const device = request.request_devices?.find(d => d.id === selectedDevice.id) || selectedDevice;
          const devAddr = deviceAddresses[device.id] || shippingAddress;
          const serviceType = device.service_type || request.requested_service || 'calibration';
          const devStyle = STATUS_STYLES[device.status] || STATUS_STYLES[request.status] || STATUS_STYLES.submitted;
          const deviceAtts = attachments.filter(a => 
            (a.device_serial === device.serial_number) && !a.category?.startsWith('internal_')
          );
          const deviceImages = attachments.filter(a => 
            a.file_type?.startsWith('image/') && (a.device_serial === device.serial_number)
          );
          // Unlinked images go to first device
          const firstDeviceId = request.request_devices?.[0]?.id;
          const unlinkedImages = device.id === firstDeviceId 
            ? attachments.filter(a => a.file_type?.startsWith('image/') && !a.device_serial)
            : [];
          const allDeviceImages = [...deviceImages, ...unlinkedImages];
          
          // Effective status for progress bar
          const earlyStatuses = ['submitted', 'pending', 'quote_sent', 'quote_revision_requested', 'quote_revision_declined',
            'approved', 'bc_pending', 'bc_review', 'waiting_bc', 'waiting_po', 'waiting_device', 'bc_approved', 'waiting_reception'];
          const rmaIsEarly = earlyStatuses.includes(request.status);
          const effectiveStatus = (() => {
            if (device.shipped_at) return 'shipped';
            if (device.qc_complete) return 'ready_to_ship';
            if (device.report_complete && !device.qc_complete) return 'final_qc';
            // If device is physically received, use device status even if RMA is in early/BC phase
            if (device.received_at || device.status === 'received') return device.status || 'received';
            return rmaIsEarly ? request.status : (device.status || request.status);
          })();
          
          return (
            <div>
              {/* Back to RMA Overview */}
              <div className="px-6 py-3 border-b border-gray-100">
                <button 
                  onClick={() => { setSelectedDevice(null); setDeviceTab('details'); }}
                  className="text-[#3B7AB4] hover:text-[#1E3A5F] font-medium text-sm"
                >
                  ← Retour à la demande {request.request_number}
                </button>
              </div>
              
              {/* Device Header */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {getDeviceImageUrl(device.model_name) ? (
                      <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img src={getDeviceImageUrl(device.model_name)} alt={device.model_name} className="w-12 h-12 object-contain" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#3B7AB4] flex items-center justify-center text-white text-2xl flex-shrink-0">🔧</div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-[#1E3A5F]">{device.model_name || 'Appareil'}</h2>
                      <p className="font-mono text-[#3B7AB4]">SN: {device.serial_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      serviceType === 'calibration' ? 'bg-blue-100 text-blue-700' : 
                      serviceType === 'repair' ? 'bg-orange-100 text-orange-700' :
                      serviceType === 'calibration_repair' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {serviceType === 'calibration' ? '🔬 Étalonnage' : 
                       serviceType === 'repair' ? '🔧 Réparation' :
                       serviceType === 'calibration_repair' ? '🔬🔧 Étal. + Rép.' :
                       serviceType}
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <StepProgress status={effectiveStatus} serviceType={serviceType} bcApproved={!!request.bc_approved_at} />
              </div>
              
              {/* Device Tabs */}
              <div className="flex border-b border-gray-100">
                {[
                  { id: 'details', label: 'Détails', icon: '📋' },
                  { id: 'history', label: 'Historique', icon: '📜' },
                  { id: 'documents', label: 'Documents', icon: '📄' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDeviceTab(tab.id)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      deviceTab === tab.id 
                        ? 'text-[#3B7AB4] border-b-2 border-[#3B7AB4] -mb-px bg-blue-50/50' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </div>
              
              {/* Device Tab Content */}
              <div className="p-6">
                {/* === DETAILS TAB === */}
                {deviceTab === 'details' && (
                  <div className="space-y-6">
                    {/* Device Info Grid */}
                    <div>
                      <h3 className="font-bold text-[#1E3A5F] mb-3">Informations de l'appareil</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase">Modèle</p>
                          <p className="font-semibold text-[#1E3A5F]">{device.model_name || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase">N° de série</p>
                          <p className="font-mono font-semibold text-[#3B7AB4]">{device.serial_number}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase">Marque</p>
                          <p className="font-medium">{device.equipment_type || 'Lighthouse'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase">Service</p>
                          <p className="font-medium">
                            {serviceType === 'calibration' ? 'Étalonnage' :
                             serviceType === 'repair' ? 'Réparation' :
                             serviceType === 'calibration_repair' ? 'Étalonnage + Réparation' :
                             serviceType || '—'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase">Statut</p>
                          <p className={`font-medium ${devStyle.text}`}>{devStyle.label}</p>
                        </div>
                        {device.tracking_number && (
                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-xs text-green-600 uppercase">N° Suivi</p>
                            <a 
                              href={device.tracking_url || `https://www.ups.com/track?tracknum=${device.tracking_number}`}
                              target="_blank" rel="noopener noreferrer"
                              className="font-mono text-green-700 hover:underline text-sm"
                            >{device.tracking_number}</a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Accessories */}
                    {device.accessories && device.accessories.length > 0 && (
                      <div>
                        <h3 className="font-bold text-[#1E3A5F] mb-3">Accessoires</h3>
                        <div className="flex flex-wrap gap-2">
                          {device.accessories.map((acc, i) => (
                            <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full border">
                              {acc === 'charger' ? '🔌 Chargeur' : acc === 'battery' ? '🔋 Batterie' : acc === 'powerCable' ? '🔌 Câble' : acc === 'carryingCase' ? '💼 Mallette' : acc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Customer Notes */}
                    {device.notes && (
                      <div>
                        <h3 className="font-bold text-[#1E3A5F] mb-3">Notes / Description du problème</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-700 whitespace-pre-wrap">{device.notes}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Service Findings (if available) */}
                    {device.service_findings && (
                      <div>
                        <h3 className="font-bold text-[#1E3A5F] mb-3">Constatations du technicien</h3>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-gray-700 whitespace-pre-wrap">{device.service_findings}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Work Completed (if available) */}
                    {device.work_completed && (
                      <div>
                        <h3 className="font-bold text-[#1E3A5F] mb-3">Travaux effectués</h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-gray-700 whitespace-pre-wrap">{device.work_completed}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Shipping Address */}
                    {devAddr && (
                      <div>
                        <h3 className="font-bold text-[#1E3A5F] mb-3">📍 Adresse de retour</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="font-semibold text-[#1E3A5F]">{devAddr.company_name}</p>
                          {devAddr.attention && <p className="text-gray-600">À l'att. de: {devAddr.attention}</p>}
                          <p className="text-gray-600">{devAddr.address_line1}</p>
                          <p className="text-gray-600">{devAddr.postal_code} {devAddr.city}</p>
                          {devAddr.country && devAddr.country !== 'France' && <p className="text-gray-600">{devAddr.country}</p>}
                          {devAddr.phone && <p className="text-gray-500 text-sm">📞 {devAddr.phone}</p>}
                        </div>
                      </div>
                    )}
                    
                    {/* Photos */}
                    {allDeviceImages.length > 0 && (
                      <div>
                        <h3 className="font-bold text-[#1E3A5F] mb-3">📷 Photos</h3>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                          {allDeviceImages.map(img => (
                            <a key={img.id} href={img.file_url} target="_blank" rel="noopener noreferrer"
                               className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity border">
                              <img src={img.file_url} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* === HISTORY TAB === */}
                {deviceTab === 'history' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-[#1E3A5F]">Historique de cet appareil</h3>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      <div className="space-y-4">
                        {[
                          { date: request.created_at, label: 'Demande soumise', icon: '📝', color: 'gray' },
                          request.request_number && { date: request.created_at, label: 'RMA créé — Devis envoyé', icon: '💰', color: 'blue' },
                          request.quote_sent_at && { date: request.quote_sent_at, label: 'Devis envoyé au client', icon: '📧', color: 'blue' },
                          request.bc_submitted_at && { date: request.bc_submitted_at, label: 'Bon de commande soumis', icon: '📄', color: 'purple' },
                          request.bc_approved_at && { date: request.bc_approved_at, label: 'BC approuvé — En attente réception', icon: '✅', color: 'green' },
                          request.received_at && { date: request.received_at, label: 'Appareil reçu au laboratoire', icon: '📦', color: 'cyan' },
                          device.service_started_at && { date: device.service_started_at, label: serviceType === 'repair' ? 'Réparation démarrée' : 'Étalonnage démarré', icon: '🔧', color: 'indigo' },
                          device.report_completed_at && { date: device.report_completed_at, label: 'Rapport de service complété', icon: '📋', color: 'blue' },
                          device.qc_completed_at && { date: device.qc_completed_at, label: 'Contrôle qualité validé — Prêt à expédier', icon: '✅', color: 'green' },
                          device.shipped_at && { date: device.shipped_at, label: 'Expédié', icon: '🚚', color: 'green' }
                        ].filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date)).map((event, idx) => (
                          <div key={idx} className="relative pl-10">
                            <div className={`absolute left-2 w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center text-xs ${
                              event.color === 'green' ? 'bg-green-500' :
                              event.color === 'blue' ? 'bg-blue-500' :
                              event.color === 'indigo' ? 'bg-indigo-500' :
                              event.color === 'purple' ? 'bg-purple-500' :
                              event.color === 'cyan' ? 'bg-cyan-500' :
                              event.color === 'amber' ? 'bg-amber-500' :
                              'bg-gray-400'
                            }`}></div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="font-medium text-gray-800">{event.icon} {event.label}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Device history from database */}
                    {history.filter(h => h.serial_number === device.serial_number || !h.serial_number).length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-bold text-[#1E3A5F] mb-3">Événements enregistrés</h3>
                        <div className="space-y-2">
                          {history.filter(h => h.serial_number === device.serial_number || !h.serial_number).map(event => (
                            <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-2 h-2 rounded-full bg-[#3B7AB4] mt-2 flex-shrink-0"></div>
                              <div>
                                <p className="font-medium text-gray-800">{event.event_description}</p>
                                <p className="text-sm text-gray-500">{new Date(event.event_date).toLocaleString('fr-FR')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* === DOCUMENTS TAB === */}
                {deviceTab === 'documents' && (
                  <div className="space-y-6">
                    <h3 className="font-bold text-[#1E3A5F]">📁 Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Quote (RMA-level) */}
                      {request.quote_url && (
                        <a href={request.quote_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-lg hover:bg-blue-50 transition-colors border-blue-200">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">💰</div>
                          <div>
                            <p className="font-medium text-gray-800">
                              Devis{request.quote_revision_count > 0 ? ` Rev-${request.quote_revision_count}` : ''} (actuel)
                            </p>
                            <p className="text-sm text-blue-600">N° {request.quote_number || request.request_number}</p>
                          </div>
                        </a>
                      )}
                      
                      {/* Signed Quote / BC */}
                      {request.signed_quote_url && (
                        <a href={request.signed_quote_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-lg hover:bg-green-50 transition-colors border-green-200">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">✅</div>
                          <div>
                            <p className="font-medium text-gray-800">
                              Devis Signé{request.quote_revision_count > 0 ? ` Rev-${request.quote_revision_count}` : ''} / BC
                            </p>
                            <p className="text-sm text-green-600">N° {request.bc_number || request.quote_number || request.request_number}</p>
                          </div>
                        </a>
                      )}
                      
                      {/* BC file if separate */}
                      {request.bc_file_url && request.bc_file_url !== request.signed_quote_url && (
                        <a href={request.bc_file_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-lg hover:bg-purple-50 transition-colors border-purple-200">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">📋</div>
                          <div>
                            <p className="font-medium text-gray-800">Bon de Commande</p>
                            <p className="text-sm text-purple-600">N° {request.bc_number || request.quote_number || request.request_number}</p>
                          </div>
                        </a>
                      )}
                      
                      {/* Supplement Quote (avenant_quote) */}
                      {attachments.find(a => a.category === 'avenant_quote' && a.file_url) && (
                        <a href={attachments.find(a => a.category === 'avenant_quote').file_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-lg hover:bg-amber-50 transition-colors border-amber-200">
                          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                          <div>
                            <p className="font-medium text-gray-800">Supplément au Devis</p>
                            <p className="text-sm text-amber-600">{request.supplement_number ? `N° ${request.supplement_number}` : 'Supplément'}</p>
                          </div>
                        </a>
                      )}
                      
                      {/* Signed Supplement (avenant_signe) */}
                      {attachments.find(a => a.category === 'avenant_signe' && a.file_url) && (
                        <a href={attachments.find(a => a.category === 'avenant_signe').file_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-lg hover:bg-green-50 transition-colors border-green-200">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">✅</div>
                          <div>
                            <p className="font-medium text-gray-800">Supplément Signé</p>
                            <p className="text-sm text-green-600">{request.supplement_number ? `N° ${request.supplement_number}` : 'Signé'}</p>
                          </div>
                        </a>
                      )}
                      
                      {/* Supplement BC (avenant_bc) */}
                      {attachments.find(a => a.category === 'avenant_bc' && a.file_url) && (
                        <a href={attachments.find(a => a.category === 'avenant_bc').file_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-lg hover:bg-amber-50 transition-colors border-amber-200">
                          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">📋</div>
                          <div>
                            <p className="font-medium text-gray-800">BC Supplément</p>
                            <p className="text-sm text-amber-600">{request.supplement_bc_number ? `N° ${request.supplement_bc_number}` : 'BC Supplément'}</p>
                          </div>
                        </a>
                      )}
                      
                      {/* Per-device: Service Report */}
                      {device.report_url && (
                        <a href={device.report_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-lg hover:bg-blue-50 transition-colors border-blue-200">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">📋</div>
                          <div>
                            <p className="font-medium text-gray-800">Rapport de Service</p>
                            <p className="text-sm text-blue-600">SN: {device.serial_number}</p>
                          </div>
                        </a>
                      )}
                      
                      {/* Per-device: Calibration Certificate */}
                      {device.calibration_certificate_url && (
                        <a href={device.calibration_certificate_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-lg hover:bg-emerald-50 transition-colors border-emerald-300">
                          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-2xl">🏆</div>
                          <div>
                            <p className="font-medium text-gray-800">Certificat d'Étalonnage</p>
                            <p className="text-sm text-emerald-600">{device.certificate_number || device.serial_number}</p>
                          </div>
                        </a>
                      )}
                      
                      {/* Per-device: BL */}
                      {device.bl_url && (
                        <a href={device.bl_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-lg hover:bg-cyan-50 transition-colors border-cyan-200">
                          <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                          <div>
                            <p className="font-medium text-gray-800">Bon de Livraison</p>
                            <p className="text-sm text-cyan-600">{device.bl_number ? `N° ${device.bl_number}` : 'BL'}</p>
                          </div>
                        </a>
                      )}
                      
                      {/* Per-device attachments */}
                      {deviceAtts.filter(a => !a.file_type?.startsWith('image/') && !['avenant_quote', 'avenant_signe', 'avenant_bc', 'bon_commande', 'devis_signe'].includes(a.category)).map(att => (
                        <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600">
                            {att.file_name?.split('.').pop()?.toUpperCase() || 'DOC'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{att.file_name}</p>
                            <p className="text-sm text-gray-500">{new Date(att.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                    
                    {/* No docs */}
                    {!request.quote_url && !request.signed_quote_url && !request.bc_file_url && 
                     !device.report_url && !device.calibration_certificate_url && !device.bl_url && 
                     !attachments.find(a => ['avenant_quote', 'avenant_signe', 'avenant_bc'].includes(a.category)) &&
                     deviceAtts.filter(a => !a.file_type?.startsWith('image/') && !['avenant_quote', 'avenant_signe', 'avenant_bc', 'bon_commande', 'devis_signe'].includes(a.category)).length === 0 && (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-3xl mb-2">📄</p>
                        <p className="text-gray-500">Aucun document disponible pour le moment</p>
                        <p className="text-sm text-gray-400">Les devis, certificats et rapports apparaîtront ici</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        
        {/* === RMA OVERVIEW (when no device selected) === */}
        {(!selectedDevice || isPartsOrder) && (
          <>
            {/* RMA Tabs: Overview + Messages */}
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {[
                { id: 'overview', label: 'Appareils', icon: '🔧', hide: isPartsOrder },
                { id: 'overview', label: 'Commande', icon: '📦', hide: !isPartsOrder },
                { id: 'documents', label: 'Documents', icon: '📁', hide: !isPartsOrder },
                { id: 'history', label: 'Historique', icon: '📜', hide: !isPartsOrder },
                { id: 'messages', label: 'Messages', icon: '💬', count: messages.filter(m => !m.is_read && m.sender_id !== profile?.id).length }
              ].filter(t => !t.hide).map(tab => (
                <button
                  key={tab.id + tab.label}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'text-[#3B7AB4] border-b-2 border-[#3B7AB4] -mb-px' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="p-6">
              {/* === OVERVIEW TAB: Device List + Parts === */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Service devices - clickable cards */}
                  {!isPartsOrder && (
                    <div>
                      <p className="text-sm text-gray-500 mb-4">Cliquez sur un appareil pour voir ses détails, historique et documents</p>
                      <div className="space-y-3">
                        {request.request_devices?.map((device, idx) => {
                          const serviceType = device.service_type || request.requested_service || 'calibration';
                          const earlyStatuses = ['submitted', 'pending', 'quote_sent', 'quote_revision_requested', 'quote_revision_declined',
                            'approved', 'bc_pending', 'bc_review', 'waiting_bc', 'waiting_po', 'waiting_device', 'bc_approved', 'waiting_reception'];
                          const rmaIsEarly = earlyStatuses.includes(request.status);
                          const effectiveStatus = (() => {
                            if (device.shipped_at) return 'shipped';
                            if (device.qc_complete) return 'ready_to_ship';
                            if (device.report_complete && !device.qc_complete) return 'final_qc';
                            if (device.received_at || device.status === 'received') return device.status || 'received';
                            return rmaIsEarly ? request.status : (device.status || request.status);
                          })();
                          
                          return (
                            <button
                              key={device.id}
                              onClick={() => { setSelectedDevice(device); setDeviceTab('details'); }}
                              className="w-full text-left bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#3B7AB4] transition-all"
                            >
                              {/* Device info row */}
                              <div className="px-5 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  {getDeviceImageUrl(device.model_name) ? (
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                      <img src={getDeviceImageUrl(device.model_name)} alt={device.model_name} className="w-10 h-10 object-contain" />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#3B7AB4] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                      {idx + 1}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-[#1E3A5F] text-lg">{device.model_name || 'Appareil'}</p>
                                    <p className="font-mono text-sm text-[#3B7AB4]">SN: {device.serial_number}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    serviceType === 'calibration' ? 'bg-blue-100 text-blue-700' : 
                                    serviceType === 'repair' ? 'bg-orange-100 text-orange-700' :
                                    serviceType === 'calibration_repair' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {serviceType === 'calibration' ? '🔬 Étalonnage' : 
                                     serviceType === 'repair' ? '🔧 Réparation' :
                                     serviceType === 'calibration_repair' ? '🔬🔧 Étal. + Rép.' :
                                     serviceType}
                                  </span>
                                  <span className="text-[#3B7AB4] text-lg">→</span>
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="px-4 pb-3">
                                <StepProgress status={effectiveStatus} serviceType={serviceType} bcApproved={!!request.bc_approved_at} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Parts Order Progress Tracker */}
                  {isPartsOrder && (
                    <div>
                      {/* Progress Bar - same style as RMA */}
                      <div className="mb-6">
                        <StepProgress status={request.status} serviceType="parts" bcApproved={!!request.bc_approved_at} />
                      </div>
                      
                      {/* Tracking Info */}
                      {request.ups_tracking_number && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-700 font-medium">🚚 Suivi UPS</p>
                          <a href={`https://www.ups.com/track?tracknum=${request.ups_tracking_number}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">{request.ups_tracking_number}</a>
                        </div>
                      )}
                      
                      {/* Parts details */}
                      {request.problem_description && (
                        <div className="mt-6">
                          <h3 className="font-bold text-[#1E3A5F] mb-3">Détails de la commande</h3>
                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            {request.problem_description.split('\n').map((line, i) => (
                              <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                                <p className="text-gray-700">{line}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* === DOCUMENTS TAB (Parts Orders) === */}
              {activeTab === 'documents' && isPartsOrder && (
                <div className="space-y-4">
                  <h3 className="font-bold text-[#1E3A5F] text-lg">📁 Documents</h3>
                  {(request.quote_url || request.signed_quote_url || request.bc_file_url) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {request.quote_url && (
                        <a href={request.quote_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-xl hover:bg-blue-50 border-blue-200 transition-colors">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">💰</div>
                          <div>
                            <p className="font-medium text-gray-800">
                              Devis{request.quote_revision_count > 0 ? ` Rev-${request.quote_revision_count}` : ''} (actuel)
                            </p>
                            <p className="text-sm text-blue-600">N° {request.quote_number || request.request_number}</p>
                          </div>
                        </a>
                      )}
                      {request.signed_quote_url && (
                        <a href={request.signed_quote_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-xl hover:bg-green-50 border-green-200 transition-colors">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">✅</div>
                          <div>
                            <p className="font-medium text-gray-800">
                              Devis Signé{request.quote_revision_count > 0 ? ` Rev-${request.quote_revision_count}` : ''} / BC
                            </p>
                            <p className="text-sm text-green-600">N° {request.bc_number || request.quote_number || request.request_number}</p>
                          </div>
                        </a>
                      )}
                      {request.bc_file_url && request.bc_file_url !== request.signed_quote_url && (
                        <a href={request.bc_file_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-xl hover:bg-purple-50 border-purple-200 transition-colors">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">📋</div>
                          <div>
                            <p className="font-medium text-gray-800">Bon de Commande</p>
                            <p className="text-sm text-purple-600">N° {request.bc_number || request.quote_number || request.request_number}</p>
                          </div>
                        </a>
                      )}
                      {request.bl_url && (
                        <a href={request.bl_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-4 p-4 border rounded-xl hover:bg-cyan-50 border-cyan-200 transition-colors">
                          <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🚚</div>
                          <div>
                            <p className="font-medium text-gray-800">Bon de Livraison</p>
                            <p className="text-sm text-cyan-600">N° {request.bl_number || '—'}</p>
                          </div>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-4xl mb-2">📁</p>
                      <p>Aucun document disponible</p>
                      <p className="text-sm mt-1">Les documents apparaîtront ici au fur et à mesure du traitement</p>
                    </div>
                  )}
                </div>
              )}

              {/* === HISTORY TAB (Parts Orders) === */}
              {activeTab === 'history' && isPartsOrder && (
                <div className="space-y-4">
                  <h3 className="font-bold text-[#1E3A5F] text-lg">📜 Historique</h3>
                  {(() => {
                    const events = [
                      request.created_at && { date: request.created_at, label: 'Demande soumise', detail: 'Commande de pièces créée', icon: '📝', color: 'gray' },
                      request.request_number && request.quoted_at && { date: request.quoted_at, label: 'Devis envoyé', detail: `N° ${request.quote_number || request.request_number}${request.quote_total ? ' — ' + parseFloat(request.quote_total).toFixed(2) + ' € HT' : ''}`, icon: '💰', color: 'blue' },
                      request.quote_approved_at && { date: request.quote_approved_at, label: 'Devis approuvé', detail: 'Le client a accepté le devis', icon: '👍', color: 'green' },
                      request.bc_submitted_at && { date: request.bc_submitted_at, label: 'BC soumis', detail: request.bc_number ? `N° ${request.bc_number}` : 'Bon de commande soumis par le client', icon: '📋', color: 'blue' },
                      request.bc_approved_at && { date: request.bc_approved_at, label: 'BC approuvé', detail: 'Bon de commande validé par Lighthouse', icon: '✅', color: 'green' },
                      request.shipped_at && { date: request.shipped_at, label: 'Expédié', detail: request.ups_tracking_number ? `UPS: ${request.ups_tracking_number}` : 'Commande expédiée', icon: '🚚', color: 'green' },
                      request.completed_at && { date: request.completed_at, label: 'Terminé', detail: 'Commande clôturée', icon: '🏁', color: 'green' }
                    ].filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));

                    if (events.length === 0) {
                      return (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-4xl mb-2">📜</p>
                          <p>Aucun événement</p>
                        </div>
                      );
                    }

                    const colorMap = { gray: 'border-gray-300', blue: 'border-blue-400', green: 'border-green-500', amber: 'border-amber-400' };
                    const bgMap = { gray: 'bg-gray-100', blue: 'bg-blue-100', green: 'bg-green-100', amber: 'bg-amber-100' };

                    return (
                      <div className="relative">
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                        <div className="space-y-4">
                          {events.map((event, idx) => (
                            <div key={idx} className="flex gap-4 items-start relative">
                              <div className={`w-10 h-10 rounded-full ${bgMap[event.color] || 'bg-gray-100'} border-2 ${colorMap[event.color] || 'border-gray-300'} flex items-center justify-center text-lg z-10 flex-shrink-0`}>
                                {event.icon}
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-lg p-3 border">
                                <div className="flex justify-between items-start gap-2">
                                  <p className="font-bold text-gray-800 text-sm">{event.label}</p>
                                  <p className="text-xs text-gray-400 whitespace-nowrap">{new Date(event.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                {event.detail && <p className="text-sm text-gray-600 mt-1">{event.detail}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* === MESSAGES TAB === */}
              {activeTab === 'messages' && (
                <div>
                  <div className="h-[400px] overflow-y-auto mb-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-400 py-12">
                        <p className="text-4xl mb-2">💬</p>
                        <p>Aucun message</p>
                        <p className="text-sm">Envoyez un message à notre équipe</p>
                      </div>
                    ) : (
                      messages.map(msg => {
                        const isMe = msg.sender_id === profile?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-lg p-3 ${
                              isMe ? 'bg-[#3B7AB4] text-white' : 'bg-gray-100 text-gray-800'
                            }`}>
                              <p className={`text-xs font-medium mb-1 ${isMe ? 'text-white/70' : 'text-[#3B7AB4]'}`}>
                                {isMe ? 'Vous' : (msg.sender_name || 'Lighthouse France')}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              {msg.attachment_url && (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`text-xs mt-2 block ${isMe ? 'text-white/80 hover:text-white' : 'text-blue-600 hover:underline'}`}>
                                  📎 {msg.attachment_name || 'Télécharger le fichier'}
                                </a>
                              )}
                              <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                {new Date(msg.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Écrivez votre message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7AB4]"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="px-6 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {sending ? '...' : 'Envoyer'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Contact Support */}
        <div className="p-4 border-t border-gray-100 flex justify-between items-center">
          <p className="text-sm text-gray-500">Besoin d'aide?</p>
          <a 
            href="mailto:france@golighthouse.com?subject=Question sur demande"
            className="text-[#3B7AB4] text-sm font-medium hover:underline"
          >
            Contacter le support →
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DEVICE HISTORY PAGE
// ============================================
function DeviceHistoryPage({ profile, requests, t, setPage, setSelectedRequest }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [history, setHistory] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [rmaAttachments, setRmaAttachments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get serial from sessionStorage
    const storedSerial = sessionStorage.getItem('viewDeviceSerial');
    if (storedSerial) {
      setSerialNumber(storedSerial);
      setSearchInput(storedSerial);
      sessionStorage.removeItem('viewDeviceSerial');
    }
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!serialNumber) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      // Find all requests containing this serial number
      const matchingRequests = requests.filter(req => 
        req.request_devices?.some(d => d.serial_number === serialNumber)
      );
      setAllRequests(matchingRequests);
      
      // Load device history
      const { data } = await supabase
        .from('device_history')
        .select('*')
        .eq('serial_number', serialNumber)
        .order('event_date', { ascending: false });
      
      if (data) setHistory(data);
      
      // Load attachments for each matching RMA
      if (matchingRequests.length > 0) {
        const { data: atts } = await supabase
          .from('request_attachments')
          .select('*')
          .in('request_id', matchingRequests.map(r => r.id))
          .not('category', 'like', 'internal_%');
        if (atts) {
          const attMap = {};
          atts.forEach(a => {
            if (!attMap[a.request_id]) attMap[a.request_id] = [];
            attMap[a.request_id].push(a);
          });
          setRmaAttachments(attMap);
        }
      }
      
      setLoading(false);
    };
    loadHistory();
  }, [serialNumber, requests]);

  // Get device info from first request
  const deviceInfo = allRequests[0]?.request_devices?.find(d => d.serial_number === serialNumber);
  
  // Handle search
  const handleSearch = () => {
    const term = searchInput.trim();
    if (term) setSerialNumber(term);
  };

  return (
    <div>
      <button
        onClick={() => setPage('dashboard')}
        className="mb-6 text-[#3B7AB4] hover:text-[#1E3A5F] font-medium"
      >
        ← Retour au tableau de bord
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {/* Search bar */}
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-4">🔍 Historique d'un appareil</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Entrez un N° de série..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7AB4] font-mono"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2.5 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F]"
            >
              Rechercher
            </button>
          </div>
          {deviceInfo && (
            <div className="mt-4 flex items-center gap-4">
              {getDeviceImageUrl(deviceInfo.model_name) ? (
                <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={getDeviceImageUrl(deviceInfo.model_name)} alt={deviceInfo.model_name} className="w-12 h-12 object-contain" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#3B7AB4] flex items-center justify-center text-white text-2xl flex-shrink-0">🔧</div>
              )}
              <div>
                <p className="text-xl font-bold text-[#1E3A5F]">{deviceInfo.model_name}</p>
                <p className="font-mono text-[#3B7AB4]">SN: {serialNumber}</p>
                <p className="text-sm text-gray-500">{allRequests.length} demande(s) de service</p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#3B7AB4] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !serialNumber ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500">Entrez un numéro de série pour voir l'historique de l'appareil</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Service History from Requests - with per-device documents */}
            {allRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-500">Aucun historique de service trouvé pour SN: {serialNumber}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {allRequests.map(req => {
                  const device = req.request_devices?.find(d => d.serial_number === serialNumber);
                  const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
                  const reqAtts = rmaAttachments[req.id] || [];
                  const deviceAtts = reqAtts.filter(a => a.device_serial === serialNumber);
                  
                  // Check if there are any docs for this device in this RMA
                  const hasDocs = req.quote_url || req.signed_quote_url || device?.report_url || 
                                  device?.calibration_certificate_url || device?.bl_url || deviceAtts.length > 0;
                  
                  return (
                    <div key={req.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* RMA Header */}
                      <div className="p-4 bg-gray-50 flex justify-between items-start cursor-pointer hover:bg-gray-100"
                           onClick={() => {
                             if (setSelectedRequest) {
                               setSelectedRequest(req);
                               setPage('request-detail');
                             }
                           }}>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-[#3B7AB4] text-lg">{req.request_number}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {device?.service_type === 'calibration' ? '🔬 Étalonnage' : 
                             device?.service_type === 'repair' ? '🔧 Réparation' :
                             device?.service_type === 'calibration_repair' ? '🔬🔧 Étalonnage + Réparation' :
                             device?.service_type || 'Service'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">
                            {new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-[#3B7AB4] mt-1">Voir la demande →</p>
                        </div>
                      </div>
                      
                      {/* Documents for this device in this RMA */}
                      {hasDocs && (
                        <div className="p-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">📁 Documents</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {req.quote_url && (
                              <a href={req.quote_url} target="_blank" rel="noopener noreferrer"
                                 className="flex items-center gap-2 p-2 border rounded-lg hover:bg-blue-50 text-sm border-blue-200">
                                <span className="text-lg">💰</span>
                                <span className="text-gray-800 font-medium truncate">
                                  Devis{req.quote_revision_count > 0 ? ` Rev-${req.quote_revision_count}` : ''}
                                </span>
                              </a>
                            )}
                            {req.signed_quote_url && (
                              <a href={req.signed_quote_url} target="_blank" rel="noopener noreferrer"
                                 className="flex items-center gap-2 p-2 border rounded-lg hover:bg-green-50 text-sm border-green-200">
                                <span className="text-lg">✅</span>
                                <span className="text-gray-800 font-medium truncate">BC Signé</span>
                              </a>
                            )}
                            {device?.report_url && (
                              <a href={device.report_url} target="_blank" rel="noopener noreferrer"
                                 className="flex items-center gap-2 p-2 border rounded-lg hover:bg-blue-50 text-sm border-blue-200">
                                <span className="text-lg">📋</span>
                                <span className="text-gray-800 font-medium truncate">Rapport</span>
                              </a>
                            )}
                            {device?.calibration_certificate_url && (
                              <a href={device.calibration_certificate_url} target="_blank" rel="noopener noreferrer"
                                 className="flex items-center gap-2 p-2 border rounded-lg hover:bg-emerald-50 text-sm border-emerald-300">
                                <span className="text-lg">🏆</span>
                                <span className="text-gray-800 font-medium truncate">Certificat</span>
                              </a>
                            )}
                            {device?.bl_url && (
                              <a href={device.bl_url} target="_blank" rel="noopener noreferrer"
                                 className="flex items-center gap-2 p-2 border rounded-lg hover:bg-cyan-50 text-sm border-cyan-200">
                                <span className="text-lg">📄</span>
                                <span className="text-gray-800 font-medium truncate">BL</span>
                              </a>
                            )}
                            {deviceAtts.filter(a => !a.file_type?.startsWith('image/')).map(att => (
                              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                                 className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 text-sm">
                                <span className="text-lg">📎</span>
                                <span className="text-gray-800 font-medium truncate">{att.file_name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Event Timeline */}
            {history.length > 0 && (
              <div>
                <h2 className="font-bold text-[#1E3A5F] mb-4">Événements</h2>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-4">
                    {history.map(event => (
                      <div key={event.id} className="flex gap-4 ml-4">
                        <div className="w-3 h-3 rounded-full bg-[#3B7AB4] border-2 border-white shadow -ml-[7px] mt-1.5 z-10"></div>
                        <div className="flex-1 pb-2">
                          <p className="font-medium text-[#1E3A5F]">{event.event_description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(event.event_date).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EDIT CONTRACT MODAL - For customer to edit after modification requested
// ============================================
function EditContractModal({ contract, notify, onClose, onSaved }) {
  const [editDevices, setEditDevices] = useState(contract.contract_devices || []);
  const [editDates, setEditDates] = useState({
    start_date: contract.start_date || new Date().toISOString().split('T')[0],
    end_date: contract.end_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const updateEditDevice = (deviceId, field, value) => {
    setEditDevices(editDevices.map(d => d.id === deviceId ? { ...d, [field]: value } : d));
  };

  const addEditDevice = () => {
    setEditDevices([...editDevices, {
      id: `new-${Date.now()}`,
      serial_number: '',
      model_name: '',
      device_type: 'particle_counter',
      tokens_total: 1,
      isNew: true
    }]);
  };

  const removeEditDevice = (deviceId) => {
    if (editDevices.length > 1) {
      setEditDevices(editDevices.filter(d => d.id !== deviceId));
    }
  };

  const submitEdits = async () => {
    // Validate
    if (!editDevices.some(d => d.serial_number?.trim())) {
      notify('Veuillez ajouter au moins un appareil avec un numéro de série', 'error');
      return;
    }

    setSaving(true);
    try {
      // First, delete ALL existing devices for this contract
      const { error: deleteError } = await supabase
        .from('contract_devices')
        .delete()
        .eq('contract_id', contract.id);

      if (deleteError) {
        console.error('Error deleting old devices:', deleteError);
        // Don't throw - try to continue, maybe RLS issue
      }

      // Wait a moment for delete to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Prepare new devices - only those with serial numbers
      const deviceInserts = editDevices.filter(d => d.serial_number?.trim()).map(d => ({
        contract_id: contract.id,
        serial_number: d.serial_number.trim(),
        model_name: d.model_name || '',
        device_type: d.device_type || 'particle_counter',
        nickname: d.nickname || '',
        tokens_total: parseInt(d.tokens_total) || 1,
        tokens_used: 0,
        unit_price: 0
      }));

      console.log('Inserting devices:', deviceInserts);

      // Insert new devices
      const { error: devicesError } = await supabase
        .from('contract_devices')
        .insert(deviceInserts);

      if (devicesError) {
        console.error('Error inserting devices:', devicesError);
        throw devicesError;
      }

      // Update contract dates and status
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          start_date: editDates.start_date,
          end_date: editDates.end_date,
          status: 'requested', // Back to requested for admin review
          admin_notes: null, // Clear the modification message
          customer_notes: editNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (contractError) throw contractError;

      notify('✅ Demande de contrat resoumise avec succès!', 'success');
      onSaved();
    } catch (err) {
      console.error('Error updating contract:', err);
      notify('Erreur: ' + err.message, 'error');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onClose} className="mb-4 text-gray-500 hover:text-gray-700 flex items-center gap-2">
        ← Annuler les modifications
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-500 text-white">
          <h1 className="text-xl font-bold">✏️ Modifier la Demande de Contrat</h1>
          <p className="text-amber-100">Modifiez les informations et resoumettez pour approbation</p>
        </div>

        {/* Admin Message */}
        {contract.admin_notes && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
            <p className="text-xs text-amber-600 uppercase font-medium">Message de Lighthouse :</p>
            <p className="text-amber-800 font-medium">{contract.admin_notes}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Contract Dates */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
              <input
                type="date"
                value={editDates.start_date}
                onChange={e => setEditDates({...editDates, start_date: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
              <input
                type="date"
                value={editDates.end_date}
                onChange={e => setEditDates({...editDates, end_date: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Devices */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">Appareils à inclure</h3>
              <button
                onClick={addEditDevice}
                className="px-3 py-1 bg-[#00A651] text-white text-sm rounded-lg hover:bg-[#008f45]"
              >
                + Ajouter un appareil
              </button>
            </div>
            
            <div className="space-y-3">
              {editDevices.map((device, idx) => (
                <div key={device.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-[#1E3A5F] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                    {editDevices.length > 1 && (
                      <button
                        onClick={() => removeEditDevice(device.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ✕ Supprimer
                      </button>
                    )}
                  </div>
                  <div className="grid md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">N° Série *</label>
                      <input
                        type="text"
                        value={device.serial_number || ''}
                        onChange={e => updateEditDevice(device.id, 'serial_number', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Ex: 12345678"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Modèle</label>
                      <input
                        type="text"
                        value={device.model_name || ''}
                        onChange={e => updateEditDevice(device.id, 'model_name', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Ex: ApexP3"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <select
                        value={device.device_type || 'particle_counter'}
                        onChange={e => updateEditDevice(device.id, 'device_type', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="particle_counter">Compteur Particules (Air)</option>
                        <option value="liquid_counter">Compteur Particules (Liquide)</option>
                        <option value="bio_collector">Bio Collecteur</option>
                        <option value="temp_humidity">Capteur Temp/Humidité</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Étalonnages/an</label>
                      <input
                        type="number"
                        value={device.tokens_total || 1}
                        onChange={e => updateEditDevice(device.id, 'tokens_total', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              rows={3}
              placeholder="Informations supplémentaires ou explications des modifications..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Annuler
          </button>
          <button
            onClick={submitEdits}
            disabled={saving}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? 'Envoi...' : '✅ Resoumettre la demande'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CONTRACTS PAGE (Customer View)
// ============================================
function ContractsPage({ profile, t, notify, setPage, perms, pendingContractId, setPendingContractId }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractTab, setContractTab] = useState('details');
  const [editingContract, setEditingContract] = useState(null); // For editing contract after modification requested
  
  // IDENTICAL to RMA - Quote and BC state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showBCModal, setShowBCModal] = useState(false);
  const [bcFile, setBcFile] = useState(null);
  const [signatureName, setSignatureName] = useState(profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || '');
  const [luEtApprouve, setLuEtApprouve] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [submittingBC, setSubmittingBC] = useState(false);
  const [approvingQuote, setApprovingQuote] = useState(false);
  const canvasRef = useRef(null);
  
  const signatureDateDisplay = new Date().toLocaleDateString('fr-FR');
  
  // Validation - IDENTICAL to RMA
  const hasFile = bcFile !== null;
  const hasSignature = signatureData && luEtApprouve.toLowerCase().trim() === 'lu et approuvé';
  const isSubmissionValid = signatureName.trim().length > 0 && acceptTerms && (hasFile || hasSignature);

  // Load contracts
  const loadContracts = useCallback(async () => {
    if (!profile?.company_id) return;
    
    const { data, error } = await supabase
      .from('contracts')
      .select('*, contract_devices(*), companies(*)')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading contracts:', error);
    } else {
      setContracts(data || []);
    }
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  // Auto-select contract from MyOrders navigation
  useEffect(() => {
    if (pendingContractId && contracts.length > 0 && !loading) {
      const target = contracts.find(c => c.id === pendingContractId);
      if (target) {
        setSelectedContract(target);
        if (setPendingContractId) setPendingContractId(null);
      }
    }
  }, [pendingContractId, contracts, loading]);

  // Signature pad functions - IDENTICAL to RMA
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1E3A5F';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureData(null);
  };

  // Request revision - IDENTICAL to RMA
  const handleRequestRevision = async () => {
    if (!revisionNotes.trim() || !selectedContract) return;
    
    setApprovingQuote(true);
    const { error } = await supabase.from('contracts').update({
      status: 'quote_revision_requested',
      quote_revision_notes: revisionNotes,
      quote_revision_requested_at: new Date().toISOString()
    }).eq('id', selectedContract.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('✅ Demande de modification envoyée!', 'success');
      setShowRevisionModal(false);
      setShowQuoteModal(false);
      setRevisionNotes('');
      loadContracts();
    }
    setApprovingQuote(false);
  };

  // Submit BC - COPIED FROM RMA (working version)
  const submitBonCommande = async () => {
    // Validation first - exactly like RMA
    if (!perms?.canRequest) {
      notify('Vous n\'avez pas la permission d\'effectuer cette action', 'error');
      return;
    }
    if (!acceptTerms) {
      notify('Veuillez accepter les conditions générales', 'error');
      return;
    }
    if (!signatureName.trim()) {
      notify('Veuillez entrer votre nom', 'error');
      return;
    }
    
    // Need either file OR signature
    const hasValidSignature = signatureData && luEtApprouve.toLowerCase().trim() === 'lu et approuvé';
    if (!bcFile && !hasValidSignature) {
      notify('Veuillez télécharger un bon de commande OU signer électroniquement', 'error');
      return;
    }
    
    if (!selectedContract) return;
    
    setSubmittingBC(true);
    const signatureDateISO = new Date().toISOString();
    
    try {
      // Try to upload BC file if provided (may fail if storage not configured)
      let fileUrl = null;
      if (bcFile) {
        try {
          const fileName = `bons-commande/contracts/${selectedContract.contract_number}/bc_${Date.now()}.${bcFile.name.split('.').pop()}`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, bcFile);
          
          if (!uploadError) {
            const { data: publicUrl } = supabase.storage
              .from('documents')
              .getPublicUrl(fileName);
            fileUrl = publicUrl?.publicUrl;
          }
        } catch (e) {
          console.log('File upload skipped - storage not configured');
        }
      }
      
      // Try to upload signature image (may fail if storage not configured)
      let signatureUrl = null;
      if (signatureData) {
        try {
          const signatureBlob = await fetch(signatureData).then(r => r.blob());
          const signatureFileName = `signatures/contracts/${selectedContract.contract_number}/sig_bc_${Date.now()}.png`;
          const { error: sigError } = await supabase.storage
            .from('documents')
            .upload(signatureFileName, signatureBlob);
          
          if (!sigError) {
            const { data: sigUrl } = supabase.storage
              .from('documents')
              .getPublicUrl(signatureFileName);
            signatureUrl = sigUrl?.publicUrl;
          }
        } catch (e) {
          console.log('Signature upload skipped - storage not configured');
        }
      }
      
      // Generate signed quote PDF
      let signedQuotePdfUrl = null;
      if (hasValidSignature) {
        try {
          const pdfBlob = await generateContractQuotePDF({
            contract: selectedContract,
            devices: selectedContract.contract_devices || [],
            totalPrice: (selectedContract.contract_devices || []).reduce((sum, d) => sum + (d.unit_price || 0), 0),
            totalTokens: (selectedContract.contract_devices || []).reduce((sum, d) => sum + (d.tokens_total || 0), 0),
            calibrationTypes: [...new Set((selectedContract.contract_devices || []).map(d => d.device_type || 'particle_counter'))],
            isSigned: true,
            signatureName: signatureName,
            signatureDate: new Date(signatureDateISO).toLocaleDateString('fr-FR'),
            signatureImage: signatureData
          });
          
          const pdfFileName = `bons-commande/contracts/${selectedContract.contract_number}/devis_signe_${Date.now()}.pdf`;
          const { error: pdfUploadError } = await supabase.storage
            .from('documents')
            .upload(pdfFileName, pdfBlob, { contentType: 'application/pdf' });
          
          if (!pdfUploadError) {
            const { data: pdfUrl } = supabase.storage
              .from('documents')
              .getPublicUrl(pdfFileName);
            signedQuotePdfUrl = pdfUrl?.publicUrl;
            console.log('Signed quote PDF uploaded:', signedQuotePdfUrl);
          } else {
            console.log('PDF upload error:', pdfUploadError);
          }
        } catch (e) {
          console.log('Signed quote PDF generation error:', e);
        }
      }
      
      // Update contract status - exactly like RMA updates service_requests
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ 
          status: 'bc_pending',
          bc_submitted_at: new Date().toISOString(),
          bc_signed_by: signatureName,
          bc_file_url: fileUrl,
          signed_quote_url: signedQuotePdfUrl
        })
        .eq('id', selectedContract.id);
      
      if (updateError) throw updateError;
      
      notify('Bon de commande soumis avec succès!');
      setShowBCModal(false);
      
      // Force full page reload to ensure fresh data - exactly like RMA
      window.location.reload();
      
    } catch (err) {
      notify(`Erreur: ${err.message}`, 'error');
    }
    
    setSubmittingBC(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      requested: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'En attente de devis' },
      modification_requested: { bg: 'bg-amber-100', text: 'text-amber-700', label: '⚠️ Modification demandée' },
      refused: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Demande refusée' },
      quote_sent: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Devis envoyé - Action requise' },
      quote_revision_requested: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Modification demandée' },
      bc_pending: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'BC soumis - En vérification' },
      bc_rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'BC rejeté - Action requise' },
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Actif' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Expiré' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' }
    };
    const style = styles[status] || styles.requested;
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ========================================
  // EDIT CONTRACT MODAL - For modification_requested
  // ========================================
  if (editingContract) {
    return (
      <EditContractModal 
        contract={editingContract}
        notify={notify}
        onClose={() => setEditingContract(null)}
        onSaved={() => {
          setEditingContract(null);
          loadContracts();
        }}
      />
    );
  }

  // ========================================
  // CONTRACT DETAIL VIEW - IDENTICAL TO RMA
  // ========================================
  if (selectedContract) {
    const contract = selectedContract;
    const devices = contract.contract_devices || [];
    const isQuoteSent = contract.status === 'quote_sent';
    const needsQuoteAction = isQuoteSent && !contract.bc_submitted_at;
    const totalPrice = devices.reduce((sum, d) => sum + (d.unit_price || 0), 0);
    const totalTokens = devices.reduce((sum, d) => sum + (d.tokens_total || 0), 0);
    const usedTokens = devices.reduce((sum, d) => sum + (d.tokens_used || 0), 0);
    const isActive = contract.status === 'active';
    
    // Detect calibration types from devices
    const calibrationTypes = [...new Set(devices.map(d => d.device_type || 'particle_counter'))];
    
    return (
      <div>
        <button onClick={() => setSelectedContract(null)} className="mb-4 text-gray-500 hover:text-gray-700 flex items-center gap-2">
          ← Retour aux contrats
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-[#1E3A5F] text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">
                  {contract.contract_number ? `Contrat ${contract.contract_number}` : 'Demande de Contrat'}
                </h1>
                <p className="text-white/70">
                  Période: {new Date(contract.start_date).toLocaleDateString('fr-FR')} - {new Date(contract.end_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {getStatusBadge(contract.status)}
            </div>
          </div>
          
          {/* QUOTE ACTION BANNER - Single button to review and approve */}
          {needsQuoteAction && perms?.canRequest && (
            <div className="bg-blue-50 border-b border-blue-300 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-2xl">💰</span>
                  </div>
                  <div>
                    <p className="font-bold text-blue-800 text-lg">Devis reçu - Action requise</p>
                    <p className="text-sm text-blue-600">
                      Consultez le devis et approuvez pour soumettre votre bon de commande
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuoteModal(true)}
                  className="px-6 py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008f45] transition-colors"
                >
                  📋 Consulter et Approuver le Devis
                </button>
              </div>
            </div>
          )}

          {/* Modification Requested by Admin - Allow customer to edit and resubmit */}
          {contract.status === 'modification_requested' && (
            <div className="bg-amber-50 border-b border-amber-300 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-amber-600 text-2xl">⚠️</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-amber-800">Modification demandée par Lighthouse</p>
                    {contract.admin_notes && (
                      <div className="mt-2 p-3 bg-white rounded border border-amber-200">
                        <p className="text-xs text-gray-500 mb-1">Message de l'équipe :</p>
                        <p className="text-sm text-gray-700">{contract.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditingContract(contract)}
                  className="px-6 py-3 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors"
                >
                  ✏️ Modifier et Resoumettre
                </button>
              </div>
            </div>
          )}

          {/* Request Refused */}
          {contract.status === 'refused' && (
            <div className="bg-red-50 border-b border-red-300 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-2xl">❌</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-800">Demande de contrat refusée</p>
                  {contract.admin_notes && (
                    <div className="mt-2 p-3 bg-white rounded border border-red-200">
                      <p className="text-xs text-gray-500 mb-1">Raison :</p>
                      <p className="text-sm text-gray-700">{contract.admin_notes}</p>
                    </div>
                  )}
                  <p className="text-sm text-red-600 mt-2">
                    Veuillez contacter Lighthouse France si vous avez des questions.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Quote Revision Requested - IDENTICAL TO RMA */}
          {contract.status === 'quote_revision_requested' && (
            <div className="bg-orange-50 border-b border-orange-300 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-600 text-2xl">✏️</span>
                </div>
                <div>
                  <p className="font-bold text-orange-800">Modification en cours</p>
                  <p className="text-sm text-orange-600">
                    Votre demande de modification a été envoyée. Vous recevrez un nouveau devis sous peu.
                  </p>
                  {contract.quote_revision_notes && (
                    <div className="mt-2 p-2 bg-white rounded border border-orange-200">
                      <p className="text-xs text-gray-500">Votre demande :</p>
                      <p className="text-sm text-gray-700">{contract.quote_revision_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* BC Submitted - IDENTICAL TO RMA */}
          {contract.status === 'bc_pending' && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📄</span>
                </div>
                <div>
                  <p className="font-semibold text-blue-800">Bon de commande soumis</p>
                  <p className="text-sm text-blue-600">
                    Votre BC est en cours de vérification par notre équipe. Vous serez notifié une fois approuvé.
                  </p>
                  {contract.bc_submitted_at && (
                    <p className="text-xs text-blue-500 mt-1">
                      Soumis le {new Date(contract.bc_submitted_at).toLocaleDateString('fr-FR')} à {new Date(contract.bc_submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* BC Rejected - IDENTICAL TO RMA */}
          {contract.status === 'bc_rejected' && (
            <div className="bg-red-50 border-b border-red-300 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-white text-2xl">❌</span>
                  </div>
                  <div>
                    <p className="font-bold text-red-800 text-lg">Bon de commande rejeté - Action requise</p>
                    <p className="text-sm text-red-600">
                      Votre bon de commande a été rejeté. Veuillez corriger et soumettre à nouveau.
                    </p>
                    {contract.bc_rejection_reason && (
                      <div className="mt-2 p-3 bg-white rounded-lg border-2 border-red-300">
                        <p className="text-xs text-red-600 font-medium uppercase">Raison du rejet :</p>
                        <p className="text-sm text-red-800 font-medium mt-1">{contract.bc_rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowBCModal(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                >
                  📄 Resoumettre BC
                </button>
              </div>
            </div>
          )}

          {/* TABS - Like RMA */}
          <div className="border-b border-gray-200">
            <div className="flex">
              {[
                { id: 'details', label: 'Détails', icon: '📋' },
                { id: 'devices', label: 'Appareils', icon: '🔬' },
                { id: 'documents', label: 'Documents', icon: '📄' },
                { id: 'history', label: 'Historique', icon: '📜' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setContractTab(tab.id)}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                    contractTab === tab.id
                      ? 'border-[#00A651] text-[#00A651]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div className="p-6">
            {/* DETAILS TAB */}
            {contractTab === 'details' && (
              <>
                {/* Contract Info Card */}
                <div className="bg-white border rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-[#1E3A5F] mb-4 text-lg">📋 Informations du Contrat</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600">Numéro de contrat</span>
                        <span className="font-mono font-bold text-[#00A651]">{contract.contract_number || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600">Date de début</span>
                        <span className="font-medium">{new Date(contract.start_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600">Date de fin</span>
                        <span className="font-medium">{new Date(contract.end_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600">Durée</span>
                        <span className="font-medium">
                          {Math.round((new Date(contract.end_date) - new Date(contract.start_date)) / (1000 * 60 * 60 * 24 * 30))} mois
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600">Prix annuel HT</span>
                        <span className="font-bold text-[#00A651]">{totalPrice.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600">Statut</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          contract.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {contract.status === 'active' ? '✅ Actif' : contract.status === 'quote_sent' ? '📋 Devis envoyé' : contract.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Devices with their calibration status */}
                <div className="bg-white border rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-[#1E3A5F] mb-4 text-lg">🔬 Appareils sous contrat ({devices.length})</h3>
                  <div className="space-y-4">
                    {devices.map((device, idx) => {
                      const deviceUsed = device.tokens_used || 0;
                      const deviceTotal = device.tokens_total || 1;
                      const deviceRemaining = deviceTotal - deviceUsed;
                      const isComplete = deviceUsed >= deviceTotal;
                      const progressPercent = (deviceUsed / deviceTotal) * 100;
                      
                      return (
                        <div key={device.id} className={`p-4 rounded-xl border-2 ${isComplete ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {getDeviceImageUrl(device.model_name) ? (
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${
                                  isComplete ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border border-gray-200'
                                }`}>
                                  <img src={getDeviceImageUrl(device.model_name)} alt={device.model_name} className="w-10 h-10 object-contain" />
                                </div>
                              ) : (
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                                  isComplete ? 'bg-green-500 text-white' : 'bg-[#1E3A5F] text-white'
                                }`}>
                                  {device.device_type === 'particle_counter' && '🔬'}
                                  {device.device_type === 'bio_collector' && '🧫'}
                                  {device.device_type === 'liquid_counter' && '💧'}
                                  {device.device_type === 'temp_humidity' && '🌡️'}
                                  {(!device.device_type || device.device_type === 'other') && '📦'}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-[#1E3A5F]">{device.model_name || 'Appareil'}</p>
                                <p className="text-sm text-gray-500">N° Série: {device.serial_number}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {isComplete ? (
                                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                                  ✅ Étalonnages complets
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                  {deviceRemaining} étalonnage{deviceRemaining > 1 ? 's' : ''} restant{deviceRemaining > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Progress bar for this device */}
                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">
                                {deviceUsed} / {deviceTotal} étalonnage{deviceTotal > 1 ? 's' : ''} effectué{deviceUsed > 1 ? 's' : ''}
                              </span>
                              <span className="font-medium">{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-[#00A651]'}`}
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Price info */}
                          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                            <span className="text-gray-500">Prix annuel pour cet appareil</span>
                            <span className="font-bold text-[#00A651]">{(device.unit_price || 0).toFixed(2)} € HT</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Actions */}
                {isActive && perms?.canRequest && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setPage('new-request')}
                      className="px-8 py-4 bg-[#00A651] text-white rounded-xl font-bold hover:bg-[#008f45] text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      🔬 Créer une demande d'étalonnage
                    </button>
                  </div>
                )}
              </>
            )}

            {/* DEVICES TAB */}
            {contractTab === 'devices' && (
              <>
                <h3 className="font-bold text-[#1E3A5F] mb-3">Appareils sous contrat ({devices.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#1E3A5F] text-white">
                        <th className="px-4 py-3 text-left text-xs font-bold">Modèle</th>
                        <th className="px-4 py-3 text-left text-xs font-bold">N° Série</th>
                        <th className="px-4 py-3 text-left text-xs font-bold">Type</th>
                        <th className="px-4 py-3 text-center text-xs font-bold">Étal. inclus/an</th>
                        <th className="px-4 py-3 text-center text-xs font-bold">Effectués</th>
                        <th className="px-4 py-3 text-center text-xs font-bold">Restants</th>
                        <th className="px-4 py-3 text-center text-xs font-bold">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((device, idx) => {
                        const deviceUsed = device.tokens_used || 0;
                        const deviceTotal = device.tokens_total || 1;
                        const deviceRemaining = deviceTotal - deviceUsed;
                        const isComplete = deviceUsed >= deviceTotal;
                        
                        return (
                          <tr key={device.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 font-medium">{device.model_name || '—'}</td>
                            <td className="px-4 py-3 font-mono text-xs">{device.serial_number}</td>
                            <td className="px-4 py-3 text-sm">
                              {device.device_type === 'particle_counter' && '🔬 Compteur Particules'}
                              {device.device_type === 'bio_collector' && '🧫 Bio Collecteur'}
                              {device.device_type === 'liquid_counter' && '💧 Compteur Liquide'}
                              {device.device_type === 'temp_humidity' && '🌡️ Temp/Humidité'}
                              {(!device.device_type || device.device_type === 'other') && '📦 Autre'}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{deviceTotal}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-green-600 font-bold">{deviceUsed}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-bold ${deviceRemaining > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                {deviceRemaining}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isComplete ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  ✅ Complet
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                  ⏳ En cours
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Summary */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                  <span className="text-gray-600">Total pour cette période:</span>
                  <div className="flex gap-6">
                    <span><strong className="text-green-600">{usedTokens}</strong> effectués</span>
                    <span><strong className="text-blue-600">{totalTokens - usedTokens}</strong> restants</span>
                    <span><strong className="text-gray-800">{totalTokens}</strong> inclus</span>
                  </div>
                </div>
              </>
            )}

            {/* DOCUMENTS TAB */}
            {contractTab === 'documents' && (
              <>
                <h3 className="font-bold text-[#1E3A5F] mb-3">Documents</h3>
                <div className="space-y-3">
                  {/* Original Quote - Generate PDF on click */}
                  {contract.quote_sent_at && (
                    <div 
                      className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer"
                      onClick={async () => {
                        try {
                          const quoteData = contract.quote_data || {};
                          const quoteDevices = quoteData.devices || [];
                          const pricingDevices = quoteDevices.length > 0 ? quoteDevices : devices.map(d => ({
                            ...d,
                            serial: d.serial_number,
                            model: d.model_name,
                            deviceType: d.device_type || 'particle_counter',
                            tokens_total: d.tokens_total || 1,
                            calibrationPrice: d.unit_price || 350,
                            needsCalibration: true
                          }));
                          const pdfBlob = await generateContractQuotePDF({
                            contract,
                            devices: pricingDevices,
                            totalPrice: quoteData.servicesSubtotal || totalPrice,
                            totalTokens: quoteData.totalTokens || totalTokens,
                            isSigned: false
                          });
                          const url = URL.createObjectURL(pdfBlob);
                          window.open(url, '_blank');
                        } catch (err) {
                          console.error('PDF generation error:', err);
                        }
                      }}
                    >
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        PDF
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-blue-800">Devis Contrat</p>
                        <p className="text-xs text-blue-600">
                          Envoyé le {new Date(contract.quote_sent_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="text-blue-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  {/* Signed Quote PDF */}
                  {contract.signed_quote_url && (
                    <a 
                      href={contract.signed_quote_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                    >
                      <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        PDF
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-green-800">Devis Signé</p>
                        <p className="text-xs text-green-600">
                          Signé le {contract.bc_submitted_at ? new Date(contract.bc_submitted_at).toLocaleDateString('fr-FR') : '—'}
                          {contract.bc_signed_by && ` par ${contract.bc_signed_by}`}
                        </p>
                      </div>
                      <div className="text-green-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  )}
                  
                  {/* BC File (uploaded purchase order) */}
                  {contract.bc_file_url && (
                    <a 
                      href={contract.bc_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        BC
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-purple-800">Bon de Commande</p>
                        <p className="text-xs text-purple-600">Document uploadé</p>
                      </div>
                      <div className="text-purple-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  )}
                  
                  {/* No documents message */}
                  {!contract.quote_sent_at && !contract.bc_submitted_at && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-4xl mb-2">📭</p>
                      <p>Aucun document disponible</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* HISTORY TAB */}
            {contractTab === 'history' && (
              <>
                <h3 className="font-bold text-[#1E3A5F] mb-3">Historique</h3>
                <div className="space-y-3">
                  {/* Build history from contract data */}
                  {contract.bc_approved_at && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Contrat activé</p>
                        <p className="text-xs text-green-600">{new Date(contract.bc_approved_at).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  )}
                  {contract.bc_submitted_at && (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm">📄</span>
                      </div>
                      <div>
                        <p className="font-medium text-blue-800">BC soumis</p>
                        <p className="text-xs text-blue-600">{new Date(contract.bc_submitted_at).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  )}
                  {contract.quote_sent_at && (
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm">📧</span>
                      </div>
                      <div>
                        <p className="font-medium text-purple-800">Devis envoyé</p>
                        <p className="text-xs text-purple-600">{new Date(contract.quote_sent_at).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm">🆕</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Demande créée</p>
                      <p className="text-xs text-gray-600">{new Date(contract.created_at).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* ========================================
            BC SUBMISSION MODAL - IDENTICAL TO RMA
            ======================================== */}
        {showBCModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-[#1E3A5F]">Soumettre Bon de Commande</h2>
                  <button onClick={() => setShowBCModal(false)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Reference */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Référence contrat</p>
                  <p className="font-mono font-bold text-[#1E3A5F]">{contract.contract_number || 'En attente'}</p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Télécharger votre Bon de Commande (optionnel)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#3B7AB4] transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => setBcFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="contract-bc-file-input"
                    />
                    <label htmlFor="contract-bc-file-input" className="cursor-pointer">
                      {bcFile ? (
                        <div className="flex items-center justify-center gap-2 text-[#3B7AB4]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">{bcFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-600">Cliquez pour télécharger ou glissez-déposez</p>
                          <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-500">ou</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Electronic Signature */}
                <div className="bg-[#F5F9FC] rounded-lg p-4 border border-[#3B7AB4]/20">
                  <h3 className="font-semibold text-[#1E3A5F] mb-4">Signature électronique</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom complet du signataire *
                        </label>
                        <input
                          type="text"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent"
                          placeholder="Prénom et Nom"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="text"
                          value={signatureDateDisplay}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tapez "Lu et approuvé" *
                      </label>
                      <input
                        type="text"
                        value={luEtApprouve}
                        onChange={(e) => setLuEtApprouve(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent font-medium ${
                          luEtApprouve.toLowerCase().trim() === 'lu et approuvé' 
                            ? 'border-green-500 bg-green-50 text-green-800' 
                            : 'border-gray-300'
                        }`}
                        placeholder="Lu et approuvé"
                      />
                    </div>
                    
                    {/* Signature Pad */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Signature manuscrite *
                        </label>
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Effacer
                        </button>
                      </div>
                      <div className={`border-2 rounded-lg bg-white ${signatureData ? 'border-green-500' : 'border-gray-300 border-dashed'}`}>
                        <canvas
                          ref={canvasRef}
                          width={400}
                          height={150}
                          className="w-full cursor-crosshair touch-none"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                      </div>
                      {!signatureData && (
                        <p className="text-xs text-gray-500 mt-1">Dessinez votre signature ci-dessus</p>
                      )}
                      {signatureData && (
                        <p className="text-xs text-green-600 mt-1">✓ Signature enregistrée</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Legal Terms */}
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 text-[#3B7AB4] border-gray-300 rounded focus:ring-[#3B7AB4]"
                    />
                    <span className="text-sm text-gray-700">
                      Je soussigné(e), <strong>{signatureName || '[Nom]'}</strong>, 
                      certifie avoir pris connaissance et accepter les conditions générales de vente de Lighthouse France. 
                      Je m'engage à régler la facture correspondante selon les modalités convenues. 
                      Cette validation électronique a valeur de signature manuscrite conformément aux articles 1366 et 1367 du Code civil français.
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowBCModal(false)}
                  className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={submitBonCommande}
                  disabled={submittingBC || !isSubmissionValid}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    isSubmissionValid 
                      ? 'bg-[#1E3A5F] text-white hover:bg-[#2a4a6f]' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {submittingBC ? 'Envoi en cours...' : 'Valider et soumettre'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================
            QUOTE REVIEW MODAL - Contract Style matching Admin
            ======================================== */}
        {showQuoteModal && (() => {
          const quoteData = contract.quote_data || {};
          const quoteDevices = quoteData.devices || [];
          const shipping = quoteData.shipping || { parcels: 1, unitPrice: 45, total: 45 };
          const servicesSubtotal = quoteData.servicesSubtotal || totalPrice;
          const shippingTotal = quoteData.shippingTotal || shipping.total || 0;
          const grandTotalFromQuote = quoteData.grandTotal || (servicesSubtotal + shippingTotal);
          const contractDates = quoteData.contractDates || { start_date: contract.start_date, end_date: contract.end_date };
          const totalTokensFromQuote = quoteData.totalTokens || totalTokens;
          const hasNettoyage = quoteDevices.some(d => d.needsNettoyage && d.nettoyagePrice > 0);
          const pricingDevices = quoteDevices.length > 0 ? quoteDevices : devices.map(d => ({
            ...d, serial: d.serial_number, model: d.model_name,
            deviceType: d.device_type || 'particle_counter',
            tokens_total: d.tokens_total || 1, calibrationPrice: d.unit_price || 350,
            needsCalibration: true, needsNettoyage: d.device_type === 'particle_counter', nettoyagePrice: 0
          }));
          const deviceTypes = [...new Set(pricingDevices.map(d => d.deviceType || 'particle_counter'))];
          const company = contract.companies || {};
          const qDocData = { billingAddress: null, submitterName: company.contact_name || null, createdBy: quoteData.createdBy || 'M. Meleney' };
          const bcInfo = contract.bc_submitted_at ? { signedBy: contract.bc_signed_by || 'Client', signedDate: contract.bc_signature_date || contract.bc_submitted_at, signatureUrl: contract.bc_signature_url } : null;
          const contractConditions = [
            `Période du contrat : du ${formatDateWrittenFR(contractDates.start_date)} au ${formatDateWrittenFR(contractDates.end_date)}.`,
            `${totalTokensFromQuote} étalonnage(s) inclus pendant la période contractuelle.`,
            "Étalonnages supplémentaires facturés au tarif standard.",
            "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.",
            "Un devis complémentaire sera établi si des pièces sont trouvées défectueuses.",
            "Paiement à 30 jours date de facture."
          ];
          const contractInfoBar = (<>
            <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Début</p><p className="font-bold text-[#1a1a2e]">{formatDateWrittenFR(contractDates.start_date)}</p></div>
            <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Fin</p><p className="font-bold text-[#1a1a2e]">{formatDateWrittenFR(contractDates.end_date)}</p></div>
            <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Validité</p><p className="font-bold text-[#1a1a2e]">30 jours</p></div>
          </>);
          return (<>
          <QuoteDocumentView
            title="OFFRE DE PRIX" docNumber={contract.contract_number} reference={contract.contract_number} refLabel="Contrat"
            date={contract.quote_sent_at} company={company} quoteData={qDocData} conditions={contractConditions}
            addressMode="billing_only" extraInfoBar={contractInfoBar}
            onClose={() => setShowQuoteModal(false)}
            showApprove={contract.status === 'quote_sent' && !contract.bc_submitted_at}
            onApprove={() => { setShowQuoteModal(false); setShowBCModal(true); }}
            bcData={bcInfo}
            extraFooterLeft={contract.status === 'quote_sent' ? <button onClick={() => setShowRevisionModal(true)} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium">Demander modification</button> : null}
          >
            <div className="px-8 py-2"><p className="text-sm text-gray-500 italic">Contrat de tarification / d'étalonnage</p></div>
            <div className="px-8 py-4 space-y-5">
              {deviceTypes.map(type => {
                const template = CALIBRATION_TEMPLATES[type] || CALIBRATION_TEMPLATES.particle_counter;
                return (<div key={type} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-bold text-[#1a1a2e] mb-2 flex items-center gap-2"><span>{template.icon}</span> {template.title}</h3>
                  <ul className="space-y-1">{template.prestations.map((p, i) => (<li key={i} className="text-gray-700 text-sm flex items-start gap-2"><span className="text-[#1a1a2e] mt-0.5">▸</span><span>{p}</span></li>))}</ul>
                </div>);
              })}
            </div>
            <div className="px-8 py-6 bg-gray-50">
              <h3 className="font-bold text-lg text-[#1a1a2e] mb-4">Récapitulatif des Prix</h3>
              <table className="w-full text-sm">
                <thead><tr className="bg-[#1a1a2e] text-white"><th className="px-3 py-2.5 text-center w-12">Qté</th><th className="px-3 py-2.5 text-left">Désignation</th><th className="px-3 py-2.5 text-right w-20">Prix Unit.</th><th className="px-3 py-2.5 text-right w-20">Total HT</th></tr></thead>
                <tbody>
                  {pricingDevices.map((device, idx) => (<Fragment key={idx}>
                    {device.needsCalibration !== false && (<tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-center">{device.tokens_total || 1}</td>
                      <td className="px-3 py-2"><span className="font-medium">Étalonnage {device.model || device.model_name}</span> <span className="text-gray-500 text-xs">(SN: {device.serial || device.serial_number})</span></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{(device.calibrationPrice || 0).toFixed(2)} €</td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{((device.tokens_total || 1) * (device.calibrationPrice || 0)).toFixed(2)} €</td>
                    </tr>)}
                    {device.needsNettoyage && device.nettoyagePrice > 0 && (<tr className="bg-amber-50">
                      <td className="px-3 py-2 text-center">{device.nettoyageQty || 1}</td>
                      <td className="px-3 py-2"><span className="font-medium text-amber-800">Nettoyage cellule</span> <span className="text-amber-600 text-xs">- si requis ({device.model || device.model_name})</span></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{(device.nettoyagePrice || 0).toFixed(2)} €</td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{((device.nettoyageQty || 1) * (device.nettoyagePrice || 0)).toFixed(2)} €</td>
                    </tr>)}
                  </Fragment>))}
                  {shippingTotal > 0 && (<tr className="bg-blue-50">
                    <td className="px-3 py-2 text-center">{shipping.parcels || 1}</td>
                    <td className="px-3 py-2"><span className="font-medium text-blue-800">Frais de port</span> <span className="text-blue-600 text-xs">({shipping.parcels || 1} colis)</span></td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{(shipping.unitPrice || 45).toFixed(2)} €</td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{shippingTotal.toFixed(2)} €</td>
                  </tr>)}
                </tbody>
                <tfoot><tr className="bg-[#2D5A7B] text-white"><td colSpan={2} className="px-3 py-3"></td><td className="px-3 py-3 text-right font-bold text-lg whitespace-nowrap">TOTAL HT</td><td className="px-3 py-3 text-right font-bold text-xl whitespace-nowrap">{grandTotalFromQuote.toFixed(2)} €</td></tr></tfoot>
              </table>
              {hasNettoyage && <p className="text-xs text-gray-500 mt-3 italic">* Le nettoyage cellule sera facturé uniquement si nécessaire selon l'état du capteur à réception.</p>}
            </div>
          </QuoteDocumentView>
          {showRevisionModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
              <div className="bg-white rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Demander une modification</h3>
                <p className="text-gray-600 mb-4">Décrivez les modifications que vous souhaitez apporter au devis :</p>
                <textarea value={revisionNotes} onChange={e => setRevisionNotes(e.target.value)}
                  className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                  placeholder="Ex: Veuillez ajouter un appareil supplémentaire, modifier le prix, retirer les frais de transport, etc." />
                <div className="mt-4 flex justify-end gap-3">
                  <button onClick={() => setShowRevisionModal(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Annuler</button>
                  <button onClick={handleRequestRevision} disabled={approvingQuote || !revisionNotes.trim()}
                    className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50">
                    {approvingQuote ? 'Envoi...' : 'Envoyer la demande'}
                  </button>
                </div>
              </div>
            </div>
          )}
          </>);
        })()}
      </div>
    );
  }

  // ========================================
  // CONTRACTS LIST VIEW
  // ========================================
  const pendingQuotes = contracts.filter(c => c.status === 'quote_sent');
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Mes Contrats</h1>
        {perms?.canRequest && (
        <button 
          onClick={() => setPage('new-request')}
          className="px-4 py-2 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008c44]"
        >
          + Nouveau Contrat
        </button>
        )}
      </div>
      
      {/* Pending Quotes Alert - IDENTICAL styling to RMA */}
      {pendingQuotes.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-2xl text-white">💰</div>
            <div>
              <h3 className="font-bold text-blue-800">{pendingQuotes.length} devis en attente d'approbation</h3>
              <p className="text-blue-600 text-sm">Cliquez sur un contrat pour voir et approuver le devis</p>
            </div>
          </div>
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-2">Aucun contrat</h2>
          <p className="text-gray-600 mb-4">
            Vous n'avez pas encore de contrat d'étalonnage. Demandez un devis pour bénéficier de tarifs préférentiels.
          </p>
          {perms?.canRequest && (
          <button 
            onClick={() => setPage('new-request')}
            className="px-6 py-3 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008c44]"
          >
            Demander un devis contrat
          </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map(contract => {
            const devices = contract.contract_devices || [];
            const totalTokens = devices.reduce((sum, d) => sum + (d.tokens_total || 0), 0);
            const usedTokens = devices.reduce((sum, d) => sum + (d.tokens_used || 0), 0);
            const remainingTokens = totalTokens - usedTokens;
            const needsAction = contract.status === 'quote_sent' || contract.status === 'bc_rejected';
            
            return (
              <div 
                key={contract.id}
                onClick={() => setSelectedContract(contract)}
                className={`bg-white rounded-xl p-6 shadow-sm border-2 cursor-pointer transition-colors ${
                  needsAction 
                    ? 'border-blue-400 bg-blue-50/30 hover:border-blue-500' 
                    : 'border-gray-100 hover:border-[#3B7AB4]'
                }`}
              >
                {needsAction && (
                  <div className="mb-3 flex items-center gap-2 text-blue-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-bold">
                      <span className="animate-pulse">⚠</span> Action requise
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-[#1E3A5F] text-lg">{contract.contract_number || 'Demande en cours'}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(contract.start_date).toLocaleDateString('fr-FR')} - {new Date(contract.end_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {getStatusBadge(contract.status)}
                </div>
                
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Appareils:</span>{' '}
                    <span className="font-bold">{devices.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Étalonnages:</span>{' '}
                    <span className={`font-bold ${remainingTokens <= 0 ? 'text-red-600' : remainingTokens <= devices.length ? 'text-amber-600' : 'text-green-600'}`}>
                      {remainingTokens}/{totalTokens}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// RENTALS PAGE (Equipment Rental / Locations)
// ============================================
function RentalsPage({ profile, addresses, t, notify, setPage, refresh, pendingRentalId, setPendingRentalId }) {
  const [rentals, setRentals] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewRental, setShowNewRental] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  
  // Keep selectedRental in sync with reloaded data
  useEffect(() => {
    if (selectedRental) {
      const updated = rentals.find(r => r.id === selectedRental.id);
      if (updated && updated.status !== selectedRental.status) {
        setSelectedRental(updated);
      }
    }
  }, [rentals]);

  const [rentalCommsLoaded, setRentalCommsLoaded] = useState(null); // tracks which rental id comms are loaded for

  // Rental detail state
  const [rentalTab, setRentalTab] = useState('overview');
  const [rentalMessages, setRentalMessages] = useState([]);
  const [rentalNewMsg, setRentalNewMsg] = useState('');
  const [rentalSending, setRentalSending] = useState(false);
  const [rentalDocs, setRentalDocs] = useState([]);
  const [showRentalQuote, setShowRentalQuote] = useState(false);
  const [showRentalRevision, setShowRentalRevision] = useState(false);
  const [rentalRevisionNotes, setRentalRevisionNotes] = useState('');
  const [rentalProcessing, setRentalProcessing] = useState(false);
  
  // BC Submission state (mirrors RMA exactly)
  const [showBCModal, setShowBCModal] = useState(false);
  const [bcFileUpload, setBcFileUpload] = useState(null);
  const [signatureName, setSignatureName] = useState(profile?.full_name || '');
  const [signatureDateDisplay] = useState(new Date().toLocaleDateString('fr-FR'));
  const [signatureDateISO] = useState(new Date().toISOString().split('T')[0]);
  const [luEtApprouve, setLuEtApprouve] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submittingBC, setSubmittingBC] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  
  // New rental form state
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedItems, setSelectedItems] = useState([]);
  const [step, setStep] = useState(1); // 1: dates, 2: equipment, 3: confirm
  const [shippingAddressId, setShippingAddressId] = useState(addresses.find(a => a.is_default && !a.is_billing)?.id || '');
  const [customerNotes, setCustomerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Billing address state
  const billingAddresses = addresses.filter(a => a.is_billing);
  const [billingAddressId, setBillingAddressId] = useState(billingAddresses[0]?.id || '');
  const [showNewBillingForm, setShowNewBillingForm] = useState(false);
  const [newBillingAddress, setNewBillingAddress] = useState({ label: '', company_name: '', address_line1: '', city: '', postal_code: '', country: 'France', attention: '', phone: '', siret: '', tva_number: '', chorus_invoicing: false, chorus_service_code: '' });
  const [rentalDeliveryMethod, setRentalDeliveryMethod] = useState('standard');
  const selectedBillingAddr = billingAddresses.find(a => a.id === billingAddressId);

  useEffect(() => {
    loadData();
  }, [profile?.company_id]);

  // Auto-select rental if navigated from dashboard action
  useEffect(() => {
    if (pendingRentalId && rentals.length > 0 && !loading) {
      const target = rentals.find(r => r.id === pendingRentalId);
      if (target) {
        setSelectedRental(target);
        if (setPendingRentalId) setPendingRentalId(null);
      }
    }
  }, [pendingRentalId, rentals, loading]);

  const loadData = async () => {
    setLoading(true);
    
    // Load rental requests for this company
    let rentalData = null;
    const { data: rd, error: rentalError } = await supabase
      .from('rental_requests')
      .select('*, rental_request_items(*), companies(*), shipping_address:shipping_addresses!shipping_address_id(*)')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });
    
    if (rentalError) {
      console.error('Rental load error (with join):', rentalError);
      // Fallback without shipping address join
      const { data: rd2 } = await supabase
        .from('rental_requests')
        .select('*, rental_request_items(*), companies(*)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      rentalData = rd2;
    } else {
      rentalData = rd;
    }
    if (rentalData) setRentals(rentalData);
    
    // Load available inventory
    const { data: invData } = await supabase
      .from('rental_inventory')
      .select('*')
      .eq('is_available', true)
      .order('model_name');
    
    // Load bundles
    const { data: bundleData } = await supabase
      .from('rental_bundles')
      .select('*, rental_bundle_items(*, rental_inventory(*))')
      .eq('is_active', true)
      .order('bundle_name');
    
    // Load bookings for next 6 months
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + 6);
    
    const { data: bookingData } = await supabase
      .from('rental_bookings')
      .select('*')
      .gte('end_date', fromDate.toISOString().split('T')[0])
      .lte('start_date', toDate.toISOString().split('T')[0]);
    
    if (invData) setInventory(invData);
    if (bundleData) setBundles(bundleData);
    if (bookingData) setBookings(bookingData);
    
    setLoading(false);
  };

  const rentalDays = startDate && endDate 
    ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1 
    : 0;

  const isDeviceAvailable = (inventoryId) => {
    if (!startDate || !endDate) return true;
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return !bookings.some(b => 
      b.inventory_id === inventoryId &&
      b.start_date <= end &&
      b.end_date >= start
    );
  };

  const isBundleAvailable = (bundle) => {
    if (!bundle.rental_bundle_items) return false;
    return bundle.rental_bundle_items.every(item => isDeviceAvailable(item.inventory_id));
  };

  const calculatePrice = (dailyRate, weeklyRate, monthlyRate, days) => {
    const weekly = weeklyRate || dailyRate * 7;
    const monthly = monthlyRate || dailyRate * 30;
    
    const dailyTotal = dailyRate * days;
    const weeklyTotal = Math.floor(days / 7) * weekly + (days % 7) * dailyRate;
    const monthlyTotal = Math.floor(days / 30) * monthly + (days % 30) * dailyRate;
    
    let best = { total: dailyTotal, rate: dailyRate, type: 'daily' };
    if (days >= 7 && weeklyTotal < best.total) best = { total: weeklyTotal, rate: weekly, type: 'weekly' };
    if (days >= 30 && monthlyTotal < best.total) best = { total: monthlyTotal, rate: monthly, type: 'monthly' };
    
    return best;
  };

  const toggleSelection = (type, item) => {
    const exists = selectedItems.find(s => s.type === type && s.id === item.id);
    
    if (exists) {
      setSelectedItems(selectedItems.filter(s => !(s.type === type && s.id === item.id)));
    } else {
      const pricing = calculatePrice(item.price_per_day, item.price_per_week, item.price_per_month, rentalDays);
      let serialNumbers = [];
      if (type === 'device') {
        serialNumbers = [item.serial_number];
      } else if (type === 'bundle' && item.rental_bundle_items) {
        serialNumbers = item.rental_bundle_items.map(bi => bi.rental_inventory?.serial_number).filter(Boolean);
      }
      
      setSelectedItems([...selectedItems, {
        type, id: item.id,
        name: type === 'device' ? `${item.model_name} (${item.serial_number})` : item.bundle_name,
        serialNumbers, dailyRate: item.price_per_day,
        appliedRate: pricing.rate, rateType: pricing.type,
        rentalDays, total: pricing.total
      }]);
    }
  };

  const subtotal = selectedItems.reduce((sum, item) => sum + item.total, 0);

  const isDateBlocked = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    if (selectedItems.length > 0) {
      for (const item of selectedItems) {
        if (item.type === 'device') {
          const blocked = bookings.some(b => b.inventory_id === item.id && b.start_date <= dateStr && b.end_date >= dateStr);
          if (blocked) return true;
        }
      }
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate || selectedItems.length === 0) {
      notify('Veuillez compléter tous les champs', 'error');
      return;
    }
    if (rentalDays < 5) {
      notify('La durée minimum de location est de 5 jours', 'error');
      return;
    }
    if (rentalDeliveryMethod === 'standard' && !shippingAddressId) {
      notify('Veuillez sélectionner une adresse de livraison', 'error');
      return;
    }
    
    // Handle billing address
    let finalBillingAddressId = billingAddressId || null;
    if (showNewBillingForm) {
      const ba = newBillingAddress;
      if (!ba.company_name || !ba.attention || !ba.address_line1 || !ba.postal_code || !ba.city) {
        notify('Veuillez remplir les champs obligatoires de l\'adresse de facturation', 'error');
        return;
      }
      const { data: baData, error: baErr } = await supabase.from('shipping_addresses').insert({
        ...ba, company_id: profile.company_id, is_billing: true, is_default: false
      }).select().single();
      if (baErr) { notify("Erreur lors de la création de l'adresse de facturation", 'error'); return; }
      finalBillingAddressId = baData.id;
    }
    const billingAddr = showNewBillingForm ? newBillingAddress : billingAddresses.find(a => a.id === finalBillingAddressId);
    
    setSaving(true);
    try {
      // Create rental request
      const { data: rental, error: rentalErr } = await supabase
        .from('rental_requests')
        .insert({
          rental_number: null,
          company_id: profile.company_id,
          submitted_by: profile.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          shipping_address_id: rentalDeliveryMethod === 'standard' ? shippingAddressId : null,
          billing_address_id: finalBillingAddressId,
          billing_siret: billingAddr?.siret || null,
          billing_tva: billingAddr?.tva_number || null,
          return_shipping: rentalDeliveryMethod,
          chorus_invoicing: billingAddr?.chorus_invoicing || false,
          chorus_service_code: billingAddr?.chorus_invoicing ? (billingAddr?.chorus_service_code || null) : null,
          status: 'requested',
          quote_subtotal: subtotal,
          customer_notes: customerNotes,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (rentalErr) throw rentalErr;
      
      // Create rental items
      for (const item of selectedItems) {
        await supabase.from('rental_request_items').insert({
          request_id: rental.id,
          item_type: item.type,
          inventory_id: item.type === 'device' ? item.id : null,
          bundle_id: item.type === 'bundle' ? item.id : null,
          item_name: item.name,
          serial_numbers: item.serialNumbers,
          daily_rate: item.dailyRate,
          applied_rate: item.appliedRate,
          rate_type: item.rateType,
          rental_days: item.rentalDays,
          line_total: item.total
        });
        
        // Create booking entries
        if (item.type === 'device') {
          await supabase.from('rental_bookings').insert({
            inventory_id: item.id,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            rental_request_id: rental.id,
            booking_type: 'rental',
            created_by: profile.id
          });
        } else {
          const bundle = bundles.find(b => b.id === item.id);
          if (bundle?.rental_bundle_items) {
            for (const bi of bundle.rental_bundle_items) {
              await supabase.from('rental_bookings').insert({
                inventory_id: bi.inventory_id,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                rental_request_id: rental.id,
                booking_type: 'rental',
                created_by: profile.id
              });
            }
          }
        }
      }
      
      notify('Demande de location soumise avec succès!');
      setShowNewRental(false);
      setStep(1);
      setStartDate(null);
      setEndDate(null);
      setSelectedItems([]);
      setCustomerNotes('');
      loadData();
    } catch (err) {
      notify(`Erreur: ${err.message}`, 'error');
    }
    setSaving(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      requested: 'bg-blue-100 text-blue-700',
      pending_quote_review: 'bg-amber-100 text-amber-700',
      quote_sent: 'bg-red-100 text-red-700',
      waiting_bc: 'bg-purple-100 text-purple-700',
      bc_review: 'bg-indigo-100 text-indigo-700',
      bc_approved: 'bg-teal-100 text-teal-700',
      shipped: 'bg-cyan-100 text-cyan-700',
      in_rental: 'bg-cyan-100 text-cyan-700',
      return_pending: 'bg-orange-100 text-orange-700',
      returned: 'bg-teal-100 text-teal-700',
      inspection: 'bg-blue-100 text-blue-700',
      inspection_issue: 'bg-red-100 text-red-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    const labels = {
      requested: 'Demande envoyée',
      pending_quote_review: 'Devis en préparation',
      quote_sent: '⚠ Action requise',
      waiting_bc: 'En attente BC',
      bc_review: 'BC en révision',
      bc_approved: 'BC approuvé',
      shipped: 'Expédié / En location',
      in_rental: 'Expédié / En location',
      return_pending: 'Retour en attente',
      returned: 'Retourné',
      inspection: 'Inspection en cours',
      inspection_issue: '⚠ Action requise',
      completed: 'Terminé',
      cancelled: 'Annulé'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Calendar Component
  const Calendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days = [];
    for (let i = 0; i < startPadding; i++) {
      days.push(<div key={`pad-${i}`} className="h-10" />);
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const isPast = date < today;
      const isBlocked = isDateBlocked(date);
      const isSelected = startDate && endDate && date >= startDate && date <= endDate;
      const isStart = startDate && date.getTime() === startDate.getTime();
      const isEnd = endDate && date.getTime() === endDate.getTime();
      
      let className = 'h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ';
      if (isPast) className += 'text-gray-300 cursor-not-allowed';
      else if (isBlocked) className += 'bg-red-100 text-red-400 cursor-not-allowed line-through';
      else if (isStart || isEnd) className += 'bg-[#8B5CF6] text-white';
      else if (isSelected) className += 'bg-[#8B5CF6]/20 text-[#8B5CF6]';
      else className += 'hover:bg-gray-100 cursor-pointer text-gray-700';
      
      days.push(
        <div key={d} className={className}
          onClick={() => {
            if (isPast || isBlocked) return;
            if (!startDate || (startDate && endDate)) { setStartDate(date); setEndDate(null); }
            else if (date < startDate) setStartDate(date);
            else {
              // Enforce 7-day minimum
              const diffDays = Math.ceil((date - startDate) / (1000 * 60 * 60 * 24)) + 1;
              if (diffDays < 5) {
                const minEnd = new Date(startDate);
                minEnd.setDate(minEnd.getDate() + 4);
                setEndDate(minEnd);
              } else {
                setEndDate(date);
              }
            }
          }}
        >{d}</div>
      );
    }
    
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
          <h3 className="font-bold text-gray-800">{currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
          <button type="button" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#8B5CF6] rounded" /><span>Sélectionné</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 rounded" /><span>Indisponible</span></div>
        </div>
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 font-medium">⚠️ Durée minimum : 5 jours minimum pour toutes les locations</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // New Rental Form
  if (showNewRental) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { setShowNewRental(false); setStep(1); }} className="text-gray-500 hover:text-gray-700">←</button>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Nouvelle Location</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[{ num: 1, label: 'Dates' }, { num: 2, label: 'Équipement' }, { num: 3, label: 'Confirmation' }].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s.num ? 'bg-[#8B5CF6] text-white' : 'bg-gray-200 text-gray-500'}`}>{s.num}</div>
              <span className={`ml-2 text-sm font-medium ${step >= s.num ? 'text-[#8B5CF6]' : 'text-gray-400'}`}>{s.label}</span>
              {idx < 2 && <div className={`w-12 h-0.5 mx-4 ${step > s.num ? 'bg-[#8B5CF6]' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Dates */}
        {step === 1 && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Sélectionnez vos dates de location</h2>
              <Calendar />
            </div>
            <div>
              <div className="bg-[#8B5CF6]/10 rounded-xl p-6 border border-[#8B5CF6]/20">
                <h3 className="font-bold text-[#8B5CF6] mb-4">📅 Période sélectionnée</h3>
                {startDate && endDate ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-sm text-gray-500">Date de début</p><p className="font-bold text-gray-800">{startDate.toLocaleDateString('fr-FR')}</p></div>
                      <div><p className="text-sm text-gray-500">Date de fin</p><p className="font-bold text-gray-800">{endDate.toLocaleDateString('fr-FR')}</p></div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-3xl font-bold text-[#8B5CF6]">{rentalDays} jour{rentalDays > 1 ? 's' : ''}</p>
                      {rentalDays < 5 && (
                        <p className="text-red-600 text-sm font-medium mt-1">⚠️ Minimum 5 jours requis</p>
                      )}
                    </div>
                    <button onClick={() => setStep(2)} disabled={rentalDays < 5} className="w-full py-3 bg-[#8B5CF6] text-white rounded-lg font-bold hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed">
                      {rentalDays < 5 ? 'Minimum 5 jours requis' : 'Continuer → Choisir l\'équipement'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-4xl mb-2">📅</p>
                    <p>Sélectionnez une période sur le calendrier</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Equipment */}
        {step === 2 && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Choisissez votre équipement</h2>
                  <p className="text-gray-600">Du {startDate?.toLocaleDateString('fr-FR')} au {endDate?.toLocaleDateString('fr-FR')} ({rentalDays} jours)</p>
                </div>
                <button onClick={() => setStep(1)} className="text-[#8B5CF6] hover:underline">← Modifier les dates</button>
              </div>

              {/* Bundles */}
              {bundles.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-700 mb-3">📦 Kits complets</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {bundles.map(bundle => {
                      const available = isBundleAvailable(bundle);
                      const selected = selectedItems.find(s => s.type === 'bundle' && s.id === bundle.id);
                      const pricing = calculatePrice(bundle.price_per_day, bundle.price_per_week, bundle.price_per_month, rentalDays);
                      return (
                        <div key={bundle.id} onClick={() => available && toggleSelection('bundle', bundle)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${!available ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' : selected ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]' : 'bg-white border-gray-200 hover:border-[#8B5CF6]/50'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div><h4 className="font-bold text-gray-800">{bundle.bundle_name}</h4><p className="text-sm text-gray-500">{bundle.description_fr || bundle.description}</p></div>
                            {selected && <span className="text-[#8B5CF6] text-xl">✓</span>}
                          </div>
                          <div className="flex items-end justify-between">
                            <div><p className="text-2xl font-bold text-[#8B5CF6]">€{pricing.total.toFixed(2)}</p><p className="text-xs text-gray-500">€{bundle.price_per_day}/jour</p></div>
                            {!available && <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">Indisponible</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Devices */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3">🔬 Appareils individuels</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {inventory.map(device => {
                    const available = isDeviceAvailable(device.id);
                    const selected = selectedItems.find(s => s.type === 'device' && s.id === device.id);
                    const pricing = calculatePrice(device.price_per_day, device.price_per_week, device.price_per_month, rentalDays);
                    const typeLabels = { particle_counter: '🔬 Compteur de particules', bio_collector: '🧫 Bio collecteur', liquid_counter: '💧 Compteur liquide', other: '📦 Autre' };
                    return (
                      <div key={device.id} onClick={() => available && toggleSelection('device', device)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${!available ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' : selected ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]' : 'bg-white border-gray-200 hover:border-[#8B5CF6]/50'}`}>
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {getDeviceImageUrl(device.model_name) && <img src={getDeviceImageUrl(device.model_name)} alt="" className="w-10 h-10 object-contain" />}
                            <div>
                              <h4 className="font-bold text-gray-800">{device.model_name}</h4>
                              <p className="text-xs text-gray-400">{device.brand || 'Lighthouse'} • <span className="font-mono">SN: {device.serial_number}</span></p>
                            </div>
                          </div>
                          {selected && <span className="text-[#8B5CF6] text-xl ml-2">✓</span>}
                        </div>
                        {device.device_type && (
                          <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 mb-1.5">{typeLabels[device.device_type] || device.device_type}</span>
                        )}
                        {(device.description_fr || device.description) && (
                          <p className="text-xs text-gray-600 leading-relaxed mb-1.5">{device.description_fr || device.description}</p>
                        )}
                        {device.specs && (
                          <p className="text-xs text-gray-400 italic leading-relaxed mb-2">⚙️ {device.specs}</p>
                        )}
                        <div className="flex items-end justify-between pt-2 border-t border-gray-100">
                          <div><p className="text-2xl font-bold text-[#8B5CF6]">€{pricing.total.toFixed(2)}</p><p className="text-xs text-gray-500">€{device.price_per_day}/jour{device.price_per_week ? ` • €${device.price_per_week}/sem` : ''}</p></div>
                          {!available && <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">Indisponible</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selection Summary */}
            <div>
              <div className="bg-white rounded-xl p-6 shadow-sm border sticky top-4">
                <h3 className="font-bold text-gray-800 mb-4">🛒 Votre sélection</h3>
                {selectedItems.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Aucun équipement sélectionné</p>
                ) : (
                  <div className="space-y-3 mb-6">
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div><p className="font-medium text-gray-800 text-sm">{item.name}</p><p className="text-xs text-gray-500">{item.rentalDays} jours</p></div>
                        <div className="text-right">
                          <p className="font-bold text-[#8B5CF6]">€{item.total.toFixed(2)}</p>
                          <button onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))} className="text-xs text-red-500 hover:underline">Retirer</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total estimé</span>
                    <span className="text-[#8B5CF6]">€{subtotal.toFixed(2)} HT</span>
                  </div>
                </div>
                <button onClick={() => setStep(3)} disabled={selectedItems.length === 0}
                  className="w-full mt-6 py-3 bg-[#8B5CF6] text-white rounded-lg font-bold hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed">
                  Continuer → Confirmation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
              <div className="bg-[#8B5CF6] text-white p-6">
                <h3 className="text-xl font-bold mb-2">Demande de Location</h3>
                <p>Du {startDate?.toLocaleDateString('fr-FR')} au {endDate?.toLocaleDateString('fr-FR')} ({rentalDays} jours)</p>
              </div>
              
              <div className="p-6 border-b">
                <h4 className="font-bold text-gray-700 mb-4">Équipement sélectionné</h4>
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div><p className="font-medium text-gray-800">{item.name}</p></div>
                    <p className="font-bold text-gray-800">€{item.total.toFixed(2)}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-4 text-lg font-bold">
                  <span>Total HT (estimation)</span>
                  <span className="text-[#8B5CF6]">€{subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-6 border-b">
                <h4 className="font-bold text-gray-700 mb-4">💳 Adresse de facturation</h4>
                <select value={showNewBillingForm ? '__new__' : billingAddressId} onChange={e => { if (e.target.value === '__new__') { setShowNewBillingForm(true); setBillingAddressId(''); } else { setBillingAddressId(e.target.value); setShowNewBillingForm(false); } }} className="w-full px-3 py-2.5 border rounded-lg text-sm">
                  <option value="">Sélectionner...</option>
                  {billingAddresses.map(a => <option key={a.id} value={a.id}>{a.company_name || a.label} — {a.address_line1}, {a.postal_code} {a.city}{a.siret ? ` (SIRET: ${a.siret})` : ''}</option>)}
                  <option value="__new__">+ Nouvelle adresse de facturation...</option>
                </select>
                {selectedBillingAddr && !showNewBillingForm && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-sm">
                    <p className="font-medium">{selectedBillingAddr.company_name}</p>
                    <p className="text-gray-600">{selectedBillingAddr.address_line1}, {selectedBillingAddr.postal_code} {selectedBillingAddr.city}</p>
                    {selectedBillingAddr.siret && <p className="text-green-600 mt-1">SIRET: {selectedBillingAddr.siret}</p>}
                  </div>
                )}
                {showNewBillingForm && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border grid grid-cols-2 gap-2">
                    <div className="col-span-2"><input type="text" value={newBillingAddress.company_name} onChange={e => setNewBillingAddress({...newBillingAddress, company_name: e.target.value})} placeholder="Société *" className="w-full px-2 py-1.5 border rounded text-sm" /></div>
                    <input type="text" value={newBillingAddress.attention} onChange={e => setNewBillingAddress({...newBillingAddress, attention: e.target.value})} placeholder="Contact *" className="w-full px-2 py-1.5 border rounded text-sm" />
                    <input type="tel" value={newBillingAddress.phone} onChange={e => setNewBillingAddress({...newBillingAddress, phone: e.target.value})} placeholder="Téléphone" className="w-full px-2 py-1.5 border rounded text-sm" />
                    <div className="col-span-2"><input type="text" value={newBillingAddress.address_line1} onChange={e => setNewBillingAddress({...newBillingAddress, address_line1: e.target.value})} placeholder="Adresse *" className="w-full px-2 py-1.5 border rounded text-sm" /></div>
                    <input type="text" value={newBillingAddress.postal_code} onChange={e => setNewBillingAddress({...newBillingAddress, postal_code: e.target.value})} placeholder="Code postal *" className="w-full px-2 py-1.5 border rounded text-sm" />
                    <input type="text" value={newBillingAddress.city} onChange={e => setNewBillingAddress({...newBillingAddress, city: e.target.value})} placeholder="Ville *" className="w-full px-2 py-1.5 border rounded text-sm" />
                    <input type="text" value={newBillingAddress.siret} onChange={e => setNewBillingAddress({...newBillingAddress, siret: e.target.value})} placeholder="SIRET" className="w-full px-2 py-1.5 border rounded text-sm" />
                    <input type="text" value={newBillingAddress.tva_number} onChange={e => setNewBillingAddress({...newBillingAddress, tva_number: e.target.value})} placeholder="N° TVA" className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                )}
              </div>

              <div className="p-6 border-b">
                <h4 className="font-bold text-gray-700 mb-4">🚚 Livraison</h4>
                <div className="space-y-2 mb-4">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${rentalDeliveryMethod === 'standard' ? 'border-[#8B5CF6] bg-[#8B5CF6]/5' : 'border-gray-200'}`}>
                    <input type="radio" name="rental_delivery" checked={rentalDeliveryMethod === 'standard'} onChange={() => setRentalDeliveryMethod('standard')} className="mt-0.5" />
                    <div><p className="font-medium">🚚 Livraison standard</p><p className="text-xs text-gray-500">Livré à votre adresse par Lighthouse</p></div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${rentalDeliveryMethod === 'own_label' ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
                    <input type="radio" name="rental_delivery" checked={rentalDeliveryMethod === 'own_label'} onChange={() => setRentalDeliveryMethod('own_label')} className="mt-0.5" />
                    <div><p className="font-medium">🏷️ Mon propre transporteur</p><p className="text-xs text-gray-500">Vous organisez l'enlèvement</p></div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${rentalDeliveryMethod === 'pickup' ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <input type="radio" name="rental_delivery" checked={rentalDeliveryMethod === 'pickup'} onChange={() => setRentalDeliveryMethod('pickup')} className="mt-0.5" />
                    <div><p className="font-medium">🏢 Récupération sur place</p><p className="text-xs text-gray-500">À notre atelier à Créteil</p></div>
                  </label>
                </div>
                {rentalDeliveryMethod === 'standard' && (
                  <div className="mt-4">
                    <h5 className="text-sm font-bold text-gray-600 mb-3">📍 Adresse de livraison</h5>
                    <div className="space-y-2">
                      {addresses.filter(a => !a.is_billing).map(addr => (
                        <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer ${shippingAddressId === addr.id ? 'border-[#8B5CF6] bg-[#8B5CF6]/5' : 'border-gray-200'}`}>
                          <input type="radio" checked={shippingAddressId === addr.id} onChange={() => setShippingAddressId(addr.id)} />
                          <div>
                            <p className="font-medium">{addr.company_name || addr.label}</p>
                            {addr.attention && <p className="text-sm text-gray-500">Attn: {addr.attention}</p>}
                            <p className="text-sm text-gray-600">{addr.address_line1}, {addr.postal_code} {addr.city}</p>
                            {addr.phone && <p className="text-sm text-gray-400">📞 {addr.phone}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6">
                <h4 className="font-bold text-gray-700 mb-2">Notes (optionnel)</h4>
                <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} rows={3}
                  className="w-full border rounded-lg p-3" placeholder="Informations complémentaires..." />
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="px-6 py-3 border rounded-lg hover:bg-gray-50">← Retour</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-3 bg-[#8B5CF6] text-white rounded-lg font-bold hover:bg-[#7C3AED] disabled:opacity-50">
                {saving ? 'Envoi en cours...' : 'Soumettre la demande'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Signature pad functions (identical to RMA)
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1E3A5F';
    setIsDrawing(true);
  };
  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) setSignatureData(canvas.toDataURL('image/png'));
    }
  };
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };

  const hasValidSignature = signatureData && luEtApprouve.toLowerCase().trim() === 'lu et approuvé';
  const isSubmissionValid = signatureName.trim().length > 0 && acceptTerms && (bcFileUpload || hasValidSignature);

  // Load messages and docs for selected rental
  const loadRentalComms = async (rentalId) => {
    const { data: msgs } = await supabase.from('messages').select('*').eq('rental_request_id', rentalId).order('created_at', { ascending: true });
    if (msgs) setRentalMessages(msgs);
    const { data: docs } = await supabase.from('request_attachments').select('*').eq('rental_request_id', rentalId);
    if (docs) setRentalDocs(docs);
  };

  const sendRentalMessage = async (e) => {
    e?.preventDefault();
    if (!rentalNewMsg.trim() || !selectedRental) return;
    setRentalSending(true);
    try {
      const { data, error: sendErr } = await supabase.from('messages').insert({
        rental_request_id: selectedRental.id,
        sender_id: profile?.id,
        sender_name: profile?.full_name || 'Client',
        sender_type: 'customer',
        content: rentalNewMsg.trim()
      }).select().single();
      if (sendErr) {
        console.error('Rental message send error:', sendErr);
        notify('Erreur: ' + (sendErr.message || sendErr.details || JSON.stringify(sendErr)), 'error');
      } else {
        setRentalNewMsg('');
        setRentalMessages(prev => [...prev, data]);
        notify('Message envoyé !');
      }
    } catch (err) {
      console.error('Rental message exception:', err);
      notify('Erreur: ' + err.message, 'error');
    }
    setRentalSending(false);
  };

  const handleRentalRevision = async () => {
    if (!rentalRevisionNotes.trim() || !selectedRental) { notify('Veuillez décrire les modifications', 'error'); return; }
    setRentalProcessing(true);
    await supabase.from('rental_requests').update({
      status: 'requested',
      quote_revision_notes: rentalRevisionNotes.trim(),
      quote_revision_requested_at: new Date().toISOString()
    }).eq('id', selectedRental.id);
    notify('✅ Demande de modification envoyée !');
    setShowRentalRevision(false);
    setShowRentalQuote(false);
    setRentalProcessing(false);
    setSelectedRental(null);
    loadData();
  };

  // BC submission (mirrors RMA exactly)
  const submitRentalBC = async () => {
    if (!selectedRental) return;
    if (!acceptTerms) { notify('Veuillez accepter les conditions générales', 'error'); return; }
    if (!signatureName.trim()) { notify('Veuillez entrer votre nom', 'error'); return; }
    if (!bcFileUpload && !hasValidSignature) { notify('Veuillez télécharger un BC OU signer électroniquement', 'error'); return; }
    
    setSubmittingBC(true);
    try {
      // 1. Upload BC file if provided
      let fileUrl = null;
      if (bcFileUpload) {
        try {
          const fileName = `bons-commande/rentals/${selectedRental.rental_number}/bc_${Date.now()}.${bcFileUpload.name.split('.').pop()}`;
          const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, bcFileUpload);
          if (!uploadError) {
            const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(fileName);
            fileUrl = publicUrl?.publicUrl;
          }
        } catch (e) { console.log('File upload skipped'); }
      }
      
      // 2. Upload signature image
      let signatureUrl = null;
      if (signatureData) {
        try {
          const signatureBlob = await fetch(signatureData).then(r => r.blob());
          const sigFileName = `signatures/rentals/${selectedRental.rental_number}/sig_bc_${Date.now()}.png`;
          const { error: sigError } = await supabase.storage.from('documents').upload(sigFileName, signatureBlob);
          if (!sigError) {
            const { data: sigUrl } = supabase.storage.from('documents').getPublicUrl(sigFileName);
            signatureUrl = sigUrl?.publicUrl;
          }
        } catch (e) { console.error('Signature upload error:', e); }
      }
      
      // 3. Generate signed quote PDF if electronic signature
      let signedQuotePdfUrl = null;
      if (hasValidSignature) {
        try {
          const pdfBlob = await generateRentalQuotePDF({
            rental: selectedRental,
            isSigned: true,
            signatureName: signatureName,
            signatureDate: new Date(signatureDateISO).toLocaleDateString('fr-FR'),
            signatureImage: signatureData
          });
          const pdfFileName = `bons-commande/rentals/${selectedRental.rental_number}/devis_signe_${Date.now()}.pdf`;
          const { error: pdfUploadError } = await supabase.storage
            .from('documents')
            .upload(pdfFileName, pdfBlob, { contentType: 'application/pdf' });
          if (!pdfUploadError) {
            const { data: pdfUrl } = supabase.storage.from('documents').getPublicUrl(pdfFileName);
            signedQuotePdfUrl = pdfUrl?.publicUrl;
          }
        } catch (e) { console.error('Signed rental PDF error:', e); }
      }
      
      // 4. Update rental request
      const updateData = {
        status: 'bc_review',
        bc_submitted_at: new Date().toISOString(),
        bc_signed_by: signatureName,
        bc_signature_date: signatureDateISO,
        quote_approved_at: selectedRental.status === 'quote_sent' ? new Date().toISOString() : selectedRental.quote_approved_at
      };
      if (fileUrl) updateData.bc_file_url = fileUrl;
      if (signatureUrl) updateData.bc_signature_url = signatureUrl;
      if (signedQuotePdfUrl) updateData.signed_quote_url = signedQuotePdfUrl;
      
      await supabase.from('rental_requests').update(updateData).eq('id', selectedRental.id);
      
      // 5. Save BC as attachment
      if (fileUrl) {
        await supabase.from('request_attachments').insert({
          rental_request_id: selectedRental.id,
          file_name: `Bon_de_Commande_${selectedRental.rental_number}.pdf`,
          file_url: fileUrl,
          file_type: bcFileUpload?.type || 'application/pdf',
          file_size: bcFileUpload?.size || 0,
          uploaded_by: profile.id,
          category: 'bon_commande'
        });
      }
      
      // 6. Save signed quote PDF as attachment
      if (signedQuotePdfUrl) {
        await supabase.from('request_attachments').insert({
          rental_request_id: selectedRental.id,
          file_name: `Devis_Signe_${selectedRental.rental_number}.pdf`,
          file_url: signedQuotePdfUrl,
          file_type: 'application/pdf',
          uploaded_by: profile.id,
          category: 'devis_signe'
        });
      }
      
      notify('✅ Bon de commande soumis avec succès !');
      setShowBCModal(false);
      setBcFileUpload(null);
      setLuEtApprouve('');
      setAcceptTerms(false);
      clearSignature();
      setSelectedRental(null);
      loadData();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSubmittingBC(false);
  };

  // Detail view for selected rental
  if (selectedRental) {
    const rental = selectedRental;
    const rentalDaysDisplay = rental.rental_days || Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000 * 60 * 60 * 24)) + 1;
    const needsAction = rental.status === 'quote_sent';
    const qd = rental.quote_data || {};
    const items = qd.quoteItems || qd.items || rental.rental_request_items || [];
    const hasQuote = !!(rental.quote_total_ht || qd.totalHT);
    const period = qd.rentalPeriod || { start: rental.start_date, end: rental.end_date, days: rentalDaysDisplay };
    const company = rental.companies || {};

    // Load comms once per rental (not on every render)
    if (rentalCommsLoaded !== rental.id) {
      setRentalCommsLoaded(rental.id);
      loadRentalComms(rental.id);
    }

    return (
      <div>
        <button onClick={() => { setSelectedRental(null); setRentalTab('overview'); setRentalMessages([]); setRentalDocs([]); setRentalCommsLoaded(null); }} className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-2">
          ← Retour aux locations
        </button>
        
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {/* Header - identical to RMA */}
          <div className="bg-[#1a1a2e] text-white p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{rental.rental_number}</h2>
                <p className="text-gray-300 text-sm mt-1">
                  Du {new Date(rental.start_date).toLocaleDateString('fr-FR')} au {new Date(rental.end_date).toLocaleDateString('fr-FR')} ({rentalDaysDisplay} jours)
                </p>
                <p className="text-gray-400 text-xs mt-1">{company.name || ''}</p>
              </div>
              {getStatusBadge(rental.status)}
            </div>
            
            {/* Progress Bar */}
            <StepProgress status={rental.status} serviceType="rental" />
          </div>

          {/* Action Required Banner (quote_sent) */}
          {needsAction && (
            <div className="bg-red-50 border-b border-red-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 font-bold text-lg">!</span>
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Action requise</p>
                    <p className="text-sm text-red-600">Veuillez consulter le devis et soumettre votre bon de commande</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasQuote && (
                    <button onClick={() => setShowRentalQuote(true)} className="px-4 py-2 border border-[#3B7AB4] text-[#3B7AB4] rounded-lg font-medium hover:bg-blue-50">
                      👁️ Voir le Devis
                    </button>
                  )}
                  <button onClick={() => setShowBCModal(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">
                    📄 Soumettre BC
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BC Review - Pending */}
          {(rental.status === 'bc_review' || rental.bc_submitted_at) && rental.status !== 'bc_approved' && !['shipped', 'in_rental', 'return_pending', 'returned', 'inspection', 'inspection_issue', 'completed'].includes(rental.status) && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-bold text-blue-800">Bon de commande en cours de vérification</p>
                  <p className="text-sm text-blue-600">Soumis le {rental.bc_submitted_at ? new Date(rental.bc_submitted_at).toLocaleDateString('fr-FR') : '—'} par {rental.bc_signed_by || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Waiting BC (approved but no file) */}
          {rental.status === 'waiting_bc' && !rental.bc_file_url && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-bold text-amber-800">Devis approuvé — En attente de votre bon de commande</p>
                  </div>
                </div>
                <button onClick={() => setShowBCModal(true)} className="px-4 py-2 bg-[#00A651] text-white rounded-lg font-medium hover:bg-green-600">📄 Soumettre BC</button>
              </div>
            </div>
          )}

          {/* BC Rejected */}
          {rental.bc_rejection_reason && (
            <div className="bg-red-50 border-b border-red-300 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-white text-2xl">❌</span>
                  </div>
                  <div>
                    <p className="font-bold text-red-800 text-lg">Bon de commande rejeté — Action requise</p>
                    <p className="text-sm text-red-600">Votre bon de commande a été rejeté. Veuillez corriger et soumettre à nouveau.</p>
                    <div className="mt-2 p-3 bg-white rounded-lg border-2 border-red-300">
                      <p className="text-xs text-red-600 font-medium uppercase">Raison du rejet :</p>
                      <p className="text-sm text-red-800 font-medium mt-1">{rental.bc_rejection_reason}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowBCModal(true)} className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">📄 Resoumettre BC</button>
              </div>
            </div>
          )}

          {/* Tabs - identical structure to RMA */}
          <div className="flex gap-1 px-6 pt-4 bg-gray-50 border-b overflow-x-auto">
            {[
              { id: 'overview', label: 'Aperçu', icon: '📋' },
              { id: 'documents', label: 'Documents', icon: '📄', badge: rentalDocs.filter(d => !(d.category||'').startsWith('internal_') && !(d.category||'').startsWith('archived_') && !d.archived_at).length + [rental.quote_url, rental.signed_quote_url, rental.bc_file_url, (rental.quote_data||{}).bl_url || ((rental.quote_data||{}).shippingInfo||{}).bl_url, (rental.quote_data||{}).ups_label_url || ((rental.quote_data||{}).shippingInfo||{}).ups_label_url].filter(Boolean).length },
              { id: 'messages', label: 'Messages', icon: '💬', badge: rentalMessages.filter(m => m.sender_type !== 'customer' && !m.is_read).length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRentalTab(tab.id)}
                className={`px-4 py-2.5 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
                  rentalTab === tab.id ? 'bg-white border border-b-0 border-gray-200 text-[#1E3A5F]' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span> {tab.label}
                {tab.badge > 0 && <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${tab.id === 'messages' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{tab.badge}</span>}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ========== OVERVIEW TAB ========== */}
            {rentalTab === 'overview' && (() => {
              const shipping = qd.shippingInfo || {};
              const trackingNum = rental.outbound_tracking || shipping.outbound_tracking || qd.outbound_tracking || '';
              const shippedAt = rental.outbound_shipped_at || shipping.outbound_shipped_at || qd.outbound_shipped_at || '';
              const blNum = rental.bl_number || shipping.bl_number || qd.bl_number || '';

              return (
              <div className="space-y-6">
                {/* Rental period */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-4 flex-wrap text-sm">
                    <span className="font-bold text-purple-800">📅 Période de location</span>
                    <span className="font-medium">{new Date(rental.start_date).toLocaleDateString('fr-FR')} → {new Date(rental.end_date).toLocaleDateString('fr-FR')}</span>
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full text-xs font-bold">{rentalDaysDisplay} jours</span>
                    {['in_rental', 'shipped'].includes(rental.status) && (() => {
                      const daysLeft = Math.ceil((new Date(rental.end_date) - new Date()) / (1000*60*60*24));
                      return daysLeft < 0 
                        ? <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">{Math.abs(daysLeft)}j de retard</span>
                        : daysLeft <= 5
                          ? <span className="px-2 py-0.5 bg-orange-400 text-white rounded-full text-xs font-bold">{daysLeft}j restant{daysLeft > 1 ? 's' : ''}</span>
                          : <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">{daysLeft}j restants</span>;
                    })()}
                  </div>
                </div>

                {/* Shipping / Tracking */}
                {trackingNum && (
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🚚</span>
                      <div className="flex-1">
                        <p className="font-bold text-cyan-800">
                          {['shipped', 'in_rental'].includes(rental.status) ? 'Votre équipement a été expédié' : 'Suivi d\'expédition'}
                        </p>
                        {shippedAt && <p className="text-xs text-cyan-600">Expédié le {new Date(shippedAt).toLocaleDateString('fr-FR')}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <a href={`https://www.ups.com/track?tracknum=${trackingNum}`} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-2 px-4 py-2 bg-[#FFB500] hover:bg-[#E5A300] text-[#351C15] rounded-lg font-bold text-sm transition-colors">
                        <span>📦</span> Suivre sur UPS
                      </a>
                      <span className="font-mono text-sm text-cyan-700">{trackingNum}</span>
                    </div>
                    {blNum && <p className="text-xs text-gray-500 mt-2">BL N° {blNum}</p>}
                  </div>
                )}

                {/* Equipment List */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-3">📦 Équipements</h3>
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-800">{item.item_name || item.equipment_model || '—'}</p>
                            {item.serial_number && !(item.item_name || '').includes(item.serial_number) && <p className="text-xs text-gray-500 font-mono">S/N: {item.serial_number}</p>}
                          </div>
                          {(item.line_total || 0) > 0 && (
                            <span className="font-bold text-[#8B5CF6] text-lg">{parseFloat(item.line_total).toFixed(2)} € HT</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quote Summary */}
                {hasQuote && (
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">💰 Résumé du Devis</h3>
                    <div className="bg-gray-50 rounded-lg p-4 border space-y-2">
                      {(qd.discount || 0) > 0 && <>
                        <div className="flex justify-between text-sm"><span>Sous-total</span><span>{(qd.subtotalBeforeDiscount || 0).toFixed(2)} €</span></div>
                        <div className="flex justify-between text-sm text-green-600"><span>Remise {qd.discountType === 'percent' ? `(${qd.discount}%)` : '(forfait)'}</span><span>-{(qd.discountAmount || 0).toFixed(2)} €</span></div>
                      </>}
                      {(qd.shipping || 0) > 0 && <div className="flex justify-between text-sm"><span>Transport</span><span>{parseFloat(qd.shipping || 0).toFixed(2)} €</span></div>}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total HT</span><span className="text-[#00A651]">{(qd.totalHT || rental.quote_total_ht || 0).toFixed(2)} €</span></div>
                    </div>
                  </div>
                )}

                {/* Insurance Notice */}
                {hasQuote && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <p className="font-bold text-sm text-amber-800 mb-1">Conditions générales de location</p>
                    <p className="text-xs text-amber-700 leading-relaxed">Le matériel reste la propriété de Lighthouse France. La garde est transférée au client dès réception jusqu'à restitution. Utilisation conforme à sa destination par un personnel qualifié ; sous-location interdite sans accord écrit. Le client doit souscrire une assurance « Bien Confié ». Tout incident, dommage ou perte signalé sous 48h. Matériel restitué en bon état ; dommages facturés. Retard facturé au tarif journalier +50%.</p>
                    {(qd.totalRetailValue || 0) > 0 && <p className="font-bold text-xs text-amber-800 mt-2">Valeur à assurer : {qd.totalRetailValue.toFixed(2)} € HT</p>}
                  </div>
                )}

                {/* Inspection Status - Customer View */}
                {rental.status === 'inspection' && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔍</span>
                      <div>
                        <p className="font-bold text-blue-800">Inspection en cours</p>
                        <p className="text-sm text-blue-600">Votre appareil a été reçu et est en cours d'inspection par notre équipe technique.</p>
                      </div>
                    </div>
                  </div>
                )}
                {rental.status === 'inspection_issue' && (
                  <div className="bg-red-50 rounded-lg p-4 border border-red-300">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <p className="font-bold text-red-800">Action requise — Dommages constatés</p>
                        <p className="text-sm text-red-600">Lors de la réception de votre appareil, nous avons constaté des problèmes nécessitant une intervention. Veuillez consulter le devis de réparation dans vos messages ou documents.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Notes */}
                {rental.customer_notes && (
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <h3 className="font-bold text-gray-800 mb-2">📝 Vos notes</h3>
                    <p className="text-sm text-gray-600">{rental.customer_notes}</p>
                  </div>
                )}
              </div>
              );
            })()}

            {/* ========== DOCUMENTS TAB ========== */}
            {rentalTab === 'documents' && (() => {
              const shipping = qd.shippingInfo || {};
              const blUrl = rental.bl_url || shipping.bl_url || qd.bl_url || '';
              const blNumber = rental.bl_number || shipping.bl_number || qd.bl_number || '';
              const upsLabelUrl = rental.ups_label_url || shipping.ups_label_url || qd.ups_label_url || '';
              const outboundTracking = rental.outbound_tracking || shipping.outbound_tracking || qd.outbound_tracking || '';
              // Filter out internal docs and duplicates
              const visibleDocs = rentalDocs.filter(d => 
                d.file_url && 
                !(d.category || '').startsWith('internal_') && 
                !(d.category || '').startsWith('archived_') &&
                !d.archived_at &&
                d.file_url !== rental.quote_url && 
                d.file_url !== rental.signed_quote_url && 
                d.file_url !== rental.bc_file_url &&
                d.file_url !== blUrl &&
                d.file_url !== upsLabelUrl
              );
              const getCategoryIcon = (cat) => ({ bon_commande: '📝', bon_livraison: '📄', ups_label: '🏷️', signed_quote: '✅', devis: '💰' }[cat] || '📎');

              return (
              <div className="space-y-6">
                <h3 className="font-bold text-[#1E3A5F]">📁 Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Devis Location */}
                  {rental.quote_url && (
                    <a href={rental.quote_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-purple-50 transition-colors border-purple-200">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">💰</div>
                      <div>
                        <p className="font-medium text-gray-800">Devis Location</p>
                        <p className="text-sm text-purple-600">N° {rental.rental_number}</p>
                        {rental.quote_sent_at && <p className="text-xs text-gray-400 mt-0.5">Envoyé le {new Date(rental.quote_sent_at).toLocaleDateString('fr-FR')}</p>}
                      </div>
                    </a>
                  )}

                  {/* Signed Quote */}
                  {rental.signed_quote_url && (
                    <a href={rental.signed_quote_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-green-50 transition-colors border-green-200">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">✅</div>
                      <div>
                        <p className="font-medium text-gray-800">Devis Signé</p>
                        <p className="text-sm text-green-600">N° {rental.rental_number}</p>
                        {rental.quote_approved_at && <p className="text-xs text-gray-400 mt-0.5">Signé le {new Date(rental.quote_approved_at).toLocaleDateString('fr-FR')}</p>}
                      </div>
                    </a>
                  )}

                  {/* Bon de Commande */}
                  {rental.bc_file_url && (
                    <a href={rental.bc_file_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-amber-50 transition-colors border-amber-200">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">📋</div>
                      <div>
                        <p className="font-medium text-gray-800">Bon de Commande</p>
                        <p className="text-sm text-amber-600">N° {rental.bc_number || rental.rental_number}</p>
                        {rental.bc_submitted_at && <p className="text-xs text-gray-400 mt-0.5">Soumis le {new Date(rental.bc_submitted_at).toLocaleDateString('fr-FR')} par {rental.bc_signed_by || '—'}</p>}
                      </div>
                    </a>
                  )}

                  {/* Bon de Livraison */}
                  {blUrl && (
                    <a href={blUrl} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-cyan-50 transition-colors border-cyan-200">
                      <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                      <div>
                        <p className="font-medium text-gray-800">Bon de Livraison</p>
                        <p className="text-sm text-cyan-600">{blNumber ? `N° ${blNumber}` : 'BL'}</p>
                      </div>
                    </a>
                  )}

                  {/* UPS Label */}
                  {upsLabelUrl && (
                    <a href={upsLabelUrl} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-amber-50 transition-colors">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">🏷️</div>
                      <div>
                        <p className="font-medium text-gray-800">Étiquette UPS</p>
                        <p className="text-sm text-amber-600">{outboundTracking || "Label d'expédition"}</p>
                      </div>
                    </a>
                  )}

                  {/* Additional visible attachments (admin-uploaded, non-internal) */}
                  {visibleDocs.map(doc => (
                    <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                        {getCategoryIcon(doc.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{doc.file_name || doc.category || 'Document'}</p>
                        <p className="text-sm text-gray-500">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </a>
                  ))}
                </div>

                {/* UPS Tracking link */}
                {outboundTracking && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-sm text-blue-800">
                      📦 Suivi UPS : <a href={`https://www.ups.com/track?tracknum=${outboundTracking}`} target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-blue-600 hover:underline">{outboundTracking}</a>
                    </p>
                  </div>
                )}

                {/* No docs fallback */}
                {!rental.quote_url && !rental.signed_quote_url && !rental.bc_file_url && !blUrl && !upsLabelUrl && visibleDocs.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-4xl mb-2">📄</p>
                    <p className="font-medium text-gray-500">Aucun document</p>
                    <p className="text-sm text-gray-400 mt-1">Les documents seront disponibles ici</p>
                  </div>
                )}
              </div>
              );
            })()}

            {/* ========== MESSAGES TAB (identical to RMA) ========== */}
            {rentalTab === 'messages' && (
              <div>
                <div className="h-[400px] overflow-y-auto mb-4 space-y-4">
                  {rentalMessages.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                      <p className="text-4xl mb-2">💬</p>
                      <p>Aucun message</p>
                      <p className="text-sm">Envoyez un message à notre équipe</p>
                    </div>
                  ) : (
                    rentalMessages.map(msg => {
                      const isMe = msg.sender_id === profile?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-lg p-3 ${isMe ? 'bg-[#3B7AB4] text-white' : 'bg-gray-100 text-gray-800'}`}>
                            <p className={`text-xs font-medium mb-1 ${isMe ? 'text-white/70' : 'text-[#3B7AB4]'}`}>
                              {isMe ? 'Vous' : (msg.sender_name || 'Lighthouse France')}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {msg.attachment_url && (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`text-xs mt-2 block ${isMe ? 'text-white/80 hover:text-white' : 'text-blue-600 hover:underline'}`}>
                                📎 {msg.attachment_name || 'Fichier joint'}
                              </a>
                            )}
                            <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                              {new Date(msg.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <form onSubmit={sendRentalMessage} className="flex gap-2">
                  <input type="text" value={rentalNewMsg} onChange={e => setRentalNewMsg(e.target.value)} placeholder="Écrivez votre message..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7AB4]" />
                  <button type="submit" disabled={!rentalNewMsg.trim() || rentalSending} className="px-6 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50">{rentalSending ? '...' : 'Envoyer'}</button>
                </form>
              </div>
            )}
          </div>
        </div>


        {/* ========== FULL QUOTE MODAL (identical layout to RMA) ========== */}
        {showRentalQuote && hasQuote && (() => {
          const totalRetailValue = qd.totalRetailValue || items.reduce((s, i) => s + (parseFloat(i.retail_value) || 0), 0);
          const shipAddr = rental.shipping_address || null;
          const rentalQDocData = {
            billingAddress: null,
            shippingAddress: shipAddr ? {
              company_name: shipAddr.company_name, attention: shipAddr.attention,
              address_line1: shipAddr.address_line1, city: shipAddr.city,
              postal_code: shipAddr.postal_code, country: shipAddr.country, phone: shipAddr.phone
            } : null,
            submitterName: company.contact_name || null,
            returnShipping: rental.return_shipping || 'standard',
            createdBy: qd.businessSettings?.quote_signatory || 'M. Meleney'
          };
          const rentalBcInfo = rental.bc_submitted_at ? {
            signedBy: rental.bc_signed_by || 'Client',
            signedDate: rental.bc_signature_date || rental.bc_submitted_at,
            signatureUrl: rental.bc_signature_url
          } : null;
          const rentalConditions = [
            "Le matériel reste la propriété de Lighthouse France. La garde est transférée au client dès réception jusqu'à restitution.",
            "Utilisation conforme par personnel qualifié. Sous-location interdite sans accord écrit. Tout incident doit être signalé sous 48h par écrit.",
            "Le client doit souscrire une assurance « Bien Confié » couvrant : vol, incendie, dégâts des eaux, bris accidentel.",
            "Le matériel doit être restitué en bon état à la date convenue. Les dommages ou pièces manquantes seront facturés au coût de remise en état.",
            "Les jours de retard seront facturés au tarif journalier majoré de 50%. Lighthouse France pourra récupérer le matériel à tout moment.",
            "Le non-respect des conditions peut entraîner la résiliation immédiate du contrat de location."
          ];
          const isClientReturn = rental.return_shipping === 'own_label' || rental.return_shipping === 'pickup';
          return (<>
          <QuoteDocumentView
            title="OFFRE DE PRIX" docNumber={rental.rental_number} reference={rental.rental_number} refLabel="Location"
            date={rental.quote_sent_at} company={company} quoteData={rentalQDocData} conditions={rentalConditions}
            addressMode="both"
            onClose={() => setShowRentalQuote(false)}
            showApprove={rental.status === 'quote_sent'}
            onApprove={() => { setShowRentalQuote(false); setShowBCModal(true); }}
            bcData={rentalBcInfo}
            extraFooterLeft={rental.status === 'quote_sent' ? <button onClick={() => setShowRentalRevision(true)} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium">Demander modification</button> : null}
          >
            <div className="px-8 py-3">
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-bold text-[#1a1a2e] mb-2">Location de Matériel</h3>
                <p className="text-sm text-gray-600">- Période : du {formatDateWrittenFR(period.start || rental.start_date)} au {formatDateWrittenFR(period.end || rental.end_date)} ({period.days || rentalDaysDisplay} jours)</p>
                {qd.deliveryTerms && <p className="text-sm text-gray-600">- Délai de livraison : {qd.deliveryTerms}</p>}
                <p className="text-sm text-gray-600">- Assurance « Bien Confié » obligatoire (vol, incendie, dégâts des eaux, bris accidentel)</p>
              </div>
            </div>
            <div className="px-8 py-6 bg-gray-50">
              <h3 className="font-bold text-lg text-[#1a1a2e] mb-4">Récapitulatif des Prix</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a1a2e] text-white">
                    <th className="px-3 py-2.5 text-center w-10">Qté</th>
                    <th className="px-3 py-2.5 text-left">Désignation</th>
                    <th className="px-3 py-2.5 text-right w-20">Tarif</th>
                    <th className="px-3 py-2.5 text-right w-14">Durée</th>
                    <th className="px-3 py-2.5 text-right w-20">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rawName = item.item_name || 'Équipement';
                    const serial = item.serial_number || '';
                    const nameHasSerial = serial && rawName.includes(serial);
                    const displayName = nameHasSerial ? rawName : (serial ? rawName + ' (SN: ' + serial + ')' : rawName);
                    const rateLabel = item.rate_type === 'semaine' ? '/sem' : item.rate_type === 'mois' ? '/mois' : '/jour';
                    const appliedRate = parseFloat(item.applied_rate) || 0;
                    const retailVal = parseFloat(item.retail_value) || 0;
                    return (<Fragment key={idx}>
                      <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={{borderTop: idx > 0 ? '2px solid #e2e8f0' : 'none'}}>
                        <td className="px-3 py-2 text-center font-medium">1</td>
                        <td className="px-3 py-2 font-medium">{displayName}</td>
                        <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{appliedRate > 0 ? appliedRate.toFixed(2) + ' €' + rateLabel : ''}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{item.rental_days || period.days || rentalDaysDisplay}j</td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{(parseFloat(item.line_total) || 0).toFixed(2)} €</td>
                      </tr>
                      {(item.specs || retailVal > 0) && (
                        <tr className="bg-white">
                          <td className="px-3 py-1"></td>
                          <td className="px-3 py-1 border-b border-gray-100" colSpan={2}>
                            {item.specs && <p className="text-xs text-gray-400">{item.specs}</p>}
                            {retailVal > 0 && <p className="text-xs text-gray-400 italic">Valeur neuf (assurance) : {retailVal.toFixed(2)} €</p>}
                          </td>
                          <td className="px-3 py-1 border-b border-gray-100"></td>
                          <td className="px-3 py-1 border-b border-gray-100"></td>
                        </tr>
                      )}
                    </Fragment>);
                  })}
                  {!isClientReturn && (qd.shipping || 0) > 0 && (
                    <tr className="bg-blue-50">
                      <td className="px-3 py-2 text-center">1</td>
                      <td className="px-3 py-2"><span className="font-medium text-blue-800">Frais de port</span></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{parseFloat(qd.shipping).toFixed(2)} €</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{parseFloat(qd.shipping).toFixed(2)} €</td>
                    </tr>
                  )}
                  {(qd.discountAmount || 0) > 0 && (
                    <tr className="bg-amber-50">
                      <td className="px-3 py-2 text-center">1</td>
                      <td className="px-3 py-2 text-red-700">{qd.discountType === 'percent' ? 'Remise (' + qd.discount + '%)' : 'Remise'}</td>
                      <td className="px-3 py-2"></td><td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right font-medium text-red-700 whitespace-nowrap">-{(qd.discountAmount || 0).toFixed(2)} €</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#2D5A7B] text-white">
                    <td colSpan={3} className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-right font-bold text-lg whitespace-nowrap">TOTAL HT</td>
                    <td className="px-3 py-3 text-right font-bold text-xl whitespace-nowrap">{(qd.totalHT || rental.quote_total_ht || 0).toFixed(2)} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {qd.notes && (
              <div className="px-8 py-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-600">{qd.notes}</p>
              </div>
            )}
          </QuoteDocumentView>
          {showRentalRevision && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
              <div className="bg-white rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Demander une modification</h3>
                <p className="text-gray-600 mb-4">Décrivez les modifications que vous souhaitez apporter au devis :</p>
                <textarea value={rentalRevisionNotes} onChange={e => setRentalRevisionNotes(e.target.value)} className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder="Ex: modifier le tarif, changer la durée, retirer les frais de transport, etc." />
                <div className="mt-4 flex justify-end gap-3">
                  <button onClick={() => setShowRentalRevision(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Annuler</button>
                  <button onClick={handleRentalRevision} disabled={rentalProcessing || !rentalRevisionNotes.trim()} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50">
                    {rentalProcessing ? 'Envoi...' : 'Envoyer la demande'}
                  </button>
                </div>
              </div>
            </div>
          )}
          </>); })()}

        {/* ========== BC SUBMISSION MODAL (identical to RMA) ========== */}
        {showBCModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-[#1E3A5F]">Soumettre Bon de Commande</h2>
                  <button onClick={() => setShowBCModal(false)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Reference */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Référence location</p>
                  <p className="font-mono font-bold text-[#1E3A5F]">{rental.rental_number}</p>
                  <p className="text-sm text-gray-500 mt-1">Total: {(qd.totalHT || rental.quote_total_ht || 0).toFixed(2)} € HT</p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Télécharger votre Bon de Commande (optionnel)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#3B7AB4] transition-colors">
                    <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setBcFileUpload(e.target.files?.[0] || null)} className="hidden" id="rental-bc-file" />
                    <label htmlFor="rental-bc-file" className="cursor-pointer">
                      {bcFileUpload ? (
                        <div className="flex items-center justify-center gap-2 text-[#3B7AB4]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="font-medium">{bcFileUpload.name}</span>
                        </div>
                      ) : (
                        <>
                          <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                          <p className="text-sm text-gray-600">Cliquez pour télécharger ou glissez-déposez</p>
                          <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-500">ou</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Electronic Signature */}
                <div className="bg-[#F5F9FC] rounded-lg p-4 border border-[#3B7AB4]/20">
                  <h3 className="font-semibold text-[#1E3A5F] mb-4">Signature électronique</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet du signataire *</label>
                        <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent" placeholder="Prénom et Nom" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="text" value={signatureDateDisplay} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tapez "Lu et approuvé" *</label>
                      <input type="text" value={luEtApprouve} onChange={(e) => setLuEtApprouve(e.target.value)} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent font-medium ${luEtApprouve.toLowerCase().trim() === 'lu et approuvé' ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-300'}`} placeholder="Lu et approuvé" />
                    </div>
                    
                    {/* Signature Pad */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Signature manuscrite *</label>
                        <button type="button" onClick={clearSignature} className="text-xs text-red-600 hover:text-red-700">Effacer</button>
                      </div>
                      <div className={`border-2 rounded-lg bg-white ${signatureData ? 'border-green-500' : 'border-gray-300 border-dashed'}`}>
                        <canvas ref={canvasRef} width={400} height={150} className="w-full cursor-crosshair touch-none" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                      </div>
                      {!signatureData && <p className="text-xs text-gray-500 mt-1">Dessinez votre signature ci-dessus</p>}
                      {signatureData && <p className="text-xs text-green-600 mt-1">✓ Signature enregistrée</p>}
                    </div>
                  </div>
                </div>

                {/* Legal Terms */}
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 w-4 h-4 text-[#3B7AB4] border-gray-300 rounded focus:ring-[#3B7AB4]" />
                    <span className="text-sm text-gray-700">
                      Je soussigné(e), <strong>{signatureName || '[Nom]'}</strong>, 
                      accepte les conditions générales de location de Lighthouse France. Je reconnais que la garde du matériel me sera transférée dès réception et m'engage à souscrire une assurance « Bien Confié », à régler la facture selon les modalités convenues, et à restituer le matériel en bon état à la date convenue.
                      Cette validation électronique a valeur de signature manuscrite conformément aux articles 1366 et 1367 du Code civil français.
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button onClick={() => setShowBCModal(false)} className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button onClick={submitRentalBC} disabled={submittingBC || !isSubmissionValid} className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isSubmissionValid ? 'bg-[#1E3A5F] text-white hover:bg-[#2a4a6f]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  {submittingBC ? 'Envoi en cours...' : 'Valider et soumettre'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main Rentals List
  const actionRequired = rentals.filter(r => r.status === 'quote_sent' || (r.status === 'waiting_bc' && r.bc_rejection_reason));
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">📦 Mes Locations</h1>
        <button onClick={() => setShowNewRental(true)}
          className="px-4 py-2 bg-[#8B5CF6] text-white rounded-lg font-medium hover:bg-[#7C3AED] flex items-center gap-2">
          + Nouvelle Location
        </button>
      </div>

      {/* Action Required Banner */}
      {actionRequired.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 font-bold text-lg">!</span>
            </div>
            <div>
              <p className="font-bold text-red-800">Action requise — {actionRequired.length} location(s)</p>
              <p className="text-sm text-red-600">Devis reçu(s), veuillez soumettre votre bon de commande</p>
            </div>
          </div>
          <div className="space-y-2">
            {actionRequired.map(r => (
              <button key={r.id} onClick={() => setSelectedRental(r)} className="w-full text-left bg-white rounded-lg p-3 border border-red-200 hover:bg-red-50 flex justify-between items-center">
                <div>
                  <span className="font-bold text-red-800">{r.rental_number}</span>
                  <span className="text-sm text-gray-500 ml-3">{r.rental_request_items?.length || 0} équipement(s)</span>
                </div>
                <span className="font-bold text-red-700">{(r.quote_total_ht || 0).toFixed(2)} € HT →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {rentals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-6xl mb-4">📦</p>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Aucune location</h3>
          <p className="text-gray-500 mb-6">Vous n'avez pas encore de demande de location</p>
          <button onClick={() => setShowNewRental(true)}
            className="px-6 py-3 bg-[#8B5CF6] text-white rounded-lg font-bold hover:bg-[#7C3AED]">
            Louer un équipement
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rentals.map(rental => {
            const isAction = rental.status === 'quote_sent';
            return (
              <div key={rental.id} 
                onClick={() => setSelectedRental(rental)}
                className={`bg-white rounded-xl p-6 shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${isAction ? 'border-red-300 bg-red-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-[#1E3A5F]">{rental.rental_number}</h3>
                    <p className="text-sm text-gray-500">
                      Du {new Date(rental.start_date).toLocaleDateString('fr-FR')} au {new Date(rental.end_date).toLocaleDateString('fr-FR')}
                      {' '}({rental.rental_days || Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000 * 60 * 60 * 24)) + 1} jours)
                    </p>
                  </div>
                  {getStatusBadge(rental.status)}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {rental.rental_request_items?.length || 0} équipement(s)
                    {rental.rental_request_items?.slice(0, 2).map((item, i) => (
                      <span key={i} className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">{item.item_name}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    {(rental.quote_total_ht || 0) > 0 && (
                      <span className="text-lg font-bold text-[#8B5CF6]">{parseFloat(rental.quote_total_ht).toFixed(2)} € HT</span>
                    )}
                    <span className="text-gray-400">→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// MY ORDERS PAGE (Unified view of all orders)
// ============================================
// Order card for MyOrdersPage - defined outside to prevent re-mount on parent re-render
const ORDER_TYPE_CONFIG = {
  rma: { badge: '🔧 Étalonnage/Réparation', color: 'border-l-blue-500', bg: 'bg-blue-50' },
  parts: { badge: '📦 Commande de Pièces', color: 'border-l-amber-500', bg: 'bg-amber-50' },
  contract: { badge: '📋 Contrat', color: 'border-l-green-500', bg: 'bg-green-50' },
  rental: { badge: '📅 Location', color: 'border-l-purple-500', bg: 'bg-purple-50' },
};
const isOrderActive = (status) => !['completed', 'invoiced', 'cancelled', 'expired', 'returned'].includes(status);
const getOrderStatusColor = (status) => { const s = STATUS_STYLES[status]; return s ? `${s.bg} ${s.text}` : 'bg-gray-100 text-gray-600'; };
const getOrderStatusLabel = (status) => {
  const extras = { active: 'Actif', expired: 'Expiré', quote: 'Devis', confirmed: 'Confirmée', return_pending: 'Retour en attente', returned: 'Retournée', invoiced: 'Facturée', rma_created: 'RMA créé', quote_approved: 'Devis approuvé', bc_submitted: 'BC soumis', bc_approved: 'BC approuvé' };
  return STATUS_STYLES[status]?.label || extras[status] || status;
};

function OrderCard({ item, onOpen }) {
  const type = item._type;
  const d = item.data;
  const cfg = ORDER_TYPE_CONFIG[type];

  let ref = '', date = '', status = '', summary = '', serials = [], active = false;

  if (type === 'rma' || type === 'parts') {
    ref = d.request_number || 'En attente de numéro';
    date = d.created_at; status = d.status; active = isOrderActive(d.status);
    if (type === 'rma') {
      const devices = d.request_devices || [];
      serials = devices.map(dv => (dv.model_name ? dv.model_name + ' — ' : '') + (dv.serial_number || '')).filter(s => s.length > 0);
      summary = `${devices.length} appareil${devices.length > 1 ? 's' : ''} — ${d.requested_service || 'Service'}`;
    } else {
      summary = d.problem_description?.split('\n')[0]?.slice(0, 80) || 'Commande de pièces';
    }
  } else if (type === 'contract') {
    ref = d.contract_number || 'Contrat en cours de création';
    date = d.created_at; status = d.status;
    active = !['expired', 'cancelled', 'completed'].includes(d.status);
    const devices = d.contract_devices || [];
    serials = devices.map(dv => (dv.model_name ? dv.model_name + ' — ' : '') + (dv.serial_number || '')).filter(s => s.length > 0);
    summary = `${devices.length} appareil${devices.length > 1 ? 's' : ''} — ${d.contract_type === 'token' ? 'Jetons' : 'Tarification'}`;
  } else if (type === 'rental') {
    ref = d.rental_number || 'Location en cours de création';
    date = d.created_at; status = d.status;
    active = !['returned', 'cancelled', 'completed'].includes(d.status);
    const items2 = d.rental_request_items || [];
    serials = items2.map(ri => ri.equipment_name || ri.serial_number).filter(Boolean);
    summary = `${items2.length} appareil${items2.length > 1 ? 's' : ''}`;
  }

  const displaySerials = serials.slice(0, 2);
  const extraCount = serials.length - 2;

  return (
    <button onClick={() => onOpen(type, d)} className={`w-full bg-white rounded-xl shadow-sm border-l-4 ${cfg.color} p-5 hover:shadow-md transition-all text-left group`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg}`}>{cfg.badge}</span>
            {active && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-bold text-[#1E3A5F] text-lg">{ref}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getOrderStatusColor(status)}`}>
              {getOrderStatusLabel(status)}
            </span>
          </div>
          <p className="text-gray-600 text-sm truncate">{summary}</p>
          {displaySerials.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {displaySerials.map((s, i) => (
                <span key={i} className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{s}</span>
              ))}
              {extraCount > 0 && <span className="text-xs text-gray-400 font-medium">+{extraCount} autre{extraCount > 1 ? 's' : ''}</span>}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400">{date ? new Date(date).toLocaleDateString('fr-FR') : '—'}</p>
          <span className="text-gray-300 group-hover:text-[#3B7AB4] transition-colors text-xl mt-2 block">→</span>
        </div>
      </div>
    </button>
  );
}

function MyOrdersPage({ profile, requests, contracts, t, lang, setPage, setSelectedRequest, setPreviousPage, setPendingRentalId, setPendingContractId, perms }) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rentals, setRentals] = useState([]);
  const [loadingRentals, setLoadingRentals] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const [historyCount, setHistoryCount] = useState(5);

  // Fetch rentals
  useEffect(() => {
    const fetchRentals = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from('rental_requests')
        .select('*, rental_request_items(*), companies(*)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      if (data) setRentals(data);
      setLoadingRentals(false);
    };
    fetchRentals();
  }, [profile?.company_id]);

  // Reset pagination when filter/search changes
  useEffect(() => { setVisibleCount(5); setHistoryCount(5); }, [filter, searchQuery]);

  // Navigate
  const openRMA = (request) => { setSelectedRequest(request); setPreviousPage('my-orders'); setPage('request-detail'); };
  const openContract = (contract) => { setPendingContractId(contract.id); setPage('contracts'); };
  const openRental = (rental) => { setPendingRentalId(rental.id); setPage('rentals'); };

  const handleOpen = useCallback((type, data) => {
    if (type === 'rma' || type === 'parts') openRMA(data);
    else if (type === 'contract') openContract(data);
    else openRental(data);
  }, []);

  // Memoize unified list - only rebuild when data/filter/search changes, NOT on pagination
  const allItems = useMemo(() => {
    const q = searchQuery?.toLowerCase() || '';
    const matchSearch = (item, type) => {
      if (!q) return true;
      if (type === 'rma' || type === 'parts') {
        return (item.request_number || '').toLowerCase().includes(q) || 
               (item.problem_description || '').toLowerCase().includes(q) ||
               (item.requested_service || '').toLowerCase().includes(q) ||
               item.request_devices?.some(d => (d.serial_number || '').toLowerCase().includes(q) || (d.model_name || '').toLowerCase().includes(q));
      }
      if (type === 'contract') {
        return (item.contract_number || '').toLowerCase().includes(q) ||
               item.contract_devices?.some(d => (d.serial_number || '').toLowerCase().includes(q) || (d.model_name || '').toLowerCase().includes(q));
      }
      if (type === 'rental') {
        return (item.rental_number || '').toLowerCase().includes(q) ||
               item.rental_request_items?.some(ri => (ri.equipment_name || '').toLowerCase().includes(q));
      }
      return true;
    };
    const items = [];
    const rmas = (requests || []).filter(r => r.request_type !== 'parts');
    const partsOrders = (requests || []).filter(r => r.request_type === 'parts');

    if (filter === 'all' || filter === 'rma') {
      rmas.forEach(r => { if (matchSearch(r, 'rma')) items.push({ data: r, _type: 'rma', _date: r.created_at, _key: `rma-${r.id}`, id: r.id, status: r.status }); });
    }
    if (filter === 'all' || filter === 'parts') {
      partsOrders.forEach(r => { if (matchSearch(r, 'parts')) items.push({ data: r, _type: 'parts', _date: r.created_at, _key: `parts-${r.id}`, id: r.id, status: r.status }); });
    }
    if (filter === 'all' || filter === 'contracts') {
      (contracts || []).forEach(c => { if (matchSearch(c, 'contract')) items.push({ data: c, _type: 'contract', _date: c.created_at, _key: `contract-${c.id}`, id: c.id, status: c.status }); });
    }
    if (filter === 'all' || filter === 'rentals') {
      rentals.forEach(r => { if (matchSearch(r, 'rental')) items.push({ data: r, _type: 'rental', _date: r.created_at, _key: `rental-${r.id}`, id: r.id, status: r.status }); });
    }

    items.sort((a, b) => new Date(b._date || 0) - new Date(a._date || 0));
    return items;
  }, [requests, contracts, rentals, filter, searchQuery]);

  const activeItems = useMemo(() => allItems.filter(i => isOrderActive(i.status)), [allItems]);
  const completedItems = useMemo(() => allItems.filter(i => !isOrderActive(i.status)), [allItems]);

  // Filter chip counts
  const rmaCount = (requests || []).filter(r => r.request_type !== 'parts').length;
  const partsCount = (requests || []).filter(r => r.request_type === 'parts').length;
  const contractCount = (contracts || []).length;
  const rentalCount = rentals.length;
  const filters = [
    { id: 'all', label: 'Tout', icon: '📊', count: rmaCount + partsCount + contractCount + rentalCount },
    { id: 'rma', label: 'Étalonnage / Réparation', icon: '🔧', count: rmaCount },
    { id: 'parts', label: 'Commandes de Pièces', icon: '📦', count: partsCount },
    { id: 'contracts', label: 'Contrats', icon: '📋', count: contractCount },
    { id: 'rentals', label: 'Locations', icon: '📅', count: rentalCount },
  ];

  const visibleActive = activeItems.slice(0, visibleCount);
  const hasMoreActive = activeItems.length > visibleCount;
  const remainingActive = activeItems.length - visibleCount;

  const visibleCompleted = completedItems.slice(0, historyCount);
  const hasMoreCompleted = completedItems.length > historyCount;
  const remainingCompleted = completedItems.length - historyCount;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">{lang === 'en' ? 'My Orders' : 'Mes Commandes'}</h1>
          <p className="text-gray-500 text-sm mt-1">{lang === 'en' ? 'All your requests, contracts, and rentals in one place' : 'Toutes vos demandes, contrats et locations en un seul endroit'}</p>
        </div>
        {perms?.canRequest && (
          <button onClick={() => setPage('new-request')} className="px-5 py-2.5 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008C44] shadow-sm">
            + {lang === 'en' ? 'New Request' : 'Nouvelle demande'}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={lang === 'en' ? 'Search by reference, serial number, model...' : 'Rechercher par référence, n° série, modèle...'}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.id 
                ? 'bg-[#1E3A5F] text-white shadow-md' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f.id ? 'bg-white/20' : 'bg-gray-100'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loadingRentals ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B7AB4] mx-auto mb-4" />
          <p className="text-gray-400">{lang === 'en' ? 'Loading...' : 'Chargement...'}</p>
        </div>
      ) : allItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-400 mb-2">{searchQuery ? 'Aucun résultat' : (lang === 'en' ? 'No orders yet' : 'Aucune commande')}</h3>
          <p className="text-gray-400 mb-6">{searchQuery ? 'Essayez avec d\'autres termes de recherche' : (lang === 'en' ? 'Submit your first request to get started' : 'Soumettez votre première demande pour commencer')}</p>
          {!searchQuery && perms?.canRequest && (
            <button onClick={() => setPage('new-request')} className="px-6 py-3 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008C44]">
              + {lang === 'en' ? 'New Request' : 'Nouvelle demande'}
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Active orders - sorted by date */}
          {activeItems.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg">📌</span>
                <h2 className="text-lg font-bold text-[#1E3A5F]">En cours</h2>
                <span className="text-sm text-gray-400">({activeItems.length})</span>
              </div>
              <div className="space-y-3">
                {visibleActive.map(item => <OrderCard key={item._key} item={item} onOpen={handleOpen} />)}
                {hasMoreActive && (
                  <button
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="w-full py-3 text-sm font-medium text-[#3B7AB4] bg-white border border-gray-200 rounded-xl hover:bg-[#E8F2F8] transition-colors"
                  >
                    Afficher 5 de plus ({remainingActive} restant{remainingActive > 1 ? 's' : ''})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Completed / History */}
          {completedItems.length > 0 && (
            <details className="group mb-8">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-2 font-medium">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Historique ({completedItems.length})
              </summary>
              <div className="space-y-3 opacity-75">
                {visibleCompleted.map(item => <OrderCard key={item._key} item={item} onOpen={handleOpen} />)}
                {hasMoreCompleted && (
                  <button
                    onClick={() => setHistoryCount(prev => prev + 5)}
                    className="w-full py-3 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Afficher 5 de plus ({remainingCompleted} restant{remainingCompleted > 1 ? 's' : ''})
                  </button>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// INVOICES PAGE
// ============================================
function InvoicesPage({ profile, t, lang, notify, setUnseenInvoiceCount }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [seenIds, setSeenIds] = useState([]);
  const [showModificationModal, setShowModificationModal] = useState(null);
  const [modificationMessage, setModificationMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Load seen IDs from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('lhf_seen_invoices') || '[]');
      setSeenIds(stored);
    } catch { setSeenIds([]); }
  }, []);

  // Fetch only sent invoices (visible to customer)
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!profile?.company_id) return;
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('status', 'sent')
        .order('created_at', { ascending: false });
      if (data) setInvoices(data);
      if (error) console.log('Invoices fetch error:', error.message);
      setLoading(false);
    };
    fetchInvoices();
  }, [profile?.company_id]);

  // Mark invoice as seen
  const markSeen = (invoiceId) => {
    if (seenIds.includes(invoiceId)) return;
    const updated = [...seenIds, invoiceId];
    setSeenIds(updated);
    try { localStorage.setItem('lhf_seen_invoices', JSON.stringify(updated)); } catch {}
    // Update nav badge
    const remaining = invoices.filter(i => !updated.includes(i.id)).length;
    if (setUnseenInvoiceCount) setUnseenInvoiceCount(remaining);
  };

  // Mark all as seen when page loads
  useEffect(() => {
    if (!loading && invoices.length > 0) {
      const allIds = invoices.map(i => i.id);
      const newSeen = [...new Set([...seenIds, ...allIds])];
      setSeenIds(newSeen);
      try { localStorage.setItem('lhf_seen_invoices', JSON.stringify(newSeen)); } catch {}
      if (setUnseenInvoiceCount) setUnseenInvoiceCount(0);
    }
  }, [loading, invoices.length]);

  const isNew = (invoiceId) => !seenIds.includes(invoiceId);

  // Request modification
  const sendModificationRequest = async () => {
    if (!modificationMessage.trim() || !showModificationModal) return;
    setSending(true);
    try {
      // Send as a message on the linked service request, or create a notification
      const inv = showModificationModal;
      await supabase.from('messages').insert({
        service_request_id: inv.service_request_id || null,
        sender_id: profile.id,
        sender_type: 'customer',
        content: `[Demande de modification - Facture ${inv.invoice_number}]\n\n${modificationMessage}`,
      });
      notify('Demande de modification envoyée');
      setShowModificationModal(null);
      setModificationMessage('');
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSending(false);
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (inv.invoice_number || '').toLowerCase().includes(q) ||
           (inv.description || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">{lang === 'en' ? 'Invoices' : 'Factures'}</h1>
          <p className="text-gray-500 text-sm mt-1">{lang === 'en' ? 'View your invoices and download PDFs' : 'Consultez vos factures et téléchargez les PDF'}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={lang === 'en' ? 'Search invoices...' : 'Rechercher une facture...'}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent"
          />
        </div>
      </div>

      {/* Invoice list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B7AB4] mx-auto mb-4" />
          <p className="text-gray-400">{lang === 'en' ? 'Loading...' : 'Chargement...'}</p>
        </div>
      ) : filteredInvoices.length > 0 ? (
        <div className="space-y-4">
          {filteredInvoices.map(inv => {
            const unseen = isNew(inv.id);
            return (
              <div 
                key={inv.id} 
                className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all ${
                  unseen 
                    ? 'border-[#00A651] bg-green-50/30 ring-2 ring-[#00A651]/20' 
                    : 'border-gray-100'
                }`}
                onClick={() => markSeen(inv.id)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Invoice info */}
                  <div className="flex items-start gap-4">
                    {unseen && (
                      <div className="flex-shrink-0 mt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00A651] text-white text-xs font-bold rounded-full animate-pulse">
                          ✨ NOUVEAU
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-[#1E3A5F]">{inv.invoice_number || '—'}</h3>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                        {inv.description && <span className="ml-2 text-gray-400">— {inv.description}</span>}
                      </p>
                      {inv.due_date && (
                        <p className="text-xs text-gray-400">
                          Échéance : {new Date(inv.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount + Actions */}
                  <div className="flex items-center gap-4 md:gap-6">
                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#1E3A5F]">
                        {(inv.total_amount || inv.amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </p>
                      {inv.amount > 0 && inv.tax_amount > 0 && (
                        <p className="text-xs text-gray-400">
                          HT: {inv.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € | TVA: {inv.tax_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {inv.pdf_url ? (
                        <a 
                          href={inv.pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => { e.stopPropagation(); markSeen(inv.id); }}
                          className="px-4 py-2.5 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#2C5282] transition-colors flex items-center gap-2 text-sm"
                        >
                          📄 PDF
                        </a>
                      ) : (
                        <span className="px-4 py-2.5 bg-gray-100 text-gray-400 rounded-lg text-sm">PDF non disponible</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); markSeen(inv.id); setShowModificationModal(inv); }}
                        className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                      >
                        ✏️ Modifier
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🧾</div>
          <h3 className="text-xl font-bold text-gray-400 mb-2">{lang === 'en' ? 'No invoices' : 'Aucune facture'}</h3>
          <p className="text-gray-400">{lang === 'en' ? 'Your invoices will appear here once sent' : 'Vos factures apparaîtront ici une fois envoyées'}</p>
        </div>
      )}

      {/* Modification Request Modal */}
      {showModificationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModificationModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1E3A5F] mb-2">
              Demande de modification
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Facture : <strong>{showModificationModal.invoice_number}</strong> — {(showModificationModal.total_amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </p>
            <textarea
              value={modificationMessage}
              onChange={e => setModificationMessage(e.target.value)}
              placeholder="Décrivez la modification souhaitée (ex: erreur d'adresse, montant incorrect, TVA...)"
              className="w-full h-32 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowModificationModal(null); setModificationMessage(''); }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={sendModificationRequest}
                disabled={!modificationMessage.trim() || sending}
                className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F] disabled:opacity-50"
              >
                {sending ? 'Envoi...' : 'Envoyer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HOME PAGE (Public Landing)
// ============================================
function HomePage({ t, setPage, setShowLegalPage }) {
  return (
    <div className="min-h-screen">
      {/* Fixed Background - stays in place while content scrolls */}
      <div className="fixed inset-0 z-0">
        <img 
          src="/images/products/hero-background.png" 
          alt="" 
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/90 via-[#1a1a2e]/80 to-[#1a1a2e]/70"></div>
        {/* Subtle color overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00A651]/5 via-transparent to-[#3B7AB4]/5"></div>
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#1a1a2e]/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img 
                  src="/images/logos/lighthouse-logo.png" 
                  alt="Lighthouse France" 
                  className="h-10 w-auto invert brightness-0 invert"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="items-center gap-2 text-white hidden">
                  <span className="font-bold text-2xl tracking-tight">LIGHTHOUSE</span>
                  <span className="font-semibold text-lg text-[#00A651]">FRANCE</span>
                </div>
              </div>
              <div></div>
            </div>
          </div>
        </header>
        
        {/* Hero Section */}
        <div className="min-h-[90vh] flex items-center">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left: Text Content */}
              <div className="text-white">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/10">
                  <span className="w-2 h-2 bg-[#00A651] rounded-full animate-pulse"></span>
                  <span className="text-sm font-medium">Portail Service Lighthouse France</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Portail de<br/>
                  <span className="text-[#00A651]">Service</span> & Pieces
                </h1>
                <p className="text-lg md:text-xl text-white/70 mb-8 max-w-lg leading-relaxed">
                  Gérez vos demandes de calibration et réparation d'équipements de mesure de contamination en temps réel.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => setPage('register')} className="px-8 py-4 bg-[#00A651] text-white rounded-xl font-bold text-lg hover:bg-[#008f45] transition-all hover:scale-105 shadow-lg shadow-[#00A651]/25">
                    Creer un compte
                  </button>
                  <button onClick={() => setPage('login')} className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all">
                    Se connecter
                  </button>
                </div>
                
                {/* Trust indicators */}
                <div className="flex flex-wrap items-center gap-6 mt-10 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00A651]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/70 text-sm">Certifie ISO 9001</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00A651]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/70 text-sm">40+ ans d'expertise</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00A651]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/70 text-sm">Support mondial</span>
                  </div>
                </div>
              </div>
              
              {/* Right: Equipment Showcase */}
              <div className="relative hidden lg:block">
                <div className="bg-white/5 backdrop-blur-md rounded-3xl p-5 border border-white/10">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Airborne Particle Counter */}
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 text-center hover:scale-105 transition-all duration-300 hover:from-white/15 hover:to-white/10 border border-white/10 group cursor-pointer">
                      <div className="w-full h-36 mb-3 flex items-center justify-center rounded-xl">
                        <img 
                          src="/images/products/particle-counter.png" 
                          alt="Airborne Particle Counter" 
                          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <p className="text-white font-bold text-sm">Compteurs de Particules</p>
                      <p className="text-white/60 text-xs">Aéroportées</p>
                    </div>
                    
                    {/* Bio Collector */}
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 text-center hover:scale-105 transition-all duration-300 hover:from-white/15 hover:to-white/10 border border-white/10 group cursor-pointer">
                      <div className="w-full h-36 mb-3 flex items-center justify-center rounded-xl">
                        <img 
                          src="/images/products/bio-collector.png" 
                          alt="Bio Collector" 
                          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <p className="text-white font-bold text-sm">Bio Collecteurs</p>
                      <p className="text-white/60 text-xs">Echantillonneurs Microbiens</p>
                    </div>
                    
                    {/* Liquid Particle Counter */}
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 text-center hover:scale-105 transition-all duration-300 hover:from-white/15 hover:to-white/10 border border-white/10 group cursor-pointer">
                      <div className="w-full h-36 mb-3 flex items-center justify-center rounded-xl">
                        <img 
                          src="/images/products/liquid-counter.png" 
                          alt="Liquid Particle Counter" 
                          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <p className="text-white font-bold text-sm">Compteurs de Particules</p>
                      <p className="text-white/60 text-xs">Liquides</p>
                    </div>
                    
                    {/* Température & Humidity Probe */}
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 text-center hover:scale-105 transition-all duration-300 hover:from-white/15 hover:to-white/10 border border-white/10 group cursor-pointer">
                      <div className="w-full h-36 mb-3 flex items-center justify-center rounded-xl">
                        <img 
                          src="/images/products/temp-probe.png" 
                          alt="Température & Humidity Probe" 
                          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <p className="text-white font-bold text-sm">Sondes Température</p>
                      <p className="text-white/60 text-xs">& Humidité</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <span className="text-white/50 text-sm">+ Systemes de monitoring, capteurs de pression, et plus...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="flex justify-center pb-8">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1.5 h-3 bg-white/50 rounded-full mt-2 animate-bounce"></div>
          </div>
        </div>

        {/* How It Works - Glassmorphism */}
        <div className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-10 border border-white/20">
              <div className="text-center mb-12">
                <span className="text-[#00A651] font-semibold text-sm uppercase tracking-wider">Processus simple</span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">Comment ca marche</h2>
              </div>
              <div className="grid md:grid-cols-4 gap-8 relative">
                {/* Connection lines - positioned between each circle */}
                <div className="hidden md:block absolute top-10 h-0.5 bg-gradient-to-r from-[#00A651] to-[#3B7AB4]" style={{ left: 'calc(12.5% + 40px)', width: 'calc(25% - 80px)' }}></div>
                <div className="hidden md:block absolute top-10 h-0.5 bg-[#3B7AB4]" style={{ left: 'calc(37.5% + 40px)', width: 'calc(25% - 80px)' }}></div>
                <div className="hidden md:block absolute top-10 h-0.5 bg-gradient-to-r from-[#3B7AB4] to-[#00A651]" style={{ left: 'calc(62.5% + 40px)', width: 'calc(25% - 80px)' }}></div>
                
                {[
                  { num: '1', title: 'Creer un compte', desc: 'Enregistrez votre societe et vos coordonnees en quelques minutes' },
                  { num: '2', title: 'Soumettre une demande', desc: 'Détaillez vos équipements et besoins de service' },
                  { num: '3', title: 'Recevoir le devis', desc: 'Obtenez votre devis et numero RMA rapidement' },
                  { num: '4', title: 'Suivre le progres', desc: 'Surveillez l\'etat de vos demandes en temps reel' }
                ].map((step, i) => (
                  <div key={i} className="text-center relative z-10 group">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-sm border-4 border-[#00A651] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform group-hover:bg-[#00A651]/20">
                      <span className="text-2xl font-bold text-[#00A651]">{step.num}</span>
                    </div>
                    <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Services Section - Glassmorphism */}
        <div className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-10 border border-white/20">
              <div className="text-center mb-12">
                <span className="text-[#00A651] font-semibold text-sm uppercase tracking-wider">Nos expertises</span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">Services proposes</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { 
                    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
                    icon2: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
                    title: 'Réparation', 
                    desc: 'Réparation experte de compteurs de particules, échantillonneurs microbiens et équipements de monitoring environnemental.'
                  },
                  { 
                    icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
                    title: 'Étalonnage', 
                    desc: 'Calibration selon ISO 21501-4 avec certificats traceables pour garantir precision et conformite reglementaire.'
                  },
                  { 
                    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                    title: 'Maintenance', 
                    desc: 'Programmes de maintenance préventive pour optimiser la durée de vie et les performances de vos équipements.'
                  }
                ].map((svc, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 bg-[#00A651]/20 group-hover:bg-[#00A651]/30 transition-colors">
                      <svg className="w-7 h-7 text-[#00A651]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={svc.icon} />
                        {svc.icon2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={svc.icon2} />}
                      </svg>
                    </div>
                    <h3 className="font-bold text-white text-xl mb-3">{svc.title}</h3>
                    <p className="text-white/60 leading-relaxed text-sm">{svc.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section - Glassmorphism */}
        <div className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-[#00A651]/20 to-[#3B7AB4]/20 backdrop-blur-lg rounded-3xl p-12 border border-white/20 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Pret a demarrer ?
              </h2>
              <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
                Rejoignez les entreprises qui font confiance à Lighthouse France pour la maintenance de leurs équipements critiques.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <button onClick={() => setPage('register')} className="px-8 py-4 bg-[#00A651] text-white rounded-xl font-bold text-lg hover:bg-[#008f45] transition-all hover:scale-105 shadow-lg shadow-[#00A651]/25">
                  Creer mon compte gratuitement
                </button>
                <button onClick={() => setPage('login')} className="px-8 py-4 bg-white/10 border border-white/30 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all">
                  J'ai deja un compte
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#0a0a12]/80 backdrop-blur-lg text-white py-12 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div>
                <h4 className="font-bold text-lg mb-4">LIGHTHOUSE FRANCE</h4>
                <p className="text-white/60 text-sm leading-relaxed">
                  Filiale francaise de Lighthouse Worldwide Solutions, leader mondial des solutions de monitoring de contamination.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-4">Contact</h4>
                <p className="text-white/60 text-sm">16 Rue Paul Sejourne</p>
                <p className="text-white/60 text-sm">94000 Creteil, France</p>
                <p className="text-white/60 text-sm mt-2">Tel: +33 (1) 43 77 28 07</p>
                <p className="text-white/60 text-sm">France@golighthouse.com</p>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-4">Liens rapides</h4>
                <div className="space-y-2">
                  <button onClick={() => setPage('login')} className="block text-white/60 text-sm hover:text-[#00A651] transition-colors">Connexion</button>
                  <button onClick={() => setPage('register')} className="block text-white/60 text-sm hover:text-[#00A651] transition-colors">Creer un compte</button>
                  <a href="https://golighthouse.fr" target="_blank" rel="noopener noreferrer" className="block text-white/60 text-sm hover:text-[#00A651] transition-colors">Lighthouse France</a>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 pt-8 text-center">
              <p className="text-white/40 text-sm">© 2025 Lighthouse France SAS. Tous droits reserves.</p>
              {setShowLegalPage && (
                <div className="mt-2 flex justify-center gap-4">
                  <button onClick={() => setShowLegalPage('mentions')} className="text-white/30 text-xs hover:text-white/60">Mentions légales</button>
                  <span className="text-white/20">|</span>
                  <button onClick={() => setShowLegalPage('privacy')} className="text-white/30 text-xs hover:text-white/60">Politique de confidentialité</button>
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ============================================
// LOGIN PAGE
// ============================================
function LoginPage({ t, login, setPage }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    if (result) setError(result);
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) { setError('Veuillez entrer votre adresse email'); return; }
    setResetLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/customer#reset'
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi');
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <img 
          src="/images/products/hero-background.png" 
          alt="" 
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/90 via-[#1a1a2e]/85 to-[#1a1a2e]/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-[#1a1a2e]/50 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex justify-between items-center h-16">
              <button onClick={() => setPage('home')} className="flex items-center gap-3">
                <img 
                  src="/images/logos/lighthouse-logo.png" 
                  alt="Lighthouse France" 
                  className="h-10 w-auto invert brightness-0 invert"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="items-center gap-2 hidden text-white">
                  <span className="font-bold text-2xl tracking-tight">LIGHTHOUSE</span>
                  <span className="font-semibold text-sm text-[#00A651]">FRANCE</span>
                </div>
              </button>
              <button onClick={() => setPage('home')} className="text-white/70 hover:text-white font-medium transition-colors">
                ← Retour
              </button>
            </div>
          </div>
        </header>

        {/* Login Form */}
        <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
              <div className="px-6 py-8 text-center border-b border-white/10">
                <img 
                  src="/images/logos/lighthouse-logo.png" 
                  alt="Lighthouse France" 
                  className="h-14 w-auto mx-auto mb-3 invert brightness-0 invert"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <h1 className="text-2xl font-bold text-white hidden">LIGHTHOUSE FRANCE</h1>
                <p className="text-white/60 mt-2">Portail de Service</p>
              </div>
              
              <form onSubmit={resetMode ? handleResetPassword : handleSubmit} className="p-6 space-y-4">
                {resetMode ? (
                  <>
                    {resetSent ? (
                      <div className="text-center py-4">
                        <p className="text-4xl mb-3">📧</p>
                        <p className="text-white font-bold text-lg mb-2">Email envoyé !</p>
                        <p className="text-white/60 text-sm">Si un compte existe avec l'adresse <strong className="text-white">{email}</strong>, vous recevrez un lien de réinitialisation.</p>
                        <button type="button" onClick={() => { setResetMode(false); setResetSent(false); setError(''); }} className="mt-4 text-[#00A651] font-semibold hover:text-[#00c564]">
                          ← Retour à la connexion
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-center mb-2">
                          <p className="text-white font-bold text-lg">Mot de passe oublié ?</p>
                          <p className="text-white/60 text-sm">Entrez votre email pour recevoir un lien de réinitialisation</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                            placeholder="votre@email.com"
                            required
                          />
                        </div>
                        {error && (
                          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
                        )}
                        <button type="submit" disabled={resetLoading} className="w-full py-3 bg-[#00A651] text-white rounded-lg font-semibold hover:bg-[#008f45] transition-colors disabled:opacity-50">
                          {resetLoading ? 'Envoi...' : 'Envoyer le lien'}
                        </button>
                        <div className="text-center">
                          <button type="button" onClick={() => { setResetMode(false); setError(''); }} className="text-white/60 hover:text-white text-sm">
                            ← Retour à la connexion
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-white/80">Mot de passe</label>
                    <button type="button" onClick={() => { setResetMode(true); setError(''); }} className="text-xs text-[#00A651] hover:text-[#00c564] font-medium">
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#00A651] text-white rounded-lg font-semibold hover:bg-[#008f45] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
                  </>
                )}
              </form>
              
              <div className="px-6 pb-6 text-center">
                <p className="text-white/60">
                  Pas de compte?{' '}
                  <button onClick={() => setPage('register')} className="text-[#00A651] font-semibold hover:text-[#00c564]">
                    Créer un compte
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ============================================
// ACCOUNT SETUP PAGE (for invited users)
// ============================================
function AccountSetupPage({ profile, notify, onComplete }) {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setSaving(true);
    await onComplete(fullName.trim(), password);
    setSaving(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
        <div className="px-6 py-8 text-center border-b border-white/10">
          <div className="w-16 h-16 bg-[#00A651]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Bienvenue chez Lighthouse France</h1>
          <p className="text-white/60 text-sm mt-2">
            Votre email a été vérifié. Finalisez votre compte ci-dessous.
          </p>
          <p className="text-white/40 text-xs mt-1">{profile?.email}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Votre nom complet *</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jean Dupont"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Créer un mot de passe *</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
              required
            />
            <p className="text-white/30 text-xs mt-1">Majuscule + chiffre + caractère spécial requis</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Confirmer le mot de passe *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Retapez le mot de passe"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008C44] transition-colors disabled:opacity-50 text-lg"
          >
            {saving ? 'Activation...' : '✓ Activer mon compte'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// REGISTER PAGE
// ============================================
function RegisterPage({ t, register, setPage, notify }) {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('invite') || '';
  const inviteEmail = urlParams.get('email') || '';

  const [formData, setFormData] = useState({
    email: inviteEmail, password: '', confirmPassword: '',
    companyName: '', contactName: '', phone: '',
    address: '', city: '', postalCode: '', country: 'France',
    siret: '', vatNumber: '', inviteToken: inviteToken,
    chorusInvoicing: false, chorusServiceCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteMode] = useState(!!inviteToken);
  const [gdprConsent, setGdprConsent] = useState(false);

  const updateField = (field, value) => setFormData({ ...formData, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!gdprConsent) {
      setError('Veuillez accepter la politique de confidentialité pour continuer');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial');
      return;
    }
    
    setLoading(true);
    setError('');
    const result = await register(formData);
    if (result) setError(result);
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 z-0">
        <img src="/images/products/hero-background.png" alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/90 via-[#1a1a2e]/85 to-[#1a1a2e]/80"></div>
      </div>
      <div className="relative z-10">
        <header className="bg-[#1a1a2e]/50 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex justify-between items-center h-16">
              <button onClick={() => setPage('home')} className="flex items-center gap-3">
                <img src="/images/logos/lighthouse-logo.png" alt="Lighthouse France" className="h-10 w-auto invert brightness-0 invert" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <div className="items-center gap-2 hidden text-white">
                  <span className="font-bold text-2xl tracking-tight">LIGHTHOUSE</span>
                  <span className="font-semibold text-sm text-[#00A651]">FRANCE</span>
                </div>
              </button>
              <button onClick={() => setPage('home')} className="text-white/70 hover:text-white font-medium transition-colors">← Retour</button>
            </div>
          </div>
        </header>
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
              <div className="bg-[#00A651]/20 backdrop-blur-sm px-6 py-6 border-b border-white/10">
                <h1 className="text-xl font-bold text-white">{inviteMode ? 'Rejoindre une équipe' : 'Créer un compte'}</h1>
                <p className="text-white/60 text-sm mt-1">{inviteMode ? "Vous avez été invité à rejoindre une équipe existante" : 'Enregistrez votre société pour accéder au portail'}</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Company/Address/ID Sections - hide for invite mode */}
                {!inviteMode && (<>
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/20">Information Société</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/80 mb-1">Nom de la société *</label>
                      <input type="text" value={formData.companyName} onChange={(e) => updateField('companyName', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" required={!inviteMode} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Nom du contact *</label>
                      <input type="text" value={formData.contactName} onChange={(e) => updateField('contactName', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Téléphone *</label>
                      <input type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder="+33 1 23 45 67 89" required />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/20">Adresse</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/80 mb-1">Adresse *</label>
                      <input type="text" value={formData.address} onChange={(e) => updateField('address', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder="16 Rue de la République" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Code Postal *</label>
                      <input type="text" value={formData.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder="75001" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Ville *</label>
                      <input type="text" value={formData.city} onChange={(e) => updateField('city', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder="Paris" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Pays *</label>
                      <input type="text" value={formData.country} onChange={(e) => updateField('country', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder="France" required />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/20">Identification Société</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        {(formData.country || 'France').toLowerCase() === 'france' ? 'N° SIRET' : 'Company Registration Number'}
                      </label>
                      <input type="text" value={formData.siret} onChange={(e) => updateField('siret', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder={(formData.country || 'France').toLowerCase() === 'france' ? 'XXX XXX XXX XXXXX' : 'Optional'} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        {(formData.country || 'France').toLowerCase() === 'france' ? 'N° TVA Intracommunautaire' : 'VAT Number'}
                      </label>
                      <input type="text" value={formData.vatNumber} onChange={(e) => updateField('vatNumber', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder={(formData.country || 'France').toLowerCase() === 'france' ? 'FR XX XXXXXXXXX' : 'e.g. DE123456789'} />
                    </div>
                  </div>
                  <p className="text-white/40 text-xs mt-2">
                    {(formData.country || 'France').toLowerCase() === 'france' 
                      ? 'Ces informations seront utilisées pour la facturation.' 
                      : 'These details will be used for invoicing. Leave blank if not applicable.'}
                  </p>
                  
                  {/* Chorus Pro */}
                  {(formData.country || 'France').toLowerCase() === 'france' && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white/80">Facturation via Chorus Pro</span>
                          <div className="relative group">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-white/60 text-xs cursor-help font-bold">?</span>
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 p-3 bg-white text-gray-800 text-xs rounded-lg shadow-lg invisible group-hover:visible z-50">
                              <p className="font-bold mb-1">Chorus Pro</p>
                              <p>Chorus Pro est la plateforme de facturation électronique obligatoire pour les entités du secteur public en France (État, collectivités territoriales, hôpitaux, universités, établissements publics, etc.).</p>
                              <p className="mt-1">Si votre organisation utilise Chorus Pro pour recevoir ses factures, activez cette option. Vous devrez fournir votre numéro SIRET et votre code service Chorus.</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateField('chorusInvoicing', !formData.chorusInvoicing)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${formData.chorusInvoicing ? 'bg-[#00A651]' : 'bg-white/20'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.chorusInvoicing ? 'translate-x-6' : ''}`} />
                        </button>
                      </div>
                      {formData.chorusInvoicing && (
                        <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-400/20 space-y-3">
                          <p className="text-xs text-blue-300">Veuillez renseigner votre numéro de service Chorus Pro.</p>
                          <div>
                            <label className="block text-sm font-medium text-white/80 mb-1">N° Service Chorus Pro *</label>
                            <input type="text" value={formData.chorusServiceCode || ''} onChange={(e) => updateField('chorusServiceCode', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder="Ex: SERVICE-12345" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </>)}

                {/* Contact info for invite mode */}
                {inviteMode && (
                  <div>
                    <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/20">Vos informations</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Votre nom complet *</label>
                        <input type="text" value={formData.contactName} onChange={(e) => updateField('contactName', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Téléphone</label>
                        <input type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder="+33 1 23 45 67 89" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Section */}
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/20">Identifiants</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/80 mb-1">Email *</label>
                      <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} className={`w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent ${inviteMode ? 'opacity-70' : ''}`} required readOnly={inviteMode} />
                      {inviteMode && <p className="text-xs text-white/40 mt-1">{"L'email doit correspondre à celui de l'invitation"}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Mot de passe *</label>
                      <input type="password" value={formData.password} onChange={(e) => updateField('password', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder="Min. 8 car., 1 majuscule, 1 chiffre, 1 spécial" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Confirmer *</label>
                      <input type="password" value={formData.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" required />
                    </div>
                  </div>
                </div>
                
                {/* GDPR Consent */}
                <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={gdprConsent} onChange={e => setGdprConsent(e.target.checked)} className="mt-1 w-4 h-4" required />
                  <span className="text-sm text-white/70">
                    {"J'accepte"} que Lighthouse France collecte et traite mes données personnelles conformément à sa politique de confidentialité. Mes données seront utilisées uniquement pour la gestion de mon compte et le suivi des demandes de service. *
                  </span>
                </label>
                
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
                )}
                
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setPage('login')} className="flex-1 py-3 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-colors">Annuler</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-[#00A651] text-white rounded-lg font-semibold hover:bg-[#008f45] transition-colors disabled:opacity-50">
                    {loading ? 'Création...' : 'Créer le compte'}
                  </button>
                </div>
              </form>
              
              <div className="px-6 pb-6 text-center">
                <p className="text-white/60">
                  Déjà un compte?{' '}
                  <button onClick={() => setPage('login')} className="text-[#00A651] font-semibold hover:text-[#00c564]">Se connecter</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PASSWORD RECOVERY PAGE
// ============================================
function PasswordRecoveryPage({ supabase, notify, onComplete }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const allValid = hasMinLength && hasUppercase && hasNumber && hasSpecial && passwordsMatch;

  const handleReset = async (e) => {
    e.preventDefault();
    if (!allValid) { notify('Le mot de passe ne respecte pas les exigences', 'error'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { notify(`Erreur: ${error.message}`, 'error'); }
    else { setDone(true); }
  };

  const Check = ({ ok, text }) => (
    <div className={`flex items-center gap-2 text-xs ${ok ? 'text-green-400' : 'text-white/40'}`}>
      <span>{ok ? '✓' : '○'}</span><span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 z-0">
        <img src="/images/products/hero-background.png" alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/90 via-[#1a1a2e]/85 to-[#1a1a2e]/80"></div>
      </div>
      <div className="relative z-10">
        <header className="bg-[#1a1a2e]/50 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <img src="/images/logos/lighthouse-logo.png" alt="Lighthouse France" className="h-10 w-auto invert brightness-0 invert" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <div className="items-center gap-2 hidden text-white">
                  <span className="font-bold text-2xl tracking-tight">LIGHTHOUSE</span>
                  <span className="font-semibold text-sm text-[#00A651]">FRANCE</span>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
              <div className="px-6 py-8 text-center border-b border-white/10">
                <img src="/images/logos/lighthouse-logo.png" alt="Lighthouse France" className="h-14 w-auto mx-auto mb-3 invert brightness-0 invert" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                <h1 className="text-2xl font-bold text-white hidden">LIGHTHOUSE FRANCE</h1>
                <p className="text-white/60 mt-2">Réinitialisation du mot de passe</p>
              </div>
              {done ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2">Mot de passe modifié !</h2>
                  <p className="text-white/60 text-sm mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                  <button onClick={onComplete} className="w-full py-3 bg-[#00A651] text-white rounded-lg font-semibold hover:bg-[#008f45] transition-colors">
                    Se connecter
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">Nouveau mot de passe *</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent" placeholder="••••••••" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-sm">
                        {showPassword ? 'Cacher' : 'Voir'}
                      </button>
                    </div>
                    {newPassword.length > 0 && (
                      <div className="mt-3 space-y-1 bg-white/5 rounded-lg p-3">
                        <Check ok={hasMinLength} text="8 caractères minimum" />
                        <Check ok={hasUppercase} text="Une lettre majuscule" />
                        <Check ok={hasNumber} text="Un chiffre" />
                        <Check ok={hasSpecial} text="Un caractère spécial (!@#$...)" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">Confirmer *</label>
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent ${confirmPassword && !passwordsMatch ? 'border-red-400/50' : 'border-white/20'}`} placeholder="••••••••" required />
                    {confirmPassword && !passwordsMatch && <p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas</p>}
                    {passwordsMatch && <p className="text-xs text-green-400 mt-1">✓ Les mots de passe correspondent</p>}
                  </div>
                  <button type="submit" disabled={loading || !allValid} className="w-full py-3 bg-[#00A651] text-white rounded-lg font-semibold hover:bg-[#008f45] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Modification...' : 'Réinitialiser le mot de passe'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COOKIE BANNER
// ============================================
function CookieBanner({ onAccept, onShowPolicy }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] bg-[#1E3A5F] text-white p-4 shadow-2xl border-t border-white/20">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 text-sm text-white/80">
          <p>
            🍪 Ce site utilise des cookies strictement nécessaires au fonctionnement du portail (authentification, préférences). Aucun cookie publicitaire ni de traçage.{' '}
            <button onClick={onShowPolicy} className="underline hover:text-white">En savoir plus</button>
          </p>
        </div>
        <button
          onClick={onAccept}
          className="px-6 py-2 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008f45] transition-colors whitespace-nowrap"
        >
          Accepter
        </button>
      </div>
    </div>
  );
}

// ============================================
// LEGAL PAGE MODAL
// ============================================
function LegalPageModal({ page, onClose }) {
  return (
    <div className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-lg text-[#1E3A5F]">
            {page === 'privacy' ? 'Politique de confidentialité' : 'Mentions légales'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto text-sm text-gray-700 space-y-4">
          {page === 'privacy' ? (
            <>
              <h3 className="font-bold text-[#1E3A5F] text-base">1. Responsable du traitement</h3>
              <p>Lighthouse France SAS, 16 Rue Paul Séjourné, 94000 Créteil, France. Email : France@golighthouse.com</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">2. Données collectées</h3>
              <p>Nous collectons les données suivantes lors de votre inscription et utilisation du portail :</p>
              <p>— Données d'identification : nom, prénom, adresse email, numéro de téléphone</p>
              <p>— Données d'entreprise : raison sociale, SIRET, numéro de TVA, adresses</p>
              <p>— Données de service : demandes de service, historique des équipements, certificats</p>
              <p>— Données techniques : logs de connexion, préférences de langue</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">3. Finalités du traitement</h3>
              <p>Vos données sont traitées pour :</p>
              <p>— La gestion de votre compte et l'authentification</p>
              <p>— Le suivi des demandes de service (étalonnage, réparation)</p>
              <p>— La facturation et la gestion commerciale</p>
              <p>— La communication relative à vos demandes en cours</p>
              <p>— Le respect de nos obligations légales (traçabilité ISO 17025, Code de Commerce)</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">4. Base légale</h3>
              <p>Le traitement est fondé sur : l'exécution du contrat de service (Art. 6.1.b RGPD), le respect de nos obligations légales (Art. 6.1.c), et votre consentement pour les communications marketing (Art. 6.1.a).</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">5. Durée de conservation</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Données {"d'identification"} (nom, email, téléphone) :</strong> durée de la relation commerciale. Anonymisées sur demande via le portail.</li>
                <li><strong>Données de facturation :</strong> 10 ans (Article L123-22 du Code de Commerce)</li>
                <li><strong>Données {"d'étalonnage"} et certificats :</strong> 10 ans minimum (traçabilité métrologique ISO 17025)</li>
                <li><strong>Historique des demandes de service :</strong> 10 ans (obligations contractuelles et qualité)</li>
                <li><strong>Logs de connexion :</strong> 1 an</li>
              </ul>
              <p>
                En cas de demande {"d'effacement"} (Article 17 RGPD), vos données personnelles sont anonymisées. Les enregistrements liés aux obligations légales, comptables et de traçabilité métrologique sont conservés sous forme anonymisée conformément à {"l'Article"} 17(3)(b) et (e) du RGPD.
              </p>

              <h3 className="font-bold text-[#1E3A5F] text-base">6. Vos droits</h3>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <p>— Droit d'accès (Art. 15), de rectification (Art. 16), d'effacement (Art. 17)</p>
              <p>— Droit à la portabilité (Art. 20), d'opposition (Art. 21)</p>
              <p>— Droit de limitation du traitement (Art. 18)</p>
              <p>Pour exercer ces droits, utilisez les fonctions disponibles dans Paramètres {'>'} Sécurité, ou contactez-nous à France@golighthouse.com.</p>
              <p>Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">7. Cookies</h3>
              <p>Ce portail utilise uniquement des cookies strictement nécessaires au fonctionnement (authentification, session, préférences de langue). Aucun cookie publicitaire ou de traçage n'est utilisé.</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">8. Transferts de données</h3>
              <p>Vos données sont hébergées au sein de l'Union Européenne. En cas de transfert hors UE (services cloud), des garanties appropriées sont mises en place (clauses contractuelles types).</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">9. Sécurité</h3>
              <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement des communications (TLS), authentification sécurisée, contrôle {"d'accès"} basé sur les rôles, et sauvegardes régulières.</p>
            </>
          ) : (
            <>
              <h3 className="font-bold text-[#1E3A5F] text-base">1. Éditeur du site</h3>
              <p>Lighthouse France SAS</p>
              <p>Capital social : [à compléter]</p>
              <p>Siège social : 16 Rue Paul Séjourné, 94000 Créteil, France</p>
              <p>RCS Créteil — SIRET : [à compléter]</p>
              <p>TVA Intracommunautaire : [à compléter]</p>
              <p>Directeur de la publication : [à compléter]</p>
              <p>Email : France@golighthouse.com</p>
              <p>Téléphone : +33 (1) 43 77 28 07</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">2. Hébergeur</h3>
              <p>Ce site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.</p>
              <p>Les données applicatives sont hébergées par Supabase Inc. au sein de l'Union Européenne.</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">3. Propriété intellectuelle</h3>
              <p>L'ensemble du contenu de ce site (textes, images, logos, logiciels) est protégé par le droit de la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
              <p>LIGHTHOUSE® est une marque déposée de Lighthouse Worldwide Solutions, Inc.</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">4. Limitation de responsabilité</h3>
              <p>Lighthouse France s'efforce d'assurer l'exactitude des informations diffusées sur ce portail mais ne saurait être tenue responsable des erreurs, omissions ou résultats obtenus suite à l'utilisation de ces informations.</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">5. Loi applicable</h3>
              <p>Le présent site est soumis au droit français. En cas de litige, les tribunaux français seront seuls compétents. Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans {"l'économie"} numérique, ces mentions légales sont accessibles à tout moment sur ce site.</p>

              <h3 className="font-bold text-[#1E3A5F] text-base">6. Contact DPO</h3>
              <p>Pour toute question relative à la protection de vos données personnelles :<br />Email : <strong>france@golighthouse.com</strong><br />Objet : « Protection des données personnelles »</p>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="w-full py-2 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#2a4f7a]">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
