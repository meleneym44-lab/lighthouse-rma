'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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
  submitted: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'submitted' },
  quoted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'quoted' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'approved' },
  received: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'received' },
  in_progress: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', label: 'in_progress' },
  quality_check: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300', label: 'quality_check' },
  completed: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300', label: 'completed' },
  shipped: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', label: 'shipped' }
};

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
        .select('*, request_devices(*), quote_line_items(*)')
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

  if (!user) {
    window.location.href = '/';
    return null;
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
            {['dashboard', 'new-request', 'settings'].map(p => (
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
        
        {page === 'request-detail' && selectedRequest && (
          <RequestDetail 
            request={selectedRequest}
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
// DASHBOARD COMPONENT
// ============================================
function Dashboard({ profile, requests, t, setPage, setSelectedRequest }) {
  const stats = [
    { 
      label: t('totalDevices'), 
      value: requests.reduce((sum, r) => sum + (r.request_devices?.length || 0), 0),
      color: 'bg-[#3B7AB4]'
    },
    { 
      label: t('inProgress'), 
      value: requests.filter(r => !['shipped', 'completed'].includes(r.status)).length,
      color: 'bg-amber-500'
    },
    { 
      label: t('completed'), 
      value: requests.filter(r => ['shipped', 'completed'].includes(r.status)).length,
      color: 'bg-green-500'
    }
  ];

  const viewRequest = (req) => {
    setSelectedRequest(req);
    setPage('request-detail');
  };

  return (
    <div>
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">{t('myRequests')}</h1>
          <p className="text-gray-600">{t('welcome')}, {profile?.full_name}</p>
        </div>
        <button 
          onClick={() => setPage('new-request')}
          className="px-6 py-3 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F] transition-colors"
        >
          + {t('submitRequest')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className={`w-3 h-3 rounded-full ${stat.color} mb-2`} />
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1E3A5F] text-lg">{t('myRequests')}</h2>
        </div>
        
        {requests.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 mb-4">{t('noRequests')}</p>
            <button 
              onClick={() => setPage('new-request')}
              className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg font-medium"
            >
              {t('submitRequest')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map(req => {
              const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
              return (
                <div 
                  key={req.id}
                  onClick={() => viewRequest(req)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#3B7AB4]">
                        {req.request_number || '—'}
                      </span>
                      {req.rma_number && (
                        <span className="font-mono text-green-600 text-sm">
                          RMA: {req.rma_number}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                        {t(style.label)}
                      </span>
                    </div>
                    {req.quote_total && (
                      <span className="font-bold text-lg text-[#1E3A5F]">
                        {req.quote_total.toFixed(2)} €
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {req.request_devices?.length || 0} {t('totalDevices')} • {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// NEW REQUEST FORM (Device Sections like HTML)
// ============================================
function NewRequestForm({ profile, addresses, t, notify, refresh, setPage }) {
  const [devices, setDevices] = useState([createNewDevice(1)]);
  const [shipping, setShipping] = useState({ attention: '', address_id: addresses[0]?.id || '' });
  const [saving, setSaving] = useState(false);

  function createNewDevice(num) {
    return {
      id: `device_${Date.now()}_${num}`,
      num,
      brand: '',
      device_type: '',
      model: '',
      serial_number: '',
      service_type: '',
      notes: '',
      accessories: [],
      other_accessories: ''
    };
  }

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all devices have required fields
    for (const d of devices) {
      if (!d.brand || !d.device_type || !d.serial_number || !d.service_type || !d.notes) {
        notify('Please fill all required fields for each device', 'error');
        return;
      }
    }

    if (!shipping.attention) {
      notify('Please enter attention name', 'error');
      return;
    }

    setSaving(true);
    
    try {
      // Get next request number
      const { data: counter } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'request_counter')
        .single();
      
      const nextNum = (counter?.value?.counter || 0) + 1;
      const requestNumber = `SR-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

      // Create request
      const { data: request, error: reqErr } = await supabase
        .from('service_requests')
        .insert({
          request_number: requestNumber,
          company_id: profile.company_id,
          submitted_by: profile.id,
          requested_service: devices[0].service_type, // Primary service
          problem_description: devices.map(d => `[${d.serial_number}] ${d.notes}`).join('\n\n'),
          urgency: 'normal',
          shipping_address_id: shipping.address_id || null,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (reqErr) throw reqErr;

      // Create request_devices for each device
      for (const d of devices) {
        await supabase.from('request_devices').insert({
          request_id: request.id,
          serial_number: d.serial_number,
          model_name: d.model,
          equipment_type: d.device_type,
          service_type: d.service_type,
          // Store extra info in a JSON field or separate columns if you add them
        });
      }

      // Update counter
      await supabase
        .from('system_settings')
        .upsert({ key: 'request_counter', value: { prefix: 'SR', counter: nextNum } });

      notify(t('saved'));
      refresh();
      setPage('dashboard');
    } catch (err) {
      notify(`Error: ${err.message}`, 'error');
    }
    
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1E3A5F] mb-6">{t('newRequest')}</h1>
      
      <form onSubmit={handleSubmit}>
        {/* Devices */}
        <div className="space-y-6 mb-8">
          {devices.map((device, index) => (
            <DeviceCard
              key={device.id}
              device={device}
              t={t}
              updateDevice={updateDevice}
              toggleAccessory={toggleAccessory}
              removeDevice={removeDevice}
              canRemove={devices.length > 1}
            />
          ))}
        </div>

        {/* Add Device Button */}
        <button
          type="button"
          onClick={addDevice}
          className="mb-8 px-4 py-2 border-2 border-[#3B7AB4] text-[#3B7AB4] rounded-lg font-medium hover:bg-[#E8F2F8] transition-colors"
        >
          + {t('addDevice')}
        </button>

        {/* Shipping Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-4 pb-4 border-b-2 border-[#E8F2F8]">
            {t('shippingInfo')}
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('attention')} *
              </label>
              <input
                type="text"
                value={shipping.attention}
                onChange={e => setShipping({ ...shipping, attention: e.target.value })}
                placeholder="Contact person name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('selectAddress')} *
              </label>
              <select
                value={shipping.address_id}
                onChange={e => setShipping({ ...shipping, address_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B7AB4] focus:border-transparent"
                required
              >
                <option value="">Select an address</option>
                {addresses.map(addr => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label} - {addr.address_line1}, {addr.city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setPage('dashboard')}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-[#3B7AB4] text-white rounded-lg font-medium hover:bg-[#1E3A5F] transition-colors disabled:opacity-50"
          >
            {saving ? t('saving') : t('submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// DEVICE CARD COMPONENT
// ============================================
function DeviceCard({ device, t, updateDevice, toggleAccessory, removeDevice, canRemove }) {
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
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-[#1E3A5F]">
          {t('deviceNumber')} #{device.num}
        </h3>
        {canRemove && (
          <button
            type="button"
            onClick={() => removeDevice(device.id)}
            className="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded hover:bg-white transition-colors"
          >
            {t('removeDevice')}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Brand */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">{t('brand')} *</label>
          <select
            value={device.brand}
            onChange={e => updateDevice(device.id, 'brand', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            required
          >
            <option value="">Select brand</option>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Device Type */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">{t('deviceType')} *</label>
          <select
            value={device.device_type}
            onChange={e => {
              updateDevice(device.id, 'device_type', e.target.value);
              updateDevice(device.id, 'model', ''); // Reset model when type changes
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            required
          >
            <option value="">Select device type</option>
            {DEVICE_TYPES.map(dt => <option key={dt} value={dt}>{t(dt)}</option>)}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">{t('model')} *</label>
          <select
            value={device.model}
            onChange={e => updateDevice(device.id, 'model', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            required
            disabled={!device.device_type}
          >
            <option value="">{device.device_type ? 'Select model' : 'Select device type first'}</option>
            {device.device_type && MODELS_BY_TYPE[device.device_type]?.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Serial Number */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">{t('serialNumber')} *</label>
          <input
            type="text"
            value={device.serial_number}
            onChange={e => updateDevice(device.id, 'serial_number', e.target.value)}
            placeholder="e.g., LC-5012-A"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        {/* Service Type */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-1">{t('serviceType')} *</label>
          <select
            value={device.service_type}
            onChange={e => updateDevice(device.id, 'service_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            required
          >
            <option value="">Select service type</option>
            {SERVICE_TYPES.map(st => <option key={st} value={st}>{t(st)}</option>)}
          </select>
        </div>

        {/* Notes for Technician */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-1">{t('notesForTech')} *</label>
          <textarea
            value={device.notes}
            onChange={handleNotesChange}
            placeholder="Describe the issue or service needed for this device..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {charCount}/{maxChars} {t('charactersRemaining').replace('remaining', '')}
          </p>
        </div>

        {/* Accessories */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-2">{t('accessories')}</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ACCESSORIES.map(acc => (
              <label key={acc} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={device.accessories.includes(acc)}
                  onChange={() => toggleAccessory(device.id, acc)}
                  className="w-4 h-4 rounded border-gray-300 text-[#3B7AB4]"
                />
                <span className="text-sm">{t(acc)}</span>
              </label>
            ))}
          </div>
          <input
            type="text"
            value={device.other_accessories}
            onChange={e => updateDevice(device.id, 'other_accessories', e.target.value)}
            placeholder={t('otherAccessories') + ' (specify)'}
            className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Photo Upload (placeholder) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-1">{t('uploadPhotos')}</label>
          <input
            type="file"
            multiple
            accept="image/*"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
          />
          <p className="text-sm text-gray-500 mt-1">
            Upload photos specifically for this device showing any issues or condition
          </p>
        </div>
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
// REQUEST DETAIL PAGE
// ============================================
function RequestDetail({ request, t, setPage }) {
  const style = STATUS_STYLES[request.status] || STATUS_STYLES.submitted;

  return (
    <div>
      <button
        onClick={() => setPage('dashboard')}
        className="mb-6 text-[#3B7AB4] hover:text-[#1E3A5F] font-medium"
      >
        ← Back to {t('dashboard')}
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[#1E3A5F]">{request.request_number}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
                {t(style.label)}
              </span>
            </div>
            {request.rma_number && (
              <p className="text-green-600 font-mono">RMA: {request.rma_number}</p>
            )}
          </div>
          {request.quote_total && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">{request.quote_total.toFixed(2)} €</p>
            </div>
          )}
        </div>

        {/* Devices */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#1E3A5F] mb-4">{t('totalDevices')} ({request.request_devices?.length || 0})</h2>
          <div className="space-y-3">
            {request.request_devices?.map((device, i) => (
              <div key={device.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-[#3B7AB4]">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[#3B7AB4] font-bold">{device.serial_number}</span>
                    <p className="text-gray-600">{device.model_name || '—'}</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {t(device.service_type)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quote Details */}
        {request.quote_total && (
          <div className="bg-[#E8F2F8] rounded-lg p-4">
            <h3 className="font-bold text-[#1E3A5F] mb-3">Quote Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
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
          </div>
        )}

        {/* Timeline/History would go here */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Submitted: {new Date(request.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
