'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const Logo = ({ className = "h-10", light = false }) => (
  <svg viewBox="0 0 400 60" className={className}>
    <defs><pattern id="logoLines" patternUnits="userSpaceOnUse" width="3" height="50"><line x1="1.5" y1="0" x2="1.5" y2="50" stroke={light ? "#fff" : "#1a1a2e"} strokeWidth="1.5"/></pattern></defs>
    <rect x="0" y="5" width="50" height="50" fill="url(#logoLines)" rx="2"/>
    <text x="60" y="35" fontFamily="Arial Black, sans-serif" fontSize="28" fontWeight="900" fill={light ? "#fff" : "#1a1a2e"} letterSpacing="1">LIGHTHOUSE</text>
    <text x="60" y="52" fontFamily="Arial, sans-serif" fontSize="14" fill={light ? "rgba(255,255,255,0.8)" : "#0ea5e9"} letterSpacing="3">FRANCE</text>
  </svg>
);

const T = {
  fr: { login: 'Connexion', logout: 'Déconnexion', register: 'Créer un compte', email: 'Email', password: 'Mot de passe', confirmPassword: 'Confirmer', noAccount: "Pas encore de compte?", welcome: 'Bienvenue', dashboard: 'Tableau de Bord', openRequests: 'Demandes Ouvertes', rmaTracking: 'Suivi RMA', clients: 'Clients', equipment: 'Équipements', priceList: 'Tarifs', settings: 'Paramètres', newRequest: 'Nouvelle Demande', myRequests: 'Mes Demandes', myEquipment: 'Mes Équipements', submitted: 'Soumise', quoted: 'Devis envoyé', approved: 'Approuvé', received: 'Reçu', inProgress: 'En cours', completed: 'Terminé', shipped: 'Expédié', rejected: 'Refusé', serialNumber: 'N° de Série', model: 'Modèle', type: 'Type', location: 'Emplacement', particleCounter: 'Compteur', biocollector: 'Biocollecteur', addEquipment: 'Ajouter', createQuote: 'Créer Devis', sendQuote: 'Envoyer Devis', serviceType: 'Type de Service', calibration: 'Calibration', repair: 'Réparation', diagnostic: 'Diagnostic', calibrationRepair: 'Calibration + Réparation', problemDescription: 'Description du Problème', urgency: 'Urgence', normal: 'Normal', urgent: 'Urgent', critical: 'Critique', subtotal: 'Sous-total HT', vat: 'TVA (20%)', total: 'Total TTC', save: 'Enregistrer', cancel: 'Annuler', submit: 'Soumettre', markReceived: 'Marquer Reçu', startWork: 'Démarrer', markComplete: 'Terminer', shipDevice: 'Expédier', loading: 'Chargement...', saving: 'Enregistrement...', saved: 'Enregistré!', requestSubmitted: 'Demande soumise!', newRequests: 'Nouvelles Demandes', pendingQuotes: 'Devis en Attente', activeRmas: 'RMAs Actifs', completedThisMonth: 'Terminés ce Mois', totalClients: 'Clients', totalDevices: 'Appareils', company: 'Société', contact: 'Contact', phone: 'Téléphone', address: 'Adresse', all: 'Tous', search: 'Rechercher' },
  en: { login: 'Login', logout: 'Logout', register: 'Create Account', email: 'Email', password: 'Password', confirmPassword: 'Confirm', noAccount: "Don't have an account?", welcome: 'Welcome', dashboard: 'Dashboard', openRequests: 'Open Requests', rmaTracking: 'RMA Tracking', clients: 'Clients', equipment: 'Equipment', priceList: 'Price List', settings: 'Settings', newRequest: 'New Request', myRequests: 'My Requests', myEquipment: 'My Equipment', submitted: 'Submitted', quoted: 'Quoted', approved: 'Approved', received: 'Received', inProgress: 'In Progress', completed: 'Completed', shipped: 'Shipped', rejected: 'Rejected', serialNumber: 'Serial Number', model: 'Model', type: 'Type', location: 'Location', particleCounter: 'Counter', biocollector: 'Biocollector', addEquipment: 'Add', createQuote: 'Create Quote', sendQuote: 'Send Quote', serviceType: 'Service Type', calibration: 'Calibration', repair: 'Repair', diagnostic: 'Diagnostic', calibrationRepair: 'Calibration + Repair', problemDescription: 'Problem Description', urgency: 'Urgency', normal: 'Normal', urgent: 'Urgent', critical: 'Critical', subtotal: 'Subtotal', vat: 'VAT (20%)', total: 'Total', save: 'Save', cancel: 'Cancel', submit: 'Submit', markReceived: 'Mark Received', startWork: 'Start Work', markComplete: 'Complete', shipDevice: 'Ship', loading: 'Loading...', saving: 'Saving...', saved: 'Saved!', requestSubmitted: 'Request submitted!', newRequests: 'New Requests', pendingQuotes: 'Pending Quotes', activeRmas: 'Active RMAs', completedThisMonth: 'Completed This Month', totalClients: 'Clients', totalDevices: 'Devices', company: 'Company', contact: 'Contact', phone: 'Phone', address: 'Address', all: 'All', search: 'Search' }
};

const STATUS = {
  submitted: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: '📨', label: 'submitted' },
  quoted: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: '💰', label: 'quoted' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: '✅', label: 'approved' },
  received: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: '📥', label: 'received' },
  in_progress: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: '🔧', label: 'inProgress' },
  completed: { bg: 'bg-teal-500/10', text: 'text-teal-400', icon: '✅', label: 'completed' },
  shipped: { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: '🚚', label: 'shipped' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', icon: '❌', label: 'rejected' },
};

const PRICING = {
  calibration: [
    { ref: 'Cal1', name: 'AC100/AC100H/AC90', price: 330 },
    { ref: 'Cal7', name: 'Apex P3/P5', price: 870 },
    { ref: 'Cal9', name: 'Apex R02/R03/R05/R3/R5', price: 320 },
    { ref: 'Cal18', name: 'Apex Z3', price: 870 },
    { ref: 'Cal19', name: 'Apex Z50', price: 920 },
    { ref: 'Cal22', name: 'HandiLaz 2016/3013/3016/5016', price: 600 },
    { ref: 'Cal27', name: 'LS-20/LS-60', price: 1200 },
    { ref: 'Cal49', name: 'Solair 3100/3100+/3200/5100', price: 870 },
  ],
  services: [
    { ref: 'Cell1', name: 'Nettoyage Cellule', price: 100 },
    { ref: 'Cell2', name: 'LD Sensor - Nettoyage', price: 200 },
    { ref: 'Main1', name: 'Diagnostic', price: 75 },
    { ref: 'Main2', name: "Main d'oeuvre (heure)", price: 100 },
    { ref: 'Ship1', name: 'Frais de Port', price: 40 },
  ]
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('fr');
  const [page, setPage] = useState('home');
  const [toast, setToast] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [requests, setRequests] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [addresses, setAddresses] = useState([]);

  const t = (key) => T[lang]?.[key] || key;
  const notify = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const isAdmin = profile?.role === 'admin' || profile?.role === 'technician';

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase.from('profiles').select('*, companies(*)').eq('id', session.user.id).single();
        if (prof) { setProfile(prof); setPage('dashboard'); await loadData(prof); }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadData = async (prof) => {
    if (!prof) return;
    try {
      if (prof.role === 'admin' || prof.role === 'technician') {
        const [reqRes, compRes, eqRes] = await Promise.all([
          supabase.from('service_requests').select('*, companies(name, client_number)').order('created_at', { ascending: false }),
          supabase.from('companies').select('*, company_contacts(*)').order('name'),
          supabase.from('equipment').select('*, companies(name)').order('created_at', { ascending: false }),
        ]);
        setRequests(reqRes.data || []); setCompanies(compRes.data || []); setEquipment(eqRes.data || []);
      } else if (prof.company_id) {
        const [eqRes, reqRes, addrRes] = await Promise.all([
          supabase.from('equipment').select('*').eq('company_id', prof.company_id),
          supabase.from('service_requests').select('*').eq('company_id', prof.company_id).order('created_at', { ascending: false }),
          supabase.from('shipping_addresses').select('*').eq('company_id', prof.company_id),
        ]);
        setEquipment(eqRes.data || []); setRequests(reqRes.data || []); setAddresses(addrRes.data || []);
      }
    } catch (err) { console.error(err); }
  };

  const handleLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    setUser(data.user);
    const { data: prof } = await supabase.from('profiles').select('*, companies(*)').eq('id', data.user.id).single();
    setProfile(prof); setPage('dashboard'); await loadData(prof);
    return null;
  };

  const handleRegister = async (formData) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: formData.email, password: formData.password });
    if (authError) return authError.message;
    const { data: company } = await supabase.from('companies').insert({ name: formData.companyName, billing_address: formData.address, billing_city: formData.city, billing_postal_code: formData.postalCode, billing_country: 'France', phone: formData.phone, email: formData.email }).select().single();
    if (company) {
      await supabase.from('profiles').insert({ id: authData.user.id, email: formData.email, full_name: formData.contactName, role: 'customer', company_id: company.id, phone: formData.phone });
      await supabase.from('shipping_addresses').insert({ company_id: company.id, label: 'Adresse Principale', address_line1: formData.address, city: formData.city, postal_code: formData.postalCode, country: 'France', is_default: true });
    }
    notify(t('saved')); setPage('login');
    return null;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setPage('home');
    setEquipment([]); setRequests([]); setCompanies([]); setAddresses([]);
  };

  const refreshData = () => loadData(profile);

  if (loading) return <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center"><div className="text-center"><div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-cyan-400">Loading...</p></div></div>;

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {toast && <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl border ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-red-500/20 border-red-500/50 text-red-300'}`}>{toast.msg}</div>}
      <Header user={user} profile={profile} isAdmin={isAdmin} lang={lang} setLang={setLang} t={t} page={page} setPage={setPage} onLogout={handleLogout} />
      <main className="relative">
        <div className="fixed inset-0 pointer-events-none"><div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div><div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div></div>
        <div className="relative z-10">
          {!user ? (
            <>{page === 'home' && <HomePage t={t} setPage={setPage} />}{page === 'login' && <LoginPage t={t} onLogin={handleLogin} setPage={setPage} />}{page === 'register' && <RegisterPage t={t} onRegister={handleRegister} setPage={setPage} />}</>
          ) : isAdmin ? (
            <>{page === 'dashboard' && <AdminDashboard requests={requests} companies={companies} equipment={equipment} t={t} setPage={setPage} />}{page === 'requests' && <AdminRequests requests={requests} t={t} onRefresh={refreshData} notify={notify} />}{page === 'rma' && <AdminRMA requests={requests} t={t} onRefresh={refreshData} notify={notify} />}{page === 'clients' && <AdminClients companies={companies} equipment={equipment} t={t} />}{page === 'equipment' && <AdminEquipment equipment={equipment} t={t} />}{page === 'pricing' && <AdminPricing t={t} />}</>
          ) : (
            <>{page === 'dashboard' && <CustomerDashboard profile={profile} equipment={equipment} requests={requests} t={t} setPage={setPage} />}{page === 'equipment' && <CustomerEquipment equipment={equipment} t={t} profile={profile} onRefresh={refreshData} notify={notify} />}{page === 'requests' && <CustomerRequests requests={requests} t={t} setPage={setPage} />}{page === 'new-request' && <NewRequestPage equipment={equipment} addresses={addresses} t={t} profile={profile} onRefresh={refreshData} notify={notify} setPage={setPage} />}{page === 'settings' && <SettingsPage profile={profile} addresses={addresses} t={t} onRefresh={refreshData} notify={notify} />}</>
          )}
        </div>
      </main>
      <footer className="relative z-10 border-t border-white/5 py-8 mt-20 text-center"><Logo className="h-8 mx-auto mb-4" light /><p className="text-white/40 text-sm">16 Rue Paul Séjourne, 94000 Créteil</p></footer>
    </div>
  );
}

function Header({ user, profile, isAdmin, lang, setLang, t, page, setPage, onLogout }) {
  const adminNav = [{ id: 'dashboard', icon: '📊', label: 'dashboard' },{ id: 'requests', icon: '📨', label: 'openRequests' },{ id: 'rma', icon: '🔧', label: 'rmaTracking' },{ id: 'clients', icon: '👥', label: 'clients' },{ id: 'equipment', icon: '⚙️', label: 'equipment' },{ id: 'pricing', icon: '💰', label: 'priceList' }];
  const customerNav = [{ id: 'dashboard', icon: '📊', label: 'dashboard' },{ id: 'new-request', icon: '➕', label: 'newRequest' },{ id: 'requests', icon: '📋', label: 'myRequests' },{ id: 'equipment', icon: '⚙️', label: 'myEquipment' },{ id: 'settings', icon: '⚙️', label: 'settings' }];
  const nav = user ? (isAdmin ? adminNav : customerNav) : [];
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a1a]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="cursor-pointer" onClick={() => setPage(user ? 'dashboard' : 'home')}><Logo className="h-10" light /></div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 rounded-lg p-1"><button onClick={() => setLang('fr')} className={`px-3 py-1.5 text-xs font-bold rounded ${lang === 'fr' ? 'bg-cyan-500' : 'text-white/50'}`}>FR</button><button onClick={() => setLang('en')} className={`px-3 py-1.5 text-xs font-bold rounded ${lang === 'en' ? 'bg-cyan-500' : 'text-white/50'}`}>EN</button></div>
            {user ? (<div className="flex items-center gap-4"><div className="hidden md:block text-right"><p className="text-sm">{profile?.full_name}</p><p className="text-xs text-cyan-400">{isAdmin ? '⚡ Admin' : profile?.companies?.name}</p></div><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold">{profile?.full_name?.charAt(0) || 'U'}</div><button onClick={onLogout} className="text-white/50 hover:text-white text-sm">{t('logout')}</button></div>) : (<button onClick={() => setPage('login')} className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-semibold text-sm">{t('login')}</button>)}
          </div>
        </div>
        {user && <nav className="flex gap-1 pb-3 overflow-x-auto">{nav.map(item => (<button key={item.id} onClick={() => setPage(item.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap ${page === item.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-white/60 hover:bg-white/5'}`}><span>{item.icon}</span><span>{t(item.label)}</span></button>))}</nav>}
      </div>
    </header>
  );
}

function HomePage({ t, setPage }) {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm mb-8"><span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>Portail de Service</div>
        <h1 className="text-5xl md:text-7xl font-black mb-6"><span className="text-white">Calibration &</span><br/><span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Réparation</span></h1>
        <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">Services professionnels pour vos compteurs de particules et biocollecteurs Lighthouse</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => setPage('login')} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-all">{t('login')} →</button>
          <button onClick={() => setPage('register')} className="px-8 py-4 bg-white/5 border border-white/20 rounded-xl font-bold text-lg hover:bg-white/10">{t('register')}</button>
        </div>
      </div>
    </section>
  );
}

function LoginPage({ t, onLogin, setPage }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setError(''); const err = await onLogin(email, password); if (err) setError(err); setLoading(false); };
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-[#12122a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="bg-cyan-500/10 border-b border-white/10 p-8 text-center"><Logo className="h-12 mx-auto mb-4" light /><h1 className="text-2xl font-bold">{t('login')}</h1></div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div><label className="block text-sm text-white/70 mb-2">{t('email')}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" required /></div>
          <div><label className="block text-sm text-white/70 mb-2">{t('password')}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" required /></div>
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">{loading ? t('loading') : t('login')}</button>
        </form>
        <div className="px-8 pb-8 text-center"><p className="text-white/50">{t('noAccount')} <button onClick={() => setPage('register')} className="text-cyan-400 font-semibold">{t('register')}</button></p></div>
      </div>
    </div>
  );
}

function RegisterPage({ t, onRegister, setPage }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', companyName: '', contactName: '', phone: '', address: '', city: '', postalCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; } setLoading(true); const err = await onRegister(form); if (err) setError(err); setLoading(false); };
  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="py-12 px-6">
      <div className="max-w-2xl mx-auto bg-[#12122a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="bg-cyan-500/10 border-b border-white/10 p-8"><h1 className="text-2xl font-bold">{t('register')}</h1></div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-sm text-white/70 mb-2">{t('company')} *</label><input type="text" value={form.companyName} onChange={e => u('companyName', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" required /></div>
            <div><label className="block text-sm text-white/70 mb-2">{t('contact')} *</label><input type="text" value={form.contactName} onChange={e => u('contactName', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" required /></div>
            <div><label className="block text-sm text-white/70 mb-2">{t('phone')}</label><input type="tel" value={form.phone} onChange={e => u('phone', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" /></div>
            <div className="md:col-span-2"><label className="block text-sm text-white/70 mb-2">{t('address')} *</label><input type="text" value={form.address} onChange={e => u('address', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" required /></div>
            <div><label className="block text-sm text-white/70 mb-2">Ville *</label><input type="text" value={form.city} onChange={e => u('city', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" required /></div>
            <div><label className="block text-sm text-white/70 mb-2">Code Postal *</label><input type="text" value={form.postalCode} onChange={e => u('postalCode', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" required /></div>
            <div className="md:col-span-2"><label className="block text-sm text-white/70 mb-2">{t('email')} *</label><input type="email" value={form.email} onChange={e => u('email', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" required /></div>
            <div><label className="block text-sm text-white/70 mb-2">{t('password')} *</label><input type="password" value={form.password} onChange={e => u('password', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" required minLength={6} /></div>
            <div><label className="block text-sm text-white/70 mb-2">{t('confirmPassword')} *</label><input type="password" value={form.confirmPassword} onChange={e => u('confirmPassword', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 outline-none" required /></div>
          </div>
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
          <div className="flex gap-4"><button type="button" onClick={() => setPage('login')} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl">{t('cancel')}</button><button type="submit" disabled={loading} className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">{loading ? t('loading') : t('register')}</button></div>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard({ requests, companies, equipment, t, setPage }) {
  const stats = [
    { label: t('newRequests'), value: requests.filter(r => r.status === 'submitted').length, icon: '📨', onClick: () => setPage('requests') },
    { label: t('pendingQuotes'), value: requests.filter(r => r.status === 'quoted').length, icon: '💰', onClick: () => setPage('requests') },
    { label: t('activeRmas'), value: requests.filter(r => ['approved', 'received', 'in_progress'].includes(r.status)).length, icon: '🔧', onClick: () => setPage('rma') },
    { label: t('completedThisMonth'), value: requests.filter(r => r.status === 'completed' || r.status === 'shipped').length, icon: '✅' },
    { label: t('totalClients'), value: companies.length, icon: '👥', onClick: () => setPage('clients') },
    { label: t('totalDevices'), value: equipment.length, icon: '⚙️', onClick: () => setPage('equipment') },
  ];
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('dashboard')}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {stats.map((s, i) => (<button key={i} onClick={s.onClick} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left hover:border-white/20 transition"><div className="text-3xl mb-3">{s.icon}</div><div className="text-3xl font-bold">{s.value}</div><div className="text-white/50 text-sm">{s.label}</div></button>))}
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-white/10"><h2 className="text-xl font-bold">Demandes Récentes</h2><button onClick={() => setPage('requests')} className="text-cyan-400 text-sm">Voir tout →</button></div>
        <table className="w-full"><thead><tr className="border-b border-white/10"><th className="text-left p-4 text-white/50 text-sm">N° Demande</th><th className="text-left p-4 text-white/50 text-sm">Client</th><th className="text-left p-4 text-white/50 text-sm">Modèle</th><th className="text-left p-4 text-white/50 text-sm">Statut</th></tr></thead>
        <tbody>{requests.slice(0, 6).map(r => { const st = STATUS[r.status] || STATUS.submitted; return (<tr key={r.id} className="border-b border-white/5 hover:bg-white/5"><td className="p-4 font-mono text-cyan-400">{r.request_number || '—'}</td><td className="p-4">{r.companies?.name || '—'}</td><td className="p-4 text-white/70">{r.model_name || '—'}</td><td className="p-4"><span className={`px-3 py-1 rounded-lg text-xs ${st.bg} ${st.text}`}>{st.icon} {t(st.label)}</span></td></tr>); })}</tbody></table>
      </div>
    </div>
  );
}

function AdminRequests({ requests, t, onRefresh, notify }) {
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);
  const [quote, setQuote] = useState({ calibration: 320, parts: 0, labor_hours: 0, labor_rate: 65, shipping: 25, notes: '' });
  const [saving, setSaving] = useState(false);
  const filters = ['all', 'submitted', 'quoted', 'approved'];
  const filtered = filter === 'all' ? requests.filter(r => ['submitted', 'quoted', 'approved', 'rejected'].includes(r.status)) : requests.filter(r => r.status === filter);
  const subtotal = quote.calibration + quote.parts + (quote.labor_hours * quote.labor_rate) + quote.shipping;
  const tax = subtotal * 0.2;
  const total = subtotal + tax;

  const sendQuote = async () => {
    setSaving(true);
    await supabase.from('service_requests').update({ status: 'quoted', quote_calibration: quote.calibration, quote_parts: quote.parts, quote_labor_hours: quote.labor_hours, quote_labor_rate: quote.labor_rate, quote_shipping: quote.shipping, quote_notes: quote.notes, quote_subtotal: subtotal, quote_tax: tax, quote_total: total, quoted_at: new Date().toISOString() }).eq('id', sel.id);
    setSaving(false); notify(t('saved')); setSel(null); onRefresh();
  };

  const approveRMA = async (req) => {
    const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'rma_counter').single();
    const counter = settings?.value?.counter || 340;
    const rmaNumber = `FR-${String(counter).padStart(5, '0')}`;
    await supabase.from('service_requests').update({ status: 'approved', rma_number: rmaNumber, approved_at: new Date().toISOString() }).eq('id', req.id);
    await supabase.from('system_settings').update({ value: { prefix: 'FR', counter: counter + 1 } }).eq('key', 'rma_counter');
    notify(`RMA ${rmaNumber} créé!`); onRefresh();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('openRequests')}</h1>
      <div className="flex gap-2 mb-6">{filters.map(f => (<button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm ${filter === f ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/60'}`}>{t(f)} ({f === 'all' ? requests.filter(r => ['submitted', 'quoted', 'approved', 'rejected'].includes(r.status)).length : requests.filter(r => r.status === f).length})</button>))}</div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-white/10"><th className="text-left p-4 text-white/50 text-sm">N° Demande</th><th className="text-left p-4 text-white/50 text-sm">Client</th><th className="text-left p-4 text-white/50 text-sm">N° Série</th><th className="text-left p-4 text-white/50 text-sm">Urgence</th><th className="text-left p-4 text-white/50 text-sm">Statut</th><th className="text-left p-4 text-white/50 text-sm">Actions</th></tr></thead>
        <tbody>{filtered.map(r => { const st = STATUS[r.status] || STATUS.submitted; return (<tr key={r.id} className="border-b border-white/5 hover:bg-white/5"><td className="p-4 font-mono text-cyan-400">{r.request_number || '—'}</td><td className="p-4">{r.companies?.name || '—'}</td><td className="p-4 font-mono text-sm text-white/70">{r.serial_number}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs ${r.urgency === 'critical' ? 'bg-red-500/20 text-red-400' : r.urgency === 'urgent' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/60'}`}>{r.urgency}</span></td><td className="p-4"><span className={`px-3 py-1 rounded-lg text-xs ${st.bg} ${st.text}`}>{st.icon} {t(st.label)}</span></td><td className="p-4">{r.status === 'submitted' && <button onClick={() => setSel(r)} className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">{t('createQuote')}</button>}{r.status === 'quoted' && <button onClick={() => approveRMA(r)} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">✓ Approve & RMA</button>}</td></tr>); })}</tbody></table>
      </div>
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setSel(null)}>
          <div className="w-full max-w-2xl bg-[#12122a] border border-white/10 rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10"><h2 className="text-xl font-bold">{t('createQuote')}</h2><p className="text-white/50">{sel.request_number} • {sel.companies?.name}</p></div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-white/5 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm"><div>N° Série: <strong>{sel.serial_number}</strong></div><div>Modèle: <strong>{sel.model_name}</strong></div><div>Service: <strong className="capitalize">{sel.requested_service}</strong></div><div>Urgence: <strong className="capitalize">{sel.urgency}</strong></div></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-white/50 mb-2">Calibration (€)</label><input type="number" value={quote.calibration} onChange={e => setQuote({...quote, calibration: Number(e.target.value)})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" /></div>
                <div><label className="block text-sm text-white/50 mb-2">Pièces (€)</label><input type="number" value={quote.parts} onChange={e => setQuote({...quote, parts: Number(e.target.value)})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" /></div>
                <div><label className="block text-sm text-white/50 mb-2">Main d&apos;œuvre (h)</label><input type="number" step="0.5" value={quote.labor_hours} onChange={e => setQuote({...quote, labor_hours: Number(e.target.value)})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" /></div>
                <div><label className="block text-sm text-white/50 mb-2">Taux (€/h)</label><input type="number" value={quote.labor_rate} onChange={e => setQuote({...quote, labor_rate: Number(e.target.value)})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" /></div>
                <div><label className="block text-sm text-white/50 mb-2">Transport (€)</label><input type="number" value={quote.shipping} onChange={e => setQuote({...quote, shipping: Number(e.target.value)})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" /></div>
              </div>
              <div><label className="block text-sm text-white/50 mb-2">Notes</label><textarea value={quote.notes} onChange={e => setQuote({...quote, notes: e.target.value})} rows={2} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none" /></div>
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4"><div className="flex justify-between text-white/70"><span>{t('subtotal')}:</span><span>{subtotal.toFixed(2)} €</span></div><div className="flex justify-between text-white/70"><span>{t('vat')}:</span><span>{tax.toFixed(2)} €</span></div><div className="flex justify-between text-xl font-bold pt-2 border-t border-white/10 mt-2"><span>{t('total')}:</span><span className="text-cyan-400">{total.toFixed(2)} €</span></div></div>
            </div>
            <div className="p-6 border-t border-white/10 flex gap-4"><button onClick={() => setSel(null)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl">{t('cancel')}</button><button onClick={sendQuote} disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">{saving ? t('saving') : t('sendQuote')}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminRMA({ requests, t, onRefresh, notify }) {
  const [filter, setFilter] = useState('all');
  const rmaReqs = requests.filter(r => r.rma_number || ['approved', 'received', 'in_progress', 'completed', 'shipped'].includes(r.status));
  const filters = ['all', 'approved', 'received', 'in_progress', 'completed', 'shipped'];
  const filtered = filter === 'all' ? rmaReqs : rmaReqs.filter(r => r.status === filter);
  const updateStatus = async (id, newStatus, tsField) => { const upd = { status: newStatus }; if (tsField) upd[tsField] = new Date().toISOString(); await supabase.from('service_requests').update(upd).eq('id', id); notify(t('saved')); onRefresh(); };
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('rmaTracking')}</h1>
      <div className="flex gap-2 mb-6 overflow-x-auto">{filters.map(f => { const st = STATUS[f]; return (<button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${filter === f ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/60'}`}>{st?.icon} {t(f === 'all' ? 'all' : st?.label || f)} ({f === 'all' ? rmaReqs.length : rmaReqs.filter(r => r.status === f).length})</button>); })}</div>
      <div className="grid gap-4">
        {filtered.map(r => { const st = STATUS[r.status] || STATUS.approved; return (
          <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><span className="font-mono text-cyan-400 font-bold text-lg">{r.rma_number || 'Pending'}</span><span className={`ml-3 px-3 py-1 rounded-lg text-xs ${st.bg} ${st.text}`}>{st.icon} {t(st.label)}</span><p className="text-white/70 mt-1">{r.companies?.name}</p></div>
              <div><p className="text-white/50 text-sm">Équipement</p><p>{r.model_name}</p><p className="font-mono text-sm text-white/50">{r.serial_number}</p></div>
              <div className="flex gap-2">
                {r.status === 'approved' && <button onClick={() => updateStatus(r.id, 'received', 'received_at')} className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm">📥 {t('markReceived')}</button>}
                {r.status === 'received' && <button onClick={() => updateStatus(r.id, 'in_progress', 'started_at')} className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm">🔧 {t('startWork')}</button>}
                {r.status === 'in_progress' && <button onClick={() => updateStatus(r.id, 'completed', 'completed_at')} className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm">✅ {t('markComplete')}</button>}
                {r.status === 'completed' && <button onClick={() => updateStatus(r.id, 'shipped', 'shipped_at')} className="px-4 py-2 bg-slate-500/20 text-slate-400 rounded-xl text-sm">🚚 {t('shipDevice')}</button>}
              </div>
            </div>
          </div>
        ); })}
        {filtered.length === 0 && <div className="text-center py-16 text-white/50"><p className="text-5xl mb-4">📦</p><p>Aucun RMA</p></div>}
      </div>
    </div>
  );
}

function AdminClients({ companies, equipment, t }) {
  const [search, setSearch] = useState('');
  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-8"><h1 className="text-3xl font-bold">{t('clients')}</h1><input type="text" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white w-64" /></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(c => (<div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-6"><h3 className="font-bold text-lg mb-2">{c.name}</h3><p className="text-white/50 text-sm">📧 {c.email || '—'}</p><p className="text-white/50 text-sm">📞 {c.phone || '—'}</p><p className="text-white/50 text-sm">📍 {c.billing_city || '—'}</p><p className="mt-2 text-cyan-400 text-sm">{equipment.filter(e => e.company_id === c.id).length} appareils</p></div>))}</div>
    </div>
  );
}

function AdminEquipment({ equipment, t }) {
  const [search, setSearch] = useState('');
  const filtered = equipment.filter(e => e.serial_number?.toLowerCase().includes(search.toLowerCase()) || e.model_name?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-8"><h1 className="text-3xl font-bold">{t('equipment')}</h1><input type="text" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white w-64" /></div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-white/10"><th className="text-left p-4 text-white/50 text-sm">N° Série</th><th className="text-left p-4 text-white/50 text-sm">Modèle</th><th className="text-left p-4 text-white/50 text-sm">Type</th><th className="text-left p-4 text-white/50 text-sm">Client</th></tr></thead><tbody>{filtered.map(eq => (<tr key={eq.id} className="border-b border-white/5 hover:bg-white/5"><td className="p-4 font-mono text-cyan-400">{eq.serial_number}</td><td className="p-4">{eq.model_name || '—'}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs ${eq.equipment_type === 'biocollector' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{eq.equipment_type === 'biocollector' ? 'Bio' : 'Compteur'}</span></td><td className="p-4">{eq.companies?.name || '—'}</td></tr>))}</tbody></table></div>
    </div>
  );
}

function AdminPricing({ t }) {
  const [tab, setTab] = useState('calibration');
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('priceList')}</h1>
      <div className="flex gap-2 mb-6"><button onClick={() => setTab('calibration')} className={`px-5 py-2 rounded-xl text-sm ${tab === 'calibration' ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/60'}`}>⚙️ Calibration</button><button onClick={() => setTab('services')} className={`px-5 py-2 rounded-xl text-sm ${tab === 'services' ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/60'}`}>🔧 Services</button></div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-white/10"><th className="text-left p-4 text-white/50 text-sm">Référence</th><th className="text-left p-4 text-white/50 text-sm">Description</th><th className="text-right p-4 text-white/50 text-sm">Prix HT</th></tr></thead><tbody>{(tab === 'calibration' ? PRICING.calibration : PRICING.services).map((item, i) => (<tr key={i} className="border-b border-white/5 hover:bg-white/5"><td className="p-4 font-mono text-cyan-400">{item.ref}</td><td className="p-4">{item.name}</td><td className="p-4 text-right font-bold">{item.price.toFixed(2)} €</td></tr>))}</tbody></table></div>
    </div>
  );
}

function CustomerDashboard({ profile, equipment, requests, t, setPage }) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-8"><div><h1 className="text-3xl font-bold">{t('welcome')}, {profile?.full_name}!</h1><p className="text-white/50">{profile?.companies?.name}</p></div><button onClick={() => setPage('new-request')} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">➕ {t('newRequest')}</button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5"><div className="text-3xl mb-3">⚙️</div><div className="text-3xl font-bold">{equipment.length}</div><div className="text-white/50 text-sm">{t('myEquipment')}</div></div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5"><div className="text-3xl mb-3">📋</div><div className="text-3xl font-bold">{requests.filter(r => !['shipped', 'completed'].includes(r.status)).length}</div><div className="text-white/50 text-sm">En cours</div></div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5"><div className="text-3xl mb-3">⏳</div><div className="text-3xl font-bold">{requests.filter(r => r.status === 'submitted').length}</div><div className="text-white/50 text-sm">En attente</div></div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5"><div className="text-3xl mb-3">✅</div><div className="text-3xl font-bold">{requests.filter(r => ['shipped', 'completed'].includes(r.status)).length}</div><div className="text-white/50 text-sm">Terminés</div></div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between"><h2 className="text-xl font-bold">Mes Demandes</h2><button onClick={() => setPage('requests')} className="text-cyan-400 text-sm">Voir tout →</button></div>
        {requests.length === 0 ? <div className="p-12 text-center text-white/50"><p className="text-5xl mb-4">📋</p><p>Aucune demande</p></div> : (
          <table className="w-full"><thead><tr className="border-b border-white/10"><th className="text-left p-4 text-white/50 text-sm">N° Demande</th><th className="text-left p-4 text-white/50 text-sm">RMA</th><th className="text-left p-4 text-white/50 text-sm">Modèle</th><th className="text-left p-4 text-white/50 text-sm">Statut</th></tr></thead>
          <tbody>{requests.slice(0, 5).map(r => { const st = STATUS[r.status] || STATUS.submitted; return (<tr key={r.id} className="border-b border-white/5 hover:bg-white/5"><td className="p-4 font-mono text-cyan-400">{r.request_number || '—'}</td><td className="p-4 font-mono text-emerald-400">{r.rma_number || '—'}</td><td className="p-4">{r.model_name || '—'}</td><td className="p-4"><span className={`px-3 py-1 rounded-lg text-xs ${st.bg} ${st.text}`}>{st.icon} {t(st.label)}</span></td></tr>); })}</tbody></table>
        )}
      </div>
    </div>
  );
}

function CustomerEquipment({ equipment, t, profile, onRefresh, notify }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ serial_number: '', model_name: '', equipment_type: 'particle_counter', customer_location: '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); await supabase.from('equipment').insert({ ...form, company_id: profile.company_id, added_by: profile.id }); setSaving(false); notify(t('saved')); setShow(false); setForm({ serial_number: '', model_name: '', equipment_type: 'particle_counter', customer_location: '' }); onRefresh(); };
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-8"><h1 className="text-3xl font-bold">{t('myEquipment')}</h1><button onClick={() => setShow(true)} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">➕ {t('addEquipment')}</button></div>
      {equipment.length === 0 ? <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center"><p className="text-6xl mb-4">⚙️</p><h2 className="text-xl font-bold mb-2">Aucun équipement</h2><button onClick={() => setShow(true)} className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">{t('addEquipment')}</button></div> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{equipment.map(eq => (<div key={eq.id} className="bg-white/5 border border-white/10 rounded-2xl p-6"><span className={`px-3 py-1 rounded-lg text-xs ${eq.equipment_type === 'biocollector' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{eq.equipment_type === 'biocollector' ? t('biocollector') : t('particleCounter')}</span><h3 className="font-bold text-lg mt-3">{eq.model_name || 'Unknown'}</h3><p className="font-mono text-cyan-400 text-sm">{eq.serial_number}</p>{eq.customer_location && <p className="text-white/50 text-sm mt-2">📍 {eq.customer_location}</p>}</div>))}</div>
      )}
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShow(false)}>
          <div className="w-full max-w-md bg-[#12122a] border border-white/10 rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10"><h2 className="text-xl font-bold">{t('addEquipment')}</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm text-white/50 mb-2">{t('serialNumber')} *</label><input type="text" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" required /></div>
              <div><label className="block text-sm text-white/50 mb-2">{t('model')}</label><input type="text" value={form.model_name} onChange={e => setForm({...form, model_name: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" /></div>
              <div><label className="block text-sm text-white/50 mb-2">{t('type')}</label><select value={form.equipment_type} onChange={e => setForm({...form, equipment_type: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"><option value="particle_counter">{t('particleCounter')}</option><option value="biocollector">{t('biocollector')}</option></select></div>
              <div><label className="block text-sm text-white/50 mb-2">{t('location')}</label><input type="text" value={form.customer_location} onChange={e => setForm({...form, customer_location: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" /></div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setShow(false)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl">{t('cancel')}</button><button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">{saving ? t('saving') : t('save')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerRequests({ requests, t, setPage }) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-8"><h1 className="text-3xl font-bold">{t('myRequests')}</h1><button onClick={() => setPage('new-request')} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">➕ {t('newRequest')}</button></div>
      {requests.length === 0 ? <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center"><p className="text-6xl mb-4">📋</p><h2 className="text-xl font-bold mb-2">Aucune demande</h2><button onClick={() => setPage('new-request')} className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">{t('newRequest')}</button></div> : (
        <div className="space-y-4">{requests.map(r => { const st = STATUS[r.status] || STATUS.submitted; return (<div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><span className="font-mono text-cyan-400 font-bold">{r.request_number || '—'}</span>{r.rma_number && <span className="ml-3 font-mono text-emerald-400 text-sm">RMA: {r.rma_number}</span>}<span className={`ml-3 px-3 py-1 rounded-lg text-xs ${st.bg} ${st.text}`}>{st.icon} {t(st.label)}</span></div><div><p>{r.model_name}</p><p className="font-mono text-sm text-white/50">{r.serial_number}</p></div>{r.quote_total && <div className="text-right"><p className="text-white/50 text-sm">Devis</p><p className="font-bold text-lg text-cyan-400">{r.quote_total?.toFixed(2)} €</p></div>}</div></div>); })}</div>
      )}
    </div>
  );
}

function NewRequestPage({ equipment, addresses, t, profile, onRefresh, notify, setPage }) {
  const [form, setForm] = useState({ equipment_id: '', requested_service: 'calibration', problem_description: '', urgency: 'normal', shipping_address_id: addresses[0]?.id || '' });
  const [submitting, setSubmitting] = useState(false);
  const selEq = equipment.find(e => e.id === form.equipment_id);
  const handleSubmit = async (e) => { e.preventDefault(); if (!form.equipment_id) { notify('Select equipment', 'error'); return; } setSubmitting(true); const { count } = await supabase.from('service_requests').select('*', { count: 'exact', head: true }); const rn = `SR-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`; await supabase.from('service_requests').insert({ request_number: rn, company_id: profile.company_id, submitted_by: profile.id, equipment_id: form.equipment_id, serial_number: selEq?.serial_number, model_name: selEq?.model_name, equipment_type: selEq?.equipment_type, requested_service: form.requested_service, problem_description: form.problem_description, urgency: form.urgency, shipping_address_id: form.shipping_address_id || null, status: 'submitted', submitted_at: new Date().toISOString() }); setSubmitting(false); notify(t('requestSubmitted')); onRefresh(); setPage('requests'); };
  if (equipment.length === 0) return <div className="max-w-2xl mx-auto px-6 py-12"><div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center"><p className="text-6xl mb-4">⚙️</p><h2 className="text-xl font-bold mb-2">Aucun équipement</h2><button onClick={() => setPage('equipment')} className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">{t('addEquipment')}</button></div></div>;
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('newRequest')}</h1>
      <div className="bg-white/5 border border-white/10 rounded-2xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div><label className="block text-sm text-white/50 mb-2">Équipement *</label><select value={form.equipment_id} onChange={e => setForm({...form, equipment_id: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" required><option value="">-- Sélectionner --</option>{equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.model_name} - {eq.serial_number}</option>)}</select></div>
          <div><label className="block text-sm text-white/50 mb-3">{t('serviceType')} *</label><div className="grid grid-cols-2 gap-3">{[{ v: 'calibration', i: '⚙️', l: t('calibration') },{ v: 'repair', i: '🔧', l: t('repair') },{ v: 'calibration_repair', i: '⚙️🔧', l: t('calibrationRepair') },{ v: 'diagnostic', i: '🔬', l: t('diagnostic') }].map(o => (<label key={o.v} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${form.requested_service === o.v ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10'}`}><input type="radio" name="service" value={o.v} checked={form.requested_service === o.v} onChange={e => setForm({...form, requested_service: e.target.value})} className="hidden" /><span>{o.i}</span><span>{o.l}</span></label>))}</div></div>
          <div><label className="block text-sm text-white/50 mb-2">{t('problemDescription')}</label><textarea value={form.problem_description} onChange={e => setForm({...form, problem_description: e.target.value})} rows={4} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none" /></div>
          <div><label className="block text-sm text-white/50 mb-3">{t('urgency')}</label><div className="flex gap-4">{['normal', 'urgent', 'critical'].map(u => (<label key={u} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="urgency" value={u} checked={form.urgency === u} onChange={e => setForm({...form, urgency: e.target.value})} className="accent-cyan-500" /><span className={u === 'critical' ? 'text-red-400' : u === 'urgent' ? 'text-amber-400' : ''}>{t(u)}</span></label>))}</div></div>
          {addresses.length > 0 && <div><label className="block text-sm text-white/50 mb-2">Adresse de retour</label><select value={form.shipping_address_id} onChange={e => setForm({...form, shipping_address_id: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">{addresses.map(a => <option key={a.id} value={a.id}>{a.label} - {a.city}</option>)}</select></div>}
          <div className="flex gap-4 pt-4"><button type="button" onClick={() => setPage('dashboard')} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl">{t('cancel')}</button><button type="submit" disabled={submitting || !form.equipment_id} className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">{submitting ? t('saving') : t('submit')}</button></div>
        </form>
      </div>
    </div>
  );
}

function SettingsPage({ profile, addresses, t, onRefresh, notify }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ label: '', address_line1: '', city: '', postal_code: '', country: 'France', is_default: false });
  const [saving, setSaving] = useState(false);
  const handleSave = async (e) => { e.preventDefault(); setSaving(true); if (form.is_default) await supabase.from('shipping_addresses').update({ is_default: false }).eq('company_id', profile.company_id); await supabase.from('shipping_addresses').insert({ ...form, company_id: profile.company_id }); setSaving(false); setShow(false); notify(t('saved')); onRefresh(); };
  const del = async (id) => { await supabase.from('shipping_addresses').delete().eq('id', id); notify(t('saved')); onRefresh(); };
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-3xl font-bold">{t('settings')}</h1>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6"><h2 className="text-xl font-bold mb-4">Compte</h2><div className="grid md:grid-cols-2 gap-4"><div><p className="text-white/50 text-sm">{t('contact')}</p><p>{profile?.full_name}</p></div><div><p className="text-white/50 text-sm">{t('email')}</p><p>{profile?.email}</p></div><div><p className="text-white/50 text-sm">{t('company')}</p><p>{profile?.companies?.name}</p></div></div></div>
      <div className="bg-white/5 border border-white/10 rounded-2xl">
        <div className="p-6 border-b border-white/10 flex justify-between"><h2 className="text-xl font-bold">Adresses</h2><button onClick={() => setShow(true)} className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm">➕ Ajouter</button></div>
        <div className="p-6 space-y-4">{addresses.length === 0 ? <p className="text-center text-white/50 py-8">Aucune adresse</p> : addresses.map(a => (<div key={a.id} className={`p-4 rounded-xl border ${a.is_default ? 'border-emerald-500/50' : 'border-white/10'}`}><div className="flex justify-between"><div><h3 className="font-semibold">{a.label} {a.is_default && <span className="text-emerald-400 text-xs">Par défaut</span>}</h3><p className="text-white/70">{a.address_line1}</p><p className="text-white/70">{a.postal_code} {a.city}</p></div><button onClick={() => del(a.id)} className="text-red-400 text-sm">Supprimer</button></div></div>))}</div>
      </div>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShow(false)}>
          <div className="w-full max-w-md bg-[#12122a] border border-white/10 rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10"><h2 className="text-xl font-bold">Ajouter une adresse</h2></div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="block text-sm text-white/50 mb-2">Nom *</label><input type="text" value={form.label} onChange={e => setForm({...form, label: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" required /></div>
              <div><label className="block text-sm text-white/50 mb-2">Adresse *</label><input type="text" value={form.address_line1} onChange={e => setForm({...form, address_line1: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" required /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-white/50 mb-2">Ville *</label><input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" required /></div><div><label className="block text-sm text-white/50 mb-2">Code Postal *</label><input type="text" value={form.postal_code} onChange={e => setForm({...form, postal_code: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" required /></div></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_default} onChange={e => setForm({...form, is_default: e.target.checked})} className="accent-cyan-500" /><span>Par défaut</span></label>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setShow(false)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl">{t('cancel')}</button><button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">{saving ? t('saving') : t('save')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
