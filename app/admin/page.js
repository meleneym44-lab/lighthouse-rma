'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Expose supabase to window for debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

// ============================================
// PDF GENERATION UTILITIES - PROFESSIONAL STYLE
// Matches the customer portal quote PDF format exactly
// ============================================

// Load jsPDF dynamically from CDN
const loadJsPDF = async () => {
  if (window.jspdf) return window.jspdf.jsPDF;
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Load image as base64 for PDF
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

// Color palette (matching customer portal)
const PDF_COLORS = {
  green: [0, 166, 81],
  darkBlue: [26, 26, 46],
  gray: [80, 80, 80],
  lightGray: [130, 130, 130],
  white: [255, 255, 255]
};

// Generate Quote/Devis PDF - PROFESSIONAL FORMAT
const generateQuotePDF = async (rma, devices, options = {}) => {
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF('p', 'mm', 'a4');
  const company = rma.companies || {};
  const biz = options.businessSettings || {};
  const shippingInfo = options.shipping || { parcels: 1, unitPrice: 45, total: 45 };
  
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerHeight = 16;
  const { green, darkBlue, gray, lightGray, white } = PDF_COLORS;
  
  let y = margin;
  
  // Load logos
  let lighthouseLogo = await loadImageAsBase64('/images/logos/lighthouse-logo.png');
  let capcertLogo = await loadImageAsBase64('/images/logos/capcert-logo.png');
  
  const addFooter = () => {
    pdf.setFillColor(...darkBlue);
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    pdf.setTextColor(...white);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(biz.company_name || 'Lighthouse France SAS', pageWidth / 2, pageHeight - footerHeight + 6, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.setFontSize(8);
    pdf.text(`${biz.address || '16, rue Paul Sejourne'} - ${biz.postal_code || '94000'} ${biz.city || 'CRETEIL'} - Tel. ${biz.phone || '01 43 77 28 07'}`, pageWidth / 2, pageHeight - footerHeight + 11, { align: 'center' });
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
  pdf.text('OFFRE DE PRIX', pageWidth - margin, y + 8, { align: 'right' });
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('N. ' + (rma.request_number || 'FR-XXXXX'), pageWidth - margin, y + 14, { align: 'right' });
  
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
  const qDate = rma.quoted_at ? new Date(rma.quoted_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
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
  // Determine what service types are needed based on devices
  const calibrationTypes = new Set();
  let hasRepair = false;
  devices.forEach(d => {
    const svcType = d.service_type || d.serviceType || 'calibration';
    const devType = d.device_type || d.deviceType || 'particle_counter';
    if (svcType.includes('calibration') || svcType === 'cal_repair') {
      calibrationTypes.add(devType);
    }
    if (svcType.includes('repair') || svcType === 'cal_repair') {
      hasRepair = true;
    }
  });
  if (calibrationTypes.size === 0) calibrationTypes.add('particle_counter');

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
  
  // Get devicePricing from options for detailed breakdown
  const devicePricing = options.devicePricing || devices.map(d => ({
    model: d.model_name || d.model || '',
    serial: d.serial_number || d.serial || '',
    needsCalibration: (d.service_type || '').includes('calibration'),
    needsRepair: (d.service_type || '').includes('repair'),
    calibrationPrice: d.quoted_price || 0,
    repairPrice: 0,
    nettoyagePrice: 0,
    additionalParts: [],
    isContractCovered: false
  }));
  
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
  let servicesSubtotal = options.servicesSubtotal || 0;

  // Build line items from devicePricing
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
      pdf.text(isContract ? 'Contrat' : unitPrice.toFixed(2) + ' EUR', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(isContract ? 'Contrat' : lineTotal.toFixed(2) + ' EUR', colTotal, y + 5, { align: 'right' });
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
      pdf.text(unitPrice.toFixed(2) + ' EUR', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(lineTotal.toFixed(2) + ' EUR', colTotal, y + 5, { align: 'right' });
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
      pdf.text(unitPrice.toFixed(2) + ' EUR', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(lineTotal.toFixed(2) + ' EUR', colTotal, y + 5, { align: 'right' });
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
      pdf.text(unitPrice.toFixed(2) + ' EUR', colUnit, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(lineTotal.toFixed(2) + ' EUR', colTotal, y + 5, { align: 'right' });
      y += rowH;
      rowIndex++;
    });
  });
  
  // Check if fully contract covered (passed from options)
  // Either explicitly passed as isFullyContractCovered, OR calculated from isContractRMA + all devices covered
  const isFullyContractCovered = options.isFullyContractCovered || 
    (options.isContractRMA && devicePricing.length > 0 && devicePricing.every(d => d.isContractCovered));
  
  console.log('PDF Gen - isContractRMA:', options.isContractRMA, 'isFullyContractCovered:', isFullyContractCovered);
  console.log('PDF Gen - devicePricing coverage:', devicePricing.map(d => ({ model: d.model, isContractCovered: d.isContractCovered })));
  
  // Shipping row
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth, rowH, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkBlue);
  pdf.text(String(shippingInfo.parcels || 1), colQty + 3, y + 5);
  const shipDesc = shippingInfo.parcels > 1 ? `Frais de port (${shippingInfo.parcels} colis)` : 'Frais de port';
  pdf.text(shipDesc, colDesc, y + 5);
  
  // Show "Contrat" for both unit price and total when fully contract covered
  const shippingUnitDisplay = isFullyContractCovered ? 'Contrat' : (shippingInfo.unitPrice || 45).toFixed(2) + ' EUR';
  pdf.text(shippingUnitDisplay, colUnit, y + 5, { align: 'right' });
  pdf.setFont('helvetica', 'bold');
  const shippingTotal = isFullyContractCovered ? 0 : (options.shippingTotal || shippingInfo.total || 0);
  const shippingTotalDisplay = isFullyContractCovered ? 'Contrat' : shippingTotal.toFixed(2) + ' EUR';
  pdf.text(shippingTotalDisplay, colTotal, y + 5, { align: 'right' });
  y += rowH;

  // Total row
  const grandTotal = isFullyContractCovered ? 0 : (options.grandTotal || (servicesSubtotal + shippingTotal));
  pdf.setFillColor(...green);
  pdf.rect(margin, y, contentWidth, 11, 'F');
  pdf.setTextColor(...white);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL HT', colUnit - 30, y + 7.5);
  pdf.setFontSize(16);
  const grandTotalDisplay = isFullyContractCovered ? 'Contrat' : grandTotal.toFixed(2) + ' EUR';
  pdf.text(grandTotalDisplay, colTotal, y + 8, { align: 'right' });
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
  pdf.text('M. Meleney', margin, sigY + 14);
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
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('Signature client', sigBoxX + 16, sigY + 7);
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.setLineDashPattern([2, 2], 0);
  pdf.roundedRect(sigBoxX + 5, sigY + 10, 52, 22, 2, 2, 'D');
  pdf.setLineDashPattern([], 0);
  pdf.text('Lu et approuve', sigBoxX + 18, sigY + 37);

  addFooter();
  return pdf.output('blob');
};

// Generate Parts Order Quote PDF
const generatePartsQuotePDF = async (order, quoteData) => {
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF('p', 'mm', 'a4');
  const company = order.companies || {};
  
  const parts = quoteData.parts || [];
  const shipping = quoteData.shipping || { parcels: 1, unitPrice: 45, total: 45 };
  const grandTotal = quoteData.grandTotal || 0;
  const quoteRef = quoteData.quoteRef || order.request_number;
  const createdBy = quoteData.createdBy || 'Lighthouse France';
  
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerHeight = 16;
  
  const amber = [245, 158, 11];
  const { darkBlue, gray, lightGray, white } = PDF_COLORS;
  
  let y = margin;
  
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

  // Header with logo
  if (lighthouseLogo) {
    try {
      const format = lighthouseLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(lighthouseLogo, format, margin, y, 50, 10);
    } catch (e) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkBlue);
      pdf.text('LIGHTHOUSE', margin, y + 8);
    }
  } else {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text('LIGHTHOUSE', margin, y + 8);
  }
  
  // Title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...amber);
  pdf.text('DEVIS PIECES', pageWidth - margin, y + 5, { align: 'right' });
  pdf.setFontSize(10);
  pdf.setTextColor(...gray);
  pdf.text(quoteRef, pageWidth - margin, y + 11, { align: 'right' });
  
  y += 18;
  
  // Amber line
  pdf.setFillColor(...amber);
  pdf.rect(0, y, pageWidth, 1.5, 'F');
  y += 6;
  
  // Date bar
  pdf.setFillColor(249, 250, 251);
  pdf.rect(margin, y, contentWidth, 8, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(...gray);
  const quoteDate = quoteData.createdAt ? new Date(quoteData.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  pdf.text(`Date: ${quoteDate}`, margin + 3, y + 5);
  pdf.text('Validite: 30 jours', pageWidth - margin - 3, y + 5, { align: 'right' });
  y += 12;
  
  // Client info
  pdf.setFontSize(7);
  pdf.setTextColor(...lightGray);
  pdf.text('CLIENT', margin, y);
  y += 4;
  pdf.setFontSize(11);
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
  if (company.billing_postal_code || company.billing_city) {
    pdf.text(`${company.billing_postal_code || ''} ${company.billing_city || ''}`.trim(), margin, y);
    y += 4;
  }
  y += 6;
  
  // Parts table header
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Pieces Commandees', margin, y);
  y += 5;
  
  const colQty = margin;
  const colRef = margin + 12;
  const colDesc = margin + 45;
  const colUnit = pageWidth - margin - 35;
  const colTotal = pageWidth - margin - 3;
  
  // Table header
  pdf.setFillColor(...darkBlue);
  pdf.rect(margin, y, contentWidth, 7, 'F');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...white);
  pdf.text('Qte', colQty + 2, y + 5);
  pdf.text('Reference', colRef, y + 5);
  pdf.text('Designation', colDesc, y + 5);
  pdf.text('P.U. HT', colUnit, y + 5, { align: 'right' });
  pdf.text('Total', colTotal, y + 5, { align: 'right' });
  y += 8;
  
  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  
  parts.forEach((part, idx) => {
    const rowHeight = 7;
    if (idx % 2 === 0) {
      pdf.setFillColor(255, 255, 255);
    } else {
      pdf.setFillColor(249, 250, 251);
    }
    pdf.rect(margin, y, contentWidth, rowHeight, 'F');
    
    pdf.setTextColor(...darkBlue);
    pdf.text(String(part.quantity || 1), colQty + 4, y + 5);
    pdf.setFontSize(7);
    pdf.text(part.partNumber || '-', colRef, y + 5);
    pdf.setFontSize(8);
    
    let desc = part.description || '';
    if (desc.length > 40) desc = desc.substring(0, 37) + '...';
    pdf.text(desc, colDesc, y + 5);
    
    pdf.text((part.unitPrice || 0).toFixed(2) + ' EUR', colUnit, y + 5, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text((part.lineTotal || 0).toFixed(2) + ' EUR', colTotal, y + 5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    
    y += rowHeight;
  });
  
  // Shipping row
  if (shipping.total > 0) {
    pdf.setFillColor(239, 246, 255);
    pdf.rect(margin, y, contentWidth, 7, 'F');
    pdf.setTextColor(30, 64, 175);
    pdf.text(String(shipping.parcels || 1), colQty + 4, y + 5);
    pdf.setFontSize(7);
    pdf.text('PORT', colRef, y + 5);
    pdf.setFontSize(8);
    pdf.text(`Frais de port (${shipping.parcels || 1} colis)`, colDesc, y + 5);
    pdf.text((shipping.unitPrice || 45).toFixed(2) + ' EUR', colUnit, y + 5, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text((shipping.total || 0).toFixed(2) + ' EUR', colTotal, y + 5, { align: 'right' });
    y += 7;
  }
  
  // Total row
  pdf.setFillColor(...amber);
  pdf.rect(margin, y, contentWidth, 8, 'F');
  pdf.setTextColor(...white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('TOTAL HT', colUnit - 15, y + 6, { align: 'right' });
  pdf.text(grandTotal.toFixed(2) + ' EUR', colTotal, y + 6, { align: 'right' });
  y += 14;
  
  // Conditions
  pdf.setFillColor(249, 250, 251);
  pdf.rect(margin, y, contentWidth, 22, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Conditions:', margin + 3, y + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('- Devis valable 30 jours', margin + 5, y + 10);
  pdf.text('- Paiement: 30 jours fin de mois', margin + 5, y + 14);
  pdf.text('- Livraison: Sous reserve de disponibilite', margin + 5, y + 18);
  y += 28;
  
  // Signature section
  pdf.setFontSize(7);
  pdf.setTextColor(...lightGray);
  pdf.text('ETABLI PAR', margin, y);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(createdBy, margin, y + 5);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('Lighthouse France', margin, y + 9);
  
  // Signature box
  const sigBoxX = pageWidth - margin - 55;
  pdf.setFontSize(7);
  pdf.setTextColor(...lightGray);
  pdf.text('Bon pour accord', sigBoxX + 12, y);
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.setLineDashPattern([2, 2], 0);
  pdf.roundedRect(sigBoxX + 3, y + 3, 48, 18, 2, 2, 'D');
  pdf.setLineDashPattern([], 0);
  pdf.text('Signature et cachet', sigBoxX + 9, y + 26);

  addFooter();
  return pdf.output('blob');
};

// Generate Service Report PDF - PROFESSIONAL FORMAT
const generateServiceReportPDF = async (device, rma, technicianName, calType, receptionResult, findings, workCompleted, checklist, businessSettings) => {
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF('p', 'mm', 'a4');
  const company = rma.companies || {};
  const biz = businessSettings || {};
  
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerHeight = 16;
  const { green, darkBlue, gray, lightGray, white } = PDF_COLORS;
  
  let y = margin;
  
  let lighthouseLogo = await loadImageAsBase64('/images/logos/lighthouse-logo.png');
  let capcertLogo = await loadImageAsBase64('/images/logos/capcert-logo.png');
  
  const addFooter = () => {
    pdf.setFillColor(...darkBlue);
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    pdf.setTextColor(...white);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(biz.company_name || 'Lighthouse France SAS', pageWidth / 2, pageHeight - footerHeight + 6, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.setFontSize(8);
    pdf.text(`${biz.address || '16, rue Paul Sejourne'} - ${biz.postal_code || '94000'} ${biz.city || 'CRETEIL'} - Tel. ${biz.phone || '01 43 77 28 07'}`, pageWidth / 2, pageHeight - footerHeight + 11, { align: 'center' });
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
  pdf.text('RAPPORT DE SERVICE', pageWidth - margin, y + 8, { align: 'right' });
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('RMA ' + (rma.request_number || 'FR-XXXXX'), pageWidth - margin, y + 14, { align: 'right' });
  
  y += 18;
  pdf.setDrawColor(...green);
  pdf.setLineWidth(1);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ===== INFO BAR =====
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth, 16, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('DATE', margin + 5, y + 5);
  pdf.text('TECHNICIEN', margin + 50, y + 5);
  pdf.text('TYPE', margin + 110, y + 5);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(new Date().toLocaleDateString('fr-FR'), margin + 5, y + 12);
  pdf.text(technicianName || 'N/A', margin + 50, y + 12);
  pdf.text(calType || 'Standard', margin + 110, y + 12);
  y += 22;

  // ===== DEVICE INFO =====
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('APPAREIL', margin, y);
  y += 5;
  
  pdf.setFillColor(240, 249, 255);
  pdf.rect(margin, y, contentWidth / 2 - 5, 28, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(device.model_name || 'N/A', margin + 5, y + 8);
  pdf.setFontSize(10);
  pdf.setFont('courier', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('SN: ' + (device.serial_number || 'N/A'), margin + 5, y + 16);
  pdf.setFont('helvetica', 'normal');
  pdf.text(device.service_type === 'calibration' ? 'Étalonnage' : 'Réparation', margin + 5, y + 23);
  
  // Client box
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin + contentWidth / 2 + 5, y, contentWidth / 2 - 5, 28, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('CLIENT', margin + contentWidth / 2 + 10, y + 5);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(company.name || 'N/A', margin + contentWidth / 2 + 10, y + 13);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  const addr = [company.billing_address || company.address, company.billing_city || company.city].filter(Boolean).join(', ');
  pdf.text(addr.substring(0, 40), margin + contentWidth / 2 + 10, y + 20);
  
  y += 35;

  // ===== RECEPTION RESULT =====
  if (receptionResult && receptionResult !== 'none') {
    const isConform = receptionResult === 'Conforme';
    pdf.setFillColor(isConform ? 220 : 254, isConform ? 252 : 243, isConform ? 231 : 199);
    pdf.rect(margin, y, contentWidth, 12, 'F');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(isConform ? 22 : 161, isConform ? 163 : 98, isConform ? 74 : 7);
    pdf.text((isConform ? '✓ ' : '⚠ ') + 'Résultat à la réception: ' + receptionResult, margin + 5, y + 8);
    y += 17;
  }

  // ===== FINDINGS =====
  pdf.setDrawColor(...[59, 130, 246]); // Blue
  pdf.setLineWidth(1);
  pdf.line(margin, y, margin, y + 30);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('CONSTATATIONS', margin + 5, y + 6);
  y += 10;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  const findingsLines = pdf.splitTextToSize(findings || 'Aucune constatation particulière', contentWidth - 10);
  findingsLines.forEach(line => {
    pdf.text(line, margin + 5, y);
    y += 5;
  });
  y += 8;

  // ===== WORK COMPLETED =====
  pdf.setDrawColor(...green);
  pdf.setLineWidth(1);
  pdf.line(margin, y, margin, y + 30);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('TRAVAUX EFFECTUÉS', margin + 5, y + 6);
  y += 10;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  const workLines = pdf.splitTextToSize(workCompleted || 'Service effectué selon procédure standard', contentWidth - 10);
  workLines.forEach(line => {
    pdf.text(line, margin + 5, y);
    y += 5;
  });
  y += 8;

  // ===== CHECKLIST =====
  if (checklist && checklist.length > 0) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text('VÉRIFICATIONS', margin, y);
    y += 6;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    checklist.forEach(item => {
      const checked = item.checked;
      pdf.setTextColor(checked ? 22 : 161, checked ? 163 : 98, checked ? 74 : 7);
      pdf.text(checked ? '✓' : '○', margin + 3, y);
      pdf.setTextColor(...gray);
      pdf.text(item.label, margin + 10, y);
      y += 5;
    });
    y += 5;
  }

  // ===== SIGNATURE SECTION =====
  const sigY = Math.max(y + 10, pageHeight - footerHeight - 40);
  
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, sigY, pageWidth - margin, sigY);
  
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('TECHNICIEN', margin, sigY + 7);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(technicianName || 'N/A', margin, sigY + 14);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('Date: ' + new Date().toLocaleDateString('fr-FR'), margin, sigY + 20);

  if (capcertLogo) {
    try {
      const format = capcertLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(capcertLogo, format, pageWidth - margin - 35, sigY + 3, 32, 32);
    } catch (e) {}
  }

  addFooter();
  return pdf.output('blob');
};

// Generate Bon de Livraison PDF - PROFESSIONAL FORMAT
const generateBLPDF = async (rma, devices, shipment, blNumber, businessSettings) => {
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF('p', 'mm', 'a4');
  const company = rma.companies || {};
  const address = shipment.address || {};
  const biz = businessSettings || {};
  
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerHeight = 16;
  const { green, darkBlue, gray, lightGray, white } = PDF_COLORS;
  
  let y = margin;
  
  let lighthouseLogo = await loadImageAsBase64('/images/logos/lighthouse-logo.png');
  let capcertLogo = await loadImageAsBase64('/images/logos/capcert-logo.png');
  
  const addFooter = () => {
    pdf.setFillColor(...darkBlue);
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    pdf.setTextColor(...white);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(biz.company_name || 'Lighthouse France SAS', pageWidth / 2, pageHeight - footerHeight + 6, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.setFontSize(8);
    pdf.text(`${biz.address || '16, rue Paul Sejourne'} - ${biz.postal_code || '94000'} ${biz.city || 'CRETEIL'} - Tel. ${biz.phone || '01 43 77 28 07'}`, pageWidth / 2, pageHeight - footerHeight + 11, { align: 'center' });
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
  pdf.text('BON DE LIVRAISON', pageWidth - margin, y + 8, { align: 'right' });
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text(blNumber, pageWidth - margin, y + 14, { align: 'right' });
  
  y += 18;
  pdf.setDrawColor(...green);
  pdf.setLineWidth(1);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ===== INFO BAR =====
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth, 12, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('DATE', margin + 5, y + 4);
  pdf.text('RMA', margin + 60, y + 4);
  pdf.text('N° SUIVI UPS', margin + 110, y + 4);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(new Date().toLocaleDateString('fr-FR'), margin + 5, y + 10);
  pdf.text(rma.request_number || 'N/A', margin + 60, y + 10);
  pdf.setFont('courier', 'normal');
  pdf.text(shipment.trackingNumber || 'N/A', margin + 110, y + 10);
  y += 18;

  // ===== ADDRESSES =====
  // Destinataire
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth / 2 - 5, 38, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('DESTINATAIRE', margin + 5, y + 6);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(address.company_name || company.name || 'N/A', margin + 5, y + 14);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  if (address.attention) pdf.text("À l'att. de: " + address.attention, margin + 5, y + 20);
  pdf.text(address.address_line1 || '', margin + 5, y + 26);
  pdf.text((address.postal_code || '') + ' ' + (address.city || ''), margin + 5, y + 32);
  
  // Expéditeur
  pdf.setFillColor(240, 249, 255);
  pdf.rect(margin + contentWidth / 2 + 5, y, contentWidth / 2 - 5, 38, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('EXPÉDITEUR', margin + contentWidth / 2 + 10, y + 6);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(biz.company_name || 'LIGHTHOUSE FRANCE', margin + contentWidth / 2 + 10, y + 14);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text(biz.address || '16 rue Paul Séjourné', margin + contentWidth / 2 + 10, y + 20);
  pdf.text((biz.postal_code || '94000') + ' ' + (biz.city || 'Créteil'), margin + contentWidth / 2 + 10, y + 26);
  pdf.text('France', margin + contentWidth / 2 + 10, y + 32);
  
  y += 45;

  // ===== DEVICES TABLE =====
  const rowH = 10;
  
  // Header
  pdf.setFillColor(...darkBlue);
  pdf.rect(margin, y, contentWidth, 9, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...white);
  pdf.text('Qté', margin + 5, y + 6);
  pdf.text('Désignation', margin + 20, y + 6);
  pdf.text('N° Série', margin + 100, y + 6);
  pdf.text('Service', margin + 150, y + 6);
  y += 9;

  const devicesToList = shipment.devices || devices;
  devicesToList.forEach((d, idx) => {
    pdf.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250);
    pdf.rect(margin, y, contentWidth, rowH, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkBlue);
    pdf.text('1', margin + 7, y + 7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Compteur LIGHTHOUSE ' + (d.model_name || d.model || ''), margin + 20, y + 7);
    pdf.setFont('courier', 'normal');
    pdf.text(d.serial_number || d.serial || '', margin + 100, y + 7);
    pdf.setFont('helvetica', 'normal');
    const svc = d.service_type === 'calibration' ? 'Étalonnage' : d.service_type === 'repair' ? 'Réparation' : 'Service';
    pdf.text(svc, margin + 150, y + 7);
    y += rowH;
  });
  
  y += 5;

  // ===== SHIPPING INFO =====
  pdf.setDrawColor(...green);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('Informations d\'expédition', margin, y);
  y += 7;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...gray);
  pdf.text('Transporteur:', margin, y);
  pdf.setFont('helvetica', 'bold');
  pdf.text('UPS', margin + 35, y);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Nombre de colis:', margin + 80, y);
  pdf.setFont('helvetica', 'bold');
  pdf.text(String(shipment.parcels || 1), margin + 120, y);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Poids:', margin + 140, y);
  pdf.setFont('helvetica', 'bold');
  pdf.text((shipment.weight || '1') + ' kg', margin + 155, y);
  
  y += 15;

  // ===== SIGNATURE SECTION =====
  const sigY = Math.max(y, pageHeight - footerHeight - 50);
  
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, sigY, pageWidth - margin, sigY);
  
  // Signature boxes
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text('Signature Expéditeur', margin + 20, sigY + 8);
  pdf.setDrawColor(180, 180, 180);
  pdf.roundedRect(margin, sigY + 12, 80, 25, 2, 2, 'D');
  
  pdf.text('Signature Destinataire', margin + contentWidth / 2 + 20, sigY + 8);
  pdf.roundedRect(margin + contentWidth / 2, sigY + 12, 80, 25, 2, 2, 'D');

  if (capcertLogo) {
    try {
      const format = capcertLogo.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(capcertLogo, format, pageWidth - margin - 25, sigY + 10, 22, 22);
    } catch (e) {}
  }

  addFooter();
  return pdf.output('blob');
};

// Generate UPS Label PDF - PROFESSIONAL FORMAT
const generateUPSLabelPDF = async (rma, shipment) => {
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF('p', 'mm', 'a4');
  const address = shipment.address || {};
  
  const pageWidth = 210;
  const { darkBlue, gray, white } = PDF_COLORS;
  
  // UPS Brown color
  const upsBrown = [53, 28, 21];
  
  let y = 30;
  
  // UPS Header
  pdf.setFillColor(...upsBrown);
  pdf.rect(30, y, 150, 25, 'F');
  pdf.setTextColor(...white);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text('UPS', 105, y + 17, { align: 'center' });
  y += 30;
  
  // Tracking number box
  pdf.setFillColor(245, 245, 245);
  pdf.rect(30, y, 150, 20, 'F');
  pdf.setDrawColor(...upsBrown);
  pdf.setLineWidth(2);
  pdf.rect(30, y, 150, 20, 'D');
  pdf.setTextColor(...darkBlue);
  pdf.setFontSize(18);
  pdf.setFont('courier', 'bold');
  pdf.text(shipment.trackingNumber || 'TRACKING NUMBER', 105, y + 13, { align: 'center' });
  y += 28;
  
  // Barcode representation
  pdf.setFillColor(0, 0, 0);
  for (let i = 0; i < 50; i++) {
    const x = 40 + i * 2.5;
    const height = 15 + Math.random() * 10;
    const width = Math.random() > 0.5 ? 1.5 : 0.8;
    pdf.rect(x, y, width, height, 'F');
  }
  y += 35;
  
  // TO Address
  pdf.setDrawColor(...darkBlue);
  pdf.setLineWidth(1);
  pdf.rect(30, y, 150, 55, 'D');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...gray);
  pdf.text('DESTINATAIRE / TO:', 35, y + 8);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text(address.company_name || '', 35, y + 18);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  if (address.attention) {
    pdf.text("À l'att.: " + address.attention, 35, y + 26);
  }
  pdf.text(address.address_line1 || '', 35, y + 34);
  pdf.setFont('helvetica', 'bold');
  pdf.text((address.postal_code || '') + ' ' + (address.city || ''), 35, y + 42);
  pdf.text(address.country || 'France', 35, y + 50);
  y += 62;
  
  // FROM Address
  pdf.setDrawColor(...gray);
  pdf.setLineWidth(0.5);
  pdf.rect(30, y, 150, 45, 'D');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...gray);
  pdf.text('EXPÉDITEUR / FROM:', 35, y + 8);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkBlue);
  pdf.text('LIGHTHOUSE FRANCE', 35, y + 18);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('16 rue Paul Séjourné', 35, y + 26);
  pdf.text('94000 Créteil, France', 35, y + 34);
  y += 52;
  
  // Package info
  pdf.setFillColor(...upsBrown);
  pdf.rect(30, y, 150, 20, 'F');
  pdf.setTextColor(...white);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text((shipment.parcels || 1) + ' COLIS', 65, y + 13);
  pdf.text((shipment.weight || '1') + ' KG', 145, y + 13);
  y += 28;
  
  // Reference
  pdf.setFontSize(10);
  pdf.setTextColor(...gray);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Réf: ' + (rma.request_number || ''), 105, y, { align: 'center' });
  
  return pdf.output('blob');
};

// Upload PDF to Supabase Storage
const uploadPDFToStorage = async (blob, folder, filename) => {
  try {
    const file = new File([blob], filename, { type: 'application/pdf' });
    const filePath = `${folder}/${filename}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);
    
    return publicUrl;
  } catch (err) {
    console.error('PDF upload error:', err);
    throw err;
  }
};

// ============================================
// BL and REPORT PDF GENERATION - Using same jsPDF approach as Quote
// ============================================

// Generate BL PDF - Uses html2canvas to capture actual rendered HTML
const generateBLPDFFromHTML = async (bl, employeeName, businessSettings) => {
  // Load html2canvas if needed
  if (!window.html2canvas) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  const jsPDF = await loadJsPDF();
  const biz = businessSettings || {};

  // Create a temporary container with the exact BL HTML
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.minHeight = '297mm';
  container.style.background = 'white';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '11pt';
  container.style.color = '#333';
  container.style.padding = '15px 25px';
  container.style.boxSizing = 'border-box';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  
  container.innerHTML = `
    <div style="flex: 1 0 auto;">
      <!-- Header -->
      <div style="margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid #333;">
        <div style="font-size: 24px; font-weight: bold; color: #333;">LIGHTHOUSE<div style="font-size: 10px; color: #666;">FRANCE</div></div>
      </div>

      <!-- Title -->
      <div style="text-align: center; margin: 20px 0;">
        <h1 style="font-size: 20pt; font-weight: bold; color: #333; margin: 0;">BON DE LIVRAISON</h1>
        <div style="font-size: 14pt; color: #333; font-weight: bold; margin-top: 8px;">${bl.blNumber}</div>
      </div>

      <!-- Date & RMA Row -->
      <div style="display: flex; justify-content: space-between; margin: 12px 0;">
        <div><span style="color: #666;">${biz.city || 'Créteil'}, le</span> <strong>${bl.date}</strong></div>
        <div><span style="color: #666;">RMA:</span> <strong>${bl.rmaNumber}</strong></div>
      </div>

      <!-- Client Box -->
      <div style="background: #f8f9fa; border: 1px solid #ddd; padding: 15px; margin: 12px 0;">
        <div style="font-size: 9pt; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Destinataire</div>
        <div style="font-size: 12pt; font-weight: bold; margin-bottom: 5px;">${bl.client.name}</div>
        ${bl.client.attention ? `<div>À l'attention de: <strong>${bl.client.attention}</strong></div>` : ''}
        <div>${bl.client.street}</div>
        <div>${bl.client.city}</div>
        <div>${bl.client.country}</div>
      </div>

      <!-- Devices Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <thead>
          <tr>
            <th style="background: rgba(51,51,51,0.35); color: #333; padding: 10px 12px; text-align: left; font-size: 10pt; font-weight: bold; border-bottom: 2px solid #333; width: 50px;">Qté</th>
            <th style="background: rgba(51,51,51,0.35); color: #333; padding: 10px 12px; text-align: left; font-size: 10pt; font-weight: bold; border-bottom: 2px solid #333;">Désignation</th>
            <th style="background: rgba(51,51,51,0.35); color: #333; padding: 10px 12px; text-align: left; font-size: 10pt; font-weight: bold; border-bottom: 2px solid #333; width: 120px;">N° Série</th>
            <th style="background: rgba(51,51,51,0.35); color: #333; padding: 10px 12px; text-align: left; font-size: 10pt; font-weight: bold; border-bottom: 2px solid #333; width: 100px;">Service</th>
          </tr>
        </thead>
        <tbody>
          ${bl.devices.map((d, idx) => `
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 10pt; ${idx % 2 === 1 ? 'background: #f9f9f9;' : ''} text-align: center; font-weight: 600;">1</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 10pt; ${idx % 2 === 1 ? 'background: #f9f9f9;' : ''}">Compteur de particules LIGHTHOUSE ${d.model}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 10pt; ${idx % 2 === 1 ? 'background: #f9f9f9;' : ''} font-family: monospace;">${d.serial}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 10pt; ${idx % 2 === 1 ? 'background: #f9f9f9;' : ''}">${d.service}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Shipping Info -->
      <div style="margin: 15px 0;">
        <div style="font-weight: bold; font-size: 11pt; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">Informations d'expédition</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="display: flex; padding: 6px 0;"><span style="color: #666; width: 130px;">Transporteur:</span><span style="font-weight: 600;">${bl.shipping.carrier}</span></div>
          <div style="display: flex; padding: 6px 0;"><span style="color: #666; width: 130px;">N° de suivi:</span><span style="font-weight: 600; font-family: monospace;">${bl.shipping.tracking}</span></div>
          <div style="display: flex; padding: 6px 0;"><span style="color: #666; width: 130px;">Nombre de colis:</span><span style="font-weight: 600;">${bl.shipping.parcels}</span></div>
          <div style="display: flex; padding: 6px 0;"><span style="color: #666; width: 130px;">Poids:</span><span style="font-weight: 600;">${bl.shipping.weight} kg</span></div>
        </div>
      </div>

      <!-- Prepared By -->
      <div style="font-size: 10pt; margin-top: 12px; color: #666;">
        Préparé par: <strong style="color: #333;">${employeeName}</strong>
      </div>
    </div>

    <!-- Footer -->
    <div style="flex-shrink: 0; margin-top: auto; padding-top: 15px; border-top: 2px solid #333;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 30px;">
        <div style="font-size: 18px; color: #333; border: 2px solid #333; padding: 18px 24px; border-radius: 6px; text-align: center;"><strong>CAPCERT</strong><br>ISO 9001</div>
        <div style="font-size: 8pt; color: #555; text-align: center; line-height: 1.8;">
          <strong style="color: #333; font-size: 9pt;">${biz.company_name || 'Lighthouse France SAS'}</strong> au capital de ${biz.capital || '10 000'} €<br>
          ${biz.address || '16 rue Paul Séjourné'}, ${biz.postal_code || '94000'} ${biz.city || 'CRÉTEIL'} | Tél. ${biz.phone || '01 43 77 28 07'}<br>
          SIRET ${biz.siret || '50178134800013'} | TVA ${biz.tva || 'FR 86501781348'}<br>
          ${biz.email || 'France@golighthouse.com'} | ${biz.website || 'www.golighthouse.fr'}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await window.html2canvas(container, { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: '#ffffff',
      logging: false,
      width: container.offsetWidth,
      height: Math.max(container.offsetHeight, 1122)
    });
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgRatio = canvas.height / canvas.width;
    let imgHeight = pdfWidth * imgRatio;
    
    if (imgHeight > pdfHeight) {
      imgHeight = pdfHeight;
    }
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
    
    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
};

// Generate Service Report PDF - Uses html2canvas to capture actual rendered HTML
const generateReportPDFFromHTML = async (device, rma, technicianName, calType, receptionResult, findings, workCompleted, checklist) => {
  // Load html2canvas if needed
  if (!window.html2canvas) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  const jsPDF = await loadJsPDF();
  
  const today = new Date().toLocaleDateString('fr-FR');
  const serviceTypeText = device.service_type === 'calibration' ? 'Étalonnage' : device.service_type === 'repair' ? 'Réparation' : 'Étalonnage et Réparation';
  const motifText = device.notes ? `${serviceTypeText} - ${device.notes}` : serviceTypeText;
  const showCalType = calType && calType !== 'none';
  const showReceptionResult = receptionResult && receptionResult !== 'none';
  const checkedItems = (checklist || []).filter(item => item.checked);

  // Create a temporary container with the exact report HTML
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.minHeight = '297mm';
  container.style.background = 'white';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.padding = '40px 50px';
  container.style.boxSizing = 'border-box';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  
  container.innerHTML = `
    <!-- Logo Header -->
    <div style="margin-bottom: 40px; display: flex; align-items: center; gap: 8px;">
      <div style="display: flex; flex-direction: column; gap: 2px; margin-right: 8px;">
        <div style="width: 48px; height: 8px; background: #FFD200;"></div>
        <div style="width: 48px; height: 8px; background: #003366;"></div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #003366;">LIGHTHOUSE</div>
        <div style="font-size: 10px; letter-spacing: 3px; color: #666; margin-top: -4px;">WORLDWIDE SOLUTIONS</div>
      </div>
    </div>

    <!-- Info Table -->
    <table style="width: 100%; font-size: 12px; margin-bottom: 24px; border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #003366; width: 150px;">Date d'achèvement</td>
        <td style="padding: 4px 0; color: #333; width: 200px;">${today}</td>
        <td style="padding: 4px 0;"><span style="font-weight: bold; color: #003366;">RMA # </span><span style="color: #333;">${rma.request_number}</span></td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #003366;">Client</td>
        <td style="padding: 4px 0; color: #333;" colspan="2">${rma.companies?.name || ''}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #003366;">Adresse</td>
        <td style="padding: 4px 0; color: #333;" colspan="2">${rma.companies?.billing_address || '—'}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #003366;">Code postal / Ville</td>
        <td style="padding: 4px 0; color: #333;">${rma.companies?.billing_postal_code || ''} ${rma.companies?.billing_city || ''}</td>
        <td style="padding: 4px 0;"><span style="font-weight: bold; color: #003366;">Contact </span><span style="color: #333;">${rma.companies?.contact_name || '—'}</span></td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #003366;">Téléphone</td>
        <td style="padding: 4px 0; color: #333;">${rma.companies?.phone || '—'}</td>
        <td style="padding: 4px 0; font-weight: bold; color: #003366;">Technicien(ne) de service</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #003366;">Modèle#</td>
        <td style="padding: 4px 0; color: #333;">${device.model_name}</td>
        <td style="padding: 4px 0; color: #333;">${technicianName || 'Lighthouse France'}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #003366;">Numéro de série</td>
        <td style="padding: 4px 0; color: #333;" colspan="2">${device.serial_number}</td>
      </tr>
    </table>

    <!-- Content Sections -->
    <div style="flex-grow: 1;">
      <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0 8px; font-weight: bold; color: #003366; width: 170px; vertical-align: top;">Motif de retour</td>
          <td style="padding: 20px 0 8px; color: #333;">${motifText}</td>
        </tr>
        ${showCalType ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #003366; vertical-align: top;">Étalonnage effectué</td>
          <td style="padding: 8px 0; color: #333;">${calType}</td>
        </tr>
        ` : ''}
        ${showReceptionResult ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #003366; vertical-align: top;">Résultats à la réception</td>
          <td style="padding: 8px 0; color: #333;">${receptionResult}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 20px 0 8px; font-weight: bold; color: #003366; vertical-align: top;">Constatations</td>
          <td style="padding: 20px 0 8px; color: #333; white-space: pre-wrap;">${findings || '—'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #003366; vertical-align: top;">Actions effectuées</td>
          <td style="padding: 8px 0; color: #333; white-space: pre-wrap;">${workCompleted || '—'}</td>
        </tr>
        <tr>
          <td style="padding: 30px 0 8px; font-weight: bold; color: #003366; vertical-align: top;">Travaux réalisés</td>
          <td style="padding: 30px 0 8px;">
            ${checkedItems.map(item => `
              <div style="margin-bottom: 4px;">
                <span style="color: #003366;">☑</span>
                <span style="color: #333; margin-left: 8px;">${item.label}</span>
              </div>
            `).join('')}
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer - positioned at bottom -->
    <div style="text-align: center; font-size: 12px; color: #666; padding-top: 32px; margin-top: auto;">
      <div style="font-weight: bold; color: #003366;">Lighthouse Worldwide Solutions France</div>
      <div>16 Rue Paul Séjourné 94000 Créteil France</div>
      <div>01 43 77 28 07</div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Capture the container
    const canvas = await window.html2canvas(container, { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: '#ffffff',
      logging: false,
      width: container.offsetWidth,
      height: Math.max(container.offsetHeight, 1122) // 297mm at 96dpi ≈ 1122px - ensure minimum A4 height
    });
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgRatio = canvas.height / canvas.width;
    let imgHeight = pdfWidth * imgRatio;
    
    // If content is shorter than A4, just add it at top (footer will be at bottom of content)
    // If content is taller, scale to fit
    if (imgHeight > pdfHeight) {
      imgHeight = pdfHeight;
    }
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
    
    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
};

const STATUS_STYLES = {
  // Admin steps (Soumis → Reçu)
  submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Soumis' },
  rma_created: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'RMA/Devis Créé' },
  quote_sent: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Devis envoyé' },
  waiting_bc: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attente BC' },
  bc_review: { bg: 'bg-orange-100', text: 'text-orange-700', label: '⚠️ BC à vérifier' },
  bc_rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ BC Rejeté' },
  quote_approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Devis Approuvé' },
  waiting_reception: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En attente réception' },
  received: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Reçu' },
  
  // Service steps (File d'attente → Étalonnage/Réparation)
  in_queue: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'File d\'attente' },
  inspection: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Inspection' },
  approbation: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Approbation' },
  calibration: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Étalonnage' },
  repair: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Réparation' },
  
  // QC step
  qc: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Contrôle QC' },
  qc_rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ QC Rejeté' },
  
  // Final Admin steps (Prêt → Expédié)
  ready: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Prêt' },
  shipped: { bg: 'bg-green-100', text: 'text-green-700', label: 'Expédié' },
  
  // Other
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Terminé' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-500', label: '📦 Archivé' },
  
  // Legacy mappings (for backwards compatibility)
  approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'RMA/Devis Créé' },
  waiting_device: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En attente réception' },
  calibration_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Étalonnage' },
  repair_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Réparation' },
  final_qc: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Contrôle QC' },
  ready_to_ship: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Prêt' },
  quote_revision_requested: { bg: 'bg-red-100', text: 'text-red-700', label: '🔴 Modification demandée' }
};

export default function AdminPortal() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedRMA, setSelectedRMA] = useState(null); // Full-page RMA view
  const [selectedDeviceFromDashboard, setSelectedDeviceFromDashboard] = useState(null); // Direct device selection from device view
  
  // Business settings - used across all documents (BL, quotes, invoices)
  const [businessSettings, setBusinessSettings] = useState({
    company_name: 'Lighthouse France SAS',
    address: '16 rue Paul Séjourné',
    city: 'CRÉTEIL',
    postal_code: '94000',
    phone: '01 43 77 28 07',
    email: 'France@golighthouse.com',
    website: 'www.golighthouse.fr',
    siret: '50178134800013',
    tva: 'FR 86501781348',
    capital: '10 000'
  });

  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async (refreshSelectedRMAId = null) => {
    const { data: reqs } = await supabase.from('service_requests')
      .select('*, companies(*), request_devices(*)')
      .order('created_at', { ascending: false });
    if (reqs) setRequests(reqs);

    const { data: companies } = await supabase.from('companies')
      .select('*, profiles(id, full_name, email, phone, role), shipping_addresses(*)')
      .order('name', { ascending: true });
    if (companies) setClients(companies);

    const { data: equip } = await supabase.from('equipment').select('*, companies(name)').order('created_at', { ascending: false });
    if (equip) setEquipment(equip);

    const { data: staff } = await supabase.from('profiles').select('*').in('role', ['lh_admin', 'lh_employee']).order('full_name');
    if (staff) setStaffMembers(staff);

    const { data: contractsData } = await supabase.from('contracts').select('id, status').order('created_at', { ascending: false });
    if (contractsData) setContracts(contractsData);
    
    // Load rental requests
    const { data: rentalsData, error: rentalsError } = await supabase.from('rental_requests')
      .select('*, companies(*), rental_request_items(*), shipping_address:shipping_addresses!shipping_address_id(*)')
      .order('created_at', { ascending: false });
    console.log('Main loadData - rental_requests:', { rentalsData, rentalsError });
    if (rentalsData) setRentalRequests(rentalsData);
    
    // Load business settings
    const { data: settings } = await supabase.from('business_settings').select('*').eq('id', 1).single();
    if (settings) {
      setBusinessSettings(settings);
    }
    
    // Only refresh selected RMA if ID is provided
    if (refreshSelectedRMAId) {
      const { data: updatedRMA } = await supabase
        .from('service_requests')
        .select('*, companies(*), request_devices(*)')
        .eq('id', refreshSelectedRMAId)
        .single();
      if (updatedRMA) setSelectedRMA(updatedRMA);
    }
  }, []); // No dependencies - stable function

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: p } = await supabase.from('profiles').select('*, companies(*)').eq('id', session.user.id).single();
        if (p) {
          if (p.role !== 'lh_admin' && p.role !== 'lh_employee') { window.location.href = '/'; return; }
          setProfile(p);
          await loadData();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [loadData]);

  const logout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };
  const isAdmin = profile?.role === 'lh_admin';
  
  // Count pending requests and modification requests - EXCLUDE parts orders
  const rmaRequests = requests.filter(r => r.request_type !== 'parts');
  const pendingCount = rmaRequests.filter(r => r.status === 'submitted' && !r.request_number).length;
  const modificationCount = rmaRequests.filter(r => r.status === 'quote_revision_requested').length;
  const totalBadge = pendingCount + modificationCount;
  // Contract badge: new requests, BC pending review, OR quote revision requested
  const contractActionCount = contracts.filter(c => 
    c.status === 'requested' || 
    c.status === 'bc_pending' || 
    c.status === 'quote_revision_requested'
  ).length;
  // Open chats count - includes unread messages
  const openChatsCount = requests.filter(r => r.chat_status === 'open' || (r.unread_admin_count || 0) > 0).length;
  const totalUnreadMessages = requests.reduce((sum, r) => sum + (r.unread_admin_count || 0), 0);
  
  // Dashboard filter state
  const [dashboardFilter, setDashboardFilter] = useState(null);
  
  // Rental requests count
  const [rentalRequests, setRentalRequests] = useState([]);
  const rentalActionCount = rentalRequests.filter(r => 
    r.status === 'requested' || 
    r.status === 'bc_review'
  ).length;
  
  // Parts Orders count - pending parts requests AND BC to review
  const partsOrders = requests.filter(r => r.request_type === 'parts');
  const partsOrdersActionCount = partsOrders.filter(r => 
    r.status === 'submitted' || 
    r.status === 'quote_revision_requested' ||
    r.status === 'bc_review'
  ).length;
  
  const sheets = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: '📊' },
    { id: 'requests', label: 'Demandes', icon: '📋', badge: totalBadge > 0 ? totalBadge : null },
    { id: 'parts', label: 'Pièces Détachées', icon: '🔩', badge: partsOrdersActionCount > 0 ? partsOrdersActionCount : null },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'messages', label: 'Messages', icon: '💬', badge: totalUnreadMessages > 0 ? totalUnreadMessages : (openChatsCount > 0 ? openChatsCount : null) },
    { id: 'pricing', label: 'Tarifs & Pièces', icon: '💰' },
    { id: 'contracts', label: 'Contrats', icon: '📄', badge: contractActionCount > 0 ? contractActionCount : null },
    { id: 'rentals', label: 'Locations', icon: '📅', badge: rentalActionCount > 0 ? rentalActionCount : null },
    { id: 'ups', label: 'UPS', icon: '📦' },
    { id: 'settings', label: 'Paramètres', icon: '⚙️' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: '🔐' }] : [])
  ];

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin" /></div>;
  if (!user || !profile) return <LoginPage />;

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}
      <header className="bg-white text-[#1a1a2e] shadow-lg border-b-4 border-[#00A651]">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/images/logos/lighthouse-logo.png" 
              alt="Lighthouse France" 
              className="h-10 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="items-center gap-2 hidden">
              <span className="text-2xl font-bold text-[#00A651]">LIGHTHOUSE</span>
            </div>
            <div className="text-sm text-gray-500">France • Admin Portal</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{profile?.full_name}</p>
              <p className="text-xs text-gray-500">{isAdmin ? 'Administrateur' : 'Employe'}</p>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white">Deconnexion</button>
          </div>
        </div>
      </header>
      <nav className="bg-[#1a1a2e] border-t border-gray-700">
        <div className="max-w-full mx-auto px-6 flex gap-1 overflow-x-auto">
          {sheets.map(sheet => (
            <button key={sheet.id} onClick={() => { 
              setActiveSheet(sheet.id); 
              setSelectedRMA(null); 
              setSelectedDeviceFromDashboard(null); 
            }}
              className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap relative ${activeSheet === sheet.id ? 'bg-[#00A651] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              <span>{sheet.icon}</span>{sheet.label}
              {sheet.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {sheet.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-full mx-auto p-6">
        {/* Full-page RMA View */}
        {selectedRMA ? (
          <RMAFullPage 
            rma={selectedRMA} 
            onBack={() => { setSelectedRMA(null); setSelectedDeviceFromDashboard(null); }} 
            notify={notify} 
            reload={() => loadData(selectedRMA?.id)}
            profile={profile}
            initialDevice={selectedDeviceFromDashboard?.device}
            businessSettings={businessSettings}
          />
        ) : (
          <>
            {activeSheet === 'dashboard' && <DashboardSheet 
              requests={requests} 
              notify={notify} 
              reload={loadData} 
              isAdmin={isAdmin} 
              onSelectRMA={setSelectedRMA} 
              onSelectDevice={(device, rma) => {
                setSelectedDeviceFromDashboard({ device, rma });
                setSelectedRMA(rma);
              }}
              filter={dashboardFilter} 
              setFilter={setDashboardFilter} 
            />}
            {activeSheet === 'requests' && <RequestsSheet requests={requests.filter(r => r.request_type !== 'parts')} notify={notify} reload={loadData} profile={profile} />}
            {activeSheet === 'parts' && <PartsOrdersSheet requests={partsOrders} notify={notify} reload={loadData} profile={profile} />}
            {activeSheet === 'clients' && <ClientsSheet 
              clients={clients} 
              requests={requests} 
              equipment={equipment} 
              notify={notify} 
              reload={loadData} 
              isAdmin={isAdmin} 
              onSelectRMA={setSelectedRMA}
              onSelectDevice={(device, rma) => {
                setSelectedDeviceFromDashboard({ device, rma });
                setSelectedRMA(rma);
              }}
            />}
            {activeSheet === 'messages' && <MessagesSheet 
              requests={requests} 
              notify={notify} 
              reload={loadData}
              onSelectRMA={setSelectedRMA}
            />}
            {activeSheet === 'pricing' && <PricingSheet notify={notify} isAdmin={isAdmin} />}
            {activeSheet === 'contracts' && <ContractsSheet clients={clients} notify={notify} profile={profile} reloadMain={loadData} />}
            {activeSheet === 'rentals' && <RentalsSheet 
              rentals={rentalRequests} 
              clients={clients}
              notify={notify} 
              reload={loadData}
              profile={profile}
              businessSettings={businessSettings}
            />}
            {activeSheet === 'settings' && <SettingsSheet profile={profile} staffMembers={staffMembers} notify={notify} reload={loadData} />}
            {activeSheet === 'ups' && <UPSToolsSheet notify={notify} />}
            {activeSheet === 'admin' && isAdmin && <AdminSheet profile={profile} staffMembers={staffMembers} notify={notify} reload={loadData} businessSettings={businessSettings} setBusinessSettings={setBusinessSettings} />}
          </>
        )}
      </main>
    </div>
  );
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    if (profile?.role !== 'lh_admin' && profile?.role !== 'lh_employee') {
      setError('Accès non autorisé. Ce portail est réservé au personnel Lighthouse.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img 
            src="/images/logos/lighthouse-logo.png" 
            alt="Lighthouse France" 
            className="h-14 w-auto mx-auto mb-3"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <h1 className="text-3xl font-bold text-[#00A651] hidden">LIGHTHOUSE</h1>
          <p className="text-gray-500 mt-2">France - Portail Administrateur</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008f45] disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-6">Accès réservé au personnel Lighthouse France</p>
      </div>
    </div>
  );
}

function DashboardSheet({ requests, notify, reload, isAdmin, onSelectRMA, onSelectDevice, filter, setFilter }) {
  const [reviewingBC, setReviewingBC] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState('rma'); // 'rma' or 'device'
  
  const archivedRMAs = requests.filter(r => r.status === 'archived');
  const activeRMAs = requests.filter(r => r.request_number && !['completed', 'cancelled', 'archived', 'shipped'].includes(r.status) && r.request_type !== 'parts');
  
  // BC needs review - EXCLUDE parts orders (they have their own section)
  const needsReview = requests.filter(r => 
    r.request_type !== 'parts' && (
      r.status === 'bc_review' || 
      ((r.bc_file_url || r.bc_signature_url) && r.status === 'waiting_bc')
    )
  );
  
  // Waiting for device - EXCLUDE parts orders
  const waitingDevice = activeRMAs.filter(r => r.status === 'waiting_device' && r.request_type !== 'parts');
  
  // Waiting for BC (quote sent but not signed yet) - EXCLUDE parts orders
  const waitingBC = activeRMAs.filter(r => ['quote_sent', 'waiting_bc'].includes(r.status) && !r.bc_submitted_at && r.request_type !== 'parts');
  
  // Service statuses: File d'attente, Inspection, Approbation, Étalonnage, Réparation
  const serviceStatuses = ['in_queue', 'inspection', 'approbation', 'calibration', 'repair', 'calibration_in_progress', 'repair_in_progress'];
  // QC statuses
  const qcStatuses = ['qc', 'final_qc'];
  // Ready statuses
  const readyStatuses = ['ready', 'ready_to_ship'];
  
  // Filter by job type - check both RMA status AND device statuses
  const getJobType = (rma) => {
    const devices = rma.request_devices || [];
    
    // Check device statuses first (more accurate for multi-device RMAs)
    if (devices.length > 0) {
      const anyInService = devices.some(d => serviceStatuses.includes(d.status));
      const anyInQC = devices.some(d => qcStatuses.includes(d.status) || (d.report_complete && !d.qc_complete));
      const allReady = devices.every(d => readyStatuses.includes(d.status) || d.qc_complete);
      
      if (allReady && devices.some(d => d.qc_complete)) return 'ready';
      if (anyInQC) return 'qc';
      if (anyInService) return 'service';
    }
    
    // Fall back to RMA status
    if (serviceStatuses.includes(rma.status)) return 'service';
    if (qcStatuses.includes(rma.status)) return 'qc';
    if (readyStatuses.includes(rma.status)) return 'ready';
    
    return 'other';
  };
  
  const byJob = {
    service: activeRMAs.filter(r => getJobType(r) === 'service'),
    qc: activeRMAs.filter(r => getJobType(r) === 'qc'),
    ready: activeRMAs.filter(r => getJobType(r) === 'ready')
  };
  
  // Stats for the cards
  const stats = [
    { id: 'all', label: 'RMAs Actifs', value: activeRMAs.length, color: 'bg-blue-500', icon: '📋' },
    { id: 'bc', label: 'BC à vérifier', value: needsReview.length, color: 'bg-red-500', icon: '⚠️' },
    { id: 'waiting_bc', label: 'Attente BC', value: waitingBC.length, color: 'bg-orange-500', icon: '📝' },
    { id: 'waiting_device', label: 'Attente Appareil', value: waitingDevice.length, color: 'bg-cyan-500', icon: '📦' },
  ];
  
  // Job filter buttons
  const jobFilters = [
    { id: 'service', label: 'Service', value: byJob.service.length, color: 'bg-indigo-500', icon: '🔧' },
    { id: 'qc', label: 'QC', value: byJob.qc.length, color: 'bg-purple-500', icon: '✅' },
    { id: 'ready', label: 'Prêt', value: byJob.ready.length, color: 'bg-green-500', icon: '📤' }
  ];
  
  // Filter RMAs based on selected filter
  const getFilteredRMAs = () => {
    if (!filter) return activeRMAs;
    if (filter === 'all') return activeRMAs;
    if (filter === 'bc') return needsReview;
    if (filter === 'waiting_bc') return waitingBC;
    if (filter === 'waiting_device') return waitingDevice;
    if (byJob[filter]) return byJob[filter];
    return activeRMAs;
  };
  
  const filteredRMAs = getFilteredRMAs();
  const allFilters = [...stats, ...jobFilters];
  const filterLabel = filter ? allFilters.find(s => s.id === filter)?.label : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord</h1>
        <div className="flex gap-2">
          {archivedRMAs.length > 0 && (
            <button 
              onClick={() => setShowArchived(!showArchived)} 
              className={`px-4 py-2 rounded-lg text-sm ${showArchived ? 'bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              📦 Archives ({archivedRMAs.length})
            </button>
          )}
          <button onClick={reload} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">🔄 Actualiser</button>
        </div>
      </div>
      
      {/* Archived RMAs Section */}
      {showArchived && archivedRMAs.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-700">📦 RMAs Archivés ({archivedRMAs.length})</h2>
          </div>
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {archivedRMAs.map(rma => (
              <div key={rma.id} onClick={() => onSelectRMA(rma)} className="bg-white rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-slate-500">{rma.request_number}</span>
                  <span className="text-sm text-slate-600">{rma.companies?.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Archivé le {rma.archived_at ? new Date(rma.archived_at).toLocaleDateString('fr-FR') : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {stats.map((stat) => (
          <button 
            key={stat.id} 
            onClick={() => setFilter(filter === stat.id ? null : stat.id)}
            className={`bg-white rounded-xl p-4 shadow-sm text-left transition-all ${
              filter === stat.id ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:shadow-md'
            } ${stat.value > 0 && stat.id === 'bc' ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl text-white`}>{stat.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </button>
        ))}
        {jobFilters.map((job) => (
          <button 
            key={job.id} 
            onClick={() => setFilter(filter === job.id ? null : job.id)}
            className={`bg-white rounded-xl p-4 shadow-sm text-left transition-all ${
              filter === job.id ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${job.color} rounded-lg flex items-center justify-center text-2xl text-white`}>{job.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{job.value}</p>
                <p className="text-sm text-gray-500">{job.label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Active Filter Indicator - only show when filtering (not for 'all') */}
      {filter && filter !== 'all' && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-blue-700 font-medium">Filtre: {filterLabel}</span>
          <span className="text-blue-600">({filteredRMAs.length} RMAs)</span>
          <button onClick={() => setFilter(null)} className="ml-auto text-blue-600 hover:text-blue-800 font-medium">✕ Effacer</button>
        </div>
      )}
      
      {/* BC Review Section - Always show when there are BCs to review */}
      {needsReview.length > 0 && (!filter || filter === 'bc') && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-red-200 bg-red-100 rounded-t-xl">
            <h2 className="font-bold text-red-800 text-lg">⚠️ Bons de Commande à Vérifier ({needsReview.length})</h2>
            <p className="text-sm text-red-600">Cliquez sur "Examiner" pour vérifier le document et approuver</p>
          </div>
          <div className="p-4 space-y-3">
            {needsReview.map(rma => (
              <div key={rma.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm border border-red-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                  <div>
                    <span className="font-mono font-bold text-[#00A651] text-lg">{rma.request_number}</span>
                    <p className="font-medium text-gray-800">{rma.companies?.name}</p>
                    <p className="text-sm text-gray-500">
                      BC soumis le {rma.bc_submitted_at ? new Date(rma.bc_submitted_at).toLocaleDateString('fr-FR') : new Date(rma.updated_at).toLocaleDateString('fr-FR')}
                      {rma.bc_signed_by && <span className="ml-2">• Signé par: {rma.bc_signed_by}</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReviewingBC(rma)}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  🔍 Examiner
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* View Toggle & Table */}
      {filter !== 'bc' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">
              {filterLabel ? `${filterLabel} (${filteredRMAs.length})` : `RMAs Actifs (${activeRMAs.length})`}
            </h2>
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('rma')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'rma' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Vue RMA
              </button>
              <button
                onClick={() => setViewMode('device')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'device' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🔧 Vue Appareil
              </button>
            </div>
          </div>
          
          {/* RMA View Table */}
          {viewMode === 'rma' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMA</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Appareil(s)</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Service</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Étape</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRMAs.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun RMA</td></tr>
                  ) : filteredRMAs.map(rma => {
                    const jobType = getJobType(rma);
                    const jobStyles = {
                      service: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Service' },
                      qc: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'QC' },
                      ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Prêt' },
                      other: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Admin' }
                    };
                    const jobStyle = jobStyles[jobType] || jobStyles.other;
                    const devices = rma.request_devices || [];
                    const hasBCToReview = needsReview.find(n => n.id === rma.id);
                    
                    // Compute effective status based on device states (more accurate than rma.status)
                    const getEffectiveStatus = () => {
                      if (devices.length === 0) return rma.status;
                      const allQCComplete = devices.every(d => d.qc_complete);
                      const anyInQC = devices.some(d => d.report_complete && !d.qc_complete);
                      const allReportsComplete = devices.every(d => d.report_complete);
                      
                      if (allQCComplete) return 'ready_to_ship';
                      if (anyInQC || allReportsComplete) return 'final_qc';
                      return rma.status;
                    };
                    const effectiveStatus = getEffectiveStatus();
                    const style = STATUS_STYLES[effectiveStatus] || STATUS_STYLES.submitted;
                    
                    return (
                      <tr key={rma.id} className={`hover:bg-gray-50 cursor-pointer ${hasBCToReview ? 'bg-red-50' : ''}`} onClick={() => !hasBCToReview && onSelectRMA(rma)}>
                        <td className="px-4 py-3"><span className="font-mono font-bold text-[#00A651]">{rma.request_number}</span></td>
                        <td className="px-4 py-3"><p className="font-medium text-gray-800">{rma.companies?.name || '—'}</p></td>
                        <td className="px-4 py-3">
                          {devices.length > 0 ? <div className="text-sm">{devices.slice(0, 2).map((d, i) => <p key={i}>{d.model_name} <span className="text-gray-400">({d.serial_number})</span></p>)}{devices.length > 2 && <p className="text-gray-400">+{devices.length - 2} autres</p>}</div> : <span className="text-gray-400">{rma.serial_number || '—'}</span>}
                        </td>
                        <td className="px-4 py-3"><span className="text-sm">{rma.requested_service === 'calibration' ? '🔬 Étalonnage' : rma.requested_service === 'repair' ? '🔧 Réparation' : rma.requested_service}</span></td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(rma.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3">
                          {hasBCToReview ? (
                            <button onClick={(e) => { e.stopPropagation(); setReviewingBC(rma); }} className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded">🔍 Examiner BC</button>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); onSelectRMA(rma); }} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Voir →</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Device View Table */}
          {viewMode === 'device' && (() => {
            // Flatten all devices from ALL active RMAs (not just filtered)
            const allDevicesRaw = activeRMAs.flatMap(rma => 
              (rma.request_devices || []).map(device => ({
                ...device,
                rma: rma
              }))
            );
            
            // Define status categories for filtering
            const waitingStatuses = ['waiting_device', 'bc_approved'];
            const serviceStatuses = ['received', 'in_queue', 'queue', 'calibration', 'calibration_in_progress', 
                                     'inspection', 'inspection_complete', 'customer_approval', 'repair', 'repair_in_progress'];
            const qcStatuses = ['final_qc', 'qc', 'quality_check'];
            const readyStatuses = ['ready_to_ship', 'ready'];
            
            // Helper to get device's effective status
            const getDeviceStatus = (device) => device.status || device.rma.status;
            
            // Helper to determine device category
            const getDeviceCategory = (device) => {
              const status = getDeviceStatus(device);
              // Check for QC based on report_complete flag too
              if (device.report_complete && !device.qc_complete) return 'qc';
              if (device.qc_complete) return 'ready';
              if (qcStatuses.includes(status)) return 'qc';
              if (readyStatuses.includes(status)) return 'ready';
              if (serviceStatuses.includes(status)) return 'service';
              if (waitingStatuses.includes(status)) return 'waiting_device';
              return 'other';
            };
            
            // Filter devices based on selected filter
            const allDevices = (() => {
              if (!filter || filter === 'all') return allDevicesRaw;
              if (filter === 'service') return allDevicesRaw.filter(d => getDeviceCategory(d) === 'service');
              if (filter === 'qc') return allDevicesRaw.filter(d => getDeviceCategory(d) === 'qc');
              if (filter === 'ready') return allDevicesRaw.filter(d => getDeviceCategory(d) === 'ready');
              if (filter === 'waiting_device') return allDevicesRaw.filter(d => getDeviceCategory(d) === 'waiting_device');
              // For other filters (bc, waiting_bc), filter by RMA
              return filteredRMAs.flatMap(rma => 
                (rma.request_devices || []).map(device => ({ ...device, rma }))
              );
            })();
            
            // Progress bar component for device view
            const DeviceProgressBar = ({ device, rma }) => {
              const serviceType = device.service_type || rma.requested_service || 'calibration';
              const isRepair = serviceType === 'repair';
              
              const calibrationSteps = [
                { id: 'submitted', label: 'Soumis' },
                { id: 'rma_created', label: 'RMA' },
                { id: 'bc_approved', label: 'BC' },
                { id: 'waiting_device', label: 'Attente' },
                { id: 'received', label: 'Reçu' },
                { id: 'queue', label: 'File' },
                { id: 'calibration', label: 'Étal.' },
                { id: 'final_qc', label: 'QC' },
                { id: 'ready_to_ship', label: 'Prêt' },
                { id: 'shipped', label: 'Expédié' }
              ];
              
              const repairSteps = [
                { id: 'submitted', label: 'Soumis' },
                { id: 'rma_created', label: 'RMA' },
                { id: 'bc_approved', label: 'BC' },
                { id: 'waiting_device', label: 'Attente' },
                { id: 'received', label: 'Reçu' },
                { id: 'inspection', label: 'Insp.' },
                { id: 'customer_approval', label: 'Appr.' },
                { id: 'repair', label: 'Rép.' },
                { id: 'final_qc', label: 'QC' },
                { id: 'ready_to_ship', label: 'Prêt' },
                { id: 'shipped', label: 'Expédié' }
              ];
              
              const steps = isRepair ? repairSteps : calibrationSteps;
              
              // Get step index - map all possible statuses to progress steps
              const getStepIndex = (status) => {
                // If no status, check if RMA has request_number (means it's at least created)
                if (!status && rma.request_number) {
                  return 1; // At least RMA created
                }
                
                if (isRepair) {
                  // Repair: 11 steps (0-10)
                  const map = {
                    'submitted': 0, 'pending': 0, 'waiting_approval': 0,
                    'approved': 1, 'rma_created': 1, 'quote_sent': 1,
                    'waiting_bc': 2, 'bc_review': 2, 'waiting_po': 2,
                    'waiting_device': 3, 'bc_approved': 3,
                    'received': 4, 'in_queue': 4,
                    'inspection': 5, 'inspection_complete': 5,
                    'customer_approval': 6, 'quote_approved': 6, 'waiting_parts': 6,
                    'repair': 7, 'repair_in_progress': 7, 'in_progress': 7,
                    'final_qc': 8, 'qc': 8, 'quality_check': 8,
                    'ready_to_ship': 9, 'ready': 9,
                    'shipped': 10, 'delivered': 10, 'completed': 10
                  };
                  return map[status] ?? 1;
                } else {
                  // Calibration: 10 steps (0-9)
                  const map = {
                    'submitted': 0, 'pending': 0, 'waiting_approval': 0,
                    'approved': 1, 'rma_created': 1, 'quote_sent': 1,
                    'waiting_bc': 2, 'bc_review': 2, 'waiting_po': 2,
                    'waiting_device': 3, 'bc_approved': 3,
                    'received': 4, 'in_queue': 4,
                    'queue': 5, 'queued': 5,
                    'calibration': 6, 'calibration_in_progress': 6, 'in_progress': 6,
                    'final_qc': 7, 'qc': 7, 'quality_check': 7,
                    'ready_to_ship': 8, 'ready': 8,
                    'shipped': 9, 'delivered': 9, 'completed': 9
                  };
                  return map[status] ?? 1;
                }
              };
              
              // Get the actual status to use - prioritize device.status as it's updated per-device
              // Also check report_complete flag to determine if in QC
              const effectiveStatus = (() => {
                // If report is complete but QC not done, device is in QC
                if (device.report_complete && !device.qc_complete) return 'final_qc';
                // If QC is complete, device is ready
                if (device.qc_complete) return 'ready_to_ship';
                // Otherwise use device status, falling back to RMA status
                return device.status || rma.status;
              })();
              const currentIndex = getStepIndex(effectiveStatus);
              
              return (
                <div className="flex items-center w-full min-w-[300px]">
                  {steps.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isLast = index === steps.length - 1;
                    
                    return (
                      <div key={step.id} className="flex items-center flex-1">
                        <div 
                          className={`
                            relative flex items-center justify-center flex-1 py-1 px-0.5 text-[10px] font-medium
                            ${isCompleted ? 'bg-[#00A651] text-white' : isCurrent ? 'bg-[#003366] text-white' : 'bg-gray-200 text-gray-500'}
                            ${index === 0 ? 'rounded-l-sm' : ''}
                            ${isLast ? 'rounded-r-sm' : ''}
                          `}
                          style={{
                            clipPath: isLast 
                              ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 4px 50%)' 
                              : index === 0 
                                ? 'polygon(0 0, calc(100% - 4px) 0, 100% 50%, calc(100% - 4px) 100%, 0 100%)'
                                : 'polygon(0 0, calc(100% - 4px) 0, 100% 50%, calc(100% - 4px) 100%, 0 100%, 4px 50%)'
                          }}
                        >
                          {step.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            };
            
            return (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMA</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Appareil</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">N° Série</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Service</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-600 min-w-[300px]">Progression</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allDevices.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun appareil</td></tr>
                    ) : allDevices.map((device, idx) => {
                      const deviceStyle = STATUS_STYLES[device.status] || STATUS_STYLES[device.rma.status] || STATUS_STYLES.submitted;
                      const serviceType = device.service_type || device.rma.requested_service || 'calibration';
                      
                      return (
                        <tr key={`${device.rma.id}-${device.id || idx}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-[#00A651]">{device.rma.request_number}</span>
                            <p className="text-xs text-gray-400">{device.rma.companies?.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-800">{device.model_name || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-gray-600">{device.serial_number || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${serviceType === 'repair' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {serviceType === 'repair' ? '🔧 Rép.' : '🔬 Étal.'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <DeviceProgressBar device={device} rma={device.rma} />
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const category = getDeviceCategory(device);
                              if (category === 'qc') {
                                return (
                                  <button 
                                    onClick={() => onSelectDevice(device, device.rma)}
                                    className="px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded font-medium"
                                  >
                                    ✅ Contrôler
                                  </button>
                                );
                              }
                              if (category === 'ready') {
                                return (
                                  <span className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded font-medium">
                                    ✓ Prêt
                                  </span>
                                );
                              }
                              if (category === 'waiting_device') {
                                return (
                                  <span className="px-3 py-1.5 text-sm bg-cyan-100 text-cyan-700 rounded font-medium">
                                    📦 Attente
                                  </span>
                                );
                              }
                              return (
                                <button 
                                  onClick={() => onSelectDevice(device, device.rma)}
                                  className="px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded font-medium"
                                >
                                  🔧 Traiter
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
      
      {/* BC Review Modal */}
      {reviewingBC && <BCReviewModal rma={reviewingBC} onClose={() => setReviewingBC(null)} notify={notify} reload={reload} />}
    </div>
  );
}

// BC Review Modal - Full screen document review
function BCReviewModal({ rma, onClose, notify, reload }) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const approveBC = async () => {
    setApproving(true);
    const { error } = await supabase
      .from('service_requests')
      .update({ 
        status: 'waiting_device', 
        bc_approved_at: new Date().toISOString()
        // bc_approved_by removed - was causing UUID error
      })
      .eq('id', rma.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('✅ BC approuvé! En attente de l\'appareil.');
      reload();
      onClose();
    }
    setApproving(false);
  };
  
  const rejectBC = async () => {
    if (!rejectReason.trim()) {
      notify('Veuillez indiquer la raison du refus', 'error');
      return;
    }
    setRejecting(true);
    const { error } = await supabase
      .from('service_requests')
      .update({ 
        status: 'bc_rejected', // Show rejection to customer
        bc_rejected_at: new Date().toISOString(),
        bc_rejection_reason: rejectReason,
        // Clear old BC data
        bc_file_url: null,
        bc_signature_url: null,
        bc_submitted_at: null
      })
      .eq('id', rma.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('BC refusé. Le client devra soumettre un nouveau BC.');
      reload();
      onClose();
    }
    setRejecting(false);
  };
  
  const devices = rma.request_devices || [];
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex" onClick={onClose}>
      <div className="bg-white w-full h-full max-w-[98vw] max-h-[98vh] m-auto rounded-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">Vérification du Bon de Commande</h2>
            <p className="text-red-100">{rma.request_number} • {rma.companies?.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-3xl">&times;</button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Document Preview - Takes most of the space */}
          <div className="flex-1 flex flex-col bg-gray-800 p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-white text-lg">📄 Document BC</h3>
              {rma.bc_file_url && (
                <a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">
                  Ouvrir dans nouvel onglet ↗
                </a>
              )}
            </div>
            
            {/* BC File - Full height PDF viewer */}
            {rma.bc_file_url ? (
              <div className="flex-1 rounded-lg overflow-hidden bg-white">
                {rma.bc_file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={rma.bc_file_url} alt="BC Document" className="w-full h-full object-contain" />
                ) : rma.bc_file_url.match(/\.pdf$/i) ? (
                  <object
                    data={`${rma.bc_file_url}#view=Fit`}
                    type="application/pdf"
                    className="w-full h-full"
                    style={{ minHeight: '100%' }}
                  >
                    <iframe 
                      src={`${rma.bc_file_url}#view=Fit`} 
                      className="w-full h-full" 
                      title="BC PDF"
                    />
                  </object>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-blue-500 text-white rounded-lg text-lg font-medium">
                      📥 Télécharger le fichier
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-400 text-lg">
                Aucun fichier BC uploadé
              </div>
            )}
          </div>
          
          {/* Right: Order Details - Sidebar */}
          <div className="w-96 flex-shrink-0 bg-gray-50 overflow-y-auto p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg">📋 Détails de la Commande</h3>
            
            {/* RMA Info */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">N° RMA</p>
                  <p className="font-mono font-bold text-[#00A651]">{rma.request_number}</p>
                </div>
                <div>
                  <p className="text-gray-500">Service</p>
                  <p className="font-medium">{rma.requested_service}</p>
                </div>
                <div>
                  <p className="text-gray-500">Soumission BC</p>
                  <p className="font-medium">{rma.bc_submitted_at ? new Date(rma.bc_submitted_at).toLocaleString('fr-FR') : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Client</p>
                  <p className="font-medium">{rma.companies?.name}</p>
                </div>
              </div>
            </div>
            
            {/* Signature */}
            {rma.bc_signature_url && (
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-gray-700 mb-2">✍️ Signature</h4>
                <img src={rma.bc_signature_url} alt="Signature" className="max-h-20 mx-auto bg-gray-50 rounded p-2" />
                <p className="text-center text-xs text-gray-500 mt-1">
                  {rma.bc_signed_by || '—'} {rma.bc_signature_date && `• ${new Date(rma.bc_signature_date).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
            )}
            
            {/* Devices */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium text-gray-700 mb-2">📦 Appareils ({devices.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {devices.map((d, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2 text-sm">
                    <p className="font-medium">{d.model_name}</p>
                    <p className="text-gray-500">SN: {d.serial_number}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quote Info */}
            {(rma.quote_total || rma.quote_url) && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-1">💰 Devis</h4>
                {rma.quote_total && <p className="text-xl font-bold text-blue-700">{rma.quote_total.toFixed(2)} €</p>}
                {rma.quote_url && (
                  <a href={rma.quote_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    Voir le devis ↗
                  </a>
                )}
              </div>
            )}
            
            {/* Reject Reason */}
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">Refuser le BC?</h4>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Raison du refus..."
                className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm h-20 resize-none"
              />
            </div>
            
            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={approveBC}
                disabled={approving}
                className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {approving ? 'Approbation...' : '✅ Approuver BC'}
              </button>
              <button
                onClick={rejectBC}
                disabled={rejecting}
                className="w-full px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {rejecting ? 'Refus...' : '❌ Refuser BC'}
              </button>
              <button onClick={onClose} className="w-full px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CONTRACT BC REVIEW MODAL - Copied from RMA BCReviewModal
// ============================================
function ContractBCReviewModal({ contract, onClose, notify, reload }) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const approveBC = async () => {
    setApproving(true);
    const { error } = await supabase
      .from('contracts')
      .update({ 
        status: 'active', 
        bc_approved_at: new Date().toISOString()
      })
      .eq('id', contract.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('✅ Contrat activé! Le client peut maintenant utiliser ses tokens.');
      reload();
      onClose();
    }
    setApproving(false);
  };
  
  const rejectBC = async () => {
    if (!rejectReason.trim()) {
      notify('Veuillez indiquer la raison du refus', 'error');
      return;
    }
    setRejecting(true);
    const { error } = await supabase
      .from('contracts')
      .update({ 
        status: 'bc_rejected',
        bc_rejection_reason: rejectReason,
        // Clear old BC data so customer can resubmit
        bc_file_url: null,
        signed_quote_url: null,
        bc_submitted_at: null
      })
      .eq('id', contract.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('BC refusé. Le client devra soumettre un nouveau BC.');
      reload();
      onClose();
    }
    setRejecting(false);
  };
  
  const devices = contract.contract_devices || [];
  const totalPrice = devices.reduce((sum, d) => sum + (d.unit_price || 0), 0);
  const totalTokens = devices.reduce((sum, d) => sum + (d.tokens_total || 0), 0);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex" onClick={onClose}>
      <div className="bg-white w-full h-full max-w-[98vw] max-h-[98vh] m-auto rounded-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">Vérification du Bon de Commande - Contrat</h2>
            <p className="text-orange-100">{contract.contract_number} • {contract.companies?.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-3xl">&times;</button>
        </div>
        
        {/* Content - Split Layout */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Document Preview - Takes most of the space */}
          <div className="flex-1 flex flex-col bg-gray-800 p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-white text-lg">📄 Documents BC</h3>
              <div className="flex gap-2">
                {contract.signed_quote_url && (
                  <a href={contract.signed_quote_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium">
                    Devis Signé ↗
                  </a>
                )}
                {contract.bc_file_url && (
                  <a href={contract.bc_file_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium">
                    BC Client ↗
                  </a>
                )}
              </div>
            </div>
            
            <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
              {contract.signed_quote_url ? (
                <iframe 
                  src={contract.signed_quote_url} 
                  className="w-full h-full" 
                  title="Devis Signé PDF"
                />
              ) : contract.bc_file_url ? (
                contract.bc_file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <div className="w-full h-full overflow-auto flex items-center justify-center">
                    <img src={contract.bc_file_url} alt="BC Document" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <iframe 
                    src={contract.bc_file_url} 
                    className="w-full h-full" 
                    title="BC Document"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-4xl mb-4">📄</p>
                    <p>Aucun document disponible</p>
                    <p className="text-sm">(Signature électronique uniquement)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right: Contract Details Panel */}
          <div className="w-96 flex-shrink-0 bg-gray-50 border-l overflow-y-auto p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg">📋 Détails du Contrat</h3>
            
            {/* Contract Info */}
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">N° Contrat</span>
                  <span className="font-mono font-bold text-[#00A651]">{contract.contract_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Période</span>
                  <span className="font-medium text-sm">
                    {new Date(contract.start_date).toLocaleDateString('fr-FR')} - {new Date(contract.end_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Soumis le</span>
                  <span className="font-medium text-sm">{contract.bc_submitted_at ? new Date(contract.bc_submitted_at).toLocaleString('fr-FR') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Signé par</span>
                  <span className="font-medium">{contract.bc_signed_by || '—'}</span>
                </div>
              </div>
            </div>
            
            {/* Pricing Summary */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">💰 Récapitulatif</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-700">{devices.length} appareils</span>
                  <span className="text-green-700">{totalTokens} étalonnages/an</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-green-200">
                  <span className="font-medium text-green-800">Total HT</span>
                  <span className="text-2xl font-bold text-green-700">{totalPrice.toFixed(2)} €</span>
                </div>
              </div>
            </div>
            
            {/* Devices */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium text-gray-700 mb-3">Appareils ({devices.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {devices.map((d, i) => (
                  <div key={i} className="bg-gray-50 rounded p-3 border text-sm">
                    <p className="font-medium">{d.model_name || 'Appareil'}</p>
                    <p className="text-gray-500">SN: {d.serial_number}</p>
                    <p className="text-gray-500">{d.tokens_total || 1} étal./an • {(d.unit_price || 0).toFixed(2)} €</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Reject Reason Input */}
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">❌ Refuser le BC?</h4>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Raison du refus (document illisible, montant incorrect, etc.)..."
                className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm h-20 resize-none"
              />
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between items-center flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium">
            Annuler
          </button>
          <div className="flex gap-3">
            <button
              onClick={rejectBC}
              disabled={rejecting || !rejectReason.trim()}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {rejecting ? 'Refus...' : '❌ Refuser BC'}
            </button>
            <button
              onClick={approveBC}
              disabled={approving}
              className="px-8 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50"
            >
              {approving ? 'Activation...' : '✅ Approuver & Activer Contrat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// RMA ACTIONS COMPONENT - RMA-level action buttons
// ============================================
function RMAActions({ rma, devices, notify, reload, onOpenShipping, onOpenAvenant, onStartService, saving, setSaving }) {
  // Determine what actions are available based on RMA/device state
  const isWaitingForDevice = ['approved', 'waiting_bc', 'waiting_device', 'waiting_po', 'bc_review', 'bc_approved'].includes(rma.status) && 
    !devices.some(d => d.status === 'received' || d.status === 'in_queue');
  
  const isReceived = rma.status === 'received' || rma.status === 'in_queue' || 
    devices.some(d => ['received', 'in_queue'].includes(d.status));
  
  const allQCComplete = devices.length > 0 && devices.every(d => d.qc_complete);
  const allReadyToShip = devices.length > 0 && devices.every(d => d.status === 'ready_to_ship' || d.qc_complete);
  const isReadyToShip = allQCComplete && allReadyToShip;
  
  const hasAdditionalWork = devices.some(d => d.additional_work_needed && !rma.avenant_sent_at);
  const totalAdditionalWork = devices.reduce((sum, d) => {
    if (!d.additional_work_needed || !d.additional_work_items) return sum;
    return sum + d.additional_work_items.reduce((s, item) => s + (parseFloat(item.price) || 0), 0);
  }, 0);
  
  // Mark RMA as received
  const markAsReceived = async () => {
    setSaving(true);
    try {
      await supabase.from('service_requests').update({ 
        status: 'received', 
        received_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', rma.id);
      
      // Also update all devices
      for (const device of devices) {
        await supabase.from('request_devices').update({ 
          status: 'received'
        }).eq('id', device.id);
      }
      
      notify('✅ RMA marqué comme reçu!');
      reload();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSaving(false);
  };
  
  // Start service on RMA - update status and open first device
  const startService = async () => {
    setSaving(true);
    try {
      await supabase.from('service_requests').update({ 
        status: 'calibration_in_progress',
        updated_at: new Date().toISOString()
      }).eq('id', rma.id);
      
      notify('✅ Service démarré!');
      reload();
      
      // Open service modal for first device
      if (devices.length > 0 && onStartService) {
        onStartService(devices[0]);
      }
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSaving(false);
  };
  
  // No actions needed if RMA is closed
  if (['shipped', 'completed', 'delivered'].includes(rma.status)) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Waiting for device - show receive button */}
        {isWaitingForDevice && (
          <button
            onClick={markAsReceived}
            disabled={saving}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? '⏳' : '📦'} Marquer comme Reçu
          </button>
        )}
        
        {/* Received - show start service button */}
        {isReceived && !devices.some(d => d.service_findings || d.report_complete) && (
          <button
            onClick={startService}
            disabled={saving}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? '⏳' : '🔧'} Démarrer Service
          </button>
        )}
        
        {/* Additional work found - show avenant button */}
        {hasAdditionalWork && (
          <button
            onClick={onOpenAvenant}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center gap-2"
          >
            📄 Créer Avenant (€{totalAdditionalWork.toFixed(2)})
          </button>
        )}
        
        {/* Avenant sent indicator */}
        {rma.avenant_sent_at && (
          <span className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
            📄 Avenant envoyé {rma.avenant_approved_at ? '✓ Approuvé' : '⏳ En attente'}
          </span>
        )}
        
        {/* Ready to ship - show shipping button */}
        {isReadyToShip && (
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenShipping}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center gap-2"
            >
              🚚 Préparer Expédition
            </button>
            <button
              onClick={async () => {
                if (!confirm('Marquer tous les appareils comme expédiés et fermer le RMA?')) return;
                setSaving(true);
                try {
                  console.log('Marking devices as shipped...');
                  for (const device of devices) {
                    const { error: deviceError } = await supabase.from('request_devices').update({ 
                      status: 'shipped', 
                      shipped_at: new Date().toISOString()
                    }).eq('id', device.id);
                    if (deviceError) {
                      console.error('Device update error:', deviceError);
                      throw deviceError;
                    }
                    console.log('Device', device.id, 'marked as shipped');
                  }
                  
                  console.log('Marking RMA as shipped...');
                  const { error: rmaError } = await supabase.from('service_requests').update({ 
                    status: 'shipped', 
                    shipped_at: new Date().toISOString(), 
                    updated_at: new Date().toISOString() 
                  }).eq('id', rma.id);
                  if (rmaError) {
                    console.error('RMA update error:', rmaError);
                    throw rmaError;
                  }
                  console.log('RMA', rma.id, 'marked as shipped');
                  
                  notify('🚚 RMA marqué comme expédié!');
                  reload();
                } catch (err) {
                  console.error('Mark shipped error:', err);
                  notify('Erreur: ' + (err.message || JSON.stringify(err)), 'error');
                }
                setSaving(false);
              }}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? '⏳...' : '📦 Marquer Expédié'}
            </button>
          </div>
        )}
        
        {/* Status indicator when no actions available */}
        {!isWaitingForDevice && !isReceived && !isReadyToShip && !hasAdditionalWork && devices.length > 0 && (
          <span className="text-sm text-gray-500">
            Service en cours... Cliquez sur un appareil pour voir/modifier les détails.
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// RMA FULL PAGE VIEW - Adaptive workflow interface
// ============================================
function RMAFullPage({ rma, onBack, notify, reload, profile, initialDevice, businessSettings }) {
  // State
  const [selectedDevice, setSelectedDevice] = useState(initialDevice || null);
  const [viewMode, setViewMode] = useState(initialDevice ? 'device' : 'overview'); // 'overview' or 'device'
  const [deviceTab, setDeviceTab] = useState('details'); // For device detail view tabs
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [showAvenantPreview, setShowAvenantPreview] = useState(false);
  const [showQCReview, setShowQCReview] = useState(null);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(null); // Device to show service modal for
  
  // Safety check
  if (!rma) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Erreur: RMA non trouvé</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">← Retour</button>
      </div>
    );
  }
  
  const devices = rma.request_devices || [];
  const company = rma.companies || {};
  const isRMAClosed = ['shipped', 'completed', 'delivered'].includes(rma.status);
  const isContractRMA = rma.is_contract_rma || rma.contract_id;
  
  // Progress steps for devices
  const calibrationSteps = [
    { id: 'submitted', label: 'Soumis' },
    { id: 'rma_created', label: 'RMA' },
    { id: 'bc_approved', label: 'BC' },
    { id: 'waiting_device', label: 'Attente' },
    { id: 'received', label: 'Reçu' },
    { id: 'queue', label: 'File' },
    { id: 'calibration', label: 'Étal.' },
    { id: 'final_qc', label: 'QC' },
    { id: 'ready_to_ship', label: 'Prêt' },
    { id: 'shipped', label: 'Expédié' }
  ];

  const repairSteps = [
    { id: 'submitted', label: 'Soumis' },
    { id: 'rma_created', label: 'RMA' },
    { id: 'bc_approved', label: 'BC' },
    { id: 'waiting_device', label: 'Attente' },
    { id: 'received', label: 'Reçu' },
    { id: 'inspection', label: 'Insp.' },
    { id: 'customer_approval', label: 'Appr.' },
    { id: 'repair', label: 'Rép.' },
    { id: 'final_qc', label: 'QC' },
    { id: 'ready_to_ship', label: 'Prêt' },
    { id: 'shipped', label: 'Expédié' }
  ];
  
  // Get step index for a device status
  const getStepIndex = (status, isRepair) => {
    if (!status && rma.request_number) return 1;
    
    if (isRepair) {
      const repairMap = {
        'submitted': 0, 'pending': 0, 'waiting_approval': 0,
        'approved': 1, 'rma_created': 1, 'quote_sent': 1,
        'waiting_bc': 2, 'bc_submitted': 2, 'bc_review': 2,
        'bc_approved': 3, 'waiting_device': 3, 'waiting_po': 3, 'waiting_reception': 3,
        'received': 4, 'in_queue': 4,
        'inspection': 5, 'inspection_complete': 5,
        'customer_approval': 6, 'waiting_customer': 6,
        'repair_in_progress': 7, 'repair': 7,
        'final_qc': 8, 'qc_complete': 8, 'qc_rejected': 7,
        'ready_to_ship': 9,
        'shipped': 10, 'delivered': 10, 'completed': 10
      };
      return repairMap[status] ?? 0;
    } else {
      const calMap = {
        'submitted': 0, 'pending': 0, 'waiting_approval': 0,
        'approved': 1, 'rma_created': 1, 'quote_sent': 1,
        'waiting_bc': 2, 'bc_submitted': 2, 'bc_review': 2,
        'bc_approved': 3, 'waiting_device': 3, 'waiting_po': 3, 'waiting_reception': 3,
        'received': 4, 'in_queue': 5,
        'calibration_in_progress': 6, 'calibration': 6,
        'final_qc': 7, 'qc_complete': 7, 'qc_rejected': 6,
        'ready_to_ship': 8,
        'shipped': 9, 'delivered': 9, 'completed': 9
      };
      return calMap[status] ?? 0;
    }
  };
  
  // Device Progress Bar Component
  const DeviceProgressBar = ({ device }) => {
    const deviceServiceType = device.service_type || rma.requested_service || 'calibration';
    const isRepair = deviceServiceType === 'repair';
    const steps = isRepair ? repairSteps : calibrationSteps;
    
    // Smart status: use device.status only if it's a "real" device status (received onwards)
    // For early stages (before device arrives), use RMA status
    const deviceSpecificStatuses = ['received', 'in_queue', 'inspection', 'calibration', 'calibration_in_progress', 
      'repair', 'repair_in_progress', 'final_qc', 'qc_complete', 'qc_rejected', 'ready_to_ship', 'shipped', 'completed'];
    const effectiveStatus = deviceSpecificStatuses.includes(device.status) ? device.status : rma.status;
    const currentIndex = getStepIndex(effectiveStatus, isRepair);
    
    return (
      <div className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div 
                className={`
                  relative flex items-center justify-center flex-1 py-1.5 px-1 text-xs font-medium
                  ${isCompleted ? 'bg-[#3B7AB4] text-white' : isCurrent ? 'bg-[#1E3A5F] text-white' : 'bg-gray-200 text-gray-500'}
                  ${index === 0 ? 'rounded-l-md' : ''}
                  ${isLast ? 'rounded-r-md' : ''}
                `}
                style={{
                  clipPath: isLast 
                    ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 6px 50%)' 
                    : index === 0 
                      ? 'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)'
                      : 'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%, 6px 50%)'
                }}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Get device status label
  const getDeviceStatusLabel = (device) => {
    const status = device.status || rma.status;
    const labels = {
      'submitted': 'Soumis',
      'approved': 'Approuvé',
      'waiting_bc': 'Attente BC',
      'waiting_device': 'Attente appareil',
      'received': 'Reçu',
      'in_queue': 'En file',
      'calibration_in_progress': 'Étalonnage',
      'repair_in_progress': 'Réparation',
      'final_qc': 'Contrôle QC',
      'ready_to_ship': 'Prêt',
      'shipped': 'Expédié'
    };
    return labels[status] || status;
  };

  // ========== SERVICE MODAL (Full Page) ==========
  if (showServiceModal) {
    return (
      <DeviceServiceModal
        device={showServiceModal}
        rma={rma}
        onBack={() => { setShowServiceModal(null); reload(); }}
        notify={notify}
        reload={reload}
        profile={profile}
        businessSettings={businessSettings}
      />
    );
  }
  
  // ========== QC REVIEW MODAL (Full Page) ==========
  if (showQCReview) {
    return (
      <QCReviewModal
        device={showQCReview}
        rma={rma}
        onBack={() => { setShowQCReview(null); reload(); }}
        notify={notify}
        profile={profile}
      />
    );
  }

  // ========== DEVICE DETAIL VIEW ==========
  if (viewMode === 'device' && selectedDevice) {
    const device = devices.find(d => d.id === selectedDevice.id) || selectedDevice;
    
    // Device action conditions
    const isDeviceShipped = device.status === 'shipped';
    const isDeviceReadyToShip = device.status === 'ready_to_ship' || device.qc_complete;
    const needsQC = device.report_complete && !device.qc_complete;
    const canStartService = ['received', 'in_queue', 'calibration_in_progress', 'repair_in_progress'].includes(device.status || rma.status) || 
      (!device.report_complete && !isDeviceShipped);
    
    return (
      <div className="space-y-6">
        {/* Back to RMA Overview */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setViewMode('overview'); setSelectedDevice(null); setDeviceTab('details'); }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium"
          >
            ← Retour au RMA
          </button>
        </div>
        
        {/* Device Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{device.model_name}</h1>
              <p className="text-lg text-gray-500 font-mono">SN: {device.serial_number}</p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                device.status === 'shipped' ? 'bg-green-100 text-green-700' :
                device.status === 'ready_to_ship' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {getDeviceStatusLabel(device)}
              </span>
              <p className="text-sm text-gray-500 mt-2">
                {device.service_type === 'calibration' ? '🔬 Étalonnage' : 
                 device.service_type === 'repair' ? '🔧 Réparation' : 
                 '🔬🔧 Étal. + Rép.'}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <DeviceProgressBar device={device} />
          
          {/* Return Shipping Address */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Adresse de retour</p>
            <p className="text-sm text-gray-700">
              {/* TODO: Load device-specific shipping address if available */}
              {company.address || '—'}, {company.postal_code} {company.city}, {company.country || 'France'}
            </p>
          </div>
        </div>
        
        {/* Device-Level Actions */}
        {!isDeviceShipped && (
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Service button - Edit or Start */}
              {canStartService && (
                <button
                  onClick={() => setShowServiceModal(device)}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  🔧 {device.report_complete ? 'Modifier Service' : device.service_findings ? 'Continuer Service' : 'Traiter Appareil'}
                </button>
              )}
              
              {/* QC button */}
              {needsQC && (
                <button
                  onClick={() => setShowQCReview(device)}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  ✅ Contrôle Qualité
                </button>
              )}
              
              {/* QC Complete indicator */}
              {device.qc_complete && !isDeviceShipped && (
                <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  ✅ QC Validé - Prêt pour expédition
                </span>
              )}
              
              {/* Report complete but no QC yet */}
              {device.report_complete && !device.qc_complete && (
                <span className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                  📋 Rapport terminé - En attente QC
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Device Tabs */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex border-b">
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
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>
          
          <div className="p-6">
            {/* Details Tab */}
            {deviceTab === 'details' && (
              <div className="space-y-6">
                {/* Service Info */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-3">Informations du service</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase">Type de service</p>
                      <p className="font-medium">{device.service_type === 'calibration' ? 'Étalonnage' : device.service_type === 'repair' ? 'Réparation' : device.service_type}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase">Technicien</p>
                      <p className="font-medium">{device.technician_name || '—'}</p>
                    </div>
                    {device.cal_type && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase">Type d'étalonnage</p>
                        <p className="font-medium">{device.cal_type}</p>
                      </div>
                    )}
                    {device.reception_result && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase">Résultat réception</p>
                        <p className="font-medium">{device.reception_result}</p>
                      </div>
                    )}
                    {device.bl_number && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase">N° BL</p>
                        <p className="font-medium font-mono">{device.bl_number}</p>
                      </div>
                    )}
                    {device.tracking_number && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase">N° Suivi</p>
                        <a href={`https://www.ups.com/track?tracknum=${device.tracking_number}`} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 hover:underline">{device.tracking_number}</a>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Findings & Work */}
                {(device.service_findings || device.work_completed) && (
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">Rapport de service</h3>
                    {device.service_findings && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
                        <p className="text-xs text-amber-600 uppercase mb-1">Constatations</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{device.service_findings}</p>
                      </div>
                    )}
                    {device.work_completed && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs text-blue-600 uppercase mb-1">Travaux effectués</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{device.work_completed}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Customer Notes */}
                {device.notes && (
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">Notes du client</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{device.notes}</p>
                    </div>
                  </div>
                )}
                
                {/* Internal Notes */}
                {device.internal_notes && (
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">Notes internes</h3>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{device.internal_notes}</p>
                    </div>
                  </div>
                )}
                
                {/* QC Rejection Warning */}
                {device.qc_rejected && device.qc_rejection_reason && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <div>
                        <h3 className="font-bold text-red-800 mb-1">QC Rejeté - Corrections Requises</h3>
                        <p className="text-red-700 whitespace-pre-wrap">{device.qc_rejection_reason}</p>
                        {device.qc_rejected_at && (
                          <p className="text-red-500 text-sm mt-2">
                            Rejeté le {new Date(device.qc_rejected_at).toLocaleDateString('fr-FR')} à {new Date(device.qc_rejected_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* QC Notes */}
                {device.qc_notes && (
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">Notes QC</h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{device.qc_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* History Tab */}
            {deviceTab === 'history' && (
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800">Historique de cet appareil</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-4">
                    {[
                      { date: rma.created_at, label: 'Soumis', icon: '📝', color: 'gray' },
                      rma.request_number && { date: rma.created_at, label: 'RMA créé', icon: '📋', color: 'blue' },
                      rma.quote_sent_at && { date: rma.quote_sent_at, label: 'Devis envoyé', icon: '💰', color: 'amber' },
                      rma.bc_submitted_at && { date: rma.bc_submitted_at, label: 'BC soumis', icon: '📄', color: 'purple' },
                      rma.bc_approved_at && { date: rma.bc_approved_at, label: 'BC approuvé - Attente appareil', icon: '✅', color: 'green' },
                      rma.received_at && { date: rma.received_at, label: 'Appareil reçu', icon: '📦', color: 'cyan' },
                      device.service_started_at && { date: device.service_started_at, label: device.service_type === 'repair' ? 'Réparation démarrée' : 'Étalonnage démarré', icon: '🔧', color: 'indigo' },
                      device.report_completed_at && { date: device.report_completed_at, label: 'Rapport complété', icon: '📋', color: 'blue' },
                      device.qc_completed_at && { date: device.qc_completed_at, label: 'QC validé - Prêt à expédier', icon: '✅', color: 'purple' },
                      device.qc_rejected_at && { date: device.qc_rejected_at, label: 'QC rejeté', icon: '❌', color: 'red' },
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
                          event.color === 'red' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`}>
                        </div>
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
              </div>
            )}
            
            {/* Documents Tab */}
            {deviceTab === 'documents' && (
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800">Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Device-specific documents */}
                  {device.calibration_certificate_url && (
                    <a href={device.calibration_certificate_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">🏆</div>
                      <div>
                        <p className="font-medium text-gray-800">Certificat d'étalonnage</p>
                        <p className="text-sm text-gray-500">Document officiel</p>
                      </div>
                    </a>
                  )}
                  
                  {/* RMA-level documents (shared across devices) */}
                  {rma.quote_url && (
                    <a href={rma.quote_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">💰</div>
                      <div>
                        <p className="font-medium text-gray-800">Devis</p>
                        <p className="text-sm text-gray-500">Offre de prix</p>
                      </div>
                    </a>
                  )}
                  
                  {rma.bc_file_url && (
                    <a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">📝</div>
                      <div>
                        <p className="font-medium text-gray-800">Bon de Commande</p>
                        <p className="text-sm text-gray-500">BC client</p>
                      </div>
                    </a>
                  )}
                  
                  {/* Service Report PDF */}
                  {device.report_url && (
                    <a href={device.report_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">📋</div>
                      <div>
                        <p className="font-medium text-gray-800">Rapport de Service</p>
                        <p className="text-sm text-gray-500">Détails du service</p>
                      </div>
                    </a>
                  )}
                  
                  {/* Avenant if sent */}
                  {rma.avenant_sent_at && (
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-orange-50">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                      <div>
                        <p className="font-medium text-gray-800">Avenant</p>
                        <p className="text-sm text-gray-500">
                          {rma.avenant_approved_at ? '✅ Approuvé' : '⏳ En attente'} • {new Date(rma.avenant_sent_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* BL PDF */}
                  {device.bl_url ? (
                    <a href={device.bl_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                      <div>
                        <p className="font-medium text-gray-800">Bon de Livraison</p>
                        <p className="text-sm text-gray-600 font-mono">{device.bl_number}</p>
                      </div>
                    </a>
                  ) : device.bl_number && (
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-blue-50">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                      <div>
                        <p className="font-medium text-gray-800">Bon de Livraison</p>
                        <p className="text-sm text-gray-600 font-mono">{device.bl_number}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* UPS Label PDF */}
                  {device.ups_label_url && (
                    <a href={device.ups_label_url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">🏷️</div>
                      <div>
                        <p className="font-medium text-gray-800">Étiquette UPS</p>
                        <p className="text-sm text-gray-500">Label d'expédition</p>
                      </div>
                    </a>
                  )}
                </div>
                
                {/* No documents message */}
                {!device.calibration_certificate_url && !device.report_url && !rma.quote_url && !rma.bc_file_url && !device.bl_number && !device.bl_url && !device.ups_label_url && !rma.avenant_sent_at && (
                  <p className="text-gray-400 text-center py-8">Aucun document disponible</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== RMA OVERVIEW VIEW (Default) ==========
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium">
            ← Tableau de Bord
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">{rma.request_number}</h1>
              <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                isRMAClosed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {isRMAClosed ? '✅ TERMINÉ' : '🔄 OUVERT'}
              </span>
              {isContractRMA && (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">📋 CONTRAT</span>
              )}
            </div>
            <p className="text-gray-500">Créé le {new Date(rma.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        
        {/* Hidden shipping options - top right */}
        {!isRMAClosed && devices.some(d => d.status !== 'shipped') && (
          <div className="relative group">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Options avancées">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => setShowShippingModal(true)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"
              >
                📦 Expédition partielle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Client Info - Full Details */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">🏢</span>
          Informations Client
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Société</p>
            <p className="font-bold text-gray-800">{company.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Contact</p>
            <p className="font-medium text-gray-700">{company.contact_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Téléphone</p>
            <p className="font-medium text-gray-700">{company.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
            <p className="font-medium text-gray-700 truncate">{company.email || '—'}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Adresse</p>
          <p className="text-gray-700">
            {company.address || company.billing_address || '—'}
            {(company.postal_code || company.billing_postal_code) && `, ${company.postal_code || company.billing_postal_code}`}
            {(company.city || company.billing_city) && ` ${company.city || company.billing_city}`}
            {company.country && `, ${company.country}`}
          </p>
        </div>
      </div>

      {/* RMA-Level Actions */}
      {!isRMAClosed && (
        <RMAActions 
          rma={rma} 
          devices={devices} 
          notify={notify} 
          reload={reload}
          onOpenShipping={() => setShowShippingModal(true)}
          onOpenAvenant={() => setShowAvenantPreview(true)}
          onStartService={(device) => setShowServiceModal(device)}
          saving={saving}
          setSaving={setSaving}
        />
      )}

      {/* Chat Status Indicator - Link to Messages Sheet */}
      {rma.chat_status === 'open' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
            <span className="font-medium text-amber-800">💬 Chat ouvert avec le client</span>
          </div>
          <span className="text-sm text-amber-600">Voir l'onglet Messages pour répondre</span>
        </div>
      )}

      {/* Devices List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">🔧</span>
            <div>
              <h2 className="font-bold text-gray-800">Appareils</h2>
              <p className="text-sm text-gray-500">{devices.length} appareil(s) • Cliquez pour voir les détails</p>
            </div>
          </div>
        </div>
        
        <div className="divide-y">
          {devices.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucun appareil enregistré</p>
          ) : (
            devices.map((device, idx) => (
              <div 
                key={device.id}
                onClick={() => { setSelectedDevice(device); setViewMode('device'); setDeviceTab('details'); }}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg font-bold text-gray-400">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{device.model_name}</p>
                      <p className="text-sm text-gray-500 font-mono">SN: {device.serial_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      device.service_type === 'calibration' ? 'bg-blue-100 text-blue-700' : 
                      device.service_type === 'repair' ? 'bg-orange-100 text-orange-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {device.service_type === 'calibration' ? '🔬 Étalonnage' : 
                       device.service_type === 'repair' ? '🔧 Réparation' : 
                       '🔬🔧 Étal. + Rép.'}
                    </span>
                    <span className="text-gray-400 text-xl">→</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <DeviceProgressBar device={device} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {showShippingModal && (
        <ShippingModal
          rma={rma}
          devices={devices}
          onClose={() => setShowShippingModal(false)}
          notify={notify}
          reload={reload}
          profile={profile}
          businessSettings={businessSettings}
        />
      )}

      {showAvenantPreview && (
        <AvenantPreviewModal
          rma={rma}
          devices={devices.filter(d => d.additional_work_needed)}
          onClose={() => setShowAvenantPreview(false)}
          notify={notify}
          reload={reload}
          alreadySent={!!rma.avenant_sent_at}
        />
      )}
    </div>
  );
}

// Device Service Modal - For filling inspection/findings
function DeviceServiceModal({ device, rma, onBack, notify, reload, profile, businessSettings }) {
  const [findings, setFindings] = useState(device.service_findings || '');
  const [additionalWorkNeeded, setAdditionalWorkNeeded] = useState(device.additional_work_needed || false);
  const [workItems, setWorkItems] = useState(device.additional_work_items || []);
  const [workCompleted, setWorkCompleted] = useState(device.work_completed || '');
  const [saving, setSaving] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [partsLoading, setPartsLoading] = useState({});
  const [technicianName, setTechnicianName] = useState(device.technician_name || '');
  const [staffMembers, setStaffMembers] = useState([]);
  
  // Lock work items if they were previously saved (have items in DB)
  const [workItemsLocked, setWorkItemsLocked] = useState((device.additional_work_items || []).length > 0);
  
  // Report options - initialize from device data, empty string means not selected yet, 'none' means don't show
  const [calType, setCalType] = useState(device.cal_type || '');
  const [receptionResult, setReceptionResult] = useState(device.reception_result || '');
  
  // Certificate upload for calibrations
  const [certificateUrl, setCertificateUrl] = useState(device.calibration_certificate_url || '');
  const [uploadingCert, setUploadingCert] = useState(false);
  
  const isCalibration = device.service_type === 'calibration' || device.service_type === 'both';
  const needsCertificate = isCalibration && !certificateUrl;
  
  const calTypeOptions = [
    { value: 'none', label: 'Ne pas afficher' },
    { value: 'ISO 21501-4', label: 'ISO 21501-4' },
    { value: 'Non-ISO', label: 'Non-ISO' },
    { value: 'Bio Collecteur', label: 'Bio Collecteur' },
    { value: 'Compteur Liquide', label: 'Compteur Liquide' },
    { value: 'Sonde de Température', label: 'Sonde de Température' },
    { value: 'Diluteur', label: 'Diluteur' }
  ];
  
  const receptionOptions = [
    { value: 'none', label: 'Ne pas afficher' },
    { value: 'Conforme', label: 'Conforme' },
    { value: 'Non conforme', label: 'Non conforme' },
    { value: 'À vérifier', label: 'À vérifier' }
  ];
  
  // Load staff members for technician dropdown
  useEffect(() => {
    const loadStaff = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      if (data) setStaffMembers(data.filter(s => s.full_name)); // Only show profiles with names
    };
    loadStaff();
  }, []);
  
  // Upload certificate handler
  const handleCertificateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      notify('Veuillez télécharger un fichier PDF', 'error');
      return;
    }
    
    setUploadingCert(true);
    try {
      const fileName = `certificates/${rma.request_number}/${device.serial_number}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
      
      // Save to device record
      const { error: updateError } = await supabase.from('request_devices').update({
        calibration_certificate_url: publicUrl,
        calibration_certificate_uploaded_at: new Date().toISOString()
      }).eq('id', device.id);
      
      if (updateError) throw updateError;
      
      setCertificateUrl(publicUrl);
      notify('✓ Certificat téléchargé');
      reload();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setUploadingCert(false);
  };
  
  const avenantSent = rma.avenant_sent_at;
  const avenantApproved = rma.avenant_approved_at;
  const reportComplete = device.report_complete;
  
  const getDefaultChecklist = () => {
    if (device.service_type === 'calibration') {
      return [
        { id: 'visual_inspection', label: 'Inspection visuelle effectuée', checked: false },
        { id: 'cleaning', label: 'Nettoyage effectué', checked: false },
        { id: 'calibration_performed', label: 'Étalonnage réalisé selon procédure', checked: false },
        { id: 'results_within_spec', label: 'Résultats dans les spécifications', checked: false },
        { id: 'certificate_generated', label: 'Certificat d\'étalonnage généré', checked: false },
      ];
    } else {
      return [
        { id: 'visual_inspection', label: 'Inspection visuelle effectuée', checked: false },
        { id: 'diagnostic', label: 'Diagnostic complet réalisé', checked: false },
        { id: 'repair_performed', label: 'Réparation effectuée', checked: false },
        { id: 'parts_replaced', label: 'Pièces remplacées (si applicable)', checked: false },
        { id: 'functional_test', label: 'Test fonctionnel OK', checked: false },
      ];
    }
  };
  
  const [checklist, setChecklist] = useState(() => {
    const saved = device.work_checklist;
    if (saved && Object.keys(saved).length > 0) {
      return getDefaultChecklist().map(item => ({ ...item, checked: saved[item.id] || false }));
    }
    return getDefaultChecklist();
  });
  
  const toggleChecklistItem = (id) => setChecklist(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  
  // Add work item with part number field
  const addWorkItem = () => setWorkItems([...workItems, { id: Date.now(), part_number: '', description: '', quantity: 1, price: 0 }]);
  
  const updateWorkItem = (id, field, value) => setWorkItems(workItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  
  const removeWorkItem = (id) => setWorkItems(workItems.filter(item => item.id !== id));
  
  // Lookup part by part number from existing parts_pricing table
  const lookupPart = async (itemId, partNumber) => {
    if (!partNumber || partNumber.length < 2) return;
    
    setPartsLoading(prev => ({ ...prev, [itemId]: true }));
    try {
      const { data, error } = await supabase
        .from('parts_pricing')
        .select('part_number, description, description_fr, unit_price')
        .ilike('part_number', `%${partNumber}%`)
        .limit(1)
        .single();
      
      if (data && !error) {
        // Use French description if available, otherwise English
        const desc = data.description_fr || data.description || '';
        setWorkItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, description: desc, price: data.unit_price || 0, part_number: data.part_number } : item
        ));
        notify(`✓ ${data.part_number}: ${desc}`);
      }
    } catch (err) {
      // Part not found - that's okay, user can enter manually
    }
    setPartsLoading(prev => ({ ...prev, [itemId]: false }));
  };
  
  const totalAdditional = workItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);
  const canPreviewReport = findings.trim() && workCompleted.trim() && technicianName && calType && receptionResult && (!isCalibration || certificateUrl);
  
  const getValidationMessage = () => {
    const missing = [];
    if (!technicianName) missing.push('Technicien');
    if (!calType) missing.push('Étalonnage effectué');
    if (!receptionResult) missing.push('Résultats à la réception');
    if (!findings.trim()) missing.push('Constatations');
    if (!workCompleted.trim()) missing.push('Actions effectuées');
    if (isCalibration && !certificateUrl) missing.push('Certificat d\'étalonnage');
    return missing.length > 0 ? `Veuillez remplir: ${missing.join(', ')}` : null;
  };
  
  const handlePreviewClick = () => {
    if (canPreviewReport) {
      setShowReportPreview(true);
    } else {
      notify(getValidationMessage(), 'error');
    }
  };
  
  const saveProgress = async () => {
    setSaving(true);
    const checklistObj = {};
    checklist.forEach(item => { checklistObj[item.id] = item.checked; });
    try {
      const { error } = await supabase.from('request_devices').update({
        service_findings: findings, additional_work_needed: additionalWorkNeeded,
        additional_work_items: additionalWorkNeeded ? workItems : [],
        work_completed: workCompleted, work_checklist: checklistObj,
        technician_name: technicianName,
        cal_type: calType,
        reception_result: receptionResult
      }).eq('id', device.id);
      if (error) throw error;
      notify('✓ Enregistré');
      // Lock work items after successful save if there are any
      if (additionalWorkNeeded && workItems.length > 0) {
        setWorkItemsLocked(true);
      }
      reload();
    } catch (err) { notify('Erreur: ' + err.message, 'error'); }
    setSaving(false);
  };
  
  const completeReport = async () => {
    setSaving(true);
    const checklistObj = {};
    checklist.forEach(item => { checklistObj[item.id] = item.checked; });
    try {
      // Note: Report PDF is generated when QC approves, not here
      // This allows QC to review before the final PDF is saved

      // Update device status
      const updateData = {
        service_findings: findings, additional_work_needed: additionalWorkNeeded,
        additional_work_items: additionalWorkNeeded ? workItems : [],
        work_completed: workCompleted, work_checklist: checklistObj,
        technician_name: technicianName,
        cal_type: calType,
        reception_result: receptionResult,
        report_complete: true, report_completed_at: new Date().toISOString(), status: 'final_qc'
      };
      
      const { error } = await supabase.from('request_devices').update(updateData).eq('id', device.id);
      if (error) throw error;
      
      // Check if all devices in this RMA are now in QC or beyond
      const allDevices = rma.request_devices || [];
      const otherDevices = allDevices.filter(d => d.id !== device.id);
      const allOthersInQCOrBeyond = otherDevices.every(d => 
        d.report_complete || d.status === 'final_qc' || d.qc_complete || d.status === 'ready_to_ship'
      );
      
      // If all devices are in QC (including this one we just updated), update RMA status
      if (allOthersInQCOrBeyond) {
        await supabase.from('service_requests').update({
          status: 'final_qc',
          updated_at: new Date().toISOString()
        }).eq('id', rma.id);
      }
      
      notify('✓ Rapport terminé → QC!');
      reload();
      onBack();
    } catch (err) { notify('Erreur: ' + err.message, 'error'); }
    setSaving(false);
  };

  if (showReportPreview) {
    return <ReportPreviewModal device={device} rma={rma} findings={findings} workCompleted={workCompleted} checklist={checklist} additionalWorkNeeded={additionalWorkNeeded} workItems={workItems} onClose={() => setShowReportPreview(false)} onComplete={completeReport} canComplete={!additionalWorkNeeded || avenantApproved} saving={saving} technicianName={technicianName} calType={calType} receptionResult={receptionResult} />;
  }

  const renderActionButtons = () => {
    if (reportComplete) return <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">✓ Rapport terminé</span>;
    if (!additionalWorkNeeded) return (<><button onClick={saveProgress} disabled={saving} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button><button onClick={handlePreviewClick} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">📄 Aperçu Rapport →</button></>);
    if (additionalWorkNeeded && !avenantSent) return (<><button onClick={saveProgress} disabled={saving} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button><span className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm">⚠️ Créer avenant depuis page RMA</span></>);
    if (additionalWorkNeeded && avenantSent && !avenantApproved) return (<><button onClick={saveProgress} disabled={saving} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button><span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg">⏳ Attente approbation</span></>);
    if (additionalWorkNeeded && avenantApproved) return (<><button onClick={saveProgress} disabled={saving} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button><button onClick={handlePreviewClick} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">📄 Aperçu Rapport →</button></>);
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">← Retour</button>
          <div><h1 className="text-2xl font-bold text-gray-800">SERVICE - {device.model_name}</h1><p className="text-gray-500">SN: {device.serial_number} • RMA: {rma.request_number}</p></div>
        </div>
        <div className="flex items-center gap-3">{renderActionButtons()}</div>
      </div>

      {additionalWorkNeeded && (
        <div className={`rounded-lg p-3 ${avenantApproved ? 'bg-green-100 border border-green-300' : avenantSent ? 'bg-purple-100 border border-purple-300' : 'bg-amber-100 border border-amber-300'}`}>
          <span className={`font-medium ${avenantApproved ? 'text-green-800' : avenantSent ? 'text-purple-800' : 'text-amber-800'}`}>
            {avenantApproved ? '✓ Avenant approuvé par le client' : avenantSent ? '📤 Avenant envoyé - En attente approbation' : '⚠️ Travaux supplémentaires détectés - Avenant requis'}
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold text-gray-700 mb-3">Appareil</h3>
            <div className="space-y-2">
              <div><p className="text-xs text-gray-500">Modèle</p><p className="font-bold text-gray-800">{device.model_name}</p></div>
              <div><p className="text-xs text-gray-500">N° série</p><p className="font-medium text-gray-800">{device.serial_number}</p></div>
              <div><p className="text-xs text-gray-500">Service</p><p className="font-medium">{device.service_type === 'calibration' ? '🔬 Étalonnage' : '🔧 Réparation'}</p></div>
            </div>
          </div>
          {device.notes && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
              <h3 className="font-bold text-amber-800 mb-2">📝 Notes Client</h3>
              <p className="text-amber-900">"{device.notes}"</p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl border p-4">
            <h3 className="font-bold text-gray-700 mb-2">Client</h3>
            <p className="font-medium text-gray-800">{rma.companies?.name}</p>
          </div>
          
          {/* Report Options Section */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 space-y-3">
            <h3 className="font-bold text-blue-800">Options du Rapport</h3>
            
            {/* Technician */}
            <div>
              <label className="text-sm text-gray-600 block mb-1">Technicien(ne) de service *</label>
              <select 
                value={technicianName} 
                onChange={e => setTechnicianName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">— Sélectionner —</option>
                {staffMembers.map(s => (
                  <option key={s.id} value={s.full_name}>{s.full_name}</option>
                ))}
              </select>
            </div>
            
            {/* Calibration Type */}
            <div>
              <label className="text-sm text-gray-600 block mb-1">Étalonnage effectué *</label>
              <select value={calType} onChange={e => setCalType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">— Sélectionner —</option>
                {calTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            
            {/* Reception Result */}
            <div>
              <label className="text-sm text-gray-600 block mb-1">Résultats à la réception *</label>
              <select value={receptionResult} onChange={e => setReceptionResult(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">— Sélectionner —</option>
                {receptionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          
          {/* Certificate Upload - Only for calibrations */}
          {isCalibration && (
            <div className={`rounded-xl border p-4 ${certificateUrl ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <h3 className={`font-bold mb-2 ${certificateUrl ? 'text-green-800' : 'text-amber-800'}`}>
                📜 Certificat d'Étalonnage {certificateUrl ? '✓' : '*'}
              </h3>
              
              {certificateUrl ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-700">Certificat téléchargé</p>
                  <div className="flex gap-2">
                    <a href={certificateUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
                      📄 Voir PDF
                    </a>
                    <label className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm cursor-pointer">
                      Remplacer
                      <input type="file" accept=".pdf" onChange={handleCertificateUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-amber-700 mb-2">Requis pour envoyer au QC</p>
                  <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${uploadingCert ? 'bg-gray-300' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
                    {uploadingCert ? '⏳ Téléchargement...' : '📤 Télécharger PDF'}
                    <input type="file" accept=".pdf" onChange={handleCertificateUpload} disabled={uploadingCert} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold text-gray-700 mb-2">1. CONSTATATIONS *</h3>
            <p className="text-sm text-gray-500 mb-3">Ce que vous avez observé (apparaît sur rapport et avenant)</p>
            <textarea value={findings} onChange={e => setFindings(e.target.value)} placeholder="Ex: Calibration effectuée selon les spécifications..." className="w-full px-4 py-3 border rounded-xl h-28 resize-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800">2. Travaux supplémentaires ?</h3>
                <p className="text-sm text-gray-500">Pièces ou main d'œuvre en plus</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setAdditionalWorkNeeded(false); setWorkItemsLocked(false); }} className={`px-4 py-2 rounded-lg font-medium ${!additionalWorkNeeded ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Non (RAS)</button>
                <button onClick={() => setAdditionalWorkNeeded(true)} className={`px-4 py-2 rounded-lg font-medium ${additionalWorkNeeded ? 'bg-amber-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Oui</button>
              </div>
            </div>
            {additionalWorkNeeded && (
              <div className="border-t pt-4">
                {/* Locked state - show read-only with edit button */}
                {workItemsLocked ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500 flex items-center gap-2">🔒 Pièces enregistrées</span>
                      <button onClick={() => setWorkItemsLocked(false)} className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg">✏️ Modifier</button>
                    </div>
                    <div className="space-y-2">
                      {workItems.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 bg-gray-100 rounded-lg p-3">
                          <span className="text-gray-400 w-6">{idx + 1}.</span>
                          <span className="text-gray-500 text-sm w-24">{item.part_number || '—'}</span>
                          <span className="flex-1 font-medium">{item.description}</span>
                          <span className="text-gray-600">×{item.quantity}</span>
                          <span className="font-bold text-amber-700 w-24 text-right">€{(parseFloat(item.price) || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {workItems.length > 0 && (
                      <div className="mt-4 pt-4 border-t flex justify-between">
                        <span className="font-medium">Sous-total:</span>
                        <span className="text-xl font-bold text-amber-700">€{totalAdditional.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Editable state */
                  <div>
                    <div className="space-y-2">
                      {workItems.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                          <span className="text-gray-400 w-6">{idx + 1}.</span>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={item.part_number || ''} 
                              onChange={e => updateWorkItem(item.id, 'part_number', e.target.value)}
                              onBlur={e => lookupPart(item.id, e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && lookupPart(item.id, e.target.value)}
                              placeholder="N° Pièce" 
                              className="w-28 px-3 py-2 border rounded-lg text-sm"
                            />
                            {partsLoading[item.id] && <span className="absolute right-2 top-2 text-blue-500 text-sm">...</span>}
                          </div>
                          <input type="text" value={item.description} onChange={e => updateWorkItem(item.id, 'description', e.target.value)} placeholder="Description" className="flex-1 px-3 py-2 border rounded-lg" />
                          <input type="number" value={item.quantity} onChange={e => updateWorkItem(item.id, 'quantity', e.target.value)} className="w-16 px-3 py-2 border rounded-lg text-center" min="1" />
                          <span className="text-gray-400">€</span>
                          <input type="number" value={item.price} onChange={e => updateWorkItem(item.id, 'price', e.target.value)} className="w-24 px-3 py-2 border rounded-lg text-right" step="0.01" />
                          <button onClick={() => removeWorkItem(item.id)} className="p-2 text-red-500 hover:bg-red-100 rounded">✕</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={addWorkItem} className="mt-3 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">+ Ajouter pièce</button>
                    {workItems.length > 0 && (
                      <div className="mt-4 pt-4 border-t flex justify-between">
                        <span className="font-medium">Sous-total:</span>
                        <span className="text-xl font-bold text-amber-700">€{totalAdditional.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold text-gray-700 mb-2">3. TRAVAUX RÉALISÉS *</h3>
            <p className="text-sm text-gray-500 mb-4">Cochez et décrivez le travail effectué</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 uppercase mb-3">Checklist</p>
              <div className="space-y-2">
                {checklist.map(item => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg">
                    <input type="checkbox" checked={item.checked} onChange={() => toggleChecklistItem(item.id)} className="w-5 h-5 rounded text-green-600" />
                    <span className={item.checked ? 'text-green-700' : 'text-gray-700'}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <textarea value={workCompleted} onChange={e => setWorkCompleted(e.target.value)} placeholder="Décrivez les travaux réalisés..." className="w-full px-4 py-3 border rounded-xl h-28 resize-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Report Preview Modal - Exact replica of official Lighthouse France Rapport PDF
function ReportPreviewModal({ device, rma, findings, workCompleted, checklist, additionalWorkNeeded, workItems, onClose, onComplete, canComplete, saving, technicianName, calType, receptionResult }) {
  const today = new Date().toLocaleDateString('fr-FR');
  const serviceTypeText = device.service_type === 'calibration' ? 'Étalonnage' : device.service_type === 'repair' ? 'Réparation' : 'Étalonnage et Réparation';
  const motifText = device.notes ? `${serviceTypeText} - ${device.notes}` : serviceTypeText;
  
  const showCalType = calType && calType !== 'none';
  const showReceptionResult = receptionResult && receptionResult !== 'none';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">← Retour</button>
          <div><h1 className="text-2xl font-bold text-gray-800">📄 Aperçu Rapport de Service</h1><p className="text-gray-500">{device.model_name} • SN: {device.serial_number}</p></div>
        </div>
        <div className="flex items-center gap-3">
          {canComplete ? (
            <button onClick={onComplete} disabled={saving} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50">{saving ? 'Envoi...' : '✓ Terminer Rapport → QC'}</button>
          ) : (
            <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg">⏳ Approbation client requise</span>
          )}
        </div>
      </div>

      {/* Report Document - Exact replica of PDF */}
      <div className="bg-gray-400 p-8 min-h-full flex justify-center">
        <div className="bg-white shadow-2xl w-full max-w-3xl relative" style={{ fontFamily: 'Arial, sans-serif', padding: '40px 50px', minHeight: '297mm', display: 'flex', flexDirection: 'column' }}>
          
          {/* Logo Header - Using actual logo image */}
          <div className="mb-10">
            <img 
              src="/images/logos/lighthouse-logo.png" 
              alt="Lighthouse Worldwide Solutions" 
              className="h-12 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="items-center gap-2 hidden">
              <div className="flex flex-col gap-0.5 mr-2">
                <div className="w-12 h-2 bg-[#FFD200]"></div>
                <div className="w-12 h-2 bg-[#003366]"></div>
              </div>
              <div>
                <span className="text-2xl font-bold tracking-wide" style={{ color: '#003366' }}>LIGHTHOUSE</span>
                <p className="text-xs tracking-widest text-gray-500 -mt-1">WORLDWIDE SOLUTIONS</p>
              </div>
            </div>
          </div>

          {/* Main Content - Grows to fill space */}
          <div className="flex-grow">
            {/* Info Table - Client/Device info */}
            <table className="w-full text-sm mb-6" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '150px' }} />
                <col style={{ width: '200px' }} />
                <col />
              </colgroup>
              <tbody>
                {/* Row 1: Date + RMA */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Date d'achèvement</td>
                  <td className="py-1 text-gray-800">{today}</td>
                  <td className="py-1 text-gray-800">
                    <span className="font-bold text-[#003366]">RMA # </span>{rma.request_number}
                  </td>
                </tr>
                
                {/* Row 2: Client */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Client</td>
                  <td className="py-1 text-gray-800" colSpan="2">{rma.companies?.name}</td>
                </tr>
                
                {/* Row 3: Adresse */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Adresse</td>
                  <td className="py-1 text-gray-800" colSpan="2">{rma.companies?.billing_address || '—'}</td>
                </tr>
                
                {/* Row 4: Code postal + Contact */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Code postal / Ville</td>
                  <td className="py-1 text-gray-800">{rma.companies?.billing_postal_code} {rma.companies?.billing_city}</td>
                  <td className="py-1 text-gray-800">
                    <span className="font-bold text-[#003366]">Contact </span>{rma.companies?.contact_name || '—'}
                  </td>
                </tr>
                
                {/* Row 5: Téléphone + Technicien label */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Téléphone</td>
                  <td className="py-1 text-gray-800">{rma.companies?.phone || '—'}</td>
                  <td className="py-1 text-gray-800 align-top">
                    <span className="font-bold text-[#003366]">Technicien(ne) de service</span>
                  </td>
                </tr>
                
                {/* Row 6: Modèle + Technicien name */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Modèle#</td>
                  <td className="py-1 text-gray-800">{device.model_name}</td>
                  <td className="py-1 text-gray-800">{technicianName || 'Lighthouse France'}</td>
                </tr>
                
                {/* Row 7: Numéro de série */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Numéro de série</td>
                  <td className="py-1 text-gray-800" colSpan="2">{device.serial_number}</td>
                </tr>
              </tbody>
            </table>

            {/* Content Sections */}
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '170px' }} />
                <col />
              </colgroup>
              <tbody>
                {/* Motif de retour = Service type + Customer notes */}
                <tr>
                  <td className="pt-6 pb-2 font-bold text-[#003366] align-top whitespace-nowrap">Motif de retour</td>
                  <td className="pt-6 pb-2 text-gray-800" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>{motifText}</td>
                </tr>
                
                {/* Étalonnage effectué - only if not 'none' */}
                {showCalType && (
                  <tr>
                    <td className="py-2 font-bold text-[#003366] align-top whitespace-nowrap">Étalonnage effectué</td>
                    <td className="py-2 text-gray-800">{calType}</td>
                  </tr>
                )}
                
                {/* Résultats à la réception - only if not 'none' */}
                {showReceptionResult && (
                  <tr>
                    <td className="py-2 font-bold text-[#003366] align-top whitespace-nowrap">Résultats à la réception</td>
                    <td className="py-2 text-gray-800">{receptionResult}</td>
                  </tr>
                )}
                
                {/* Constatations (Tech findings) */}
                <tr>
                  <td className="pt-6 pb-2 font-bold text-[#003366] align-top whitespace-nowrap">Constatations</td>
                  <td className="pt-6 pb-2 text-gray-800" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{findings || '—'}</td>
                </tr>
                
                {/* Actions effectuées (Work description) */}
                <tr>
                  <td className="py-2 font-bold text-[#003366] align-top whitespace-nowrap">Actions effectuées</td>
                  <td className="py-2 text-gray-800" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{workCompleted || '—'}</td>
                </tr>
                
                {/* Travaux réalisés (Checklist) - more space above */}
                <tr>
                  <td className="pt-10 pb-2 font-bold text-[#003366] align-top whitespace-nowrap">Travaux réalisés</td>
                  <td className="pt-10 pb-2">
                    <div className="space-y-1">
                      {checklist.filter(item => item.checked).map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="text-[#003366]">☑</span>
                          <span className="text-gray-800">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer - Always at bottom */}
          <div className="text-center text-sm text-gray-600 mt-auto pt-8">
            <p className="font-bold text-[#003366]">Lighthouse Worldwide Solutions France</p>
            <p>16 Rue Paul Séjourné 94000 Créteil France</p>
            <p>01 43 77 28 07</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Avenant Preview Modal - Shows additional work quote to send to client
function AvenantPreviewModal({ rma, devices, onClose, notify, reload, alreadySent }) {
  const [sending, setSending] = useState(false);
  const devicesWithWork = devices.filter(d => d.additional_work_needed && d.additional_work_items?.length > 0);
  const devicesRAS = devices.filter(d => !d.additional_work_needed || !d.additional_work_items?.length);
  
  const totalAvenant = devicesWithWork.reduce((sum, device) => {
    const deviceTotal = (device.additional_work_items || []).reduce((dSum, item) => 
      dSum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0
    );
    return sum + deviceTotal;
  }, 0);
  
  const sendAvenant = async () => {
    setSending(true);
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'quote_sent',
          avenant_total: totalAvenant,
          avenant_sent_at: new Date().toISOString()
        })
        .eq('id', rma.id);
      
      if (error) throw error;
      notify('✓ Avenant envoyé au client!');
      reload();
      onClose();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSending(false);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800">📄 Avenant au Devis</h2>
              {alreadySent && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                  ✓ Envoyé le {new Date(rma.avenant_sent_at).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">Travaux supplémentaires découverts lors du service</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
        </div>
        
        <div className="p-6">
          {/* Quote Header - Like official document */}
          <div className="border-2 border-gray-300 rounded-xl overflow-hidden mb-6">
            {/* Company Header */}
            <div className="bg-[#1a1a2e] text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">LIGHTHOUSE FRANCE</h3>
                  <p className="text-gray-300 text-sm mt-1">Service Métrologie & Calibration</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[#00A651]">AVENANT</p>
                  <p className="text-gray-300">RMA: {rma.request_number}</p>
                  <p className="text-gray-400 text-sm">{alreadySent ? new Date(rma.avenant_sent_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
            
            {/* Client Info */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Client</p>
                  <p className="font-bold text-gray-800">{rma.companies?.name}</p>
                  {rma.companies?.billing_address && <p className="text-sm text-gray-600">{rma.companies.billing_address}</p>}
                  {rma.companies?.billing_postal_code && <p className="text-sm text-gray-600">{rma.companies.billing_postal_code} {rma.companies.billing_city}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-medium">Référence</p>
                  <p className="font-bold text-gray-800">{rma.request_number}</p>
                  <p className="text-sm text-gray-600">Devis initial: {rma.quote_total ? `€${rma.quote_total.toFixed(2)}` : '—'}</p>
                </div>
              </div>
            </div>
            
            {/* Introduction */}
            <div className="px-6 py-4 bg-amber-50 border-b">
              <p className="text-sm text-amber-800">
                <strong>Objet:</strong> Suite à l'inspection de vos appareils, nous avons constaté des travaux supplémentaires nécessaires. 
                Veuillez trouver ci-dessous le détail des interventions recommandées.
              </p>
            </div>
            
            {/* Devices with additional work */}
            <div className="divide-y">
              {devicesWithWork.map((device, idx) => {
                const deviceTotal = (device.additional_work_items || []).reduce((sum, item) => 
                  sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0
                );
                
                return (
                  <div key={device.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-gray-800 text-lg">{device.model_name}</p>
                        <p className="text-sm text-gray-500">N° de série: {device.serial_number}</p>
                        <p className="text-xs text-gray-400">Service: {device.service_type === 'calibration' ? 'Étalonnage' : 'Réparation'}</p>
                      </div>
                      <span className="text-xl font-bold text-gray-800">€{deviceTotal.toFixed(2)}</span>
                    </div>
                    
                    {/* Findings */}
                    {device.service_findings && (
                      <div className="bg-gray-100 rounded-lg p-4 mb-4">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Constatations du technicien</p>
                        <p className="text-gray-700">{device.service_findings}</p>
                      </div>
                    )}
                    
                    {/* Work Items Table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-gray-600">Description</th>
                          <th className="text-center py-2 text-gray-600 w-20">Qté</th>
                          <th className="text-right py-2 text-gray-600 w-24">Prix Unit.</th>
                          <th className="text-right py-2 text-gray-600 w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(device.additional_work_items || []).map((item, itemIdx) => (
                          <tr key={itemIdx} className="border-b border-gray-100">
                            <td className="py-2">{item.description}</td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 text-right">€{(parseFloat(item.price) || 0).toFixed(2)}</td>
                            <td className="py-2 text-right font-medium">€{((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            
            {/* Devices without additional work (RAS) */}
            {devicesRAS.length > 0 && (
              <div className="px-6 py-4 bg-green-50 border-t">
                <p className="text-sm text-green-800 font-medium mb-2">Appareils sans travaux supplémentaires:</p>
                <div className="space-y-1">
                  {devicesRAS.map(device => (
                    <p key={device.id} className="text-sm text-green-700">
                      ✓ {device.model_name} (SN: {device.serial_number}) - {device.service_findings || 'RAS'}
                    </p>
                  ))}
                </div>
              </div>
            )}
            
            {/* Total */}
            <div className="px-6 py-4 flex justify-between items-center bg-[#00A651] text-white">
              <span className="text-lg font-bold">TOTAL AVENANT</span>
              <span className="text-2xl font-bold">€{totalAvenant.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Terms */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Ce devis est valable 30 jours à compter de sa date d'émission.</p>
            <p>• Les travaux seront effectués après réception de votre accord écrit.</p>
            <p>• Conditions de règlement: 30 jours fin de mois.</p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center sticky bottom-0">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
            ← Fermer
          </button>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
              📥 Télécharger PDF
            </button>
            {!alreadySent && (
              <button 
                onClick={sendAvenant}
                disabled={sending}
                className="px-6 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium disabled:opacity-50"
              >
                {sending ? 'Envoi...' : '📧 Envoyer au Client'}
              </button>
            )}
            {alreadySent && (
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                ✓ Envoyé le {new Date(rma.avenant_sent_at).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestsSheet({ requests, notify, reload, profile }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quoteRequest, setQuoteRequest] = useState(null);
  const [filter, setFilter] = useState('pending');
  
  const pendingRequests = requests.filter(r => r.status === 'submitted' && !r.request_number);
  const modificationRequests = requests.filter(r => r.status === 'quote_revision_requested');
  const allPending = [...modificationRequests, ...pendingRequests];
  const displayRequests = filter === 'pending' ? allPending : requests;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Demandes</h1>
        <div className="flex gap-2">
          <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-200'}`}>
            En attente ({allPending.length})
          </button>
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}>
            Toutes ({requests.length})
          </button>
        </div>
      </div>
      
      {/* Modification Requests Alert */}
      {modificationRequests.length > 0 && filter === 'pending' && (
        <div className="bg-red-50 border-2 border-red-300 p-4 rounded-xl">
          <p className="font-bold text-red-800">🔴 {modificationRequests.length} demande(s) de modification de devis</p>
          <p className="text-sm text-red-600">Le client a demandé des modifications - veuillez réviser et renvoyer</p>
        </div>
      )}
      
      {pendingRequests.length > 0 && filter === 'pending' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <p className="font-medium text-amber-800">⚠️ {pendingRequests.length} nouvelle(s) demande(s) - Créez un devis pour traiter</p>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">ID / RMA</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Client</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Type</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Appareils</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Soumis</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayRequests.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{filter === 'pending' ? 'Aucune demande en attente' : 'Aucune demande'}</td></tr>
            ) : displayRequests.map(req => {
              const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
              const devices = req.request_devices || [];
              const isPending = req.status === 'submitted' && !req.request_number;
              const needsRevision = req.status === 'quote_revision_requested';
              const isContractRMA = req.is_contract_rma || req.contract_id;
              
              return (
                <tr key={req.id} className={`hover:bg-gray-50 ${needsRevision ? 'bg-red-50' : isPending ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {req.request_number ? (
                        <span className="font-mono font-bold text-[#00A651]">{req.request_number}</span>
                      ) : (
                        <span className="text-amber-600 font-medium">Nouvelle</span>
                      )}
                      {isContractRMA && (
                        <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-700">
                          📋
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">{req.companies?.name || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-sm">{req.request_type === 'service' ? '🔧 Service' : '📦 Pièces'}</span></td>
                  <td className="px-4 py-3"><span className="text-sm text-gray-600">{devices.length > 0 ? devices.length + ' appareil(s)' : '1 appareil'}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(isPending || needsRevision) && (
                        <button onClick={() => setQuoteRequest(req)} className={`px-3 py-1 text-sm text-white rounded font-medium ${needsRevision ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00A651] hover:bg-[#008f45]'}`}>
                          {needsRevision ? '🔴 Réviser Devis' : '💰 Créer Devis'}
                        </button>
                      )}
                      <button onClick={() => setSelectedRequest(req)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Voir</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedRequest && <RequestDetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} onCreateQuote={() => { setSelectedRequest(null); setQuoteRequest(selectedRequest); }} />}
      {quoteRequest && <QuoteEditorModal request={quoteRequest} onClose={() => setQuoteRequest(null)} notify={notify} reload={reload} profile={profile} />}
    </div>
  );
}

function RequestDetailModal({ request, onClose, onCreateQuote }) {
  const style = STATUS_STYLES[request.status] || STATUS_STYLES.submitted;
  const devices = request.request_devices || [];
  const isPending = request.status === 'submitted' && !request.request_number;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b sticky top-0 bg-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{request.request_number || 'Nouvelle Demande'}</h2>
            <p className="text-sm text-gray-500">{request.companies?.name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>{style.label}</span>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Client</h3><p className="font-medium">{request.companies?.name}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Service</h3><p className="font-medium">{request.requested_service}</p><p className="text-sm text-gray-500">Soumis le {new Date(request.created_at).toLocaleDateString('fr-FR')}</p></div>
          </div>
          
          {/* Devices */}
          <div>
            <h3 className="font-bold text-gray-700 mb-3">Appareils ({devices.length || 1})</h3>
            {devices.length > 0 ? (
              <div className="space-y-2">
                {devices.map((d, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{d.model_name}</p>
                      <p className="text-sm text-gray-500">SN: {d.serial_number}</p>
                      {d.service_type && <p className="text-xs text-gray-400">{d.service_type}</p>}
                    </div>
                    <span className="text-sm text-gray-400">{d.equipment_type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3"><p className="font-medium">{request.serial_number}</p></div>
            )}
          </div>
          
          {request.problem_description && <div><h3 className="font-bold text-gray-700 mb-2">Notes du client</h3><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm whitespace-pre-wrap">{request.problem_description}</p></div></div>}
        </div>
        
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Fermer</button>
          {isPending && (
            <button onClick={onCreateQuote} className="px-6 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium">
              💰 Créer Devis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PARTS ORDERS SHEET - Manage spare parts orders
// ============================================
function PartsOrdersSheet({ requests, notify, reload, profile }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [quoteOrder, setQuoteOrder] = useState(null);
  const [bcReviewOrder, setBcReviewOrder] = useState(null);
  const [processOrder, setProcessOrder] = useState(null);
  
  // Categorize orders
  const pendingOrders = requests.filter(r => r.status === 'submitted' && !r.request_number);
  const revisionOrders = requests.filter(r => r.status === 'quote_revision_requested');
  const quoteSentOrders = requests.filter(r => r.status === 'quote_sent');
  const bcReviewOrders = requests.filter(r => r.status === 'bc_review');
  
  // Approved orders ready for processing (after BC approved)
  // Using existing statuses: in_progress, ready_to_ship
  const approvedOrders = requests.filter(r => 
    ['in_progress', 'ready_to_ship'].includes(r.status)
  );
  const shippedOrders = requests.filter(r => ['shipped', 'delivered', 'completed'].includes(r.status));
  
  const allPending = [...revisionOrders, ...pendingOrders];

  // Parts order status styles - using existing database statuses
  const PARTS_STATUS = {
    submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Nouvelle demande' },
    quote_sent: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Devis envoyé' },
    quote_revision_requested: { bg: 'bg-red-100', text: 'text-red-700', label: 'Révision demandée' },
    bc_review: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'BC à vérifier' },
    in_progress: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En cours de traitement' },
    ready_to_ship: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Prêt à expédier' },
    shipped: { bg: 'bg-green-100', text: 'text-green-700', label: 'Expédié' },
    delivered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Livré' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Terminé' }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">🔩 Commandes de Pièces Détachées</h1>
        <div className="flex gap-4 text-sm">
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full">{allPending.length} à traiter</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">{bcReviewOrders.length} BC à vérifier</span>
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">{approvedOrders.length} en cours</span>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">{shippedOrders.length} expédiées</span>
        </div>
      </div>
      
      {/* ============================================ */}
      {/* SECTION 1: BC À VÉRIFIER (identical to RMA Dashboard) */}
      {/* ============================================ */}
      {bcReviewOrders.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-red-200 bg-red-100 rounded-t-xl">
            <h2 className="font-bold text-red-800 text-lg">⚠️ Bons de Commande à Vérifier ({bcReviewOrders.length})</h2>
            <p className="text-sm text-red-600">Cliquez sur "Examiner" pour vérifier le document et approuver</p>
          </div>
          <div className="p-4 space-y-3">
            {bcReviewOrders.map(order => {
              const quoteData = order.quote_data || {};
              return (
                <div key={order.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm border border-red-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                    <div>
                      <span className="font-mono font-bold text-amber-600 text-lg">{order.request_number}</span>
                      <p className="font-medium text-gray-800">{order.companies?.name}</p>
                      <p className="text-sm text-gray-500">
                        BC soumis le {order.bc_submitted_at ? new Date(order.bc_submitted_at).toLocaleDateString('fr-FR') : new Date(order.updated_at).toLocaleDateString('fr-FR')}
                        {order.bc_signed_by && <span className="ml-2">• Signé par: {order.bc_signed_by}</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBcReviewOrder(order)}
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2"
                  >
                    🔍 Examiner
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* ============================================ */}
      {/* SECTION 2: NOUVELLES DEMANDES (create quote) */}
      {/* ============================================ */}
      {allPending.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl overflow-hidden">
          <div className="bg-amber-100 px-6 py-4 border-b border-amber-300">
            <h2 className="text-lg font-bold text-amber-800 flex items-center gap-2">
              ⏳ Nouvelles Demandes
              <span className="px-2 py-0.5 bg-amber-500 text-white text-sm rounded-full">{allPending.length}</span>
            </h2>
            <p className="text-sm text-amber-600">Créez un devis pour ces demandes</p>
          </div>
          <div className="divide-y divide-amber-200">
            {allPending.map(order => {
              const needsRevision = order.status === 'quote_revision_requested';
              return (
                <div 
                  key={order.id}
                  className={`p-4 hover:bg-amber-100/50 cursor-pointer transition-colors ${needsRevision ? 'bg-red-50' : ''}`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${needsRevision ? 'bg-red-500' : 'bg-amber-500'} rounded-lg flex items-center justify-center text-white font-bold`}>
                        {needsRevision ? '🔴' : '📦'}
                      </div>
                      <div>
                        <p className="font-bold text-amber-900">{order.companies?.name}</p>
                        <p className="text-sm text-amber-700">
                          {needsRevision ? 'Modification demandée' : 'Nouvelle commande'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-amber-600">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setQuoteOrder(order); }}
                      className={`ml-4 px-4 py-2 ${needsRevision ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00A651] hover:bg-[#008f45]'} text-white rounded-lg font-medium`}
                    >
                      {needsRevision ? '🔴 Réviser' : '💰 Créer Devis'}
                    </button>
                  </div>
                  {needsRevision && order.revision_notes && (
                    <div className="mt-3 p-3 bg-red-100 rounded-lg">
                      <p className="text-sm text-red-800"><strong>Note client:</strong> {order.revision_notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* ============================================ */}
      {/* SECTION 3: DEVIS ENVOYÉS (waiting for BC) */}
      {/* ============================================ */}
      {quoteSentOrders.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-200">
            <h2 className="text-lg font-bold text-purple-800 flex items-center gap-2">
              💰 Devis Envoyés - En attente BC
              <span className="px-2 py-0.5 bg-purple-500 text-white text-sm rounded-full">{quoteSentOrders.length}</span>
            </h2>
          </div>
          <div className="divide-y divide-purple-100">
            {quoteSentOrders.map(order => {
              const quoteData = order.quote_data || {};
              return (
                <div 
                  key={order.id}
                  className="p-4 hover:bg-purple-100/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-purple-700">{order.request_number}</p>
                      <p className="text-sm text-purple-600">{order.companies?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-800">{(quoteData.grandTotal || 0).toFixed(2)} €</p>
                      <p className="text-xs text-purple-500">
                        Envoyé le {order.quote_sent_at ? new Date(order.quote_sent_at).toLocaleDateString('fr-FR') : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* ============================================ */}
      {/* SECTION 4: COMMANDES EN COURS (approved, processing) */}
      {/* ============================================ */}
      {approvedOrders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-500 to-amber-500 text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              🚀 Commandes en Cours
              <span className="px-2 py-0.5 bg-white/20 text-sm rounded-full">{approvedOrders.length}</span>
            </h2>
            <p className="text-sm text-orange-100">Cliquez sur une commande pour la traiter</p>
          </div>
          <div className="divide-y divide-gray-100">
            {approvedOrders.map(order => {
              const style = PARTS_STATUS[order.status] || PARTS_STATUS.parts_ordered;
              const quoteData = order.quote_data || {};
              const partsCount = quoteData.parts?.length || 0;
              
              return (
                <div 
                  key={order.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setProcessOrder(order)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                        order.status === 'in_progress' ? 'bg-orange-100' :
                        'bg-indigo-100'
                      }`}>
                        {order.status === 'in_progress' ? '📦' : '🚚'}
                      </div>
                      <div>
                        <p className="font-mono font-bold text-gray-800">{order.request_number}</p>
                        <p className="text-sm text-gray-600">{order.companies?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{partsCount} pièce(s)</p>
                        <p className="font-bold text-gray-800">{(quoteData.grandTotal || 0).toFixed(2)} €</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      <span className="text-gray-400">→</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* ============================================ */}
      {/* SECTION 5: COMMANDES EXPÉDIÉES */}
      {/* ============================================ */}
      {shippedOrders.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-green-200">
            <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
              ✅ Commandes Expédiées
              <span className="px-2 py-0.5 bg-green-500 text-white text-sm rounded-full">{shippedOrders.length}</span>
            </h2>
          </div>
          <div className="divide-y divide-green-100">
            {shippedOrders.slice(0, 5).map(order => {
              const quoteData = order.quote_data || {};
              return (
                <div 
                  key={order.id}
                  className="p-4 hover:bg-green-100/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-green-700">{order.request_number}</p>
                      <p className="text-sm text-green-600">{order.companies?.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {order.bl_number && (
                        <span className="text-sm text-green-600">BL: {order.bl_number}</span>
                      )}
                      {order.ups_tracking_number && (
                        <span className="text-sm text-green-600">UPS: {order.ups_tracking_number}</span>
                      )}
                      <span className="text-xs text-green-500">
                        {order.shipped_at ? new Date(order.shipped_at).toLocaleDateString('fr-FR') : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {requests.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-gray-500 text-lg">Aucune commande de pièces</p>
          <p className="text-gray-400 text-sm mt-2">Les commandes de pièces des clients apparaîtront ici</p>
        </div>
      )}
      
      {/* Modals */}
      {selectedOrder && (
        <PartsOrderDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onCreateQuote={() => { setSelectedOrder(null); setQuoteOrder(selectedOrder); }} 
        />
      )}
      {quoteOrder && (
        <PartsQuoteEditor 
          order={quoteOrder} 
          onClose={() => setQuoteOrder(null)} 
          notify={notify} 
          reload={reload} 
          profile={profile} 
        />
      )}
      {bcReviewOrder && (
        <PartsBCReviewModal
          order={bcReviewOrder}
          onClose={() => setBcReviewOrder(null)}
          notify={notify}
          reload={reload}
        />
      )}
      {processOrder && (
        <PartsProcessModal
          order={processOrder}
          onClose={() => setProcessOrder(null)}
          notify={notify}
          reload={reload}
          profile={profile}
        />
      )}
    </div>
  );
}

// ============================================
// PARTS BC REVIEW MODAL (identical to RMA BCReviewModal)
// ============================================
function PartsBCReviewModal({ order, onClose, notify, reload }) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const approveBC = async () => {
    setApproving(true);
    const { error } = await supabase
      .from('service_requests')
      .update({ 
        status: 'in_progress'
      })
      .eq('id', order.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('✅ BC approuvé! Commande de pièces lancée.');
      reload();
      onClose();
    }
    setApproving(false);
  };
  
  const rejectBC = async () => {
    if (!rejectReason.trim()) {
      notify('Veuillez indiquer la raison du refus', 'error');
      return;
    }
    setRejecting(true);
    const { error } = await supabase
      .from('service_requests')
      .update({ 
        status: 'bc_rejected',
        bc_rejected_at: new Date().toISOString(),
        bc_rejection_reason: rejectReason,
        bc_file_url: null,
        bc_signature_url: null,
        bc_submitted_at: null
      })
      .eq('id', order.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('BC refusé. Le client devra soumettre un nouveau BC.');
      reload();
      onClose();
    }
    setRejecting(false);
  };
  
  const quoteData = order.quote_data || {};
  const parts = quoteData.parts || [];
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex" onClick={onClose}>
      <div className="bg-white w-full h-full max-w-[98vw] max-h-[98vh] m-auto rounded-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">Vérification du Bon de Commande</h2>
            <p className="text-red-100">{order.request_number} • {order.companies?.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-3xl">&times;</button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Document Preview - Takes most of the space */}
          <div className="flex-1 flex flex-col bg-gray-800 p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-white text-lg">📄 Document BC</h3>
              {order.bc_file_url && (
                <a href={order.bc_file_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">
                  Ouvrir dans nouvel onglet ↗
                </a>
              )}
            </div>
            
            {/* BC File - Full height PDF viewer */}
            {order.bc_file_url ? (
              <div className="flex-1 rounded-lg overflow-hidden bg-white">
                {order.bc_file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={order.bc_file_url} alt="BC Document" className="w-full h-full object-contain" />
                ) : order.bc_file_url.match(/\.pdf$/i) ? (
                  <object
                    data={`${order.bc_file_url}#view=Fit`}
                    type="application/pdf"
                    className="w-full h-full"
                    style={{ minHeight: '100%' }}
                  >
                    <iframe 
                      src={`${order.bc_file_url}#view=Fit`} 
                      className="w-full h-full" 
                      title="BC PDF"
                    />
                  </object>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <a href={order.bc_file_url} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-blue-500 text-white rounded-lg text-lg font-medium">
                      📥 Télécharger le fichier
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-400 text-lg">
                Aucun fichier BC uploadé
              </div>
            )}
          </div>
          
          {/* Right: Order Details - Sidebar */}
          <div className="w-96 flex-shrink-0 bg-gray-50 overflow-y-auto p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg">📋 Détails de la Commande</h3>
            
            {/* Order Info */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">N° Commande</p>
                  <p className="font-mono font-bold text-amber-600">{order.request_number}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium">Pièces détachées</p>
                </div>
                <div>
                  <p className="text-gray-500">Soumission BC</p>
                  <p className="font-medium">{order.bc_submitted_at ? new Date(order.bc_submitted_at).toLocaleString('fr-FR') : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Client</p>
                  <p className="font-medium">{order.companies?.name}</p>
                </div>
              </div>
            </div>
            
            {/* Signature */}
            {order.bc_signature_url && (
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-gray-700 mb-2">✍️ Signature</h4>
                <img src={order.bc_signature_url} alt="Signature" className="max-h-20 mx-auto bg-gray-50 rounded p-2" />
                <p className="text-center text-xs text-gray-500 mt-1">
                  {order.bc_signed_by || '—'} {order.bc_signature_date && `• ${new Date(order.bc_signature_date).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
            )}
            
            {/* Parts */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium text-gray-700 mb-2">📦 Pièces ({parts.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {parts.map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2 text-sm">
                    <p className="font-medium">{p.description}</p>
                    <p className="text-gray-500">Réf: {p.partNumber || '—'} • Qté: {p.quantity}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quote Info */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-1">💰 Devis</h4>
              <p className="text-xl font-bold text-blue-700">{(quoteData.grandTotal || 0).toFixed(2)} €</p>
              {order.quote_url && (
                <a href={order.quote_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                  Voir le devis ↗
                </a>
              )}
            </div>
            
            {/* Reject Reason */}
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">Refuser le BC?</h4>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Raison du refus..."
                className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm h-20 resize-none"
              />
            </div>
            
            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={approveBC}
                disabled={approving}
                className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {approving ? 'Approbation...' : '✅ Approuver BC'}
              </button>
              <button
                onClick={rejectBC}
                disabled={rejecting}
                className="w-full px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {rejecting ? 'Refus...' : '❌ Refuser BC'}
              </button>
              <button onClick={onClose} className="w-full px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PARTS PROCESS MODAL (for approved orders)
// ============================================
function PartsProcessModal({ order, onClose, notify, reload, profile }) {
  const [saving, setSaving] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  
  const quoteData = order.quote_data || {};
  const parts = quoteData.parts || [];
  
  const updateStatus = async (newStatus, extraFields = {}) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: newStatus,
          ...extraFields
        })
        .eq('id', order.id);
      
      if (error) throw error;
      
      notify('Statut mis à jour');
      reload();
      if (newStatus !== 'ready_to_ship') onClose();
    } catch (err) {
      notify(`Erreur: ${err.message}`, 'error');
    }
    setSaving(false);
  };
  
  if (showShipping) {
    return (
      <PartsShippingModal
        order={order}
        onClose={() => { setShowShipping(false); onClose(); }}
        notify={notify}
        reload={reload}
        profile={profile}
      />
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">🚀 Traitement Commande</h2>
              <p className="text-orange-100">{order.request_number} • {order.companies?.name}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
        
        {/* Progress */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {[
              { id: 'in_progress', label: 'En cours', icon: '📦' },
              { id: 'ready_to_ship', label: 'Prêt', icon: '🚚' },
              { id: 'shipped', label: 'Expédié', icon: '✅' }
            ].map((step, idx) => {
              const statusOrder = ['in_progress', 'ready_to_ship', 'shipped'];
              const currentIdx = statusOrder.indexOf(order.status);
              const stepIdx = statusOrder.indexOf(step.id);
              const isComplete = currentIdx >= stepIdx;
              const isCurrent = order.status === step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    isCurrent ? 'bg-orange-500 text-white ring-4 ring-orange-200' :
                    isComplete ? 'bg-green-500 text-white' : 'bg-gray-200'
                  }`}>
                    {isComplete && !isCurrent ? '✓' : step.icon}
                  </div>
                  <span className={`ml-2 text-sm ${isCurrent ? 'font-bold text-orange-700' : isComplete ? 'text-green-700' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                  {idx < 3 && <div className={`w-8 h-1 mx-2 ${isComplete && !isCurrent ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Parts List */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">📦 Pièces à expédier</h3>
            <div className="bg-amber-50 rounded-lg p-4 space-y-2">
              {parts.map((part, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white rounded p-2">
                  <div>
                    <span className="font-mono text-sm text-amber-700">{part.partNumber || '—'}</span>
                    <span className="ml-2 text-gray-600">{part.description}</span>
                  </div>
                  <span className="font-bold">x{part.quantity}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Action based on status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            {order.status === 'in_progress' && (
              <>
                <h4 className="font-bold text-blue-800 mb-2">📦 Commande en cours de traitement</h4>
                <p className="text-blue-600 text-sm mb-4">Quand les pièces sont prêtes, marquez comme prêt à expédier.</p>
                <button
                  onClick={() => updateStatus('ready_to_ship', {})}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {saving ? '...' : '🚚 Marquer Prêt à Expédier'}
                </button>
              </>
            )}
            
            {order.status === 'ready_to_ship' && (
              <>
                <h4 className="font-bold text-blue-800 mb-2">🚚 Prêt à expédier</h4>
                <p className="text-blue-600 text-sm mb-4">Créez l'étiquette UPS et le bon de livraison.</p>
                <button
                  onClick={() => setShowShipping(true)}
                  className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
                >
                  📦 Créer Expédition & BL
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// Parts Order Detail Modal
function PartsOrderDetailModal({ order, onClose, onCreateQuote }) {
  const style = STATUS_STYLES[order.status] || STATUS_STYLES.submitted;
  const isPending = order.status === 'submitted' && !order.request_number;
  const needsRevision = order.status === 'quote_revision_requested';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b sticky top-0 bg-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {order.request_number || 'Nouvelle Commande de Pièces'}
            </h2>
            <p className="text-sm text-gray-500">{order.companies?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
              {style.label}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Revision Notes */}
          {order.revision_notes && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-red-800 mb-2">🔴 Demande de modification du client</h3>
              <p className="text-red-700 whitespace-pre-wrap">{order.revision_notes}</p>
            </div>
          )}
          
          {/* Requested Parts - Structured Display */}
          <div>
            <h3 className="font-bold text-gray-700 mb-3">📦 Pièces demandées</h3>
            
            {order.parts_data?.parts ? (
              <div className="space-y-4">
                {order.parts_data.parts.map((part, idx) => (
                  <div key={idx} className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-amber-900">Pièce #{part.num || idx + 1}</span>
                      <span className="text-sm bg-amber-200 px-2 py-0.5 rounded text-amber-800">Qté: {part.quantity || 1}</span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-2 text-sm mb-2">
                      {part.device_for && (
                        <div>
                          <span className="text-gray-500">Pour appareil:</span>
                          <span className="ml-2 font-medium">{part.device_for}</span>
                        </div>
                      )}
                      {part.part_number && (
                        <div>
                          <span className="text-gray-500">N° pièce:</span>
                          <span className="ml-2 font-mono font-medium text-amber-700">{part.part_number}</span>
                        </div>
                      )}
                    </div>
                    
                    {part.description && (
                      <div className="mt-2 bg-white rounded p-2">
                        <span className="text-gray-500 text-xs">Description:</span>
                        <p className="text-gray-800">{part.description}</p>
                      </div>
                    )}
                    
                    {/* Photos */}
                    {part.photos && part.photos.length > 0 && (
                      <div className="mt-3">
                        <span className="text-gray-500 text-sm">📷 Photos ({part.photos.length}):</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {part.photos.map((photoUrl, pIdx) => (
                            <a 
                              key={pIdx} 
                              href={photoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img 
                                src={photoUrl} 
                                alt={`Photo ${pIdx + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border-2 border-amber-300 hover:border-amber-500 transition-colors"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback to plain text */
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800 whitespace-pre-wrap">{order.problem_description}</p>
              </div>
            )}
          </div>
          
          {/* Shipping Address */}
          {order.shipping_address_id && (
            <div>
              <h3 className="font-bold text-gray-700 mb-3">📍 Adresse de livraison</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-gray-600">ID: {order.shipping_address_id}</p>
              </div>
            </div>
          )}
          
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Soumis le</p>
              <p className="font-medium">{new Date(order.created_at).toLocaleDateString('fr-FR', { dateStyle: 'full' })}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Urgence</p>
              <p className="font-medium">{order.urgency || 'Normal'}</p>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Fermer</button>
          {(isPending || needsRevision) && (
            <button onClick={onCreateQuote} className={`px-6 py-2 text-white rounded-lg font-medium ${needsRevision ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00A651] hover:bg-[#008f45]'}`}>
              💰 {needsRevision ? 'Réviser Devis' : 'Créer Devis'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PARTS QUOTE EDITOR - Build parts quote
// ============================================
function PartsQuoteEditor({ order, onClose, notify, reload, profile }) {
  const [step, setStep] = useState(1); // 1=Edit Parts, 2=Preview, 3=Confirm
  const [quoteParts, setQuoteParts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [quoteRef, setQuoteRef] = useState('');
  const [partsCache, setPartsCache] = useState({});
  const [partsDescriptionCache, setPartsDescriptionCache] = useState({});
  const [loadingParts, setLoadingParts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Shipping
  const [shippingData, setShippingData] = useState({
    unitPrice: 45,
    parcels: 1,
    total: 45
  });
  
  const signatory = profile?.full_name || 'Lighthouse France';
  const today = new Date();
  
  // Generate quote reference
  useEffect(() => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    setQuoteRef(`PO-${year}-${random}`);
  }, []);
  
  // Load parts pricing from database
  useEffect(() => {
    const loadParts = async () => {
      setLoadingParts(true);
      try {
        let allParts = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data, error } = await supabase
            .from('parts_pricing')
            .select('part_number, unit_price, description, description_fr')
            .range(offset, offset + batchSize - 1);
          
          if (error) break;
          if (data && data.length > 0) {
            allParts = [...allParts, ...data];
            offset += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }
        
        const cache = {};
        const descCache = {};
        allParts.forEach(p => {
          cache[p.part_number] = p.unit_price;
          descCache[p.part_number] = p.description_fr || p.description || p.part_number;
        });
        
        setPartsCache(cache);
        setPartsDescriptionCache(descCache);
        
        // Get shipping price
        if (cache['Shipping1']) {
          setShippingData(prev => ({ ...prev, unitPrice: cache['Shipping1'], total: cache['Shipping1'] * prev.parcels }));
        }
      } catch (err) {
        console.error('Parts load error:', err);
      }
      setLoadingParts(false);
    };
    loadParts();
  }, []);
  
  // DON'T auto-add customer request as quote lines - admin builds quote from scratch
  // Quote starts empty, admin adds parts based on what customer requested
  
  // Search parts
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const lowerTerm = term.toLowerCase();
    const results = Object.entries(partsDescriptionCache)
      .filter(([pn, desc]) => 
        pn.toLowerCase().includes(lowerTerm) || 
        (desc && desc.toLowerCase().includes(lowerTerm))
      )
      .slice(0, 20)
      .map(([pn, desc]) => ({
        partNumber: pn,
        description: desc,
        unitPrice: partsCache[pn] || 0
      }));
    setSearchResults(results);
  };
  
  // Add part from search
  const addPart = (part) => {
    setQuoteParts([...quoteParts, {
      id: `part_${Date.now()}`,
      partNumber: part.partNumber,
      description: part.description,
      quantity: 1,
      unitPrice: part.unitPrice,
      isFromRequest: false
    }]);
    setSearchTerm('');
    setSearchResults([]);
  };
  
  // Add blank part
  const addBlankPart = () => {
    setQuoteParts([...quoteParts, {
      id: `part_${Date.now()}`,
      partNumber: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      isFromRequest: false
    }]);
  };
  
  // Update part
  const updatePart = (id, field, value) => {
    setQuoteParts(quoteParts.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      // Auto-fill price if part number matches
      if (field === 'partNumber' && partsCache[value]) {
        updated.unitPrice = partsCache[value];
        updated.description = partsDescriptionCache[value] || updated.description;
      }
      return updated;
    }));
  };
  
  // Remove part
  const removePart = (id) => {
    setQuoteParts(quoteParts.filter(p => p.id !== id));
  };
  
  // Calculate totals
  const partsTotal = quoteParts.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
  const grandTotal = partsTotal + shippingData.total;
  
  // Send quote
  const sendQuote = async () => {
    if (quoteParts.length === 0) {
      notify('Ajoutez au moins une pièce au devis', 'error');
      return;
    }
    
    setSaving(true);
    try {
      // Generate Parts Order number if not exists (PO-XXXXX format, separate from FR-XXXXX RMAs)
      let poNumber = order.request_number;
      if (!poNumber) {
        const { data: lastReq } = await supabase
          .from('service_requests')
          .select('request_number')
          .like('request_number', 'PO-%')
          .order('request_number', { ascending: false })
          .limit(1);
        
        const lastNum = lastReq?.[0]?.request_number;
        let nextNum = 1;
        if (lastNum) {
          const match = lastNum.match(/PO-(\d+)/);
          if (match) nextNum = parseInt(match[1]) + 1;
        }
        poNumber = `PO-${String(nextNum).padStart(5, '0')}`;
      }
      
      // Build quote_data
      const quoteData = {
        parts: quoteParts.map(p => ({
          partNumber: p.partNumber,
          description: p.description,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          lineTotal: p.quantity * p.unitPrice
        })),
        shipping: shippingData,
        partsTotal,
        grandTotal,
        quoteRef,
        createdBy: signatory,
        createdAt: new Date().toISOString()
      };
      
      // Generate quote PDF
      let quoteUrl = null;
      try {
        const pdfBlob = await generatePartsQuotePDF(order, quoteData);
        const pdfFileName = `devis_pieces_${poNumber}_${Date.now()}.pdf`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(pdfFileName, pdfBlob, { contentType: 'application/pdf' });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(pdfFileName);
          quoteUrl = urlData?.publicUrl;
        } else {
          console.error('Quote PDF upload error:', uploadError);
        }
      } catch (e) {
        console.error('Quote PDF generation error:', e);
      }
      
      // Update order with quote data
      const { error } = await supabase
        .from('service_requests')
        .update({
          request_number: poNumber,
          status: 'quote_sent',
          quote_sent_at: new Date().toISOString(),
          quote_data: quoteData,
          quote_url: quoteUrl,
          revision_notes: null
        })
        .eq('id', order.id);
      
      if (error) throw error;
      
      notify(`Devis ${quoteRef} envoyé pour ${order.companies?.name}`);
      reload();
      onClose();
    } catch (err) {
      notify(`Erreur: ${err.message}`, 'error');
    }
    setSaving(false);
  };

  if (loadingParts) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des pièces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">🔩 Devis Pièces Détachées</h2>
            <p className="text-amber-100">{order.companies?.name} • {quoteRef}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-white text-amber-600' : 'bg-amber-400/50 text-white'}`}>
                  {s}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Edit Parts */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Revision Notes Alert */}
              {order.revision_notes && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <h3 className="font-bold text-red-800 mb-2">🔴 Modifications demandées par le client</h3>
                  <p className="text-red-700 whitespace-pre-wrap">{order.revision_notes}</p>
                </div>
              )}
              
              {/* Customer Request - Structured Display */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-bold text-amber-800 mb-3">📋 Demande du client</h3>
                
                {/* Check for structured parts_data first */}
                {order.parts_data?.parts ? (
                  <div className="space-y-4">
                    {order.parts_data.parts.map((part, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-4 border border-amber-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-amber-900">Pièce #{part.num || idx + 1}</span>
                          <span className="text-sm text-amber-600">Qté: {part.quantity || 1}</span>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          {part.device_for && (
                            <div>
                              <span className="text-gray-500">Pour appareil:</span>
                              <span className="ml-2 font-medium text-gray-800">{part.device_for}</span>
                            </div>
                          )}
                          {part.part_number && (
                            <div>
                              <span className="text-gray-500">N° pièce:</span>
                              <span className="ml-2 font-mono font-medium text-amber-700">{part.part_number}</span>
                            </div>
                          )}
                        </div>
                        
                        {part.description && (
                          <div className="mt-2">
                            <span className="text-gray-500 text-sm">Description:</span>
                            <p className="text-gray-800 mt-1">{part.description}</p>
                          </div>
                        )}
                        
                        {/* Photos */}
                        {part.photos && part.photos.length > 0 && (
                          <div className="mt-3">
                            <span className="text-gray-500 text-sm">Photos:</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {part.photos.map((photoUrl, pIdx) => (
                                <a 
                                  key={pIdx} 
                                  href={photoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img 
                                    src={photoUrl} 
                                    alt={`Photo ${pIdx + 1}`}
                                    className="w-24 h-24 object-cover rounded-lg border-2 border-amber-300 hover:border-amber-500 transition-colors"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Fallback to plain text description */
                  <p className="text-amber-700 whitespace-pre-wrap text-sm">{order.problem_description}</p>
                )}
              </div>
              
              {/* Parts Search */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-700 mb-3">🔍 Ajouter des pièces au devis</h3>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Rechercher par référence ou description..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((part, i) => (
                        <button
                          key={i}
                          onClick={() => addPart(part)}
                          className="w-full px-4 py-2 text-left hover:bg-amber-50 flex justify-between items-center"
                        >
                          <div>
                            <span className="font-mono text-sm text-amber-600">{part.partNumber}</span>
                            <span className="text-gray-600 ml-2">{part.description}</span>
                          </div>
                          <span className="font-medium">{part.unitPrice.toFixed(2)} €</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={addBlankPart}
                  className="mt-3 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                >
                  + Ajouter ligne vide
                </button>
              </div>
              
              {/* Parts List */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3">📦 Pièces du devis</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 w-32">Référence</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Description</th>
                        <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 w-20">Qté</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-600 w-24">Prix Unit.</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-600 w-24">Total</th>
                        <th className="px-3 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {quoteParts.map((part, idx) => (
                        <tr key={part.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={part.partNumber}
                              onChange={(e) => updatePart(part.id, 'partNumber', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono"
                              placeholder="Réf..."
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={part.description}
                              onChange={(e) => updatePart(part.id, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              placeholder="Description..."
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={part.quantity}
                              onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-center"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={part.unitPrice}
                              onChange={(e) => updatePart(part.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-sm">
                            {(part.quantity * part.unitPrice).toFixed(2)} €
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removePart(part.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                      {quoteParts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                            Aucune pièce ajoutée. Utilisez la recherche ci-dessus.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Shipping */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-bold text-blue-800 mb-3">🚚 Frais de port</h3>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-sm text-blue-600">Nombre de colis</label>
                    <input
                      type="number"
                      min="0"
                      value={shippingData.parcels}
                      onChange={(e) => {
                        const p = parseInt(e.target.value) || 0;
                        setShippingData({ ...shippingData, parcels: p, total: p * shippingData.unitPrice });
                      }}
                      className="w-20 px-3 py-2 border border-blue-200 rounded-lg text-center ml-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-blue-600">Prix unitaire</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={shippingData.unitPrice}
                      onChange={(e) => {
                        const u = parseFloat(e.target.value) || 0;
                        setShippingData({ ...shippingData, unitPrice: u, total: u * shippingData.parcels });
                      }}
                      className="w-24 px-3 py-2 border border-blue-200 rounded-lg text-right ml-2"
                    />
                  </div>
                  <div className="text-right flex-1">
                    <span className="text-blue-600">Total port:</span>
                    <span className="font-bold text-blue-800 ml-2">{shippingData.total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
              
              {/* Totals */}
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between text-lg">
                  <span>Sous-total pièces:</span>
                  <span className="font-medium">{partsTotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>Frais de port:</span>
                  <span className="font-medium">{shippingData.total.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-[#00A651] mt-2 pt-2 border-t border-gray-300">
                  <span>TOTAL HT:</span>
                  <span>{grandTotal.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="bg-gray-200 p-6 rounded-lg">
              <div className="bg-white shadow-lg mx-auto flex flex-col" style={{ width: '210mm', minHeight: '297mm' }}>
                {/* PDF Preview Header */}
                <div className="border-b-4 border-[#00A651] p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <img 
                        src="/images/logos/lighthouse-logo.png" 
                        alt="Lighthouse France" 
                        className="h-12 w-auto"
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
                      <p className="text-xl font-bold text-[#00A651]">DEVIS PIÈCES</p>
                      <p className="text-gray-500">{quoteRef}</p>
                    </div>
                  </div>
                </div>
                
                {/* Info Bar */}
                <div className="bg-gray-100 px-6 py-3 flex justify-between text-sm">
                  <div>
                    <span className="text-gray-500">Date: </span>
                    <span className="font-medium">{today.toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Validité: </span>
                    <span className="font-medium">30 jours</span>
                  </div>
                </div>
                
                {/* Client Info */}
                <div className="px-6 py-4 border-b">
                  <p className="text-xs text-gray-500 uppercase">Client</p>
                  <p className="font-bold text-lg">{order.companies?.name}</p>
                  {order.companies?.billing_address && <p className="text-gray-600">{order.companies.billing_address}</p>}
                  <p className="text-gray-600">{order.companies?.billing_postal_code} {order.companies?.billing_city}</p>
                </div>
                
                {/* Parts Table - flex-1 to push footer down */}
                <div className="px-6 py-4 flex-1">
                  <h3 className="font-bold text-[#1a1a2e] mb-3">Récapitulatif des Pièces</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#1a1a2e] text-white">
                        <th className="px-3 py-2 text-left text-sm w-12">Qté</th>
                        <th className="px-3 py-2 text-left text-sm">Référence</th>
                        <th className="px-3 py-2 text-left text-sm">Désignation</th>
                        <th className="px-3 py-2 text-right text-sm w-20">Prix Unit.</th>
                        <th className="px-3 py-2 text-right text-sm w-20">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteParts.map((part, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 text-center">{part.quantity}</td>
                          <td className="px-3 py-2 font-mono text-sm">{part.partNumber || '—'}</td>
                          <td className="px-3 py-2 text-sm">{part.description}</td>
                          <td className="px-3 py-2 text-right">{part.unitPrice.toFixed(2)} €</td>
                          <td className="px-3 py-2 text-right font-medium">{(part.quantity * part.unitPrice).toFixed(2)} €</td>
                        </tr>
                      ))}
                      {shippingData.total > 0 && (
                        <tr className="bg-blue-50">
                          <td className="px-3 py-2 text-center">{shippingData.parcels}</td>
                          <td className="px-3 py-2 font-mono text-sm">Shipping1</td>
                          <td className="px-3 py-2 text-sm text-blue-800">Frais de port ({shippingData.parcels} colis)</td>
                          <td className="px-3 py-2 text-right">{shippingData.unitPrice.toFixed(2)} €</td>
                          <td className="px-3 py-2 text-right font-medium">{shippingData.total.toFixed(2)} €</td>
                        </tr>
                      )}
                      <tr className="bg-[#00A651] text-white">
                        <td colSpan={4} className="px-3 py-2 text-right font-bold">TOTAL HT</td>
                        <td className="px-3 py-2 text-right font-bold">{grandTotal.toFixed(2)} €</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  {/* Signature - moved inside flex-1 area */}
                  <div className="mt-12 pt-6 border-t">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Établi par</p>
                        <p className="font-bold text-lg">{signatory}</p>
                        <p className="text-gray-500">Lighthouse France</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase mb-1">Bon pour accord</p>
                        <div className="w-44 h-16 border-2 border-dashed border-gray-300 rounded"></div>
                        <p className="text-xs text-gray-400 mt-1">Signature et cachet</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Footer - at bottom */}
                <div className="bg-[#1a1a2e] text-white px-6 py-3 text-center text-xs">
                  <p className="font-medium">Lighthouse France SAS</p>
                  <p>16, rue Paul Séjourné • 94000 CRÉTEIL • Tél. 01 43 77 28 07</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">📧</p>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Prêt à envoyer</h3>
              <p className="text-gray-600 mb-6">
                Le devis sera envoyé au client {order.companies?.name}.
                <br />
                Montant total: <strong className="text-[#00A651]">{grandTotal.toFixed(2)} € HT</strong>
              </p>
              <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto text-left">
                <p className="text-sm text-gray-600"><strong>Référence:</strong> {quoteRef}</p>
                <p className="text-sm text-gray-600"><strong>Pièces:</strong> {quoteParts.length}</p>
                <p className="text-sm text-gray-600"><strong>Port:</strong> {shippingData.total.toFixed(2)} €</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between rounded-b-xl">
          <div>
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                ← Retour
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
              Annuler
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && quoteParts.length === 0}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {step === 1 ? 'Aperçu →' : 'Confirmer →'}
              </button>
            ) : (
              <button
                onClick={sendQuote}
                disabled={saving}
                className="px-6 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? 'Envoi...' : '📧 Envoyer le Devis'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PARTS ORDER SHIPPING MODAL
// ============================================
function PartsShippingModal({ order, onClose, notify, reload, profile }) {
  const [step, setStep] = useState(1); // 1: Address & UPS, 2: BL & Confirm
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upsLoading, setUpsLoading] = useState(false);
  
  const [address, setAddress] = useState({
    company_name: '',
    attention: '',
    address_line1: '',
    city: '',
    postal_code: '',
    country: 'France',
    phone: ''
  });
  
  const [shipmentData, setShipmentData] = useState({
    parcels: 1,
    weight: '1.0',
    trackingNumber: '',
    notes: ''
  });
  
  const [blNumber, setBlNumber] = useState('');
  const [upsLabel, setUpsLabel] = useState(null); // Base64 PDF label
  const [labelPrinted, setLabelPrinted] = useState(false);
  
  const quoteData = order.quote_data || {};
  const parts = quoteData.parts || [];
  
  // Load shipping address on mount
  useEffect(() => {
    const loadAddress = async () => {
      let addr = {
        company_name: order.companies?.name || 'Client',
        attention: '',
        address_line1: order.companies?.billing_address || '',
        city: order.companies?.billing_city || '',
        postal_code: order.companies?.billing_postal_code || '',
        country: 'France',
        phone: order.companies?.phone || ''
      };
      
      if (order.shipping_address_id) {
        const { data: shippingAddr } = await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('id', order.shipping_address_id)
          .single();
        
        if (shippingAddr) {
          addr = {
            company_name: shippingAddr.company_name || shippingAddr.label || order.companies?.name,
            attention: shippingAddr.attention || '',
            address_line1: shippingAddr.address_line1 || '',
            city: shippingAddr.city || '',
            postal_code: shippingAddr.postal_code || '',
            country: shippingAddr.country || 'France',
            phone: shippingAddr.phone || ''
          };
        }
      }
      
      setAddress(addr);
      
      // Generate BL number
      const poNum = order.request_number?.replace('PO-', '') || '00000';
      const date = new Date();
      const dateStr = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getFullYear()).slice(-2)}`;
      setBlNumber(`BL-${poNum}-${dateStr}`);
      
      setLoading(false);
    };
    
    loadAddress();
  }, [order]);
  
  // Create UPS Label via API
  const createUPSLabel = async () => {
    if (!address.address_line1 || !address.city || !address.postal_code) {
      notify('Veuillez compléter l\'adresse de livraison', 'error');
      return;
    }
    
    setUpsLoading(true);
    try {
      // Build packages array
      const packagesList = [];
      for (let p = 0; p < (shipmentData.parcels || 1); p++) {
        packagesList.push({
          weight: parseFloat(shipmentData.weight) || 1,
          length: 30,
          width: 30,
          height: 20,
          description: `${order.request_number} - Pièces - Colis ${p + 1}/${shipmentData.parcels || 1}`
        });
      }
      
      // Call UPS Edge Function
      const { data, error } = await supabase.functions.invoke('ups-shipping', {
        body: {
          action: 'create_shipment',
          shipTo: {
            name: address.attention || address.company_name || 'Customer',
            company: address.company_name || 'Customer',
            attentionName: address.attention || address.company_name || 'Customer',
            phone: address.phone || '0100000000',
            addressLine1: address.address_line1 || '',
            city: address.city || '',
            postalCode: address.postal_code || '',
            countryCode: address.country === 'France' ? 'FR' : 'FR'
          },
          packages: packagesList,
          serviceCode: '11', // UPS Standard
          description: `${order.request_number} - ${parts.length} pièce(s)`,
          isReturn: false
        }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'UPS API error');
      
      // Store tracking number and label
      setShipmentData(prev => ({ ...prev, trackingNumber: data.trackingNumber }));
      
      // Store label PDF data
      if (data.packages?.[0]?.labelData) {
        setUpsLabel(data.packages[0].labelData);
      }
      
      notify(`✅ Étiquette UPS créée: ${data.trackingNumber}`);
      setStep(2);
    } catch (err) {
      console.error('UPS Label creation error:', err);
      notify('❌ Erreur UPS: ' + (err.message || 'Erreur inconnue'), 'error');
    }
    setUpsLoading(false);
  };
  
  // Print UPS Label
  const printLabel = () => {
    if (upsLabel) {
      try {
        const byteCharacters = atob(upsLabel);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const w = window.open(url, '_blank');
        if (!w) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `UPS-Label-${shipmentData.trackingNumber}.pdf`;
          a.click();
        }
        
        setLabelPrinted(true);
        notify('📄 Étiquette UPS ouverte');
      } catch (err) {
        console.error('Error opening label:', err);
        notify('Erreur ouverture étiquette', 'error');
      }
    } else {
      // Fallback - generate simple label
      const w = window.open('', '_blank');
      if (!w) { notify('Popup bloqué', 'error'); return; }
      w.document.write(`<html><head><title>UPS Label</title><style>body{font-family:Arial;padding:20px}.label{border:3px solid #351C15;padding:20px;max-width:400px;margin:0 auto}.ups{font-size:32px;font-weight:bold;color:#351C15;text-align:center}.tracking{font-size:18px;font-family:monospace;text-align:center;margin:20px 0;padding:10px;background:#f5f5f5}.addr{margin:15px 0;padding:15px;border:1px solid #ddd}</style></head><body><div class="label"><div class="ups">UPS</div><div class="tracking">${shipmentData.trackingNumber}</div><div class="addr"><small>DESTINATAIRE:</small><br><strong>${address.company_name}</strong><br>${address.attention ? 'À l\'att. de: ' + address.attention + '<br>' : ''}${address.address_line1}<br>${address.postal_code} ${address.city}<br>${address.country}</div><div class="addr"><small>EXPÉDITEUR:</small><br><strong>LIGHTHOUSE FRANCE</strong><br>16 rue Paul Sejourne<br>94000 Créteil<br>France</div><p style="text-align:center;font-size:20px;font-weight:bold">${shipmentData.parcels} COLIS - ${shipmentData.weight} KG</p><p style="text-align:center;color:#666">${order.request_number}</p></div><script>window.print()</script></body></html>`);
      w.document.close();
      setLabelPrinted(true);
    }
  };
  
  // Print BL
  const printBL = () => {
    const employeeName = profile?.full_name || 'Lighthouse France';
    const w = window.open('', '_blank');
    if (!w) { notify('Popup bloqué', 'error'); return; }
    
    const frenchMonths = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const d = new Date();
    const dateStr = `${d.getDate()} ${frenchMonths[d.getMonth()]} ${d.getFullYear()}`;
    
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>BL - ${blNumber}</title>
  <style>
    @page { margin: 15mm; size: A4; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #333; padding: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #00A651; }
    .logo { font-size: 24px; font-weight: bold; color: #00A651; }
    .bl-title { text-align: right; }
    .bl-title h1 { font-size: 18px; color: #1a1a2e; }
    .bl-title .bl-num { font-family: monospace; font-size: 16px; color: #00A651; }
    .section { margin: 20px 0; }
    .section-title { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
    .client-info { background: #f9f9f9; padding: 15px; border-radius: 5px; }
    .client-info strong { font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #1a1a2e; color: white; padding: 10px; text-align: left; font-size: 11px; }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; }
    .signature { border: 1px dashed #ccc; padding: 30px; text-align: center; width: 200px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">LIGHTHOUSE France</div>
    <div class="bl-title">
      <h1>BON DE LIVRAISON</h1>
      <div class="bl-num">${blNumber}</div>
      <div style="font-size:11px;color:#666;margin-top:5px">${dateStr}</div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Destinataire</div>
    <div class="client-info">
      <strong>${address.company_name}</strong><br>
      ${address.attention ? 'À l\'attention de: ' + address.attention + '<br>' : ''}
      ${address.address_line1}<br>
      ${address.postal_code} ${address.city}<br>
      ${address.country}
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Pièces expédiées</div>
    <table>
      <thead>
        <tr>
          <th style="width:60px">Qté</th>
          <th style="width:120px">Référence</th>
          <th>Désignation</th>
        </tr>
      </thead>
      <tbody>
        ${parts.map(p => `
          <tr>
            <td>${p.quantity}</td>
            <td style="font-family:monospace;font-size:10px">${p.partNumber || '—'}</td>
            <td>${p.description}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <div class="section-title">Informations d'expédition</div>
    <div style="background:#f0f7ff;padding:15px;border-radius:5px">
      <strong>Transporteur:</strong> UPS<br>
      <strong>N° Suivi:</strong> ${shipmentData.trackingNumber}<br>
      <strong>Colis:</strong> ${shipmentData.parcels} • <strong>Poids:</strong> ${shipmentData.weight} kg
    </div>
  </div>
  
  <div class="footer">
    <div>
      <div class="section-title">Préparé par</div>
      <strong>${employeeName}</strong><br>
      Lighthouse France
    </div>
    <div class="signature">
      Signature client<br>
      <small style="color:#999">Date: ___/___/______</small>
    </div>
  </div>
  
  <script>window.print()</script>
</body>
</html>`);
    w.document.close();
  };
  
  // Generate BL and mark shipped
  const generateBLAndShip = async () => {
    if (!shipmentData.trackingNumber) {
      notify('Veuillez d\'abord créer l\'étiquette UPS', 'error');
      return;
    }
    
    setSaving(true);
    try {
      // Update order status to shipped
      const { error: updateError } = await supabase
        .from('service_requests')
        .update({
          status: 'shipped',
          bl_number: blNumber
        })
        .eq('id', order.id);
      
      if (updateError) throw updateError;
      
      notify(`✅ Commande expédiée - ${blNumber}`);
      reload();
      onClose();
    } catch (err) {
      notify(`Erreur: ${err.message}`, 'error');
    }
    setSaving(false);
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">📦 Expédition Pièces</h2>
            <p className="text-green-100">{order.request_number} • {order.companies?.name}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">&times;</button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-center gap-8">
            {[
              { num: 1, label: 'Adresse & UPS' },
              { num: 2, label: 'BL & Expédition' }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  step >= s.num ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={`ml-3 font-medium ${step >= s.num ? 'text-green-700' : 'text-gray-500'}`}>
                  {s.label}
                </span>
                {i < 1 && <div className={`w-16 h-1 mx-4 ${step > s.num ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Address & Create UPS Label */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Address */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-green-800 mb-3">📍 Adresse de livraison</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Société</label>
                    <input
                      type="text"
                      value={address.company_name}
                      onChange={e => setAddress({...address, company_name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">À l'attention de</label>
                    <input
                      type="text"
                      value={address.attention}
                      onChange={e => setAddress({...address, attention: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-600">Adresse</label>
                    <input
                      type="text"
                      value={address.address_line1}
                      onChange={e => setAddress({...address, address_line1: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Code postal</label>
                    <input
                      type="text"
                      value={address.postal_code}
                      onChange={e => setAddress({...address, postal_code: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Ville</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={e => setAddress({...address, city: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Téléphone</label>
                    <input
                      type="text"
                      value={address.phone}
                      onChange={e => setAddress({...address, phone: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="01 23 45 67 89"
                    />
                  </div>
                </div>
              </div>
              
              {/* Shipment Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-bold text-amber-800 mb-3">📦 Informations colis</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Nombre de colis</label>
                    <input
                      type="number"
                      min="1"
                      value={shipmentData.parcels}
                      onChange={e => setShipmentData({...shipmentData, parcels: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Poids total (kg)</label>
                    <input
                      type="text"
                      value={shipmentData.weight}
                      onChange={e => setShipmentData({...shipmentData, weight: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
              
              {/* Parts Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-700 mb-3">🔩 Pièces à expédier ({parts.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {parts.map((part, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white rounded p-2 border">
                      <div>
                        <span className="font-mono text-sm text-amber-700">{part.partNumber || '—'}</span>
                        <span className="ml-2 text-gray-600">{part.description}</span>
                      </div>
                      <span className="font-bold">x{part.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Print Label, Print BL, Confirm */}
          {step === 2 && (
            <div className="space-y-6">
              {/* UPS Label */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-amber-800">🏷️ Étiquette UPS</h3>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    ✓ {shipmentData.trackingNumber}
                  </span>
                </div>
                <button
                  onClick={printLabel}
                  className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                    labelPrinted 
                      ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {labelPrinted ? '✓ Étiquette imprimée' : '🖨️ Imprimer Étiquette UPS'}
                </button>
              </div>
              
              {/* BL */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-blue-800">📄 Bon de Livraison</h3>
                  <span className="font-mono text-blue-700">{blNumber}</span>
                </div>
                <div className="mb-3">
                  <label className="text-sm text-gray-600">Notes (optionnel)</label>
                  <textarea
                    value={shipmentData.notes}
                    onChange={e => setShipmentData({...shipmentData, notes: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                    placeholder="Notes pour le BL..."
                  />
                </div>
                <button
                  onClick={printBL}
                  className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  🖨️ Imprimer Bon de Livraison
                </button>
              </div>
              
              {/* Summary */}
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <h3 className="font-bold text-green-800 mb-3">📋 Récapitulatif</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Commande</p>
                    <p className="font-bold">{order.request_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Client</p>
                    <p className="font-bold">{order.companies?.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Suivi UPS</p>
                    <p className="font-mono font-bold text-amber-700">{shipmentData.trackingNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">BL</p>
                    <p className="font-mono font-bold">{blNumber}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between rounded-b-xl">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
          >
            {step > 1 ? '← Retour' : 'Annuler'}
          </button>
          
          {step === 1 && (
            <button
              onClick={createUPSLabel}
              disabled={upsLoading}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {upsLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Création étiquette...
                </>
              ) : (
                <>🏷️ Créer Étiquette UPS</>
              )}
            </button>
          )}
          
          {step === 2 && (
            <button
              onClick={generateBLAndShip}
              disabled={saving}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50"
            >
              {saving ? 'Envoi...' : '✅ Confirmer Expédition'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================
// SHIPPING MODAL - Full shipping workflow v26
// ============================================
function ShippingModal({ rma, devices, onClose, notify, reload, profile, businessSettings }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [generatedBLs, setGeneratedBLs] = useState([]);
  const [labelsPrinted, setLabelsPrinted] = useState({});
  const [blsPrinted, setBlsPrinted] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Device selection for partial shipments
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());
  
  // Categorize devices by status
  const readyDevices = devices.filter(d => 
    ['ready_to_ship', 'ready', 'prêt', 'calibrated', 'repaired', 'qc_passed'].includes(d.status?.toLowerCase()) || d.qc_complete
  );
  const notReadyDevices = devices.filter(d => 
    !['ready_to_ship', 'ready', 'prêt', 'calibrated', 'repaired', 'qc_passed', 'shipped'].includes(d.status?.toLowerCase()) && !d.qc_complete
  );
  const alreadyShippedDevices = devices.filter(d => d.status === 'shipped');
  
  // Toggle device selection
  const toggleDevice = (deviceId) => {
    setSelectedDeviceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  };
  
  // Select/deselect all ready devices
  const toggleAllReady = () => {
    if (selectedDeviceIds.size === readyDevices.length) {
      setSelectedDeviceIds(new Set());
    } else {
      setSelectedDeviceIds(new Set(readyDevices.map(d => d.id)));
    }
  };
  
  // Fetch shipping address on mount and initialize shipments
  useEffect(() => {
    const initShipments = async () => {
      let address = {
        company_name: rma.companies?.name || 'Client',
        attention: '',
        address_line1: rma.companies?.billing_address || '',
        city: rma.companies?.billing_city || '',
        postal_code: rma.companies?.billing_postal_code || '',
        country: 'France',
        phone: ''
      };
      
      // If RMA has a shipping_address_id, fetch it
      if (rma.shipping_address_id) {
        const { data: shippingAddr } = await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('id', rma.shipping_address_id)
          .single();
        
        if (shippingAddr) {
          address = {
            company_name: shippingAddr.company_name || shippingAddr.label || rma.companies?.name,
            attention: shippingAddr.attention || '',
            address_line1: shippingAddr.address_line1 || '',
            city: shippingAddr.city || '',
            postal_code: shippingAddr.postal_code || '',
            country: shippingAddr.country || 'France',
            phone: shippingAddr.phone || ''
          };
        }
      }
      
      setShipments([{
        address,
        devices: devices,
        parcels: rma.parcels_count || 1,
        weight: '2.0',
        trackingNumber: '',
        notes: ''
      }]);
      
      // Auto-select all ready devices (or all if none have specific ready status)
      const ready = devices.filter(d => 
        ['ready_to_ship', 'ready', 'prêt', 'calibrated', 'repaired', 'qc_passed'].includes(d.status?.toLowerCase()) || d.qc_complete
      );
      if (ready.length > 0) {
        setSelectedDeviceIds(new Set(ready.map(d => d.id)));
      } else {
        // If no devices have ready status, select all non-shipped devices
        setSelectedDeviceIds(new Set(devices.filter(d => d.status !== 'shipped').map(d => d.id)));
      }
      
      setLoading(false);
    };
    
    if (devices.length > 0) {
      initShipments();
    } else {
      setLoading(false);
    }
  }, []);
  
  const updateAddress = (index, field, value) => {
    setShipments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], address: { ...updated[index].address, [field]: value }};
      return updated;
    });
  };
  
  const updateShipment = (index, field, value) => {
    setShipments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  
  const generateBLNumber = (index) => {
    const rmaNum = rma.request_number?.replace('FR-', '') || '00000';
    const date = new Date();
    const dateStr = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getFullYear()).slice(-2)}`;
    return `BL-${rmaNum}-${dateStr}${shipments.length > 1 ? `-${index + 1}` : ''}`;
  };
  
  // State for UPS API
  const [upsLoading, setUpsLoading] = useState(false);
  const [upsLabels, setUpsLabels] = useState({}); // Store PDF labels by "shipmentIndex-packageIndex"
  
  // Create REAL UPS Labels via Edge Function
  const createUPSLabels = async () => {
    // First, validate that at least one device is selected
    if (selectedDeviceIds.size === 0) {
      notify('Veuillez sélectionner au moins un appareil à expédier', 'error');
      return;
    }
    
    // Update shipment with only selected devices
    const selectedDevicesList = devices.filter(d => selectedDeviceIds.has(d.id));
    const updatedShipmentsWithDevices = shipments.map((s, idx) => ({
      ...s,
      devices: selectedDevicesList
    }));
    setShipments(updatedShipmentsWithDevices);
    
    setUpsLoading(true);
    try {
      const updatedShipments = [...updatedShipmentsWithDevices];
      const newLabels = {};
      
      for (let i = 0; i < updatedShipments.length; i++) {
        const s = updatedShipments[i];
        const address = s.address || {};
        
        // Build packages array - one per parcel count
        const packagesList = [];
        for (let p = 0; p < (s.parcels || 1); p++) {
          packagesList.push({
            weight: parseFloat(s.weight) || 2,
            length: 30,
            width: 30,
            height: 30,
            description: `RMA ${rma.request_number} - Colis ${p + 1}/${s.parcels || 1}`
          });
        }
        
        // Call UPS Edge Function to create shipment with multiple packages
        const { data, error } = await supabase.functions.invoke('ups-shipping', {
          body: {
            action: 'create_shipment',
            shipTo: {
              name: address.attention || address.company_name || 'Customer',
              company: address.company_name || 'Customer',
              attentionName: address.attention || address.company_name || 'Customer',
              phone: address.phone || '0100000000',
              addressLine1: address.address_line1 || '',
              city: address.city || '',
              postalCode: address.postal_code || '',
              countryCode: address.country === 'France' ? 'FR' : (address.country_code || 'FR')
            },
            packages: packagesList,
            serviceCode: '11', // UPS Standard
            description: `RMA ${rma.request_number} - ${selectedDevicesList.length} appareil(s)`,
            isReturn: false
          }
        });
        
        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'UPS API error');
        
        // Update shipment with real tracking number
        updatedShipments[i] = {
          ...s,
          trackingNumber: data.trackingNumber,
          upsResponse: data,
          packageLabels: data.packages || [] // Store all package labels
        };
        
        // Store label PDF data for each package
        if (data.packages) {
          data.packages.forEach((pkg, pkgIndex) => {
            if (pkg.labelData) {
              newLabels[`${i}-${pkgIndex}`] = pkg.labelData;
            }
          });
          // Also store first label as main label for backward compatibility
          if (data.packages[0]?.labelData) {
            newLabels[i] = data.packages[0].labelData;
          }
        }
        
        notify(`✅ ${data.packages?.length || 1} étiquette(s) UPS créée(s): ${data.trackingNumber}`);
      }
      
      setUpsLabels(prev => ({ ...prev, ...newLabels }));
      setShipments(updatedShipments);
      setStep(2);
    } catch (err) {
      console.error('UPS Label creation error:', err);
      notify('❌ Erreur UPS: ' + (err.message || 'Erreur inconnue'), 'error');
    }
    setUpsLoading(false);
  };
  
  // French month names for written date
  const frenchMonths = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const getFrenchDate = () => {
    const d = new Date();
    return `${d.getDate()} ${frenchMonths[d.getMonth()]} ${d.getFullYear()}`;
  };
  
  const generateBLContent = (shipment, index) => ({
    blNumber: generateBLNumber(index),
    date: getFrenchDate(),
    rmaNumber: rma.request_number,
    client: { name: shipment.address.company_name, attention: shipment.address.attention, street: shipment.address.address_line1, city: `${shipment.address.postal_code} ${shipment.address.city}`, country: shipment.address.country || 'France' },
    devices: shipment.devices.map(d => ({ model: d.model_name, serial: d.serial_number, service: d.service_type === 'repair' ? 'Réparation' : 'Étalonnage' })),
    shipping: { carrier: 'UPS', tracking: shipment.trackingNumber, parcels: shipment.parcels, weight: shipment.weight }
  });
  
  const printLabel = (index) => {
    const s = shipments[index];
    const labelData = upsLabels[index];
    
    if (labelData) {
      // Download real UPS PDF label
      try {
        const byteCharacters = atob(labelData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Open in new tab for printing
        const w = window.open(url, '_blank');
        if (!w) {
          // Fallback: download the file
          const a = document.createElement('a');
          a.href = url;
          a.download = `UPS-Label-${s.trackingNumber}.pdf`;
          a.click();
        }
        
        setLabelsPrinted(prev => ({ ...prev, [index]: true }));
        notify('📄 Étiquette UPS ouverte');
      } catch (err) {
        console.error('Error opening label:', err);
        notify('Erreur ouverture étiquette', 'error');
      }
    } else {
      // Fallback to generated label if no real PDF
      const w = window.open('', '_blank');
      if (!w) { notify('Popup bloqué', 'error'); return; }
      w.document.write(`<html><head><title>UPS Label</title><style>body{font-family:Arial;padding:20px}.label{border:3px solid #351C15;padding:20px;max-width:400px;margin:0 auto}.ups{font-size:32px;font-weight:bold;color:#351C15;text-align:center}.tracking{font-size:18px;font-family:monospace;text-align:center;margin:20px 0;padding:10px;background:#f5f5f5}.addr{margin:15px 0;padding:15px;border:1px solid #ddd}</style></head><body><div class="label"><div class="ups">UPS</div><div class="tracking">${s.trackingNumber}</div><div class="addr"><small>DESTINATAIRE:</small><br><strong>${s.address.company_name}</strong><br>${s.address.attention ? 'À l att. de: ' + s.address.attention + '<br>' : ''}${s.address.address_line1}<br>${s.address.postal_code} ${s.address.city}<br>${s.address.country}</div><div class="addr"><small>EXPÉDITEUR:</small><br><strong>LIGHTHOUSE FRANCE</strong><br>16 rue Paul Sejourne<br>94000 Créteil<br>France</div><p style="text-align:center;font-size:20px;font-weight:bold">${s.parcels} COLIS - ${s.weight} KG</p><p style="text-align:center;color:#666">${rma.request_number}</p></div><script>window.print()</script></body></html>`);
      w.document.close();
      setLabelsPrinted(prev => ({ ...prev, [index]: true }));
    }
  };
  
  const printBL = (index) => {
    const s = shipments[index], bl = generateBLContent(s, index);
    const employeeName = profile?.full_name || 'Lighthouse France';
    const biz = businessSettings || {};
    const w = window.open('', '_blank');
    if (!w) { notify('Popup bloqué', 'error'); return; }
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>BL - ${bl.blNumber}</title>
  <style>
    @page { 
      margin: 15mm; 
      size: A4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #333; }
    .page { 
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 15px 25px;
      position: relative;
    }
    
    /* Watermark - on top of everything */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.12;
      pointer-events: none;
      z-index: 999;
    }
    .watermark img { width: 500px; height: auto; }
    
    .content { flex: 1 0 auto; }
    .header { margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid #333; }
    .header img { height: 50px; }
    .title-section { text-align: center; margin: 20px 0; }
    .title { font-size: 20pt; font-weight: bold; color: #333; margin: 0; }
    .bl-number { font-size: 14pt; color: #333; font-weight: bold; margin-top: 8px; }
    .info-row { display: flex; justify-content: space-between; margin: 12px 0; }
    .client-box { background: rgba(248,249,250,0.85); border: 1px solid #ddd; padding: 15px; margin: 12px 0; }
    .client-label { font-size: 9pt; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
    .client-name { font-size: 12pt; font-weight: bold; margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: rgba(51,51,51,0.35); color: #333; padding: 10px 12px; text-align: left; font-size: 10pt; font-weight: bold; border-bottom: 2px solid #333; }
    td { padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 10pt; background: rgba(255,255,255,0.9); }
    tr:nth-child(even) td { background: rgba(249,249,249,0.9); }
    .shipping-section { margin: 15px 0; }
    .shipping-title { font-weight: bold; font-size: 11pt; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
    .shipping-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .shipping-item { display: flex; padding: 6px 0; }
    .shipping-label { color: #666; width: 130px; }
    .shipping-value { font-weight: 600; }
    .prepared-by { font-size: 10pt; margin-top: 12px; color: #666; }
    .prepared-by strong { color: #333; }
    
    .footer-section { 
      flex-shrink: 0;
      margin-top: auto;
      padding-top: 15px; 
      border-top: 2px solid #333;
    }
    .footer-content { display: flex; align-items: center; justify-content: center; gap: 30px; }
    .footer-logo img { height: 100px; }
    .footer-info { font-size: 8pt; color: #555; text-align: center; line-height: 1.8; }
    .footer-info strong { color: #333; font-size: 9pt; }
    
    @media print { 
      @page { margin: 15mm; }
      .page { min-height: 100%; padding: 10px 20px; }
      .watermark { position: fixed; }
      /* Make backgrounds print */
      th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body onload="window.print()">
  <div class="page">
    <!-- Watermark - shows through everything -->
    <div class="watermark">
      <img src="/images/logos/Lighthouse-Square-logo.png" alt="" onerror="this.parentElement.innerHTML='<div style=\\'font-size:150px;font-weight:bold;color:#000;opacity:0.5\\'>LWS</div>'">
    </div>
    
    <div class="content">
      <div class="header">
        <img src="/images/logos/lighthouse-logo.png" alt="Lighthouse" onerror="this.outerHTML='<div style=\\'font-size:24px;font-weight:bold;color:#333\\'>LIGHTHOUSE<div style=\\'font-size:10px;color:#666\\'>FRANCE</div></div>'">
      </div>

      <div class="title-section">
        <h1 class="title">BON DE LIVRAISON</h1>
        <div class="bl-number">${bl.blNumber}</div>
      </div>

      <div class="info-row">
        <div><span style="color:#666">${biz.city || 'Créteil'}, le</span> <strong>${bl.date}</strong></div>
        <div><span style="color:#666">RMA:</span> <strong>${bl.rmaNumber}</strong></div>
      </div>

      <div class="client-box">
        <div class="client-label">Destinataire</div>
        <div class="client-name">${bl.client.name}</div>
        ${bl.client.attention ? `<div>À l'attention de: <strong>${bl.client.attention}</strong></div>` : ''}
        <div>${bl.client.street}</div>
        <div>${bl.client.city}</div>
        <div>${bl.client.country}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:50px">Qté</th>
            <th>Désignation</th>
            <th style="width:120px">N° Série</th>
            <th style="width:100px">Service</th>
          </tr>
        </thead>
        <tbody>
          ${bl.devices.map(d => `
            <tr>
              <td style="text-align:center;font-weight:600">1</td>
              <td>Compteur de particules LIGHTHOUSE ${d.model}</td>
              <td style="font-family:monospace">${d.serial}</td>
              <td>${d.service}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="shipping-section">
        <div class="shipping-title">Informations d'expédition</div>
        <div class="shipping-grid">
          <div class="shipping-item"><span class="shipping-label">Transporteur:</span><span class="shipping-value">${bl.shipping.carrier}</span></div>
          <div class="shipping-item"><span class="shipping-label">N° de suivi:</span><span class="shipping-value" style="font-family:monospace">${bl.shipping.tracking}</span></div>
          <div class="shipping-item"><span class="shipping-label">Nombre de colis:</span><span class="shipping-value">${bl.shipping.parcels}</span></div>
          <div class="shipping-item"><span class="shipping-label">Poids:</span><span class="shipping-value">${bl.shipping.weight} kg</span></div>
        </div>
      </div>

      <div class="prepared-by">
        Préparé par: <strong>${employeeName}</strong>
      </div>
    </div>

    <div class="footer-section">
      <div class="footer-content">
        <div class="footer-logo">
          <img src="/images/logos/capcert-logo.png" alt="CAPCERT" onerror="this.outerHTML='<div style=\\'font-size:18px;color:#333;border:2px solid #333;padding:18px 24px;border-radius:6px;text-align:center\\'><strong>CAPCERT</strong><br>ISO 9001</div>'">
        </div>
        <div class="footer-info">
          <strong>${biz.company_name || 'Lighthouse France SAS'}</strong> au capital de ${biz.capital || '10 000'} €<br>
          ${biz.address || '16 rue Paul Séjourné'}, ${biz.postal_code || '94000'} ${biz.city || 'CRÉTEIL'} | Tél. ${biz.phone || '01 43 77 28 07'}<br>
          SIRET ${biz.siret || '50178134800013'} | TVA ${biz.tva || 'FR 86501781348'}<br>
          ${biz.email || 'France@golighthouse.com'} | ${biz.website || 'www.golighthouse.fr'}
        </div>
      </div>
    </div>
  </div>

</body>
</html>`);
    w.document.close();
    setBlsPrinted(prev => ({ ...prev, [index]: true }));
  };
  
  // Save shipping documents (BL, UPS labels) but don't mark as shipped yet
  const saveShippingDocs = async () => {
    setSaving(true);
    try {
      const blData = [];
      const employeeName = profile?.full_name || 'Lighthouse France';
      
      for (let i = 0; i < shipments.length; i++) {
        const s = shipments[i], bl = generateBLContent(s, i);
        blData.push(bl);
        
        // Generate BL PDF by capturing the visible preview element
        let blUrl = null;
        try {
          // Load html2canvas if needed
          if (!window.html2canvas) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }
          
          // Capture the visible BL preview element
          const element = document.getElementById(`bl-preview-${i}`);
          if (element) {
            const canvas = await window.html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const jsPDF = await loadJsPDF();
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const pdfWidth = 210;
            const imgRatio = canvas.height / canvas.width;
            const imgHeight = pdfWidth * imgRatio;
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight, 297));
            
            const blPdfBlob = pdf.output('blob');
            const safeBLNumber = (bl.blNumber || 'BL').replace(/[^a-zA-Z0-9-_]/g, '');
            const blFileName = `${rma.request_number}_BL_${safeBLNumber}_${Date.now()}.pdf`;
            blUrl = await uploadPDFToStorage(blPdfBlob, `shipping/${rma.request_number}`, blFileName);
          }
        } catch (pdfErr) {
          console.error('BL PDF generation error:', pdfErr);
        }
        
        // Generate UPS Label PDF - use REAL label from UPS API if available
        let upsLabelUrl = null;
        try {
          console.log('Saving UPS label for shipment:', i, s.trackingNumber);
          
          // Check if we have real UPS label data
          const realLabelData = upsLabels[i];
          
          if (realLabelData) {
            // Convert base64 to blob
            const byteCharacters = atob(realLabelData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let j = 0; j < byteCharacters.length; j++) {
              byteNumbers[j] = byteCharacters.charCodeAt(j);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const upsPdfBlob = new Blob([byteArray], { type: 'application/pdf' });
            
            console.log('Real UPS PDF blob size:', upsPdfBlob?.size);
            const safeTracking = (s.trackingNumber || String(i)).replace(/[^a-zA-Z0-9-_]/g, '');
            const upsFileName = `${rma.request_number}_UPS_${safeTracking}_${Date.now()}.pdf`;
            upsLabelUrl = await uploadPDFToStorage(upsPdfBlob, `shipping/${rma.request_number}`, upsFileName);
            console.log('Real UPS label uploaded:', upsLabelUrl);
          } else {
            // Fallback to generated label if no real one
            console.log('No real UPS label, generating fake one');
            const upsPdfBlob = await generateUPSLabelPDF(rma, s);
            console.log('Fake UPS PDF blob generated:', upsPdfBlob?.size);
            const safeTracking = (s.trackingNumber || String(i)).replace(/[^a-zA-Z0-9-_]/g, '');
            const upsFileName = `${rma.request_number}_UPS_${safeTracking}_${Date.now()}.pdf`;
            upsLabelUrl = await uploadPDFToStorage(upsPdfBlob, `shipping/${rma.request_number}`, upsFileName);
            console.log('Fake UPS label uploaded:', upsLabelUrl);
          }
        } catch (pdfErr) {
          console.error('UPS Label PDF save error:', pdfErr);
        }
        
        // Update devices with docs but keep ready_to_ship status
        for (const d of s.devices) {
          const updateData = { 
            tracking_number: s.trackingNumber || null, 
            bl_number: bl.blNumber
          };
          
          // Add PDF URLs if generated
          if (blUrl) updateData.bl_url = blUrl;
          if (upsLabelUrl) updateData.ups_label_url = upsLabelUrl;
          
          await supabase.from('request_devices').update(updateData).eq('id', d.id);
        }
      }
      
      setGeneratedBLs(blData);
      setStep(4); // Move to final step
      notify('✅ Documents d\'expédition enregistrés! Prêt pour scan UPS.');
      reload();
    } catch (err) { 
      notify('Erreur: ' + (err.message || 'Erreur'), 'error'); 
    }
    setSaving(false);
  };
  
  // Mark as shipped - closes the RMA (will be triggered by barcode scan later)
  const markAsShipped = async () => {
    setSaving(true);
    try {
      // Update all devices to shipped
      for (const device of devices) {
        await supabase.from('request_devices').update({ 
          status: 'shipped', 
          shipped_at: new Date().toISOString()
        }).eq('id', device.id);
      }
      
      // Update RMA to shipped (closes it)
      await supabase.from('service_requests').update({ 
        status: 'shipped', 
        shipped_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      }).eq('id', rma.id);
      
      notify('🚚 RMA marqué comme expédié et fermé!');
      reload();
      onBack(); // Go back to dashboard since RMA is now closed
    } catch (err) { 
      notify('Erreur: ' + (err.message || 'Erreur'), 'error'); 
    }
    setSaving(false);
  };
  
  const stepLabels = ['Vérification', 'Étiquette UPS', 'Bon de Livraison', 'Expédier'];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">🚚 Expédition - {rma.request_number}</h2>
              <p className="text-green-100 text-sm">{devices.length} appareil(s)</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">&times;</button>
          </div>
          <div className="flex items-center gap-1 mt-4">
            {stepLabels.map((label, idx) => (
              <div key={idx} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step > idx + 1 ? 'bg-white text-green-600' : step === idx + 1 ? 'bg-white text-green-600' : 'bg-green-500 text-green-200'}`}>
                  {step > idx + 1 ? '✓' : idx + 1}
                </div>
                <span className={`ml-2 text-xs hidden sm:inline ${step === idx + 1 ? 'text-white font-medium' : 'text-green-200'}`}>{label}</span>
                {idx < 3 && <div className="flex-1 h-0.5 bg-green-500 mx-2" />}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-500">Chargement des informations...</p>
              </div>
            </div>
          )}
          
          {/* Step 1: Review */}
          {!loading && step === 1 && shipments.map((shipment, idx) => (
            <div key={idx} className="space-y-6">
              {/* Address Section */}
              <div className="bg-white border-2 border-gray-200 rounded-xl">
                <div className="bg-amber-50 px-4 py-3 border-b">
                  <h3 className="font-bold text-amber-800">📍 Adresse de livraison</h3>
                </div>
                <div className="p-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Société *</label>
                    <input type="text" value={shipment.address.company_name} onChange={e => updateAddress(idx, 'company_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">À l'attention de</label>
                    <input type="text" value={shipment.address.attention} onChange={e => updateAddress(idx, 'attention', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Nom du contact" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                    <input type="text" value={shipment.address.address_line1} onChange={e => updateAddress(idx, 'address_line1', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code postal *</label>
                    <input type="text" value={shipment.address.postal_code} onChange={e => updateAddress(idx, 'postal_code', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                    <input type="text" value={shipment.address.city} onChange={e => updateAddress(idx, 'city', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                    <input type="text" value={shipment.address.country} onChange={e => updateAddress(idx, 'country', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input type="text" value={shipment.address.phone || ''} onChange={e => updateAddress(idx, 'phone', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="+33..." />
                  </div>
                </div>
              </div>
              
              {/* Already Shipped Info */}
              {alreadyShippedDevices.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✈️</span>
                    <div>
                      <h4 className="font-bold text-blue-800">Appareils déjà expédiés</h4>
                      <div className="text-sm text-blue-700 mt-1">
                        {alreadyShippedDevices.map(d => (
                          <div key={d.id} className="flex items-center gap-2">
                            <span>• {d.model_name} - {d.serial_number}</span>
                            {d.tracking_number && <span className="text-blue-500 font-mono text-xs">{d.tracking_number}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Not Ready Warning */}
              {notReadyDevices.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-bold text-amber-800">Appareils non prêts</h4>
                      <p className="text-sm text-amber-700 mb-2">Ces appareils ne sont pas marqués "prêt" :</p>
                      <div className="text-sm text-amber-700">
                        {notReadyDevices.map(d => (
                          <div key={d.id} className="flex items-center gap-2">
                            <span>• {d.model_name} - {d.serial_number}</span>
                            <span className="px-2 py-0.5 bg-amber-200 rounded text-xs">{d.status || 'En cours'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Devices Selection Section */}
              <div className="bg-white border-2 border-gray-200 rounded-xl">
                <div className="bg-blue-50 px-4 py-3 border-b flex justify-between items-center">
                  <h3 className="font-bold text-blue-800">📦 Sélectionner les appareils à expédier</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-blue-600">{selectedDeviceIds.size} / {devices.filter(d => d.status !== 'shipped').length} sélectionné(s)</span>
                    {devices.filter(d => d.status !== 'shipped').length > 1 && (
                      <button 
                        onClick={toggleAllReady}
                        className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                      >
                        {selectedDeviceIds.size === readyDevices.length && readyDevices.length > 0 ? 'Désélectionner' : 'Tout sélectionner'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  {devices.filter(d => d.status !== 'shipped').length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Tous les appareils ont déjà été expédiés</p>
                  ) : (
                    <div className="space-y-2">
                      {devices.filter(d => d.status !== 'shipped').map(device => {
                        const isReady = ['ready_to_ship', 'ready', 'prêt', 'calibrated', 'repaired', 'qc_passed'].includes(device.status?.toLowerCase()) || device.qc_complete;
                        return (
                          <label 
                            key={device.id} 
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedDeviceIds.has(device.id) 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDeviceIds.has(device.id)}
                              onChange={() => toggleDevice(device.id)}
                              className="w-5 h-5 text-green-600 rounded"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{device.model_name}</div>
                              <div className="text-sm text-gray-500 font-mono">{device.serial_number}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${device.service_type === 'repair' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {device.service_type === 'repair' ? '🔧 Réparation' : '🔬 Étalonnage'}
                            </span>
                            {device.calibration_certificate_url && (
                              <a href={device.calibration_certificate_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm" onClick={e => e.stopPropagation()}>📄</a>
                            )}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${isReady ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {isReady ? '✓ Prêt' : device.status || 'En cours'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Shipping Details */}
              <div className="bg-white border-2 border-gray-200 rounded-xl">
                <div className="bg-green-50 px-4 py-3 border-b flex justify-between items-center">
                  <h3 className="font-bold text-green-800">🚚 Détails d'expédition</h3>
                  <span className="text-xs text-green-600">💡 UPS crée 1 étiquette par colis</span>
                </div>
                <div className="p-4 grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de colis</label>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateShipment(idx, 'parcels', Math.max(1, (shipment.parcels || 1) - 1))}
                        className="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-lg"
                      >-</button>
                      <input 
                        type="number" 
                        min="1" 
                        value={shipment.parcels} 
                        onChange={e => updateShipment(idx, 'parcels', parseInt(e.target.value) || 1)} 
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-lg" 
                      />
                      <button 
                        onClick={() => updateShipment(idx, 'parcels', (shipment.parcels || 1) + 1)}
                        className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg"
                      >+</button>
                    </div>
                    {shipment.parcels > 1 && (
                      <p className="text-xs text-green-600 mt-1">📦 {shipment.parcels} étiquettes seront créées</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Poids total (kg)</label>
                    <input type="text" value={shipment.weight} onChange={e => updateShipment(idx, 'weight', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BL #</label>
                    <input type="text" value={generateBLNumber(idx)} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 font-mono" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes</label>
                    <textarea value={shipment.notes || ''} onChange={e => updateShipment(idx, 'notes', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="Notes pour l'expédition..." />
                  </div>
                </div>
              </div>
              
              {/* RMA Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-700 mb-2">📋 Récapitulatif RMA</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-gray-500">RMA:</span> <span className="font-mono font-bold text-[#00A651]">{rma.request_number}</span></div>
                  <div><span className="text-gray-500">Client:</span> <span className="font-medium">{rma.companies?.name}</span></div>
                  <div><span className="text-gray-500">Appareils:</span> <span className="font-medium">{devices.length}</span></div>
                  <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date().toLocaleDateString('fr-FR')}</span></div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Step 2: UPS Labels */}
          {step === 2 && shipments.map((shipment, idx) => (
            <div key={idx} className="bg-white border-2 rounded-xl p-6 mb-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-lg">Expédition #{idx + 1}</h3>
                  <p className="text-gray-500">{shipment.address.postal_code} {shipment.address.city}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-amber-600">{shipment.trackingNumber}</p>
                  <a href={`https://www.ups.com/track?tracknum=${shipment.trackingNumber}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">Suivre →</a>
                </div>
              </div>
              
              {/* Show all package labels */}
              <div className="space-y-4">
                {(shipment.packageLabels || [{ trackingNumber: shipment.trackingNumber }]).map((pkg, pkgIdx) => (
                  <div key={pkgIdx} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-bold text-[#351C15]">UPS</div>
                        <div className="font-mono text-sm">{pkg.trackingNumber || shipment.trackingNumber}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Colis {pkgIdx + 1} / {shipment.parcels || 1}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={labelsPrinted[`${idx}-${pkgIdx}`] ? 'text-green-600 font-medium text-sm' : 'text-gray-400 text-sm'}>
                          {labelsPrinted[`${idx}-${pkgIdx}`] ? '✓ Imprimé' : ''}
                        </span>
                        <button 
                          onClick={() => {
                            const labelData = upsLabels[`${idx}-${pkgIdx}`] || upsLabels[idx];
                            if (labelData) {
                              const byteCharacters = atob(labelData);
                              const byteNumbers = new Array(byteCharacters.length);
                              for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                              }
                              const byteArray = new Uint8Array(byteNumbers);
                              const blob = new Blob([byteArray], { type: 'application/pdf' });
                              const url = URL.createObjectURL(blob);
                              window.open(url, '_blank');
                              setLabelsPrinted(prev => ({ ...prev, [`${idx}-${pkgIdx}`]: true }));
                            } else {
                              printLabel(idx);
                            }
                          }} 
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm"
                        >
                          🖨️ Imprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Summary */}
              <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm text-gray-600">
                <span>{shipment.address.company_name} • {shipment.parcels || 1} colis • {shipment.weight} kg</span>
                <span className="text-gray-400">{rma.request_number}</span>
              </div>
            </div>
          ))}
          
          {/* Step 3: BL Preview */}
          {step === 3 && shipments.map((shipment, idx) => {
            const bl = generateBLContent(shipment, idx);
            const employeeName = profile?.full_name || 'Lighthouse France';
            const biz = businessSettings || {};
            return (
              <div key={idx} className="mb-4">
                {/* Controls bar */}
                <div className="bg-gray-100 px-4 py-3 rounded-t-xl flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{bl.blNumber}</h3>
                    <p className="text-sm text-gray-500">{bl.devices.length} appareil(s)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={blsPrinted[idx] ? 'text-green-600 font-medium' : 'text-gray-400'}>{blsPrinted[idx] ? '✓ Imprimé' : ''}</span>
                    <button onClick={() => setStep(1)} className="px-3 py-1 bg-white hover:bg-gray-50 border rounded text-sm">✏️ Modifier</button>
                    <button onClick={() => printBL(idx)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">🖨️ Imprimer BL</button>
                  </div>
                </div>
                
                {/* Clean PDF Preview with Watermark */}
                <div className="bg-white border-2 border-t-0 rounded-b-xl overflow-hidden shadow-lg">
                  <div id={`bl-preview-${idx}`} style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', color: '#333', padding: '25px 30px', maxWidth: '210mm', margin: '0 auto', background: 'white', minHeight: '270mm', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {/* Watermark - on top of everything */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.12, pointerEvents: 'none', zIndex: 999 }}>
                      <img src="/images/logos/Lighthouse-Square-logo.png" alt="" style={{ width: '500px', height: 'auto' }} onError={(e) => { e.target.outerHTML = '<div style="font-size:150px;font-weight:bold;color:#000">LWS</div>'; }} />
                    </div>
                    
                    {/* Content area */}
                    <div style={{ flex: '1 0 auto' }}>
                      {/* Header */}
                      <div style={{ marginBottom: '15px', paddingBottom: '12px', borderBottom: '2px solid #333' }}>
                        <img src="/images/logos/lighthouse-logo.png" alt="Lighthouse" style={{ height: '50px' }} onError={(e) => { e.target.outerHTML = '<div style="font-size:24px;font-weight:bold;color:#333">LIGHTHOUSE<div style="font-size:10px;color:#666">FRANCE</div></div>'; }} />
                      </div>

                      {/* Title */}
                      <div style={{ textAlign: 'center', margin: '20px 0' }}>
                        <div style={{ fontSize: '20pt', fontWeight: 'bold', color: '#333' }}>BON DE LIVRAISON</div>
                        <div style={{ fontSize: '14pt', color: '#333', fontWeight: 'bold', marginTop: '8px' }}>{bl.blNumber}</div>
                      </div>

                      {/* Info row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0' }}>
                        <div><span style={{ color: '#666' }}>{biz.city || 'Créteil'}, le</span> <strong>{bl.date}</strong></div>
                        <div><span style={{ color: '#666' }}>RMA:</span> <strong>{bl.rmaNumber}</strong></div>
                      </div>

                      {/* Client box - semi-transparent */}
                      <div style={{ background: 'rgba(248,249,250,0.85)', border: '1px solid #ddd', padding: '15px', margin: '12px 0' }}>
                        <div style={{ fontSize: '9pt', color: '#666', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Destinataire</div>
                        <div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '5px' }}>{bl.client.name}</div>
                        {bl.client.attention && <div>À l'attention de: <strong>{bl.client.attention}</strong></div>}
                        <div>{bl.client.street}</div>
                        <div>{bl.client.city}</div>
                        <div>{bl.client.country}</div>
                      </div>

                      {/* Table - semi-transparent header */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0' }}>
                        <thead>
                          <tr style={{ background: 'rgba(51,51,51,0.35)' }}>
                            <th style={{ color: '#333', padding: '10px 12px', textAlign: 'left', fontSize: '10pt', width: '50px', fontWeight: 'bold' }}>Qté</th>
                            <th style={{ color: '#333', padding: '10px 12px', textAlign: 'left', fontSize: '10pt', fontWeight: 'bold' }}>Désignation</th>
                            <th style={{ color: '#333', padding: '10px 12px', textAlign: 'left', fontSize: '10pt', width: '120px', fontWeight: 'bold' }}>N° Série</th>
                            <th style={{ color: '#333', padding: '10px 12px', textAlign: 'left', fontSize: '10pt', width: '100px', fontWeight: 'bold' }}>Service</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bl.devices.map((d, i) => (
                            <tr key={i}>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #ddd', fontSize: '10pt', textAlign: 'center', fontWeight: '600', background: i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(249,249,249,0.9)' }}>1</td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #ddd', fontSize: '10pt', background: i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(249,249,249,0.9)' }}>Compteur de particules LIGHTHOUSE {d.model}</td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #ddd', fontSize: '10pt', fontFamily: 'monospace', background: i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(249,249,249,0.9)' }}>{d.serial}</td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #ddd', fontSize: '10pt', background: i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(249,249,249,0.9)' }}>{d.service}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Shipping section */}
                      <div style={{ margin: '15px 0' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Informations d'expédition</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div style={{ display: 'flex', padding: '6px 0' }}><span style={{ color: '#666', width: '130px' }}>Transporteur:</span><span style={{ fontWeight: '600' }}>{bl.shipping.carrier}</span></div>
                          <div style={{ display: 'flex', padding: '6px 0' }}><span style={{ color: '#666', width: '130px' }}>N° de suivi:</span><span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{bl.shipping.tracking}</span></div>
                          <div style={{ display: 'flex', padding: '6px 0' }}><span style={{ color: '#666', width: '130px' }}>Nombre de colis:</span><span style={{ fontWeight: '600' }}>{bl.shipping.parcels}</span></div>
                          <div style={{ display: 'flex', padding: '6px 0' }}><span style={{ color: '#666', width: '130px' }}>Poids:</span><span style={{ fontWeight: '600' }}>{bl.shipping.weight} kg</span></div>
                        </div>
                      </div>

                      {/* Prepared by */}
                      <div style={{ fontSize: '10pt', marginTop: '12px', color: '#666' }}>
                        Préparé par: <strong style={{ color: '#333' }}>{employeeName}</strong>
                      </div>
                    </div>

                    {/* Footer - at bottom */}
                    <div style={{ flexShrink: 0, marginTop: 'auto', paddingTop: '15px', borderTop: '2px solid #333' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px' }}>
                        <div>
                          <img src="/images/logos/capcert-logo.png" alt="CAPCERT" style={{ height: '100px' }} onError={(e) => { e.target.outerHTML = '<div style="font-size:18px;color:#333;border:2px solid #333;padding:18px 24px;border-radius:6px;text-align:center"><strong>CAPCERT</strong><br/>ISO 9001</div>'; }} />
                        </div>
                        <div style={{ fontSize: '8pt', color: '#555', textAlign: 'center', lineHeight: '1.8' }}>
                          <strong style={{ color: '#333', fontSize: '9pt' }}>{biz.company_name || 'Lighthouse France SAS'}</strong> au capital de {biz.capital || '10 000'} €<br/>
                          {biz.address || '16 rue Paul Séjourné'}, {biz.postal_code || '94000'} {biz.city || 'CRÉTEIL'} | Tél. {biz.phone || '01 43 77 28 07'}<br/>
                          SIRET {biz.siret || '50178134800013'} | TVA {biz.tva || 'FR 86501781348'}<br/>
                          {biz.email || 'France@golighthouse.com'} | {biz.website || 'www.golighthouse.fr'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-green-700 mb-2">Expédition Terminée!</h3>
              <p className="text-gray-600 mb-2">Les appareils ont été marqués comme expédiés.</p>
              <p className="text-gray-500 text-sm mb-6">Fermez cette fenêtre pour voir le détail du RMA complété.</p>
              <div className="bg-gray-50 rounded-xl p-6 max-w-md mx-auto">
                {generatedBLs.map((bl, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg mb-2 border">
                    <span className="font-mono font-medium">📄 {bl.blNumber}</span>
                    <a href={`https://www.ups.com/track?tracknum=${bl.shipping.tracking}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">{bl.shipping.tracking}</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          {step === 1 && (
            <>
              <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Annuler</button>
              <button 
                onClick={createUPSLabels} 
                disabled={upsLoading || selectedDeviceIds.size === 0 || !shipments[0]?.address?.company_name || !shipments[0]?.address?.address_line1}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {upsLoading ? (
                  <>
                    <span className="animate-spin">⏳</span> Création étiquette UPS...
                  </>
                ) : (
                  <>📦 Créer Étiquette UPS ({selectedDeviceIds.size} appareil{selectedDeviceIds.size > 1 ? 's' : ''}) →</>
                )}
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">← Retour</button>
              <button onClick={() => setStep(3)} className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium">Continuer vers BL →</button>
            </>
          )}
          {step === 3 && (
            <>
              <button onClick={() => setStep(2)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">← Retour</button>
              <button onClick={saveShippingDocs} disabled={saving} className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50">{saving ? '⏳ Traitement...' : '💾 Enregistrer Documents'}</button>
            </>
          )}
          {step === 4 && (
            <div className="flex gap-3 ml-auto">
              <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">📋 Voir le RMA</button>
              <button onClick={markAsShipped} disabled={saving} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50">
                {saving ? '⏳...' : '🚚 Marquer Expédié (Fermer RMA)'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MESSAGES SHEET - All chats with clients
// ============================================

function MessagesSheet({ requests, notify, reload, onSelectRMA }) {
  const [selectedRMA, setSelectedRMA] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState(null);
  const [englishMode, setEnglishMode] = useState(true);
  const [englishInput, setEnglishInput] = useState('');
  const [frenchOutput, setFrenchOutput] = useState('');
  const [processingMessage, setProcessingMessage] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [translatingMessages, setTranslatingMessages] = useState({});
  const [showRMASidebar, setShowRMASidebar] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showEnglishConfirm, setShowEnglishConfirm] = useState(false);
  
  const badWords = ['fuck', 'shit', 'bitch', 'ass', 'crap'];
  
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
      }
    };
    loadProfile();
  }, []);
  
  const getUserSignature = () => {
    if (!profile?.full_name) return 'Lighthouse France';
    const names = profile.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0]} ${names[1].charAt(0)}. - Lighthouse France`;
    }
    return `${profile.full_name} - Lighthouse France`;
  };
  
  const isWithin48Hours = (dateStr) => {
    const msgDate = new Date(dateStr);
    const now = new Date();
    return (now - msgDate) / (1000 * 60 * 60) <= 48;
  };
  
  const filteredRMAs = requests.filter(r => {
    const hasUnread = (r.unread_admin_count || 0) > 0;
    const isOpen = r.chat_status === 'open';
    if (filter === 'open' && !isOpen && !hasUnread) return false;
    if (filter === 'closed' && (isOpen || hasUnread)) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (r.request_number?.toLowerCase().includes(s)) return true;
      if (r.companies?.name?.toLowerCase().includes(s)) return true;
      return false;
    }
    return true;
  }).sort((a, b) => {
    const aOpen = a.chat_status === 'open' || (a.unread_admin_count || 0) > 0;
    const bOpen = b.chat_status === 'open' || (b.unread_admin_count || 0) > 0;
    if (aOpen && !bOpen) return -1;
    if (bOpen && !aOpen) return 1;
    if (aOpen && bOpen) return new Date(a.last_message_at || a.updated_at) - new Date(b.last_message_at || b.updated_at);
    return new Date(b.updated_at) - new Date(a.updated_at);
  });
  
  useEffect(() => {
    if (!selectedRMA) { setMessages([]); setAiSuggestions([]); return; }
    const load = async () => {
      const { data } = await supabase.from('messages').select('*').eq('request_id', selectedRMA.id).order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
        if (englishMode) {
          data.filter(m => m.sender_type === 'customer' && isWithin48Hours(m.created_at)).forEach(m => translateMsg(m.id, m.content));
        }
        generateSuggestions(data);
      }
      if (selectedRMA.unread_admin_count > 0) {
        await supabase.from('messages').update({ is_read: true }).eq('request_id', selectedRMA.id).eq('sender_type', 'customer');
        await supabase.from('service_requests').update({ unread_admin_count: 0 }).eq('id', selectedRMA.id);
        reload();
      }
    };
    load();
    setEnglishInput(''); setFrenchOutput('');
  }, [selectedRMA?.id]);
  
  const translateMsg = async (id, text) => {
    if (translatedMessages[id] || translatingMessages[id]) return;
    setTranslatingMessages(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, direction: 'fr-to-en' }) });
      if (res.ok) { const d = await res.json(); setTranslatedMessages(p => ({ ...p, [id]: d.translation })); }
    } catch (e) { console.error(e); }
    setTranslatingMessages(p => ({ ...p, [id]: false }));
  };
  
  const generateSuggestions = async (msgs) => {
    if (!selectedRMA) return;
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/chat-suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        rma: { request_number: selectedRMA.request_number, status: selectedRMA.status, requested_service: selectedRMA.requested_service, company_name: selectedRMA.companies?.name, devices: selectedRMA.request_devices?.map(d => ({ model: d.model_name, serial: d.serial_number, status: d.status })) },
        messages: msgs.slice(-10).map(m => ({ sender: m.sender_type, content: m.content }))
      })});
      if (res.ok) { const d = await res.json(); if (d.french) setAiSuggestions([d]); }
    } catch (e) { console.error(e); }
    setLoadingSuggestions(false);
  };
  
  const processAndTranslate = async () => {
    if (!englishInput.trim()) return;
    if (badWords.some(w => englishInput.toLowerCase().includes(w))) { notify('⚠️ Please remove inappropriate language.', 'error'); return; }
    setProcessingMessage(true);
    try {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `Improve this English message for professional business communication, fix any grammar or spelling errors, then translate it to French. Only return the French translation, nothing else. Message: ${englishInput}`, direction: 'en-to-fr' }) });
      if (res.ok) { const d = await res.json(); setFrenchOutput(d.translation); }
    } catch (e) { notify('Translation error', 'error'); }
    setProcessingMessage(false);
  };
  
  const sendMessage = async () => {
    if (!frenchOutput.trim() || sendingMessage || !selectedRMA) return;
    const frW = ['le','la','les','de','est','sont','nous','vous'];
    const enW = ['the','is','are','we','you','your','have','will'];
    const lm = frenchOutput.toLowerCase();
    const frC = frW.filter(w => lm.includes(` ${w} `)).length;
    const enC = enW.filter(w => lm.includes(` ${w} `)).length;
    if (enC > frC && !showEnglishConfirm) { setShowEnglishConfirm(true); return; }
    setShowEnglishConfirm(false);
    setSendingMessage(true);
    try {
      const { data, error } = await supabase.from('messages').insert({ request_id: selectedRMA.id, sender_id: profile?.id, sender_type: 'admin', sender_name: profile?.full_name || 'Admin', content: frenchOutput.trim() }).select().single();
      if (error) throw error;
      setMessages(p => [...p, data]);
      setEnglishInput(''); setFrenchOutput('');
      if (selectedRMA.chat_status !== 'open') {
        await supabase.from('service_requests').update({ chat_status: 'open' }).eq('id', selectedRMA.id);
        setSelectedRMA(p => ({ ...p, chat_status: 'open' }));
      }
      notify('✅ Sent!');
      reload();
    } catch (e) { notify('Error: ' + e.message, 'error'); }
    setSendingMessage(false);
  };
  
  const toggleChat = async () => {
    if (!selectedRMA) return;
    const ns = selectedRMA.chat_status === 'open' ? 'closed' : 'open';
    await supabase.from('service_requests').update({ chat_status: ns }).eq('id', selectedRMA.id);
    setSelectedRMA(p => ({ ...p, chat_status: ns }));
    notify(ns === 'open' ? '🔔 Opened' : '✅ Closed');
    reload();
  };
  
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRMA) return;
    setUploadingFile(true);
    try {
      const path = `chat/${selectedRMA.id}/${Date.now()}_${file.name}`;
      const { error: ue } = await supabase.storage.from('documents').upload(path, file);
      if (ue) throw ue;
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
      const { data } = await supabase.from('messages').insert({ request_id: selectedRMA.id, sender_id: profile?.id, sender_type: 'admin', sender_name: profile?.full_name, content: `📎 ${file.name}`, attachment_url: publicUrl, attachment_name: file.name }).select().single();
      if (data) setMessages(p => [...p, data]);
      notify('✅ Uploaded!');
    } catch (e) { notify('Error: ' + e.message, 'error'); }
    setUploadingFile(false);
    e.target.value = '';
  };
  
  const totalUnread = requests.reduce((s, r) => s + (r.unread_admin_count || 0), 0);
  const openCount = requests.filter(r => r.chat_status === 'open' || (r.unread_admin_count || 0) > 0).length;
  
  return (
    <div className="p-6">
      <div className="flex gap-4 h-[calc(100vh-180px)]">
        {/* Chat List */}
        <div className="w-72 bg-white rounded-xl shadow-sm border flex flex-col flex-shrink-0">
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-800">💬 Messages</span>
              {totalUnread > 0 && <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">{totalUnread}</span>}
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search..." className="w-full px-3 py-1.5 border rounded text-sm mb-2" />
            <div className="flex gap-1">
              {[{id:'open',l:'Open',c:openCount},{id:'closed',l:'Closed'},{id:'all',l:'All'}].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={`flex-1 py-1 rounded text-xs font-medium ${filter === f.id ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                  {f.l}{f.c > 0 ? ` (${f.c})` : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {filteredRMAs.map(rma => (
              <div key={rma.id} onClick={() => setSelectedRMA(rma)} className={`p-3 cursor-pointer ${selectedRMA?.id === rma.id ? 'bg-blue-50 border-l-4 border-blue-500' : (rma.unread_admin_count || 0) > 0 ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-[#00A651]">{rma.request_number}</span>
                  {(rma.unread_admin_count || 0) > 0 && <span className="px-1.5 bg-red-500 text-white rounded-full text-xs">{rma.unread_admin_count}</span>}
                </div>
                <p className="text-sm font-medium truncate">{rma.companies?.name}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border flex flex-col">
          {!selectedRMA ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center"><p className="text-4xl mb-2">💬</p><p>Select a conversation</p></div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className={`p-3 border-b flex justify-between items-center ${selectedRMA.chat_status === 'open' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                <div>
                  <span className="font-mono font-bold text-[#00A651]">{selectedRMA.request_number}</span>
                  <span className="text-sm text-gray-500 ml-2">{selectedRMA.companies?.name}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEnglishMode(!englishMode)} className={`px-2 py-1 rounded text-xs font-medium ${englishMode ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                    {englishMode ? '🇬🇧 EN' : '🇫🇷 FR'}
                  </button>
                  <button onClick={() => setShowRMASidebar(!showRMASidebar)} className={`px-2 py-1 rounded text-xs font-medium ${showRMASidebar ? 'bg-purple-500 text-white' : 'bg-purple-100'}`}>📋 RMA</button>
                  <button onClick={toggleChat} className={`px-2 py-1 rounded text-xs font-medium ${selectedRMA.chat_status === 'open' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                    {selectedRMA.chat_status === 'open' ? '✓ Close' : '+ Open'}
                  </button>
                </div>
              </div>
              
              <div className="flex-1 flex overflow-hidden">
                {/* Messages */}
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map(msg => {
                      const isAdmin = msg.sender_type === 'admin';
                      const trans = translatedMessages[msg.id];
                      const recent = isWithin48Hours(msg.created_at);
                      return (
                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] p-3 rounded-lg ${isAdmin ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                            <div className="flex justify-between text-xs mb-1 gap-2">
                              <span className={isAdmin ? 'text-blue-200' : 'text-gray-500'}>{msg.sender_name || (isAdmin ? 'Admin' : 'Client')}</span>
                              <span className={isAdmin ? 'text-blue-200' : 'text-gray-400'}>{new Date(msg.created_at).toLocaleString('fr-FR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                            </div>
                            {englishMode && !isAdmin && trans ? (
                              <><p className="text-sm">{trans}</p><p className="text-xs mt-1 pt-1 border-t border-gray-200 text-gray-400 italic">🇫🇷 {msg.content}</p></>
                            ) : englishMode && !isAdmin && recent && translatingMessages[msg.id] ? (
                              <p className="text-sm text-gray-400 italic">Translating...</p>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            )}
                            {englishMode && !isAdmin && !recent && !trans && (
                              <button onClick={() => translateMsg(msg.id, msg.content)} className="text-xs text-blue-500 mt-1">🇬🇧 Translate</button>
                            )}
                            {msg.attachment_url && (
                              <a href={msg.attachment_url} target="_blank" className={`text-xs mt-2 block ${isAdmin ? 'text-blue-200' : 'text-blue-600'}`}>📎 {msg.attachment_name || 'Download'}</a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* AI Suggestions */}
                  {(loadingSuggestions || aiSuggestions.length > 0) && (
                    <div className="border-t bg-purple-50 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-purple-700">🤖 AI Suggestion</span>
                        <button onClick={() => generateSuggestions(messages)} className="text-xs text-purple-600">🔄 Refresh</button>
                      </div>
                      {loadingSuggestions ? <p className="text-xs text-purple-500">Loading...</p> : aiSuggestions.map((s, i) => (
                        <div key={i} onClick={() => { setEnglishInput(s.english); setFrenchOutput(s.french); }} className="p-2 bg-white rounded border border-purple-200 cursor-pointer hover:border-purple-400 text-xs">
                          <p className="text-gray-600">{englishMode ? s.english : s.french}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Input */}
                  <div className="border-t bg-gray-50 p-3">
                    {englishMode ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">🇬🇧 Your message (English)</label>
                            <textarea value={englishInput} onChange={e => setEnglishInput(e.target.value)} placeholder="Type in English..." className="w-full px-2 py-1.5 border rounded text-sm h-16 resize-none" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">🇫🇷 French (will be sent)</label>
                            <textarea value={frenchOutput} onChange={e => setFrenchOutput(e.target.value)} placeholder="French here..." className="w-full px-2 py-1.5 border rounded text-sm h-16 resize-none bg-white" />
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex gap-2">
                            <button onClick={processAndTranslate} disabled={processingMessage || !englishInput.trim()} className="px-3 py-1.5 bg-purple-500 text-white rounded text-xs font-medium disabled:opacity-50">
                              {processingMessage ? '⏳...' : '🔄 Translate'}
                            </button>
                            <label className="px-3 py-1.5 bg-gray-200 rounded text-xs font-medium cursor-pointer">
                              📎 File<input type="file" className="hidden" onChange={handleFile} disabled={uploadingFile} />
                            </label>
                          </div>
                          <button onClick={sendMessage} disabled={sendingMessage || !frenchOutput.trim()} className="px-4 py-1.5 bg-green-500 text-white rounded text-xs font-medium disabled:opacity-50">
                            {sendingMessage ? '⏳...' : '📤 Send French'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <textarea value={frenchOutput} onChange={e => setFrenchOutput(e.target.value)} placeholder="Message en français..." className="flex-1 px-2 py-1.5 border rounded text-sm resize-none" rows={2} />
                        <div className="flex flex-col gap-1">
                          <label className="px-2 py-1.5 bg-gray-200 rounded text-xs cursor-pointer text-center">📎<input type="file" className="hidden" onChange={handleFile} /></label>
                          <button onClick={sendMessage} disabled={sendingMessage || !frenchOutput.trim()} className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs disabled:opacity-50">📤</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* RMA Sidebar */}
                {showRMASidebar && (
                  <div className="w-72 border-l bg-gray-50 p-3 overflow-y-auto flex-shrink-0">
                    <h3 className="font-bold text-gray-700 mb-3">📋 RMA Info</h3>
                    <div className="space-y-2 text-sm">
                      <div className="bg-white p-2 rounded border"><span className="text-gray-500 text-xs">RMA</span><p className="font-mono font-bold text-[#00A651]">{selectedRMA.request_number}</p></div>
                      <div className="bg-white p-2 rounded border"><span className="text-gray-500 text-xs">Status</span><p>{selectedRMA.status}</p></div>
                      <div className="bg-white p-2 rounded border"><span className="text-gray-500 text-xs">Service</span><p>{selectedRMA.requested_service}</p></div>
                      <div className="bg-white p-2 rounded border"><span className="text-gray-500 text-xs">Company</span><p>{selectedRMA.companies?.name}</p></div>
                      <div className="bg-white p-2 rounded border">
                        <span className="text-gray-500 text-xs">Devices ({selectedRMA.request_devices?.length || 0})</span>
                        {selectedRMA.request_devices?.map((d, i) => (
                          <div key={i} className="mt-1 pt-1 border-t text-xs">
                            <p className="font-medium">{d.model_name}</p>
                            <p className="text-gray-400">SN: {d.serial_number}</p>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => onSelectRMA(selectedRMA)} className="w-full py-2 bg-blue-500 text-white rounded text-sm font-medium">Open Full RMA →</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* English Confirm Modal */}
      {showEnglishConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md">
            <h3 className="font-bold text-lg mb-2">⚠️ Message appears to be in English</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to send this? It looks like English, not French.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEnglishConfirm(false)} className="flex-1 py-2 bg-gray-200 rounded font-medium">Cancel</button>
              <button onClick={sendMessage} className="flex-1 py-2 bg-amber-500 text-white rounded font-medium">Send Anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientsSheet({ clients, requests, equipment, notify, reload, isAdmin, onSelectRMA, onSelectDevice }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = show clients, object = show search results
  
  // Determine what kind of search this is
  const searchType = (() => {
    const s = search.trim().toUpperCase();
    if (s.startsWith('FR-') || s.startsWith('FR')) return 'rma';
    if (s.length >= 3 && /^\d+$/.test(s)) return 'serial'; // Numeric string = likely serial
    if (s.length >= 2) return 'all'; // Search everything
    return 'none';
  })();
  
  // Perform search when search changes
  useEffect(() => {
    if (!search.trim() || search.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    
    const s = search.trim().toLowerCase();
    const sUpper = search.trim().toUpperCase();
    
    // Search for RMAs by number
    const rmaMatches = requests.filter(r => 
      r.request_number?.toUpperCase().includes(sUpper)
    );
    
    // Search for devices by serial number across all RMAs
    const serialMatches = [];
    requests.forEach(rma => {
      (rma.request_devices || []).forEach(device => {
        if (device.serial_number?.toLowerCase().includes(s)) {
          serialMatches.push({ device, rma });
        }
      });
    });
    
    // Also search equipment table for serial numbers
    const equipmentMatches = equipment.filter(eq => 
      eq.serial_number?.toLowerCase().includes(s)
    );
    
    // Search clients by name/email
    const clientMatches = clients.filter(c => 
      c.name?.toLowerCase().includes(s) || 
      c.profiles?.some(p => p.email?.toLowerCase().includes(s))
    );
    
    // If we have RMA or serial matches, show those results
    if (rmaMatches.length > 0 || serialMatches.length > 0) {
      setSearchResults({
        type: rmaMatches.length > 0 ? 'rma' : 'serial',
        rmas: rmaMatches,
        serialDevices: serialMatches,
        equipment: equipmentMatches,
        clients: clientMatches
      });
    } else if (clientMatches.length > 0 || equipmentMatches.length > 0) {
      setSearchResults({
        type: 'client',
        rmas: [],
        serialDevices: [],
        equipment: equipmentMatches,
        clients: clientMatches
      });
    } else {
      setSearchResults({
        type: 'none',
        rmas: [],
        serialDevices: [],
        equipment: [],
        clients: []
      });
    }
  }, [search, requests, equipment, clients]);
  
  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.profiles?.some(p => p.email?.toLowerCase().includes(search.toLowerCase()))
  );
  
  const getClientStats = (clientId) => { 
    const clientRequests = requests.filter(r => r.company_id === clientId); 
    return { 
      total: clientRequests.length, 
      active: clientRequests.filter(r => !['completed', 'cancelled', 'shipped'].includes(r.status) && r.request_number).length 
    }; 
  };
  
  // Get all RMAs for a serial number
  const getSerialHistory = (serialNumber) => {
    const history = [];
    requests.forEach(rma => {
      (rma.request_devices || []).forEach(device => {
        if (device.serial_number === serialNumber) {
          history.push({ rma, device });
        }
      });
    });
    return history.sort((a, b) => new Date(b.rma.created_at) - new Date(a.rma.created_at));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Clients ({clients.length})</h1>
        <div className="relative">
          <input 
            type="text" 
            placeholder="🔍 Client, N° série, ou RMA..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="px-4 py-2 border border-gray-300 rounded-lg w-96" 
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* Search Results */}
      {searchResults && search.trim().length >= 2 ? (
        <div className="space-y-6">
          {/* RMA Results */}
          {searchResults.rmas.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-blue-50">
                <h2 className="font-bold text-blue-800">📋 RMAs trouvés ({searchResults.rmas.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.rmas.map(rma => {
                  const style = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;
                  const devices = rma.request_devices || [];
                  return (
                    <div 
                      key={rma.id} 
                      className="p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => onSelectRMA(rma)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-[#00A651] text-lg">{rma.request_number}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span>
                            <span className="text-xs text-blue-500">Cliquez pour ouvrir →</span>
                          </div>
                          <p className="text-gray-600 mt-1">{rma.companies?.name}</p>
                          <p className="text-sm text-gray-400">{new Date(rma.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{devices.length} appareil(s)</p>
                          {devices.slice(0, 3).map((d, i) => (
                            <p key={i} className="text-xs text-gray-400">{d.model_name} - {d.serial_number}</p>
                          ))}
                          {devices.length > 3 && <p className="text-xs text-gray-400">+{devices.length - 3} autres</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Serial Number Results */}
          {searchResults.serialDevices.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-green-50">
                <h2 className="font-bold text-green-800">🔧 Historique N° Série ({searchResults.serialDevices.length} RMA(s))</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {/* Group by serial number */}
                {(() => {
                  const bySerial = {};
                  searchResults.serialDevices.forEach(({ device, rma }) => {
                    if (!bySerial[device.serial_number]) {
                      bySerial[device.serial_number] = { device, rmas: [] };
                    }
                    bySerial[device.serial_number].rmas.push({ rma, device });
                  });
                  
                  return Object.entries(bySerial).map(([serial, data]) => (
                    <div key={serial} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono font-bold text-gray-800 text-lg">{serial}</span>
                        <span className="text-gray-500">{data.device.model_name}</span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{data.rmas.length} intervention(s)</span>
                      </div>
                      <div className="ml-4 space-y-2">
                        {data.rmas.sort((a, b) => new Date(b.rma.created_at) - new Date(a.rma.created_at)).map(({ rma, device }) => {
                          const style = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;
                          return (
                            <div 
                              key={rma.id} 
                              className="flex items-center justify-between bg-gray-50 hover:bg-green-50 rounded-lg p-3 cursor-pointer transition-colors"
                              onClick={() => onSelectDevice ? onSelectDevice(device, rma) : onSelectRMA(rma)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-[#00A651] font-medium">{rma.request_number}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span>
                                <span className="text-sm text-gray-500">{device.service_type === 'repair' ? '🔧 Réparation' : '🔬 Étalonnage'}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">{rma.companies?.name}</p>
                                  <p className="text-xs text-gray-400">{new Date(rma.created_at).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <span className="text-green-500 text-sm">Voir appareil →</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
          
          {/* Equipment matches (devices registered but maybe no RMA yet) */}
          {searchResults.equipment.length > 0 && searchResults.serialDevices.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-amber-50">
                <h2 className="font-bold text-amber-800">📦 Appareils enregistrés ({searchResults.equipment.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.equipment.map(eq => (
                  <div key={eq.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{eq.model_name}</p>
                      <p className="font-mono text-sm text-gray-600">SN: {eq.serial_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{eq.companies?.name || 'Client inconnu'}</p>
                      <p className="text-xs text-gray-400">{eq.brand}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Client matches */}
          {searchResults.clients.length > 0 && searchResults.rmas.length === 0 && searchResults.serialDevices.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">👥 Clients ({searchResults.clients.length})</h2>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Entreprise</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Contact principal</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Ville</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMAs</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {searchResults.clients.map(client => { 
                    const stats = getClientStats(client.id); 
                    const mainContact = client.profiles?.find(p => p.role === 'admin') || client.profiles?.[0]; 
                    return (
                      <tr key={client.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedClient(client)}>
                        <td className="px-4 py-3"><p className="font-medium text-gray-800">{client.name}</p></td>
                        <td className="px-4 py-3">{mainContact ? <div><p className="text-sm">{mainContact.full_name}</p><p className="text-xs text-gray-400">{mainContact.email}</p></div> : <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{client.billing_city || '—'}</td>
                        <td className="px-4 py-3"><span className="text-sm">{stats.total} total{stats.active > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{stats.active} actif(s)</span>}</span></td>
                        <td className="px-4 py-3"><button onClick={e => { e.stopPropagation(); setSelectedClient(client); }} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Voir →</button></td>
                      </tr>
                    ); 
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* No results */}
          {searchResults.type === 'none' && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-gray-500">Aucun résultat pour "{search}"</p>
              <p className="text-sm text-gray-400 mt-2">Essayez un numéro de série, un numéro RMA, ou un nom de client</p>
            </div>
          )}
        </div>
      ) : (
        /* Default: Show all clients */
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Entreprise</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Contact principal</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Ville</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMAs</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(search ? filteredClients : clients).map(client => { 
                const stats = getClientStats(client.id); 
                const mainContact = client.profiles?.find(p => p.role === 'admin') || client.profiles?.[0]; 
                return (
                  <tr key={client.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedClient(client)}>
                    <td className="px-4 py-3"><p className="font-medium text-gray-800">{client.name}</p></td>
                    <td className="px-4 py-3">{mainContact ? <div><p className="text-sm">{mainContact.full_name}</p><p className="text-xs text-gray-400">{mainContact.email}</p></div> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{client.billing_city || '—'}</td>
                    <td className="px-4 py-3"><span className="text-sm">{stats.total} total{stats.active > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{stats.active} actif(s)</span>}</span></td>
                    <td className="px-4 py-3"><button onClick={e => { e.stopPropagation(); setSelectedClient(client); }} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Voir →</button></td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {selectedClient && <ClientDetailModal client={selectedClient} requests={requests.filter(r => r.company_id === selectedClient.id)} equipment={equipment.filter(e => e.company_id === selectedClient.id)} onClose={() => setSelectedClient(null)} notify={notify} reload={reload} isAdmin={isAdmin} onSelectRMA={onSelectRMA} onSelectDevice={onSelectDevice} />}
    </div>
  );
}

function ClientDetailModal({ client, requests, equipment, onClose, notify, reload, isAdmin, onSelectRMA, onSelectDevice }) {
  const [activeTab, setActiveTab] = useState('rmas');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: client.name || '', billing_address: client.billing_address || '', billing_city: client.billing_city || '', billing_postal_code: client.billing_postal_code || '', siret: client.siret || '', vat_number: client.vat_number || '' });
  const [saving, setSaving] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null); // For showing device RMA history
  const tabs = [{ id: 'rmas', label: 'RMAs', icon: '📋', count: requests.length }, { id: 'devices', label: 'Appareils', icon: '🔧', count: equipment.length }, { id: 'info', label: 'Informations', icon: 'ℹ️' }, { id: 'contacts', label: 'Contacts', icon: '👤', count: client.profiles?.length || 0 }];
  const saveClient = async () => { setSaving(true); const { error } = await supabase.from('companies').update(editData).eq('id', client.id); if (error) notify('Erreur: ' + error.message, 'error'); else { notify('Client mis à jour!'); setEditing(false); reload(); } setSaving(false); };
  
  const handleSelectRMA = (rma) => {
    onClose();
    if (onSelectRMA) onSelectRMA(rma);
  };
  
  // Get all RMAs that contain this serial number
  const getDeviceRMAHistory = (serialNumber) => {
    return requests.filter(r => r.request_devices?.some(d => d.serial_number === serialNumber))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{client.name}</h2>
            <p className="text-sm text-gray-300">{client.billing_city}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="border-b bg-gray-50 flex">{tabs.map(tab => <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedEquipment(null); }} className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 ${activeTab === tab.id ? 'border-[#00A651] text-[#00A651] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><span>{tab.icon}</span>{tab.label}{tab.count !== undefined && <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">{tab.count}</span>}</button>)}</div>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'rmas' && (
            <div className="space-y-3">
              {requests.length === 0 ? <p className="text-center text-gray-400 py-8">Aucun RMA</p> : requests.map(req => { 
                const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted; 
                return (
                  <div key={req.id} onClick={() => handleSelectRMA(req)} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center hover:bg-gray-100 cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-[#00A651]">{req.request_number || 'En attente'}</span>
                      <div>
                        <p className="font-medium">{req.requested_service}</p>
                        <p className="text-sm text-gray-500">{req.request_devices?.length || 1} appareil(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span>
                      <p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ); 
              })}
            </div>
          )}
          
          {activeTab === 'devices' && !selectedEquipment && (
            <div className="space-y-3">
              {equipment.length === 0 ? <p className="text-center text-gray-400 py-8">Aucun appareil</p> : equipment.map(eq => { 
                const rmaCount = getDeviceRMAHistory(eq.serial_number).length;
                return (
                  <div key={eq.id} onClick={() => setSelectedEquipment(eq)} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center hover:bg-gray-100 cursor-pointer transition-colors">
                    <div>
                      <p className="font-medium">{eq.model_name}</p>
                      <p className="text-sm text-gray-500">SN: {eq.serial_number}</p>
                      {eq.nickname && <p className="text-xs text-gray-400">"{eq.nickname}"</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400">{eq.brand}</span>
                      {rmaCount > 0 && <p className="text-xs text-blue-600 mt-1">{rmaCount} RMA(s)</p>}
                    </div>
                  </div>
                ); 
              })}
            </div>
          )}
          
          {activeTab === 'devices' && selectedEquipment && (
            <div className="space-y-4">
              <button onClick={() => setSelectedEquipment(null)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                ← Retour aux appareils
              </button>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-bold text-blue-800">{selectedEquipment.model_name}</h3>
                <p className="text-sm text-blue-600">SN: {selectedEquipment.serial_number}</p>
                {selectedEquipment.nickname && <p className="text-xs text-blue-500">"{selectedEquipment.nickname}"</p>}
              </div>
              
              <h4 className="font-medium text-gray-700">Historique des RMAs pour cet appareil:</h4>
              
              <div className="space-y-3">
                {getDeviceRMAHistory(selectedEquipment.serial_number).length === 0 ? (
                  <p className="text-center text-gray-400 py-4">Aucun RMA pour cet appareil</p>
                ) : (
                  getDeviceRMAHistory(selectedEquipment.serial_number).map(rma => {
                    const style = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;
                    const deviceInRMA = rma.request_devices?.find(d => d.serial_number === selectedEquipment.serial_number);
                    return (
                      <div key={rma.id} onClick={() => handleSelectRMA(rma)} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono font-bold text-[#00A651]">{rma.request_number}</span>
                            <p className="text-sm text-gray-600 mt-1">{rma.requested_service}</p>
                            {deviceInRMA?.service_type && <p className="text-xs text-gray-500">Service: {deviceInRMA.service_type}</p>}
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span>
                            <p className="text-xs text-gray-400 mt-1">{new Date(rma.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'info' && <div className="space-y-4">{editing ? <div className="space-y-4 max-w-lg"><div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label><input type="text" value={editData.billing_address} onChange={e => setEditData({ ...editData, billing_address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label><input type="text" value={editData.billing_postal_code} onChange={e => setEditData({ ...editData, billing_postal_code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Ville</label><input type="text" value={editData.billing_city} onChange={e => setEditData({ ...editData, billing_city: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label><input type="text" value={editData.siret} onChange={e => setEditData({ ...editData, siret: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">N° TVA</label><input type="text" value={editData.vat_number} onChange={e => setEditData({ ...editData, vat_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div></div><div className="flex gap-2 pt-2"><button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button><button onClick={saveClient} disabled={saving} className="px-4 py-2 bg-[#00A651] text-white rounded-lg disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div></div> : <div className="space-y-4">{isAdmin && <button onClick={() => setEditing(true)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">✏️ Modifier</button>}<div className="grid md:grid-cols-2 gap-4"><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-500">Nom</p><p className="font-medium">{client.name}</p></div><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-500">Adresse</p><p className="font-medium">{client.billing_address || '—'}</p><p className="text-sm text-gray-600">{client.billing_postal_code} {client.billing_city}</p></div><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-500">SIRET</p><p className="font-medium">{client.siret || '—'}</p></div><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-500">N° TVA</p><p className="font-medium">{client.vat_number || '—'}</p></div></div></div>}</div>}
          {activeTab === 'contacts' && <div className="space-y-3">{client.profiles?.map(contact => <div key={contact.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center font-bold">{contact.full_name?.charAt(0)?.toUpperCase()}</div><div><p className="font-medium">{contact.full_name}</p><p className="text-sm text-gray-500">{contact.email}</p>{contact.phone && <p className="text-sm text-gray-400">{contact.phone}</p>}</div></div><span className={`px-2 py-1 rounded-full text-xs ${contact.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>{contact.role === 'admin' ? '👑 Admin' : '👤 Utilisateur'}</span></div>)}</div>}
        </div>
      </div>
    </div>
  );
}

// QC Review Modal - View report, certificate, then approve
function QCReviewModal({ device, rma, onBack, notify, profile }) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Report, 2: Certificate, 3: Approve
  const [qcNotes, setQcNotes] = useState(device.qc_notes || '');
  const [savedReportUrl, setSavedReportUrl] = useState(device.report_url || null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const today = new Date().toLocaleDateString('fr-FR');
  
  // Get checklist from device
  const checklist = device.work_checklist || {};
  const defaultChecklist = [
    { id: 'visual', label: 'Inspection visuelle effectuée', checked: checklist.visual !== false },
    { id: 'cleaning', label: 'Nettoyage effectué', checked: checklist.cleaning !== false },
    { id: 'calibration', label: 'Étalonnage réalisé selon procédure', checked: checklist.calibration !== false },
    { id: 'results', label: 'Résultats dans les spécifications', checked: checklist.results !== false },
    { id: 'certificate', label: 'Certificat d\'étalonnage généré', checked: checklist.certificate !== false }
  ];
  
  const serviceTypeText = device.service_type === 'calibration' ? 'Étalonnage' : device.service_type === 'repair' ? 'Réparation' : 'Étalonnage et Réparation';
  const motifText = device.notes ? `${serviceTypeText} - ${device.notes}` : serviceTypeText;
  
  const showCalType = device.cal_type && device.cal_type !== 'none';
  const showReceptionResult = device.reception_result && device.reception_result !== 'none';
  
  // Reject QC - send back to tech with notes
  const rejectQC = async () => {
    if (!rejectionReason.trim()) {
      notify('Veuillez indiquer la raison du rejet', 'error');
      return;
    }
    setSaving(true);
    try {
      // Delete existing report PDF if any (will be regenerated after fixes)
      if (savedReportUrl) {
        try {
          const path = savedReportUrl.split('/documents/')[1];
          if (path) await supabase.storage.from('documents').remove([path]);
        } catch (e) { console.error('Could not delete old PDF:', e); }
      }
      
      await supabase.from('request_devices').update({
        status: 'qc_rejected',
        qc_rejected: true,
        qc_rejected_at: new Date().toISOString(),
        qc_rejected_by: profile?.id,
        qc_rejection_reason: rejectionReason,
        report_url: null // Clear the report URL since it needs to be redone
      }).eq('id', device.id);
      
      notify('❌ QC rejeté - Renvoyé au technicien');
      setShowRejectModal(false);
      onBack();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSaving(false);
  };
  
  // Save report PDF by capturing the visible preview
  const saveReportPDF = async () => {
    try {
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      const element = document.getElementById('qc-report-preview');
      if (!element) { notify('Element not found!', 'error'); return null; }
      
      notify('Génération du PDF...');
      const canvas = await window.html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const jsPDF = await loadJsPDF();
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdfWidth = 210;
      const imgRatio = canvas.height / canvas.width;
      const imgHeight = pdfWidth * imgRatio;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight, 297));
      
      const pdfBlob = pdf.output('blob');
      const safeSerial = (device.serial_number || 'unknown').replace(/[^a-zA-Z0-9-_]/g, '');
      const fileName = `${rma.request_number}_${safeSerial}_rapport_${Date.now()}.pdf`;
      const reportUrl = await uploadPDFToStorage(pdfBlob, `reports/${rma.request_number}`, fileName);
      
      if (reportUrl) {
        await supabase.from('request_devices').update({ report_url: reportUrl }).eq('id', device.id);
        setSavedReportUrl(reportUrl);
        notify('✓ Rapport PDF enregistré!');
        return reportUrl;
      } else {
        notify('Erreur upload', 'error');
        return null;
      }
    } catch (err) {
      console.error(err);
      notify('Erreur: ' + err.message, 'error');
      return null;
    }
  };
  
  const approveQC = async () => {
    setSaving(true);
    try {
      // Always save report PDF by capturing the preview element (always in DOM now)
      let reportUrl = savedReportUrl;
      if (!reportUrl) {
        reportUrl = await saveReportPDF();
      }
      
      const updateData = {
        qc_complete: true,
        qc_completed_at: new Date().toISOString(),
        qc_completed_by: profile?.id,
        qc_notes: qcNotes,
        status: 'ready_to_ship'
      };
      
      if (reportUrl) updateData.report_url = reportUrl;
      
      const { error } = await supabase.from('request_devices').update(updateData).eq('id', device.id);
      if (error) throw error;
      
      const allDevices = rma.request_devices || [];
      const otherDevices = allDevices.filter(d => d.id !== device.id);
      const allOthersReady = otherDevices.every(d => d.qc_complete || d.status === 'ready_to_ship');
      
      if (allOthersReady) {
        await supabase.from('service_requests').update({
          status: 'ready_to_ship',
          updated_at: new Date().toISOString()
        }).eq('id', rma.id);
      }
      
      notify(reportUrl ? '✓ QC validé + Rapport enregistré!' : '✓ QC validé');
      onBack();
    } catch (err) {
      console.error('approveQC error:', err);
      notify('Erreur: ' + err.message, 'error');
    }
    setSaving(false);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">← Retour</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">CONTRÔLE QUALITÉ</h1>
            <p className="text-gray-500">{device.model_name} • SN: {device.serial_number} • {rma.request_number}</p>
          </div>
        </div>
        {device.qc_complete && (
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">✓ Déjà validé</span>
        )}
      </div>
      
      {/* Progress Steps */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setStep(1)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium ${step === 1 ? 'bg-blue-500 text-white' : step > 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
          >
            {step > 1 ? '✓' : '1.'} Rapport de Service
          </button>
          <div className="w-8 h-0.5 bg-gray-300"></div>
          <button 
            onClick={() => setStep(2)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium ${step === 2 ? 'bg-blue-500 text-white' : step > 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
          >
            {step > 2 ? '✓' : '2.'} Certificat
          </button>
          <div className="w-8 h-0.5 bg-gray-300"></div>
          <button 
            onClick={() => setStep(3)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium ${step === 3 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            3. Validation
          </button>
        </div>
      </div>
      
      {/* Step 1: Service Report - Preview always rendered for PDF capture */}
      <div style={step === 1 ? {} : { position: 'absolute', left: '-9999px', top: 0 }}>
        <div className="space-y-4">
        <div className="bg-gray-400 p-8 min-h-full flex justify-center">
          <div id="qc-report-preview" className="bg-white shadow-2xl w-full max-w-3xl relative" style={{ fontFamily: 'Arial, sans-serif', padding: '40px 50px', minHeight: '297mm', display: 'flex', flexDirection: 'column' }}>
            
            {/* Watermark */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.08, pointerEvents: 'none', zIndex: 1 }}>
              <img src="/images/logos/Lighthouse-Square-logo.png" alt="" style={{ width: '400px', height: 'auto' }} onError={(e) => { e.target.outerHTML = '<div style="font-size:120px;font-weight:bold;color:#000">LWS</div>'; }} />
            </div>
            
            {/* Content wrapper - above watermark */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Logo */}
            <div className="mb-8">
              <img src="/images/logos/lighthouse-logo.png" alt="Lighthouse" className="h-12 w-auto" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>

              {/* Info Table */}
              <table className="w-full text-sm mb-6" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '200px' }} />
                  <col />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Date d'achèvement</td>
                    <td className="py-1 text-gray-800">{device.report_completed_at ? new Date(device.report_completed_at).toLocaleDateString('fr-FR') : today}</td>
                    <td className="py-1 text-gray-800"><span className="font-bold text-[#003366]">RMA # </span>{rma.request_number}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Client</td>
                    <td className="py-1 text-gray-800" colSpan="2">{rma.companies?.name}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Adresse</td>
                    <td className="py-1 text-gray-800" colSpan="2">{rma.companies?.billing_address || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Code postal / Ville</td>
                    <td className="py-1 text-gray-800">{rma.companies?.billing_postal_code} {rma.companies?.billing_city}</td>
                    <td className="py-1 text-gray-800"><span className="font-bold text-[#003366]">Contact </span>{rma.companies?.contact_name || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Téléphone</td>
                    <td className="py-1 text-gray-800">{rma.companies?.phone || '—'}</td>
                    <td className="py-1 text-gray-800"><span className="font-bold text-[#003366]">Technicien(ne) de service</span></td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Modèle#</td>
                    <td className="py-1 text-gray-800">{device.model_name}</td>
                    <td className="py-1 text-gray-800">{device.technician_name || 'Lighthouse France'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Numéro de série</td>
                    <td className="py-1 text-gray-800" colSpan="2">{device.serial_number}</td>
                  </tr>
                </tbody>
              </table>

              {/* Content */}
              <div className="flex-grow">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '170px' }} />
                    <col />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="pt-6 pb-2 font-bold text-[#003366] whitespace-nowrap align-top">Motif de retour</td>
                      <td className="pt-6 pb-2 text-gray-800">{motifText}</td>
                    </tr>
                    {showCalType && (
                      <tr>
                        <td className="py-2 font-bold text-[#003366] whitespace-nowrap align-top">Étalonnage effectué</td>
                        <td className="py-2 text-gray-800">{device.cal_type}</td>
                      </tr>
                    )}
                    {showReceptionResult && (
                      <tr>
                        <td className="py-2 font-bold text-[#003366] whitespace-nowrap align-top">Résultats à la réception</td>
                        <td className="py-2 text-gray-800">{device.reception_result}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="pt-10 pb-2 font-bold text-[#003366] whitespace-nowrap align-top">Constatations</td>
                      <td className="pt-10 pb-2 text-gray-800 whitespace-pre-wrap">{device.service_findings || '—'}</td>
                    </tr>
                    <tr>
                      <td className="pt-8 pb-2 font-bold text-[#003366] whitespace-nowrap align-top">Actions effectuées</td>
                      <td className="pt-8 pb-2 text-gray-800 whitespace-pre-wrap">{device.work_completed || '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingTop: '150px' }} className="pb-2 font-bold text-[#003366] whitespace-nowrap align-top">Travaux réalisés</td>
                      <td style={{ paddingTop: '150px' }} className="pb-2">
                        <div className="space-y-1">
                          {defaultChecklist.filter(item => item.checked).map(item => (
                            <div key={item.id} className="flex items-center gap-2">
                              <span className="text-[#003366]">☑</span>
                              <span className="text-gray-800">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="text-center text-sm text-gray-600 mt-auto pt-8">
                <p className="font-bold text-[#003366]">Lighthouse Worldwide Solutions France</p>
                <p>16 Rue Paul Séjourné 94000 Créteil France</p>
                <p>01 43 77 28 07</p>
              </div>
            </div>
            </div>
          </div>
          
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowRejectModal(true)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                ❌ Rejeter
              </button>
              <button 
                onClick={saveReportPDF}
                className={`px-6 py-3 rounded-lg font-medium ${savedReportUrl ? 'bg-green-100 text-green-700' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              >
                {savedReportUrl ? '✓ Rapport enregistré' : '💾 Enregistrer le Rapport PDF'}
              </button>
              {savedReportUrl && (
                <a href={savedReportUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">📄 Voir PDF</a>
              )}
            </div>
            <button onClick={() => setStep(2)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              Rapport OK → Voir Certificat
            </button>
          </div>
        </div>
      </div>
      
      {/* Step 2: Certificate */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-center mb-6">
              <p className="text-6xl mb-4">📜</p>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {device.service_type === 'repair' ? 'Documents de Réparation' : 'Certificat d\'Étalonnage'}
              </h2>
              <p className="text-gray-500">Vérifiez que le document est correct et complet</p>
            </div>
            
            {device.calibration_certificate_url ? (
              <div className="space-y-4">
                {/* PDF Embed */}
                <div className="bg-gray-100 rounded-xl overflow-hidden" style={{ height: '600px' }}>
                  <iframe 
                    src={device.calibration_certificate_url} 
                    className="w-full h-full"
                    title="Certificat d'étalonnage"
                  />
                </div>
                <div className="text-center">
                  <a href={device.calibration_certificate_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    📄 Ouvrir dans un nouvel onglet
                  </a>
                </div>
              </div>
            ) : device.service_type === 'repair' ? (
              <div className="bg-gray-100 rounded-xl p-12 text-center">
                <p className="text-gray-600">Réparation - pas de certificat d'étalonnage requis</p>
                <p className="text-sm text-gray-400 mt-2">Vérifiez le rapport de service à l'étape précédente</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                <p className="text-red-600 font-medium">⚠️ Certificat non téléchargé</p>
                <p className="text-sm text-red-500 mt-2">Le technicien doit télécharger le certificat avant validation QC</p>
              </div>
            )}
            
            <p className="text-sm text-gray-500 mt-4 text-center">
              Vérifiez: Nom client, N° série, Date, Tolérances, Signatures
            </p>
          </div>
          
          <div className="flex justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
                ← Retour au Rapport
              </button>
              <button 
                onClick={() => setShowRejectModal(true)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                ❌ Rejeter
              </button>
            </div>
            <button onClick={() => setStep(3)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              {device.calibration_certificate_url || device.service_type === 'repair' ? 'Document OK → Validation' : 'Continuer →'}
            </button>
          </div>
        </div>
      )}
      
      {/* Step 3: Approve */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-center mb-8">
              <p className="text-6xl mb-4">✅</p>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Validation Finale</h2>
              <p className="text-gray-500">Confirmez que tous les documents sont corrects</p>
            </div>
            
            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-gray-700 mb-4">Résumé</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Client:</span> <span className="font-medium">{rma.companies?.name}</span></div>
                <div><span className="text-gray-500">RMA:</span> <span className="font-medium text-blue-600">{rma.request_number}</span></div>
                <div><span className="text-gray-500">Appareil:</span> <span className="font-medium">{device.model_name}</span></div>
                <div><span className="text-gray-500">N° Série:</span> <span className="font-medium font-mono">{device.serial_number}</span></div>
                <div><span className="text-gray-500">Service:</span> <span className="font-medium">{serviceTypeText}</span></div>
                <div><span className="text-gray-500">Technicien:</span> <span className="font-medium">{device.technician_name || '—'}</span></div>
              </div>
            </div>
            
            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes QC (optionnel)</label>
              <textarea 
                value={qcNotes}
                onChange={e => setQcNotes(e.target.value)}
                placeholder="Remarques ou observations..."
                className="w-full px-4 py-3 border rounded-xl h-20 resize-none"
              />
            </div>
            
            {/* Checkmarks */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-green-700">
                <span className="text-xl">✓</span>
                <span>Rapport de service vérifié</span>
              </div>
              <div className="flex items-center gap-3 text-green-700">
                <span className="text-xl">✓</span>
                <span>Certificat d'étalonnage vérifié</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
                ← Retour
              </button>
              <button 
                onClick={() => setShowRejectModal(true)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                ❌ Rejeter
              </button>
            </div>
            {!device.qc_complete ? (
              <button 
                onClick={approveQC} 
                disabled={saving}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-lg disabled:opacity-50"
              >
                {saving ? 'Validation...' : '✓ J\'approuve - Prêt pour expédition'}
              </button>
            ) : (
              <span className="px-6 py-3 bg-green-100 text-green-700 rounded-lg font-medium">✓ Déjà validé</span>
            )}
          </div>
        </div>
      )}
      
      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">❌ Rejeter le Contrôle Qualité</h3>
            <p className="text-gray-600 mb-4">
              Indiquez la raison du rejet. Le technicien verra ces notes et devra corriger le problème.
            </p>
            <textarea 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Décrivez les problèmes à corriger..."
              className="w-full border rounded-lg p-3 h-32 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Annuler
              </button>
              <button 
                onClick={rejectQC}
                disabled={saving || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Rejet...' : 'Confirmer le Rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CONTRACTS SHEET - Full Implementation
// ============================================
function ContractsSheet({ clients, notify, profile, reloadMain }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [quoteContract, setQuoteContract] = useState(null); // For opening quote editor
  const [reviewingContractBC, setReviewingContractBC] = useState(null); // For BC review modal
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contracts')
      .select('*, companies(*), contract_devices(*)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading contracts:', error);
      notify('Erreur de chargement des contrats', 'error');
    } else {
      setContracts(data || []);
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const CONTRACT_STATUS_STYLES = {
    requested: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🆕 Nouvelle demande' },
    modification_requested: { bg: 'bg-orange-100', text: 'text-orange-700', label: '✏️ Modification demandée' },
    refused: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Refusé' },
    quote_sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: '📧 Devis envoyé' },
    quote_approved: { bg: 'bg-purple-100', text: 'text-purple-700', label: '✅ Devis approuvé' },
    bc_pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: '📄 Attente BC' },
    active: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Actif' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: '⏰ Expiré' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Annulé' }
  };

  const getStatusBadge = (status) => {
    const style = CONTRACT_STATUS_STYLES[status] || CONTRACT_STATUS_STYLES.requested;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span>;
  };

  // Separate new requests from processed contracts
  // Only 'requested' shows in the new requests queue
  // modification_requested and refused go to processed section
  const newRequests = contracts.filter(c => c.status === 'requested');
  const processedContracts = contracts.filter(c => c.status !== 'requested');
  
  // Filter processed contracts
  const filteredContracts = processedContracts.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'active') return c.status === 'active';
    if (filter === 'pending') return ['quote_sent', 'quote_approved', 'bc_pending', 'modification_requested', 'refused'].includes(c.status);
    if (filter === 'expired') return c.status === 'expired';
    return true;
  });

  const stats = {
    pending: processedContracts.filter(c => ['quote_sent', 'quote_approved', 'bc_pending', 'modification_requested', 'refused'].includes(c.status)).length,
    active: processedContracts.filter(c => c.status === 'active').length,
    expired: processedContracts.filter(c => c.status === 'expired').length
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Contract Detail View
  if (selectedContract) {
    return (
      <ContractDetailView 
        contract={selectedContract}
        clients={clients}
        notify={notify}
        onClose={() => setSelectedContract(null)}
        onUpdate={() => { loadContracts(); if (reloadMain) reloadMain(); }}
      />
    );
  }
  
  // Contract Quote Editor
  if (quoteContract) {
    return (
      <ContractQuoteEditor
        contract={quoteContract}
        profile={profile}
        notify={notify}
        onClose={() => setQuoteContract(null)}
        onSent={() => { setQuoteContract(null); loadContracts(); if (reloadMain) reloadMain(); }}
      />
    );
  }
  
  // Contract BC Review Modal - render on top of main view
  const contractBCModal = reviewingContractBC && (
    <ContractBCReviewModal 
      contract={reviewingContractBC}
      onClose={() => setReviewingContractBC(null)}
      notify={notify}
      reload={() => { loadContracts(); if (reloadMain) reloadMain(); }}
    />
  );
  
  // Manual Contract Creation
  if (showCreateModal) {
    return (
      <CreateContractModal
        clients={clients}
        notify={notify}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { setShowCreateModal(false); loadContracts(); if (reloadMain) reloadMain(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* BC Review Modal - renders on top */}
      {contractBCModal}
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Contrats d'Étalonnage</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium flex items-center gap-2"
        >
          <span>+</span> Créer Contrat Manuellement
        </button>
      </div>
      
      {/* ============================================ */}
      {/* BC À VÉRIFIER - Top Priority */}
      {/* ============================================ */}
      {(() => {
        const bcPendingContracts = contracts.filter(c => c.status === 'bc_pending');
        if (bcPendingContracts.length === 0) return null;
        return (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg">
            <div className="px-6 py-4 border-b border-red-200 bg-red-100 rounded-t-xl">
              <h2 className="font-bold text-red-800 text-lg">⚠️ BC Contrats à Vérifier ({bcPendingContracts.length})</h2>
              <p className="text-sm text-red-600">Vérifiez le BC et activez le contrat</p>
            </div>
            <div className="p-4 space-y-3">
              {bcPendingContracts.map(contract => (
                <div key={contract.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm border border-red-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                    <div>
                      <span className="font-mono font-bold text-[#00A651]">{contract.contract_number}</span>
                      <p className="font-medium text-gray-800">{contract.companies?.name || contract.company_name_manual}</p>
                      <p className="text-sm text-gray-500">
                        BC soumis le {contract.bc_submitted_at ? new Date(contract.bc_submitted_at).toLocaleDateString('fr-FR') : '—'}
                        {contract.bc_signed_by && <span className="ml-2">• Signé par: {contract.bc_signed_by}</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReviewingContractBC(contract)}
                    className="px-6 py-3 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-bold"
                  >
                    📋 Vérifier BC & Activer
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      
      {/* ============================================ */}
      {/* NOUVELLES DEMANDES DE CONTRAT - Top Priority */}
      {/* ============================================ */}
      {newRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-amber-200 bg-amber-100 rounded-t-xl">
            <h2 className="font-bold text-amber-800 text-lg">🆕 Nouvelles Demandes de Contrat ({newRequests.length})</h2>
            <p className="text-sm text-amber-600">Cliquez sur "Créer Devis Contrat" pour établir le devis</p>
          </div>
          <div className="p-4 space-y-3">
            {newRequests.map(contract => {
              const devices = contract.contract_devices || [];
              return (
                <div key={contract.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm border border-amber-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">📋</div>
                    <div>
                      <p className="font-medium text-gray-800">{contract.companies?.name || 'Client'}</p>
                      <p className="text-sm text-gray-500">
                        {devices.length} appareil(s) • Demandé le {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-xs text-gray-400">
                        Période souhaitée: {new Date(contract.start_date).toLocaleDateString('fr-FR')} - {new Date(contract.end_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setQuoteContract(contract)}
                    className="px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium"
                  >
                    💰 Créer Devis Contrat
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div 
          onClick={() => setFilter('pending')}
          className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'pending' ? 'ring-2 ring-blue-400' : ''}`}
        >
          <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">En cours</div>
        </div>
        <div 
          onClick={() => setFilter('active')}
          className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'active' ? 'ring-2 ring-green-400' : ''}`}
        >
          <div className="text-3xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Actifs</div>
        </div>
        <div 
          onClick={() => setFilter('expired')}
          className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'expired' ? 'ring-2 ring-gray-400' : ''}`}
        >
          <div className="text-3xl font-bold text-gray-600">{stats.expired}</div>
          <div className="text-sm text-gray-600">Expirés</div>
        </div>
        <div 
          onClick={() => setFilter('all')}
          className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'all' ? 'ring-2 ring-purple-400' : ''}`}
        >
          <div className="text-3xl font-bold text-purple-600">{processedContracts.length}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-800">
            {filter === 'all' ? 'Tous les contrats' : 
             filter === 'pending' ? 'En cours de traitement' :
             filter === 'active' ? 'Contrats actifs' : 'Contrats expirés'}
          </h2>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="text-sm text-gray-500 hover:text-gray-700">
              Voir tout
            </button>
          )}
        </div>
        
        {filteredContracts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-2">📄</p>
            <p>Aucun contrat trouvé</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600">N° Contrat</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600">Client</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600">Période</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600">Appareils</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredContracts.map(contract => {
                const devices = contract.contract_devices || [];
                const totalTokens = devices.reduce((sum, d) => sum + (d.tokens_total || 0), 0);
                const usedTokens = devices.reduce((sum, d) => sum + (d.tokens_used || 0), 0);
                
                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-[#1E3A5F]">{contract.contract_number || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{contract.companies?.name || contract.company_name_manual || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(contract.start_date).toLocaleDateString('fr-FR')} - {new Date(contract.end_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold">{devices.length}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${usedTokens >= totalTokens ? 'text-red-600' : 'text-green-600'}`}>
                        {totalTokens - usedTokens}/{totalTokens}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(contract.status)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedContract(contract)}
                        className="px-3 py-1 bg-[#3B7AB4] text-white text-sm rounded hover:bg-[#1E3A5F]"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


// ============================================
// CONTRACT QUOTE EDITOR - Matches RMA Quote Style
// ============================================
function ContractQuoteEditor({ contract, profile, notify, onClose, onSent }) {
  const [step, setStep] = useState(1); // 1=Edit, 2=Preview, 3=Confirm
  const [saving, setSaving] = useState(false);
  const [quoteRef, setQuoteRef] = useState('');
  const today = new Date();
  
  const signatory = profile?.full_name || 'Lighthouse France';
  
  // Contract dates
  const [contractDates, setContractDates] = useState({
    start_date: contract.start_date || new Date().toISOString().split('T')[0],
    end_date: contract.end_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });
  
  // Shipping data (same as RMA)
  const [shippingData, setShippingData] = useState({
    parcels: 1,
    unitPrice: 45,
    total: 45,
    partNumber: '1200199-1'
  });
  
  // Initialize pricing for each device - matching RMA structure
  const [devicePricing, setDevicePricing] = useState(
    (contract.contract_devices || []).map(d => {
      const isParticleCounter = (d.device_type || 'particle_counter') === 'particle_counter';
      return {
        id: d.id,
        serial: d.serial_number,
        model: d.model_name || '',
        deviceType: d.device_type || 'particle_counter',
        tokens_total: d.tokens_total || 1,
        needsCalibration: true,
        calibrationPrice: d.unit_price || 350,
        calibrationQty: 1,
        needsNettoyage: isParticleCounter,
        nettoyagePrice: isParticleCounter ? 150 : 0,
        nettoyageQty: 1,
        additionalParts: [],
        isContractCovered: false
      };
    })
  );

  useEffect(() => {
    const year = today.getFullYear().toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setQuoteRef(`CTR/${year}${month}/XXX`);
  }, []);

  // Update shipping total when parcels change
  useEffect(() => {
    setShippingData(prev => ({ ...prev, total: prev.parcels * prev.unitPrice }));
  }, [shippingData.parcels]);

  const updateDevice = (id, field, value) => {
    setDevicePricing(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  // Calculate totals like RMA
  const getDeviceTotal = (d) => {
    let total = 0;
    if (d.needsCalibration) total += (d.calibrationQty || 1) * (d.calibrationPrice || 0);
    if (d.needsNettoyage) total += (d.nettoyageQty || 1) * (d.nettoyagePrice || 0);
    return total;
  };
  
  const servicesSubtotal = devicePricing.reduce((sum, d) => sum + getDeviceTotal(d), 0);
  const shippingTotal = shippingData.total;
  const grandTotal = servicesSubtotal + shippingTotal;
  const totalTokens = devicePricing.reduce((sum, d) => sum + (parseInt(d.tokens_total) || 0), 0);
  const hasNettoyage = devicePricing.some(d => d.needsNettoyage && d.nettoyagePrice > 0);

  const getDeviceTypeLabel = (type) => {
    const labels = {
      particle_counter: 'Compteur Particules Aéroportées',
      bio_collector: 'Bio Collecteur',
      liquid_counter: 'Compteur Particules Liquide',
      temp_humidity: 'Capteur Temp/Humidité',
      other: 'Autre Équipement'
    };
    return labels[type] || type;
  };

  const sendQuote = async () => {
    setSaving(true);
    try {
      // Generate contract number if not exists
      let contractNumber = contract.contract_number;
      if (!contractNumber) {
        const year = new Date().getFullYear();
        const { data: existing } = await supabase
          .from('contracts')
          .select('contract_number')
          .like('contract_number', `CTR-${year}-%`)
          .order('contract_number', { ascending: false })
          .limit(1);
        const lastNum = existing?.[0]?.contract_number 
          ? parseInt(existing[0].contract_number.split('-')[2]) 
          : 0;
        contractNumber = `CTR-${year}-${String(lastNum + 1).padStart(3, '0')}`;
      }

      // Build quote_data in same format as RMA
      const quoteData = {
        devices: devicePricing.map(d => ({
          id: d.id,
          serial: d.serial,
          model: d.model,
          deviceType: d.deviceType,
          tokens_total: d.tokens_total,
          needsCalibration: d.needsCalibration,
          calibrationPrice: d.calibrationPrice,
          calibrationQty: d.calibrationQty || 1,
          needsNettoyage: d.needsNettoyage,
          nettoyagePrice: d.nettoyagePrice,
          nettoyageQty: d.nettoyageQty || 1,
          additionalParts: d.additionalParts || [],
          isContractCovered: false
        })),
        shipping: shippingData,
        servicesSubtotal: servicesSubtotal,
        shippingTotal: shippingTotal,
        grandTotal: grandTotal,
        totalTokens: totalTokens,
        contractDates: contractDates,
        createdBy: signatory,
        createdAt: new Date().toISOString()
      };

      // Update contract with all quote data
      const { error: updateError } = await supabase.from('contracts').update({
        contract_number: contractNumber,
        start_date: contractDates.start_date,
        end_date: contractDates.end_date,
        status: 'quote_sent',
        quote_subtotal: servicesSubtotal,
        quote_shipping: shippingTotal,
        quote_total: grandTotal,
        quote_data: quoteData,
        quote_sent_at: new Date().toISOString()
      }).eq('id', contract.id);

      if (updateError) throw updateError;

      // Update device pricing in contract_devices
      for (const d of devicePricing) {
        await supabase.from('contract_devices').update({
          tokens_total: d.tokens_total,
          unit_price: d.calibrationPrice
        }).eq('id', d.id);
      }

      notify(`✅ Devis contrat envoyé! N° ${contractNumber}`);
      onSent();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">← Retour</button>
        <h1 className="text-2xl font-bold text-gray-800">Créer Devis Contrat</h1>
        <div className="flex gap-1 ml-4">
          {[1,2,3].map(s => (
            <div key={s} className={`w-8 h-2 rounded-full ${step >= s ? 'bg-[#00A651]' : 'bg-gray-300'}`} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1a2e] text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">
              {step === 1 && 'Tarification du Contrat'}
              {step === 2 && 'Aperçu du Devis'}
              {step === 3 && 'Confirmer l\'envoi'}
            </h2>
            <p className="text-gray-300">{contract.companies?.name} • {devicePricing.length} appareil(s)</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total HT</p>
            <p className="text-2xl font-bold text-[#00A651]">{grandTotal.toFixed(2)} €</p>
          </div>
        </div>

        {/* Step 1: Pricing - RMA Style */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            {/* Client Info - Full Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-blue-600 uppercase font-medium">Client</p>
                  <p className="font-bold text-xl text-[#1a1a2e]">{contract.companies?.name}</p>
                  {contract.companies?.contact_name && (
                    <p className="text-gray-600">Contact: {contract.companies.contact_name}</p>
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
                  {contract.companies?.email && (
                    <p className="text-gray-600 text-sm">{contract.companies.email}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Demandé le</p>
                  <p className="font-medium">{new Date(contract.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>

            {/* Contract Dates */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-sm text-gray-500 block mb-1">Date début contrat</label>
                <input
                  type="date"
                  value={contractDates.start_date}
                  onChange={e => setContractDates({...contractDates, start_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-sm text-gray-500 block mb-1">Date fin contrat</label>
                <input
                  type="date"
                  value={contractDates.end_date}
                  onChange={e => setContractDates({...contractDates, end_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Devices Pricing - RMA Style with Nettoyage */}
            <div>
              <h3 className="font-bold text-gray-800 mb-4">Tarification par Appareil</h3>
              <div className="space-y-4">
                {devicePricing.map((device, index) => (
                  <div key={device.id} className="bg-gray-50 rounded-lg p-4 border">
                    {/* Device Header */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                      <span className="bg-[#1a1a2e] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</span>
                      <div>
                        <p className="font-bold">{device.model || 'Appareil'}</p>
                        <p className="text-sm text-gray-500">SN: {device.serial} • {getDeviceTypeLabel(device.deviceType)}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-xs text-gray-500">Sous-total</p>
                        <p className="font-bold text-[#00A651]">{getDeviceTotal(device).toFixed(2)} €</p>
                      </div>
                    </div>

                    {/* Calibration Row */}
                    <div className="grid grid-cols-4 gap-4 items-center mb-3">
                      <div className="col-span-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={device.needsCalibration}
                            onChange={e => updateDevice(device.id, 'needsCalibration', e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="font-medium">Étalonnage</span>
                        </label>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Qté/an</label>
                        <input
                          type="number"
                          value={device.tokens_total}
                          onChange={e => {
                            updateDevice(device.id, 'tokens_total', parseInt(e.target.value) || 1);
                            updateDevice(device.id, 'calibrationQty', parseInt(e.target.value) || 1);
                          }}
                          className="w-full px-3 py-2 border rounded-lg"
                          min="1"
                          disabled={!device.needsCalibration}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Prix € HT</label>
                        <input
                          type="number"
                          value={device.calibrationPrice}
                          onChange={e => updateDevice(device.id, 'calibrationPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border rounded-lg"
                          min="0"
                          step="0.01"
                          disabled={!device.needsCalibration}
                        />
                      </div>
                    </div>

                    {/* Nettoyage Row - Only for particle counters */}
                    {device.deviceType === 'particle_counter' && (
                      <div className="grid grid-cols-4 gap-4 items-center bg-amber-50 rounded-lg p-3 -mx-1">
                        <div className="col-span-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={device.needsNettoyage}
                              onChange={e => updateDevice(device.id, 'needsNettoyage', e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="font-medium text-amber-800">Nettoyage cellule</span>
                            <span className="text-xs text-amber-600">(si requis selon état)</span>
                          </label>
                        </div>
                        <div>
                          <input
                            type="number"
                            value={device.nettoyageQty}
                            onChange={e => updateDevice(device.id, 'nettoyageQty', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border rounded-lg bg-white"
                            min="1"
                            disabled={!device.needsNettoyage}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={device.nettoyagePrice}
                            onChange={e => updateDevice(device.id, 'nettoyagePrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border rounded-lg bg-white"
                            min="0"
                            step="0.01"
                            disabled={!device.needsNettoyage}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping - Same as RMA */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-3">📦 Frais de Port</h3>
              <div className="grid grid-cols-4 gap-4 items-center">
                <div className="col-span-2">
                  <p className="text-sm text-blue-700">Transport aller-retour France métropolitaine</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Nb colis</label>
                  <input
                    type="number"
                    value={shippingData.parcels}
                    onChange={e => setShippingData({...shippingData, parcels: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Prix/colis</label>
                  <input
                    type="number"
                    value={shippingData.unitPrice}
                    onChange={e => setShippingData({...shippingData, unitPrice: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="text-right mt-2">
                <span className="text-blue-800 font-bold">{shippingTotal.toFixed(2)} € HT</span>
              </div>
            </div>

            {/* Grand Total Summary */}
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-emerald-800 font-medium">{devicePricing.length} appareil(s)</span>
                  <span className="text-emerald-600 mx-3">•</span>
                  <span className="text-emerald-800">{totalTokens} étalonnage(s)/an</span>
                  {hasNettoyage && (
                    <>
                      <span className="text-emerald-600 mx-3">•</span>
                      <span className="text-amber-700">+ Nettoyage</span>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-emerald-600">Total HT</p>
                  <p className="text-2xl font-bold text-emerald-800">{grandTotal.toFixed(2)} €</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview - Multi-Page A4 Layout */}
        {step === 2 && (() => {
          // Get unique device types for service description blocks
          const deviceTypes = [...new Set(devicePricing.map(d => d.deviceType))];
          
          // Service description templates
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

          // Build content blocks for pagination
          const contentBlocks = [];
          
          // Block: Client Info - Full details
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
                {contract.companies?.country && (
                  <p className="text-gray-600 text-sm">{contract.companies.country}</p>
                )}
                {contract.companies?.phone && (
                  <p className="text-gray-600 text-sm">Tél: {contract.companies.phone}</p>
                )}
                {contract.companies?.email && (
                  <p className="text-gray-600 text-sm">{contract.companies.email}</p>
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

          // Block: Combined Conditions (standard + contract)
          contentBlocks.push({
            type: 'conditions',
            height: 80,
            render: () => (
              <div className="px-6 py-3 border-b bg-gray-50">
                <p className="text-xs text-gray-500 uppercase mb-1">Conditions</p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  <li>• Période du contrat: {new Date(contractDates.start_date).toLocaleDateString('fr-FR')} au {new Date(contractDates.end_date).toLocaleDateString('fr-FR')}</li>
                  <li>• {totalTokens} étalonnage(s) inclus pendant la période contractuelle</li>
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

          // Block: Device rows (each device + its nettoyage as one block)
          devicePricing.forEach((device, idx) => {
            contentBlocks.push({
              type: 'device',
              device: device,
              index: idx,
              height: device.needsNettoyage && device.nettoyagePrice > 0 ? 60 : 32,
              render: () => (
                <div className="px-6">
                  <table className="w-full">
                    <tbody>
                      {device.needsCalibration && (
                        <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 text-center text-sm w-12">{device.tokens_total}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className="font-medium">Étalonnage {device.model}</span>
                            <span className="text-gray-500 text-xs ml-1">(SN: {device.serial})</span>
                          </td>
                          <td className="px-3 py-2 text-right text-sm w-20">{device.calibrationPrice.toFixed(2)} €</td>
                          <td className="px-3 py-2 text-right text-sm font-medium w-20">{(device.tokens_total * device.calibrationPrice).toFixed(2)} €</td>
                        </tr>
                      )}
                      {device.needsNettoyage && device.nettoyagePrice > 0 && (
                        <tr className="bg-amber-50">
                          <td className="px-3 py-2 text-center text-sm w-12">{device.nettoyageQty}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className="font-medium text-amber-800">Nettoyage cellule</span>
                            <span className="text-amber-600 text-xs ml-1">- si requis ({device.model})</span>
                          </td>
                          <td className="px-3 py-2 text-right text-sm w-20">{device.nettoyagePrice.toFixed(2)} €</td>
                          <td className="px-3 py-2 text-right text-sm font-medium w-20">{(device.nettoyageQty * device.nettoyagePrice).toFixed(2)} €</td>
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
                      <td className="px-3 py-2 text-center text-sm w-12">{shippingData.parcels}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className="font-medium text-blue-800">Frais de port</span>
                        <span className="text-blue-600 text-xs ml-1">({shippingData.parcels} colis)</span>
                      </td>
                      <td className="px-3 py-2 text-right text-sm w-20">{shippingData.unitPrice.toFixed(2)} €</td>
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
                      <td className="px-3 py-2 text-right font-bold text-sm w-20">{grandTotal.toFixed(2)} €</td>
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

          // Block: Signature (always last) - with larger Capcert logo
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
                      <p className="font-bold text-lg">{signatory}</p>
                      <p className="text-gray-500 text-sm">Lighthouse France</p>
                    </div>
                    <img 
                      src="/images/logos/capcert-logo.png" 
                      alt="Capcert" 
                      className="h-24 w-auto"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase mb-1">Bon pour accord</p>
                    <div className="w-44 h-16 border-2 border-dashed border-gray-300 rounded"></div>
                    <p className="text-xs text-gray-400 mt-1">Signature et cachet</p>
                  </div>
                </div>
              </div>
            )
          });

          // Paginate content - A4 page height ~1050px usable (excluding header/footer)
          const PAGE_CONTENT_HEIGHT = 680; // px available per page for content
          const pages = [];
          let currentPage = { blocks: [], usedHeight: 0 };
          
          // Separate signature block (always goes last)
          const signatureBlock = contentBlocks.find(b => b.type === 'signature');
          const otherBlocks = contentBlocks.filter(b => b.type !== 'signature');
          
          otherBlocks.forEach(block => {
            if (currentPage.usedHeight + block.height > PAGE_CONTENT_HEIGHT) {
              // Start new page
              pages.push(currentPage);
              currentPage = { blocks: [], usedHeight: 0 };
            }
            currentPage.blocks.push(block);
            currentPage.usedHeight += block.height;
          });
          
          // Add signature to last page (or new page if no room)
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

          // Page Header Component - with more spacing after
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
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="hidden">
                    <span className="text-xl font-bold text-[#1a1a2e]">LIGHTHOUSE</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#00A651]">DEVIS CONTRAT</p>
                  <p className="text-gray-500 text-sm">{quoteRef}</p>
                </div>
              </div>
              {pageNum === 1 && (
                <div className="bg-gray-100 px-6 py-2 flex justify-between text-xs border-t">
                  <div>
                    <span className="text-gray-500">Date: </span>
                    <span className="font-medium">{today.toLocaleDateString('fr-FR')}</span>
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

          // Page Footer Component - centered
          const PageFooter = ({ pageNum, totalPages }) => (
            <div className="bg-[#1a1a2e] text-white px-6 py-3 text-center text-xs">
              <p>Lighthouse France SAS • 16, rue Paul Séjourné • 94000 CRÉTEIL • Tél. 01 43 77 28 07</p>
              <p className="font-medium mt-1">Page {pageNum}/{totalPages}</p>
            </div>
          );

          return (
            <div className="p-6 bg-gray-300 min-h-full">
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
                    {/* Page Header */}
                    <PageHeader pageNum={pageIdx + 1} />
                    
                    {/* Page Content */}
                    <div className="flex-1">
                      {page.blocks.map((block, blockIdx) => (
                        <div key={blockIdx}>
                          {block.render()}
                        </div>
                      ))}
                    </div>
                    
                    {/* Page Footer */}
                    <PageFooter pageNum={pageIdx + 1} totalPages={totalPages} />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="p-6 text-center">
            <div className="max-w-md mx-auto">
              <p className="text-6xl mb-4">📧</p>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Prêt à envoyer</h3>
              <p className="text-gray-600 mb-6">
                Le devis de contrat sera envoyé au client {contract.companies?.name}.
                <br />Montant total: <strong className="text-[#00A651]">{grandTotal.toFixed(2)} € HT</strong>
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-600">
                  <strong>Période:</strong> {new Date(contractDates.start_date).toLocaleDateString('fr-FR')} - {new Date(contractDates.end_date).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Appareils:</strong> {devicePricing.length}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Étalonnages inclus:</strong> {totalTokens}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Retour
              </button>
            )}
            {step === 1 && (
              <>
                {/* Refuse/Modification/Delete buttons only on step 1 */}
                <button
                  onClick={async () => {
                    const reason = window.prompt('Raison de la demande de modification:\n(Ce message sera visible par le client)');
                    if (reason && reason.trim()) {
                      setSaving(true);
                      try {
                        const { error } = await supabase.from('contracts').update({
                          status: 'modification_requested',
                          admin_notes: reason.trim(),
                          updated_at: new Date().toISOString()
                        }).eq('id', contract.id);
                        
                        if (error) throw error;
                        
                        notify('✅ Demande de modification envoyée au client', 'success');
                        if (onSent) onSent();
                        onClose();
                      } catch (err) {
                        console.error('Error updating contract:', err);
                        notify('Erreur: ' + err.message, 'error');
                      }
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="px-3 py-2 border border-amber-500 text-amber-600 rounded-lg hover:bg-amber-50 text-sm"
                >
                  ✏️ Demander modif
                </button>
                <button
                  onClick={async () => {
                    const reason = window.prompt('Raison du refus:\n(Ce message sera visible par le client)');
                    if (reason && reason.trim()) {
                      setSaving(true);
                      try {
                        const { error } = await supabase.from('contracts').update({
                          status: 'refused',
                          admin_notes: reason.trim(),
                          updated_at: new Date().toISOString()
                        }).eq('id', contract.id);
                        
                        if (error) throw error;
                        
                        notify('❌ Demande de contrat refusée', 'success');
                        if (onSent) onSent();
                        onClose();
                      } catch (err) {
                        console.error('Error updating contract:', err);
                        notify('Erreur: ' + err.message, 'error');
                      }
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                >
                  ❌ Refuser
                </button>
                <button
                  onClick={async () => {
                    const confirmation = window.prompt('⚠️ SUPPRIMER cette demande de contrat?\n\nTapez "SUPPRIMER" pour confirmer:');
                    if (confirmation === 'SUPPRIMER') {
                      setSaving(true);
                      try {
                        // Get contract device IDs
                        const { data: contractDevices } = await supabase
                          .from('contract_devices')
                          .select('id')
                          .eq('contract_id', contract.id);
                        
                        const contractDeviceIds = (contractDevices || []).map(d => d.id);
                        
                        // Clear references
                        if (contractDeviceIds.length > 0) {
                          await supabase
                            .from('request_devices')
                            .update({ contract_device_id: null })
                            .in('contract_device_id', contractDeviceIds);
                        }
                        await supabase
                          .from('service_requests')
                          .update({ contract_id: null })
                          .eq('contract_id', contract.id);
                        
                        // Delete devices and contract
                        await supabase.from('contract_devices').delete().eq('contract_id', contract.id);
                        const { error } = await supabase.from('contracts').delete().eq('id', contract.id);
                        
                        if (error) throw error;
                        
                        notify('🗑️ Demande supprimée', 'success');
                        if (onSent) onSent();
                        onClose();
                      } catch (err) {
                        console.error('Error deleting contract:', err);
                        notify('Erreur: ' + err.message, 'error');
                      }
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  🗑️ Supprimer
                </button>
              </>
            )}
          </div>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Annuler
            </button>
            {step < 3 && (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008f45]"
              >
                {step === 1 ? 'Aperçu →' : 'Confirmer →'}
              </button>
            )}
            {step === 3 && (
              <button
                onClick={sendQuote}
                disabled={saving}
                className="px-6 py-2 bg-[#00A651] text-white rounded-lg font-medium hover:bg-[#008f45] disabled:opacity-50"
              >
                {saving ? 'Envoi...' : '✅ Envoyer le Devis'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================
// CONTRACT DETAIL VIEW
// ============================================
function ContractDetailView({ contract, clients, notify, onClose, onUpdate }) {
  const [editMode, setEditMode] = useState(contract.status === 'requested');
  const [saving, setSaving] = useState(false);
  const [devices, setDevices] = useState(contract.contract_devices || []);
  const [contractData, setContractData] = useState({
    start_date: contract.start_date || new Date().toISOString().split('T')[0],
    end_date: contract.end_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    internal_notes: contract.internal_notes || ''
  });
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Check for existing active contracts for this client
  const [existingContracts, setExistingContracts] = useState([]);
  
  useEffect(() => {
    const checkExisting = async () => {
      if (!contract.company_id) return;
      const { data } = await supabase
        .from('contracts')
        .select('id, contract_number, start_date, end_date, status')
        .eq('company_id', contract.company_id)
        .eq('status', 'active')
        .neq('id', contract.id);
      setExistingContracts(data || []);
    };
    checkExisting();
  }, [contract.company_id, contract.id]);

  const updateDevice = (deviceId, field, value) => {
    setDevices(devices.map(d => d.id === deviceId ? { ...d, [field]: value } : d));
  };

  const saveDeviceChanges = async () => {
    setSaving(true);
    try {
      // Update contract dates and notes
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          internal_notes: contractData.internal_notes
        })
        .eq('id', contract.id);

      if (contractError) throw contractError;

      // Update each device
      for (const device of devices) {
        const { error } = await supabase
          .from('contract_devices')
          .update({
            tokens_total: device.tokens_total,
            unit_price: device.unit_price
          })
          .eq('id', device.id);
        
        if (error) throw error;
      }

      notify('Modifications enregistrées', 'success');
      setEditMode(false);
      onUpdate();
    } catch (err) {
      console.error('Error saving:', err);
      notify('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateContractStatus = async (newStatus) => {
    setSaving(true);
    try {
      const updates = { status: newStatus };
      
      if (newStatus === 'active') {
        updates.bc_approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contract.id);

      if (error) throw error;

      notify(`Statut mis à jour: ${newStatus}`, 'success');
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error updating status:', err);
      notify('Erreur lors de la mise à jour', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalPrice = devices.reduce((sum, d) => sum + (parseFloat(d.unit_price) || 0), 0);
  const totalTokens = devices.reduce((sum, d) => sum + (parseInt(d.tokens_total) || 0), 0);

  const CONTRACT_STATUS_STYLES = {
    requested: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🆕 Nouvelle demande' },
    quote_sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: '📧 Devis envoyé' },
    quote_approved: { bg: 'bg-purple-100', text: 'text-purple-700', label: '✅ Devis approuvé' },
    bc_pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: '📄 Attente BC' },
    active: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Actif' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: '⏰ Expiré' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Annulé' }
  };

  const getStatusBadge = (status) => {
    const style = CONTRACT_STATUS_STYLES[status] || CONTRACT_STATUS_STYLES.requested;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
      >
        ← Retour aux contrats
      </button>

      {/* Warning for existing active contracts */}
      {existingContracts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-800">Contrat existant détecté</h3>
              <p className="text-sm text-amber-700">
                Ce client a déjà {existingContracts.length} contrat(s) actif(s):
              </p>
              <ul className="text-sm text-amber-700 mt-1">
                {existingContracts.map(c => (
                  <li key={c.id}>• {c.contract_number} ({new Date(c.start_date).toLocaleDateString('fr-FR')} - {new Date(c.end_date).toLocaleDateString('fr-FR')})</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* BC REVIEW SECTION - Shows when client has submitted BC */}
      {contract.status === 'bc_pending' && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl">📄</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-orange-800">Bon de Commande à Vérifier</h2>
              <p className="text-orange-700">
                Le client a soumis son bon de commande. Vérifiez les documents et activez le contrat.
              </p>
              {contract.bc_submitted_at && (
                <p className="text-sm text-orange-600 mt-1">
                  Soumis le {new Date(contract.bc_submitted_at).toLocaleDateString('fr-FR')} à {new Date(contract.bc_submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  {contract.bc_signed_by && ` par ${contract.bc_signed_by}`}
                </p>
              )}
            </div>
          </div>
          
          {/* Documents */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Signed Quote PDF */}
            {contract.signed_quote_url && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600">✅</span>
                  </div>
                  <div>
                    <p className="font-bold text-green-800">Devis Signé</p>
                    <p className="text-xs text-green-600">PDF avec signature client</p>
                  </div>
                </div>
                <a
                  href={contract.signed_quote_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg text-center font-medium hover:bg-green-700"
                >
                  📥 Voir le Devis Signé
                </a>
              </div>
            )}
            
            {/* BC File */}
            {contract.bc_file_url && (
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600">📋</span>
                  </div>
                  <div>
                    <p className="font-bold text-purple-800">Bon de Commande</p>
                    <p className="text-xs text-purple-600">Document uploadé par le client</p>
                  </div>
                </div>
                <a
                  href={contract.bc_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-center font-medium hover:bg-purple-700"
                >
                  📥 Voir le BC
                </a>
              </div>
            )}
            
            {/* No documents */}
            {!contract.signed_quote_url && !contract.bc_file_url && (
              <div className="col-span-2 bg-white rounded-lg p-4 border border-gray-200 text-center text-gray-500">
                <p>Aucun document attaché (signature électronique uniquement)</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => updateContractStatus('active')}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008c44] disabled:opacity-50"
            >
              ✅ Approuver et Activer le Contrat
            </button>
            <button
              onClick={() => {
                const reason = window.prompt('Raison du rejet:');
                if (reason) {
                  // Update with rejection
                  supabase.from('contracts').update({
                    status: 'bc_rejected',
                    bc_rejection_reason: reason
                  }).eq('id', contract.id).then(() => {
                    notify('BC rejeté', 'success');
                    onUpdate();
                  });
                }
              }}
              disabled={saving}
              className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 disabled:opacity-50"
            >
              ❌ Rejeter
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">
              Contrat {contract.contract_number || '(En attente)'}
            </h1>
            <p className="text-gray-600">{contract.companies?.name}</p>
          </div>
          {getStatusBadge(contract.status)}
        </div>

        {/* Contract Period */}
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Date de début</label>
            {editMode ? (
              <input
                type="date"
                value={contractData.start_date}
                onChange={e => setContractData({...contractData, start_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            ) : (
              <p className="text-gray-900">{new Date(contract.start_date).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Date de fin</label>
            {editMode ? (
              <input
                type="date"
                value={contractData.end_date}
                onChange={e => setContractData({...contractData, end_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            ) : (
              <p className="text-gray-900">{new Date(contract.end_date).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Durée</label>
            <p className="text-gray-900">
              {Math.round((new Date(contractData.end_date) - new Date(contractData.start_date)) / (1000 * 60 * 60 * 24 * 30))} mois
            </p>
          </div>
        </div>

        {/* Customer Notes */}
        {contract.customer_notes && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-bold text-blue-800 text-sm mb-1">Notes du client:</h4>
            <p className="text-sm text-blue-700">{contract.customer_notes}</p>
          </div>
        )}

        {/* Internal Notes */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-1">Notes internes</label>
          {editMode ? (
            <textarea
              value={contractData.internal_notes}
              onChange={e => setContractData({...contractData, internal_notes: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Notes visibles uniquement par l'équipe..."
            />
          ) : (
            <p className="text-gray-600 text-sm">{contract.internal_notes || '—'}</p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#1E3A5F]">{devices.length}</div>
            <div className="text-sm text-gray-600">Appareils</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalTokens}</div>
            <div className="text-sm text-gray-600">Étalonnages inclus</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#3B7AB4]">{totalPrice.toFixed(2)} €</div>
            <div className="text-sm text-gray-600">Total HT</div>
          </div>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Appareils ({devices.length})</h2>
          {!editMode && contract.status !== 'active' && (
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              ✏️ Modifier
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">Surnom</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">N° Série</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">Modèle</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">Type</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-600">Prix unitaire</th>
                {contract.status === 'active' && (
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">Utilisés</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {devices.map((device, idx) => (
                <tr key={device.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm">{device.nickname || '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono">{device.serial_number}</td>
                  <td className="px-4 py-3 text-sm font-medium">{device.model_name}</td>
                  <td className="px-4 py-3 text-sm">
                    {device.device_type === 'particle_counter' && '🔬 Compteur Air'}
                    {device.device_type === 'bio_collector' && '🧫 Bio Collecteur'}
                    {device.device_type === 'liquid_counter' && '💧 Compteur Liquide'}
                    {device.device_type === 'temp_humidity' && '🌡️ Temp/Humidité'}
                    {device.device_type === 'other' && '📦 Autre'}
                    {!device.device_type && '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editMode ? (
                      <input
                        type="number"
                        min="1"
                        value={device.tokens_total || 2}
                        onChange={e => updateDevice(device.id, 'tokens_total', parseInt(e.target.value) || 2)}
                        className="w-16 px-2 py-1 border rounded text-center"
                      />
                    ) : (
                      <span className="font-bold">{device.tokens_total || 2}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editMode ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={device.unit_price || ''}
                        onChange={e => updateDevice(device.id, 'unit_price', e.target.value)}
                        className="w-24 px-2 py-1 border rounded text-right"
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="font-medium">{device.unit_price ? `${parseFloat(device.unit_price).toFixed(2)} €` : '—'}</span>
                    )}
                  </td>
                  {contract.status === 'active' && (
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${(device.tokens_used || 0) >= (device.tokens_total || 2) ? 'text-red-600' : 'text-green-600'}`}>
                        {device.tokens_used || 0}/{device.tokens_total || 2}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right font-bold">Total:</td>
                <td className="px-4 py-3 text-center font-bold text-green-600">{totalTokens}</td>
                <td className="px-4 py-3 text-right font-bold text-[#1E3A5F]">{totalPrice.toFixed(2)} €</td>
                {contract.status === 'active' && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap gap-3">
          {editMode && (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={saveDeviceChanges}
                disabled={saving}
                className="px-4 py-2 bg-[#00A651] text-white rounded-lg hover:bg-[#008c44] disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </>
          )}

          {!editMode && contract.status === 'requested' && (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 border border-[#3B7AB4] text-[#3B7AB4] rounded-lg hover:bg-blue-50"
              >
                ✏️ Définir les prix et tokens
              </button>
              <button
                onClick={() => setShowQuoteModal(true)}
                className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg hover:bg-[#1E3A5F]"
              >
                📧 Créer le devis
              </button>
              <button
                onClick={async () => {
                  const reason = window.prompt('Raison de la demande de modification:\n(Ce message sera visible par le client)');
                  if (reason) {
                    setSaving(true);
                    try {
                      await supabase.from('contracts').update({
                        status: 'modification_requested',
                        admin_notes: reason,
                        updated_at: new Date().toISOString()
                      }).eq('id', contract.id);
                      notify('Demande de modification envoyée au client', 'success');
                      onUpdate();
                    } catch (err) {
                      notify('Erreur: ' + err.message, 'error');
                    }
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-4 py-2 border border-amber-500 text-amber-600 rounded-lg hover:bg-amber-50"
              >
                ✏️ Demander modification
              </button>
              <button
                onClick={async () => {
                  const reason = window.prompt('Raison du refus:\n(Ce message sera visible par le client)');
                  if (reason) {
                    setSaving(true);
                    try {
                      await supabase.from('contracts').update({
                        status: 'refused',
                        admin_notes: reason,
                        updated_at: new Date().toISOString()
                      }).eq('id', contract.id);
                      notify('Demande de contrat refusée', 'success');
                      onUpdate();
                    } catch (err) {
                      notify('Erreur: ' + err.message, 'error');
                    }
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                ❌ Refuser la demande
              </button>
            </>
          )}

          {contract.status === 'modification_requested' && (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-4 mb-2">
              <p className="text-amber-800 font-medium">⏳ En attente de modification par le client</p>
              {contract.admin_notes && (
                <p className="text-amber-700 text-sm mt-1">Message: "{contract.admin_notes}"</p>
              )}
            </div>
          )}

          {contract.status === 'refused' && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-2">
              <p className="text-red-800 font-medium">❌ Demande refusée</p>
              {contract.admin_notes && (
                <p className="text-red-700 text-sm mt-1">Raison: "{contract.admin_notes}"</p>
              )}
            </div>
          )}

          {contract.status === 'quote_sent' && (
            <button
              onClick={() => updateContractStatus('quote_approved')}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              ✅ Marquer devis approuvé
            </button>
          )}

          {contract.status === 'quote_approved' && (
            <button
              onClick={() => updateContractStatus('bc_pending')}
              disabled={saving}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              📄 En attente du BC
            </button>
          )}

          {contract.status === 'bc_pending' && (
            <button
              onClick={() => updateContractStatus('active')}
              disabled={saving}
              className="px-4 py-2 bg-[#00A651] text-white rounded-lg hover:bg-[#008c44] disabled:opacity-50"
            >
              ✅ Activer le contrat
            </button>
          )}

          {contract.status !== 'cancelled' && contract.status !== 'active' && !editMode && (
            <button
              onClick={() => {
                if (window.confirm('Êtes-vous sûr de vouloir annuler ce contrat? Tapez "annuler contrat" pour confirmer.')) {
                  const confirmation = window.prompt('Tapez "annuler contrat" pour confirmer:');
                  if (confirmation?.toLowerCase() === 'annuler contrat') {
                    updateContractStatus('cancelled');
                  }
                }
              }}
              disabled={saving}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              ❌ Annuler Contrat
            </button>
          )}

          {/* Delete Contract - Admin only, for any status */}
          <button
            onClick={async () => {
              const confirmation = window.prompt('⚠️ ATTENTION: Cette action est irréversible!\n\nTapez "SUPPRIMER" pour confirmer la suppression définitive du contrat ' + (contract.contract_number || contract.id) + ':');
              if (confirmation === 'SUPPRIMER') {
                setSaving(true);
                try {
                  // First, get all contract device IDs from database
                  const { data: contractDevices } = await supabase
                    .from('contract_devices')
                    .select('id')
                    .eq('contract_id', contract.id);
                  
                  const contractDeviceIds = (contractDevices || []).map(d => d.id);
                  console.log('Contract device IDs to clear:', contractDeviceIds);
                  
                  // Clear any references in request_devices
                  if (contractDeviceIds.length > 0) {
                    await supabase
                      .from('request_devices')
                      .update({ contract_device_id: null })
                      .in('contract_device_id', contractDeviceIds);
                  }
                  
                  // Clear any references in service_requests (contract_id column if exists)
                  await supabase
                    .from('service_requests')
                    .update({ contract_id: null })
                    .eq('contract_id', contract.id);
                  
                  // Delete contract devices
                  const { error: devicesError } = await supabase
                    .from('contract_devices')
                    .delete()
                    .eq('contract_id', contract.id);
                  
                  if (devicesError) {
                    console.error('Error deleting contract_devices:', devicesError);
                  }
                  
                  // Then delete the contract
                  const { error: contractError } = await supabase
                    .from('contracts')
                    .delete()
                    .eq('id', contract.id);
                  
                  if (contractError) {
                    console.error('Error deleting contract:', contractError);
                    throw contractError;
                  }
                  
                  notify('Contrat supprimé définitivement', 'success');
                  onClose();
                  onUpdate();
                } catch (err) {
                  notify('Erreur: ' + err.message, 'error');
                }
                setSaving(false);
              }
            }}
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            🗑️ Supprimer Définitivement
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CREATE CONTRACT MODAL - Manual Contract Creation
// ============================================
// ============================================
// BC FILE UPLOADER (Admin side)
// ============================================
function BCFileUploader({ onUploaded, currentUrl }) {
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState(currentUrl || '');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `bc_manual_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('bc-documents')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('bc-documents')
        .getPublicUrl(fileName);
      
      onUploaded(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erreur upload: ' + err.message);
    }
    setUploading(false);
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onUploaded(urlInput.trim());
    }
  };

  if (currentUrl) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-green-600 text-sm">✅ BC ajouté</span>
        <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline">Voir</a>
        <button 
          onClick={() => onUploaded('')} 
          className="text-red-500 text-sm hover:underline"
        >
          Supprimer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setUrlMode(false)}
          className={`px-3 py-1 text-xs rounded ${!urlMode ? 'bg-[#00A651] text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          📄 Fichier
        </button>
        <button
          type="button"
          onClick={() => setUrlMode(true)}
          className={`px-3 py-1 text-xs rounded ${urlMode ? 'bg-[#00A651] text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          🔗 Lien
        </button>
      </div>
      
      {urlMode ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-3 py-2 bg-[#00A651] text-white rounded-lg text-sm"
          >
            OK
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#00A651] hover:bg-green-50 transition-colors">
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600">Upload...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl mb-1">📄</div>
                <p className="text-xs text-gray-600">Cliquez pour sélectionner</p>
                <p className="text-xs text-gray-400">PDF, DOC, Image</p>
              </>
            )}
          </div>
        </label>
      )}
    </div>
  );
}

function CreateContractModal({ clients, notify, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [contractData, setContractData] = useState({
    company_id: '',
    company_name: '', // For display when no company selected
    contract_number: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'active',
    internal_notes: '',
    bc_url: ''
  });
  const [devices, setDevices] = useState([
    { id: Date.now(), serial_number: '', model_name: '', device_type: 'particle_counter', nickname: '', tokens_total: 1, unit_price: 0 }
  ]);

  const addDevice = () => {
    setDevices([...devices, { id: Date.now(), serial_number: '', model_name: '', device_type: 'particle_counter', nickname: '', tokens_total: 1, unit_price: 0 }]);
  };

  const removeDevice = (id) => {
    if (devices.length > 1) {
      setDevices(devices.filter(d => d.id !== id));
    }
  };

  const updateDevice = (id, field, value) => {
    setDevices(devices.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const generateContractNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CTR-${year}-${random}`;
  };

  useEffect(() => {
    if (!contractData.contract_number) {
      setContractData(prev => ({ ...prev, contract_number: generateContractNumber() }));
    }
  }, []);

  const handleSubmit = async () => {
    // Validate
    if (!contractData.company_id && !contractData.company_name) {
      notify('Veuillez sélectionner un client ou entrer un nom', 'error');
      return;
    }
    if (devices.length === 0 || !devices.some(d => d.serial_number)) {
      notify('Veuillez ajouter au moins un appareil avec un numéro de série', 'error');
      return;
    }

    setSaving(true);
    try {
      // Check for overlapping contracts with same serial numbers
      const serialNumbers = devices.filter(d => d.serial_number).map(d => d.serial_number.trim().toUpperCase());
      
      // Get all active/quote_sent contracts that overlap with this date range
      const { data: overlappingContracts } = await supabase
        .from('contracts')
        .select('id, contract_number, start_date, end_date, contract_devices(serial_number)')
        .in('status', ['active', 'quote_sent', 'bc_pending'])
        .or(`and(start_date.lte.${contractData.end_date},end_date.gte.${contractData.start_date})`);
      
      // Check if any serial numbers conflict
      const conflicts = [];
      for (const existingContract of (overlappingContracts || [])) {
        for (const cd of (existingContract.contract_devices || [])) {
          const existingSerial = (cd.serial_number || '').trim().toUpperCase();
          if (serialNumbers.includes(existingSerial)) {
            conflicts.push({
              serial: cd.serial_number,
              contractNumber: existingContract.contract_number,
              period: `${new Date(existingContract.start_date).toLocaleDateString('fr-FR')} - ${new Date(existingContract.end_date).toLocaleDateString('fr-FR')}`
            });
          }
        }
      }
      
      if (conflicts.length > 0) {
        const conflictMsg = conflicts.map(c => 
          `• ${c.serial} déjà dans contrat ${c.contractNumber} (${c.period})`
        ).join('\n');
        notify(`❌ Conflit de numéros de série détecté:\n${conflictMsg}`, 'error');
        setSaving(false);
        return;
      }

      // Create contract
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: contractData.company_id || null,
          company_name_manual: contractData.company_id ? null : contractData.company_name,
          contract_number: contractData.contract_number,
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          status: contractData.status,
          internal_notes: contractData.internal_notes,
          bc_url: contractData.bc_url || null
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Add devices
      const deviceInserts = devices.filter(d => d.serial_number).map(d => ({
        contract_id: contract.id,
        serial_number: d.serial_number,
        model_name: d.model_name,
        device_type: d.device_type,
        nickname: d.nickname,
        tokens_total: d.tokens_total || 2,
        tokens_used: 0,
        unit_price: d.unit_price || 0
      }));

      const { error: devicesError } = await supabase
        .from('contract_devices')
        .insert(deviceInserts);

      if (devicesError) throw devicesError;

      notify('✅ Contrat créé avec succès!');
      onCreated();
    } catch (err) {
      console.error('Error creating contract:', err);
      notify('Erreur: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalPrice = devices.reduce((sum, d) => sum + (parseFloat(d.unit_price) || 0), 0);
  const totalTokens = devices.reduce((sum, d) => sum + (parseInt(d.tokens_total) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">← Retour</button>
          <h1 className="text-2xl font-bold text-gray-800">Créer un Contrat Manuellement</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1a2e] text-white">
          <h2 className="text-xl font-bold">Nouveau Contrat d'Étalonnage</h2>
          <p className="text-gray-300 text-sm">Pour les contrats existants non créés par le client</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Client Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client existant</label>
              <select
                value={contractData.company_id}
                onChange={e => setContractData({ ...contractData, company_id: e.target.value, company_name: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
              >
                <option value="">— Sélectionner un client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ou nom du client (si pas de compte)</label>
              <input
                type="text"
                value={contractData.company_name}
                onChange={e => setContractData({ ...contractData, company_name: e.target.value, company_id: '' })}
                placeholder="Nom de l'entreprise..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
                disabled={!!contractData.company_id}
              />
              <p className="text-xs text-gray-500 mt-1">Vous pourrez lier le contrat à un compte plus tard</p>
            </div>
          </div>

          {/* Contract Details */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">N° Contrat</label>
              <input
                type="text"
                value={contractData.contract_number}
                onChange={e => setContractData({ ...contractData, contract_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
              <input
                type="date"
                value={contractData.start_date}
                onChange={e => setContractData({ ...contractData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
              <input
                type="date"
                value={contractData.end_date}
                onChange={e => setContractData({ ...contractData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={contractData.status}
                onChange={e => setContractData({ ...contractData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="active">✅ Actif</option>
                <option value="bc_pending">📄 Attente BC</option>
                <option value="quote_approved">✅ Devis approuvé</option>
                <option value="expired">⏰ Expiré</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bon de Commande (optionnel)</label>
              <BCFileUploader 
                onUploaded={(url) => setContractData({ ...contractData, bc_url: url })}
                currentUrl={contractData.bc_url}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes internes</label>
            <textarea
              value={contractData.internal_notes}
              onChange={e => setContractData({ ...contractData, internal_notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Notes sur ce contrat..."
            />
          </div>

          {/* Devices Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Appareils sous contrat ({devices.length})</h3>
              <button
                onClick={addDevice}
                className="px-4 py-2 bg-[#00A651] text-white rounded-lg text-sm hover:bg-[#008f45]"
              >
                + Ajouter appareil
              </button>
            </div>

            <div className="space-y-3">
              {devices.map((device, index) => (
                <div key={device.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-start gap-4">
                    <span className="bg-[#1a1a2e] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</span>
                    <div className="flex-1 grid md:grid-cols-6 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">N° Série *</label>
                        <input
                          type="text"
                          value={device.serial_number}
                          onChange={e => updateDevice(device.id, 'serial_number', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="SN..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Modèle</label>
                        <input
                          type="text"
                          value={device.model_name}
                          onChange={e => updateDevice(device.id, 'model_name', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="Modèle..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select
                          value={device.device_type}
                          onChange={e => updateDevice(device.id, 'device_type', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="particle_counter">Compteur particules</option>
                          <option value="bio_collector">Bio collecteur</option>
                          <option value="liquid_counter">Compteur liquide</option>
                          <option value="temp_humidity">Temp/Humidité</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tokens/an</label>
                        <input
                          type="number"
                          value={device.tokens_total}
                          onChange={e => updateDevice(device.id, 'tokens_total', parseInt(e.target.value) || 2)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Prix €</label>
                        <input
                          type="number"
                          value={device.unit_price}
                          onChange={e => updateDevice(device.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="flex items-end">
                        {devices.length > 1 && (
                          <button
                            onClick={() => removeDevice(device.id)}
                            className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 bg-emerald-50 rounded-lg p-4 flex justify-between items-center">
              <div>
                <span className="text-emerald-800 font-medium">{devices.filter(d => d.serial_number).length} appareil(s)</span>
                <span className="text-emerald-600 mx-3">•</span>
                <span className="text-emerald-800">{totalTokens} tokens total</span>
              </div>
              <div className="text-right">
                <span className="text-emerald-800 font-bold text-xl">{totalPrice.toFixed(2)} €</span>
                <span className="text-emerald-600 text-sm ml-2">HT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between">
          <button onClick={onClose} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-bold disabled:opacity-50"
          >
            {saving ? 'Création...' : '✅ Créer le Contrat'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsSheet({ profile, staffMembers, notify, reload }) { return <div className="space-y-6"><h1 className="text-2xl font-bold text-gray-800">Paramètres</h1><div className="bg-white rounded-xl shadow-sm"><div className="px-6 py-4 border-b"><h2 className="font-bold text-gray-800">Équipe Lighthouse</h2></div><div className="p-6 space-y-3">{staffMembers.map(member => <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#00A651] text-white flex items-center justify-center font-bold">{member.full_name?.charAt(0)?.toUpperCase()}</div><div><p className="font-medium">{member.full_name}</p><p className="text-sm text-gray-500">{member.email}</p></div></div><span className={`px-3 py-1 rounded-full text-sm ${member.role === 'lh_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{member.role === 'lh_admin' ? '👑 Admin' : '👤 Employé'}</span></div>)}</div></div></div>; }

function AdminSheet({ profile, staffMembers, notify, reload, businessSettings, setBusinessSettings }) {
  const [editingSettings, setEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(businessSettings);
  const [saving, setSaving] = useState(false);
  
  const saveSettings = async () => {
    setSaving(true);
    try {
      // Try to update first
      const { error: updateError } = await supabase
        .from('business_settings')
        .upsert({ id: 1, ...tempSettings, updated_at: new Date().toISOString() });
      
      if (updateError) throw updateError;
      
      setBusinessSettings(tempSettings);
      setEditingSettings(false);
      notify('✅ Paramètres enregistrés!');
    } catch (err) {
      console.error('Settings save error:', err);
      notify('Erreur: ' + (err.message || 'Erreur'), 'error');
    }
    setSaving(false);
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🔐 Administration</h1>
      
      {/* Business Settings Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">🏢 Informations de l'entreprise</h2>
            <p className="text-blue-100 text-sm">Utilisées sur les BL, devis et factures</p>
          </div>
          {!editingSettings && (
            <button onClick={() => { setTempSettings(businessSettings); setEditingSettings(true); }} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium">
              ✏️ Modifier
            </button>
          )}
        </div>
        
        <div className="p-6">
          {editingSettings ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la société</label>
                  <input type="text" value={tempSettings.company_name} onChange={e => setTempSettings({...tempSettings, company_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capital</label>
                  <div className="flex">
                    <input type="text" value={tempSettings.capital} onChange={e => setTempSettings({...tempSettings, capital: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-l-lg" />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">€</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input type="text" value={tempSettings.address} onChange={e => setTempSettings({...tempSettings, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                  <input type="text" value={tempSettings.postal_code} onChange={e => setTempSettings({...tempSettings, postal_code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input type="text" value={tempSettings.city} onChange={e => setTempSettings({...tempSettings, city: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="text" value={tempSettings.phone} onChange={e => setTempSettings({...tempSettings, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={tempSettings.email} onChange={e => setTempSettings({...tempSettings, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                <input type="text" value={tempSettings.website} onChange={e => setTempSettings({...tempSettings, website: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                  <input type="text" value={tempSettings.siret} onChange={e => setTempSettings({...tempSettings, siret: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TVA Intracommunautaire</label>
                  <input type="text" value={tempSettings.tva} onChange={e => setTempSettings({...tempSettings, tva: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setEditingSettings(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Annuler</button>
                <button onClick={saveSettings} disabled={saving} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
                  {saving ? '⏳ Enregistrement...' : '✅ Enregistrer'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-3">{businessSettings.company_name}</h3>
                  <div className="space-y-1 text-gray-600">
                    <p>{businessSettings.address}</p>
                    <p>{businessSettings.postal_code} {businessSettings.city}</p>
                    <p>📞 {businessSettings.phone}</p>
                    <p>✉️ {businessSettings.email}</p>
                    <p>🌐 {businessSettings.website}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Informations légales</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Capital</span>
                      <span className="font-medium">{businessSettings.capital} €</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">SIRET</span>
                      <span className="font-mono">{businessSettings.siret}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500">TVA</span>
                      <span className="font-mono">{businessSettings.tva}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Preview how it looks on documents */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Aperçu sur les documents:</p>
                <p className="text-xs text-gray-600 text-center">
                  <strong>{businessSettings.company_name}</strong> au capital de {businessSettings.capital} €<br/>
                  {businessSettings.address}, {businessSettings.postal_code} {businessSettings.city} | Tél. {businessSettings.phone}<br/>
                  SIRET {businessSettings.siret} | TVA {businessSettings.tva}<br/>
                  {businessSettings.email} | {businessSettings.website}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Other admin cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md cursor-pointer">
          <div className="text-3xl mb-3">💰</div>
          <h3 className="font-bold text-gray-800">Tarification</h3>
          <p className="text-sm text-gray-500">Gérer les prix des services</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md cursor-pointer">
          <div className="text-3xl mb-3">🔑</div>
          <h3 className="font-bold text-gray-800">Permissions</h3>
          <p className="text-sm text-gray-500">Gérer les accès des employés</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md cursor-pointer">
          <div className="text-3xl mb-3">⚙️</div>
          <h3 className="font-bold text-gray-800">Système</h3>
          <p className="text-sm text-gray-500">Configuration avancée</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// QUOTE TEMPLATES - Calibration by Device Type
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
    ],
    defaultPrice: 630
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
    ],
    defaultPrice: 330
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
    ],
    defaultPrice: 750
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
    ],
    defaultPrice: 280
  },
  other: {
    icon: '📦',
    title: "Étalonnage Équipement",
    prestations: [
      "Vérification des fonctionnalités de l'appareil",
      "Étalonnage selon les spécifications du fabricant",
      "Tests de fonctionnement",
      "Fourniture d'un rapport de test"
    ],
    defaultPrice: 400
  }
};

// ============================================
// REPAIR TEMPLATE - Same for all device types
// ============================================
const REPAIR_TEMPLATE = {
  icon: '🔧',
  title: "Réparation",
  prestations: [
    "Diagnostic complet de l'appareil",
    "Identification des composants défectueux",
    "Remplacement des pièces défectueuses (pièces facturées en sus)",
    "Tests de fonctionnement complets",
    "Vérification d'étalonnage post-réparation si applicable"
  ],
  defaultPrice: 200
};

// ============================================
// NETTOYAGE CELLULE - Air particle counters only
// Cell2 models use LD sensor cleaning (different price)
// ============================================

// Models that require cell2 (LD sensor) cleaning - 180€
const CELL2_MODELS = [
  // Solair 1100 series
  'solair 1100', 's1100', 'solair 1100+', 's1100+', 'solair 1100ld', 's1100ld',
  // Solair 1200
  'solair 1200', 's1200',
  // Remote 1100 series  
  'remote 1100', 'r1100', 'remote 1104', 'r1104', 'remote 1102', 'r1102',
  'remote 1100ld', 'r1100ld', 'remote 1104ld', 'r1104ld',
  // Apex 1100
  'apex 1100', 'apex1100'
];

// Check if a model requires cell2 (LD sensor) cleaning
const isCell2Model = (modelName) => {
  if (!modelName) return false;
  const normalized = modelName.toLowerCase().trim().replace(/[\/\-\s]+/g, ' ');
  return CELL2_MODELS.some(m => normalized.includes(m));
};

// ============================================
// MODEL TO CALIBRATION PART NUMBER MAPPING
// Maps detected model names to Cal-XXX part numbers
// ============================================
const MODEL_TO_CAL_PART = {
  // Bio Collectors
  'ac100': 'Cal-AC100',
  'ac100h': 'Cal-AC100H', 
  'ac90': 'Cal-AC90',
  'aes samplair': 'Cal-AESSamplair',
  'airideal': 'Cal-Airideal',
  'airtest': 'Cal-AirTest',
  'mas100': 'Cal-MAS100',
  'mas-100': 'Cal-MAS100',
  'microflow': 'Cal-Microflow',
  'triobas': 'Cal-Triobas',
  'activecount 25h': 'Cal-ActiveCount25H',
  'activecount25h': 'Cal-ActiveCount25H',
  'activecount 100': 'Cal-ActiveCount100',
  'activecount100': 'Cal-ActiveCount100',
  'activecount 100h': 'Cal-ActiveCount100H',
  'activecount100h': 'Cal-ActiveCount100H',
  'remote active count': 'Cal-RemoteActiveCount',
  'scanair': 'Cal-ScanAir',
  'scanair pro': 'Cal-ScanAir',
  
  // Apex Portables
  'apexp3': 'Cal-ApexP3',
  'apex p3': 'Cal-ApexP3',
  'apexp5': 'Cal-ApexP5',
  'apex p5': 'Cal-ApexP5',
  'apexz3': 'Cal-ApexZ3',
  'apex z3': 'Cal-ApexZ3',
  'apexz5': 'Cal-ApexZ5',
  'apex z5': 'Cal-ApexZ5',
  'apexz30': 'Cal-ApexZ30',
  'apex z30': 'Cal-ApexZ30',
  'apexz50': 'Cal-ApexZ50',
  'apex z50': 'Cal-ApexZ50',
  'apex 1100': 'Cal-Apex1100',
  'apex1100': 'Cal-Apex1100',
  
  // Apex Remotes
  'apexr3': 'Cal-ApexR3',
  'apex r3': 'Cal-ApexR3',
  'apexr5': 'Cal-ApexR5',
  'apex r5': 'Cal-ApexR5',
  'apexr03': 'Cal-ApexR03',
  'apex r03': 'Cal-ApexR03',
  'apexr05': 'Cal-ApexR05',
  'apex r05': 'Cal-ApexR05',
  'apexr02': 'Cal-ApexR02',
  'apex r02': 'Cal-ApexR02',
  
  // Apex Remotes + Pump
  'apexr3p': 'Cal-ApexR3P',
  'apex r3p': 'Cal-ApexR3P',
  'apex r3 p': 'Cal-ApexR3P',
  'apexr5p': 'Cal-ApexR5P',
  'apex r5p': 'Cal-ApexR5P',
  'apex r5 p': 'Cal-ApexR5P',
  'apexr03p': 'Cal-ApexR03P',
  'apex r03p': 'Cal-ApexR03P',
  'apex r03 p': 'Cal-ApexR03P',
  'apexr05p': 'Cal-ApexR05P',
  'apex r05p': 'Cal-ApexR05P',
  'apex r05 p': 'Cal-ApexR05P',
  'apexr02p': 'Cal-ApexR02P',
  'apex r02p': 'Cal-ApexR02P',
  'apex r02 p': 'Cal-ApexR02P',
  
  // Handhelds
  'handheld 2016': 'Cal-HH2016',
  'hh 2016': 'Cal-HH2016',
  'hh2016': 'Cal-HH2016',
  'handheld 3013': 'Cal-HH3013',
  'hh 3013': 'Cal-HH3013',
  'hh3013': 'Cal-HH3013',
  'handheld 3016': 'Cal-HH3016',
  'hh 3016': 'Cal-HH3016',
  'hh3016': 'Cal-HH3016',
  'handheld 5016': 'Cal-HH5016',
  'hh 5016': 'Cal-HH5016',
  'hh5016': 'Cal-HH5016',
  'iaq handheld': 'Cal-IAQHH',
  'iaq': 'Cal-IAQHH',
  
  // Solair Standard
  'solair 3100': 'Cal-S3100',
  'solair 3100+': 'Cal-S3100',
  's3100': 'Cal-S3100',
  'solair 3200': 'Cal-S3200',
  'solair 3200+': 'Cal-S3200',
  's3200': 'Cal-S3200',
  'solair 5100': 'Cal-S5100',
  'solair 5100+': 'Cal-S5100',
  's5100': 'Cal-S5100',
  'solair 5200': 'Cal-S5200',
  'solair 5200+': 'Cal-S5200',
  's5200': 'Cal-S5200',
  'solair 3100rx': 'Cal-S3100Rx',
  's3100rx': 'Cal-S3100Rx',
  'solair 5100rx': 'Cal-S5100Rx',
  's5100rx': 'Cal-S5100Rx',
  'solair 3200rx': 'Cal-S3200Rx',
  's3200rx': 'Cal-S3200Rx',
  'solair 5200rx': 'Cal-S5200Rx',
  's5200rx': 'Cal-S5200Rx',
  'solair 3350': 'Cal-S3350',
  's3350': 'Cal-S3350',
  'solair 3350rx': 'Cal-S3350',
  'solair 5350': 'Cal-S5350',
  's5350': 'Cal-S5350',
  'solair 5350rx': 'Cal-S5350',
  'solair 3010': 'Cal-S3010',
  'solair 3010+': 'Cal-S3010',
  's3010': 'Cal-S3010',
  'solair 2010': 'Cal-S2010',
  'solair 2010+': 'Cal-S2010',
  's2010': 'Cal-S2010',
  'solair 1001': 'Cal-S1001',
  'solair 1001+': 'Cal-S1001',
  's1001': 'Cal-S1001',
  
  // Solair Cell2
  'solair 1100': 'Cal-S1100',
  'solair 1100+': 'Cal-S1100',
  's1100': 'Cal-S1100',
  'solair 1100ld': 'Cal-S1100LD',
  's1100ld': 'Cal-S1100LD',
  'solair 1200': 'Cal-S1200',
  's1200': 'Cal-S1200',
  
  // Remote Standard
  'remote 3014': 'Cal-R3014',
  'r3014': 'Cal-R3014',
  'remote 5014': 'Cal-R5014',
  'r5014': 'Cal-R5014',
  'remote 3012': 'Cal-R3012',
  'r3012': 'Cal-R3012',
  'remote 5012': 'Cal-R5012',
  'r5012': 'Cal-R5012',
  'remote 3016': 'Cal-R3016',
  'r3016': 'Cal-R3016',
  'remote 3102': 'Cal-R3102',
  'r3102': 'Cal-R3102',
  'remote 5102': 'Cal-R5102',
  'r5102': 'Cal-R5102',
  'remote 3104': 'Cal-R3104',
  'r3104': 'Cal-R3104',
  'remote 5104': 'Cal-R5104',
  'r5104': 'Cal-R5104',
  'remote 3010': 'Cal-R3010',
  'r3010': 'Cal-R3010',
  'remote 5010': 'Cal-R5010',
  'r5010': 'Cal-R5010',
  'remote 2010': 'Cal-R2010',
  'r2010': 'Cal-R2010',
  'remote 2012': 'Cal-R2012',
  'r2012': 'Cal-R2012',
  'remote 3014i': 'Cal-R3014i',
  'r3014i': 'Cal-R3014i',
  'remote 5014i': 'Cal-R5014i',
  'r5014i': 'Cal-R5014i',
  'remote 2014i': 'Cal-R2014i',
  'r2014i': 'Cal-R2014i',
  'remote 5104v': 'Cal-R5104V',
  'r5104v': 'Cal-R5104V',
  'remote 3104v': 'Cal-R3104V',
  'r3104v': 'Cal-R3104V',
  'remote 5102v': 'Cal-R5102V',
  'r5102v': 'Cal-R5102V',
  'remote 50104v': 'Cal-R50104V',
  'r50104v': 'Cal-R50104V',
  'remote 50104': 'Cal-R50104',
  'r50104': 'Cal-R50104',
  'remote 5100': 'Cal-R5100',
  'r5100': 'Cal-R5100',
  'remote cems': 'Cal-RCEMS',
  
  // Remote + Pump
  'remote 3014p': 'Cal-R3014P',
  'r3014p': 'Cal-R3014P',
  'remote 5014p': 'Cal-R5014P',
  'r5014p': 'Cal-R5014P',
  'remote 2014p': 'Cal-R2014P',
  'r2014p': 'Cal-R2014P',
  'remote 5104p': 'Cal-R5104P',
  'r5104p': 'Cal-R5104P',
  'remote 3104p': 'Cal-R3104P',
  'r3104p': 'Cal-R3104P',
  
  // Remote Cell2
  'remote 1100': 'Cal-R1100',
  'r1100': 'Cal-R1100',
  'remote 1104': 'Cal-R1104',
  'r1104': 'Cal-R1104',
  'remote 1102': 'Cal-R1102',
  'r1102': 'Cal-R1102',
  'remote 1100ld': 'Cal-R1100LD',
  'r1100ld': 'Cal-R1100LD',
  'remote 1104ld': 'Cal-R1104LD',
  'r1104ld': 'Cal-R1104LD',
  'remote 2014': 'Cal-R2014',
  'r2014': 'Cal-R2014',
  
  // Boulder
  'boulder': 'Cal-Boulder',
  'boulder counter': 'Cal-Boulder',
  
  // Liquid Counters
  'ls-20': 'Cal-LS20',
  'ls20': 'Cal-LS20',
  'ls-60': 'Cal-LS60',
  'ls60': 'Cal-LS60',
  'vertex 50': 'Cal-Vertex50',
  'vertex50': 'Cal-Vertex50',
  'vertex 50c': 'Cal-Vertex50C',
  'vertex50c': 'Cal-Vertex50C',
  'vertex 100': 'Cal-Vertex100',
  'vertex100': 'Cal-Vertex100',
  'nanocount': 'Cal-NanoCount',
  'nc50': 'Cal-NanoCount',
  'nc50+': 'Cal-NanoCount',
  'nc65c': 'Cal-NanoCount',
  'nc65c+': 'Cal-NanoCount',
  'nc25': 'Cal-NanoCount',
  'nc25+': 'Cal-NanoCount',
  'nc30': 'Cal-NanoCount',
  'nc30+': 'Cal-NanoCount',
  'remote lpc': 'Cal-RemoteLPC',
  
  // Temp/Humidity
  'trh sensor': 'Cal-TRHSensor',
  'trh probe': 'Cal-TRHProbe',
  'trh wand': 'Cal-TRHWand',
  
  // Other
  'diluter': 'Cal-Diluter',
  'particle diluter': 'Cal-Diluter',
  'hpc1100': 'Cal-HPC1100',
  'hpc 1100': 'Cal-HPC1100',
  'rac': 'Cal-RAC'
};

// Get calibration part number from model name
const getCalibrationPartNumber = (modelName) => {
  if (!modelName) return null;
  const normalized = modelName.toLowerCase().trim().replace(/[\/\-]+/g, ' ').replace(/\s+/g, ' ');
  
  // Try exact match first
  if (MODEL_TO_CAL_PART[normalized]) {
    return MODEL_TO_CAL_PART[normalized];
  }
  
  // Try partial matches
  for (const [key, partNumber] of Object.entries(MODEL_TO_CAL_PART)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return partNumber;
    }
  }
  
  return null;
};

// Get cell cleaning part number based on model
const getCellCleaningPartNumber = (modelName) => {
  return isCell2Model(modelName) ? 'cell2' : 'cell1';
};

const NETTOYAGE_TEMPLATE = {
  icon: '✨',
  title: "Nettoyage Cellule de Mesure",
  prestations: [
    "Démontage de la cellule de mesure optique",
    "Nettoyage des composants optiques (lentilles, miroirs)",
    "Nettoyage du circuit fluidique",
    "Vérification de l'état des joints et connexions",
    "Remontage et test d'étanchéité"
  ],
  // Get cell type for pricing lookup
  getCellType: (modelName) => isCell2Model(modelName) ? 'cell2' : 'cell1',
  getPartNumber: (modelName) => getCellCleaningPartNumber(modelName)
};

// ============================================
// DISCLAIMERS
// ============================================
const QUOTE_DISCLAIMERS = [
  "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.",
  "Un devis complémentaire sera établi si des pièces sont trouvées défectueuses et nécessitent un remplacement.",
  "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de maintenance.",
  "Les équipements envoyés devront être décontaminés de toutes substances chimiques, bactériennes ou radioactives."
];

// France Metropolitan check for shipping
const isFranceMetropolitan = (postalCode) => {
  if (!postalCode) return false;
  const cleaned = postalCode.toString().replace(/\s/g, '');
  if (!/^\d{5}$/.test(cleaned)) return false;
  const dept = parseInt(cleaned.substring(0, 2), 10);
  return dept >= 1 && dept <= 95;
};

// ============================================
// QUOTE EDITOR MODAL
// ============================================
function QuoteEditorModal({ request, onClose, notify, reload, profile }) {
  const [step, setStep] = useState(1); // 1=Edit Pricing, 2=Preview, 3=Confirm
  const [devicePricing, setDevicePricing] = useState([]);
  const [saving, setSaving] = useState(false);
  const [quoteRef, setQuoteRef] = useState('');
  const [contractInfo, setContractInfo] = useState(null); // Active contract data
  const [loadingContract, setLoadingContract] = useState(true);
  const [editingDeviceIndex, setEditingDeviceIndex] = useState(null); // For editing device details
  const [partsCache, setPartsCache] = useState({}); // Cache of part prices
  const [partsDescriptionCache, setPartsDescriptionCache] = useState({}); // Cache of part descriptions
  const [loadingParts, setLoadingParts] = useState(true); // Loading state for parts
  
  // Shipping state - based on parcels count from RMA request
  const parcelsCount = request?.parcels_count || 1;
  const [shippingData, setShippingData] = useState({
    partNumber: 'Shipping1',
    unitPrice: 45, // Default, will be updated from parts cache
    parcels: parcelsCount,
    total: 45 * parcelsCount
  });

  const devices = request?.request_devices || [];
  const signatory = profile?.full_name || 'Lighthouse France';
  const today = new Date();
  
  // Check if client is in France Metropolitan for shipping
  const clientPostalCode = request?.companies?.billing_postal_code || 
                           request?.companies?.postal_code || 
                           '';
  const isMetro = clientPostalCode ? isFranceMetropolitan(clientPostalCode) : true;
  const defaultShipping = isMetro ? 45 : 0;

  // ============================================
  // LOAD CALIBRATION PARTS PRICES FROM DATABASE
  // ============================================
  useEffect(() => {
    const loadCalibrationParts = async () => {
      setLoadingParts(true);
      try {
        // Load parts in batches to get all of them
        let allCalParts = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data, error } = await supabase
            .from('parts_pricing')
            .select('part_number, unit_price, description, description_fr')
            .range(offset, offset + batchSize - 1);
          
          if (error) {
            console.error('Error loading parts batch:', error);
            break;
          }
          
          if (data && data.length > 0) {
            allCalParts = [...allCalParts, ...data];
            offset += batchSize;
            hasMore = data.length === batchSize;
            console.log(`📦 Loaded batch: ${data.length} parts`);
          } else {
            hasMore = false;
          }
        }
        
        // Build cache with price AND description
        const cache = {};
        const descCache = {};
        allCalParts.forEach(p => {
          const pn = p.part_number || '';
          cache[pn] = p.unit_price;
          descCache[pn] = p.description_fr || p.description || '';
        });
        
        setPartsCache(cache);
        setPartsDescriptionCache(descCache);
        
        // Update shipping price if Shipping1 is in the cache
        if (cache['Shipping1']) {
          setShippingData(prev => ({
            ...prev,
            unitPrice: cache['Shipping1'],
            total: cache['Shipping1'] * prev.parcels
          }));
        }
        
        // Filter for Cal- parts for logging
        const calParts = Object.keys(cache).filter(k => k.startsWith('Cal-') || k === 'cell1' || k === 'cell2');
        console.log('📦 Total parts loaded:', Object.keys(cache).length);
        console.log('📦 Calibration parts:', calParts.length);
        
        // Check specifically for Cal-S3200
        if (cache['Cal-S3200']) {
          console.log('✅ Cal-S3200 found in cache:', cache['Cal-S3200']);
        } else {
          console.log('❌ Cal-S3200 NOT found in cache');
          console.log('📋 Available Cal- parts:', calParts);
        }
      } catch (err) {
        console.error('Parts cache error:', err);
      }
      setLoadingParts(false);
    };
    loadCalibrationParts();
  }, []);

  // Helper to get price from parts cache
  const getPartPrice = (partNumber, fallback = 0) => {
    return partsCache[partNumber] ?? fallback;
  };

  // ============================================
  // CONTRACT DETECTION - Match by serial number
  // ============================================
  useEffect(() => {
    const checkContract = async () => {
      // Trim whitespace and normalize serial numbers (case-insensitive)
      const deviceSerials = devices.map(d => (d.serial_number || '').trim().toUpperCase()).filter(Boolean);
      console.log('🔍 Checking contracts for serial numbers:', deviceSerials);
      
      if (deviceSerials.length === 0) {
        console.log('❌ No serial numbers to check');
        setLoadingContract(false);
        return;
      }
      
      const todayStr = new Date().toISOString().split('T')[0];
      console.log('📅 Today:', todayStr);
      
      try {
        // First, get all active contracts (include BC fields for copying to RMA)
        const { data: activeContracts, error: contractError } = await supabase
          .from('contracts')
          .select('id, contract_number, start_date, end_date, company_id, bc_file_url, signed_quote_url, bc_signed_by')
          .eq('status', 'active')
          .lte('start_date', todayStr)
          .gte('end_date', todayStr);
        
        console.log('📋 Active contracts found:', activeContracts?.length || 0, activeContracts);
        if (contractError) console.error('Contract query error:', contractError);
        
        if (contractError) {
          // Log error but don't block - just skip contract detection
          console.warn('Contract query error (continuing without contract check):', contractError);
          setLoadingContract(false);
          return;
        }
        
        if (!activeContracts || activeContracts.length === 0) {
          console.log('ℹ️ No active contracts found for this date range');
          // Also check if there are any active contracts at all (ignoring date)
          const { data: allActive } = await supabase
            .from('contracts')
            .select('id, contract_number, start_date, end_date, status')
            .eq('status', 'active');
          console.log('📋 All active contracts (any date):', allActive);
          setLoadingContract(false);
          return;
        }
        
        // Get contract IDs
        const contractIds = activeContracts.map(c => c.id);
        console.log('📋 Contract IDs:', contractIds);
        
        // Now get contract devices separately
        const { data: contractDevicesData, error: devicesError } = await supabase
          .from('contract_devices')
          .select('*')
          .in('contract_id', contractIds);
        
        console.log('📋 Contract devices found:', contractDevicesData?.length || 0);
        contractDevicesData?.forEach(cd => {
          console.log(`  - Device: ${cd.serial_number} (contract_id: ${cd.contract_id})`);
        });
        
        if (devicesError) {
          console.error('Contract devices query error:', devicesError);
          setLoadingContract(false);
          return;
        }
        
        // Build map of serial numbers to contract devices (case-insensitive)
        const deviceMap = {};
        let matchedContract = null;
        
        for (const cd of (contractDevicesData || [])) {
          const contract = activeContracts.find(c => c.id === cd.contract_id);
          if (!contract) continue;
          
          const tokensRemaining = (cd.tokens_total || 0) - (cd.tokens_used || 0);
          const serialTrimmed = (cd.serial_number || '').trim().toUpperCase();
          
          // Check if this contract device matches any RMA device
          if (deviceSerials.includes(serialTrimmed)) {
            console.log(`✅ MATCH! Serial "${serialTrimmed}" found in contract ${contract.contract_number}`);
            matchedContract = contract;
          }
          
          deviceMap[serialTrimmed] = {
            contract_id: contract.id,
            contract_number: contract.contract_number,
            contract_device_id: cd.id,
            tokens_remaining: tokensRemaining,
            tokens_total: cd.tokens_total || 0,
            unit_price: cd.unit_price || 0
          };
        }
        
        console.log('📋 Device map built:', Object.keys(deviceMap));
        
        // Check which RMA devices are in the map
        let hasMatch = false;
        deviceSerials.forEach(sn => {
          if (deviceMap[sn]) {
            console.log(`✅ RMA device "${sn}" is covered by contract ${deviceMap[sn].contract_number}, tokens remaining: ${deviceMap[sn].tokens_remaining}`);
            hasMatch = true;
          } else {
            console.log(`❌ RMA device "${sn}" is NOT in any contract`);
          }
        });
        
        if (hasMatch) {
          setContractInfo({
            contracts: activeContracts,
            primaryContract: matchedContract || activeContracts[0],
            deviceMap
          });
          console.log('✅ Contract info set!');
        } else {
          console.log('❌ No matching serial numbers found in contracts');
        }
      } catch (err) {
        console.error('Contract check error:', err);
      }
      
      setLoadingContract(false);
    };
    
    checkContract();
  }, [devices]);

  // Determine which service sections are needed based on CURRENT devicePricing (reactive)
  const getRequiredSections = (pricingData) => {
    const sections = { calibration: new Set(), repair: false, hasAirParticleCounter: false };
    
    pricingData.forEach(d => {
      if (d.needsCalibration) {
        sections.calibration.add(d.deviceType);
        if (d.deviceType === 'particle_counter') {
          sections.hasAirParticleCounter = true;
        }
      }
      if (d.needsRepair) {
        sections.repair = true;
      }
    });
    
    return {
      calibrationTypes: Array.from(sections.calibration),
      hasRepair: sections.repair,
      hasAirParticleCounter: sections.hasAirParticleCounter
    };
  };

  // Compute from devicePricing so it updates when user edits devices
  const requiredSections = getRequiredSections(devicePricing);

  useEffect(() => {
    if (loadingContract || loadingParts) return; // Wait for contract check AND parts loading
    
    console.log('📊 Initializing device pricing, contractInfo:', contractInfo, 'partsCache:', Object.keys(partsCache).length, 'parts');
    
    // Generate quote reference
    const year = today.getFullYear().toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setQuoteRef(`LH/${year}${month}/XXX`);
    
    // Initialize device pricing from request
    if (devices.length > 0) {
      setDevicePricing(devices.map((d, i) => {
        const deviceType = d.device_type || 'particle_counter';
        const serviceType = d.service_type || 'calibration';
        const needsCal = serviceType.includes('calibration') || serviceType === 'calibration_repair' || serviceType === 'cal_repair';
        const needsRepair = serviceType.includes('repair') || serviceType === 'calibration_repair' || serviceType === 'cal_repair';
        
        const calTemplate = CALIBRATION_TEMPLATES[deviceType] || CALIBRATION_TEMPLATES.particle_counter;
        const modelName = d.model_name || '';
        
        // Get calibration part number and price from parts database
        const calPartNumber = getCalibrationPartNumber(modelName);
        const calPrice = calPartNumber && partsCache[calPartNumber] 
          ? partsCache[calPartNumber] 
          : calTemplate.defaultPrice;
        
        // Determine nettoyage cell type for air particle counters
        const needsNettoyage = needsCal && deviceType === 'particle_counter';
        const nettoyageCellType = needsNettoyage ? NETTOYAGE_TEMPLATE.getCellType(modelName) : null;
        const nettoyagePartNumber = needsNettoyage ? NETTOYAGE_TEMPLATE.getPartNumber(modelName) : null;
        // Get nettoyage price from parts cache (cell1 or cell2)
        const nettoyagePrice = needsNettoyage 
          ? (partsCache[nettoyagePartNumber] ?? (nettoyageCellType === 'cell2' ? 180 : 150))
          : 0;
        
        // Check contract coverage - trim serial number for matching
        const serialTrimmed = (d.serial_number || '').trim();
        const contractDevice = contractInfo?.deviceMap?.[serialTrimmed];
        const isContractCovered = needsCal && contractDevice && contractDevice.tokens_remaining > 0;
        const tokensExhausted = needsCal && contractDevice && contractDevice.tokens_remaining <= 0;
        
        console.log(`📊 Device ${serialTrimmed}: model="${modelName}", calPart=${calPartNumber}, price=${calPrice}, nettoyage=${nettoyageCellType}`);
        
        return {
          id: d.id || `device-${i}`,
          model: modelName,
          serial: serialTrimmed,
          deviceType: deviceType,
          serviceType: serviceType,
          needsCalibration: needsCal,
          needsRepair: needsRepair,
          customerNotes: d.notes || d.problem_description || '',
          // Contract coverage
          isContractCovered: isContractCovered,
          tokensExhausted: tokensExhausted,
          contractDeviceId: contractDevice?.contract_device_id || null,
          contractId: contractDevice?.contract_id || null,
          tokensRemaining: contractDevice?.tokens_remaining || 0,
          // Calibration part number for reference
          calPartNumber: calPartNumber,
          // Nettoyage cellule (air particle counters only)
          needsNettoyage: needsNettoyage,
          nettoyageCellType: nettoyageCellType,
          nettoyagePartNumber: nettoyagePartNumber,
          nettoyageQty: 1,
          nettoyagePrice: isContractCovered ? 0 : nettoyagePrice,
          hideNettoyageOnQuote: false, // Option to hide nettoyage on quote (price still included)
          // Pricing - 0 for contract-covered calibrations
          calibrationQty: 1,
          calibrationPrice: isContractCovered ? 0 : (needsCal ? calPrice : 0),
          repairQty: 1,
          repairPrice: needsRepair ? REPAIR_TEMPLATE.defaultPrice : 0,
          repairPartNumber: '',
          additionalParts: [],
          shippingPartNumber: 'Shipping1',
          shipping: isContractCovered ? 0 : defaultShipping
        };
      }));
    }
  }, [loadingContract, loadingParts, contractInfo, partsCache]);

  // Update device pricing with automatic recalculation for type/service changes
  const updateDevice = (deviceId, field, value) => {
    setDevicePricing(prev => prev.map(d => {
      if (d.id !== deviceId) return d;
      
      const updated = { ...d, [field]: value };
      
      // Helper to calculate nettoyage price
      const calcNettoyagePrice = (model, deviceType, needsCal, isContractCovered) => {
        if (!needsCal || deviceType !== 'particle_counter') return { needsNettoyage: false, nettoyageCellType: null, nettoyagePartNumber: null, nettoyagePrice: 0 };
        const cellType = NETTOYAGE_TEMPLATE.getCellType(model);
        const partNumber = NETTOYAGE_TEMPLATE.getPartNumber(model);
        const price = isContractCovered ? 0 : (partsCache[partNumber] ?? (cellType === 'cell2' ? 180 : 150));
        return { needsNettoyage: true, nettoyageCellType: cellType, nettoyagePartNumber: partNumber, nettoyagePrice: price };
      };
      
      // Helper to get calibration price from parts cache
      const getCalPrice = (model, deviceType) => {
        const calPartNumber = getCalibrationPartNumber(model);
        if (calPartNumber && partsCache[calPartNumber]) {
          return { calPartNumber, price: partsCache[calPartNumber] };
        }
        const template = CALIBRATION_TEMPLATES[deviceType] || CALIBRATION_TEMPLATES.particle_counter;
        return { calPartNumber, price: template.defaultPrice };
      };
      
      // If device type changed, update calibration and nettoyage pricing
      if (field === 'deviceType') {
        // Only update price if not contract covered
        if (!d.isContractCovered && d.needsCalibration) {
          const { calPartNumber, price } = getCalPrice(d.model, value);
          updated.calPartNumber = calPartNumber;
          updated.calibrationPrice = price;
        }
        // Update nettoyage based on new device type
        const nettoyage = calcNettoyagePrice(d.model, value, d.needsCalibration, d.isContractCovered);
        Object.assign(updated, nettoyage);
      }
      
      // If model changed, update calibration price and nettoyage cell type
      if (field === 'model') {
        if (!d.isContractCovered && d.needsCalibration) {
          const { calPartNumber, price } = getCalPrice(value, d.deviceType);
          updated.calPartNumber = calPartNumber;
          updated.calibrationPrice = price;
        }
        const nettoyage = calcNettoyagePrice(value, d.deviceType, d.needsCalibration, d.isContractCovered);
        Object.assign(updated, nettoyage);
      }
      
      // If service type changed, update needs flags and recalculate prices
      if (field === 'serviceType') {
        const newNeedsCal = value.includes('calibration') || value === 'cal_repair' || value === 'calibration_repair';
        const newNeedsRepair = value.includes('repair') || value === 'cal_repair' || value === 'calibration_repair';
        
        updated.needsCalibration = newNeedsCal;
        updated.needsRepair = newNeedsRepair;
        
        // Update calibration prices
        if (newNeedsCal && !d.needsCalibration && !d.isContractCovered) {
          const { calPartNumber, price } = getCalPrice(d.model, d.deviceType);
          updated.calPartNumber = calPartNumber;
          updated.calibrationPrice = price;
        } else if (!newNeedsCal) {
          updated.calibrationPrice = 0;
        }
        
        // Update repair prices
        if (newNeedsRepair && !d.needsRepair) {
          updated.repairPrice = REPAIR_TEMPLATE.defaultPrice;
        } else if (!newNeedsRepair) {
          updated.repairPrice = 0;
        }
        
        // Update nettoyage based on new service type
        const nettoyage = calcNettoyagePrice(d.model, d.deviceType, newNeedsCal, d.isContractCovered);
        Object.assign(updated, nettoyage);
      }
      
      return updated;
    }));
  };

  // Add part to device
  const addPart = (deviceId) => {
    setDevicePricing(prev => prev.map(d => {
      if (d.id === deviceId) {
        return { ...d, additionalParts: [...d.additionalParts, { id: Date.now(), quantity: 1, partNumber: '', description: '', price: 0 }] };
      }
      return d;
    }));
  };

  // Update part
  const updatePart = (deviceId, partId, field, value) => {
    setDevicePricing(prev => prev.map(d => {
      if (d.id === deviceId) {
        return { ...d, additionalParts: d.additionalParts.map(p => p.id === partId ? { ...p, [field]: value } : p) };
      }
      return d;
    }));
  };

  // Remove part
  const removePart = (deviceId, partId) => {
    setDevicePricing(prev => prev.map(d => {
      if (d.id === deviceId) {
        return { ...d, additionalParts: d.additionalParts.filter(p => p.id !== partId) };
      }
      return d;
    }));
  };

  // Calculate device subtotal (services only, no shipping)
  const getDeviceServiceTotal = (d) => {
    let total = 0;
    if (d.needsCalibration) total += (d.calibrationQty || 1) * d.calibrationPrice;
    if (d.needsNettoyage) total += (d.nettoyageQty || 1) * (d.nettoyagePrice || 0);
    if (d.needsRepair) total += (d.repairQty || 1) * d.repairPrice;
    // Account for quantity in additional parts
    total += d.additionalParts.reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (parseInt(p.quantity) || 1)), 0);
    return total;
  };

  // Get device type label
  const getDeviceTypeLabel = (type) => {
    const labels = {
      particle_counter: 'Compteur Particules (Air)',
      bio_collector: 'Bio Collecteur',
      liquid_counter: 'Compteur Particules (Liquide)',
      temp_humidity: 'Capteur Temp/Humidité',
      other: 'Autre'
    };
    return labels[type] || type;
  };

  // Check if fully covered by contract (all calibrations covered, no repairs)
  const isFullyContractCovered = devicePricing.every(d => {
    if (d.needsCalibration && !d.isContractCovered) return false;
    if (d.needsRepair) return false; // Repairs are not covered
    return true;
  }) && devicePricing.some(d => d.isContractCovered);
  
  // Check if any device is contract covered
  const hasContractCoveredDevices = devicePricing.some(d => d.isContractCovered);

  // Calculate totals - shipping is 0 when fully contract covered
  const servicesSubtotal = devicePricing.reduce((sum, d) => sum + getDeviceServiceTotal(d), 0);
  const shippingTotal = isFullyContractCovered ? 0 : shippingData.total;
  const grandTotal = servicesSubtotal + shippingTotal;

  // Send quote (or auto-approve for contract)
  const sendQuote = async () => {
    setSaving(true);
    
    let rmaNumber = request.request_number;
    if (!rmaNumber) {
      const { data } = await supabase.from('service_requests').select('request_number').like('request_number', 'FR-%').order('request_number', { ascending: false }).limit(1);
      const lastNum = data?.[0]?.request_number ? parseInt(data[0].request_number.replace('FR-', '')) : 0;
      rmaNumber = 'FR-' + String(lastNum + 1).padStart(5, '0');
    }

    // Save complete quote data
    const quoteData = {
      devices: devicePricing.map(d => ({
        model: d.model,
        serial: d.serial,
        deviceType: d.deviceType,
        serviceType: d.serviceType,
        needsCalibration: d.needsCalibration,
        needsRepair: d.needsRepair,
        calPartNumber: d.calPartNumber,
        needsNettoyage: d.needsNettoyage,
        nettoyageCellType: d.nettoyageCellType,
        nettoyagePartNumber: d.nettoyagePartNumber,
        nettoyagePrice: d.nettoyagePrice,
        calibrationPrice: d.calibrationPrice,
        repairPartNumber: d.repairPartNumber,
        repairPrice: d.repairPrice,
        additionalParts: d.additionalParts,
        serviceTotal: getDeviceServiceTotal(d),
        // Contract info
        isContractCovered: d.isContractCovered,
        contractDeviceId: d.contractDeviceId,
        contractNumber: d.isContractCovered ? contractInfo?.primaryContract?.contract_number : null,
        tokensRemaining: d.tokensRemaining
      })),
      shipping: {
        partNumber: shippingData.partNumber,
        parcels: shippingData.parcels,
        unitPrice: shippingData.unitPrice,
        total: shippingData.total
      },
      requiredSections,
      servicesSubtotal,
      shippingTotal,
      grandTotal,
      isMetro,
      isContractRMA: hasContractCoveredDevices,
      createdBy: signatory,
      createdAt: new Date().toISOString()
    };

    try {
      // Generate Quote PDF
      let quoteUrl = null;
      try {
        const rmaForPDF = {
          ...request,
          request_number: rmaNumber,
          companies: request.companies
        };
        
        const pdfBlob = await generateQuotePDF(rmaForPDF, devicePricing, {
          shipping: shippingData,
          devicePricing: devicePricing,
          servicesSubtotal: servicesSubtotal,
          shippingTotal: shippingTotal,
          grandTotal: grandTotal,
          isContractRMA: hasContractCoveredDevices,
          isFullyContractCovered: isFullyContractCovered
        });
        const fileName = `${rmaNumber}_devis_${Date.now()}.pdf`;
        quoteUrl = await uploadPDFToStorage(pdfBlob, `quotes/${rmaNumber}`, fileName);
      } catch (pdfErr) {
        console.error('PDF generation error:', pdfErr);
        // Continue without PDF if it fails
      }

      // Determine status and whether to auto-approve
      let newStatus = 'quote_sent';
      let contractBcFileUrl = null;
      let contractSignedQuoteUrl = null;
      let bcSignedBy = null;
      
      // If fully contract covered (calibration only, all covered), auto-approve
      if (isFullyContractCovered) {
        newStatus = 'waiting_device'; // Skip quote approval, go straight to waiting
        // Copy BC from contract - get both bc_file_url and signed_quote_url
        contractBcFileUrl = contractInfo?.primaryContract?.bc_file_url;
        contractSignedQuoteUrl = contractInfo?.primaryContract?.signed_quote_url;
        bcSignedBy = contractInfo?.primaryContract?.bc_signed_by || 'Contrat';
        console.log('📋 Contract BC URL:', contractBcFileUrl);
        console.log('📋 Contract Signed Quote URL:', contractSignedQuoteUrl);
        console.log('📋 Signed by:', bcSignedBy);
      }

      const updateData = {
        request_number: rmaNumber,
        status: newStatus,
        quoted_at: new Date().toISOString(),
        quote_total: grandTotal,
        quote_subtotal: servicesSubtotal,
        quote_shipping: shippingTotal,
        quote_data: quoteData,
        quote_revision_notes: null,
        // Contract fields
        is_contract_rma: hasContractCoveredDevices,
        contract_id: hasContractCoveredDevices ? contractInfo?.primaryContract?.id : null
      };
      
      // Add quote PDF URL if generated
      if (quoteUrl) {
        updateData.quote_url = quoteUrl;
      }
      
      // Add BC/signed quote URLs if contract-covered
      if (isFullyContractCovered) {
        // Use BC file if available, otherwise use signed quote as the BC document
        const bcDocUrl = contractBcFileUrl || contractSignedQuoteUrl;
        
        if (bcDocUrl) {
          updateData.bc_file_url = bcDocUrl;
        }
        // If we have BOTH, store the signed quote separately as signature proof
        if (contractBcFileUrl && contractSignedQuoteUrl) {
          updateData.bc_signature_url = contractSignedQuoteUrl;
        }
        // Set BC approval fields
        if (bcDocUrl) {
          updateData.bc_signed_by = bcSignedBy;
          updateData.bc_approved_at = new Date().toISOString();
          updateData.bc_submitted_at = new Date().toISOString();
          updateData.bc_signature_date = new Date().toISOString().split('T')[0];
        }
      }

      const { error } = await supabase.from('service_requests').update(updateData).eq('id', request.id);

      if (error) throw error;

      // Update request_devices with contract info
      for (const d of devicePricing) {
        if (d.id && d.isContractCovered) {
          await supabase.from('request_devices').update({
            contract_device_id: d.contractDeviceId,
            contract_covered: true
          }).eq('id', d.id);
        }
      }

      if (isFullyContractCovered) {
        const bcDocUrl = contractBcFileUrl || contractSignedQuoteUrl;
        const bcCopied = bcDocUrl ? ' (BC/Devis contrat copié)' : ' (⚠️ BC contrat non trouvé)';
        notify(`✅ Contrat! RMA ${rmaNumber} créé - En attente de réception${bcCopied}`);
      } else if (hasContractCoveredDevices) {
        notify(`✅ Devis envoyé! RMA: ${rmaNumber} (certains appareils sous contrat)`);
      } else {
        notify('✅ Devis envoyé! RMA: ' + rmaNumber);
      }
      
      reload(); 
      onClose();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex" onClick={onClose}>
      <div className="bg-white w-full h-full md:w-[98%] md:h-[98%] md:m-auto md:rounded-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header - Always use standard dark theme */}
        <div className="px-6 py-4 text-white flex justify-between items-center shrink-0 bg-[#1a1a2e]">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {step === 1 && 'Créer le Devis'}
                {step === 2 && 'Aperçu du Devis'}
                {step === 3 && (isFullyContractCovered ? 'Confirmer RMA Contrat' : 'Confirmer l\'envoi')}
              </h2>
              <p className="text-gray-300">{request.companies?.name} • {devicePricing.length} appareil(s)</p>
            </div>
            <div className="flex gap-1">
              {[1,2,3].map(s => (
                <div key={s} className={`w-8 h-2 rounded-full ${step >= s ? 'bg-[#00A651]' : 'bg-gray-600'}`} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-300">Total HT</p>
              <p className="text-2xl font-bold text-[#00A651]">{grandTotal.toFixed(2)} €</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Loading Contract & Parts Check */}
          {(loadingContract || loadingParts) && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">
                  {loadingParts ? 'Chargement tarifs...' : 'Vérification contrat en cours...'}
                </span>
              </div>
            </div>
          )}
          
          {/* ==================== STEP 1: PRICING EDITOR ==================== */}
          {step === 1 && !loadingContract && !loadingParts && (
            <div className="flex h-full">
              {/* LEFT SIDE - Customer Info & Devices */}
              <div className="flex-1 p-6 overflow-y-auto">
                
                {/* CONTRACT CUSTOMER BANNER */}
                {hasContractCoveredDevices && (
                  <div className="mb-6 p-4 rounded-xl border-2 bg-emerald-50 border-emerald-300">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">📋</span>
                      <div className="flex-1">
                        <p className="font-bold text-emerald-800">
                          Contrat détecté
                        </p>
                        <p className="text-emerald-700 text-sm mt-1">
                          {isFullyContractCovered 
                            ? 'Étalonnage(s) couvert(s) par contrat. Le RMA sera créé directement en "Attente Appareil" avec le BC du contrat.'
                            : `${devicePricing.filter(d => d.isContractCovered).length} appareil(s) couvert(s) par contrat. Les réparations ou appareils non couverts seront facturés normalement.`
                          }
                        </p>
                        {contractInfo?.primaryContract && (
                          <p className="text-xs text-emerald-600 mt-2">
                            Contrat: {contractInfo.primaryContract.contract_number} • 
                            Valide jusqu'au {new Date(contractInfo.primaryContract.end_date).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Revision Request Alert */}
                {request.status === 'quote_revision_requested' && (
                  <div className="mb-6 p-4 bg-red-100 border-2 border-red-300 rounded-xl">
                    <p className="font-bold text-red-800">🔴 Modification demandée par le client</p>
                    <p className="text-red-700 mt-1">{request.quote_revision_notes}</p>
                  </div>
                )}

                {/* Non-Metro Warning */}
                {!isMetro && (
                  <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
                    <p className="font-bold text-amber-800">⚠️ Client hors France métropolitaine</p>
                    <p className="text-amber-700 text-sm">Les frais de retour sont à 0€ par défaut. Le client gère son propre transport.</p>
                  </div>
                )}

                {/* Customer Info Card */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-gray-800 mb-3">Client</h3>
                  <p className="text-lg font-bold text-[#1E3A5F]">{request.companies?.name}</p>
                  {request.companies?.billing_address && (
                    <p className="text-sm text-gray-600">{request.companies?.billing_address}</p>
                  )}
                  <p className="text-sm text-gray-600">{request.companies?.billing_postal_code} {request.companies?.billing_city}</p>
                </div>

                {/* Detected Service Sections */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-blue-800 mb-2">Sections du devis (auto-détectées)</h3>
                  <div className="flex flex-wrap gap-2">
                    {requiredSections.calibrationTypes.map(type => (
                      <span key={type} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {CALIBRATION_TEMPLATES[type]?.icon} Étal. {getDeviceTypeLabel(type)}
                      </span>
                    ))}
                    {requiredSections.hasRepair && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                        🔧 Réparation
                      </span>
                    )}
                  </div>
                </div>

                {/* Device Pricing Cards */}
                <h3 className="font-bold text-gray-800 mb-3">Tarification par Appareil</h3>
                <div className="space-y-4">
                  {devicePricing.map((device, index) => {
                    const calTemplate = CALIBRATION_TEMPLATES[device.deviceType] || CALIBRATION_TEMPLATES.particle_counter;
                    // Get contract number for display
                    const contractNumber = device.isContractCovered && contractInfo?.primaryContract?.contract_number 
                      ? contractInfo.primaryContract.contract_number 
                      : null;
                    const isEditing = editingDeviceIndex === index;
                    return (
                      <div key={device.id} className="border-2 rounded-xl overflow-hidden bg-white border-gray-200">
                        {/* Device Header - Always standard dark */}
                        <div className="px-4 py-3 flex items-center justify-between bg-[#1a1a2e] text-white">
                          <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-2 py-1 rounded text-sm font-bold">#{index + 1}</span>
                            <div>
                              <p className="font-bold">{device.model || 'Appareil'}</p>
                              <p className="text-sm text-gray-300">SN: {device.serial} • {getDeviceTypeLabel(device.deviceType)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setEditingDeviceIndex(isEditing ? null : index)}
                              className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs"
                            >
                              ✏️ Modifier
                            </button>
                            {device.needsCalibration && <span className="bg-blue-500 px-2 py-1 rounded text-xs">🔬 Cal</span>}
                            {device.needsRepair && <span className="bg-orange-500 px-2 py-1 rounded text-xs">🔧 Rép</span>}
                          </div>
                        </div>

                        {/* Device Edit Form */}
                        {isEditing && (
                          <div className="bg-blue-50 p-4 border-b border-blue-200">
                            <p className="text-sm font-bold text-blue-800 mb-3">✏️ Modifier les informations de l'appareil</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Modèle</label>
                                <input
                                  type="text"
                                  value={device.model}
                                  onChange={e => updateDevice(device.id, 'model', e.target.value)}
                                  className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">N° Série</label>
                                <input
                                  type="text"
                                  value={device.serial}
                                  onChange={e => updateDevice(device.id, 'serial', e.target.value)}
                                  className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Type d'appareil</label>
                                <select
                                  value={device.deviceType}
                                  onChange={e => updateDevice(device.id, 'deviceType', e.target.value)}
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
                                <label className="block text-xs font-medium text-gray-600 mb-1">Type de service</label>
                                <select
                                  value={device.serviceType}
                                  onChange={e => {
                                    const newType = e.target.value;
                                    updateDevice(device.id, 'serviceType', newType);
                                    updateDevice(device.id, 'needsCalibration', newType.includes('calibration') || newType === 'cal_repair');
                                    updateDevice(device.id, 'needsRepair', newType.includes('repair') || newType === 'cal_repair');
                                  }}
                                  className="w-full px-3 py-2 border rounded-lg text-sm"
                                >
                                  <option value="calibration">Étalonnage uniquement</option>
                                  <option value="repair">Réparation uniquement</option>
                                  <option value="calibration_repair">Étalonnage + Réparation</option>
                                </select>
                              </div>
                            </div>
                            <button 
                              onClick={() => setEditingDeviceIndex(null)}
                              className="mt-3 px-4 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                            >
                              ✓ Terminé
                            </button>
                          </div>
                        )}

                        {/* Customer Notes (Internal) */}
                        {device.customerNotes && (
                          <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
                            <p className="text-xs text-yellow-700 font-medium">💬 Note client (interne) :</p>
                            <p className="text-sm text-yellow-800">{device.customerNotes}</p>
                          </div>
                        )}
                        
                        {/* Tokens Exhausted Warning */}
                        {device.tokensExhausted && (
                          <div className="bg-amber-100 px-4 py-2 border-b border-amber-200">
                            <p className="text-sm text-amber-800">
                              <span className="font-bold">⚠️ Client sous contrat - 0 jetons restants pour cet appareil</span> - Facturation au tarif normal
                            </p>
                          </div>
                        )}
                        
                        {/* Manual Entry Warning - Device not detected in system */}
                        {device.needsCalibration && !device.calPartNumber && !device.isContractCovered && (
                          <div className="bg-orange-100 px-4 py-2 border-b border-orange-300">
                            <p className="text-sm text-orange-800">
                              <span className="font-bold">⚠️ Appareil non reconnu dans le système</span> - Veuillez vérifier et saisir manuellement le tarif d'étalonnage
                            </p>
                          </div>
                        )}

                        {/* Pricing Inputs */}
                        <div className="p-4 space-y-2">
                          {/* Column Headers */}
                          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium px-1 pb-1 border-b">
                            <div className="w-14 text-center">Qté</div>
                            <div className="w-28">N° Pièce</div>
                            <div className="flex-1">Désignation</div>
                            <div className="w-24 text-right">Prix Unit.</div>
                            <div className="w-24 text-right">Total</div>
                            <div className="w-8"></div>
                          </div>
                          
                          {device.needsCalibration && (
                            <div className={`p-2 rounded-lg ${
                              device.calPartNumber && partsCache[device.calPartNumber] 
                                ? 'bg-blue-50' 
                                : 'bg-orange-50 border-2 border-orange-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                {/* Quantity - editable */}
                                <div className="w-14">
                                  <input
                                    type="number"
                                    min="1"
                                    value={device.calibrationQty || 1}
                                    onChange={e => updateDevice(device.id, 'calibrationQty', Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-2 py-1.5 border rounded text-sm text-center"
                                    disabled={device.isContractCovered}
                                  />
                                </div>
                                {/* Part Number */}
                                <div className="w-28">
                                  <input
                                    type="text"
                                    value={device.calPartNumber || ''}
                                    onChange={e => {
                                      const pn = e.target.value;
                                      updateDevice(device.id, 'calPartNumber', pn);
                                      if (partsCache[pn]) {
                                        updateDevice(device.id, 'calibrationPrice', partsCache[pn]);
                                      }
                                    }}
                                    placeholder="Cal-XXXX"
                                    className={`w-full px-2 py-1.5 border rounded text-xs font-mono ${
                                      device.calPartNumber && partsCache[device.calPartNumber] 
                                        ? 'border-green-400 bg-green-50' 
                                        : 'border-orange-300'
                                    }`}
                                    disabled={device.isContractCovered}
                                  />
                                </div>
                                {/* Description */}
                                <div className="flex-1">
                                  <span className={`text-sm ${
                                    device.calPartNumber && partsCache[device.calPartNumber] 
                                      ? 'text-blue-800' 
                                      : 'text-orange-800'
                                  }`}>
                                    Étalonnage {device.model}
                                    {device.calPartNumber && partsCache[device.calPartNumber] && (
                                      <span className="ml-1 text-green-600">✓</span>
                                    )}
                                  </span>
                                </div>
                                {/* Unit Price */}
                                {device.isContractCovered ? (
                                  <div className="w-24 text-right">
                                    <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded">Contrat</span>
                                  </div>
                                ) : (
                                  <div className="w-24">
                                    <input
                                      type="number"
                                      value={device.calibrationPrice}
                                      onChange={e => updateDevice(device.id, 'calibrationPrice', parseFloat(e.target.value) || 0)}
                                      className="w-full px-2 py-1.5 border rounded text-sm text-right"
                                    />
                                  </div>
                                )}
                                {/* Total */}
                                <div className="w-24 text-right font-medium text-sm">
                                  {device.isContractCovered ? '' : `${((device.calibrationQty || 1) * (device.calibrationPrice || 0)).toFixed(2)} €`}
                                </div>
                                <div className="w-8"></div>
                              </div>
                            </div>
                          )}
                          
                          {/* Nettoyage Cellule - normal editable row */}
                          {device.needsNettoyage && (
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                {/* Quantity - editable */}
                                <div className="w-14">
                                  <input
                                    type="number"
                                    min="1"
                                    value={device.nettoyageQty || 1}
                                    onChange={e => updateDevice(device.id, 'nettoyageQty', Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-2 py-1.5 border rounded text-sm text-center"
                                    disabled={device.isContractCovered}
                                  />
                                </div>
                                {/* Part Number */}
                                <div className="w-28">
                                  <input
                                    type="text"
                                    value={device.nettoyagePartNumber || ''}
                                    onChange={e => {
                                      const pn = e.target.value;
                                      updateDevice(device.id, 'nettoyagePartNumber', pn);
                                      if (partsCache[pn]) {
                                        updateDevice(device.id, 'nettoyagePrice', partsCache[pn]);
                                      }
                                    }}
                                    placeholder="cell1/cell2"
                                    className={`w-full px-2 py-1.5 border rounded text-xs font-mono ${
                                      device.nettoyagePartNumber && partsCache[device.nettoyagePartNumber]
                                        ? 'border-green-400 bg-green-50'
                                        : 'border-gray-300'
                                    }`}
                                    disabled={device.isContractCovered}
                                  />
                                </div>
                                {/* Description */}
                                <div className="flex-1">
                                  <span className="text-sm">
                                    Nettoyage cellule - si requis
                                    {device.nettoyagePartNumber && partsCache[device.nettoyagePartNumber] && (
                                      <span className="ml-1 text-green-600">✓</span>
                                    )}
                                  </span>
                                </div>
                                {/* Unit Price */}
                                {device.isContractCovered ? (
                                  <div className="w-24 text-right">
                                    <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded">Contrat</span>
                                  </div>
                                ) : (
                                  <div className="w-24">
                                    <input
                                      type="number"
                                      value={device.nettoyagePrice}
                                      onChange={e => updateDevice(device.id, 'nettoyagePrice', parseFloat(e.target.value) || 0)}
                                      className="w-full px-2 py-1.5 border rounded text-sm text-right"
                                    />
                                  </div>
                                )}
                                {/* Total */}
                                <div className="w-24 text-right font-medium text-sm">
                                  {device.isContractCovered ? '' : `${((device.nettoyageQty || 1) * (device.nettoyagePrice || 0)).toFixed(2)} €`}
                                </div>
                                <div className="w-8"></div>
                              </div>
                            </div>
                          )}
                          
                          {device.needsRepair && (
                            <div className="bg-orange-50 p-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                {/* Quantity - editable */}
                                <div className="w-14">
                                  <input
                                    type="number"
                                    min="1"
                                    value={device.repairQty || 1}
                                    onChange={e => updateDevice(device.id, 'repairQty', Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-2 py-1.5 border rounded text-sm text-center"
                                  />
                                </div>
                                {/* Part Number */}
                                <div className="w-28">
                                  <input
                                    type="text"
                                    value={device.repairPartNumber || ''}
                                    onChange={e => {
                                      const pn = e.target.value;
                                      updateDevice(device.id, 'repairPartNumber', pn);
                                      if (partsCache[pn]) {
                                        updateDevice(device.id, 'repairPrice', partsCache[pn]);
                                      }
                                    }}
                                    placeholder="PN"
                                    className="w-full px-2 py-1.5 border rounded text-xs font-mono border-orange-300"
                                  />
                                </div>
                                {/* Description */}
                                <div className="flex-1">
                                  <span className="text-sm text-orange-800">
                                    Réparation {device.model}
                                    {device.repairPartNumber && partsCache[device.repairPartNumber] && (
                                      <span className="ml-1 text-green-600">✓</span>
                                    )}
                                  </span>
                                </div>
                                {/* Unit Price */}
                                <div className="w-24">
                                  <input
                                    type="number"
                                    value={device.repairPrice}
                                    onChange={e => updateDevice(device.id, 'repairPrice', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 border rounded text-sm text-right"
                                  />
                                </div>
                                {/* Total */}
                                <div className="w-24 text-right font-medium text-sm">
                                  {((device.repairQty || 1) * (device.repairPrice || 0)).toFixed(2)} €
                                </div>
                                <div className="w-8"></div>
                              </div>
                            </div>
                          )}

                          {/* Additional Parts */}
                          {device.additionalParts.map(part => (
                            <div key={part.id} className="bg-gray-50 p-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                {/* Quantity */}
                                <div className="w-14">
                                  <input
                                    type="number"
                                    min="1"
                                    value={part.quantity || 1}
                                    onChange={e => updatePart(device.id, part.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-2 py-1.5 border rounded text-sm text-center"
                                  />
                                </div>
                                {/* Part Number */}
                                <div className="w-28">
                                  <input
                                    type="text"
                                    value={part.partNumber || ''}
                                    onChange={e => {
                                      const pn = e.target.value;
                                      updatePart(device.id, part.id, 'partNumber', pn);
                                      if (partsCache[pn]) {
                                        updatePart(device.id, part.id, 'price', partsCache[pn]);
                                      }
                                      if (partsDescriptionCache[pn]) {
                                        updatePart(device.id, part.id, 'description', partsDescriptionCache[pn]);
                                      }
                                    }}
                                    placeholder="N° pièce"
                                    className={`w-full px-2 py-1.5 border rounded text-xs font-mono ${
                                      part.partNumber && partsCache[part.partNumber]
                                        ? 'border-green-400 bg-green-50'
                                        : 'border-gray-300'
                                    }`}
                                  />
                                </div>
                                {/* Description */}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={part.description}
                                    onChange={e => updatePart(device.id, part.id, 'description', e.target.value)}
                                    placeholder="Description..."
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                  />
                                </div>
                                {/* Unit Price */}
                                <div className="w-24">
                                  <input
                                    type="number"
                                    value={part.price}
                                    onChange={e => updatePart(device.id, part.id, 'price', e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded text-sm text-right"
                                    placeholder="0"
                                  />
                                </div>
                                {/* Line Total */}
                                <div className="w-24 text-right font-medium text-sm">
                                  {((parseInt(part.quantity) || 1) * (parseFloat(part.price) || 0)).toFixed(2)} €
                                </div>
                                <button onClick={() => removePart(device.id, part.id)} className="w-8 text-red-500 hover:text-red-700 text-lg">×</button>
                              </div>
                            </div>
                          ))}
                          
                          <button onClick={() => addPart(device.id)} className="text-sm text-[#00A651] font-medium hover:underline ml-16">
                            + Ajouter pièce/service
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* GLOBAL SHIPPING SECTION */}
                <div className="mt-6 p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    📦 Frais de port
                    <span className="text-sm font-normal text-gray-500">
                      ({shippingData.parcels} colis × {shippingData.unitPrice.toFixed(2)}€)
                    </span>
                  </h4>
                  <div className="flex items-center gap-3">
                    {/* Part Number */}
                    <div className="w-32">
                      <label className="block text-xs text-gray-500 mb-1">N° Pièce</label>
                      <input
                        type="text"
                        value={shippingData.partNumber}
                        onChange={e => {
                          const pn = e.target.value;
                          const unitPrice = partsCache[pn] || shippingData.unitPrice;
                          setShippingData(prev => ({
                            ...prev,
                            partNumber: pn,
                            unitPrice: unitPrice,
                            total: unitPrice * prev.parcels
                          }));
                        }}
                        className={`w-full px-2 py-2 border rounded-lg text-sm font-mono ${
                          partsCache[shippingData.partNumber]
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {/* Parcels */}
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Nb Colis</label>
                      <input
                        type="number"
                        min="1"
                        value={shippingData.parcels}
                        onChange={e => {
                          const parcels = Math.max(1, parseInt(e.target.value) || 1);
                          setShippingData(prev => ({
                            ...prev,
                            parcels: parcels,
                            total: prev.unitPrice * parcels
                          }));
                        }}
                        className="w-full px-2 py-2 border rounded-lg text-sm text-center"
                      />
                    </div>
                    {/* Unit Price */}
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Prix/colis</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={shippingData.unitPrice}
                          onChange={e => {
                            const unitPrice = parseFloat(e.target.value) || 0;
                            setShippingData(prev => ({
                              ...prev,
                              unitPrice: unitPrice,
                              total: unitPrice * prev.parcels
                            }));
                          }}
                          className="w-full px-2 py-2 border rounded-lg text-sm text-right"
                        />
                        <span className="text-gray-500">€</span>
                      </div>
                    </div>
                    {/* Total */}
                    <div className="flex-1 text-right">
                      <label className="block text-xs text-gray-500 mb-1">Total port</label>
                      <p className="text-lg font-bold text-[#00A651]">{shippingData.total.toFixed(2)} €</p>
                    </div>
                  </div>
                  {partsCache[shippingData.partNumber] && (
                    <p className="text-xs text-green-600 mt-2">✓ Prix chargé depuis la base de données</p>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE - Pricing Summary */}
              <div className="w-80 bg-gray-50 border-l p-6 overflow-y-auto shrink-0">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">💰 Récapitulatif</h3>
                
                {/* Per-device totals */}
                <div className="space-y-3 mb-6">
                  {devicePricing.map((device, i) => {
                    const deviceContractNumber = device.isContractCovered && contractInfo?.primaryContract?.contract_number 
                      ? contractInfo.primaryContract.contract_number 
                      : null;
                    return (
                    <div key={device.id} className="rounded-lg p-3 border bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{device.model}</p>
                          <p className="text-xs text-gray-500">SN: {device.serial}</p>
                        </div>
                        <div className="text-right">
                          {device.isContractCovered && !device.needsRepair ? (
                            <>
                              <p className="font-bold text-emerald-600 text-sm">Contrat N° {deviceContractNumber}</p>
                              <p className="text-xs text-gray-400">({device.tokensRemaining} jetons restants)</p>
                            </>
                          ) : device.isContractCovered && device.needsRepair ? (
                            <>
                              <p className="font-bold text-[#00A651]">{getDeviceServiceTotal(device).toFixed(2)} €</p>
                              <p className="text-xs text-emerald-600">Cal: Contrat</p>
                              <p className="text-xs text-gray-400">Rép: {device.repairPrice}€</p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-[#00A651]">{getDeviceServiceTotal(device).toFixed(2)} €</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )})}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total services</span>
                    <span className="font-medium">{servicesSubtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Frais de port total</span>
                    <span className="font-medium">{shippingTotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#00A651] text-white px-4 py-3 rounded-lg mt-4">
                    <span className="font-bold">TOTAL HT</span>
                    <span className="font-bold text-xl">{grandTotal.toFixed(2)} €</span>
                  </div>
                </div>

                {/* Signatory */}
                <div className="mt-6 pt-4 border-t">
                  <p className="text-xs text-gray-500 uppercase mb-1">Établi par</p>
                  <p className="font-medium">{signatory}</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== STEP 2: QUOTE PREVIEW ==================== */}
          {step === 2 && (
            <div className="p-6 bg-gray-200 min-h-full">
              <div className="max-w-4xl mx-auto bg-white shadow-xl" style={{ fontFamily: 'Arial, sans-serif' }}>
                
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
                      <p className="text-gray-500">Ref: {quoteRef}</p>
                    </div>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="bg-gray-100 px-8 py-3 flex justify-between text-sm border-b">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Date</p>
                    <p className="font-medium">{today.toLocaleDateString('fr-FR')}</p>
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

                {/* ===== SERVICE DESCRIPTION SECTIONS ===== */}
                <div className="px-8 py-6 space-y-6">
                  
                  {/* Calibration Sections - One per device type */}
                  {requiredSections.calibrationTypes.map(type => {
                    const template = CALIBRATION_TEMPLATES[type];
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

                  {/* Repair Section */}
                  {requiredSections.hasRepair && (
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

                {/* ===== PRICING BREAKDOWN TABLE ===== */}
                <div className="px-8 py-6 bg-gray-50">
                  <h3 className="font-bold text-lg text-[#1a1a2e] mb-4">Récapitulatif des Prix</h3>
                  
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#1a1a2e] text-white">
                        <th className="px-4 py-3 text-center w-16">Qté</th>
                        <th className="px-4 py-3 text-left">Désignation</th>
                        <th className="px-4 py-3 text-right w-28">Prix Unit.</th>
                        <th className="px-4 py-3 text-right w-28">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devicePricing.map((device, i) => {
                        const rows = [];
                        
                        // Calibration row
                        if (device.needsCalibration) {
                          const qty = device.calibrationQty || 1;
                          const unitPrice = parseFloat(device.calibrationPrice) || 0;
                          const lineTotal = qty * unitPrice;
                          rows.push(
                            <tr key={`${device.id}-cal`} className="border-b">
                              <td className="px-4 py-3 text-center">{qty}</td>
                              <td className="px-4 py-3">
                                Étalonnage {device.model} (SN: {device.serial})
                                {device.isContractCovered && <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded">CONTRAT</span>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {device.isContractCovered ? <span className="text-emerald-600">Contrat</span> : `${unitPrice.toFixed(2)} €`}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                {device.isContractCovered ? <span className="text-emerald-600">Contrat</span> : `${lineTotal.toFixed(2)} €`}
                              </td>
                            </tr>
                          );
                        }
                        
                        // Nettoyage row - normal row like any other part
                        if (device.needsNettoyage && !device.isContractCovered) {
                          const qty = device.nettoyageQty || 1;
                          const unitPrice = parseFloat(device.nettoyagePrice) || 0;
                          const lineTotal = qty * unitPrice;
                          rows.push(
                            <tr key={`${device.id}-nettoyage`} className="border-b">
                              <td className="px-4 py-3 text-center">{qty}</td>
                              <td className="px-4 py-3">Nettoyage cellule - si requis selon l'état du capteur</td>
                              <td className="px-4 py-3 text-right">{unitPrice.toFixed(2)} €</td>
                              <td className="px-4 py-3 text-right font-medium">{lineTotal.toFixed(2)} €</td>
                            </tr>
                          );
                        }
                        
                        // Repair row
                        if (device.needsRepair) {
                          const qty = device.repairQty || 1;
                          const unitPrice = parseFloat(device.repairPrice) || 0;
                          const lineTotal = qty * unitPrice;
                          rows.push(
                            <tr key={`${device.id}-repair`} className="border-b">
                              <td className="px-4 py-3 text-center">{qty}</td>
                              <td className="px-4 py-3">Réparation {device.model} (SN: {device.serial})</td>
                              <td className="px-4 py-3 text-right">{unitPrice.toFixed(2)} €</td>
                              <td className="px-4 py-3 text-right font-medium">{lineTotal.toFixed(2)} €</td>
                            </tr>
                          );
                        }
                        
                        // Additional parts
                        device.additionalParts.forEach(part => {
                          const qty = parseInt(part.quantity) || 1;
                          const unitPrice = parseFloat(part.price) || 0;
                          const lineTotal = qty * unitPrice;
                          rows.push(
                            <tr key={`${device.id}-part-${part.id}`} className="border-b">
                              <td className="px-4 py-3 text-center">{qty}</td>
                              <td className="px-4 py-3">
                                {part.partNumber && <span className="text-gray-500 mr-1">[{part.partNumber}]</span>}
                                {part.description || 'Pièce/Service'}
                              </td>
                              <td className="px-4 py-3 text-right">{unitPrice.toFixed(2)} €</td>
                              <td className="px-4 py-3 text-right font-medium">{lineTotal.toFixed(2)} €</td>
                            </tr>
                          );
                        });
                        
                        return rows;
                      })}
                      
                      {/* Shipping row */}
                      <tr className={isFullyContractCovered ? "border-b bg-emerald-50" : "border-b bg-gray-50"}>
                        <td className="px-4 py-3 text-center">{shippingData.parcels}</td>
                        <td className="px-4 py-3">Frais de port ({shippingData.parcels} colis)</td>
                        <td className="px-4 py-3 text-right">
                          {isFullyContractCovered ? <span className="text-emerald-600">Contrat</span> : `${shippingData.unitPrice.toFixed(2)} €`}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {isFullyContractCovered ? <span className="text-emerald-600">Contrat</span> : `${shippingTotal.toFixed(2)} €`}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className={isFullyContractCovered ? "bg-emerald-600 text-white" : "bg-[#00A651] text-white"}>
                        <td colSpan={2} className="px-4 py-4"></td>
                        <td className="px-4 py-4 text-right font-bold text-lg whitespace-nowrap">TOTAL HT</td>
                        <td className="px-4 py-4 text-right font-bold text-xl whitespace-nowrap">
                          {isFullyContractCovered ? 'Contrat' : `${grandTotal.toFixed(2)} €`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  
                  {/* Nettoyage disclaimer if applicable */}
                  {devicePricing.some(d => d.needsNettoyage && !d.isContractCovered) && (
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
                      <p className="text-xs text-gray-500 uppercase mb-1">Etabli par</p>
                      <p className="font-bold text-lg">{signatory}</p>
                      <p className="text-gray-600">Lighthouse France</p>
                    </div>
                    {/* Capcert Logo */}
                    <img 
                      src="/images/logos/capcert-logo.png" 
                      alt="Capcert Certification" 
                      className="h-20 w-auto"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Signature client</p>
                    <div className="w-48 h-20 border-2 border-dashed border-gray-300 rounded"></div>
                    <p className="text-xs text-gray-400 mt-1">Lu et approuve</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-[#1a1a2e] text-white px-8 py-4 text-center text-sm">
                  <p className="font-medium">Lighthouse France SAS</p>
                  <p className="text-gray-400">16, rue Paul Sejourne - 94000 CRETEIL - Tel. 01 43 77 28 07</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== STEP 3: CONFIRM ==================== */}
          {step === 3 && (
            <div className="flex items-center justify-center min-h-full p-8">
              <div className="text-center max-w-lg">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isFullyContractCovered ? 'bg-emerald-500' : 'bg-[#00A651]'}`}>
                  <span className="text-5xl text-white">{isFullyContractCovered ? '📋' : '📧'}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {isFullyContractCovered ? 'Créer le RMA (Contrat)' : 'Confirmer l\'envoi du devis'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {isFullyContractCovered 
                    ? 'Le RMA sera créé directement en "Attente Appareil" avec le BC du contrat.'
                    : 'Le devis sera envoyé au client et disponible sur son portail.'
                  }
                </p>
                
                <div className={`rounded-xl p-6 mb-6 text-left ${isFullyContractCovered ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
                  <p className="text-lg font-bold text-gray-800 mb-1">{request.companies?.name}</p>
                  <p className="text-sm text-gray-500 mb-4">{devicePricing.length} appareil(s)</p>
                  
                  <div className="space-y-2 text-sm border-t pt-3">
                    {devicePricing.map(d => (
                      <div key={d.id} className="flex justify-between items-center">
                        <span>
                          {d.model} <span className="text-gray-400">({d.serial})</span>
                          {d.isContractCovered && <span className="ml-2 px-2 py-0.5 bg-emerald-200 text-emerald-700 rounded text-xs font-bold">CONTRAT</span>}
                        </span>
                        <span className="font-medium">
                          {d.isContractCovered ? '0,00 €' : `${(getDeviceServiceTotal(d) + d.shipping).toFixed(2)} €`}
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                      <span>Total HT</span>
                      <span className={isFullyContractCovered ? 'text-emerald-600' : 'text-[#00A651]'}>
                        {grandTotal.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>

                {isFullyContractCovered ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 text-left">
                    <p className="font-medium mb-2">🎯 Workflow contrat :</p>
                    <p className="mb-1">✓ Un numéro RMA sera attribué automatiquement</p>
                    <p className="mb-1">✓ Le BC du contrat sera copié dans le RMA</p>
                    <p className="mb-1">✓ Statut directement "Attente Appareil"</p>
                    <p>✓ Pas d'approbation client nécessaire</p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-left">
                    <p className="font-medium mb-2">Après envoi :</p>
                    <p className="mb-1">✓ Un numéro RMA sera attribué automatiquement</p>
                    <p className="mb-1">✓ Le client recevra une notification</p>
                    <p>✓ Le devis sera disponible sur son portail</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between items-center shrink-0">
          <button onClick={step === 1 ? onClose : () => setStep(step - 1)} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium">
            {step === 1 ? 'Annuler' : '← Retour'}
          </button>
          <div className="flex gap-3">
            {step < 3 && !loadingContract && !loadingParts && (
              <button onClick={() => setStep(step + 1)} className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">
                Suivant →
              </button>
            )}
            {step === 3 && (
              <button 
                onClick={sendQuote} 
                disabled={saving} 
                className={`px-10 py-3 text-white rounded-lg font-bold text-lg disabled:opacity-50 ${isFullyContractCovered ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#00A651] hover:bg-[#008f45]'}`}
              >
                {saving ? 'Envoi en cours...' : isFullyContractCovered ? '📋 Créer RMA Contrat' : '✅ Confirmer et Envoyer'}
              </button>
            )}
            {(loadingContract || loadingParts) && step === 1 && (
              <div className="px-8 py-2 bg-gray-300 text-gray-500 rounded-lg font-medium">
                Chargement...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PRICING SHEET COMPONENT
// ============================================
function PricingSheet({ notify, isAdmin }) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load parts from database
  const loadParts = useCallback(async () => {
    setLoading(true);
    
    // Load all parts using pagination (Supabase has 1000 row limit per request)
    let allParts = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('parts_pricing')
        .select('*')
        .order('part_number', { ascending: true })
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error('Error loading parts:', error);
        notify('Erreur de chargement des pièces', 'error');
        break;
      }
      
      if (data && data.length > 0) {
        allParts = [...allParts, ...data];
        offset += pageSize;
        hasMore = data.length === pageSize; // If we got less than pageSize, we're done
      } else {
        hasMore = false;
      }
    }
    
    setParts(allParts);
    console.log(`Loaded ${allParts.length} parts total`);
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  // Get unique categories for filter
  const categories = [...new Set(parts.map(p => p.category).filter(Boolean))];

  // Filter parts based on search and category
  const filteredParts = parts.filter(part => {
    const matchesSearch = !searchTerm || 
      part.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description_fr?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Handle Excel file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    
    try {
      // Load SheetJS library dynamically
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            notify('Le fichier est vide', 'error');
            setUploading(false);
            return;
          }

          // OPTIMIZED BULK IMPORT
          const partsToUpsert = [];
          let skipped = 0;

          // Get all column names from first row and normalize them
          const originalColumns = Object.keys(jsonData[0]);
          console.log('=== EXCEL COLUMN DEBUG ===');
          console.log('Raw columns:', originalColumns);
          originalColumns.forEach((col, i) => {
            console.log(`Column ${i}: "${col}" (length: ${col.length}, chars: ${[...col].map(c => c.charCodeAt(0)).join(',')})`);
          });
          console.log('First row values:', jsonData[0]);

          // Create a normalized column map (strip all whitespace, lowercase, remove accents)
          const normalizeKey = (str) => {
            return str.toString()
              .toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
              .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric
          };

          const columnMap = {};
          originalColumns.forEach(col => {
            columnMap[normalizeKey(col)] = col;
          });
          console.log('Normalized column map:', columnMap);

          // Smart column finder - finds best match
          const findColumn = (row, ...searchTerms) => {
            // First: try direct match on original columns
            for (const term of searchTerms) {
              if (row[term] !== undefined && row[term] !== null && row[term] !== '') {
                return row[term];
              }
            }
            // Second: try normalized match
            for (const term of searchTerms) {
              const normalizedTerm = normalizeKey(term);
              const matchedOriginal = columnMap[normalizedTerm];
              if (matchedOriginal && row[matchedOriginal] !== undefined && row[matchedOriginal] !== null && row[matchedOriginal] !== '') {
                return row[matchedOriginal];
              }
            }
            // Third: try partial match (column contains search term)
            const rowKeys = Object.keys(row);
            for (const term of searchTerms) {
              const normalizedTerm = normalizeKey(term);
              for (const key of rowKeys) {
                if (normalizeKey(key).includes(normalizedTerm) || normalizedTerm.includes(normalizeKey(key))) {
                  if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                    return row[key];
                  }
                }
              }
            }
            return null;
          };

          // Parse each row
          for (const row of jsonData) {
            const partNumber = findColumn(row, 'Part Number', 'PartNumber', 'part_number', 'Ref', 'Reference', 'SKU', 'PN', 'Part No', 'Numéro', 'N° Pièce');
            const description = findColumn(row, 'Description', 'Desc', 'Name', 'Nom', 'Désignation', 'Designation', 'Libellé', 'Libelle', 'Label');
            const descriptionFr = findColumn(row, 'Description FR', 'description_fr', 'Nom FR');
            const category = findColumn(row, 'Category', 'Categorie', 'Catégorie', 'Type', 'Cat', 'Famille');
            const rawPrice = findColumn(row, 'Price', 'Prix', 'Unit Price', 'Prix Unitaire', 'Cost', 'Tarif', 'PU', 'Prix HT', 'Montant');
            const rawQuantity = findColumn(row, 'Quantity', 'Stock', 'Qty', 'QTY', 'Qté', 'Quantité');
            const location = findColumn(row, 'Location', 'Emplacement', 'Loc', 'Lieu');
            const supplier = findColumn(row, 'Supplier', 'Fournisseur', 'Vendor', 'Source');

            if (!partNumber) {
              skipped++;
              continue;
            }

            const price = parseFloat(rawPrice) || null;
            const quantity = parseInt(rawQuantity) || 0;

            partsToUpsert.push({
              part_number: partNumber.toString().trim(),
              description: description ? description.toString().trim() : null,
              description_fr: descriptionFr ? descriptionFr.toString().trim() : null,
              category: category ? category.toString().trim() : null,
              unit_price: price,
              quantity_in_stock: quantity,
              location: location ? location.toString().trim() : null,
              supplier: supplier ? supplier.toString().trim() : null,
              last_price_update: new Date().toISOString()
            });
          }

          // DEDUPLICATE - keep last occurrence of each part number (in case Excel has duplicates)
          const partsMap = new Map();
          for (const part of partsToUpsert) {
            partsMap.set(part.part_number, part); // Later entries overwrite earlier ones
          }
          const uniqueParts = Array.from(partsMap.values());
          const duplicatesRemoved = partsToUpsert.length - uniqueParts.length;
          
          console.log('=== DEDUPLICATION ===');
          console.log(`Original: ${partsToUpsert.length}, Unique: ${uniqueParts.length}, Duplicates removed: ${duplicatesRemoved}`);

          // Log sample
          if (uniqueParts.length > 0) {
            console.log('=== PARSED DATA SAMPLE ===');
            console.log('First part:', uniqueParts[0]);
            console.log('Second part:', uniqueParts[1]);
            const withDesc = uniqueParts.filter(p => p.description);
            console.log(`Parts with description: ${withDesc.length}/${uniqueParts.length}`);
          }

          if (uniqueParts.length === 0) {
            notify('Aucune pièce valide trouvée dans le fichier', 'error');
            setUploading(false);
            return;
          }
          
          // Replace partsToUpsert with deduplicated list
          const partsToImport = uniqueParts;

          // Step 2: Get ALL existing part numbers
          const { data: existingParts, error: fetchError } = await supabase
            .from('parts_pricing')
            .select('part_number');
          
          if (fetchError) {
            console.error('Error fetching existing parts:', fetchError);
          }
          
          const existingPartNumbers = new Set((existingParts || []).map(p => p.part_number));
          
          // Separate into inserts and updates
          const toInsert = partsToImport.filter(p => !existingPartNumbers.has(p.part_number));
          const toUpdate = partsToImport.filter(p => existingPartNumbers.has(p.part_number));

          console.log(`=== IMPORT PLAN ===`);
          console.log(`Total unique parts: ${partsToImport.length}`);
          console.log(`New (INSERT): ${toInsert.length}`);
          console.log(`Existing (UPDATE): ${toUpdate.length}`);
          console.log(`Skipped (no part number): ${skipped}`);
          console.log(`Duplicates in Excel: ${duplicatesRemoved}`);

          // Step 3: Process inserts in batches
          const batchSize = 200; // Smaller batches for reliability
          let insertErrors = 0;
          let updateErrors = 0;
          
          // INSERT new parts
          for (let i = 0; i < toInsert.length; i += batchSize) {
            const batch = toInsert.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(toInsert.length / batchSize);
            
            console.log(`INSERT batch ${batchNum}/${totalBatches} (${batch.length} parts)`);
            
            const { error } = await supabase
              .from('parts_pricing')
              .insert(batch);
            
            if (error) {
              console.error(`INSERT batch ${batchNum} error:`, error);
              insertErrors += batch.length;
            }
          }

          // UPDATE existing parts (one by one to avoid conflicts)
          let updateCount = 0;
          for (const part of toUpdate) {
            const { error } = await supabase
              .from('parts_pricing')
              .update({
                description: part.description,
                description_fr: part.description_fr,
                category: part.category,
                unit_price: part.unit_price,
                quantity_in_stock: part.quantity_in_stock,
                location: part.location,
                supplier: part.supplier,
                last_price_update: part.last_price_update
              })
              .eq('part_number', part.part_number);
            
            if (error) {
              updateErrors++;
              if (updateErrors <= 3) console.error(`UPDATE error for ${part.part_number}:`, error);
            } else {
              updateCount++;
            }
            
            // Progress log every 100
            if (updateCount % 100 === 0) {
              console.log(`Updated ${updateCount}/${toUpdate.length}...`);
            }
          }

          const totalErrors = insertErrors + updateErrors;
          const message = `Import terminé: ${toInsert.length - insertErrors} créés, ${toUpdate.length - updateErrors} mis à jour${skipped > 0 ? `, ${skipped} ignorés` : ''}${totalErrors > 0 ? `, ${totalErrors} erreurs` : ''}`;
          
          notify(message, totalErrors > 0 ? 'error' : 'success');
          loadParts();
          setShowUploadModal(false);
        } catch (err) {
          console.error('Parse error:', err);
          notify('Erreur lors de la lecture du fichier Excel', 'error');
        }
        setUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Upload error:', err);
      notify('Erreur lors du chargement du fichier', 'error');
      setUploading(false);
    }
  };

  // Save part (create or update)
  const savePart = async (partData) => {
    try {
      if (editingPart?.id) {
        // Update
        const { error } = await supabase
          .from('parts_pricing')
          .update({ ...partData, last_price_update: new Date().toISOString() })
          .eq('id', editingPart.id);
        
        if (error) throw error;
        notify('Pièce mise à jour');
      } else {
        // Create
        const { error } = await supabase
          .from('parts_pricing')
          .insert({ ...partData, last_price_update: new Date().toISOString() });
        
        if (error) throw error;
        notify('Pièce créée');
      }
      loadParts();
      setEditingPart(null);
      setShowAddModal(false);
    } catch (err) {
      console.error('Save error:', err);
      notify('Erreur lors de la sauvegarde', 'error');
    }
  };

  // Delete part
  const deletePart = async (id) => {
    if (!confirm('Supprimer cette pièce ?')) return;
    
    const { error } = await supabase.from('parts_pricing').delete().eq('id', id);
    if (error) {
      notify('Erreur lors de la suppression', 'error');
    } else {
      notify('Pièce supprimée');
      loadParts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tarifs & Pièces</h1>
          <p className="text-gray-500">{parts.length} pièces au catalogue</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2"
          >
            📤 Importer Excel
          </button>
          {isAdmin && (
            <button
              onClick={() => { setEditingPart(null); setShowAddModal(true); }}
              className="px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium flex items-center gap-2"
            >
              + Ajouter Pièce
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Rechercher par numéro de pièce ou description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
        >
          <option value="all">Toutes catégories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-gray-500">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Aucune pièce ne correspond à votre recherche' 
                : 'Aucune pièce au catalogue. Importez un fichier Excel pour commencer.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">N° Pièce</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Catégorie</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Prix Unit.</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Emplacement</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredParts.map(part => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-[#1a1a2e]">{part.part_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-800">{part.description || '-'}</p>
                      {part.description_fr && part.description_fr !== part.description && (
                        <p className="text-xs text-gray-500">{part.description_fr}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {part.category && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{part.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#00A651]">
                      {part.unit_price ? `${part.unit_price.toFixed(2)} €` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        part.quantity_in_stock === 0 ? 'bg-red-100 text-red-700' :
                        part.quantity_in_stock <= (part.reorder_level || 5) ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {part.quantity_in_stock || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{part.location || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => { setEditingPart(part); setShowAddModal(true); }}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => deletePart(part.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Importer un fichier Excel</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <p className="text-4xl mb-4">📁</p>
                <p className="text-gray-600 mb-4">
                  Glissez-déposez votre fichier Excel ici ou
                </p>
                <label className="cursor-pointer inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  Sélectionner un fichier
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-800 mb-2">Colonnes attendues :</p>
                <ul className="text-blue-700 text-xs space-y-1">
                  <li>• <strong>Part Number</strong> (obligatoire) - Numéro de pièce unique</li>
                  <li>• <strong>Description</strong> - Description en anglais</li>
                  <li>• <strong>Description FR</strong> - Description en français</li>
                  <li>• <strong>Category</strong> - Catégorie (ex: Filtres, Capteurs...)</li>
                  <li>• <strong>Price</strong> - Prix unitaire HT</li>
                  <li>• <strong>Quantity</strong> - Quantité en stock</li>
                  <li>• <strong>Location</strong> - Emplacement de stockage</li>
                  <li>• <strong>Supplier</strong> - Fournisseur</li>
                </ul>
              </div>

              {uploading && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-green-800 font-medium">Import en cours...</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    Traitement par lots de 500 pièces. Pour 3000 pièces, comptez environ 30 secondes à 2 minutes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <PartEditModal
          part={editingPart}
          onSave={savePart}
          onClose={() => { setShowAddModal(false); setEditingPart(null); }}
        />
      )}
    </div>
  );
}

// ============================================
// PART EDIT MODAL
// ============================================
function PartEditModal({ part, onSave, onClose }) {
  const [formData, setFormData] = useState({
    part_number: part?.part_number || '',
    description: part?.description || '',
    description_fr: part?.description_fr || '',
    category: part?.category || '',
    unit_price: part?.unit_price || '',
    quantity_in_stock: part?.quantity_in_stock || 0,
    reorder_level: part?.reorder_level || 5,
    location: part?.location || '',
    supplier: part?.supplier || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.part_number.trim()) {
      alert('Le numéro de pièce est obligatoire');
      return;
    }
    onSave({
      ...formData,
      unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
      quantity_in_stock: parseInt(formData.quantity_in_stock) || 0,
      reorder_level: parseInt(formData.reorder_level) || 5
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{part ? 'Modifier la pièce' : 'Ajouter une pièce'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Pièce *</label>
              <input
                type="text"
                value={formData.part_number}
                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
                required
                disabled={!!part}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
                placeholder="ex: Filtres, Capteurs, Pompes..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (EN)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (FR)</label>
            <input
              type="text"
              value={formData.description_fr}
              onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix Unitaire (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input
                type="number"
                value={formData.quantity_in_stock}
                onChange={(e) => setFormData({ ...formData, quantity_in_stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seuil réapprovisionnement</label>
              <input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
                placeholder="ex: Étagère A3, Tiroir 12..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium"
            >
              {part ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// RENTALS SHEET - Admin Management
// ============================================
function RentalsSheet({ rentals = [], clients, notify, reload, profile, businessSettings }) {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'inventory', 'bundles', 'calendar'
  const [selectedRental, setSelectedRental] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showAddBundle, setShowAddBundle] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [editingBundle, setEditingBundle] = useState(null);

  useEffect(() => {
    const loadInventory = async () => {
      setLoading(true);
      const { data: inv, error: invErr } = await supabase.from('rental_inventory').select('*').order('model_name');
      const { data: bun, error: bunErr } = await supabase.from('rental_bundles').select('*, rental_bundle_items(*, rental_inventory(*))').order('bundle_name');
      const { data: book, error: bookErr } = await supabase.from('rental_bookings').select('*, rental_requests(rental_number, companies(name))').order('start_date', { ascending: false });
      console.log('Rental inventory load:', { inv, invErr, bun, bunErr, book, bookErr });
      if (inv) setInventory(inv);
      if (bun) setBundles(bun);
      if (book) setBookings(book);
      setLoading(false);
    };
    loadInventory();
  }, []);

  // Debug log
  useEffect(() => {
    console.log('RentalsSheet received rentals:', rentals);
  }, [rentals]);

  const getStatusStyle = (status) => {
    const styles = {
      requested: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Nouvelle demande' },
      quote_sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Devis envoyé' },
      waiting_bc: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Attente BC' },
      bc_review: { bg: 'bg-orange-100', text: 'text-orange-700', label: '⚠️ BC à vérifier' },
      bc_approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'BC approuvé' },
      shipped: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Expédié' },
      in_rental: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En location' },
      return_pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Retour attendu' },
      returned: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Retourné' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Terminé' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' }
    };
    return styles[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  };

  const pendingRequests = rentals.filter(r => r.status === 'requested');
  const bcReviewRequests = rentals.filter(r => r.status === 'bc_review');
  const activeRentals = rentals.filter(r => ['bc_approved', 'shipped', 'in_rental', 'return_pending'].includes(r.status));

  // Save device
  const saveDevice = async (deviceData) => {
    try {
      if (editingDevice) {
        await supabase.from('rental_inventory').update(deviceData).eq('id', editingDevice.id);
        notify('Appareil mis à jour!');
      } else {
        await supabase.from('rental_inventory').insert(deviceData);
        notify('Appareil ajouté!');
      }
      const { data } = await supabase.from('rental_inventory').select('*').order('model_name');
      if (data) setInventory(data);
      setShowAddDevice(false);
      setEditingDevice(null);
    } catch (err) { notify('Erreur: ' + err.message, 'error'); }
  };

  // Delete device
  const deleteDevice = async (id) => {
    if (!confirm('Supprimer cet appareil?')) return;
    try {
      await supabase.from('rental_inventory').delete().eq('id', id);
      setInventory(inventory.filter(d => d.id !== id));
      notify('Appareil supprimé');
    } catch (err) { notify('Erreur: ' + err.message, 'error'); }
  };

  // Save bundle
  const saveBundle = async (bundleData, deviceIds) => {
    try {
      let bundleId;
      if (editingBundle) {
        await supabase.from('rental_bundles').update(bundleData).eq('id', editingBundle.id);
        bundleId = editingBundle.id;
        await supabase.from('rental_bundle_items').delete().eq('bundle_id', bundleId);
      } else {
        const { data } = await supabase.from('rental_bundles').insert(bundleData).select().single();
        bundleId = data.id;
      }
      for (const invId of deviceIds) {
        await supabase.from('rental_bundle_items').insert({ bundle_id: bundleId, inventory_id: invId });
      }
      notify(editingBundle ? 'Kit mis à jour!' : 'Kit créé!');
      const { data: bun } = await supabase.from('rental_bundles').select('*, rental_bundle_items(*, rental_inventory(*))').order('bundle_name');
      if (bun) setBundles(bun);
      setShowAddBundle(false);
      setEditingBundle(null);
    } catch (err) { notify('Erreur: ' + err.message, 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Locations</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAddDevice(true)} className="px-4 py-2 bg-[#8B5CF6] text-white rounded-lg font-medium hover:bg-[#7C3AED]">+ Ajouter Appareil</button>
          <button onClick={() => setShowAddBundle(true)} className="px-4 py-2 bg-[#8B5CF6]/80 text-white rounded-lg font-medium hover:bg-[#7C3AED]">+ Créer Kit</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-3xl font-bold text-amber-600">{pendingRequests.length}</p><p className="text-gray-500 text-sm">Nouvelles demandes</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-3xl font-bold text-orange-600">{bcReviewRequests.length}</p><p className="text-gray-500 text-sm">BC à vérifier</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-3xl font-bold text-purple-600">{activeRentals.length}</p><p className="text-gray-500 text-sm">Locations actives</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-3xl font-bold text-[#8B5CF6]">{inventory.length}</p><p className="text-gray-500 text-sm">Appareils en parc</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'requests', label: 'Demandes', badge: pendingRequests.length + bcReviewRequests.length },
          { id: 'inventory', label: 'Inventaire', badge: inventory.length },
          { id: 'bundles', label: 'Kits', badge: bundles.length },
          { id: 'calendar', label: 'Calendrier' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id ? 'border-[#8B5CF6] text-[#8B5CF6]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label} {tab.badge > 0 && <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">N° Location</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Client</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Période</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Équipement</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rentals.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucune demande de location</td></tr>
              ) : rentals.map(rental => {
                const style = getStatusStyle(rental.status);
                const days = Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000*60*60*24)) + 1;
                return (
                  <tr key={rental.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="font-bold text-[#8B5CF6]">{rental.rental_number}</span><p className="text-xs text-gray-400">{new Date(rental.created_at).toLocaleDateString('fr-FR')}</p></td>
                    <td className="px-4 py-3"><span className="font-medium">{rental.companies?.name}</span></td>
                    <td className="px-4 py-3"><span className="text-sm">{new Date(rental.start_date).toLocaleDateString('fr-FR')} → {new Date(rental.end_date).toLocaleDateString('fr-FR')}</span><p className="text-xs text-gray-400">{days} jours</p></td>
                    <td className="px-4 py-3"><span className="text-sm">{rental.rental_request_items?.length || 0} appareil(s)</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedRental(rental)} className="px-3 py-1 bg-[#8B5CF6] text-white text-sm rounded hover:bg-[#7C3AED]">Gérer</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Modèle</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">N° Série</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Prix/Jour</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Prix/Semaine</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Prix/Mois</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun appareil dans l'inventaire de location</td></tr>
              ) : inventory.map(device => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className="font-medium">{device.model_name}</span><p className="text-xs text-gray-400">{device.device_type}</p></td>
                  <td className="px-4 py-3"><span className="font-mono text-sm">{device.serial_number}</span></td>
                  <td className="px-4 py-3"><span className="font-medium">€{device.price_per_day}</span></td>
                  <td className="px-4 py-3">{device.price_per_week ? `€${device.price_per_week}` : <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3">{device.price_per_month ? `€${device.price_per_month}` : <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3">{device.is_available ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Disponible</span> : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Indisponible</span>}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => { setEditingDevice(device); setShowAddDevice(true); }} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded hover:bg-gray-200">✏️</button>
                    <button onClick={() => deleteDevice(device.id)} className="px-2 py-1 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bundles Tab */}
      {activeTab === 'bundles' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-8 text-center text-gray-400">Aucun kit créé</div>
          ) : bundles.map(bundle => (
            <div key={bundle.id} className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex justify-between items-start mb-4">
                <div><h3 className="font-bold text-gray-800">{bundle.bundle_name}</h3><p className="text-sm text-gray-500">{bundle.bundle_code}</p></div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingBundle(bundle); setShowAddBundle(true); }} className="p-1 hover:bg-gray-100 rounded">✏️</button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{bundle.description_fr || bundle.description || '—'}</p>
              <div className="text-xs text-gray-400 mb-4">Contient: {bundle.rental_bundle_items?.map(bi => bi.rental_inventory?.model_name).join(', ')}</div>
              <div className="flex justify-between items-end">
                <div><p className="text-2xl font-bold text-[#8B5CF6]">€{bundle.price_per_day}</p><p className="text-xs text-gray-500">/jour</p></div>
                {bundle.is_active ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Actif</span> : <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">Inactif</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && <RentalCalendarView bookings={bookings} inventory={inventory} />}

      {/* Add/Edit Device Modal */}
      {showAddDevice && <RentalDeviceModal device={editingDevice} onSave={saveDevice} onClose={() => { setShowAddDevice(false); setEditingDevice(null); }} />}

      {/* Add/Edit Bundle Modal */}
      {showAddBundle && <RentalBundleModal bundle={editingBundle} inventory={inventory} onSave={saveBundle} onClose={() => { setShowAddBundle(false); setEditingBundle(null); }} />}

      {/* Rental Detail Modal */}
      {selectedRental && <RentalAdminModal rental={selectedRental} onClose={() => setSelectedRental(null)} notify={notify} reload={reload} businessSettings={businessSettings} />}
    </div>
  );
}

// Rental Device Modal
function RentalDeviceModal({ device, onSave, onClose }) {
  const [formData, setFormData] = useState({
    serial_number: device?.serial_number || '',
    model_name: device?.model_name || '',
    device_type: device?.device_type || 'particle_counter',
    brand: device?.brand || 'Lighthouse',
    description: device?.description || '',
    description_fr: device?.description_fr || '',
    price_per_day: device?.price_per_day || '',
    price_per_week: device?.price_per_week || '',
    price_per_month: device?.price_per_month || '',
    min_rental_days: device?.min_rental_days || 1,
    is_available: device?.is_available !== false,
    availability_notes: device?.availability_notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.serial_number || !formData.model_name || !formData.price_per_day) {
      alert('Veuillez remplir les champs obligatoires (N° Série, Modèle, Prix/Jour)');
      return;
    }
    onSave({
      ...formData,
      price_per_day: parseFloat(formData.price_per_day),
      price_per_week: formData.price_per_week ? parseFloat(formData.price_per_week) : null,
      price_per_month: formData.price_per_month ? parseFloat(formData.price_per_month) : null,
      min_rental_days: parseInt(formData.min_rental_days) || 1
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{device ? 'Modifier l\'appareil' : 'Ajouter un appareil'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Série *</label>
              <input type="text" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required disabled={!!device} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modèle *</label>
              <input type="text" value={formData.model_name} onChange={e => setFormData({...formData, model_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={formData.device_type} onChange={e => setFormData({...formData, device_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="particle_counter">Compteur de particules</option>
                <option value="bio_collector">Bio collecteur</option>
                <option value="liquid_counter">Compteur liquide</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
              <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (FR)</label>
            <textarea value={formData.description_fr} onChange={e => setFormData({...formData, description_fr: e.target.value})} className="w-full px-3 py-2 border rounded-lg h-20 resize-none" placeholder="Description visible par les clients" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix/Jour (€) *</label>
              <input type="number" step="0.01" value={formData.price_per_day} onChange={e => setFormData({...formData, price_per_day: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix/Semaine (€)</label>
              <input type="number" step="0.01" value={formData.price_per_week} onChange={e => setFormData({...formData, price_per_week: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Auto: 7x jour" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix/Mois (€)</label>
              <input type="number" step="0.01" value={formData.price_per_month} onChange={e => setFormData({...formData, price_per_month: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Auto: 30x jour" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée min. (jours)</label>
              <input type="number" value={formData.min_rental_days} onChange={e => setFormData({...formData, min_rental_days: e.target.value})} className="w-full px-3 py-2 border rounded-lg" min="1" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="is_available" checked={formData.is_available} onChange={e => setFormData({...formData, is_available: e.target.checked})} className="w-5 h-5 rounded" />
              <label htmlFor="is_available" className="text-sm font-medium text-gray-700">Disponible à la location</label>
            </div>
          </div>
          {!formData.is_available && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison d'indisponibilité</label>
              <input type="text" value={formData.availability_notes} onChange={e => setFormData({...formData, availability_notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: En maintenance jusqu'au 15/02" />
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Annuler</button>
            <button type="submit" className="flex-1 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-medium">{device ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Rental Bundle Modal
function RentalBundleModal({ bundle, inventory, onSave, onClose }) {
  const [formData, setFormData] = useState({
    bundle_name: bundle?.bundle_name || '',
    bundle_code: bundle?.bundle_code || '',
    description: bundle?.description || '',
    description_fr: bundle?.description_fr || '',
    price_per_day: bundle?.price_per_day || '',
    price_per_week: bundle?.price_per_week || '',
    price_per_month: bundle?.price_per_month || '',
    min_rental_days: bundle?.min_rental_days || 1,
    is_active: bundle?.is_active !== false
  });
  const [selectedDevices, setSelectedDevices] = useState(bundle?.rental_bundle_items?.map(bi => bi.inventory_id) || []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.bundle_name || !formData.price_per_day || selectedDevices.length === 0) {
      alert('Veuillez remplir les champs obligatoires et sélectionner au moins un appareil');
      return;
    }
    onSave({
      bundle_name: formData.bundle_name,
      bundle_code: formData.bundle_code || null,
      description: formData.description,
      description_fr: formData.description_fr,
      price_per_day: parseFloat(formData.price_per_day),
      price_per_week: formData.price_per_week ? parseFloat(formData.price_per_week) : null,
      price_per_month: formData.price_per_month ? parseFloat(formData.price_per_month) : null,
      min_rental_days: parseInt(formData.min_rental_days) || 1,
      is_active: formData.is_active
    }, selectedDevices);
  };

  const toggleDevice = (id) => {
    setSelectedDevices(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{bundle ? 'Modifier le kit' : 'Créer un kit'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom du kit *</label><input type="text" value={formData.bundle_name} onChange={e => setFormData({...formData, bundle_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required placeholder="Ex: Kit Comptage Complet" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Code</label><input type="text" value={formData.bundle_code} onChange={e => setFormData({...formData, bundle_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: KIT-001" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Description (FR)</label><textarea value={formData.description_fr} onChange={e => setFormData({...formData, description_fr: e.target.value})} className="w-full px-3 py-2 border rounded-lg h-20 resize-none" /></div>
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix/Jour (€) *</label><input type="number" step="0.01" value={formData.price_per_day} onChange={e => setFormData({...formData, price_per_day: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix/Semaine (€)</label><input type="number" step="0.01" value={formData.price_per_week} onChange={e => setFormData({...formData, price_per_week: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix/Mois (€)</label><input type="number" step="0.01" value={formData.price_per_month} onChange={e => setFormData({...formData, price_per_month: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Appareils inclus *</label>
            <div className="grid md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {inventory.map(device => (
                <label key={device.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${selectedDevices.includes(device.id) ? 'bg-[#8B5CF6]/10' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selectedDevices.includes(device.id)} onChange={() => toggleDevice(device.id)} className="w-4 h-4 rounded" />
                  <span className="text-sm">{device.model_name} <span className="text-gray-400">({device.serial_number})</span></span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{selectedDevices.length} appareil(s) sélectionné(s)</p>
          </div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 rounded" /><label className="text-sm font-medium text-gray-700">Kit actif (visible par les clients)</label></div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Annuler</button>
            <button type="submit" className="flex-1 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-medium">{bundle ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Rental Calendar View
function RentalCalendarView({ bookings, inventory }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getBookingsForDay = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return bookings.filter(b => b.start_date <= dateStr && b.end_date >= dateStr);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded">←</button>
        <h3 className="text-lg font-bold">{currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d} className="text-center text-sm font-medium text-gray-500 py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: (new Date(year, month, 1).getDay() + 6) % 7 }, (_, i) => <div key={`pad-${i}`} className="h-24" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayBookings = getBookingsForDay(day);
          return (
            <div key={day} className="h-24 border rounded p-1 text-xs overflow-hidden">
              <div className="font-medium text-gray-700 mb-1">{day}</div>
              {dayBookings.slice(0, 3).map((b, idx) => {
                const device = inventory.find(d => d.id === b.inventory_id);
                return (
                  <div key={idx} className="bg-[#8B5CF6]/20 text-[#8B5CF6] px-1 rounded truncate mb-0.5" title={`${device?.model_name || 'Device'} - ${b.rental_requests?.companies?.name || ''}`}>
                    {device?.model_name?.slice(0, 10) || '?'}
                  </div>
                );
              })}
              {dayBookings.length > 3 && <div className="text-gray-400">+{dayBookings.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Rental Admin Modal - Full management
function RentalAdminModal({ rental, onClose, notify, reload, businessSettings }) {
  const [status, setStatus] = useState(rental.status);
  const [saving, setSaving] = useState(false);
  const [quoteShipping, setQuoteShipping] = useState(rental.quote_shipping || 0);
  const [quoteNotes, setQuoteNotes] = useState(rental.quote_notes || '');
  const [trackingNumber, setTrackingNumber] = useState(rental.outbound_tracking || '');
  const [returnCondition, setReturnCondition] = useState(rental.return_condition || 'good');
  const [returnNotes, setReturnNotes] = useState(rental.return_notes || '');

  const subtotal = rental.quote_subtotal || rental.rental_request_items?.reduce((s, i) => s + (i.line_total || 0), 0) || 0;
  const taxRate = rental.quote_tax_rate || 20;
  const totalHT = subtotal + parseFloat(quoteShipping || 0);
  const tax = totalHT * (taxRate / 100);
  const totalTTC = totalHT + tax;

  const updateStatus = async (newStatus, additionalData = {}) => {
    setSaving(true);
    try {
      await supabase.from('rental_requests').update({ status: newStatus, ...additionalData }).eq('id', rental.id);
      notify('Statut mis à jour!');
      setStatus(newStatus);
      reload();
    } catch (err) { notify('Erreur: ' + err.message, 'error'); }
    setSaving(false);
  };

  const sendQuote = async () => {
    setSaving(true);
    try {
      // Generate quote PDF URL (would be actual PDF generation in production)
      const quoteUrl = `https://your-domain.com/quotes/rental_${rental.rental_number}.pdf`;
      await supabase.from('rental_requests').update({
        status: 'quote_sent',
        quote_shipping: parseFloat(quoteShipping) || 0,
        quote_tax_rate: taxRate,
        quote_tax: tax,
        quote_total_ht: totalHT,
        quote_total_ttc: totalTTC,
        quote_notes: quoteNotes,
        quote_url: quoteUrl,
        quoted_at: new Date().toISOString(),
        quote_valid_until: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
      }).eq('id', rental.id);
      notify('Devis envoyé!');
      setStatus('quote_sent');
      reload();
    } catch (err) { notify('Erreur: ' + err.message, 'error'); }
    setSaving(false);
  };

  const approveBC = async () => {
    await updateStatus('bc_approved', { bc_approved_at: new Date().toISOString() });
  };

  const rejectBC = async () => {
    const reason = prompt('Raison du rejet:');
    if (!reason) return;
    await updateStatus('waiting_bc', { bc_rejected_at: new Date().toISOString(), bc_rejection_reason: reason, bc_file_url: null });
  };

  const markShipped = async () => {
    if (!trackingNumber) { notify('Entrez le numéro de suivi', 'error'); return; }
    await updateStatus('shipped', { 
      outbound_tracking: trackingNumber, 
      outbound_shipped_at: new Date().toISOString(),
      rental_started_at: new Date(rental.start_date).toISOString()
    });
  };

  const markInRental = async () => {
    await updateStatus('in_rental');
  };

  const markReturnPending = async () => {
    await updateStatus('return_pending', { rental_ended_at: new Date(rental.end_date).toISOString() });
  };

  const markReturned = async () => {
    await updateStatus('returned', { 
      returned_at: new Date().toISOString(),
      return_condition: returnCondition,
      return_notes: returnNotes
    });
    // Release bookings
    await supabase.from('rental_bookings').delete().eq('rental_request_id', rental.id);
  };

  const completeRental = async () => {
    await updateStatus('completed', { completed_at: new Date().toISOString() });
  };

  const getStatusStyle = (s) => {
    const styles = {
      requested: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Nouvelle demande' },
      quote_sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Devis envoyé' },
      waiting_bc: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Attente BC' },
      bc_review: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'BC à vérifier' },
      bc_approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'BC approuvé' },
      shipped: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Expédié' },
      in_rental: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En location' },
      return_pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Retour attendu' },
      returned: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Retourné' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Terminé' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' }
    };
    return styles[s] || { bg: 'bg-gray-100', text: 'text-gray-700', label: s };
  };
  const style = getStatusStyle(status);
  const days = Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / (1000*60*60*24)) + 1;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#8B5CF6] text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{rental.rental_number}</h2>
            <p className="text-sm text-white/70">{rental.companies?.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Period */}
          <div className="flex items-center justify-between">
            <span className={`px-4 py-2 rounded-full font-medium ${style.bg} ${style.text}`}>{style.label}</span>
            <div className="text-right">
              <p className="font-bold">{new Date(rental.start_date).toLocaleDateString('fr-FR')} → {new Date(rental.end_date).toLocaleDateString('fr-FR')}</p>
              <p className="text-sm text-gray-500">{days} jours de location</p>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <h3 className="font-bold text-gray-700 mb-3">Équipement</h3>
            <div className="bg-gray-50 rounded-lg divide-y">
              {rental.rental_request_items?.map((item, idx) => (
                <div key={idx} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    <p className="text-sm text-gray-500">{item.rental_days} jours × €{item.applied_rate} ({item.rate_type})</p>
                  </div>
                  <p className="font-bold">€{item.line_total?.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quote Section (for requested status) */}
          {status === 'requested' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-bold text-amber-800 mb-4">Créer le devis</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Frais de port (€)</label>
                  <input type="number" step="0.01" value={quoteShipping} onChange={e => setQuoteShipping(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes devis</label>
                  <input type="text" value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-1"><span>Sous-total</span><span>€{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between mb-1"><span>Frais de port</span><span>€{parseFloat(quoteShipping || 0).toFixed(2)}</span></div>
                <div className="flex justify-between mb-1 font-bold"><span>Total HT</span><span>€{totalHT.toFixed(2)}</span></div>
                <div className="flex justify-between mb-1 text-sm text-gray-500"><span>TVA ({taxRate}%)</span><span>€{tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total TTC</span><span className="text-[#8B5CF6]">€{totalTTC.toFixed(2)}</span></div>
              </div>
              <button onClick={sendQuote} disabled={saving} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold disabled:opacity-50">{saving ? 'Envoi...' : 'Envoyer le devis'}</button>
            </div>
          )}

          {/* BC Review Section */}
          {status === 'bc_review' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-bold text-orange-800 mb-4">Vérifier le BC</h3>
              {rental.bc_file_url && (
                <a href={rental.bc_file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-lg mb-4 hover:bg-gray-50">
                  <span className="text-2xl">📄</span>
                  <div><p className="font-medium">BC soumis par {rental.bc_signed_by}</p><p className="text-sm text-gray-500">Le {new Date(rental.bc_submitted_at).toLocaleDateString('fr-FR')}</p></div>
                </a>
              )}
              <div className="flex gap-3">
                <button onClick={rejectBC} disabled={saving} className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium">Rejeter</button>
                <button onClick={approveBC} disabled={saving} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium">Approuver</button>
              </div>
            </div>
          )}

          {/* Ship Section */}
          {status === 'bc_approved' && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <h3 className="font-bold text-cyan-800 mb-4">Expédition</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">N° de suivi</label>
                <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="1Z..." />
              </div>
              <button onClick={markShipped} disabled={saving || !trackingNumber} className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-bold disabled:opacity-50">Marquer comme expédié</button>
            </div>
          )}

          {/* In Rental Actions */}
          {status === 'shipped' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <button onClick={markInRental} disabled={saving} className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold">Client a reçu → En location</button>
            </div>
          )}

          {status === 'in_rental' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-700 mb-4">Fin de location prévue: <strong>{new Date(rental.end_date).toLocaleDateString('fr-FR')}</strong></p>
              <button onClick={markReturnPending} disabled={saving} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold">Période terminée → Attente retour</button>
            </div>
          )}

          {status === 'return_pending' && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h3 className="font-bold text-teal-800 mb-4">Réception retour</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">État du matériel</label>
                  <select value={returnCondition} onChange={e => setReturnCondition(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option value="good">Bon état</option>
                    <option value="damaged">Endommagé</option>
                    <option value="missing_items">Éléments manquants</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input type="text" value={returnNotes} onChange={e => setReturnNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <button onClick={markReturned} disabled={saving} className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold">Confirmer la réception</button>
            </div>
          )}

          {status === 'returned' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 mb-4">Matériel retourné. État: <strong>{returnCondition === 'good' ? 'Bon état' : returnCondition === 'damaged' ? 'Endommagé' : 'Éléments manquants'}</strong></p>
              <button onClick={completeRental} disabled={saving} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold">Clôturer la location</button>
            </div>
          )}

          {/* Tracking Info */}
          {rental.outbound_tracking && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 mb-2">Suivi expédition</h3>
              <p className="font-mono">{rental.outbound_tracking}</p>
            </div>
          )}

          {/* Shipping Address */}
          {rental.shipping_address && (
            <div>
              <h3 className="font-bold text-gray-700 mb-2">Adresse de livraison</h3>
              <p className="text-gray-600">{rental.shipping_address.company_name}</p>
              {rental.shipping_address.attention && <p className="text-gray-600">À l'att. {rental.shipping_address.attention}</p>}
              <p className="text-gray-600">{rental.shipping_address.address_line1}</p>
              <p className="text-gray-600">{rental.shipping_address.postal_code} {rental.shipping_address.city}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// UPS TOOLS SHEET - Testing & Shipping Tools
// ============================================
function UPSToolsSheet({ notify }) {
  const [activeTab, setActiveTab] = useState('test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  // Test connection state
  const [connectionStatus, setConnectionStatus] = useState(null);
  
  // Rate calculator state
  const [rateForm, setRateForm] = useState({
    postalCode: '',
    city: '',
    countryCode: 'FR',
    weight: 5,
    length: 30,
    width: 30,
    height: 30
  });
  const [rates, setRates] = useState(null);
  
  // Create shipment state
  const [shipmentForm, setShipmentForm] = useState({
    name: '',
    company: '',
    phone: '',
    addressLine1: '',
    city: '',
    postalCode: '',
    countryCode: 'FR',
    weight: 5,
    length: 30,
    width: 30,
    height: 30,
    serviceCode: '11',
    isReturn: false
  });
  const [shipmentResult, setShipmentResult] = useState(null);
  
  // Track package state
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);

  // Test UPS Connection
  const testConnection = async () => {
    setLoading(true);
    setConnectionStatus(null);
    try {
      // Get current session for auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Session error: ' + sessionError.message);
      }
      
      if (!session) {
        throw new Error('No active session - please log in again');
      }
      
      console.log('Session found, calling UPS function...');
      
      const { data, error } = await supabase.functions.invoke('ups-shipping', {
        body: { action: 'test_connection' }
      });
      
      if (error) {
        console.error('Function error:', error);
        throw error;
      }
      
      setConnectionStatus(data);
      notify(data.success ? 'Connexion UPS réussie!' : 'Échec de connexion', data.success ? 'success' : 'error');
    } catch (err) {
      console.error('Test connection error:', err);
      setConnectionStatus({ success: false, error: err.message });
      notify('Erreur: ' + err.message, 'error');
    }
    setLoading(false);
  };

  // Get shipping rates
  const getRates = async () => {
    setLoading(true);
    setRates(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('ups-shipping', {
        body: {
          action: 'get_rates',
          shipTo: {
            name: 'Test Customer',
            addressLine1: rateForm.addressLine1 || '123 Test Street',
            city: rateForm.city,
            postalCode: rateForm.postalCode,
            countryCode: rateForm.countryCode
          },
          packages: [{
            weight: parseFloat(rateForm.weight) || 5,
            length: parseFloat(rateForm.length) || 30,
            width: parseFloat(rateForm.width) || 30,
            height: parseFloat(rateForm.height) || 30
          }]
        },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });
      if (error) throw error;
      setRates(data);
      notify('Tarifs récupérés!', 'success');
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setLoading(false);
  };

  // Create shipment
  const createShipment = async () => {
    setLoading(true);
    setShipmentResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('ups-shipping', {
        body: {
          action: 'create_shipment',
          shipTo: {
            name: shipmentForm.name || 'Test Customer',
            company: shipmentForm.company || shipmentForm.name || 'Customer',
            attentionName: shipmentForm.name || 'Customer',
            phone: shipmentForm.phone || '0100000000',
            addressLine1: shipmentForm.addressLine1,
            city: shipmentForm.city,
            postalCode: shipmentForm.postalCode,
            countryCode: shipmentForm.countryCode
          },
          shipFrom: shipmentForm.isReturn ? {
            name: shipmentForm.name || 'Test Customer',
            company: shipmentForm.company || shipmentForm.name || 'Customer',
            attentionName: shipmentForm.name || 'Customer',
            phone: shipmentForm.phone || '0100000000',
            addressLine1: shipmentForm.addressLine1,
            city: shipmentForm.city,
            postalCode: shipmentForm.postalCode,
            countryCode: shipmentForm.countryCode
          } : undefined,
          packages: [{
            weight: parseFloat(shipmentForm.weight) || 5,
            length: parseFloat(shipmentForm.length) || 30,
            width: parseFloat(shipmentForm.width) || 30,
            height: parseFloat(shipmentForm.height) || 30,
            description: 'Calibration Equipment'
          }],
          serviceCode: shipmentForm.serviceCode,
          isReturn: shipmentForm.isReturn,
          description: 'RMA Test Shipment'
        },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });
      if (error) throw error;
      setShipmentResult(data);
      notify(data.success ? 'Expédition créée!' : 'Échec création', data.success ? 'success' : 'error');
    } catch (err) {
      setShipmentResult({ success: false, error: err.message });
      notify('Erreur: ' + err.message, 'error');
    }
    setLoading(false);
  };

  // Track shipment
  const trackPackage = async () => {
    if (!trackingNumber.trim()) {
      notify('Veuillez entrer un numéro de suivi', 'error');
      return;
    }
    setLoading(true);
    setTrackingResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('ups-shipping', {
        body: {
          action: 'track',
          trackingNumber: trackingNumber.trim()
        },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });
      if (error) throw error;
      setTrackingResult(data);
      notify('Suivi récupéré!', 'success');
    } catch (err) {
      setTrackingResult({ success: false, error: err.message });
      notify('Erreur: ' + err.message, 'error');
    }
    setLoading(false);
  };

  // Download label PDF
  const downloadLabel = (labelData, trackingNumber) => {
    const byteCharacters = atob(labelData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UPS-Label-${trackingNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1a2e]">📦 UPS Tools</h2>
          <p className="text-gray-500">Test et outils d'expédition UPS</p>
        </div>
        <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-medium">
          🧪 Mode SANDBOX (Test)
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: 'test', label: '🔌 Test Connexion' },
          { id: 'rates', label: '💰 Calculer Tarifs' },
          { id: 'ship', label: '📤 Créer Expédition' },
          { id: 'track', label: '🔍 Suivi Colis' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${
              activeTab === tab.id 
                ? 'border-[#00A651] text-[#00A651]' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Test Connection Tab */}
      {activeTab === 'test' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-800 mb-2">Test de connexion API UPS</h3>
            <p className="text-blue-600 text-sm mb-4">
              Vérifie que vos identifiants UPS sont corrects et que l'API est accessible.
            </p>
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50"
            >
              {loading ? 'Test en cours...' : 'Tester la connexion'}
            </button>
          </div>

          {connectionStatus && (
            <div className={`p-4 rounded-lg ${connectionStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h4 className={`font-bold ${connectionStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                {connectionStatus.success ? '✅ Connexion réussie!' : '❌ Échec de connexion'}
              </h4>
              {connectionStatus.success ? (
                <div className="mt-2 text-green-700">
                  <p><strong>Environnement:</strong> {connectionStatus.environment}</p>
                  <p><strong>Compte:</strong> {connectionStatus.accountNumber}</p>
                  <p><strong>Message:</strong> {connectionStatus.message}</p>
                </div>
              ) : (
                <p className="mt-2 text-red-700">{connectionStatus.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rate Calculator Tab */}
      {activeTab === 'rates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code Postal *</label>
              <input
                type="text"
                value={rateForm.postalCode}
                onChange={e => setRateForm({...rateForm, postalCode: e.target.value})}
                placeholder="75001"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville *</label>
              <input
                type="text"
                value={rateForm.city}
                onChange={e => setRateForm({...rateForm, city: e.target.value})}
                placeholder="Paris"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pays</label>
              <select
                value={rateForm.countryCode}
                onChange={e => setRateForm({...rateForm, countryCode: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="FR">France</option>
                <option value="BE">Belgique</option>
                <option value="CH">Suisse</option>
                <option value="DE">Allemagne</option>
                <option value="ES">Espagne</option>
                <option value="IT">Italie</option>
                <option value="GB">Royaume-Uni</option>
                <option value="US">États-Unis</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Poids (kg)</label>
              <input
                type="number"
                value={rateForm.weight}
                onChange={e => setRateForm({...rateForm, weight: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dimensions (L × l × H cm)</label>
              <div className="flex gap-2">
                <input type="number" value={rateForm.length} onChange={e => setRateForm({...rateForm, length: e.target.value})} className="w-full px-2 py-2 border rounded-lg" placeholder="L" />
                <input type="number" value={rateForm.width} onChange={e => setRateForm({...rateForm, width: e.target.value})} className="w-full px-2 py-2 border rounded-lg" placeholder="l" />
                <input type="number" value={rateForm.height} onChange={e => setRateForm({...rateForm, height: e.target.value})} className="w-full px-2 py-2 border rounded-lg" placeholder="H" />
              </div>
            </div>
          </div>
          
          <button
            onClick={getRates}
            disabled={loading || !rateForm.postalCode || !rateForm.city}
            className="px-6 py-3 bg-[#00A651] hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50"
          >
            {loading ? 'Calcul en cours...' : 'Calculer les tarifs'}
          </button>

          {rates && rates.success && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-gray-800 mb-3">Tarifs disponibles:</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-3 py-2 text-left">Service</th>
                    <th className="px-3 py-2 text-right">Prix</th>
                    <th className="px-3 py-2 text-right">Délai</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.rates.map((rate, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-3 py-2">{rate.serviceName}</td>
                      <td className="px-3 py-2 text-right font-bold">{rate.totalPrice} {rate.currency}</td>
                      <td className="px-3 py-2 text-right">{rate.estimatedDays ? `${rate.estimatedDays} jours` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {rates && !rates.success && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              Erreur: {rates.error}
            </div>
          )}
        </div>
      )}

      {/* Create Shipment Tab */}
      {activeTab === 'ship' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
            ⚠️ Mode SANDBOX: Les étiquettes générées ne sont PAS valides pour de vraies expéditions.
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom du destinataire *</label>
              <input
                type="text"
                value={shipmentForm.name}
                onChange={e => setShipmentForm({...shipmentForm, name: e.target.value})}
                placeholder="Jean Dupont"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Société</label>
              <input
                type="text"
                value={shipmentForm.company}
                onChange={e => setShipmentForm({...shipmentForm, company: e.target.value})}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Téléphone</label>
              <input
                type="text"
                value={shipmentForm.phone}
                onChange={e => setShipmentForm({...shipmentForm, phone: e.target.value})}
                placeholder="0612345678"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adresse *</label>
              <input
                type="text"
                value={shipmentForm.addressLine1}
                onChange={e => setShipmentForm({...shipmentForm, addressLine1: e.target.value})}
                placeholder="123 Rue de Test"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code Postal *</label>
              <input
                type="text"
                value={shipmentForm.postalCode}
                onChange={e => setShipmentForm({...shipmentForm, postalCode: e.target.value})}
                placeholder="75001"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville *</label>
              <input
                type="text"
                value={shipmentForm.city}
                onChange={e => setShipmentForm({...shipmentForm, city: e.target.value})}
                placeholder="Paris"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pays</label>
              <select
                value={shipmentForm.countryCode}
                onChange={e => setShipmentForm({...shipmentForm, countryCode: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="FR">France</option>
                <option value="BE">Belgique</option>
                <option value="CH">Suisse</option>
                <option value="DE">Allemagne</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Service</label>
              <select
                value={shipmentForm.serviceCode}
                onChange={e => setShipmentForm({...shipmentForm, serviceCode: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="11">UPS Standard</option>
                <option value="07">UPS Express</option>
                <option value="54">UPS Express Plus</option>
                <option value="65">UPS Express Saver</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Poids (kg)</label>
              <input
                type="number"
                value={shipmentForm.weight}
                onChange={e => setShipmentForm({...shipmentForm, weight: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={shipmentForm.isReturn}
                  onChange={e => setShipmentForm({...shipmentForm, isReturn: e.target.checked})}
                  className="w-5 h-5"
                />
                <span>Étiquette retour (client → Lighthouse)</span>
              </label>
            </div>
          </div>
          
          <button
            onClick={createShipment}
            disabled={loading || !shipmentForm.name || !shipmentForm.addressLine1 || !shipmentForm.postalCode || !shipmentForm.city}
            className="px-6 py-3 bg-[#00A651] hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50"
          >
            {loading ? 'Création en cours...' : '📦 Créer l\'expédition'}
          </button>

          {shipmentResult && shipmentResult.success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-green-800 mb-2">✅ Expédition créée!</h4>
              <p><strong>N° Suivi:</strong> {shipmentResult.trackingNumber}</p>
              {shipmentResult.totalCharges && (
                <p><strong>Coût:</strong> {shipmentResult.totalCharges.MonetaryValue} {shipmentResult.totalCharges.CurrencyCode}</p>
              )}
              {shipmentResult.packages?.map((pkg, i) => (
                <div key={i} className="mt-3">
                  <p className="text-sm text-gray-600">Colis {i + 1}: {pkg.trackingNumber}</p>
                  {pkg.labelData && (
                    <button
                      onClick={() => downloadLabel(pkg.labelData, pkg.trackingNumber)}
                      className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                    >
                      📄 Télécharger l'étiquette PDF
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {shipmentResult && !shipmentResult.success && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              ❌ Erreur: {shipmentResult.error}
            </div>
          )}
        </div>
      )}

      {/* Track Package Tab */}
      {activeTab === 'track' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Numéro de suivi UPS</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="1Z999AA10123456784"
                className="flex-1 px-3 py-2 border rounded-lg font-mono"
              />
              <button
                onClick={trackPackage}
                disabled={loading || !trackingNumber.trim()}
                className="px-6 py-2 bg-[#00A651] hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {loading ? '...' : 'Suivre'}
              </button>
            </div>
          </div>

          {trackingResult && trackingResult.success && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-gray-800 mb-2">Résultat du suivi:</h4>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-96">
                {JSON.stringify(trackingResult.tracking, null, 2)}
              </pre>
            </div>
          )}
          
          {trackingResult && !trackingResult.success && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              ❌ Erreur: {trackingResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
