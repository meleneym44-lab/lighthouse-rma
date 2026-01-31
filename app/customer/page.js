'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Expose supabase to window for debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

// France Metropolitan postal code check
// Valid France Metropolitan: 5 digits, starting with 01-95 (includes Corsica 20)
// INVALID (show warning): DOM-TOM (97xxx, 98xxx), foreign addresses, or non-French codes

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
// PDF GENERATION - PROFESSIONAL BLOCK-BASED
// No emojis, signature always at page bottom
// ============================================

const PDF_CALIBRATION_DATA = {
  particle_counter: {
    title: "Etalonnage Compteur de Particules Aeroportees",
    prestations: [
      "Verification des fonctionnalites du compteur",
      "Verification et reglage du debit",
      "Verification de la cellule de mesure",
      "Controle et reglage des seuils de mesures granulometrique a l'aide de spheres de latex calibrees et certifiees",
      "Verification en nombre par comparaison a un etalon etalonne selon la norme ISO 17025, conformement a la norme ISO 21501-4",
      "Fourniture d'un rapport de test et de calibration"
    ]
  },
  bio_collector: {
    title: "Etalonnage Bio Collecteur",
    prestations: [
      "Verification des fonctionnalites de l'appareil",
      "Verification et reglage du debit",
      "Verification de la cellule d'impaction",
      "Controle des parametres de collecte",
      "Fourniture d'un rapport de test et de calibration"
    ]
  },
  liquid_counter: {
    title: "Etalonnage Compteur de Particules en Milieu Liquide",
    prestations: [
      "Verification des fonctionnalites du compteur",
      "Verification et reglage du debit",
      "Verification de la cellule de mesure optique",
      "Controle et reglage des seuils de mesures granulometrique a l'aide de spheres de latex calibrees et certifiees",
      "Verification en nombre par comparaison a un etalon",
      "Fourniture d'un rapport de test et de calibration"
    ]
  },
  temp_humidity: {
    title: "Etalonnage Capteur Temperature/Humidite",
    prestations: [
      "Verification des fonctionnalites du capteur",
      "Etalonnage temperature sur points de reference certifies",
      "Etalonnage humidite relative",
      "Verification de la stabilite des mesures",
      "Fourniture d'un certificat d'etalonnage"
    ]
  },
  other: {
    title: "Etalonnage Equipement",
    prestations: [
      "Verification des fonctionnalites de l'appareil",
      "Etalonnage selon les specifications du fabricant",
      "Tests de fonctionnement",
      "Fourniture d'un rapport de test"
    ]
  }
};

const PDF_REPAIR_DATA = {
  title: "Reparation",
  prestations: [
    "Diagnostic complet de l'appareil",
    "Identification des composants defectueux",
    "Remplacement des pieces defectueuses (pieces facturees en sus)",
    "Tests de fonctionnement complets",
    "Verification d'etalonnage post-reparation si applicable"
  ]
};

const PDF_DISCLAIMERS = [
  "Cette offre n'inclut pas la reparation ou l'echange de pieces non consommables.",
  "Un devis complementaire sera etabli si des pieces sont trouvees defectueuses et necessitent un remplacement.",
  "Les mesures stockees dans les appareils seront eventuellement perdues lors des operations de maintenance.",
  "Les equipements envoyes devront etre decontamines de toutes substances chimiques, bacteriennes ou radioactives."
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
  
  const company = request.companies || {};
  
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerHeight = 16;
  
  // Colors
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
  
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...green);
  pdf.text(isSigned ? 'DEVIS SIGNE' : 'OFFRE DE PRIX', pageWidth - margin, y + 8, { align: 'right' });
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('N. ' + (request.request_number || 'FR-XXXXX'), pageWidth - margin, y + 14, { align: 'right' });
  
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

  // ===== SERVICE DESCRIPTION BLOCKS =====
  const calibrationTypes = requiredSections.calibrationTypes || ['particle_counter'];
  const hasRepair = requiredSections.hasRepair || false;

  // Service descriptions data
  const CAL_DATA = {
    particle_counter: {
      title: "Etalonnage Compteur de Particules Aeroportees",
      prestations: [
        "Verification des fonctionnalites du compteur",
        "Verification et reglage du debit",
        "Verification de la cellule de mesure",
        "Controle et reglage des seuils de mesures granulometrique a l'aide de spheres de latex calibrees et certifiees",
        "Verification en nombre par comparaison a un etalon etalonne selon la norme ISO 17025, conformement a la norme ISO 21501-4",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    bio_collector: {
      title: "Etalonnage Bio Collecteur",
      prestations: [
        "Verification des fonctionnalites de l'appareil",
        "Verification et reglage du debit",
        "Verification de la cellule d'impaction",
        "Controle des parametres de collecte",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    liquid_counter: {
      title: "Etalonnage Compteur de Particules en Milieu Liquide",
      prestations: [
        "Verification des fonctionnalites du compteur",
        "Verification et reglage du debit",
        "Verification de la cellule de mesure optique",
        "Controle et reglage des seuils de mesures granulometrique",
        "Verification en nombre par comparaison a un etalon",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    other: {
      title: "Etalonnage Equipement",
      prestations: [
        "Verification des fonctionnalites de l'appareil",
        "Etalonnage selon les specifications du fabricant",
        "Tests de fonctionnement",
        "Fourniture d'un rapport de test"
      ]
    }
  };

  const REPAIR_DATA = {
    title: "Reparation",
    prestations: [
      "Diagnostic complet de l'appareil",
      "Identification des composants defectueux",
      "Remplacement des pieces defectueuses (pieces facturees en sus)",
      "Tests de fonctionnement complets",
      "Verification d'etalonnage post-reparation si applicable"
    ]
  };

  const DISCLAIMERS = [
    "Cette offre n'inclut pas la reparation ou l'echange de pieces non consommables.",
    "Un devis complementaire sera etabli si des pieces sont trouvees defectueuses et necessitent un remplacement.",
    "Les mesures stockees dans les appareils seront eventuellement perdues lors des operations de maintenance.",
    "Les equipements envoyes devront etre decontamines de toutes substances chimiques, bacteriennes ou radioactives."
  ];

  // Draw service blocks
  const drawServiceBlock = (data, color) => {
    const lineH = 5;
    let lines = [];
    data.prestations.forEach(p => {
      const wrapped = pdf.splitTextToSize(p, contentWidth - 14);
      wrapped.forEach(l => lines.push(l));
    });
    const blockH = 12 + (lines.length * lineH);
    checkPageBreak(blockH);
    
    pdf.setDrawColor(...color);
    pdf.setLineWidth(1);
    pdf.line(margin, y, margin, y + blockH - 3);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text(data.title, margin + 5, y + 6);
    y += 10;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...gray);
    data.prestations.forEach(p => {
      const wrapped = pdf.splitTextToSize(p, contentWidth - 14);
      wrapped.forEach((line, i) => {
        if (i === 0) pdf.text('-', margin + 5, y);
        pdf.text(line, margin + 9, y);
        y += lineH;
      });
    });
    y += 3;
  };

  // Draw calibration blocks (blue)
  calibrationTypes.forEach(type => {
    const data = CAL_DATA[type] || CAL_DATA.particle_counter;
    drawServiceBlock(data, [59, 130, 246]);
  });
  
  // Draw repair block (orange) if needed
  if (hasRepair) {
    drawServiceBlock(REPAIR_DATA, [249, 115, 22]);
  }

  // ===== CONDITIONS/DISCLAIMERS =====
  checkPageBreak(25);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('CONDITIONS', margin, y);
  y += 4;
  pdf.setFontSize(8);
  pdf.setTextColor(...gray);
  DISCLAIMERS.forEach(d => {
    pdf.text('- ' + d, margin, y);
    y += 4;
  });
  y += 5;

  // ===== DETAILED PRICING TABLE (Qté | Désignation | Prix Unit. | Total HT) =====
  const rowH = 7;
  const colQty = margin;
  const colDesc = margin + 12;
  const colUnit = pageWidth - margin - 45;
  const colTotal = pageWidth - margin - 3;
  
  checkPageBreak(60);
  
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Recapitulatif des Prix', margin, y);
  y += 7;

  // Header row
  pdf.setFillColor(...darkBlue);
  pdf.rect(margin, y, contentWidth, 9, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...white);
  pdf.text('Qte', colQty + 3, y + 6);
  pdf.text('Designation', colDesc, y + 6);
  pdf.text('Prix Unit.', colUnit, y + 6, { align: 'right' });
  pdf.text('Total HT', colTotal, y + 6, { align: 'right' });
  y += 9;

  let rowIndex = 0;
  let hasNettoyage = false;

  // Build line items from devicePricing (from quote_data)
  devicePricing.forEach((device) => {
    // Calibration row
    if (device.needsCalibration) {
      const qty = device.calibrationQty || 1;
      const unitPrice = parseFloat(device.calibrationPrice) || 0;
      const lineTotal = qty * unitPrice;
      const isContract = device.isContractCovered;
      
      pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250);
      pdf.rect(margin, y, contentWidth, rowH, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...darkBlue);
      pdf.text(String(qty), colQty + 3, y + 5);
      const calDesc = `Etalonnage ${device.model || ''} (SN: ${device.serial || ''})${isContract ? ' [CONTRAT]' : ''}`;
      pdf.text(calDesc.substring(0, 60), colDesc, y + 5);
      pdf.text(isContract ? 'Contrat' : unitPrice.toFixed(2) + ' €', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(isContract ? 'Contrat' : lineTotal.toFixed(2) + ' €', colTotal, y + 5, { align: 'right' });
      y += rowH;
      rowIndex++;
    }
    
    // Nettoyage row
    if (device.needsNettoyage && !device.isContractCovered && device.nettoyagePrice > 0) {
      hasNettoyage = true;
      const qty = device.nettoyageQty || 1;
      const unitPrice = parseFloat(device.nettoyagePrice) || 0;
      const lineTotal = qty * unitPrice;
      
      pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250);
      pdf.rect(margin, y, contentWidth, rowH, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...darkBlue);
      pdf.text(String(qty), colQty + 3, y + 5);
      pdf.text('Nettoyage cellule - si requis selon etat du capteur', colDesc, y + 5);
      pdf.text(unitPrice.toFixed(2) + ' €', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(lineTotal.toFixed(2) + ' €', colTotal, y + 5, { align: 'right' });
      y += rowH;
      rowIndex++;
    }
    
    // Repair row
    if (device.needsRepair) {
      const qty = device.repairQty || 1;
      const unitPrice = parseFloat(device.repairPrice) || 0;
      const lineTotal = qty * unitPrice;
      
      pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250);
      pdf.rect(margin, y, contentWidth, rowH, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...darkBlue);
      pdf.text(String(qty), colQty + 3, y + 5);
      const repDesc = `Reparation ${device.model || ''} (SN: ${device.serial || ''})`;
      pdf.text(repDesc.substring(0, 60), colDesc, y + 5);
      pdf.text(unitPrice.toFixed(2) + ' €', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(lineTotal.toFixed(2) + ' €', colTotal, y + 5, { align: 'right' });
      y += rowH;
      rowIndex++;
    }
    
    // Additional parts
    (device.additionalParts || []).forEach(part => {
      const qty = parseInt(part.quantity) || 1;
      const unitPrice = parseFloat(part.price) || 0;
      const lineTotal = qty * unitPrice;
      
      pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250);
      pdf.rect(margin, y, contentWidth, rowH, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...darkBlue);
      pdf.text(String(qty), colQty + 3, y + 5);
      const partDesc = part.partNumber ? `[${part.partNumber}] ${part.description || 'Piece'}` : (part.description || 'Piece/Service');
      pdf.text(partDesc.substring(0, 55), colDesc, y + 5);
      pdf.text(unitPrice.toFixed(2) + ' €', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(lineTotal.toFixed(2) + ' €', colTotal, y + 5, { align: 'right' });
      y += rowH;
      rowIndex++;
    });
  });
  
  // Shipping row
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth, rowH, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkBlue);
  pdf.text(String(shipping.parcels || 1), colQty + 3, y + 5);
  const shipDesc = shipping.parcels > 1 ? `Frais de port (${shipping.parcels} colis)` : 'Frais de port';
  pdf.text(shipDesc, colDesc, y + 5);
  pdf.text((shipping.unitPrice || 45).toFixed(2) + ' €', colUnit, y + 5, { align: 'right' });
  pdf.setFont('helvetica', 'bold');
  pdf.text(shippingTotal.toFixed(2) + ' €', colTotal, y + 5, { align: 'right' });
  y += rowH;

  // Total row
  pdf.setFillColor(...green);
  pdf.rect(margin, y, contentWidth, 11, 'F');
  pdf.setTextColor(...white);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL HT', colUnit - 30, y + 7.5);
  pdf.setFontSize(16);
  pdf.text(grandTotal.toFixed(2) + ' €', colTotal, y + 8, { align: 'right' });
  y += 15;
  
  // Nettoyage disclaimer
  if (hasNettoyage) {
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...lightGray);
    pdf.text('* Le nettoyage cellule sera facture uniquement si necessaire selon l\'etat du capteur a reception.', margin, y);
    y += 5;
  }

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
  const amber = [245, 158, 11];
  const darkBlue = [26, 26, 46];
  const gray = [80, 80, 80];
  const lightGray = [130, 130, 130];
  const white = [255, 255, 255];
  const green = [0, 166, 81];
  
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
  
  let lighthouseLogo = await loadImageAsBase64('/images/logos/lighthouse-logo.png');
  
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
      pdf.addImage(lighthouseLogo, format, margin, y, 60, 12);
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
  pdf.setTextColor(...amber);
  pdf.text('DEVIS PIECES', pageWidth - margin, y + 5, { align: 'right' });
  pdf.setFontSize(10);
  pdf.setTextColor(...gray);
  pdf.text(quoteRef, pageWidth - margin, y + 12, { align: 'right' });
  
  y += 20;
  
  // Amber accent line
  pdf.setFillColor(...amber);
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
  pdf.text('Designation', colDesc, y + 5.5);
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
  pdf.setFillColor(...amber);
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
    pdf.setDrawColor(...green);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(sigBoxX, sigY - 2, 62, 36, 2, 2, 'FD');
    
    pdf.setFontSize(8);
    pdf.setTextColor(...green);
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
    pdf.setTextColor(...green);
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
      loadImageAsBase64('/images/logos/lighthouse-logo.png'),
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
      pdf.addImage(lighthouseLogo, format, margin, y, 70, 14);
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
      title: "Etalonnage Compteur de Particules Aeroportees",
      prestations: [
        "Verification des fonctionnalites du compteur",
        "Verification et reglage du debit",
        "Verification de la cellule de mesure",
        "Controle et reglage des seuils de mesures granulometrique a l'aide de spheres de latex calibrees et certifiees",
        "Verification en nombre par comparaison a un etalon etalonne selon la norme ISO 17025, conformement a la norme ISO 21501-4",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    bio_collector: {
      title: "Etalonnage Bio Collecteur",
      prestations: [
        "Verification des fonctionnalites de l'appareil",
        "Verification et reglage du debit",
        "Verification de la cellule d'impaction",
        "Controle des parametres de collecte",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    liquid_counter: {
      title: "Etalonnage Compteur de Particules en Milieu Liquide",
      prestations: [
        "Verification des fonctionnalites du compteur",
        "Verification et reglage du debit",
        "Verification de la cellule de mesure optique",
        "Controle et reglage des seuils de mesures granulometrique",
        "Verification en nombre par comparaison a un etalon",
        "Fourniture d'un rapport de test et de calibration"
      ]
    },
    temp_humidity: {
      title: "Etalonnage Capteur Temperature/Humidite",
      prestations: [
        "Verification des fonctionnalites du capteur",
        "Etalonnage temperature sur points de reference certifies",
        "Etalonnage humidite relative",
        "Verification de la stabilite des mesures",
        "Fourniture d'un certificat d'etalonnage"
      ]
    },
    other: {
      title: "Etalonnage Equipement",
      prestations: [
        "Verification des fonctionnalites de l'appareil",
        "Etalonnage selon les specifications du fabricant",
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
    `${totalTokensDisplay} etalonnage(s) inclus pendant la periode contractuelle`,
    "Etalonnages supplementaires factures au tarif standard",
    "Cette offre n'inclut pas la reparation ou l'echange de pieces non consommables",
    "Un devis complementaire sera etabli si des pieces sont trouvees defectueuses",
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
  pdf.text('Recapitulatif des Prix', margin, y);
  y += 7;

  // Header row
  pdf.setFillColor(...darkBlue);
  pdf.rect(margin, y, contentWidth, 9, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...white);
  pdf.text('Qte', colQty + 3, y + 6);
  pdf.text('Designation', colDesc, y + 6);
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
      const calDesc = `Etalonnage ${device.model || ''} (SN: ${device.serial || ''})`;
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
  
  // === LEGACY (for backwards compatibility) ===
  received: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Reçu', icon: '◕', progress: 40 },
  in_progress: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', label: 'En cours', icon: '◉', progress: 60 },
  quote_sent: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Devis envoyé - Action requise', icon: '💰', progress: 45 },
  quote_revision_requested: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'Modification demandée', icon: '✏️', progress: 40 },
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
const StepProgress = ({ status, serviceType }) => {
  // Define steps based on service type
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

  // REPAIR: 11 steps
  const repairSteps = [
    { id: 'submitted', label: 'Soumis', shortLabel: 'Soumis' },
    { id: 'rma_created', label: 'RMA/Devis Créé', shortLabel: 'Devis' },
    { id: 'approved', label: 'Devis Approuvé', shortLabel: 'Approuvé' },
    { id: 'waiting', label: 'En attente réception', shortLabel: 'Attente' },
    { id: 'received', label: 'Reçu', shortLabel: 'Reçu' },
    { id: 'inspection', label: 'Inspection', shortLabel: 'Insp.' },
    { id: 'approval', label: 'Approbation', shortLabel: 'Appr.' },
    { id: 'repair', label: 'Réparation', shortLabel: 'Rép.' },
    { id: 'qc', label: 'Contrôle QC', shortLabel: 'QC' },
    { id: 'ready', label: 'Prêt', shortLabel: 'Prêt' },
    { id: 'shipped', label: 'Expédié', shortLabel: 'Expédié' }
  ];

  const isRepair = serviceType === 'repair' || serviceType === 'réparation';
  const steps = isRepair ? repairSteps : calibrationSteps;

  // Map current status to step index
  const getStepIndex = (currentStatus) => {
    if (!currentStatus) return 0;
    
    console.log('🔍 StepProgress - status:', currentStatus, 'isRepair:', isRepair);
    
    if (isRepair) {
      // Repair flow mapping (11 steps: 0-10)
      const repairMap = {
        'submitted': 0, 'pending': 0,
        'quote_sent': 1, 'quote_revision_requested': 1,
        'bc_pending': 2, 'bc_review': 2, 'waiting_bc': 2,
        'waiting_device': 3,
        'received': 4, 'received_repair': 4,
        'inspection': 5, 'inspection_complete': 5,
        'customer_approval': 6, 'waiting_approval': 6,
        'repair_in_progress': 7, 'in_progress': 7, 'waiting_parts': 7,
        'final_qc': 8, 'quality_check': 8,
        'ready_to_ship': 9,
        'shipped': 10, 'delivered': 10, 'completed': 10
      };
      const index = repairMap[currentStatus] ?? 0;
      console.log('🔍 Repair step index:', index);
      return index;
    } else {
      // Calibration flow mapping (10 steps: 0-9)
      const calibrationMap = {
        'submitted': 0, 'pending': 0,
        'quote_sent': 1, 'quote_revision_requested': 1,
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
      console.log('🔍 Calibration step index:', index);
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
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div 
                className={`
                  relative flex items-center justify-center flex-1 py-2 px-1 text-xs font-medium
                  ${isCompleted ? 'bg-[#3B7AB4] text-white' : isCurrent ? 'bg-[#1E3A5F] text-white' : 'bg-gray-200 text-gray-500'}
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
                <span className="truncate px-1">{step.label}</span>
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
  const [toast, setToast] = useState(null);
  
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
        .select('*, request_devices(*)')
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
  }, []);

  const refresh = useCallback(() => loadData(profile), [loadData, profile]);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: p } = await supabase.from('profiles')
          .select('*, companies(*)')
          .eq('id', session.user.id)
          .single();
        if (p) {
          // Redirect Lighthouse staff to admin portal
          if (p.role === 'lh_admin' || p.role === 'lh_employee') {
            window.location.href = '/admin';
            return;
          }
          setProfile(p);
          await loadData(p);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [loadData]);

  const logout = async () => {
    await supabase.auth.signOut();
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
    
    // Check if Lighthouse staff - redirect to admin
    const { data: p } = await supabase.from('profiles')
      .select('*, companies(*)')
      .eq('id', data.user.id)
      .single();
    
    if (p) {
      if (p.role === 'lh_admin' || p.role === 'lh_employee') {
        window.location.href = '/admin';
        return null;
      }
      setUser(data.user);
      setProfile(p);
      setPage('dashboard');
      await loadData(p);
    }
    return null;
  };

  // Register function
  const register = async (formData) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password
    });
    if (authError) return authError.message;
    
    // Create company
    const { data: company, error: companyError } = await supabase.from('companies').insert({
      name: formData.companyName,
      billing_address: formData.address,
      billing_city: formData.city,
      billing_postal_code: formData.postalCode,
      phone: formData.phone,
      email: formData.email
    }).select().single();
    if (companyError) return companyError.message;
    
    // Create profile
    await supabase.from('profiles').insert({
      id: authData.user.id,
      email: formData.email,
      full_name: formData.contactName,
      role: 'customer',
      company_id: company.id,
      phone: formData.phone
    });
    
    // Create default shipping address
    await supabase.from('shipping_addresses').insert({
      company_id: company.id,
      label: 'Principal',
      address_line1: formData.address,
      city: formData.city,
      postal_code: formData.postalCode,
      country: 'France',
      is_default: true
    });
    
    notify(t('saved'));
    setPage('login');
    return null;
  };

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
        {page === 'register' && <RegisterPage t={t} register={register} setPage={setPage} />}
        {(page !== 'login' && page !== 'register') && <HomePage t={t} setPage={setPage} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
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
              <button onClick={() => setPage('new-request')} className={`font-medium ${page === 'new-request' ? 'text-[#00A651]' : 'text-white/70 hover:text-white'}`}>
                {t('newRequest')}
              </button>
              <button onClick={() => setPage('contracts')} className={`font-medium ${page === 'contracts' ? 'text-[#00A651]' : 'text-white/70 hover:text-white'}`}>
                Contrats
              </button>
              <button onClick={() => setPage('rentals')} className={`font-medium ${page === 'rentals' ? 'text-[#00A651]' : 'text-white/70 hover:text-white'}`}>
                Locations
              </button>
              <button onClick={() => setPage('equipment')} className={`font-medium ${page === 'equipment' ? 'text-[#00A651]' : 'text-white/70 hover:text-white'}`}>
                {t('myEquipment')}
              </button>
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
                onClick={() => setLang('fr')} 
                className={`px-2 py-1 rounded text-sm font-bold ${lang === 'fr' ? 'bg-[#00A651] text-white' : 'text-white/50'}`}
              >
                FR
              </button>
              <button 
                onClick={() => setLang('en')} 
                className={`px-2 py-1 rounded text-sm font-bold ${lang === 'en' ? 'bg-[#00A651] text-white' : 'text-white/50'}`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          <nav className="md:hidden flex gap-2 pb-3 overflow-x-auto">
            {['dashboard', 'new-request', 'contracts', 'rentals', 'equipment', 'settings'].map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  page === p ? 'bg-[#00A651] text-white' : 'bg-white/10 text-white/70'
                }`}
              >
                {p === 'new-request' ? t('newRequest') : p === 'contracts' ? 'Contrats' : p === 'rentals' ? 'Locations' : t(p)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {page === 'dashboard' && (
          <Dashboard 
            profile={profile} 
            requests={requests}
            contracts={contracts}
            t={t} 
            setPage={setPage}
            setSelectedRequest={setSelectedRequest}
            setPreviousPage={setPreviousPage}
          />
        )}
        
        {page === 'new-request' && (
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
            t={t}
            notify={notify}
            refresh={refresh}
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
            previousPage={previousPage}
          />
        )}
        
        {page === 'device-history' && (
          <DeviceHistoryPage 
            profile={profile}
            requests={requests}
            t={t}
            setPage={setPage}
          />
        )}
        
        {page === 'contracts' && (
          <ContractsPage 
            profile={profile}
            t={t}
            notify={notify}
            setPage={setPage}
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
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="font-bold text-xl mb-2">LIGHTHOUSE FRANCE</div>
          <p className="text-white/60 text-sm">
            16 Rue Paul Sejourne, 94000 Creteil - France@golighthouse.com
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// DASHBOARD COMPONENT (Enhanced)
// ============================================
function Dashboard({ profile, requests, contracts, t, setPage, setSelectedRequest, setPreviousPage }) {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'service', 'parts', 'messages'

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!profile?.company_id) return;
      
      const requestIds = requests.map(r => r.id);
      if (requestIds.length === 0) return;
      
      const { data } = await supabase
        .from('messages')
        .select('*')
        .in('request_id', requestIds)
        .order('created_at', { ascending: false });
      
      if (data) {
        setMessages(data);
        setUnreadCount(data.filter(m => !m.is_read && m.sender_id !== profile.id).length);
      }
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

  const pendingParts = partsOrders.filter(r => ['submitted', 'waiting_approval'].includes(r.status));
  const inProgressParts = partsOrders.filter(r => !['submitted', 'waiting_approval', 'shipped', 'completed', 'delivered', 'cancelled'].includes(r.status));
  const completedParts = partsOrders.filter(r => ['shipped', 'completed', 'delivered'].includes(r.status));

  return (
    <div>
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Bonjour, {profile?.full_name?.split(' ')[0] || 'Client'}</h1>
          <p className="text-gray-600">Bienvenue sur votre espace client Lighthouse France</p>
        </div>
        <button 
          onClick={() => setPage('new-request')}
          className="px-6 py-3 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F] transition-colors"
        >
          + Nouvelle Demande
        </button>
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
          {/* ACTION REQUIRED - Combined RMA and Contracts */}
          {(serviceRequests.filter(r => ['approved', 'waiting_bc', 'waiting_po', 'waiting_customer', 'inspection_complete', 'quote_sent'].includes(r.status) && r.status !== 'bc_review' && !r.bc_submitted_at).length > 0 || 
            (contracts && contracts.filter(c => c.status === 'quote_sent' || c.status === 'bc_rejected').length > 0)) && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <span className="animate-pulse">⚠</span> Action requise
              </h3>
              <p className="text-sm text-red-600 mb-3">Les demandes suivantes nécessitent votre attention</p>
              <div className="space-y-2">
                {/* RMA Requests */}
                {serviceRequests
                  .filter(r => ['approved', 'waiting_bc', 'waiting_po', 'waiting_customer', 'inspection_complete', 'quote_sent'].includes(r.status) && r.status !== 'bc_review' && !r.bc_submitted_at)
                  .map(req => (
                  <div 
                    key={req.id}
                    onClick={() => viewRequest(req)}
                    className="flex justify-between items-center p-3 bg-white rounded-lg cursor-pointer hover:bg-red-100 border border-red-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-red-700">{req.request_number || 'En attente'}</span>
                      <span className="text-sm text-red-600">
                        {req.status === 'approved' || req.status === 'waiting_bc' || req.status === 'waiting_po' 
                          ? 'Soumettre bon de commande' 
                          : req.status === 'inspection_complete' || req.status === 'quote_sent'
                          ? 'Approuver le devis'
                          : 'Action requise'}
                      </span>
                    </div>
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      Agir →
                    </span>
                  </div>
                ))}
                {/* Contract Quotes */}
                {contracts && contracts
                  .filter(c => c.status === 'quote_sent' || c.status === 'bc_rejected')
                  .map(contract => (
                  <div 
                    key={contract.id}
                    onClick={() => setPage('contracts')}
                    className="flex justify-between items-center p-3 bg-white rounded-lg cursor-pointer hover:bg-red-100 border border-red-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-blue-500">📋</span>
                      <span className="font-mono font-bold text-red-700">{contract.contract_number || 'Nouveau Contrat'}</span>
                      <span className="text-sm text-red-600">
                        {contract.status === 'quote_sent' ? 'Approuver le devis contrat' : 'Resoumettre BC contrat'}
                      </span>
                    </div>
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      Agir →
                    </span>
                  </div>
                ))}
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

          {/* Pending Parts Orders */}
          {pendingParts.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-400 rounded-lg p-4">
              <h3 className="font-bold text-orange-800 mb-2">📦 Commandes pièces en attente</h3>
              <div className="space-y-2">
                {pendingParts.map(req => (
                  <div 
                    key={req.id}
                    onClick={() => viewRequest(req)}
                    className="flex justify-between items-center p-2 bg-white rounded cursor-pointer hover:bg-orange-100"
                  >
                    <span className="font-mono font-medium">{req.request_number}</span>
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
                  return (
                    <div 
                      key={req.id}
                      onClick={() => viewRequest(req)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${needsAction ? 'bg-red-50/50' : ''}`}
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
                        </div>
                        <span className="text-sm text-gray-500">
                          {req.request_devices?.length || 0} appareil(s)
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(req.request_devices || []).slice(0, 3).map((dev, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
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

          {/* In Progress Parts */}
          {inProgressParts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-[#1E3A5F] text-lg">📦 Commandes pièces en cours</h2>
                <span className="text-sm text-gray-500">{inProgressParts.length} commande(s)</span>
              </div>
              <div className="divide-y divide-gray-100">
                {inProgressParts.slice(0, 3).map(req => {
                  const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
                  return (
                    <div 
                      key={req.id}
                      onClick={() => viewRequest(req)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-amber-600">{req.request_number}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(req.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Completed */}
          {(completedService.length > 0 || completedParts.length > 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-[#1E3A5F] text-lg">✅ Récemment terminés</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {[...completedService, ...completedParts]
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .slice(0, 5)
                  .map(req => (
                  <div 
                    key={req.id}
                    onClick={() => viewRequest(req)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-gray-700">{req.request_number}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {req.request_type === 'parts' ? 'Pièces' : 'Service'}
                        </span>
                      </div>
                      <span className="text-green-600 text-sm font-medium">Terminé</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {requests.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-500 mb-4">Aucune demande pour le moment</p>
              <button 
                onClick={() => setPage('new-request')}
                className="px-6 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium"
              >
                Soumettre votre première demande
              </button>
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
              <button 
                onClick={() => setPage('new-request')}
                className="px-6 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium"
              >
                Soumettre une demande
              </button>
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
                        <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
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
              <button 
                onClick={() => setPage('new-request')}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium"
              >
                Commander des pièces
              </button>
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
            <h2 className="font-bold text-[#1E3A5F] text-lg">Suivi de vos appareils</h2>
            <p className="text-sm text-gray-500">Tous les appareils que vous avez envoyés en service</p>
          </div>
          
          {allDevices.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🔧</p>
              <p className="text-gray-500">Aucun appareil en cours de traitement</p>
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
                  {allDevices.map((dev, i) => {
                    const status = dev.status || dev.request_status || 'pending';
                    const style = STATUS_STYLES[status] || STATUS_STYLES.submitted;
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-[#1E3A5F]">{dev.model_name || 'N/A'}</td>
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
            </div>
          )}
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
        />
      )}
    </div>
  );
}

// ============================================
// MESSAGES PANEL COMPONENT
// ============================================
function MessagesPanel({ messages, requests, profile, setMessages, setUnreadCount }) {
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Group messages by request
  const messagesByRequest = requests.map(req => {
    const reqMessages = messages.filter(m => m.request_id === req.id);
    const unread = reqMessages.filter(m => !m.is_read && m.sender_id !== profile.id).length;
    const lastMessage = reqMessages[0];
    return {
      request: req,
      messages: reqMessages,
      unreadCount: unread,
      lastMessage
    };
  }).filter(t => t.messages.length > 0 || t.request.status !== 'completed')
    .sort((a, b) => {
      // Sort by unread first, then by last message date
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      const dateA = a.lastMessage?.created_at || a.request.created_at;
      const dateB = b.lastMessage?.created_at || b.request.created_at;
      return new Date(dateB) - new Date(dateA);
    });

  const markAsRead = async (requestId) => {
    const unreadMessages = messages.filter(m => 
      m.request_id === requestId && !m.is_read && m.sender_id !== profile.id
    );
    
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
    const { data, error } = await supabase
      .from('messages')
      .insert({
        request_id: selectedThread.request.id,
        sender_id: profile.id,
        sender_type: 'customer',
        sender_name: profile.full_name || 'Client',
        content: newMessage.trim()
      })
      .select()
      .single();
    
    if (!error && data) {
      setMessages(prevMessages => [data, ...prevMessages]);
      setNewMessage('');
      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 100);
    }
    setSending(false);
  };

  const openThread = (thread) => {
    setSelectedThread(thread);
    markAsRead(thread.request.id);
    // Scroll to bottom when opening thread
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
              {messagesByRequest.map(thread => (
                <div
                  key={thread.request.id}
                  onClick={() => openThread(thread)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedThread?.request.id === thread.request.id 
                      ? 'bg-[#E8F2F8]' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono font-medium text-[#3B7AB4] text-sm">
                      {thread.request.request_number}
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
              ))}
            </div>
          )}
        </div>

        {/* Message Thread */}
        <div className="md:col-span-2 flex flex-col h-full overflow-hidden">
          {selectedThread ? (
            (() => {
              // Get current messages for selected thread from state (not from cached selectedThread)
              const currentMessages = messages.filter(m => m.request_id === selectedThread.request.id);
              return (
                <>
                  {/* Thread Header */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                    <h3 className="font-bold text-[#1E3A5F]">
                      Demande {selectedThread.request.request_number}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedThread.request.request_devices?.length || 0} appareil(s) • 
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
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-6">Nouvelle Demande</h1>
        
        <p className="text-gray-600 mb-8">Quel type de demande souhaitez-vous soumettre?</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Service Request */}
          <button
            onClick={() => setRequestType('service')}
            className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-200 hover:border-[#3B7AB4] transition-colors text-left group"
          >
            <div className="text-4xl mb-4">🔧</div>
            <h2 className="text-lg font-bold text-[#1E3A5F] mb-2 group-hover:text-[#3B7AB4]">
              Étalonnage / Réparation
            </h2>
            <p className="text-gray-600 text-sm">
              Calibration, réparation ou maintenance de vos appareils
            </p>
          </button>
          
          {/* Parts Order */}
          <button
            onClick={() => setRequestType('parts')}
            className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-200 hover:border-[#3B7AB4] transition-colors text-left group"
          >
            <div className="text-4xl mb-4">📦</div>
            <h2 className="text-lg font-bold text-[#1E3A5F] mb-2 group-hover:text-[#3B7AB4]">
              Commande de Pièces
            </h2>
            <p className="text-gray-600 text-sm">
              Pièces de rechange ou consommables
            </p>
          </button>
          
          {/* Contract Request */}
          <button
            onClick={() => setRequestType('contract')}
            className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-200 hover:border-[#00A651] transition-colors text-left group"
          >
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-lg font-bold text-[#1E3A5F] mb-2 group-hover:text-[#00A651]">
              Contrat d'Étalonnage
            </h2>
            <p className="text-gray-600 text-sm">
              Contrat annuel pour votre parc d'appareils
            </p>
          </button>
          
          {/* Rental Request */}
          <button
            onClick={() => setRequestType('rental')}
            className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-200 hover:border-[#8B5CF6] transition-colors text-left group"
          >
            <div className="text-4xl mb-4">📅</div>
            <h2 className="text-lg font-bold text-[#1E3A5F] mb-2 group-hover:text-[#8B5CF6]">
              Location d'Équipement
            </h2>
            <p className="text-gray-600 text-sm">
              Louer des compteurs de particules
            </p>
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
  const [shipping, setShipping] = useState({ 
    address_id: addresses.find(a => a.is_default)?.id || '',
    showNewForm: false,
    newAddress: { label: '', company_name: '', attention: '', address_line1: '', city: '', postal_code: '' },
    parcels: 0
  });
  const [saving, setSaving] = useState(false);

  // Load saved equipment on mount
  useEffect(() => {
    const loadEquipment = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', profile.company_id)
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
      shipping_address_id: null // Per-device return address (null = use default)
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
    if (!addr.company_name || !addr.address_line1 || !addr.attention || !addr.city || !addr.postal_code) {
      notify('Veuillez remplir tous les champs obligatoires de l\'adresse', 'error');
      return null;
    }
    
    const { data, error } = await supabase.from('shipping_addresses').insert({
      company_id: profile.company_id,
      label: addr.label || addr.company_name,
      company_name: addr.company_name,
      attention: addr.attention,
      address_line1: addr.address_line1,
      city: addr.city,
      postal_code: addr.postal_code,
      country: 'France',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate devices
    for (const d of devices) {
      if (!d.device_type || !d.model || !d.serial_number || !d.service_type) {
        notify('Veuillez remplir tous les champs obligatoires pour chaque appareil (type, modèle, n° série, service)', 'error');
        return;
      }
      // Notes required only for repair, calibration_repair, or other services
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

    // Handle address
    let addressId = shipping.address_id;
    if (shipping.showNewForm) {
      addressId = await saveNewAddress();
      if (!addressId) return;
    }
    
    if (!addressId) {
      notify('Veuillez sélectionner ou ajouter une adresse', 'error');
      return;
    }
    
    // Validate parcels
    if (!shipping.parcels || shipping.parcels < 1) {
      notify('Veuillez indiquer le nombre de colis', 'error');
      return;
    }

    setSaving(true);
    
    try {
      // No number assigned yet - will get FR-XXXXX after approval
      // Contract detection happens on admin side when creating quote
      const { data: request, error: reqErr } = await supabase
        .from('service_requests')
        .insert({
          request_number: null, // No number until approved
          company_id: profile.company_id,
          submitted_by: profile.id,
          request_type: 'service',
          serial_number: devices[0].serial_number,
          equipment_type: 'particle_counter',
          requested_service: devices[0].service_type === 'other' ? devices[0].service_other : devices[0].service_type,
          problem_description: devices.map(d => `[${d.brand === 'other' ? d.brand_other : 'Lighthouse'}] ${d.model} - ${d.serial_number}\nService: ${d.service_type === 'other' ? d.service_other : d.service_type}\nAccessoires: ${d.accessories.join(', ') || 'Aucun'}\nNotes: ${d.notes}`).join('\n\n---\n\n'),
          urgency: 'normal',
          shipping_address_id: addressId,
          parcels_count: shipping.parcels || 1,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (reqErr) throw reqErr;

      // Save devices with full details
      for (const d of devices) {
        await supabase.from('request_devices').insert({
          request_id: request.id,
          serial_number: d.serial_number,
          model_name: d.model,
          device_type: d.device_type,
          equipment_type: d.brand === 'other' ? d.brand_other : 'Lighthouse',
          service_type: d.service_type === 'other' ? d.service_other : d.service_type,
          notes: d.notes,
          accessories: d.accessories,
          shipping_address_id: d.shipping_address_id || null
        });

        // Save to equipment if checkbox is checked and not already from saved
        if (d.saveDevice && !d.fromSaved) {
          await supabase.from('equipment').upsert({
            company_id: profile.company_id,
            serial_number: d.serial_number,
            model_name: d.model,
            nickname: d.nickname || null,
            brand: d.brand === 'other' ? d.brand_other : 'Lighthouse',
            equipment_type: d.device_type || 'particle_counter',
            added_by: profile.id
          }, { onConflict: 'serial_number' });
        }
      }

      notify('Demande soumise avec succès! Numéro FR attribué après validation.');
      refresh();
      setPage('dashboard');
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
      
      <form onSubmit={handleSubmit}>
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

        {/* Shipping Section */}
        <ShippingSection 
          shipping={shipping}
          setShipping={setShipping}
          addresses={addresses}
          profile={profile}
          notify={notify}
          refresh={refresh}
        />

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
            {saving ? 'Envoi en cours...' : 'Soumettre la Demande'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// PARTS ORDER FORM
// ============================================
function PartsOrderForm({ profile, addresses, t, notify, refresh, setPage, goBack }) {
  const [parts, setParts] = useState([createNewPart(1)]);
  const [shipping, setShipping] = useState({ 
    address_id: addresses.find(a => a.is_default)?.id || '',
    showNewForm: false,
    newAddress: { label: '', company_name: '', attention: '', address_line1: '', city: '', postal_code: '' }
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    for (const p of parts) {
      if (!p.description) {
        notify('Veuillez décrire la pièce demandée', 'error');
        return;
      }
    }

    let addressId = shipping.address_id;
    if (shipping.showNewForm) {
      const addr = shipping.newAddress;
      if (!addr.company_name || !addr.address_line1 || !addr.attention || !addr.city || !addr.postal_code) {
        notify('Veuillez remplir tous les champs obligatoires de l\'adresse', 'error');
        return;
      }
      
      const { data, error } = await supabase.from('shipping_addresses').insert({
        company_id: profile.company_id,
        label: addr.label || addr.company_name,
        company_name: addr.company_name,
        attention: addr.attention,
        address_line1: addr.address_line1,
        city: addr.city,
        postal_code: addr.postal_code,
        country: 'France',
        is_default: false
      }).select().single();
      
      if (error) {
        notify(`Erreur adresse: ${error.message}`, 'error');
        return;
      }
      addressId = data.id;
      refresh();
    }
    
    if (!addressId) {
      notify('Veuillez sélectionner ou ajouter une adresse de livraison', 'error');
      return;
    }

    setSaving(true);
    
    try {
      // Create initial request to get ID for photo uploads
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
      
      <form onSubmit={handleSubmit}>
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

        {/* Simplified Shipping Section for Parts Orders - No parcels needed */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-4 pb-4 border-b-2 border-[#E8F2F8]">
            📍 Adresse de Livraison
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Les pièces seront expédiées à l'adresse sélectionnée.
          </p>

          {/* Existing Addresses */}
          {addresses.length > 0 ? (
            <div className="space-y-2 mb-4">
              {addresses.map(addr => (
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
                    </div>
                    <div className="text-sm text-gray-600">{addr.address_line1}</div>
                    {addr.attention && <div className="text-sm text-gray-500">À l'attention de: {addr.attention}</div>}
                    <div className="text-sm text-gray-600">{addr.postal_code} {addr.city}</div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 mb-4">Aucune adresse enregistrée</p>
          )}

          {/* Add New Address Toggle */}
          <button
            type="button"
            onClick={() => setShipping({ ...shipping, showNewForm: !shipping.showNewForm, address_id: shipping.showNewForm ? (addresses.find(a => a.is_default)?.id || '') : '' })}
            className="text-[#3B7AB4] font-medium hover:underline mb-4"
          >
            {shipping.showNewForm ? '← Utiliser une adresse existante' : '+ Ajouter une nouvelle adresse'}
          </button>

          {/* New Address Form */}
          {shipping.showNewForm && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nom de l'entreprise *</label>
                  <input
                    type="text"
                    value={shipping.newAddress.company_name}
                    onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, company_name: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">À l'attention de *</label>
                  <input
                    type="text"
                    value={shipping.newAddress.attention}
                    onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, attention: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Adresse *</label>
                <input
                  type="text"
                  value={shipping.newAddress.address_line1}
                  onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, address_line1: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Code Postal *</label>
                  <input
                    type="text"
                    value={shipping.newAddress.postal_code}
                    onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, postal_code: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ville *</label>
                  <input
                    type="text"
                    value={shipping.newAddress.city}
                    onChange={e => setShipping({ ...shipping, newAddress: { ...shipping.newAddress, city: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
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
            disabled={saving}
            className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? (uploadingPhotos ? 'Envoi des photos...' : 'Envoi en cours...') : 'Soumettre la Commande'}
          </button>
        </div>
      </form>
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

  // Load saved equipment on mount
  useEffect(() => {
    const loadEquipment = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', profile.company_id)
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
      device_type: ''
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
      device_type: equip.equipment_type || ''
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
      device_type: equip.equipment_type || ''
    }));
    
    setDevices(newDevices);
    notify(`${newDevices.length} appareils chargés`, 'success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate devices
    for (const d of devices) {
      if (!d.serial_number || !d.model_name) {
        notify('Veuillez remplir le numéro de série et le modèle pour chaque appareil', 'error');
        return;
      }
    }

    if (devices.length === 0) {
      notify('Veuillez ajouter au moins un appareil', 'error');
      return;
    }

    setSaving(true);

    try {
      // Generate contract number manually (no RPC needed)
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      const contractNum = `CTR-${year}-${timestamp}`;
      
      // Create contract with only columns that exist
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: profile.company_id,
          status: 'requested',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
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
        tokens_total: 1,
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

        <form onSubmit={handleSubmit}>
          {/* Device Count Summary */}
          <div className="mb-4 text-sm text-gray-600">
            <span className="font-bold text-[#1E3A5F]">{devices.length}</span> appareil{devices.length > 1 ? 's' : ''} dans la demande
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
              placeholder="Précisions sur votre demande de contrat (fréquence souhaitée, conditions particulières, etc.)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
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
              {saving ? 'Envoi en cours...' : `Soumettre la demande (${devices.length} appareil${devices.length > 1 ? 's' : ''})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// SHIPPING SECTION (Reusable)
// ============================================
function ShippingSection({ shipping, setShipping, addresses, profile, notify, refresh }) {
  // Check if selected address is outside France Metropolitan
  const selectedAddress = addresses.find(a => a.id === shipping.address_id);
  const isOutsideMetro = selectedAddress ? isOutsideFranceMetropolitan(selectedAddress.postal_code) : false;
  const newAddressIsOutsideMetro = shipping.showNewForm && shipping.newAddress.postal_code && isOutsideFranceMetropolitan(shipping.newAddress.postal_code);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-[#1E3A5F] mb-4 pb-4 border-b-2 border-[#E8F2F8]">
        Information de Livraison
      </h2>

      {/* Number of Parcels - FIRST */}
      <div className="mb-6 p-4 bg-[#E8F2F8] rounded-lg border border-[#3B7AB4]/30">
        <label className="block text-sm font-bold text-[#1E3A5F] mb-2">
          📦 Nombre de colis *
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Indiquez le nombre de colis/boîtes dans lesquels vous enverrez vos appareils.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShipping({ ...shipping, parcels: Math.max(0, (shipping.parcels || 0) - 1) })}
            className="w-10 h-10 rounded-lg bg-white border border-gray-300 text-gray-600 font-bold hover:bg-gray-50"
          >
            −
          </button>
          <input
            type="number"
            min="0"
            value={shipping.parcels || 0}
            onChange={e => setShipping({ ...shipping, parcels: Math.max(0, parseInt(e.target.value) || 0) })}
            className={`w-20 px-3 py-2 text-center border rounded-lg font-bold text-lg ${
              (shipping.parcels || 0) === 0 ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
          />
          <button
            type="button"
            onClick={() => setShipping({ ...shipping, parcels: (shipping.parcels || 0) + 1 })}
            className="w-10 h-10 rounded-lg bg-white border border-gray-300 text-gray-600 font-bold hover:bg-gray-50"
          >
            +
          </button>
          <span className="text-gray-600 ml-2">colis</span>
        </div>
        {(shipping.parcels || 0) === 0 && (
          <p className="text-red-600 text-sm mt-2 font-medium">⚠️ Veuillez indiquer le nombre de colis</p>
        )}
      </div>

      {/* Existing Addresses */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">Adresse de Retour *</label>
        
        {addresses.length > 0 ? (
          <div className="space-y-2 mb-4">
            {addresses.map(addr => {
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
              <input
                type="text"
                value={shipping.newAddress.company_name || ''}
                onChange={e => setShipping({
                  ...shipping,
                  newAddress: { ...shipping.newAddress, company_name: e.target.value }
                })}
                placeholder="ex: Lighthouse France"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Adresse *</label>
              <input
                type="text"
                value={shipping.newAddress.address_line1}
                onChange={e => setShipping({
                  ...shipping,
                  newAddress: { ...shipping.newAddress, address_line1: e.target.value }
                })}
                placeholder="ex: 16 Rue Paul Séjourne"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">À l'attention de *</label>
              <input
                type="text"
                value={shipping.newAddress.attention || ''}
                onChange={e => setShipping({
                  ...shipping,
                  newAddress: { ...shipping.newAddress, attention: e.target.value }
                })}
                placeholder="Nom du destinataire"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Code Postal *</label>
              <input
                type="text"
                value={shipping.newAddress.postal_code}
                onChange={e => setShipping({
                  ...shipping,
                  newAddress: { ...shipping.newAddress, postal_code: e.target.value }
                })}
                placeholder="ex: 94000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ville *</label>
              <input
                type="text"
                value={shipping.newAddress.city}
                onChange={e => setShipping({
                  ...shipping,
                  newAddress: { ...shipping.newAddress, city: e.target.value }
                })}
                placeholder="ex: Créteil"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Nom de l'adresse (pour référence)</label>
              <input
                type="text"
                value={shipping.newAddress.label}
                onChange={e => setShipping({
                  ...shipping,
                  newAddress: { ...shipping.newAddress, label: e.target.value }
                })}
                placeholder="ex: Bureau Principal, Labo 2, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
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
function DeviceCard({ device, updateDevice, updateDeviceMultiple, toggleAccessory, removeDevice, canRemove, savedEquipment, loadFromSaved, addresses, defaultAddressId }) {
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

        {/* Save Device Option */}
        {!device.fromSaved && (
          <div className="md:col-span-2 mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={device.saveDevice || false}
                onChange={e => updateDevice(device.id, 'saveDevice', e.target.checked)}
                className="w-5 h-5 rounded border-green-400 text-green-600"
              />
              <div>
                <span className="font-medium text-green-800">💾 Enregistrer cet appareil</span>
                <p className="text-xs text-green-600">Pour le retrouver facilement lors de vos prochaines demandes</p>
              </div>
            </label>
          </div>
        )}

        {device.fromSaved && (
          <div className="md:col-span-2 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">✓ Appareil chargé depuis vos équipements enregistrés</p>
          </div>
        )}

        {/* Per-Device Shipping Address */}
        {addresses && addresses.length > 1 && (
          <div className="md:col-span-2 mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <label className="flex items-center gap-3 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={showDifferentAddress}
                onChange={e => {
                  setShowDifferentAddress(e.target.checked);
                  if (!e.target.checked) {
                    updateDevice(device.id, 'shipping_address_id', null);
                  }
                }}
                className="w-5 h-5 rounded border-amber-400 text-amber-600"
              />
              <div>
                <span className="font-medium text-amber-800">📍 Envoyer à une adresse différente</span>
                <p className="text-xs text-amber-600">Cet appareil sera retourné à une autre adresse</p>
              </div>
            </label>
            
            {showDifferentAddress && (
              <select
                value={device.shipping_address_id || ''}
                onChange={e => updateDevice(device.id, 'shipping_address_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white mt-2"
              >
                <option value="">-- Sélectionner une adresse --</option>
                {addresses.map(addr => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label} - {addr.city} {addr.is_default ? '(Par défaut)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SETTINGS PAGE
// ============================================
function SettingsPage({ profile, addresses, t, notify, refresh }) {
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
    billing_postal_code: profile?.companies?.billing_postal_code || '',
    siret: profile?.companies?.siret || '',
    vat_number: profile?.companies?.vat_number || ''
  });
  
  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '', new: '', confirm: ''
  });
  
  // Address management
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [newAddress, setNewAddress] = useState({
    label: '', attention: '', address_line1: '', address_line2: '', city: '', postal_code: '', country: 'France', phone: '', is_default: false
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
  const [inviteData, setInviteData] = useState({ email: '', role: 'customer' });
  const [loadingTeam, setLoadingTeam] = useState(false);
  
  const [saving, setSaving] = useState(false);
  
  // Check if user is admin
  const isAdmin = profile?.role === 'admin';
  
  // Load team members
  useEffect(() => {
    const loadTeam = async () => {
      if (!profile?.company_id || !isAdmin) return;
      setLoadingTeam(true);
      
      // Load team members
      const { data: members } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, invitation_status, created_at')
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
      
      if (invites) setPendingInvites(invites);
      setLoadingTeam(false);
    };
    loadTeam();
  }, [profile?.company_id, isAdmin]);

  // Invite team member
  const inviteTeamMember = async (e) => {
    e.preventDefault();
    if (!inviteData.email) {
      notify('Veuillez entrer un email', 'error');
      return;
    }
    
    setSaving(true);
    
    // Generate invite token
    const token = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
    
    const { error } = await supabase.from('team_invitations').insert({
      company_id: profile.company_id,
      email: inviteData.email.toLowerCase(),
      role: inviteData.role,
      invited_by: profile.id,
      token,
      expires_at: expiresAt.toISOString()
    });
    
    setSaving(false);
    
    if (error) {
      if (error.code === '23505') {
        notify('Une invitation pour cet email existe déjà', 'error');
      } else {
        notify(`Erreur: ${error.message}`, 'error');
      }
      return;
    }
    
    notify(`Invitation envoyée à ${inviteData.email}!`);
    setShowInviteModal(false);
    setInviteData({ email: '', role: 'customer' });
    
    // Reload invites
    const { data: invites } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('company_id', profile.company_id)
      .is('accepted_at', null);
    if (invites) setPendingInvites(invites);
  };

  // Change team member role
  const changeRole = async (memberId, newRole) => {
    if (memberId === profile.id) {
      notify('Vous ne pouvez pas modifier votre propre rôle', 'error');
      return;
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId);
    
    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify('Rôle modifié!');
      setTeamMembers(teamMembers.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    }
  };

  // Deactivate/reactivate team member
  const toggleMemberStatus = async (memberId, currentStatus) => {
    if (memberId === profile.id) {
      notify('Vous ne pouvez pas désactiver votre propre compte', 'error');
      return;
    }
    
    const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    const { error } = await supabase
      .from('profiles')
      .update({ invitation_status: newStatus })
      .eq('id', memberId);
    
    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify(newStatus === 'active' ? 'Compte réactivé!' : 'Compte désactivé!');
      setTeamMembers(teamMembers.map(m => m.id === memberId ? { ...m, invitation_status: newStatus } : m));
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
    if (passwordData.new.length < 6) {
      notify('Le mot de passe doit contenir au moins 6 caractères', 'error');
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
    setNewAddress({ label: '', attention: '', address_line1: '', address_line2: '', city: '', postal_code: '', country: 'France', phone: '', is_default: false });
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
      attention: addr.attention || '',
      address_line1: addr.address_line1 || '',
      address_line2: addr.address_line2 || '',
      city: addr.city || '',
      postal_code: addr.postal_code || '',
      country: addr.country || 'France',
      phone: addr.phone || '',
      is_default: addr.is_default || false
    });
    setShowAddAddress(true);
  };

  const sections = [
    { id: 'profile', label: 'Profil', icon: '👤' },
    { id: 'company', label: 'Entreprise', icon: '🏢' },
    ...(isAdmin ? [{ id: 'team', label: 'Équipe', icon: '👥' }] : []),
    { id: 'addresses', label: 'Adresses', icon: '📍' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Sécurité', icon: '🔒' }
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Informations entreprise</h2>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                    <input
                      type="text"
                      value={companyData.siret}
                      onChange={e => setCompanyData({ ...companyData, siret: e.target.value })}
                      placeholder="123 456 789 00012"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° TVA</label>
                    <input
                      type="text"
                      value={companyData.vat_number}
                      onChange={e => setCompanyData({ ...companyData, vat_number: e.target.value })}
                      placeholder="FR12345678901"
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
                        billing_postal_code: profile?.companies?.billing_postal_code || '',
                        siret: profile?.companies?.siret || '',
                        vat_number: profile?.companies?.vat_number || ''
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
                  <p className="text-sm text-gray-500">Adresse de facturation</p>
                  <p className="font-medium text-[#1E3A5F]">
                    {profile?.companies?.billing_address || '—'}
                    {profile?.companies?.billing_postal_code && `, ${profile?.companies?.billing_postal_code}`}
                    {profile?.companies?.billing_city && ` ${profile?.companies?.billing_city}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">SIRET</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.companies?.siret || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">N° TVA</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.companies?.vat_number || '—'}</p>
                </div>
              </div>
            )}
          </div>
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
                  <h3 className="font-medium text-[#1E3A5F] mb-3">Membres actifs ({teamMembers.filter(m => m.invitation_status !== 'deactivated').length})</h3>
                  <div className="space-y-3">
                    {teamMembers.filter(m => m.invitation_status !== 'deactivated').map(member => (
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
                              </p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={member.role || 'customer'}
                              onChange={e => changeRole(member.id, e.target.value)}
                              disabled={member.id === profile.id}
                              className={`px-3 py-1.5 border rounded-lg text-sm ${
                                member.role === 'admin' ? 'bg-purple-50 border-purple-300 text-purple-700' :
                                member.role === 'technician' ? 'bg-blue-50 border-blue-300 text-blue-700' :
                                'bg-gray-50 border-gray-300 text-gray-700'
                              } ${member.id === profile.id ? 'opacity-50' : ''}`}
                            >
                              <option value="admin">👑 Admin</option>
                              <option value="technician">📋 Technicien</option>
                              <option value="customer">👤 Utilisateur</option>
                            </select>
                            {member.id !== profile.id && (
                              <button
                                onClick={() => toggleMemberStatus(member.id, member.invitation_status)}
                                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                              >
                                Désactiver
                              </button>
                            )}
                          </div>
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
                              Rôle: {invite.role === 'admin' ? 'Admin' : invite.role === 'technician' ? 'Technicien' : 'Utilisateur'}
                              {' • '}Expire: {new Date(invite.expires_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <button
                            onClick={() => cancelInvite(invite.id)}
                            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                          >
                            Annuler
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Role Explanation */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Niveaux d'accès</h4>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-purple-700">👑 Admin</p>
                      <p className="text-gray-500">Accès complet, gestion des utilisateurs et paramètres</p>
                    </div>
                    <div>
                      <p className="font-medium text-blue-700">📋 Technicien</p>
                      <p className="text-gray-500">Voir toutes les demandes, créer des demandes</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">👤 Utilisateur</p>
                      <p className="text-gray-500">Voir uniquement ses propres demandes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Addresses Section */}
      {activeSection === 'addresses' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#1E3A5F]">Adresses de livraison</h2>
              <p className="text-sm text-gray-500">Gérez vos adresses pour la réception et le retour des équipements</p>
            </div>
            <button
              onClick={() => {
                setEditingAddress(null);
                setNewAddress({ label: '', attention: '', address_line1: '', address_line2: '', city: '', postal_code: '', country: 'France', phone: '', is_default: false });
                setShowAddAddress(true);
              }}
              className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F]"
            >
              + Ajouter une adresse
            </button>
          </div>
          
          <div className="p-6">
            {addresses.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">📍</p>
                <p>Aucune adresse enregistrée</p>
                <p className="text-sm">Ajoutez une adresse pour vos livraisons</p>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map(addr => (
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
      )}

      {/* Notifications Section */}
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
            
            {/* Danger Zone */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-medium text-red-600 mb-4">Zone de danger</h3>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="font-medium text-red-700">Supprimer le compte</p>
                <p className="text-sm text-red-600 mb-3">Cette action est irréversible. Toutes vos données seront supprimées.</p>
                <button className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-100">
                  Supprimer mon compte
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
                {editingAddress ? 'Modifier l\'adresse' : 'Ajouter une adresse'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">À l'attention de</label>
                <input
                  type="text"
                  value={newAddress.attention}
                  onChange={e => setNewAddress({ ...newAddress, attention: e.target.value })}
                  placeholder="Nom du contact"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={newAddress.phone}
                  onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                  placeholder="+33 1 23 45 67 89"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                />
              </div>
              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={newAddress.is_default}
                  onChange={e => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                  className="w-4 h-4 text-[#3B7AB4]"
                />
                <span className="text-sm">Définir comme adresse par défaut</span>
              </label>
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
                <p className="text-xs text-gray-400 mt-1">Un email d'invitation sera envoyé à cette adresse</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                <select
                  value={inviteData.role}
                  onChange={e => setInviteData({ ...inviteData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4]"
                >
                  <option value="customer">👤 Utilisateur - Voir ses propres demandes</option>
                  <option value="technician">📋 Technicien - Voir toutes les demandes</option>
                  <option value="admin">👑 Admin - Accès complet</option>
                </select>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> L'utilisateur recevra un email avec un lien pour créer son compte et rejoindre votre entreprise.
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteData({ email: '', role: 'customer' });
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
                  {saving ? 'Envoi...' : 'Envoyer l\'invitation'}
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

  // Load equipment
  useEffect(() => {
    const loadEquipment = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', profile.company_id)
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
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify('Équipement supprimé');
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
                <p className="text-2xl font-bold">{selectedDevice.model_name}</p>
                <p className="font-mono text-lg mt-1">{selectedDevice.serial_number}</p>
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
  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
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
          {[...equipment]
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
function RequestDetail({ request, profile, t, setPage, notify, refresh, previousPage = 'dashboard' }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [shippingAddress, setShippingAddress] = useState(null);
  const [attachments, setAttachments] = useState([]);
  
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
  
  // Quote review state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [approvingQuote, setApprovingQuote] = useState(false);
  
  const style = STATUS_STYLES[request.status] || STATUS_STYLES.submitted;
  const isPartsOrder = request.request_type === 'parts';
  const isQuoteSent = request.status === 'quote_sent';
  const needsQuoteAction = isQuoteSent && !request.bc_submitted_at;
  const needsCustomerAction = ['approved', 'waiting_bc', 'waiting_po', 'waiting_customer', 'inspection_complete', 'bc_rejected'].includes(request.status) && request.status !== 'bc_review' && !request.bc_submitted_at;
  
  // Check if submission is valid - need EITHER file OR signature (not both required)
  const hasFile = bcFile !== null;
  const hasSignature = signatureData && luEtApprouve.toLowerCase().trim() === 'lu et approuvé';
  const isSubmissionValid = signatureName.trim().length > 0 && acceptTerms && (hasFile || hasSignature);

  // Quote approval/revision handlers
  const handleApproveQuote = async () => {
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
    const { error } = await supabase.from('service_requests').update({
      status: 'quote_revision_requested',
      quote_revision_notes: revisionNotes,
      quote_revision_requested_at: new Date().toISOString()
    }).eq('id', request.id);
    
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
      
      // Load shipping address
      if (request.shipping_address_id) {
        const { data: addr } = await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('id', request.shipping_address_id)
          .single();
        if (addr) setShippingAddress(addr);
      }
    };
    loadData();
  }, [request.id, request.shipping_address_id]);

  // Submit BC / Approval
  const submitBonCommande = async () => {
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
          const fileName = `bc_${request.id}_${Date.now()}.${bcFile.name.split('.').pop()}`;
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
          const signatureFileName = `signature_${request.id}_${Date.now()}.png`;
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
      
      // Generate signed quote PDF - use correct generator based on request type
      let signedQuotePdfUrl = null;
      if (hasValidSignature) {
        try {
          console.log('📄 Generating signed quote PDF...');
          
          // Check if this is a parts order
          const isPartsRequest = request.request_type === 'parts';
          
          const pdfBlob = isPartsRequest 
            ? await generatePartsQuotePDF({
                request,
                isSigned: true,
                signatureName: signatureName,
                signatureDate: new Date(signatureDateISO).toLocaleDateString('fr-FR'),
                signatureImage: signatureData
              })
            : await generateQuotePDF({
                request,
                isSigned: true,
                signatureName: signatureName,
                signatureDate: new Date(signatureDateISO).toLocaleDateString('fr-FR'),
                signatureImage: signatureData
              });
          
          console.log('📄 PDF blob generated, size:', pdfBlob?.size);
          
          const pdfFileName = `devis_signe_${request.request_number}_${Date.now()}.pdf`;
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
      // Also record quote approval if coming from quote_sent status
      const updatePayload = { 
        status: 'bc_review',
        bc_submitted_at: new Date().toISOString(),
        bc_signed_by: signatureName,
        bc_signature_date: signatureDateISO,
        bc_file_url: fileUrl,
        bc_signature_url: signatureUrl,
        quote_approved_at: request.status === 'quote_sent' ? new Date().toISOString() : request.quote_approved_at
      };
      
      console.log('📝 Updating service_request with:', updatePayload);
      
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
      if (fileUrl) {
        const { error: bcAttachError } = await supabase.from('request_attachments').insert({
          request_id: request.id,
          file_name: bcFile?.name || 'Bon de Commande.pdf',
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
          file_name: `Devis_Signé_${request.request_number}.pdf`,
          file_url: signedQuotePdfUrl,
          file_type: 'application/pdf',
          file_size: 0,
          uploaded_by: profile.id,
          category: 'devis_signe'
        });
        console.log('📎 Signed PDF attachment saved:', { signedQuotePdfUrl, error: pdfAttachError });
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
      notify('Erreur: ' + error.message, 'error');
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
          
          {/* Per-Device Progress Bars */}
          {!isPartsOrder && (request.request_devices || []).length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase font-medium">Suivi par appareil</p>
              {(request.request_devices || []).map((device, idx) => {
                const deviceServiceType = device.service_type || request.requested_service;
                
                // For early steps (before received), use RMA status
                // For later steps (received onwards), use device status independently
                const earlyStatuses = ['submitted', 'pending', 'quote_sent', 'quote_revision_requested', 
                                       'bc_pending', 'bc_review', 'waiting_bc', 'waiting_device'];
                const rmaIsEarly = earlyStatuses.includes(request.status);
                
                // If RMA is still in early stages, all devices show RMA status
                // Once RMA moves past waiting_device, each device tracks independently
                const effectiveStatus = rmaIsEarly ? request.status : (device.status || request.status);
                
                return (
                  <div key={device.id || idx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{device.model_name || device.model || 'Appareil'}</span>
                        <span className="text-xs text-gray-500 font-mono">SN: {device.serial_number || '—'}</span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                        {deviceServiceType === 'calibration' ? '🔬 Étalonnage' : 
                         deviceServiceType === 'repair' ? '🔧 Réparation' : 
                         deviceServiceType === 'calibration_repair' || deviceServiceType === 'cal_repair' ? '🔬+🔧 Étal. & Rép.' :
                         deviceServiceType}
                      </span>
                    </div>
                    <StepProgress status={effectiveStatus} serviceType={deviceServiceType} />
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Fallback: Single progress bar if no devices */}
          {!isPartsOrder && (request.request_devices || []).length === 0 && (
            <div className="mt-4">
              <StepProgress status={request.status} serviceType={request.requested_service} />
            </div>
          )}
        </div>

        {/* Quote Sent - Review Required */}
        {needsQuoteAction && (
          <div className="bg-blue-50 border-b border-blue-300 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-2xl">💰</span>
                </div>
                <div>
                  <p className="font-bold text-blue-800 text-lg">Devis reçu - Action requise</p>
                  <p className="text-sm text-blue-600">
                    Examinez le devis, puis approuvez et soumettez votre bon de commande
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
        {(request.status === 'bc_review' || request.bc_submitted_at) && request.status !== 'waiting_device' && !['received', 'in_queue', 'calibration_in_progress', 'repair_in_progress', 'shipped', 'completed'].includes(request.status) && (
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

        {/* Quote Review Modal */}
        {showQuoteModal && (() => {
          const quoteData = request.quote_data || {};
          
          // Check if this is a parts order
          if (isPartsOrder) {
            // Parts Order Quote Modal - A4 Paper Layout
            const parts = quoteData.parts || [];
            const shipping = quoteData.shipping || { parcels: 1, unitPrice: 45, total: 45 };
            const partsTotal = quoteData.partsTotal || parts.reduce((sum, p) => sum + (p.lineTotal || 0), 0);
            const grandTotal = quoteData.grandTotal || (partsTotal + (shipping.total || 0));
            
            return (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-300 rounded-xl w-full max-w-4xl my-4" onClick={e => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-amber-600 text-white px-6 py-4 flex justify-between items-center z-10 rounded-t-xl">
                    <div>
                      <h2 className="text-xl font-bold">Devis Pièces Détachées</h2>
                      <p className="text-amber-200">{request.request_number || 'En attente'}</p>
                    </div>
                    <button onClick={() => setShowQuoteModal(false)} className="text-amber-200 hover:text-white text-2xl">&times;</button>
                  </div>

                  {/* A4 Paper Container */}
                  <div className="p-6">
                    <div className="bg-white shadow-2xl mx-auto flex flex-col" style={{ width: '210mm', minHeight: '297mm', maxWidth: '100%' }}>
                      
                      {/* Quote Header */}
                      <div className="px-8 pt-8 pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <img 
                              src="/images/logos/lighthouse-logo.png" 
                              alt="Lighthouse France" 
                              className="h-14 w-auto mb-1"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div style={{ display: 'none' }}>
                              <h1 className="text-2xl font-bold text-[#1a1a2e]">LIGHTHOUSE</h1>
                              <p className="text-gray-500">France</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-amber-600">DEVIS PIÈCES</p>
                            <p className="text-gray-500 font-mono">{quoteData.quoteRef || request.request_number}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Amber accent line */}
                      <div className="h-1.5 bg-amber-500"></div>
                      
                      {/* Date bar */}
                      <div className="bg-gray-100 px-8 py-3 flex justify-between text-sm">
                        <div>
                          <span className="text-gray-500">Date: </span>
                          <span className="font-medium">{quoteData.createdAt ? new Date(quoteData.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Validité: </span>
                          <span className="font-medium">30 jours</span>
                        </div>
                      </div>
                      
                      {/* Client Info */}
                      <div className="px-8 py-4 border-b">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Client</p>
                        <p className="font-bold text-lg text-[#1a1a2e]">{request.companies?.name}</p>
                        {request.companies?.billing_address && (
                          <p className="text-gray-600">{request.companies.billing_address}</p>
                        )}
                        <p className="text-gray-600">{request.companies?.billing_postal_code} {request.companies?.billing_city}</p>
                      </div>
                      
                      {/* Main content area - flex-1 to push footer down */}
                      <div className="px-8 py-6 flex-1">
                        {/* Parts Table */}
                        <h3 className="font-bold text-[#1a1a2e] mb-3">Pièces Commandées</h3>
                        <table className="w-full border-collapse mb-6">
                          <thead>
                            <tr className="bg-[#1a1a2e] text-white">
                              <th className="px-4 py-3 text-left text-sm w-16">Qté</th>
                              <th className="px-4 py-3 text-left text-sm">Référence</th>
                              <th className="px-4 py-3 text-left text-sm">Désignation</th>
                              <th className="px-4 py-3 text-right text-sm w-24">Prix Unit.</th>
                              <th className="px-4 py-3 text-right text-sm w-24">Total HT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parts.map((part, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 border-b border-gray-200">{part.quantity}</td>
                                <td className="px-4 py-3 border-b border-gray-200 font-mono text-sm">{part.partNumber || '—'}</td>
                                <td className="px-4 py-3 border-b border-gray-200">{part.description}</td>
                                <td className="px-4 py-3 border-b border-gray-200 text-right">{(part.unitPrice || 0).toFixed(2)} €</td>
                                <td className="px-4 py-3 border-b border-gray-200 text-right font-medium">{(part.lineTotal || 0).toFixed(2)} €</td>
                              </tr>
                            ))}
                            {shipping.total > 0 && (
                              <tr className="bg-blue-50">
                                <td className="px-4 py-3 border-b border-blue-200">{shipping.parcels}</td>
                                <td className="px-4 py-3 border-b border-blue-200 font-mono text-sm">Shipping</td>
                                <td className="px-4 py-3 border-b border-blue-200 text-blue-800">Frais de port ({shipping.parcels} colis)</td>
                                <td className="px-4 py-3 border-b border-blue-200 text-right">{(shipping.unitPrice || 0).toFixed(2)} €</td>
                                <td className="px-4 py-3 border-b border-blue-200 text-right font-medium">{(shipping.total || 0).toFixed(2)} €</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-amber-500 text-white">
                              <td colSpan={4} className="px-4 py-3 text-right font-bold">TOTAL HT</td>
                              <td className="px-4 py-3 text-right font-bold text-lg">{grandTotal.toFixed(2)} €</td>
                            </tr>
                          </tfoot>
                        </table>
                        
                        {/* Conditions */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-8">
                          <p className="font-bold text-[#1a1a2e] text-sm mb-2">Conditions:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Devis valable 30 jours</li>
                            <li>• Paiement: 30 jours fin de mois</li>
                            <li>• Livraison: Sous réserve de disponibilité</li>
                          </ul>
                        </div>
                        
                        {/* Signature Section */}
                        <div className="flex justify-between items-end pt-6 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Établi par</p>
                            <p className="font-bold text-lg text-[#1a1a2e]">{quoteData.createdBy || 'Lighthouse France'}</p>
                            <p className="text-gray-500">Lighthouse France</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Bon pour accord</p>
                            <div className="w-48 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                              <span className="text-gray-300 text-sm">Signature et cachet</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="bg-[#1a1a2e] text-white px-8 py-4 text-center">
                        <p className="font-medium">Lighthouse France SAS</p>
                        <p className="text-gray-400 text-sm">16, rue Paul Séjourné • 94000 CRÉTEIL • Tél. 01 43 77 28 07</p>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="sticky bottom-0 bg-gray-100 px-6 py-4 border-t flex justify-between items-center rounded-b-xl">
                    <button
                      onClick={() => setShowQuoteModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Fermer
                    </button>
                    {request.status === 'quote_sent' && (
                      <button
                        onClick={() => { setShowQuoteModal(false); setShowBCModal(true); }}
                        className="px-6 py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008f45]"
                      >
                        ✅ Approuver et soumettre BC
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          
          // RMA Quote Modal (existing code)
          const devices = quoteData.devices || request.request_devices || [];
          
          // Detect required sections from quote_data or devices
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

          const servicesSubtotal = quoteData.servicesSubtotal || request.quote_subtotal || 0;
          
          // Check if fully contract covered
          const isFullyContractCovered = devices.length > 0 && devices.every(d => d.isContractCovered);
          const shippingTotal = isFullyContractCovered ? 0 : (quoteData.shippingTotal || request.quote_shipping || 0);
          const grandTotal = isFullyContractCovered ? 0 : (quoteData.grandTotal || request.quote_total || 0);

          return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#1a1a2e] text-white px-6 py-4 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-xl font-bold">Offre de Prix</h2>
                  <p className="text-gray-400">{request.request_number}</p>
                </div>
                <button onClick={() => setShowQuoteModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
              </div>

              {/* Quote Document - This prints */}
              <div id="quote-print-content">
                {/* Quote Header */}
                <div className="px-8 pt-8 pb-4 border-b-4 border-[#00A651]">
                  <div className="flex justify-between items-start">
                    <div>
                      <img 
                        src="/images/logos/lighthouse-logo.png" 
                        alt="Lighthouse France" 
                        className="h-14 w-auto mb-1"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div className="hidden">
                        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a2e]">LIGHTHOUSE</h1>
                        <p className="text-gray-500">Worldwide Solutions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#00A651]">OFFRE DE PRIX</p>
                      <p className="text-gray-500">N° {request.request_number}</p>
                    </div>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="bg-gray-100 px-8 py-3 flex justify-between text-sm border-b">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Date</p>
                    <p className="font-medium">{request.quoted_at ? new Date(request.quoted_at).toLocaleDateString('fr-FR') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Validité</p>
                    <p className="font-medium">30 jours</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Conditions</p>
                    <p className="font-medium">À réception de facture</p>
                  </div>
                </div>

                {/* Client Info */}
                <div className="px-8 py-4 border-b">
                  <p className="text-xs text-gray-500 uppercase">Client</p>
                  <p className="font-bold text-xl text-[#1a1a2e]">{request.companies?.name}</p>
                  {request.companies?.billing_address && <p className="text-gray-600">{request.companies?.billing_address}</p>}
                  <p className="text-gray-600">{request.companies?.billing_postal_code} {request.companies?.billing_city}</p>
                </div>

                {/* SERVICE DESCRIPTION SECTIONS */}
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
                              <span className="text-[#00A651] mt-1">▸</span>
                              <span>{p}</span>
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
                            <span className="text-orange-500 mt-1">▸</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* DETAILED PRICING BREAKDOWN TABLE - Qté | Désignation | Prix Unit. | Total HT */}
                <div className="px-8 py-6 bg-gray-50">
                  <h3 className="font-bold text-lg text-[#1a1a2e] mb-4">Récapitulatif des Prix</h3>
                  
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1a1a2e] text-white">
                        <th className="px-3 py-3 text-center w-12">Qté</th>
                        <th className="px-3 py-3 text-left">Désignation</th>
                        <th className="px-3 py-3 text-right w-24">Prix Unit.</th>
                        <th className="px-3 py-3 text-right w-24">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((device, i) => {
                        const rows = [];
                        
                        // Calibration row
                        if (device.needsCalibration || (device.serviceType || device.service_type || '').includes('calibration')) {
                          const qty = device.calibrationQty || 1;
                          const unitPrice = parseFloat(device.calibrationPrice) || 0;
                          const lineTotal = qty * unitPrice;
                          const isContract = device.isContractCovered;
                          rows.push(
                            <tr key={`${i}-cal`} className={rows.length % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 text-center">{qty}</td>
                              <td className="px-3 py-2">
                                Étalonnage {device.model || device.model_name || ''} (SN: {device.serial || device.serial_number || ''})
                                {isContract && <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded">CONTRAT</span>}
                              </td>
                              <td className="px-3 py-2 text-right">{isContract ? <span className="text-emerald-600">Contrat</span> : `${unitPrice.toFixed(2)} €`}</td>
                              <td className="px-3 py-2 text-right font-medium">{isContract ? <span className="text-emerald-600">Contrat</span> : `${lineTotal.toFixed(2)} €`}</td>
                            </tr>
                          );
                        }
                        
                        // Nettoyage row
                        if (device.needsNettoyage && !device.isContractCovered && device.nettoyagePrice > 0) {
                          const qty = device.nettoyageQty || 1;
                          const unitPrice = parseFloat(device.nettoyagePrice) || 0;
                          const lineTotal = qty * unitPrice;
                          rows.push(
                            <tr key={`${i}-nettoyage`} className={rows.length % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 text-center">{qty}</td>
                              <td className="px-3 py-2">Nettoyage cellule - si requis selon l'état du capteur</td>
                              <td className="px-3 py-2 text-right">{unitPrice.toFixed(2)} €</td>
                              <td className="px-3 py-2 text-right font-medium">{lineTotal.toFixed(2)} €</td>
                            </tr>
                          );
                        }
                        
                        // Repair row
                        if (device.needsRepair || (device.serviceType || device.service_type || '').includes('repair')) {
                          const qty = device.repairQty || 1;
                          const unitPrice = parseFloat(device.repairPrice) || 0;
                          const lineTotal = qty * unitPrice;
                          rows.push(
                            <tr key={`${i}-repair`} className={rows.length % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 text-center">{qty}</td>
                              <td className="px-3 py-2">Réparation {device.model || device.model_name || ''} (SN: {device.serial || device.serial_number || ''})</td>
                              <td className="px-3 py-2 text-right">{unitPrice.toFixed(2)} €</td>
                              <td className="px-3 py-2 text-right font-medium">{lineTotal.toFixed(2)} €</td>
                            </tr>
                          );
                        }
                        
                        // Additional parts
                        (device.additionalParts || []).forEach((part, pi) => {
                          const qty = parseInt(part.quantity) || 1;
                          const unitPrice = parseFloat(part.price) || 0;
                          const lineTotal = qty * unitPrice;
                          rows.push(
                            <tr key={`${i}-part-${pi}`} className={rows.length % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 text-center">{qty}</td>
                              <td className="px-3 py-2">
                                {part.partNumber && <span className="text-gray-500 mr-1">[{part.partNumber}]</span>}
                                {part.description || 'Pièce/Service'}
                              </td>
                              <td className="px-3 py-2 text-right">{unitPrice.toFixed(2)} €</td>
                              <td className="px-3 py-2 text-right font-medium">{lineTotal.toFixed(2)} €</td>
                            </tr>
                          );
                        });
                        
                        return rows;
                      })}
                      
                      {/* Shipping row */}
                      <tr className={isFullyContractCovered ? "bg-emerald-50" : "bg-gray-100"}>
                        <td className="px-3 py-2 text-center">{quoteData.shipping?.parcels || request.parcels_count || 1}</td>
                        <td className="px-3 py-2">Frais de port ({quoteData.shipping?.parcels || request.parcels_count || 1} colis)</td>
                        <td className="px-3 py-2 text-right">
                          {isFullyContractCovered ? <span className="text-emerald-600">Contrat</span> : `${(quoteData.shipping?.unitPrice || 45).toFixed(2)} €`}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {isFullyContractCovered ? <span className="text-emerald-600">Contrat</span> : `${shippingTotal.toFixed(2)} €`}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className={isFullyContractCovered ? "bg-emerald-600 text-white" : "bg-[#00A651] text-white"}>
                        <td colSpan={2} className="px-3 py-4"></td>
                        <td className="px-3 py-4 text-right font-bold text-lg">TOTAL HT</td>
                        <td className="px-3 py-4 text-right font-bold text-xl">
                          {isFullyContractCovered ? 'Contrat' : `${grandTotal.toFixed(2)} €`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  
                  {/* Nettoyage disclaimer */}
                  {devices.some(d => d.needsNettoyage && !d.isContractCovered) && (
                    <p className="text-xs text-gray-500 mt-3 italic">
                      * Le nettoyage cellule sera facturé uniquement si nécessaire selon l'état du capteur à réception.
                    </p>
                  )}
                </div>

                {/* Disclaimers */}
                <div className="px-8 py-4 border-t">
                  <p className="text-xs text-gray-500 uppercase mb-2">Conditions</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {QUOTE_DISCLAIMERS.map((d, i) => (
                      <li key={i}>• {d}</li>
                    ))}
                  </ul>
                </div>

                {/* Signature Section */}
                <div className="px-8 py-6 border-t flex justify-between items-end">
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Établi par</p>
                      <p className="font-bold text-lg">{quoteData.createdBy || 'Lighthouse France'}</p>
                      <p className="text-gray-600">Lighthouse France</p>
                    </div>
                    {/* Capcert Logo */}
                    <img 
                      src="/images/logos/capcert-logo.png" 
                      alt="Capcert Certification" 
                      className="h-14 w-auto"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  
                  {request.bc_submitted_at ? (
                    <div className="text-right">
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <p className="text-xs text-green-600 uppercase mb-1">Approuve</p>
                        <p className="font-bold text-green-800">{request.bc_signed_by || 'Client'}</p>
                        <p className="text-sm text-green-700">
                          {request.bc_signature_date 
                            ? new Date(request.bc_signature_date).toLocaleDateString('fr-FR')
                            : new Date(request.bc_submitted_at).toLocaleDateString('fr-FR')}
                        </p>
                        {request.bc_signature_url && (
                          <img src={request.bc_signature_url} alt="Signature" className="max-h-16 mt-2" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-1">Signature client</p>
                      <div className="w-48 h-20 border-2 border-dashed border-gray-300 rounded"></div>
                      <p className="text-xs text-gray-400 mt-1">Lu et approuvé</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-[#1a1a2e] text-white px-8 py-4 text-center text-sm">
                  <p className="font-medium">Lighthouse France SAS</p>
                  <p className="text-gray-400">16, rue Paul Séjourné • 94000 CRÉTEIL • Tél. 01 43 77 28 07</p>
                </div>
              </div>

              {/* Action Buttons - Hidden on print */}
              <div className="print-hide sticky bottom-0 bg-gray-100 px-6 py-4 border-t flex flex-wrap gap-3 justify-between items-center">
                <div className="flex gap-2">
                  <button onClick={() => {
                    const content = document.getElementById('quote-print-content');
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Devis - ${request.request_number}</title>
                        <style>
                          * { margin: 0; padding: 0; box-sizing: border-box; }
                          body { font-family: Arial, sans-serif; }
                          .border-b { border-bottom: 1px solid #e5e7eb; }
                          .border-b-4 { border-bottom: 4px solid; }
                          .border-t { border-top: 1px solid #e5e7eb; }
                          .border-t-2 { border-top: 2px solid #d1d5db; }
                          .border-l-4 { border-left: 4px solid; }
                          .border-blue-500 { border-color: #3b82f6; }
                          .border-orange-500 { border-color: #f97316; }
                          .border-green-200 { border-color: #bbf7d0; }
                          .border-\\[\\#00A651\\] { border-color: #00A651; }
                          .bg-gray-50 { background: #f9fafb; }
                          .bg-gray-100 { background: #f3f4f6; }
                          .bg-gray-200 { background: #e5e7eb; }
                          .bg-white { background: white; }
                          .bg-green-50 { background: #f0fdf4; }
                          .bg-\\[\\#1a1a2e\\] { background: #1a1a2e; }
                          .bg-\\[\\#00A651\\] { background: #00A651; }
                          .text-white { color: white; }
                          .text-gray-400 { color: #9ca3af; }
                          .text-gray-500 { color: #6b7280; }
                          .text-gray-600 { color: #4b5563; }
                          .text-gray-700 { color: #374151; }
                          .text-green-600 { color: #16a34a; }
                          .text-green-700 { color: #15803d; }
                          .text-green-800 { color: #166534; }
                          .text-\\[\\#1a1a2e\\] { color: #1a1a2e; }
                          .text-\\[\\#00A651\\] { color: #00A651; }
                          .text-orange-500 { color: #f97316; }
                          .text-xs { font-size: 0.75rem; }
                          .text-sm { font-size: 0.875rem; }
                          .text-lg { font-size: 1.125rem; }
                          .text-xl { font-size: 1.25rem; }
                          .text-2xl { font-size: 1.5rem; }
                          .text-3xl { font-size: 1.875rem; }
                          .font-medium { font-weight: 500; }
                          .font-bold { font-weight: 700; }
                          .font-mono { font-family: monospace; }
                          .uppercase { text-transform: uppercase; }
                          .text-left { text-align: left; }
                          .text-right { text-align: right; }
                          .text-center { text-align: center; }
                          .px-4 { padding-left: 1rem; padding-right: 1rem; }
                          .px-8 { padding-left: 2rem; padding-right: 2rem; }
                          .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
                          .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
                          .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
                          .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
                          .pt-8 { padding-top: 2rem; }
                          .pb-4 { padding-bottom: 1rem; }
                          .pl-4 { padding-left: 1rem; }
                          .pl-8 { padding-left: 2rem; }
                          .p-4 { padding: 1rem; }
                          .mb-1 { margin-bottom: 0.25rem; }
                          .mb-2 { margin-bottom: 0.5rem; }
                          .mb-3 { margin-bottom: 0.75rem; }
                          .mb-4 { margin-bottom: 1rem; }
                          .mt-1 { margin-top: 0.25rem; }
                          .mt-2 { margin-top: 0.5rem; }
                          .space-y-1 > * + * { margin-top: 0.25rem; }
                          .space-y-6 > * + * { margin-top: 1.5rem; }
                          .gap-2 { gap: 0.5rem; }
                          .flex { display: flex; }
                          .items-start { align-items: flex-start; }
                          .items-end { align-items: flex-end; }
                          .justify-between { justify-content: space-between; }
                          .rounded-lg { border-radius: 0.5rem; }
                          .w-full { width: 100%; }
                          .w-48 { width: 12rem; }
                          .h-20 { height: 5rem; }
                          .max-h-16 { max-height: 4rem; }
                          .border-2 { border-width: 2px; }
                          .border-dashed { border-style: dashed; }
                          .border-gray-300 { border-color: #d1d5db; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { padding: 0.75rem 1rem; }
                          @media print {
                            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                          }
                        </style>
                      </head>
                      <body>${content.innerHTML}</body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
                  }} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium flex items-center gap-2">
                    Imprimer
                  </button>
                  <button onClick={async () => {
                    try {
                      const quoteInfo = getQuoteDataFromRequest(request);
                      const pdfBlob = await generateQuotePDF({
                        request,
                        ...quoteInfo,
                        isSigned: false
                      });
                      const url = URL.createObjectURL(pdfBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Devis_${request.request_number}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error('PDF error:', err);
                    }
                  }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2">
                    Telecharger PDF
                  </button>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowRevisionModal(true)}
                    className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                  >
                    Demander modification
                  </button>
                  <button 
                    onClick={() => { setShowQuoteModal(false); setShowBCModal(true); }}
                    className="px-6 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-bold"
                  >
                    ✅ Approuver et soumettre BC
                  </button>
                </div>
              </div>

              {/* Revision Request Sub-Modal */}
              {showRevisionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
                  <div className="bg-white rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Demander une modification</h3>
                    <p className="text-gray-600 mb-4">Décrivez les modifications que vous souhaitez apporter au devis :</p>
                    <textarea
                      value={revisionNotes}
                      onChange={e => setRevisionNotes(e.target.value)}
                      className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                      placeholder="Ex: Veuillez ajouter un appareil supplémentaire, modifier le prix, retirer les frais de transport, etc."
                    />
                    <div className="mt-4 flex justify-end gap-3">
                      <button onClick={() => setShowRevisionModal(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
                        Annuler
                      </button>
                      <button 
                        onClick={handleRequestRevision}
                        disabled={approvingQuote || !revisionNotes.trim()}
                        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        {approvingQuote ? 'Envoi...' : 'Envoyer la demande'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {[
            { id: 'details', label: 'Détails', icon: '📋' },
            { id: 'messages', label: 'Messages', icon: '💬', count: messages.filter(m => !m.is_read && m.sender_id !== profile?.id).length },
            { id: 'history', label: 'Historique', icon: '📜' },
            { id: 'documents', label: 'Documents', icon: '📄', count: attachments.length }
          ].map(tab => (
            <button
              key={tab.id}
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

        {/* Tab Content */}
        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* Service Summary Card */}
              <div className="bg-gradient-to-r from-[#1E3A5F] to-[#3B7AB4] rounded-xl p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-sm uppercase tracking-wide mb-1">Type de service</p>
                    <p className="text-2xl font-bold">
                      {isPartsOrder ? 'Commande de Pièces' : 
                       request.requested_service === 'calibration' ? 'Étalonnage' :
                       request.requested_service === 'repair' ? 'Réparation' :
                       request.requested_service === 'calibration_repair' ? 'Étalonnage + Réparation' :
                       request.requested_service || 'Service'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-sm uppercase tracking-wide mb-1">Référence</p>
                    <p className="text-xl font-mono font-bold">
                      {request.request_number || 'En attente'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-white/70">Date de soumission</p>
                    <p className="font-medium">{new Date(request.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-white/70">Statut actuel</p>
                    <p className="font-medium">{style.label}</p>
                  </div>
                  <div>
                    <p className="text-white/70">Appareils</p>
                    <p className="font-medium">{request.request_devices?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-white/70">Urgence</p>
                    <p className="font-medium">{request.urgency === 'high' ? 'Haute' : request.urgency === 'low' ? 'Basse' : 'Normale'}</p>
                  </div>
                </div>
              </div>

              {/* Devices Section */}
              {!isPartsOrder && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#E8F2F8] flex items-center justify-center">
                      <span className="text-lg">🔧</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#1E3A5F]">Appareils</h2>
                      <p className="text-sm text-gray-500">{request.request_devices?.length || 0} appareil(s) enregistré(s)</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-4">
                    {request.request_devices?.map((device, idx) => (
                      <div key={device.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-500">Appareil #{idx + 1}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            device.service_type === 'calibration' ? 'bg-blue-100 text-blue-700' : 
                            device.service_type === 'repair' ? 'bg-orange-100 text-orange-700' :
                            device.service_type === 'calibration_repair' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {device.service_type === 'calibration' ? '🔬 Étalonnage' : 
                             device.service_type === 'repair' ? '🔧 Réparation' :
                             device.service_type === 'calibration_repair' ? '🔬🔧 Étal. + Rép.' :
                             device.service_type}
                          </span>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Modèle</p>
                              <p className="font-semibold text-[#1E3A5F]">{device.model_name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">N° de série</p>
                              <p className="font-mono font-semibold text-[#3B7AB4]">{device.serial_number}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Marque</p>
                              <p className="font-medium">{device.equipment_type || 'Lighthouse'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Statut</p>
                              <p className="font-medium">{STATUS_STYLES[device.status]?.label || 'En attente'}</p>
                            </div>
                          </div>
                          {device.notes && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes / Description du problème</p>
                              <p className="text-gray-700 text-sm">{device.notes}</p>
                            </div>
                          )}
                          {device.accessories && device.accessories.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="text-xs text-gray-500">Accessoires:</span>
                              {device.accessories.map((acc, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  {acc === 'charger' ? 'Chargeur' : 
                                   acc === 'battery' ? 'Batterie' : 
                                   acc === 'powerCable' ? 'Câble' : 
                                   acc === 'carryingCase' ? 'Mallette' : acc}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Photos for this device */}
                          {attachments.filter(a => 
                            a.file_type?.startsWith('image/') && 
                            (a.device_serial === device.serial_number || !a.device_serial)
                          ).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Photos</p>
                              <div className="flex gap-2 flex-wrap">
                                {attachments
                                  .filter(a => a.file_type?.startsWith('image/') && (a.device_serial === device.serial_number || !a.device_serial))
                                  .slice(0, 4)
                                  .map((img) => (
                                    <a 
                                      key={img.id}
                                      href={img.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity border border-gray-200"
                                    >
                                      <img src={img.file_url} alt="" className="w-full h-full object-cover" />
                                    </a>
                                  ))
                                }
                                {attachments.filter(a => a.file_type?.startsWith('image/')).length > 4 && (
                                  <button
                                    onClick={() => setActiveTab('documents')}
                                    className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 text-xs hover:bg-gray-200"
                                  >
                                    +{attachments.filter(a => a.file_type?.startsWith('image/')).length - 4}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Tracking info if shipped */}
                        {device.tracking_number && (
                          <div className="bg-green-50 px-4 py-3 border-t border-green-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                <span className="text-sm font-medium text-green-800">Expédié</span>
                              </div>
                              <a 
                                href={device.tracking_url || `https://www.google.com/search?q=${device.tracking_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-green-700 font-mono hover:underline"
                              >
                                {device.tracking_number} →
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parts Order Details */}
              {isPartsOrder && request.problem_description && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#1E3A5F]">Détails de la commande</h2>
                      <p className="text-sm text-gray-500">Pièces demandées</p>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    {request.problem_description.split('\n').map((line, i) => (
                      <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                        <p className="text-gray-700">{line}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {shippingAddress && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-lg">📍</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#1E3A5F]">Adresse de retour</h2>
                      <p className="text-sm text-gray-500">L'appareil sera renvoyé à cette adresse</p>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="font-semibold text-[#1E3A5F]">{shippingAddress.company_name}</p>
                    {shippingAddress.attention && <p className="text-gray-600">À l'attention de: {shippingAddress.attention}</p>}
                    <p className="text-gray-600">{shippingAddress.address_line1}</p>
                    <p className="text-gray-600">{shippingAddress.postal_code} {shippingAddress.city}</p>
                    <p className="text-gray-600">{shippingAddress.country || 'France'}</p>
                  </div>
                </div>
              )}

              {/* Notes from request */}
            </div>
          )}

          {/* Messages Tab */}
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
                      <div 
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] rounded-lg p-3 ${
                          isMe 
                            ? 'bg-[#3B7AB4] text-white' 
                            : 'bg-gray-100 text-gray-800'
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
                            {new Date(msg.created_at).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
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

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              {displayHistory.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <p className="text-4xl mb-2">📜</p>
                  <p>Aucun historique disponible</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-6">
                    {displayHistory.map((event, i) => {
                      const eventStyle = STATUS_STYLES[event.event_type] || {};
                      return (
                        <div key={event.id || i} className="flex gap-4 ml-4">
                          <div className={`w-3 h-3 rounded-full border-2 border-white shadow -ml-[7px] mt-1.5 z-10 ${
                            i === 0 ? 'bg-[#3B7AB4]' : 'bg-gray-400'
                          }`}></div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              {eventStyle.icon && <span>{eventStyle.icon}</span>}
                              <p className="font-medium text-[#1E3A5F]">{event.event_description}</p>
                            </div>
                            <p className="text-sm text-gray-500">
                              {new Date(event.event_date).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Photos from request */}
              {attachments.filter(a => a.file_type?.startsWith('image/')).length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Photos soumises
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {attachments.filter(a => a.file_type?.startsWith('image/')).map((img) => (
                      <a 
                        key={img.id}
                        href={img.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity border border-gray-200"
                      >
                        <img 
                          src={img.file_url} 
                          alt={img.file_name}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Other documents */}
              {attachments.filter(a => !a.file_type?.startsWith('image/')).length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documents
                  </h3>
                  <div className="space-y-2">
                    {attachments.filter(a => !a.file_type?.startsWith('image/')).map((doc) => (
                      <a 
                        key={doc.id}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        <div className="w-10 h-10 bg-[#3B7AB4] rounded flex items-center justify-center text-white font-bold text-xs">
                          {doc.file_name?.split('.').pop()?.toUpperCase() || 'DOC'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1E3A5F] truncate">{doc.file_name}</p>
                          <p className="text-xs text-gray-500">
                            Ajouté le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificates and Quotes - from Lighthouse */}
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Certificats et Devis
                </h3>
                {request.quote_url || request.certificate_url || request.bc_file_url ? (
                  <div className="space-y-2">
                    {request.quote_url && (
                      <a 
                        href={request.quote_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                      >
                        <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
                          PDF
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-blue-900">Devis</p>
                          <p className="text-xs text-blue-600">Télécharger le devis</p>
                        </div>
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    )}
                    {request.bc_file_url && (
                      <a 
                        href={request.bc_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
                      >
                        <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xs">
                          PDF
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-purple-900">
                            {request.is_contract_rma ? 'Bon de Commande (Contrat)' : 'Bon de Commande'}
                          </p>
                          <p className="text-xs text-purple-600">
                            {request.bc_signed_by ? `Signé par ${request.bc_signed_by}` : 'Télécharger le BC'}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    )}
                    {request.certificate_url && (
                      <a 
                        href={request.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                      >
                        <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center text-white font-bold text-xs">
                          PDF
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-green-900">Certificat d'étalonnage</p>
                          <p className="text-xs text-green-600">Télécharger le certificat</p>
                        </div>
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">Les certificats et devis apparaîtront ici une fois disponibles</p>
                  </div>
                )}
              </div>

              {/* Empty state if no attachments at all */}
              {attachments.length === 0 && !request.quote_url && !request.certificate_url && !request.bc_file_url && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">Aucun document disponible</p>
                  <p className="text-sm text-gray-400">Les photos, devis et certificats apparaîtront ici</p>
                </div>
              )}
            </div>
          )}
        </div>
        
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
function DeviceHistoryPage({ profile, requests, t, setPage }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [history, setHistory] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get serial from sessionStorage
    const storedSerial = sessionStorage.getItem('viewDeviceSerial');
    if (storedSerial) {
      setSerialNumber(storedSerial);
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
      setLoading(false);
    };
    loadHistory();
  }, [serialNumber, requests]);

  // Get device info from first request
  const deviceInfo = allRequests[0]?.request_devices?.find(d => d.serial_number === serialNumber);

  return (
    <div>
      <button
        onClick={() => setPage('dashboard')}
        className="mb-6 text-[#3B7AB4] hover:text-[#1E3A5F] font-medium"
      >
        ← Retour au tableau de bord
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Historique de l'appareil</h1>
          {deviceInfo && (
            <div className="mt-2">
              <p className="text-lg font-medium">{deviceInfo.model_name}</p>
              <p className="font-mono text-[#3B7AB4]">SN: {serialNumber}</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#3B7AB4] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Service History from Requests */}
            <div>
              <h2 className="font-bold text-[#1E3A5F] mb-4">Historique des services</h2>
              {allRequests.length === 0 ? (
                <p className="text-gray-500">Aucun historique de service trouvé</p>
              ) : (
                <div className="space-y-4">
                  {allRequests.map(req => {
                    const device = req.request_devices?.find(d => d.serial_number === serialNumber);
                    const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
                    return (
                      <div 
                        key={req.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-[#3B7AB4] cursor-pointer transition-colors"
                        onClick={() => {
                          setPage('request-detail');
                          // Would need to pass the request somehow
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono font-bold text-[#3B7AB4]">{req.request_number}</span>
                            <p className="text-sm text-gray-600 mt-1">
                              {device?.service_type === 'calibration' ? 'Étalonnage' : 
                               device?.service_type === 'repair' ? 'Réparation' :
                               device?.service_type === 'calibration_repair' ? 'Étalonnage + Réparation' :
                               device?.service_type}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                            <p className="text-sm text-gray-400 mt-2">
                              {new Date(req.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
function ContractsPage({ profile, t, notify, setPage }) {
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
          const fileName = `bc_contract_${selectedContract.id}_${Date.now()}.${bcFile.name.split('.').pop()}`;
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
          const signatureFileName = `signature_contract_${selectedContract.id}_${Date.now()}.png`;
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
          
          const pdfFileName = `devis_signe_contrat_${selectedContract.contract_number}_${Date.now()}.pdf`;
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
          {needsQuoteAction && (
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
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                                isComplete ? 'bg-green-500 text-white' : 'bg-[#1E3A5F] text-white'
                              }`}>
                                {device.device_type === 'particle_counter' && '🔬'}
                                {device.device_type === 'bio_collector' && '🧫'}
                                {device.device_type === 'liquid_counter' && '💧'}
                                {device.device_type === 'temp_humidity' && '🌡️'}
                                {(!device.device_type || device.device_type === 'other') && '📦'}
                              </div>
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
                {isActive && (
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
          // Get data from quote_data (same as admin)
          const quoteData = contract.quote_data || {};
          const quoteDevices = quoteData.devices || [];
          const shipping = quoteData.shipping || { parcels: 1, unitPrice: 45, total: 45 };
          const servicesSubtotal = quoteData.servicesSubtotal || totalPrice;
          const shippingTotal = quoteData.shippingTotal || shipping.total || 0;
          const grandTotalFromQuote = quoteData.grandTotal || (servicesSubtotal + shippingTotal);
          const contractDates = quoteData.contractDates || { start_date: contract.start_date, end_date: contract.end_date };
          const totalTokensFromQuote = quoteData.totalTokens || totalTokens;
          
          // Check if we have nettoyage
          const hasNettoyage = quoteDevices.some(d => d.needsNettoyage && d.nettoyagePrice > 0);
          
          // Get device data for pricing
          const pricingDevices = quoteDevices.length > 0 ? quoteDevices : devices.map(d => ({
            ...d,
            serial: d.serial_number,
            model: d.model_name,
            deviceType: d.device_type || 'particle_counter',
            tokens_total: d.tokens_total || 1,
            calibrationPrice: d.unit_price || 350,
            needsCalibration: true,
            needsNettoyage: d.device_type === 'particle_counter',
            nettoyagePrice: 0
          }));
          
          const deviceTypes = [...new Set(pricingDevices.map(d => d.deviceType || 'particle_counter'))];
          
          // Service description templates (IDENTICAL to admin)
          const CAL_TEMPLATES = {
            particle_counter: {
              title: "Étalonnage Compteur de Particules Aéroportées",
              icon: "🔬",
              prestations: [
                "Vérification des fonctionnalités du compteur",
                "Vérification et réglage du débit",
                "Vérification de la cellule de mesure",
                "Contrôle et réglage des seuils granulométriques à l'aide de sphères de latex calibrées",
                "Vérification en nombre par comparaison à un étalon ISO 17025 / ISO 21501-4",
                "Fourniture d'un rapport de test et de calibration"
              ]
            },
            bio_collector: {
              title: "Étalonnage Bio Collecteur",
              icon: "🧫",
              prestations: [
                "Vérification des fonctionnalités de l'appareil",
                "Vérification et réglage du débit",
                "Vérification de la cellule d'impaction",
                "Contrôle des paramètres de collecte",
                "Fourniture d'un rapport de test et de calibration"
              ]
            },
            liquid_counter: {
              title: "Étalonnage Compteur Particules Liquide",
              icon: "💧",
              prestations: [
                "Vérification des fonctionnalités du compteur",
                "Vérification et réglage du débit",
                "Vérification de la cellule de mesure optique",
                "Contrôle et réglage des seuils granulométriques",
                "Vérification en nombre par comparaison à un étalon",
                "Fourniture d'un rapport de test et de calibration"
              ]
            },
            temp_humidity: {
              title: "Étalonnage Capteur Température/Humidité",
              icon: "🌡️",
              prestations: [
                "Vérification des fonctionnalités du capteur",
                "Étalonnage température sur points de référence certifiés",
                "Étalonnage humidité relative",
                "Vérification de la stabilité des mesures",
                "Fourniture d'un certificat d'étalonnage"
              ]
            },
            other: {
              title: "Étalonnage Équipement",
              icon: "📦",
              prestations: [
                "Vérification des fonctionnalités de l'appareil",
                "Étalonnage selon les spécifications du fabricant",
                "Tests de fonctionnement",
                "Fourniture d'un rapport de test"
              ]
            }
          };

          // Build content blocks for pagination (IDENTICAL to admin)
          const contentBlocks = [];
          
          // Block: Client Info
          contentBlocks.push({
            type: 'client',
            height: 100,
            render: () => (
              <div className="px-6 py-4 mt-2 border-b">
                <p className="text-xs text-gray-500 uppercase">Client</p>
                <p className="font-bold text-lg text-[#1a1a2e]">{contract.companies?.name}</p>
                {contract.companies?.contact_name && (
                  <p className="text-gray-700 text-sm">À l'attention de: {contract.companies.contact_name}</p>
                )}
                {(contract.companies?.billing_address || contract.companies?.address) && (
                  <p className="text-gray-600 text-sm">{contract.companies.billing_address || contract.companies.address}</p>
                )}
                {(contract.companies?.billing_postal_code || contract.companies?.postal_code || contract.companies?.billing_city || contract.companies?.city) && (
                  <p className="text-gray-600 text-sm">
                    {contract.companies?.billing_postal_code || contract.companies?.postal_code} {contract.companies?.billing_city || contract.companies?.city}
                  </p>
                )}
                {contract.companies?.phone && (
                  <p className="text-gray-600 text-sm">Tél: {contract.companies.phone}</p>
                )}
              </div>
            )
          });

          // Block: Service descriptions
          deviceTypes.forEach(type => {
            const template = CAL_TEMPLATES[type] || CAL_TEMPLATES.particle_counter;
            contentBlocks.push({
              type: 'service',
              deviceType: type,
              height: 120,
              render: () => (
                <div className="px-6 py-3 border-b">
                  <div className="flex items-start gap-2">
                    <div className="w-1 bg-blue-500 self-stretch rounded" style={{minHeight: '80px'}}></div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#1a1a2e] mb-1 text-sm flex items-center gap-2">
                        <span>{template.icon}</span>
                        {template.title}
                      </h3>
                      <ul className="text-xs text-gray-600 space-y-0.5">
                        {template.prestations.map((p, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-gray-400">-</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            });
          });

          // Block: Conditions
          contentBlocks.push({
            type: 'conditions',
            height: 80,
            render: () => (
              <div className="px-6 py-3 border-b bg-gray-50">
                <p className="text-xs text-gray-500 uppercase mb-1">Conditions</p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  <li>• Période du contrat: {new Date(contractDates.start_date).toLocaleDateString('fr-FR')} au {new Date(contractDates.end_date).toLocaleDateString('fr-FR')}</li>
                  <li>• {totalTokensFromQuote} étalonnage(s) inclus pendant la période contractuelle</li>
                  <li>• Étalonnages supplémentaires facturés au tarif standard</li>
                  <li>• Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables</li>
                  <li>• Un devis complémentaire sera établi si des pièces sont trouvées défectueuses</li>
                  <li>• Paiement à 30 jours date de facture</li>
                </ul>
              </div>
            )
          });

          // Block: Table header
          contentBlocks.push({
            type: 'table_header',
            height: 45,
            render: () => (
              <div className="px-6 pt-4">
                <h3 className="font-bold text-[#1a1a2e] mb-2 text-sm">Récapitulatif des Prix</h3>
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#1a1a2e] text-white">
                      <th className="px-3 py-2 text-left text-xs font-bold w-12">Qté</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Désignation</th>
                      <th className="px-3 py-2 text-right text-xs font-bold w-20">Prix Unit.</th>
                      <th className="px-3 py-2 text-right text-xs font-bold w-20">Total HT</th>
                    </tr>
                  </thead>
                </table>
              </div>
            )
          });

          // Block: Device rows
          pricingDevices.forEach((device, idx) => {
            contentBlocks.push({
              type: 'device',
              device: device,
              index: idx,
              height: device.needsNettoyage && device.nettoyagePrice > 0 ? 60 : 32,
              render: () => (
                <div className="px-6">
                  <table className="w-full">
                    <tbody>
                      {device.needsCalibration !== false && (
                        <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 text-center text-sm w-12">{device.tokens_total || 1}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className="font-medium">Étalonnage {device.model}</span>
                            <span className="text-gray-500 text-xs ml-1">(SN: {device.serial})</span>
                          </td>
                          <td className="px-3 py-2 text-right text-sm w-20">{(device.calibrationPrice || 0).toFixed(2)} €</td>
                          <td className="px-3 py-2 text-right text-sm font-medium w-20">{((device.tokens_total || 1) * (device.calibrationPrice || 0)).toFixed(2)} €</td>
                        </tr>
                      )}
                      {device.needsNettoyage && device.nettoyagePrice > 0 && (
                        <tr className="bg-amber-50">
                          <td className="px-3 py-2 text-center text-sm w-12">{device.nettoyageQty || 1}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className="font-medium text-amber-800">Nettoyage cellule</span>
                            <span className="text-amber-600 text-xs ml-1">- si requis ({device.model})</span>
                          </td>
                          <td className="px-3 py-2 text-right text-sm w-20">{(device.nettoyagePrice || 0).toFixed(2)} €</td>
                          <td className="px-3 py-2 text-right text-sm font-medium w-20">{((device.nettoyageQty || 1) * (device.nettoyagePrice || 0)).toFixed(2)} €</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            });
          });

          // Block: Shipping
          contentBlocks.push({
            type: 'shipping',
            height: 32,
            render: () => (
              <div className="px-6">
                <table className="w-full">
                  <tbody>
                    <tr className="bg-blue-50">
                      <td className="px-3 py-2 text-center text-sm w-12">{shipping.parcels || 1}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className="font-medium text-blue-800">Frais de port</span>
                        <span className="text-blue-600 text-xs ml-1">({shipping.parcels || 1} colis)</span>
                      </td>
                      <td className="px-3 py-2 text-right text-sm w-20">{(shipping.unitPrice || 45).toFixed(2)} €</td>
                      <td className="px-3 py-2 text-right text-sm font-medium w-20">{shippingTotal.toFixed(2)} €</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          });

          // Block: Total
          contentBlocks.push({
            type: 'total',
            height: 35,
            render: () => (
              <div className="px-6 pb-4">
                <table className="w-full">
                  <tbody>
                    <tr className="bg-[#00A651] text-white">
                      <td className="px-3 py-2 w-12"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right font-bold text-sm w-20">TOTAL HT</td>
                      <td className="px-3 py-2 text-right font-bold text-sm w-20">{grandTotalFromQuote.toFixed(2)} €</td>
                    </tr>
                  </tbody>
                </table>
                {hasNettoyage && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                    * Le nettoyage sera effectué si nécessaire selon l'état du capteur.
                  </p>
                )}
              </div>
            )
          });

          // Block: Signature
          contentBlocks.push({
            type: 'signature',
            height: 120,
            alwaysLast: true,
            render: () => (
              <div className="px-6 py-6 border-t">
                <div className="flex justify-between items-end">
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Établi par</p>
                      <p className="font-bold text-lg">{quoteData.createdBy || 'Lighthouse France'}</p>
                      <p className="text-gray-500 text-sm">Lighthouse France</p>
                    </div>
                    <img 
                      src="/images/logos/capcert-logo.png" 
                      alt="Capcert" 
                      className="h-24 w-auto"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  {contract.bc_submitted_at ? (
                    <div className="text-center">
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <p className="text-xs text-green-600 uppercase mb-1">Approuvé</p>
                        <p className="font-bold text-green-800">{contract.bc_signed_by || 'Client'}</p>
                        <p className="text-sm text-green-700">
                          {contract.bc_signature_date 
                            ? new Date(contract.bc_signature_date).toLocaleDateString('fr-FR')
                            : new Date(contract.bc_submitted_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Bon pour accord</p>
                      <div className="w-44 h-16 border-2 border-dashed border-gray-300 rounded"></div>
                      <p className="text-xs text-gray-400 mt-1">Signature et cachet</p>
                    </div>
                  )}
                </div>
              </div>
            )
          });

          // Paginate content (IDENTICAL to admin)
          const PAGE_CONTENT_HEIGHT = 680;
          const pages = [];
          let currentPage = { blocks: [], usedHeight: 0 };
          
          const signatureBlock = contentBlocks.find(b => b.type === 'signature');
          const otherBlocks = contentBlocks.filter(b => b.type !== 'signature');
          
          otherBlocks.forEach(block => {
            if (currentPage.usedHeight + block.height > PAGE_CONTENT_HEIGHT) {
              pages.push(currentPage);
              currentPage = { blocks: [], usedHeight: 0 };
            }
            currentPage.blocks.push(block);
            currentPage.usedHeight += block.height;
          });
          
          if (signatureBlock) {
            if (currentPage.usedHeight + signatureBlock.height > PAGE_CONTENT_HEIGHT) {
              pages.push(currentPage);
              currentPage = { blocks: [signatureBlock], usedHeight: signatureBlock.height };
            } else {
              currentPage.blocks.push(signatureBlock);
            }
          }
          pages.push(currentPage);
          
          const totalPages = pages.length;
          const today = new Date();

          // Page Header Component
          const PageHeader = ({ pageNum }) => (
            <div className="border-b-4 border-[#00A651] mb-4">
              <div className="px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img 
                    src="/images/logos/lighthouse-logo.png" 
                    alt="Lighthouse" 
                    className="h-12 w-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="hidden">
                    <span className="text-xl font-bold text-[#1a1a2e]">LIGHTHOUSE</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#00A651]">DEVIS CONTRAT</p>
                  <p className="text-gray-500 text-sm">{contract.contract_number}</p>
                </div>
              </div>
              {pageNum === 1 && (
                <div className="bg-gray-100 px-6 py-2 flex justify-between text-xs border-t">
                  <div>
                    <span className="text-gray-500">Date: </span>
                    <span className="font-medium">{contract.quote_sent_at ? new Date(contract.quote_sent_at).toLocaleDateString('fr-FR') : today.toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Période: </span>
                    <span className="font-medium">{new Date(contractDates.start_date).toLocaleDateString('fr-FR')} - {new Date(contractDates.end_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Validité: </span>
                    <span className="font-medium">30 jours</span>
                  </div>
                </div>
              )}
            </div>
          );

          // Page Footer Component
          const PageFooter = ({ pageNum, totalPages }) => (
            <div className="bg-[#1a1a2e] text-white px-6 py-3 text-center text-xs">
              <p>Lighthouse France SAS • 16, rue Paul Séjourné • 94000 CRÉTEIL • Tél. 01 43 77 28 07</p>
              <p className="font-medium mt-1">Page {pageNum}/{totalPages}</p>
            </div>
          );

          return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Modal Header with actions */}
              <div className="bg-[#1a1a2e] text-white px-6 py-3 flex justify-between items-center flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold">Offre de Prix - Contrat d'Étalonnage</h2>
                  <p className="text-gray-400 text-sm">{contract.contract_number}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={async () => {
                    try {
                      const pdfBlob = await generateContractQuotePDF({
                        contract,
                        devices: pricingDevices,
                        totalPrice: servicesSubtotal,
                        totalTokens: totalTokensFromQuote,
                        isSigned: false
                      });
                      const url = URL.createObjectURL(pdfBlob);
                      const printWindow = window.open(url, '_blank');
                      if (printWindow) printWindow.onload = () => printWindow.print();
                    } catch (err) { console.error('Print error:', err); }
                  }} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm">
                    🖨️ Imprimer
                  </button>
                  <button onClick={async () => {
                    try {
                      const pdfBlob = await generateContractQuotePDF({
                        contract,
                        devices: pricingDevices,
                        totalPrice: servicesSubtotal,
                        totalTokens: totalTokensFromQuote,
                        isSigned: false
                      });
                      const url = URL.createObjectURL(pdfBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Devis_Contrat_${contract.contract_number}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (err) { console.error('PDF error:', err); }
                  }} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded text-sm">
                    📥 PDF
                  </button>
                  <button onClick={() => setShowQuoteModal(false)} className="text-gray-400 hover:text-white text-2xl ml-2">&times;</button>
                </div>
              </div>

              {/* Quote Document Preview - Paginated like admin */}
              <div className="flex-1 overflow-y-auto bg-gray-300 p-6">
                <div className="space-y-8">
                  {pages.map((page, pageIdx) => (
                    <div 
                      key={pageIdx} 
                      className="bg-white shadow-xl mx-auto"
                      style={{ 
                        width: '210mm', 
                        minHeight: '297mm',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <PageHeader pageNum={pageIdx + 1} />
                      <div className="flex-1">
                        {page.blocks.map((block, blockIdx) => (
                          <div key={blockIdx}>{block.render()}</div>
                        ))}
                      </div>
                      <PageFooter pageNum={pageIdx + 1} totalPages={totalPages} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-gray-100 px-6 py-4 border-t flex justify-between items-center flex-shrink-0">
                <button 
                  onClick={() => setShowRevisionModal(true)}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                >
                  ✏️ Demander modification
                </button>
                <button 
                  onClick={() => { setShowQuoteModal(false); setShowBCModal(true); }}
                  className="px-6 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-bold"
                >
                  ✅ Approuver et soumettre BC
                </button>
              </div>

              {/* Revision Request Sub-Modal */}
              {showRevisionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
                  <div className="bg-white rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Demander une modification</h3>
                    <p className="text-gray-600 mb-4">Décrivez les modifications que vous souhaitez apporter au devis :</p>
                    <textarea
                      value={revisionNotes}
                      onChange={e => setRevisionNotes(e.target.value)}
                      className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                      placeholder="Ex: Veuillez ajouter un appareil supplémentaire, modifier le prix, retirer les frais de transport, etc."
                    />
                    <div className="mt-4 flex justify-end gap-3">
                      <button onClick={() => setShowRevisionModal(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
                        Annuler
                      </button>
                      <button 
                        onClick={handleRequestRevision}
                        disabled={approvingQuote || !revisionNotes.trim()}
                        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        {approvingQuote ? 'Envoi...' : 'Envoyer la demande'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          );
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
        <button 
          onClick={() => setPage('new-request')}
          className="px-4 py-2 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008c44]"
        >
          + Nouveau Contrat
        </button>
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
          <button 
            onClick={() => setPage('new-request')}
            className="px-6 py-3 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008c44]"
          >
            Demander un devis contrat
          </button>
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
function RentalsPage({ profile, addresses, t, notify, setPage, refresh }) {
  const [rentals, setRentals] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewRental, setShowNewRental] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  
  // New rental form state
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedItems, setSelectedItems] = useState([]);
  const [step, setStep] = useState(1); // 1: dates, 2: equipment, 3: confirm
  const [shippingAddressId, setShippingAddressId] = useState(addresses.find(a => a.is_default)?.id || '');
  const [customerNotes, setCustomerNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile?.company_id]);

  const loadData = async () => {
    setLoading(true);
    
    // Load rental requests for this company
    const { data: rentalData } = await supabase
      .from('rental_requests')
      .select('*, rental_request_items(*), companies(*), shipping_addresses(*)')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });
    
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
    
    if (rentalData) setRentals(rentalData);
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
    if (!startDate || !endDate || selectedItems.length === 0 || !shippingAddressId) {
      notify('Veuillez compléter tous les champs', 'error');
      return;
    }
    
    setSaving(true);
    try {
      // Generate rental number
      const { data: numberData } = await supabase.rpc('generate_rental_number');
      const rentalNumber = numberData || `LOC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
      
      // Create rental request
      const { data: rental, error: rentalErr } = await supabase
        .from('rental_requests')
        .insert({
          rental_number: rentalNumber,
          company_id: profile.company_id,
          submitted_by: profile.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          shipping_address_id: shippingAddressId,
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
      quote_sent: 'bg-amber-100 text-amber-700',
      waiting_bc: 'bg-purple-100 text-purple-700',
      bc_review: 'bg-indigo-100 text-indigo-700',
      bc_approved: 'bg-teal-100 text-teal-700',
      shipped: 'bg-cyan-100 text-cyan-700',
      in_rental: 'bg-green-100 text-green-700',
      return_pending: 'bg-orange-100 text-orange-700',
      returned: 'bg-gray-100 text-gray-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    const labels = {
      requested: 'Demande envoyée',
      quote_sent: 'Devis reçu',
      waiting_bc: 'En attente BC',
      bc_review: 'BC en révision',
      bc_approved: 'BC approuvé',
      shipped: 'Expédié',
      in_rental: 'En location',
      return_pending: 'Retour en attente',
      returned: 'Retourné',
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
            else setEndDate(date);
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
        <div className="mt-4 flex gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#8B5CF6] rounded" /><span>Sélectionné</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 rounded" /><span>Indisponible</span></div>
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
                    </div>
                    <button onClick={() => setStep(2)} className="w-full py-3 bg-[#8B5CF6] text-white rounded-lg font-bold hover:bg-[#7C3AED]">
                      Continuer → Choisir l'équipement
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
                    return (
                      <div key={device.id} onClick={() => available && toggleSelection('device', device)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${!available ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' : selected ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]' : 'bg-white border-gray-200 hover:border-[#8B5CF6]/50'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div><h4 className="font-bold text-gray-800">{device.model_name}</h4><p className="text-sm text-gray-500 font-mono">SN: {device.serial_number}</p></div>
                          {selected && <span className="text-[#8B5CF6] text-xl">✓</span>}
                        </div>
                        <div className="flex items-end justify-between">
                          <div><p className="text-2xl font-bold text-[#8B5CF6]">€{pricing.total.toFixed(2)}</p><p className="text-xs text-gray-500">€{device.price_per_day}/jour</p></div>
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
                <h4 className="font-bold text-gray-700 mb-4">Adresse de livraison</h4>
                <div className="space-y-2">
                  {addresses.map(addr => (
                    <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer ${shippingAddressId === addr.id ? 'border-[#8B5CF6] bg-[#8B5CF6]/5' : 'border-gray-200'}`}>
                      <input type="radio" checked={shippingAddressId === addr.id} onChange={() => setShippingAddressId(addr.id)} />
                      <div>
                        <p className="font-medium">{addr.label || addr.company_name}</p>
                        <p className="text-sm text-gray-600">{addr.address_line1}, {addr.postal_code} {addr.city}</p>
                      </div>
                    </label>
                  ))}
                </div>
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

  // Main Rentals List
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">📦 Mes Locations</h1>
        <button onClick={() => setShowNewRental(true)}
          className="px-4 py-2 bg-[#8B5CF6] text-white rounded-lg font-medium hover:bg-[#7C3AED] flex items-center gap-2">
          + Nouvelle Location
        </button>
      </div>

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
          {rentals.map(rental => (
            <div key={rental.id} className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow">
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
                </div>
                <div className="text-lg font-bold text-[#8B5CF6]">
                  €{(rental.quote_total_ht || rental.quote_subtotal || 0).toFixed(2)} HT
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// HOME PAGE (Public Landing)
// ============================================
function HomePage({ t, setPage }) {
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
                  Gerez vos demandes de calibration et reparation d'equipements de mesure de contamination en temps reel.
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
                      <p className="text-white/60 text-xs">Aeroportees</p>
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
                    
                    {/* Temperature & Humidity Probe */}
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 text-center hover:scale-105 transition-all duration-300 hover:from-white/15 hover:to-white/10 border border-white/10 group cursor-pointer">
                      <div className="w-full h-36 mb-3 flex items-center justify-center rounded-xl">
                        <img 
                          src="/images/products/temp-probe.png" 
                          alt="Temperature & Humidity Probe" 
                          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <p className="text-white font-bold text-sm">Sondes Temperature</p>
                      <p className="text-white/60 text-xs">& Humidite</p>
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
                  { num: '2', title: 'Soumettre une demande', desc: 'Detaillez vos equipements et besoins de service' },
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
                    title: 'Reparation', 
                    desc: 'Reparation experte de compteurs de particules, echantillonneurs microbiens et equipements de monitoring environnemental.'
                  },
                  { 
                    icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
                    title: 'Etalonnage', 
                    desc: 'Calibration selon ISO 21501-4 avec certificats traceables pour garantir precision et conformite reglementaire.'
                  },
                  { 
                    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                    title: 'Maintenance', 
                    desc: 'Programmes de maintenance preventive pour optimiser la duree de vie et les performances de vos equipements.'
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
                Rejoignez les entreprises qui font confiance a Lighthouse France pour la maintenance de leurs equipements critiques.
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
                  <a href="https://www.golighthouse.com" target="_blank" rel="noopener noreferrer" className="block text-white/60 text-sm hover:text-[#00A651] transition-colors">Lighthouse Worldwide</a>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 pt-8 text-center">
              <p className="text-white/40 text-sm">© 2025 Lighthouse France SAS. Tous droits reserves.</p>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    if (result) setError(result);
    setLoading(false);
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
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  <label className="block text-sm font-medium text-white/80 mb-1">Mot de passe</label>
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
// REGISTER PAGE
// ============================================
function RegisterPage({ t, register, setPage }) {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    companyName: '', contactName: '', phone: '',
    address: '', city: '', postalCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => setFormData({ ...formData, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
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

        {/* Register Form */}
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
              <div className="bg-[#00A651]/20 backdrop-blur-sm px-6 py-6 border-b border-white/10">
                <h1 className="text-xl font-bold text-white">Créer un compte</h1>
                <p className="text-white/60 text-sm mt-1">Enregistrez votre société pour accéder au portail</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Company Section */}
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/20">
                    Information Société
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/80 mb-1">Nom de la société *</label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => updateField('companyName', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Nom du contact *</label>
                      <input
                        type="text"
                        value={formData.contactName}
                        onChange={(e) => updateField('contactName', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Téléphone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                        placeholder="+33 1 23 45 67 89"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/20">
                    Adresse
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/80 mb-1">Adresse *</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                        placeholder="16 Rue de la République"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Code Postal *</label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => updateField('postalCode', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                        placeholder="75001"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Ville *</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                        placeholder="Paris"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Account Section */}
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/20">
                    Identifiants
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/80 mb-1">Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Mot de passe *</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                        placeholder="Minimum 6 caractères"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">Confirmer *</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setPage('login')}
                    className="flex-1 py-3 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-[#00A651] text-white rounded-lg font-semibold hover:bg-[#008f45] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Création...' : 'Créer le compte'}
                  </button>
                </div>
              </form>
              
              <div className="px-6 pb-6 text-center">
                <p className="text-white/60">
                  Déjà un compte?{' '}
                  <button onClick={() => setPage('login')} className="text-[#00A651] font-semibold hover:text-[#00c564]">
                    Se connecter
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
