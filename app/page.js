'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

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
  const calibrationSteps = [
    { id: 'submitted', label: 'Soumis', shortLabel: 'Soumis' },
    { id: 'rma_created', label: 'RMA Créé', shortLabel: 'RMA' },
    { id: 'bc_approved', label: 'BC Approuvé', shortLabel: 'BC' },
    { id: 'received', label: 'Reçu', shortLabel: 'Reçu' },
    { id: 'queue', label: 'File d\'attente', shortLabel: 'File' },
    { id: 'calibration', label: 'Étalonnage', shortLabel: 'Étal.' },
    { id: 'final_qc', label: 'Contrôle QC', shortLabel: 'QC' },
    { id: 'ready_to_ship', label: 'Prêt', shortLabel: 'Prêt' },
    { id: 'shipped', label: 'Expédié', shortLabel: 'Expédié' }
  ];

  const repairSteps = [
    { id: 'submitted', label: 'Soumis', shortLabel: 'Soumis' },
    { id: 'rma_created', label: 'RMA Créé', shortLabel: 'RMA' },
    { id: 'bc_approved', label: 'BC Approuvé', shortLabel: 'BC' },
    { id: 'received', label: 'Reçu', shortLabel: 'Reçu' },
    { id: 'inspection', label: 'Inspection', shortLabel: 'Insp.' },
    { id: 'customer_approval', label: 'Approbation', shortLabel: 'Appr.' },
    { id: 'repair', label: 'Réparation', shortLabel: 'Rép.' },
    { id: 'final_qc', label: 'Contrôle QC', shortLabel: 'QC' },
    { id: 'ready_to_ship', label: 'Prêt', shortLabel: 'Prêt' },
    { id: 'shipped', label: 'Expédié', shortLabel: 'Expédié' }
  ];

  const isRepair = serviceType === 'repair' || serviceType === 'réparation';
  const steps = isRepair ? repairSteps : calibrationSteps;

  // Map current status to step index
  const getStepIndex = (currentStatus) => {
    if (isRepair) {
      // Repair flow mapping
      const repairMap = {
        'submitted': 0, 'pending': 0, 'waiting_approval': 0,
        'approved': 1, // RMA Created by Lighthouse
        'waiting_bc': 2, 'waiting_po': 2, 'waiting_customer': 2, // Waiting for BC from customer
        'waiting_device': 3, // BC approved, waiting for device
        'received': 3, 'received_repair': 3, 
        'inspection_complete': 4, // Inspection done
        'quote_sent': 5, // Waiting customer approval for repair
        'order_received': 6, 'waiting_parts': 6, 'repair_in_progress': 6,
        'repair_complete': 7, 'final_qc': 7, 'quality_check': 7,
        'ready_to_ship': 8,
        'shipped': 9, 'delivered': 9, 'completed': 9
      };
      return repairMap[currentStatus] ?? 0;
    } else {
      // Calibration flow mapping
      const calibrationMap = {
        'submitted': 0, 'pending': 0, 'waiting_approval': 0,
        'approved': 1, // RMA Created by Lighthouse
        'waiting_bc': 2, 'waiting_po': 2, 'waiting_customer': 2, // Waiting for BC from customer
        'waiting_device': 3, // BC approved, waiting to receive device
        'received': 3, 'received_calibration': 3,
        'in_queue': 4, 'queued': 4, // In calibration queue
        'in_progress': 5, 'calibration_in_progress': 5,
        'final_qc': 6, 'quality_check': 6,
        'ready_to_ship': 7,
        'shipped': 8, 'delivered': 8, 'completed': 8
      };
      return calibrationMap[currentStatus] ?? 0;
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
  const [selectedRequest, setSelectedRequest] = useState(null);

  const t = useCallback((k) => T[lang]?.[k] || k, [lang]);
  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load data
  const loadData = useCallback(async (p) => {
    if (!p?.company_id) return;
    
    const [reqRes, addrRes] = await Promise.all([
      supabase.from('service_requests')
        .select('*, request_devices(*)')
        .eq('company_id', p.company_id)
        .order('created_at', { ascending: false }),
      supabase.from('shipping_addresses')
        .select('*')
        .eq('company_id', p.company_id)
        .order('is_default', { ascending: false })
    ]);
    
    if (reqRes.data) setRequests(reqRes.data);
    if (addrRes.data) setAddresses(addrRes.data);
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
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-white font-medium ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="text-[#1E3A5F] font-bold text-2xl tracking-tight">LIGHTHOUSE</div>
              <div className="text-[#3B7AB4] font-semibold text-sm">FRANCE</div>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => setPage('dashboard')} className={`font-medium ${page === 'dashboard' ? 'text-[#3B7AB4]' : 'text-[#1E3A5F] hover:text-[#3B7AB4]'}`}>
                {t('dashboard')}
              </button>
              <button onClick={() => setPage('new-request')} className={`font-medium ${page === 'new-request' ? 'text-[#3B7AB4]' : 'text-[#1E3A5F] hover:text-[#3B7AB4]'}`}>
                {t('newRequest')}
              </button>
              <button onClick={() => setPage('equipment')} className={`font-medium ${page === 'equipment' ? 'text-[#3B7AB4]' : 'text-[#1E3A5F] hover:text-[#3B7AB4]'}`}>
                {t('myEquipment')}
              </button>
              <button onClick={() => setPage('settings')} className={`font-medium ${page === 'settings' ? 'text-[#3B7AB4]' : 'text-[#1E3A5F] hover:text-[#3B7AB4]'}`}>
                {t('settings')}
              </button>
              <button onClick={logout} className="text-gray-500 hover:text-gray-700">
                {t('logout')}
              </button>
            </nav>

            {/* Lang toggle */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setLang('fr')} 
                className={`px-2 py-1 rounded text-sm font-bold ${lang === 'fr' ? 'bg-[#1E3A5F] text-white' : 'text-gray-500'}`}
              >
                FR
              </button>
              <button 
                onClick={() => setLang('en')} 
                className={`px-2 py-1 rounded text-sm font-bold ${lang === 'en' ? 'bg-[#1E3A5F] text-white' : 'text-gray-500'}`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          <nav className="md:hidden flex gap-2 pb-3 overflow-x-auto">
            {['dashboard', 'new-request', 'equipment', 'settings'].map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  page === p ? 'bg-[#3B7AB4] text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {t(p === 'new-request' ? 'newRequest' : p)}
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
      </main>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="font-bold text-xl mb-2">LIGHTHOUSE FRANCE</div>
          <p className="text-white/60 text-sm">
            16 Rue Paul Séjourne, 94000 Créteil • France@golighthouse.com
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// DASHBOARD COMPONENT (Enhanced)
// ============================================
function Dashboard({ profile, requests, t, setPage, setSelectedRequest, setPreviousPage }) {
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
  const serviceRequests = requests.filter(r => r.request_type !== 'parts' && r.requested_service !== 'parts_order');
  const partsOrders = requests.filter(r => r.request_type === 'parts' || r.requested_service === 'parts_order');

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
          {/* ACTION REQUIRED - Show at top */}
          {serviceRequests.filter(r => ['approved', 'waiting_bc', 'waiting_po', 'waiting_customer', 'inspection_complete', 'quote_sent'].includes(r.status) && r.status !== 'bc_review' && !r.bc_submitted_at).length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <span className="animate-pulse">⚠</span> Action requise
              </h3>
              <p className="text-sm text-red-600 mb-3">Les demandes suivantes nécessitent votre attention</p>
              <div className="space-y-2">
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
                          {req.request_type === 'parts' || req.requested_service === 'parts_order' ? 'Pièces' : 'Service'}
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
                        <span className="font-mono font-bold text-amber-600">{req.request_number}</span>
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
        content: newMessage.trim()
      })
      .select()
      .single();
    
    if (!error && data) {
      setMessages([data, ...messages]);
      setNewMessage('');
    }
    setSending(false);
  };

  const openThread = (thread) => {
    setSelectedThread(thread);
    markAsRead(thread.request.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="grid md:grid-cols-3 h-[600px]">
        {/* Thread List */}
        <div className="border-r border-gray-100 overflow-y-auto">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
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
        <div className="md:col-span-2 flex flex-col">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-bold text-[#1E3A5F]">
                  Demande {selectedThread.request.request_number}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedThread.request.request_devices?.length || 0} appareil(s) • 
                  {new Date(selectedThread.request.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedThread.messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <p>Aucun message pour cette demande</p>
                    <p className="text-sm">Envoyez un message pour démarrer la conversation</p>
                  </div>
                ) : (
                  [...selectedThread.messages].reverse().map(msg => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.sender_id === profile.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_id === profile.id 
                          ? 'bg-[#3B7AB4] text-white' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === profile.id ? 'text-white/70' : 'text-gray-400'
                        }`}>
                          {new Date(msg.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-100">
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
  const [requestType, setRequestType] = useState(null); // 'service' or 'parts'
  
  // If no type selected, show selection screen
  if (!requestType) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-6">Nouvelle Demande</h1>
        
        <p className="text-gray-600 mb-8">Quel type de demande souhaitez-vous soumettre?</p>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Service Request */}
          <button
            onClick={() => setRequestType('service')}
            className="bg-white rounded-xl p-8 shadow-sm border-2 border-gray-200 hover:border-[#3B7AB4] transition-colors text-left group"
          >
            <div className="text-4xl mb-4">🔧</div>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-2 group-hover:text-[#3B7AB4]">
              Étalonnage / Réparation
            </h2>
            <p className="text-gray-600 text-sm">
              Demande de calibration, réparation ou maintenance pour vos appareils de mesure
            </p>
          </button>
          
          {/* Parts Order */}
          <button
            onClick={() => setRequestType('parts')}
            className="bg-white rounded-xl p-8 shadow-sm border-2 border-gray-200 hover:border-[#3B7AB4] transition-colors text-left group"
          >
            <div className="text-4xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-2 group-hover:text-[#3B7AB4]">
              Commande de Pièces
            </h2>
            <p className="text-gray-600 text-sm">
              Commander des pièces de rechange ou consommables pour vos équipements
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
    newAddress: { label: '', company_name: '', attention: '', address_line1: '', city: '', postal_code: '' }
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
      if (!d.model || !d.serial_number || !d.service_type || !d.notes) {
        notify('Veuillez remplir tous les champs obligatoires pour chaque appareil', 'error');
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

    setSaving(true);
    
    try {
      // No number assigned yet - will get FR-XXXXX after approval
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
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (reqErr) throw reqErr;

      // Save devices with full details including per-device shipping address
      for (const d of devices) {
        await supabase.from('request_devices').insert({
          request_id: request.id,
          serial_number: d.serial_number,
          model_name: d.model,
          equipment_type: d.brand === 'other' ? d.brand_other : 'Lighthouse',
          service_type: d.service_type === 'other' ? d.service_other : d.service_type,
          notes: d.notes,
          accessories: d.accessories,
          shipping_address_id: d.shipping_address_id || null // Per-device shipping address
        });

        // Save to equipment if checkbox is checked and not already from saved
        if (d.saveDevice && !d.fromSaved) {
          await supabase.from('equipment').upsert({
            company_id: profile.company_id,
            serial_number: d.serial_number,
            model_name: d.model,
            nickname: d.nickname || null,
            brand: d.brand === 'other' ? d.brand_other : 'Lighthouse',
            equipment_type: 'particle_counter',
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

  function createNewPart(num) {
    return {
      id: `part_${Date.now()}_${num}`,
      num,
      device_for: '',
      part_number: '',
      description: '',
      quantity: 1
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
        notify(`Erreur: ${error.message}`, 'error');
        return;
      }
      addressId = data.id;
      refresh();
    }
    
    if (!addressId) {
      notify('Veuillez sélectionner ou ajouter une adresse', 'error');
      return;
    }

    setSaving(true);
    
    try {
      const partsDescription = parts.map(p => 
        `Pièce ${p.num}: ${p.description}${p.part_number ? ` (Réf: ${p.part_number})` : ''}${p.device_for ? ` - Pour: ${p.device_for}` : ''} - Qté: ${p.quantity}`
      ).join('\n');

      await supabase
        .from('service_requests')
        .insert({
          request_number: null, // No number until approved
          company_id: profile.company_id,
          submitted_by: profile.id,
          request_type: 'parts',
          requested_service: 'parts_order',
          problem_description: partsDescription,
          urgency: 'normal',
          shipping_address_id: addressId,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        });

      notify('Commande de pièces soumise! Numéro FR attribué après validation.');
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Ajoutez des photos de la pièce ou de son emplacement sur l'appareil
                  </p>
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
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? 'Envoi en cours...' : 'Soumettre la Commande'}
          </button>
        </div>
      </form>
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
function DeviceCard({ device, updateDevice, toggleAccessory, removeDevice, canRemove, savedEquipment, loadFromSaved, addresses, defaultAddressId }) {
  const [charCount, setCharCount] = useState(device.notes.length);
  const [showDifferentAddress, setShowDifferentAddress] = useState(!!device.shipping_address_id);
  const maxChars = 500;

  const handleNotesChange = (e) => {
    const value = e.target.value.slice(0, maxChars);
    updateDevice(device.id, 'notes', value);
    setCharCount(value.length);
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
              updateDevice(device.id, 'fromSaved', null);
              updateDevice(device.id, 'brand', 'Lighthouse');
              updateDevice(device.id, 'brand_other', '');
              updateDevice(device.id, 'nickname', '');
              updateDevice(device.id, 'model', '');
              updateDevice(device.id, 'serial_number', '');
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
        {/* Nickname for saving */}
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

        {/* Brand */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Marque *</label>
          <select
            value={device.brand}
            onChange={e => updateDevice(device.id, 'brand', e.target.value)}
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

        {/* Model - always text input */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Modèle *</label>
          <input
            type="text"
            value={device.model}
            onChange={e => updateDevice(device.id, 'model', e.target.value)}
            placeholder="ex: Solair 3100, ApexZ, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        {/* Serial Number */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">N° de Série *</label>
          <input
            type="text"
            value={device.serial_number}
            onChange={e => updateDevice(device.id, 'serial_number', e.target.value)}
            placeholder="ex: 205482857"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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

        {/* Notes for Technician */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-1">Notes pour le Technicien *</label>
          <textarea
            value={device.notes}
            onChange={handleNotesChange}
            placeholder="Décrivez le problème ou le service demandé pour cet appareil..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
            required
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
  const isPartsOrder = request.request_type === 'parts' || request.requested_service === 'parts_order';
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
          const signatureBlob = await fetch(signatureData).then(r => r.blob());
          const signatureFileName = `signature_${request.id}_${Date.now()}.png`;
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
      
      // Update request status - set to bc_review so admin can verify
      // Also record quote approval if coming from quote_sent status
      const { error: updateError } = await supabase
        .from('service_requests')
        .update({ 
          status: 'bc_review',
          bc_submitted_at: new Date().toISOString(),
          bc_signed_by: signatureName,
          bc_signature_date: signatureDateISO,
          bc_file_url: fileUrl,
          bc_signature_url: signatureUrl,
          quote_approved_at: request.status === 'quote_sent' ? new Date().toISOString() : request.quote_approved_at
        })
        .eq('id', request.id);
      
      if (updateError) throw updateError;
      
      notify('Bon de commande soumis avec succès!');
      setShowBCModal(false);
      
      // Force full page reload to ensure fresh data
      window.location.reload();
      
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
        content: newMessage.trim()
      })
      .select()
      .single();
    
    if (!error && data) {
      setMessages([...messages, data]);
      setNewMessage('');
      notify('Message envoyé!');
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
          
          {/* Progress Bar */}
          {!isPartsOrder && (
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
        {showQuoteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto print:max-w-none print:max-h-none print:rounded-none print:overflow-visible" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#1a1a2e] text-white px-6 py-4 flex justify-between items-center print:hidden">
                <div>
                  <h2 className="text-xl font-bold">Offre de Prix</h2>
                  <p className="text-gray-400">{request.request_number}</p>
                </div>
                <button onClick={() => setShowQuoteModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
              </div>

              {/* Professional Quote Document */}
              <div id="quote-print-area" className="print:block">
                {/* Quote Header */}
                <div className="px-8 pt-8 pb-6 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-gray-800">LIGHTHOUSE</h1>
                      <p className="text-lg text-gray-500">Worldwide Solutions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#00A651]">OFFRE DE PRIX</p>
                      <p className="text-gray-500 mt-1">N° {request.request_number}</p>
                    </div>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="bg-gray-100 px-8 py-4 flex justify-between text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                    <p className="font-medium">{request.quoted_at ? new Date(request.quoted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Validité</p>
                    <p className="font-medium">30 jours</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Conditions</p>
                    <p className="font-medium">À réception de facture</p>
                  </div>
                </div>

                {/* Content */}
                <div className="px-8 py-6">
                  {/* Service Title */}
                  <div className="mb-6 pb-4 border-b-2 border-[#00A651]">
                    <h2 className="text-xl font-bold text-gray-800">
                      {request.requested_service === 'calibration' 
                        ? "Réglage, entretien et vérification d'étalonnage" 
                        : request.requested_service === 'repair'
                        ? "Diagnostic et réparation"
                        : "Services demandés"}
                    </h2>
                  </div>

                  {/* Prestations */}
                  <div className="mb-6">
                    <p className="font-bold text-gray-700 mb-3">Prestations incluses :</p>
                    <div className="space-y-2">
                      {request.requested_service === 'calibration' ? (
                        <>
                          <div className="flex items-start gap-3"><span className="text-[#00A651]">▸</span><span className="text-gray-700">Vérification des fonctionnalités du compteur</span></div>
                          <div className="flex items-start gap-3"><span className="text-[#00A651]">▸</span><span className="text-gray-700">Vérification et réglage du débit</span></div>
                          <div className="flex items-start gap-3"><span className="text-[#00A651]">▸</span><span className="text-gray-700">Vérification de la cellule de mesure</span></div>
                          <div className="flex items-start gap-3"><span className="text-[#00A651]">▸</span><span className="text-gray-700">Contrôle et réglage des seuils granulométriques</span></div>
                          <div className="flex items-start gap-3"><span className="text-[#00A651]">▸</span><span className="text-gray-700">Vérification selon ISO 21501-4</span></div>
                          <div className="flex items-start gap-3"><span className="text-[#00A651]">▸</span><span className="text-gray-700">Fourniture d'un rapport de test et de calibration</span></div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-3"><span className="text-[#00A651]">▸</span><span className="text-gray-700">Diagnostic complet de l'appareil</span></div>
                          <div className="flex items-start gap-3"><span className="text-[#00A651]">▸</span><span className="text-gray-700">Réparation et remplacement des pièces défectueuses</span></div>
                          <div className="flex items-start gap-3"><span className="text-[#00A651]">▸</span><span className="text-gray-700">Tests de fonctionnement</span></div>
                          <div className="flex items-start gap-3"><span className="text-[#00A651]">▸</span><span className="text-gray-700">Fourniture d'un rapport</span></div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Equipment Table */}
                  <div className="mb-6">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#1a1a2e] text-white">
                          <th className="px-4 py-3 text-left font-medium">Description</th>
                          <th className="px-4 py-3 text-left font-medium">Modèle</th>
                          <th className="px-4 py-3 text-left font-medium">N° Série</th>
                          <th className="px-4 py-3 text-right font-medium">Prix HT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(request.request_devices || []).map((device, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-4 py-3 border-b">{request.requested_service === 'calibration' ? 'Étalonnage annuel' : 'Service'}</td>
                            <td className="px-4 py-3 border-b font-medium">{device.model_name || '—'}</td>
                            <td className="px-4 py-3 border-b font-mono text-sm">{device.serial_number || '—'}</td>
                            <td className="px-4 py-3 border-b text-right font-medium">
                              {request.quote_subtotal && (request.request_devices || []).length 
                                ? ((request.quote_subtotal - (request.quote_shipping || 0)) / (request.request_devices || []).length).toFixed(2) 
                                : '—'} €
                            </td>
                          </tr>
                        ))}
                        {request.quote_shipping > 0 && (
                          <tr className="bg-gray-50">
                            <td className="px-4 py-3 border-b" colSpan={3}>Frais de transport forfaitaires (aller-retour)</td>
                            <td className="px-4 py-3 border-b text-right font-medium">{request.quote_shipping?.toFixed(2)} €</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#00A651] text-white">
                          <td className="px-4 py-4 font-bold" colSpan={3}>TOTAL HT</td>
                          <td className="px-4 py-4 text-right text-xl font-bold">{request.quote_total?.toFixed(2) || '—'} €</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Disclaimers */}
                  <div className="mb-6 text-sm text-gray-600">
                    <p className="font-medium text-gray-700 mb-2">Conditions :</p>
                    <p className="mb-1">• Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.</p>
                    <p className="mb-1">• Un devis sera systématiquement établi si des pièces sont trouvées défectueuses.</p>
                    <p className="mb-1">• Les équipements devront être décontaminés de toutes substances avant envoi.</p>
                  </div>

                  {/* Signature Section - Shows when BC is submitted */}
                  {request.bc_submitted_at && (
                    <div className="mt-6 pt-6 border-t-2 border-[#00A651]">
                      <div className="bg-green-50 rounded-xl p-6">
                        <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                          <span className="text-xl">✅</span> Bon de Commande Approuvé
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">Signataire</p>
                            <p className="font-bold text-gray-800">{request.bc_signed_by || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">Date de signature</p>
                            <p className="font-medium text-gray-800">
                              {request.bc_signature_date 
                                ? new Date(request.bc_signature_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                                : request.bc_submitted_at 
                                  ? new Date(request.bc_submitted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                                  : '—'}
                            </p>
                          </div>
                          {request.bc_signature_url && (
                            <div className="md:col-span-2">
                              <p className="text-xs text-gray-500 uppercase mb-2">Signature</p>
                              <div className="bg-white p-4 rounded-lg border inline-block">
                                <img src={request.bc_signature_url} alt="Signature" className="max-h-20" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-green-200">
                          <p className="text-sm text-green-700">
                            <strong>Lu et approuvé</strong> • Soumis le {new Date(request.bc_submitted_at).toLocaleDateString('fr-FR')} à {new Date(request.bc_submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quote Footer */}
                <div className="bg-[#1a1a2e] text-white px-8 py-4 text-center text-sm">
                  <p className="font-medium">Lighthouse France SAS</p>
                  <p className="text-gray-400">16, rue Paul Séjourné • 94000 CRÉTEIL • Tél. 01 43 77 28 07</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-gray-100 px-6 py-4 border-t flex flex-wrap gap-3 justify-between items-center print:hidden">
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium flex items-center gap-2">
                    🖨️ Imprimer
                  </button>
                </div>
                <div className="flex gap-3">
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
        )}

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
                  messages.map(msg => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_id === profile?.id 
                          ? 'bg-[#3B7AB4] text-white' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {msg.sender_type !== 'customer' && (
                          <p className={`text-xs font-medium mb-1 ${
                            msg.sender_id === profile?.id ? 'text-white/70' : 'text-[#3B7AB4]'
                          }`}>
                            Lighthouse France
                          </p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === profile?.id ? 'text-white/70' : 'text-gray-400'
                        }`}>
                          {new Date(msg.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))
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
                {request.quote_url || request.certificate_url ? (
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
              {attachments.length === 0 && !request.quote_url && !request.certificate_url && (
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
// HOME PAGE (Public Landing)
// ============================================
function HomePage({ t, setPage }) {
  return (
    <div>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="text-[#1E3A5F] font-bold text-2xl tracking-tight">LIGHTHOUSE</div>
              <div className="text-[#3B7AB4] font-semibold text-sm">FRANCE</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPage('login')} className="px-4 py-2 text-[#3B7AB4] font-medium">
                {t('login') || 'Login'}
              </button>
              <button onClick={() => setPage('register')} className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium">
                {t('register') || 'Register'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1E3A5F] to-[#3B7AB4] text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Service & Calibration Portal</h1>
          <p className="text-xl text-white/80 mb-8">
            Gérez vos demandes de calibration et réparation d'équipements de mesure
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={() => setPage('login')} className="px-8 py-3 bg-white text-[#1E3A5F] rounded-lg font-bold text-lg">
              {t('login') || 'Login'}
            </button>
            <button onClick={() => setPage('register')} className="px-8 py-3 border-2 border-white text-white rounded-lg font-bold text-lg">
              {t('register') || 'Register'}
            </button>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1E3A5F] text-center mb-12">Comment ça marche</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { num: '1', title: 'Créer un compte', desc: 'Enregistrez votre société et vos coordonnées' },
              { num: '2', title: 'Soumettre une demande', desc: 'Détaillez vos équipements et besoins de service' },
              { num: '3', title: 'Recevoir confirmation', desc: 'Obtenez votre numéro RMA et instructions' },
              { num: '4', title: 'Suivre le progrès', desc: 'Surveillez l\'état de vos demandes en temps réel' }
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#3B7AB4] to-[#1E3A5F] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  {step.num}
                </div>
                <h3 className="font-bold text-[#1E3A5F] mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="py-16 px-6 bg-[#F9F9F9]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1E3A5F] text-center mb-12">Nos Services</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🔧', title: 'Réparation', desc: 'Réparation experte de compteurs de particules et équipements de monitoring' },
              { icon: '⚖️', title: 'Étalonnage', desc: 'Calibration ISO 21501-4 pour précision et conformité' },
              { icon: '🛡️', title: 'Maintenance', desc: 'Programmes de maintenance préventive pour performances optimales' }
            ].map((svc, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-[#3B7AB4]">
                <div className="text-3xl mb-3">{svc.icon}</div>
                <h3 className="font-bold text-[#1E3A5F] mb-2">{svc.title}</h3>
                <p className="text-gray-600 text-sm">{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="font-bold text-xl mb-2">LIGHTHOUSE FRANCE</div>
          <p className="text-white/60 text-sm">16 Rue Paul Séjourne, 94000 Créteil</p>
        </div>
      </footer>
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
    <div>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => setPage('home')} className="flex items-center gap-3">
              <div className="text-[#1E3A5F] font-bold text-2xl tracking-tight">LIGHTHOUSE</div>
              <div className="text-[#3B7AB4] font-semibold text-sm">FRANCE</div>
            </button>
            <button onClick={() => setPage('home')} className="text-[#3B7AB4] font-medium">
              ← Retour
            </button>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-[#1E3A5F] px-6 py-8 text-center">
              <h1 className="text-2xl font-bold text-white">LIGHTHOUSE FRANCE</h1>
              <p className="text-white/70 mt-2">Service Portal</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent"
                  placeholder="votre@email.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#3B7AB4] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors disabled:opacity-50"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
            
            <div className="px-6 pb-6 text-center">
              <p className="text-gray-600">
                Pas de compte?{' '}
                <button onClick={() => setPage('register')} className="text-[#3B7AB4] font-semibold">
                  Créer un compte
                </button>
              </p>
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
    <div>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => setPage('home')} className="flex items-center gap-3">
              <div className="text-[#1E3A5F] font-bold text-2xl tracking-tight">LIGHTHOUSE</div>
              <div className="text-[#3B7AB4] font-semibold text-sm">FRANCE</div>
            </button>
            <button onClick={() => setPage('home')} className="text-[#3B7AB4] font-medium">
              ← Retour
            </button>
          </div>
        </div>
      </header>

      {/* Register Form */}
      <div className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-[#1E3A5F] px-6 py-6">
              <h1 className="text-xl font-bold text-white">Créer un compte</h1>
              <p className="text-white/70 text-sm mt-1">Enregistrez votre société pour accéder au portail</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Company Section */}
              <div>
                <h2 className="text-lg font-bold text-[#1E3A5F] mb-4 pb-2 border-b-2 border-[#E8F2F8]">
                  Information Société
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la société *</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du contact *</label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => updateField('contactName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div>
                <h2 className="text-lg font-bold text-[#1E3A5F] mb-4 pb-2 border-b-2 border-[#E8F2F8]">
                  Adresse
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="16 Rue de la République"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code Postal *</label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => updateField('postalCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="75001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Paris"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Account Section */}
              <div>
                <h2 className="text-lg font-bold text-[#1E3A5F] mb-4 pb-2 border-b-2 border-[#E8F2F8]">
                  Identifiants
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Minimum 6 caractères"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer *</label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setPage('login')}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-[#3B7AB4] text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </form>
            
            <div className="px-6 pb-6 text-center">
              <p className="text-gray-600">
                Déjà un compte?{' '}
                <button onClick={() => setPage('login')} className="text-[#3B7AB4] font-semibold">
                  Se connecter
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
