'use client';
import { useState, useEffect, useCallback } from 'react';
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
  submitted: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'Soumis', icon: '📝' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'Soumis', icon: '📝' },
  
  // === BOTH FLOWS - APPROVAL/BC ===
  waiting_approval: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'En attente d\'approbation', icon: '⏳' },
  approved: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'Approuvé - En attente BC', icon: '📋' },
  waiting_bc: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'Approuvé - En attente BC', icon: '📋' },
  waiting_po: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'Approuvé - En attente BC', icon: '📋' },
  
  // === BOTH FLOWS - WAITING FOR DEVICE ===
  waiting_device: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'En attente réception', icon: '📦' },
  
  // === CALIBRATION FLOW ===
  received_calibration: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Reçu - En attente étalonnage', icon: '📥' },
  calibration_in_progress: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', label: 'Étalonnage en cours', icon: '🔬' },
  
  // === REPAIR FLOW ===
  received_repair: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Reçu - En attente inspection', icon: '📥' },
  inspection_complete: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Inspection terminée - En attente approbation client', icon: '🔍' },
  repair_declined: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Réparation refusée par client', icon: '❌' },
  order_received: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'Commande reçue', icon: '✅' },
  waiting_parts: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', label: 'En attente de pièces', icon: '⏳' },
  repair_in_progress: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', label: 'Réparation en cours', icon: '🔧' },
  repair_complete: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300', label: 'Réparation terminée', icon: '✓' },
  
  // === LEGACY (for backwards compatibility) ===
  received: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Reçu', icon: '📥' },
  in_progress: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', label: 'En cours', icon: '🔧' },
  quote_sent: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Devis envoyé', icon: '📧' },
  quoted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Devis envoyé', icon: '📧' },
  
  // === BOTH FLOWS - FINAL STAGES ===
  final_qc: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300', label: 'Contrôle qualité final', icon: '🔍' },
  quality_check: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300', label: 'Contrôle qualité final', icon: '🔍' },
  ready_to_ship: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', label: 'Prêt pour expédition', icon: '📦' },
  shipped: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'Expédié', icon: '🚚' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400', label: 'Livré', icon: '📬' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400', label: 'Terminé', icon: '✅' },
  
  // === HOLD/ISSUES ===
  on_hold: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'En attente', icon: '⚠️' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400', label: 'Annulé', icon: '❌' }
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
  const [page, setPage] = useState('home');
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
    setUser(data.user);
    const { data: p } = await supabase.from('profiles')
      .select('*, companies(*)')
      .eq('id', data.user.id)
      .single();
    if (p) {
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
          />
        )}
        
        {page === 'request-detail' && selectedRequest && (
          <RequestDetail 
            request={selectedRequest}
            profile={profile}
            t={t}
            setPage={setPage}
            notify={notify}
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
function Dashboard({ profile, requests, t, setPage, setSelectedRequest }) {
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
    setSelectedRequest(req);
    setPage('request-detail');
  };

  const viewDeviceHistory = (serialNumber) => {
    setPage('device-history');
    sessionStorage.setItem('viewDeviceSerial', serialNumber);
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
          {/* Pending Service Requests */}
          {pendingService.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
              <h3 className="font-bold text-amber-800 mb-2">⏳ Demandes service en attente</h3>
              <div className="space-y-2">
                {pendingService.map(req => (
                  <div 
                    key={req.id}
                    onClick={() => viewRequest(req)}
                    className="flex justify-between items-center p-2 bg-white rounded cursor-pointer hover:bg-amber-100"
                  >
                    <div>
                      <span className="font-mono font-medium">{req.request_number}</span>
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
                  return (
                    <div 
                      key={req.id}
                      onClick={() => viewRequest(req)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[#3B7AB4]">{req.request_number}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
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
      fromSaved: null // ID if loaded from saved
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
      // Generate temporary draft number (FR number assigned after approval)
      const { data: counter } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'draft_counter')
        .single();
      
      const nextDraft = (counter?.value?.counter || 0) + 1;
      const draftNumber = `DRAFT-${String(nextDraft).padStart(5, '0')}`;

      const { data: request, error: reqErr } = await supabase
        .from('service_requests')
        .insert({
          request_number: draftNumber, // Temporary - FR number assigned after approval
          company_id: profile.company_id,
          submitted_by: profile.id,
          request_type: 'service', // service or parts
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

      // Save devices with full details
      for (const d of devices) {
        await supabase.from('request_devices').insert({
          request_id: request.id,
          serial_number: d.serial_number,
          model_name: d.model,
          equipment_type: d.brand === 'other' ? d.brand_other : 'Lighthouse',
          service_type: d.service_type === 'other' ? d.service_other : d.service_type,
          notes: d.notes,
          accessories: d.accessories
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

      await supabase
        .from('system_settings')
        .upsert({ key: 'draft_counter', value: { prefix: 'DRAFT', counter: nextDraft } });

      notify('Demande soumise avec succès! Vous recevrez votre numéro FR après validation.');
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
      const { data: counter } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'draft_counter')
        .single();
      
      const nextDraft = (counter?.value?.counter || 0) + 1;
      const draftNumber = `DRAFT-${String(nextDraft).padStart(5, '0')}`;

      const partsDescription = parts.map(p => 
        `Pièce ${p.num}: ${p.description}${p.part_number ? ` (Réf: ${p.part_number})` : ''}${p.device_for ? ` - Pour: ${p.device_for}` : ''} - Qté: ${p.quantity}`
      ).join('\n');

      await supabase
        .from('service_requests')
        .insert({
          request_number: draftNumber,
          company_id: profile.company_id,
          submitted_by: profile.id,
          request_type: 'parts', // Mark as parts order
          requested_service: 'parts_order',
          problem_description: partsDescription,
          urgency: 'normal',
          shipping_address_id: addressId,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        });

      await supabase
        .from('system_settings')
        .upsert({ key: 'draft_counter', value: { prefix: 'DRAFT', counter: nextDraft } });

      notify('Commande de pièces soumise! Vous recevrez votre numéro FR après validation.');
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
function DeviceCard({ device, updateDevice, toggleAccessory, removeDevice, canRemove, savedEquipment, loadFromSaved }) {
  const [charCount, setCharCount] = useState(device.notes.length);
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
      </div>
    </div>
  );
}

// ============================================
// SETTINGS PAGE
// ============================================
function SettingsPage({ profile, addresses, t, notify, refresh }) {
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '', attention: '', address_line1: '', city: '', postal_code: '', is_default: false
  });
  const [saving, setSaving] = useState(false);

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
    
    const { error } = await supabase.from('shipping_addresses').insert({
      ...newAddress,
      company_id: profile.company_id,
      country: 'France'
    });
    
    setSaving(false);
    
    if (error) {
      notify(`Error: ${error.message}`, 'error');
      return;
    }
    
    notify(t('saved'));
    setShowAddAddress(false);
    setNewAddress({ label: '', attention: '', address_line1: '', city: '', postal_code: '', is_default: false });
    refresh();
  };

  const deleteAddress = async (id) => {
    if (!confirm('Delete this address?')) return;
    await supabase.from('shipping_addresses').delete().eq('id', id);
    notify(t('saved'));
    refresh();
  };

  const setDefault = async (id) => {
    await supabase.from('shipping_addresses').update({ is_default: false }).eq('company_id', profile.company_id);
    await supabase.from('shipping_addresses').update({ is_default: true }).eq('id', id);
    notify(t('saved'));
    refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1E3A5F]">{t('settings')}</h1>

      {/* Account Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">{t('accountInfo')}</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">{t('contact')}:</span> {profile?.full_name}</div>
          <div><span className="text-gray-500">{t('email')}:</span> {profile?.email}</div>
          <div><span className="text-gray-500">{t('company')}:</span> {profile?.companies?.name}</div>
          <div><span className="text-gray-500">{t('phone')}:</span> {profile?.phone || '—'}</div>
        </div>
      </div>

      {/* Shipping Addresses */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#1E3A5F]">{t('shippingAddresses')}</h2>
          <button
            onClick={() => setShowAddAddress(true)}
            className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F]"
          >
            + {t('addNewAddress')}
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {addresses.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No addresses yet</p>
          ) : (
            addresses.map(addr => (
              <div 
                key={addr.id}
                className={`p-4 rounded-lg border-l-4 ${addr.is_default ? 'border-[#3B7AB4] bg-[#E8F2F8]' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-[#1E3A5F]">{addr.label}</h3>
                    {addr.attention && <p className="text-gray-500 text-sm">À l'attention de: {addr.attention}</p>}
                    <p className="text-sm">{addr.address_line1}</p>
                    <p className="text-sm">{addr.postal_code} {addr.city}, France</p>
                    {addr.is_default && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                        {t('default')}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!addr.is_default && (
                      <button
                        onClick={() => setDefault(addr.id)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                      >
                        {t('setDefault')}
                      </button>
                    )}
                    <button
                      onClick={() => deleteAddress(addr.id)}
                      className="px-3 py-1 text-sm border border-gray-300 text-red-600 rounded hover:bg-red-50"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddAddress(false)}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold text-lg text-[#1E3A5F]">{t('addNewAddress')}</h3>
            </div>
            <form onSubmit={saveAddress} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
                <input
                  type="text"
                  value={newAddress.label}
                  onChange={e => setNewAddress({ ...newAddress, label: e.target.value })}
                  placeholder="e.g., Main Office, Lab 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('attention')}</label>
                <input
                  type="text"
                  value={newAddress.attention}
                  onChange={e => setNewAddress({ ...newAddress, attention: e.target.value })}
                  placeholder="Contact person"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('address')} *</label>
                <input
                  type="text"
                  value={newAddress.address_line1}
                  onChange={e => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                  placeholder="Street address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('postalCode')} *</label>
                  <input
                    type="text"
                    value={newAddress.postal_code}
                    onChange={e => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('city')} *</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newAddress.is_default}
                  onChange={e => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('setDefault')}</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAddress(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? t('saving') : t('save')}
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
function EquipmentPage({ profile, t, notify, refresh }) {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    nickname: '', brand: 'Lighthouse', brand_other: '', model_name: '', serial_number: ''
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
      setEditingEquipment(null);
      setNewEquipment({ nickname: '', brand: 'Lighthouse', brand_other: '', model_name: '', serial_number: '' });
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

  const openEditModal = (equip) => {
    setEditingEquipment(equip);
    setNewEquipment({
      nickname: equip.nickname || '',
      brand: equip.brand === 'Lighthouse' ? 'Lighthouse' : 'other',
      brand_other: equip.brand !== 'Lighthouse' ? equip.brand : '',
      model_name: equip.model_name || '',
      serial_number: equip.serial_number || ''
    });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#3B7AB4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">{t('myEquipment')}</h1>
        <button
          onClick={() => {
            setEditingEquipment(null);
            setNewEquipment({ nickname: '', brand: 'Lighthouse', brand_other: '', model_name: '', serial_number: '' });
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
            <div className="col-span-3">Modèle</div>
            <div className="col-span-3">N° de Série</div>
            <div className="col-span-3">Surnom</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          
          {/* Table Rows - sorted alphabetically by model */}
          {[...equipment]
            .sort((a, b) => (a.model_name || '').localeCompare(b.model_name || ''))
            .map((equip, index) => (
            <div 
              key={equip.id} 
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#E8F2F8] transition-colors border-b border-gray-100 last:border-b-0`}
            >
              <div className="col-span-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                  {equip.brand || 'Lighthouse'}
                </span>
              </div>
              <div className="col-span-3 font-medium text-[#1E3A5F]">
                {equip.model_name || 'Modèle inconnu'}
              </div>
              <div className="col-span-3 font-mono text-gray-600 text-sm">
                {equip.serial_number}
              </div>
              <div className="col-span-3 text-gray-500 text-sm">
                {equip.nickname || '-'}
              </div>
              <div className="col-span-1 flex justify-end gap-1">
                <button
                  onClick={() => openEditModal(equip)}
                  className="p-1.5 text-gray-400 hover:text-[#3B7AB4] hover:bg-white rounded"
                  title="Modifier"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteEquipment(equip.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded"
                  title="Supprimer"
                >
                  🗑️
                </button>
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
  );
}

// ============================================
// REQUEST DETAIL PAGE (Enhanced)
// ============================================
function RequestDetail({ request, profile, t, setPage, notify }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  const style = STATUS_STYLES[request.status] || STATUS_STYLES.submitted;

  // Load messages and history
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
    };
    loadData();
  }, [request.id]);

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

  return (
    <div>
      <button
        onClick={() => setPage('dashboard')}
        className="mb-6 text-[#3B7AB4] hover:text-[#1E3A5F] font-medium"
      >
        ← Retour au tableau de bord
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-[#1E3A5F]">{request.request_number}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
              {request.rma_number && (
                <p className="text-green-600 font-mono">RMA: {request.rma_number}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Soumis le {new Date(request.created_at).toLocaleDateString('fr-FR')}
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

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { id: 'details', label: 'Détails', icon: '📋' },
            { id: 'messages', label: 'Messages', icon: '💬', count: messages.filter(m => !m.is_read && m.sender_id !== profile?.id).length },
            { id: 'history', label: 'Historique', icon: '📜' },
            { id: 'documents', label: 'Documents', icon: '📄' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
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
            <div className="space-y-6">
              {/* Devices */}
              <div>
                <h2 className="text-lg font-bold text-[#1E3A5F] mb-4">
                  Appareils ({request.request_devices?.length || 0})
                </h2>
                <div className="space-y-3">
                  {request.request_devices?.map((device) => (
                    <div key={device.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-[#3B7AB4]">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-[#1E3A5F]">{device.model_name || 'Modèle inconnu'}</p>
                          <p className="font-mono text-[#3B7AB4]">{device.serial_number}</p>
                          <p className="text-sm text-gray-500 mt-1">{device.equipment_type}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                            {device.service_type === 'calibration' ? 'Étalonnage' : 
                             device.service_type === 'repair' ? 'Réparation' :
                             device.service_type === 'calibration_repair' ? 'Étal. + Rép.' :
                             device.service_type}
                          </span>
                          {device.status && device.status !== 'pending' && (
                            <p className="text-xs text-gray-400 mt-2">
                              Statut: {device.status}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quote Details */}
              {request.quote_total && (
                <div className="bg-[#E8F2F8] rounded-lg p-4">
                  <h3 className="font-bold text-[#1E3A5F] mb-3">Détails du Devis</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sous-total HT</span>
                      <span>{request.quote_subtotal?.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TVA (20%)</span>
                      <span>{request.quote_tax?.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t border-[#3B7AB4]/20 pt-2 mt-2">
                      <span>Total TTC</span>
                      <span>{request.quote_total?.toFixed(2)} €</span>
                    </div>
                  </div>
                  
                  {request.status === 'quote_sent' && (
                    <div className="mt-4 flex gap-3">
                      <button className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600">
                        ✓ Accepter le devis
                      </button>
                      <button className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                        Demander des modifications
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {request.problem_description && (
                <div>
                  <h3 className="font-bold text-[#1E3A5F] mb-2">Notes</h3>
                  <p className="text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {request.problem_description}
                  </p>
                </div>
              )}
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
              {history.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <p className="text-4xl mb-2">📜</p>
                  <p>Aucun historique disponible</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-6">
                    {history.map((event, i) => (
                      <div key={event.id} className="flex gap-4 ml-4">
                        <div className="w-3 h-3 rounded-full bg-[#3B7AB4] border-2 border-white shadow -ml-[7px] mt-1.5 z-10"></div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-[#1E3A5F]">{event.event_description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(event.event_date).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="text-center text-gray-400 py-12">
              <p className="text-4xl mb-2">📄</p>
              <p>Aucun document disponible</p>
              <p className="text-sm">Les devis et certificats apparaîtront ici</p>
            </div>
          )}
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
