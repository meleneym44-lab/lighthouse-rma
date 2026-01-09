'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { translations, statusConfig } from '@/lib/translations';

export default function Home() {
  // Auth state
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // App state
  const [lang, setLang] = useState('fr');
  const [page, setPage] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  
  // Data state
  const [clients, setClients] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [models, setModels] = useState([]);
  const [rmas, setRmas] = useState([]);
  const [contacts, setContacts] = useState([]);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Devis form
  const [devisForm, setDevisForm] = useState({
    searchSerial: '',
    client: null,
    device: null,
    workType: '',
    calibrationPrice: 0,
    shippingRequired: false,
    shippingCost: 40,
    laborHours: 0,
    laborRate: 150,
  });

  const t = (key) => translations[lang][key] || key;
  
  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Check auth on load
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
        await loadData();
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data);
      setLang(data.preferred_language || 'fr');
    }
  };

  const loadData = async () => {
    // Load clients
    const { data: clientsData } = await supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setClients(clientsData || []);

    // Load equipment
    const { data: equipmentData } = await supabase
      .from('equipment')
      .select('*')
      .eq('is_active', true);
    setEquipment(equipmentData || []);

    // Load models
    const { data: modelsData } = await supabase
      .from('models')
      .select('*')
      .eq('is_active', true);
    setModels(modelsData || []);

    // Load RMAs
    const { data: rmasData } = await supabase
      .from('rmas')
      .select('*')
      .order('created_at', { ascending: false });
    setRmas(rmasData || []);

    // Load contacts
    const { data: contactsData } = await supabase
      .from('company_contacts')
      .select('*');
    setContacts(contactsData || []);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError(t('loginError'));
    } else {
      setUser(data.user);
      await loadProfile(data.user.id);
      await loadData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Search equipment by serial
  const searchEquipment = async () => {
    const device = equipment.find(e => e.serial_number === devisForm.searchSerial);
    if (device) {
      const client = clients.find(c => c.id === device.company_id);
      const model = models.find(m => m.id === device.model_id);
      const contact = contacts.find(c => c.company_id === device.company_id && c.is_primary);
      
      setDevisForm(prev => ({
        ...prev,
        device: { ...device, model },
        client: client ? { ...client, contact } : null,
      }));
      notify(t('clientFound'));
    } else {
      notify(t('deviceNotFound'), 'error');
    }
  };

  // Handle work type change
  const handleWorkTypeChange = (workType) => {
    let price = 0;
    if (devisForm.device?.model) {
      const model = devisForm.device.model;
      if (workType === 'calibration') price = model.calibration_price || 0;
      else if (workType === 'repair') price = model.repair_base_price || 0;
      else if (workType === 'calibration_repair') price = (model.calibration_price || 0) + (model.repair_base_price || 0);
      else if (workType === 'diagnostic') price = 150;
    }
    setDevisForm(prev => ({ ...prev, workType, calibrationPrice: price }));
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = devisForm.calibrationPrice || 0;
    subtotal += (devisForm.laborHours || 0) * (devisForm.laborRate || 150);
    if (devisForm.shippingRequired) subtotal += devisForm.shippingCost || 0;
    const tax = subtotal * 0.20;
    return { subtotal, tax, total: subtotal + tax };
  };

  // Save devis and create RMA
  const saveDevis = async () => {
    if (!devisForm.device || !devisForm.workType) {
      notify('Veuillez remplir tous les champs', 'error');
      return;
    }

    const { subtotal } = calculateTotals();
    
    // Get next RMA number
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'rma_counter')
      .single();
    
    const counter = settings?.value?.counter || 339;
    const prefix = settings?.value?.prefix || 'FR';
    const rmaNumber = `${prefix}-${String(counter).padStart(5, '0')}`;
    
    // Get next devis number
    const { data: devisSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'devis_counter')
      .single();
    
    const devisCounter = devisSettings?.value?.counter || 1;
    const devisYear = devisSettings?.value?.year || 2025;
    const devisNumber = `D-${devisYear}-${String(devisCounter).padStart(3, '0')}`;

    // Create RMA
    const { error } = await supabase.from('rmas').insert({
      rma_number: rmaNumber,
      company_id: devisForm.client?.id,
      equipment_id: devisForm.device?.id,
      serial_number: devisForm.device.serial_number,
      model_name: devisForm.device.model_name,
      work_type: devisForm.workType,
      status: 'pending',
      total_ht: subtotal,
    });

    if (error) {
      notify('Erreur: ' + error.message, 'error');
      return;
    }

    // Update counters
    await supabase.from('system_settings').update({ 
      value: { prefix, counter: counter + 1 } 
    }).eq('key', 'rma_counter');
    
    await supabase.from('system_settings').update({ 
      value: { year: devisYear, counter: devisCounter + 1 } 
    }).eq('key', 'devis_counter');

    // Reset form
    setDevisForm({
      searchSerial: '',
      client: null,
      device: null,
      workType: '',
      calibrationPrice: 0,
      shippingRequired: false,
      shippingCost: 40,
      laborHours: 0,
      laborRate: 150,
    });

    await loadData();
    notify(`${t('devisSaved')} - ${rmaNumber}`);
    setPage('rmas');
  };

  // Update RMA status
  const updateRMAStatus = async (rmaId, newStatus) => {
    const now = new Date().toISOString().split('T')[0];
    const updates = { status: newStatus };
    
    if (newStatus === 'received') updates.date_received = now;
    if (newStatus === 'in_progress') updates.date_started = now;
    if (newStatus === 'completed') updates.date_completed = now;
    if (newStatus === 'shipped') updates.date_shipped = now;

    await supabase.from('rmas').update(updates).eq('id', rmaId);
    
    // Add to history
    await supabase.from('rma_history').insert({
      rma_id: rmaId,
      status: newStatus,
      action: `Status changed to ${newStatus}`,
      performed_by: user?.id,
    });

    await loadData();
    notify(t('statusUpdated'));
  };

  const totals = calculateTotals();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  // Login page
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lighthouse-dark to-lighthouse-blue">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔬</div>
            <h1 className="text-2xl font-bold text-lighthouse-dark">Lighthouse France</h1>
            <p className="text-gray-500">RMA Portal</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            {loginError && (
              <div className="text-red-500 text-sm">{loginError}</div>
            )}
            <button type="submit" className="w-full btn-primary py-3 text-lg">
              {t('login')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-lighthouse-dark to-lighthouse-blue text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🔬</span>
            <div>
              <h1 className="text-xl font-bold">Lighthouse France</h1>
              <p className="text-sm opacity-80">Service de Calibration & Réparation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language toggle */}
            <div className="flex bg-white/20 rounded-lg overflow-hidden">
              <button 
                onClick={() => setLang('fr')}
                className={`px-3 py-1 text-sm font-medium ${lang === 'fr' ? 'bg-white text-lighthouse-dark' : ''}`}
              >
                FR
              </button>
              <button 
                onClick={() => setLang('en')}
                className={`px-3 py-1 text-sm font-medium ${lang === 'en' ? 'bg-white text-lighthouse-dark' : ''}`}
              >
                EN
              </button>
            </div>
            
            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-lighthouse-yellow rounded-full flex items-center justify-center text-lighthouse-dark font-bold">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block">
                <div className="font-medium">{profile?.full_name}</div>
                <div className="text-xs opacity-80 capitalize">{profile?.role}</div>
              </div>
              <button onClick={handleLogout} className="ml-2 text-sm opacity-80 hover:opacity-100">
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-lighthouse-dark border-b-4 border-lighthouse-yellow">
        <div className="max-w-7xl mx-auto flex">
          {[
            { id: 'dashboard', icon: '📊', label: 'dashboard' },
            { id: 'nouveau-devis', icon: '➕', label: 'newDevis' },
            { id: 'rmas', icon: '📋', label: 'rmaTracking' },
            { id: 'clients', icon: '👥', label: 'clients' },
            { id: 'equipment', icon: '🔧', label: 'equipment' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`px-5 py-3 font-medium flex items-center gap-2 border-b-3 transition-colors ${
                page === item.id 
                  ? 'bg-lighthouse-blue text-white border-lighthouse-yellow' 
                  : 'text-white/80 hover:text-white hover:bg-lighthouse-blue/50 border-transparent'
              }`}
            >
              <span>{item.icon}</span>
              <span className="hidden sm:inline">{t(item.label)}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Dashboard */}
        {page === 'dashboard' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('dashboard')}</h1>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { key: 'pending', count: rmas.filter(r => r.status === 'pending').length, color: 'border-yellow-500', icon: '⏳' },
                { key: 'inProgress', count: rmas.filter(r => ['received', 'in_progress'].includes(r.status)).length, color: 'border-purple-500', icon: '🔧' },
                { key: 'completed', count: rmas.filter(r => r.status === 'completed').length, color: 'border-green-500', icon: '✅' },
                { key: 'totalRMAs', count: rmas.length, color: 'border-blue-500', icon: '📋' },
              ].map((stat, i) => (
                <div key={i} className={`card p-6 border-l-4 ${stat.color}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-3xl font-bold text-gray-800">{stat.count}</div>
                      <div className="text-sm text-gray-500 mt-1">{t(stat.key)}</div>
                    </div>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent RMAs */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">{t('recentRMAs')}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('rmaNumber')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('client')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('model')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('status')}</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('totalHT')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rmas.slice(0, 5).map(rma => {
                      const client = clients.find(c => c.id === rma.company_id);
                      const config = statusConfig[rma.status] || statusConfig.pending;
                      return (
                        <tr key={rma.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-mono font-bold text-blue-600">{rma.rma_number}</td>
                          <td className="px-6 py-4 font-medium">{client?.name || '-'}</td>
                          <td className="px-6 py-4">{rma.model_name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                              {config.icon} {t(config.labelKey)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold">{(rma.total_ht || 0).toFixed(2)} €</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Nouveau Devis */}
        {page === 'nouveau-devis' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('createDevis')}</h1>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left - Device Search */}
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4 pb-3 border-b">🔍 {t('searchDevice')}</h2>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('serialNumber')}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={devisForm.searchSerial}
                        onChange={(e) => setDevisForm(prev => ({ ...prev, searchSerial: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && searchEquipment()}
                        placeholder="Ex: 200113002"
                        className="input-field flex-1"
                      />
                      <button onClick={searchEquipment} className="btn-primary">
                        {t('search')}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Test: 200113002, 211008001, 220315003</p>
                  </div>

                  {devisForm.device && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">{t('model')}:</span> <strong>{devisForm.device.model_name}</strong></div>
                        <div><span className="text-gray-500">{t('type')}:</span> <strong>{devisForm.device.equipment_type}</strong></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4 pb-3 border-b">🔧 {t('workType')}</h2>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workType')}</label>
                    <select
                      value={devisForm.workType}
                      onChange={(e) => handleWorkTypeChange(e.target.value)}
                      className="input-field"
                    >
                      <option value="">-- Select --</option>
                      <option value="calibration">{t('calibration')}</option>
                      <option value="repair">{t('repair')}</option>
                      <option value="calibration_repair">{t('calibrationRepair')}</option>
                      <option value="diagnostic">{t('diagnostic')}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('calibrationPrice')} (€)</label>
                      <input
                        type="number"
                        value={devisForm.calibrationPrice}
                        onChange={(e) => setDevisForm(prev => ({ ...prev, calibrationPrice: Number(e.target.value) }))}
                        className="input-field bg-blue-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('shippingRequired')}</label>
                      <select
                        value={devisForm.shippingRequired ? 'yes' : 'no'}
                        onChange={(e) => setDevisForm(prev => ({ ...prev, shippingRequired: e.target.value === 'yes' }))}
                        className="input-field"
                      >
                        <option value="no">{t('no')}</option>
                        <option value="yes">{t('yes')}</option>
                      </select>
                    </div>
                  </div>

                  {devisForm.shippingRequired && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('shippingCost')} (€)</label>
                      <input
                        type="number"
                        value={devisForm.shippingCost}
                        onChange={(e) => setDevisForm(prev => ({ ...prev, shippingCost: Number(e.target.value) }))}
                        className="input-field"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right - Client & Totals */}
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4 pb-3 border-b">👤 {t('clientInfo')}</h2>
                  
                  {devisForm.client ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      {[
                        [t('company'), devisForm.client.name],
                        [t('contact'), devisForm.client.contact?.full_name],
                        [t('email'), devisForm.client.contact?.email || devisForm.client.email],
                        [t('phone'), devisForm.client.contact?.phone || devisForm.client.phone],
                        [t('city'), `${devisForm.client.billing_postal_code} ${devisForm.client.billing_city}`],
                      ].map(([label, value], i) => (
                        <div key={i} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                          <span className="text-gray-500 text-sm">{label}:</span>
                          <span className="font-medium">{value || '-'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-5xl mb-3">🔍</div>
                      <p>{lang === 'fr' ? 'Recherchez un appareil' : 'Search for a device'}</p>
                    </div>
                  )}
                </div>

                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4 pb-3 border-b">💰 {t('total')}</h2>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">{t('totalHT')}:</span>
                      <span className="font-semibold">{totals.subtotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">{t('tva')}:</span>
                      <span className="font-semibold">{totals.tax.toFixed(2)} €</span>
                    </div>
                  </div>
                  
                  <div className="bg-lighthouse-dark text-white rounded-lg p-4 flex justify-between items-center">
                    <span className="text-lg">{t('totalTTC')}:</span>
                    <span className="text-2xl font-bold">{totals.total.toFixed(2)} €</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDevisForm({
                      searchSerial: '', client: null, device: null, workType: '',
                      calibrationPrice: 0, shippingRequired: false, shippingCost: 40, laborHours: 0, laborRate: 150,
                    })}
                    className="btn-secondary flex-1"
                  >
                    🔄 {t('newQuote')}
                  </button>
                  <button onClick={saveDevis} className="btn-success flex-1">
                    💾 {t('save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RMA List */}
        {page === 'rmas' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">{t('rmaTracking')}</h1>
              <button onClick={() => setPage('nouveau-devis')} className="btn-primary">
                ➕ {t('newDevis')}
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-lighthouse-dark text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">{t('rmaNumber')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">{t('client')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">{t('model')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">{t('serialNumber')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">{t('status')}</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">{t('totalHT')}</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rmas.map((rma, idx) => {
                      const client = clients.find(c => c.id === rma.company_id);
                      const config = statusConfig[rma.status] || statusConfig.pending;
                      return (
                        <tr key={rma.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-mono font-bold text-blue-600">{rma.rma_number}</td>
                          <td className="px-4 py-3 font-medium">{client?.name || '-'}</td>
                          <td className="px-4 py-3">{rma.model_name}</td>
                          <td className="px-4 py-3 font-mono text-sm">{rma.serial_number}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                              {config.icon} {t(config.labelKey)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{(rma.total_ht || 0).toFixed(2)} €</td>
                          <td className="px-4 py-3 text-center">
                            {rma.status === 'pending' && (
                              <button onClick={() => updateRMAStatus(rma.id, 'received')} className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                                {t('markReceived')}
                              </button>
                            )}
                            {rma.status === 'received' && (
                              <button onClick={() => updateRMAStatus(rma.id, 'in_progress')} className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                                {t('startWork')}
                              </button>
                            )}
                            {rma.status === 'in_progress' && (
                              <button onClick={() => updateRMAStatus(rma.id, 'completed')} className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
                                {t('markComplete')}
                              </button>
                            )}
                            {rma.status === 'completed' && (
                              <button onClick={() => updateRMAStatus(rma.id, 'shipped')} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                                {t('markShipped')}
                              </button>
                            )}
                            {rma.status === 'shipped' && <span className="text-gray-400">✓</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Clients */}
        {page === 'clients' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('clients')}</h1>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map(client => {
                const contact = contacts.find(c => c.company_id === client.id && c.is_primary);
                const deviceCount = equipment.filter(e => e.company_id === client.id).length;
                return (
                  <div key={client.id} className="card p-6 border-t-4 border-lighthouse-blue">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-lighthouse-dark">{client.name}</h3>
                        <span className="text-xs text-gray-500 font-mono">#{client.client_number}</span>
                      </div>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                        {deviceCount} {t('equipment')}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2"><span>👤</span> {contact?.full_name || '-'}</div>
                      <div className="flex items-center gap-2"><span>📧</span> <span className="text-blue-600">{contact?.email || client.email}</span></div>
                      <div className="flex items-center gap-2"><span>📞</span> {contact?.phone || client.phone}</div>
                      <div className="flex items-center gap-2"><span>📍</span> {client.billing_postal_code} {client.billing_city}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Equipment */}
        {page === 'equipment' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('equipment')}</h1>
            
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('serialNumber')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('model')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('type')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('client')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {equipment.map((eq, idx) => {
                    const client = clients.find(c => c.id === eq.company_id);
                    return (
                      <tr key={eq.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 font-mono font-semibold text-lighthouse-dark">{eq.serial_number}</td>
                        <td className="px-6 py-4 font-medium">{eq.model_name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            eq.equipment_type === 'biocollector' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {eq.equipment_type === 'biocollector' ? 'Biocollecteur' : 'Compteur'}
                          </span>
                        </td>
                        <td className="px-6 py-4">{client?.name || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-lighthouse-dark text-white py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>© 2025 Lighthouse France - Service de Calibration & Réparation</p>
          <p className="opacity-60 mt-1">Créteil, France | Filiale de Lighthouse Worldwide Solutions</p>
        </div>
      </footer>
    </div>
  );
}
