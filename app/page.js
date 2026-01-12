'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Lighthouse Logo
const Logo = ({ className = "h-10", light = false }) => (
  <svg viewBox="0 0 400 60" className={className}>
    <defs>
      <pattern id="logoLines" patternUnits="userSpaceOnUse" width="3" height="50">
        <line x1="1.5" y1="0" x2="1.5" y2="50" stroke={light ? "#fff" : "#1a1a2e"} strokeWidth="1.5"/>
      </pattern>
    </defs>
    <rect x="0" y="5" width="50" height="50" fill="url(#logoLines)" rx="2"/>
    <text x="60" y="35" fontFamily="Arial Black, sans-serif" fontSize="28" fontWeight="900" fill={light ? "#fff" : "#1a1a2e"} letterSpacing="1">LIGHTHOUSE</text>
    <text x="60" y="52" fontFamily="Arial, sans-serif" fontSize="14" fill={light ? "rgba(255,255,255,0.8)" : "#0ea5e9"} letterSpacing="3">FRANCE</text>
  </svg>
);

const T = {
  fr: {
    login: 'Connexion', logout: 'Déconnexion', register: 'Créer un compte', email: 'Email', password: 'Mot de passe',
    confirmPassword: 'Confirmer', noAccount: "Pas encore de compte?", welcome: 'Bienvenue',
    dashboard: 'Tableau de Bord', openRequests: 'Demandes Ouvertes', rmaTracking: 'Suivi RMA',
    clients: 'Clients', equipment: 'Équipements', priceList: 'Tarifs', settings: 'Paramètres',
    newRequest: 'Nouvelle Demande', myRequests: 'Mes Demandes', myEquipment: 'Mes Équipements',
    submitted: 'Soumise', quoted: 'Devis envoyé', approved: 'Approuvé', received: 'Reçu',
    inProgress: 'En cours', completed: 'Terminé', shipped: 'Expédié', rejected: 'Refusé',
    serialNumber: 'N° de Série', model: 'Modèle', type: 'Type', location: 'Emplacement',
    particleCounter: 'Compteur', biocollector: 'Biocollecteur', addEquipment: 'Ajouter',
    createQuote: 'Créer Devis', sendQuote: 'Envoyer Devis', serviceType: 'Type de Service',
    calibration: 'Calibration', repair: 'Réparation', diagnostic: 'Diagnostic', calibrationRepair: 'Calibration + Réparation',
    problemDescription: 'Description du Problème', urgency: 'Urgence',
    normal: 'Normal', urgent: 'Urgent', critical: 'Critique',
    subtotal: 'Sous-total HT', vat: 'TVA (20%)', total: 'Total TTC',
    parts: 'Pièces', labor: "Main d'œuvre", shipping: 'Transport',
    save: 'Enregistrer', cancel: 'Annuler', submit: 'Soumettre', edit: 'Modifier', delete: 'Supprimer',
    markReceived: 'Marquer Reçu', startWork: 'Démarrer', markComplete: 'Terminer', shipDevice: 'Expédier',
    loading: 'Chargement...', saving: 'Enregistrement...', noData: 'Aucune donnée',
    saved: 'Enregistré!', error: 'Erreur', requestSubmitted: 'Demande soumise!',
    newRequests: 'Nouvelles Demandes', pendingQuotes: 'Devis en Attente', activeRmas: 'RMAs Actifs',
    completedThisMonth: 'Terminés ce Mois', totalClients: 'Clients', totalDevices: 'Appareils',
    company: 'Société', contact: 'Contact', phone: 'Téléphone', address: 'Adresse',
    all: 'Tous', search: 'Rechercher',
  },
  en: {
    login: 'Login', logout: 'Logout', register: 'Create Account', email: 'Email', password: 'Password',
    confirmPassword: 'Confirm', noAccount: "Don't have an account?", welcome: 'Welcome',
    dashboard: 'Dashboard', openRequests: 'Open Requests', rmaTracking: 'RMA Tracking',
    clients: 'Clients', equipment: 'Equipment', priceList: 'Price List', settings: 'Settings',
    newRequest: 'New Request', myRequests: 'My Requests', myEquipment: 'My Equipment',
    submitted: 'Submitted', quoted: 'Quoted', approved: 'Approved', received: 'Received',
    inProgress: 'In Progress', completed: 'Completed', shipped: 'Shipped', rejected: 'Rejected',
    serialNumber: 'Serial Number', model: 'Model', type: 'Type', location: 'Location',
    particleCounter: 'Counter', biocollector: 'Biocollector', addEquipment: 'Add',
    createQuote: 'Create Quote', sendQuote: 'Send Quote', serviceType: 'Service Type',
    calibration: 'Calibration', repair: 'Repair', diagnostic: 'Diagnostic', calibrationRepair: 'Calibration + Repair',
    problemDescription: 'Problem Description', urgency: 'Urgency',
    normal: 'Normal', urgent: 'Urgent', critical: 'Critical',
    subtotal: 'Subtotal', vat: 'VAT (20%)', total: 'Total',
    parts: 'Parts', labor: 'Labor', shipping: 'Shipping',
    save: 'Save', cancel: 'Cancel', submit: 'Submit', edit: 'Edit', delete: 'Delete',
    markReceived: 'Mark Received', startWork: 'Start Work', markComplete: 'Complete', shipDevice: 'Ship',
    loading: 'Loading...', saving: 'Saving...', noData: 'No data',
    saved: 'Saved!', error: 'Error', requestSubmitted: 'Request submitted!',
    newRequests: 'New Requests', pendingQuotes: 'Pending Quotes', activeRmas: 'Active RMAs',
    completedThisMonth: 'Completed This Month', totalClients: 'Clients', totalDevices: 'Devices',
    company: 'Company', contact: 'Contact', phone: 'Phone', address: 'Address',
    all: 'All', search: 'Search',
  }
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
    { ref: 'Cal57', name: 'ScanAir', price: 1400 },
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
    const { data: company } = await supabase.from('companies').insert({
      name: formData.companyName, billing_address: formData.address, billing_city: formData.city,
      billing_postal_code: formData.postalCode, billing_country: 'France', phone: formData.phone, email: formData.email,
    }).select().single();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 border-2 border-cyan-400/50 rounded-full animate-pulse"></div>
            <div className="absolute inset-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full"></div>
          </div>
          <p className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-red-500/20 border-red-500/50 text-red-300'}`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{toast.type === 'success' ? '✓' : '✕'}</span>
            <span className="font-medium">{toast.msg}</span>
          </div>
        </div>
      )}
      
      <Header user={user} profile={profile} isAdmin={isAdmin} lang={lang} setLang={setLang} t={t} page={page} setPage={setPage} onLogout={handleLogout} />
      
      <main className="relative">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        
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

      <footer className="relative z-10 border-t border-white/5 bg-black/20 backdrop-blur-sm py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Logo className="h-8 mx-auto mb-4" light />
          <p className="text-white/40 text-sm">16 Rue Paul Séjourne, 94000 Créteil • France@golighthouse.com • 01 43 77 28 07</p>
        </div>
      </footer>
    </div>
  );
}

function Header({ user, profile, isAdmin, lang, setLang, t, page, setPage, onLogout }) {
  const adminNav = [
    { id: 'dashboard', icon: '📊', label: 'dashboard' },
    { id: 'requests', icon: '📨', label: 'openRequests' },
    { id: 'rma', icon: '🔧', label: 'rmaTracking' },
    { id: 'clients', icon: '👥', label: 'clients' },
    { id: 'equipment', icon: '⚙️', label: 'equipment' },
    { id: 'pricing', icon: '💰', label: 'priceList' },
  ];
  const customerNav = [
    { id: 'dashboard', icon: '📊', label: 'dashboard' },
    { id: 'new-request', icon: '➕', label: 'newRequest' },
    { id: 'requests', icon: '📋', label: 'myRequests' },
    { id: 'equipment', icon: '⚙️', label: 'myEquipment' },
    { id: 'settings', icon: '⚙️', label: 'settings' },
  ];
  const nav = user ? (isAdmin ? adminNav : customerNav) : [];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a1a]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="cursor-pointer" onClick={() => setPage(user ? 'dashboard' : 'home')}>
            <Logo className="h-10" light />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              <button onClick={() => setLang('fr')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${lang === 'fr' ? 'bg-cyan-500 text-white' : 'text-white/50 hover:text-white'}`}>FR</button>
              <button onClick={() => setLang('en')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${lang === 'en' ? 'bg-cyan-500 text-white' : 'text-white/50 hover:text-white'}`}>EN</button>
            </div>
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-cyan-400">{isAdmin ? '⚡ Admin' : profile?.companies?.name}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/25">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <button onClick={onLogout} className="text-white/50 hover:text-white text-sm">{t('logout')}</button>
              </div>
            ) : (
              <button onClick={() => setPage('login')} className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-semibold text-sm shadow-lg shadow-cyan-500/25">{t('login')}</button>
            )}
          </div>
        </div>
        {user && (
          <nav className="flex gap-1 pb-3 overflow-x-auto">
            {nav.map(item => (
              <button key={item.id} onClick={() => setPage(item.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${page === item.id ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                <span>{item.icon}</span><span>{t(item.label)}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

function HomePage({ t, setPage }) {
  return (
    <div className="relative">
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-blue-500/10"></div>
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            Portail de Service Équipement
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">Calibration &</span><br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Réparation</span>
          </h1>
          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">Services professionnels pour vos compteurs de particules et biocollecteurs Lighthouse</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setPage('login')} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg shadow-2xl shadow-cyan-500/25 hover:scale-105 transition-all">{t('login')} →</button>
            <button onClick={() => setPage('register')} className="px-8 py-4 bg-white/5 border border-white/20 rounded-xl font-bold text-lg hover:bg-white/10">{t('register')}</button>
          </div>
        </div>
      </section>
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[{ step: '01', icon: '📝', title: 'Créer un compte', desc: 'Inscrivez-vous et ajoutez vos équipements' },{ step: '02', icon: '📨', title: 'Soumettre', desc: 'Décrivez le service dont vous avez besoin' },{ step: '03', icon: '💰', title: 'Devis', desc: 'Recevez et approuvez votre devis' },{ step: '04', icon: '🚚', title: 'Suivi', desc: 'Suivez votre équipement en temps réel' }].map((s, i) => (
              <div key={i} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
                <div className="text-cyan-500/30 font-mono text-5xl font-black mb-4">{s.step}</div>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function LoginPage({ t, onLogin, setPage }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setError(''); const err = await onLogin(email, password); if (err) setError(err); setLoading(false); };
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-25"></div>
          <div className="relative bg-[#12122a] border border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-white/10 p-8 text-center">
              <Logo className="h-12 mx-auto mb-4" light />
              <h1 className="text-2xl font-bold">{t('login')}</h1>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div><label className="block text-sm font-medium text-white/70 mb-2">{t('email')}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500" required /></div>
              <div><label className="block text-sm font-medium text-white/70 mb-2">{t('password')}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500" required /></div>
              {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50">{loading ? t('loading') : t('login')}</button>
            </form>
            <div className="px-8 pb-8 text-center"><p className="text-white/50">{t('noAccount')} <button onClick={() => setPage('register')} className="text-cyan-400 font-semibold hover:underline">{t('register')}</button></p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ t, onRegister, setPage }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', companyName: '', contactName: '', phone: '', address: '', city: '', postalCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; } setLoading(true); setError(''); const err = await onRegister(form); if (err) setError(err); setLoading(false); };
  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-25"></div>
          <div className="relative bg-[#12122a] border border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-white/10 p-8"><h1 className="text-2xl font-bold">{t('register')}</h1></div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2"><label className="block text-sm text-white/70 mb-2">{t('company')} *</label><input type="text" value={form.companyName} onChange={e => u('companyName', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div>
                <div><label className="block text-sm text-white/70 mb-2">{t('contact')} *</label><input type="text" value={form.contactName} onChange={e => u('contactName', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div>
                <div><label className="block text-sm text-white/70 mb-2">{t('phone')}</label><input type="tel" value={form.phone} onChange={e => u('phone', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" /></div>
                <div className="md:col-span-2"><label className="block text-sm text-white/70 mb-2">{t('address')} *</label><input type="text" value={form.address} onChange={e => u('address', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div>
                <div><label className="block text-sm text-white/70 mb-2">Ville *</label><input type="text" value={form.city} onChange={e => u('city', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div>
                <div><label className="block text-sm text-white/70 mb-2">Code Postal *</label><input type="text" value={form.postalCode} onChange={e => u('postalCode', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div>
                <div className="md:col-span-2"><label className="block text-sm text-white/70 mb-2">{t('email')} *</label><input type="email" value={form.email} onChange={e => u('email', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div>
                <div><label className="block text-sm text-white/70 mb-2">{t('password')} *</label><input type="password" value={form.password} onChange={e => u('password', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required minLength={6} /></div>
                <div><label className="block text-sm text-white/70 mb-2">{t('confirmPassword')} *</label><input type="password" value={form.confirmPassword} onChange={e => u('confirmPassword', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div>
              </div>
              {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
              <div className="flex gap-4"><button type="button" onClick={() => setPage('login')} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl font-medium hover:bg-white/10">{t('cancel')}</button><button type="submit" disabled={loading} className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">{loading ? t('loading') : t('register')}</button></div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
 STATUS.approved; return (
          <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-[200px]"><div className="flex items-center gap-3 mb-2"><span className="font-mono text-cyan-400 font-bold text-lg">{r.rma_number || 'Pending'}</span><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${st.bg} ${st.text}`}>{st.icon} {t(st.label)}</span></div><p className="text-white/70">{r.companies?.name}</p></div>
              <div className="flex-1 min-w-[200px]"><p className="text-white/50 text-sm">Équipement</p><p className="font-medium">{r.model_name}</p><p className="font-mono text-sm text-white/50">{r.serial_number}</p></div>
              <div className="flex-1 min-w-[150px]"><p className="text-white/50 text-sm">Service</p><p className="font-medium capitalize">{r.requested_service}</p></div>
              <div className="flex gap-2 flex-wrap">
                {r.status === 'approved' && <button onClick={() => updateStatus(r.id, 'received', 'received_at')} className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-500/30">📥 {t('markReceived')}</button>}
                {r.status === 'received' && <button onClick={() => updateStatus(r.id, 'in_progress', 'started_at')} className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-medium hover:bg-cyan-500/30">🔧 {t('startWork')}</button>}
                {r.status === 'in_progress' && <button onClick={() => updateStatus(r.id, 'completed', 'completed_at')} className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30">✅ {t('markComplete')}</button>}
                {r.status === 'completed' && <button onClick={() => updateStatus(r.id, 'shipped', 'shipped_at')} className="px-4 py-2 bg-slate-500/20 text-slate-400 rounded-xl text-sm font-medium hover:bg-slate-500/30">🚚 {t('shipDevice')}</button>}
              </div>
            </div>
          </div>
        ); })}
        {filtered.length === 0 && <div className="text-center py-16 text-white/50"><p className="text-5xl mb-4">📦</p><p>Aucun RMA dans cette catégorie</p></div>}
      </div>
    </div>
  );
}

function AdminClients({ companies, equipment, t }) {
  const [search, setSearch] = useState('');
  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-8"><div><h1 className="text-3xl font-bold">{t('clients')}</h1><p className="text-white/50 mt-1">{companies.length} clients</p></div><div className="relative"><input type="text" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 w-64" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">🔍</span></div></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(c => { const deviceCount = equipment.filter(e => e.company_id === c.id).length; const contact = c.company_contacts?.[0]; return (<div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 transition-all"><div className="flex justify-between items-start mb-4"><div><h3 className="font-bold text-lg">{c.name}</h3>{c.client_number && <p className="text-cyan-400 font-mono text-sm">#{c.client_number}</p>}</div><span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium">{deviceCount} appareils</span></div><div className="space-y-2 text-sm text-white/60">{contact && <p>👤 {contact.full_name}</p>}<p>📧 {c.email || '—'}</p><p>📞 {c.phone || '—'}</p><p>📍 {c.billing_postal_code} {c.billing_city}</p></div></div>); })}</div>
    </div>
  );
}

function AdminEquipment({ equipment, t }) {
  const [search, setSearch] = useState('');
  const filtered = equipment.filter(e => e.serial_number?.toLowerCase().includes(search.toLowerCase()) || e.model_name?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-8"><div><h1 className="text-3xl font-bold">{t('equipment')}</h1><p className="text-white/50 mt-1">{equipment.length} appareils</p></div><div className="relative"><input type="text" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 w-64" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">🔍</span></div></div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-white/10"><th className="text-left p-4 text-white/50 text-sm font-medium">N° Série</th><th className="text-left p-4 text-white/50 text-sm font-medium">Modèle</th><th className="text-left p-4 text-white/50 text-sm font-medium">Type</th><th className="text-left p-4 text-white/50 text-sm font-medium">Client</th><th className="text-left p-4 text-white/50 text-sm font-medium">Emplacement</th></tr></thead><tbody>{filtered.map(eq => (<tr key={eq.id} className="border-b border-white/5 hover:bg-white/5"><td className="p-4 font-mono font-semibold text-cyan-400">{eq.serial_number}</td><td className="p-4">{eq.model_name || '—'}</td><td className="p-4"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${eq.equipment_type === 'biocollector' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{eq.equipment_type === 'biocollector' ? 'Bio' : 'Compteur'}</span></td><td className="p-4">{eq.companies?.name || '—'}</td><td className="p-4 text-white/50">{eq.customer_location || '—'}</td></tr>))}</tbody></table></div>
    </div>
  );
}

function AdminPricing({ t }) {
  const [tab, setTab] = useState('calibration');
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8"><h1 className="text-3xl font-bold">{t('priceList')}</h1><p className="text-white/50 mt-1">Tarifs de calibration et services</p></div>
      <div className="flex gap-2 mb-6"><button onClick={() => setTab('calibration')} className={`px-5 py-2.5 rounded-xl text-sm font-medium ${tab === 'calibration' ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/60'}`}>⚙️ Calibration</button><button onClick={() => setTab('services')} className={`px-5 py-2.5 rounded-xl text-sm font-medium ${tab === 'services' ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/60'}`}>🔧 Services</button></div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-white/10"><th className="text-left p-4 text-white/50 text-sm font-medium">Référence</th><th className="text-left p-4 text-white/50 text-sm font-medium">Description</th><th className="text-right p-4 text-white/50 text-sm font-medium">Prix HT</th></tr></thead><tbody>{(tab === 'calibration' ? PRICING.calibration : PRICING.services).map((item, i) => (<tr key={i} className="border-b border-white/5 hover:bg-white/5"><td className="p-4 font-mono text-cyan-400">{item.ref}</td><td className="p-4">{item.name}</td><td className="p-4 text-right font-bold">{item.price.toFixed(2)} €</td></tr>))}</tbody></table></div>
    </div>
  );
}

function CustomerDashboard({ profile, equipment, requests, t, setPage }) {
  const stats = [{ label: t('myEquipment'), value: equipment.length, icon: '⚙️' },{ label: 'Demandes en cours', value: requests.filter(r => !['shipped', 'rejected', 'completed'].includes(r.status)).length, icon: '📋' },{ label: 'En attente de devis', value: requests.filter(r => r.status === 'submitted').length, icon: '⏳' },{ label: 'Terminés', value: requests.filter(r => ['shipped', 'completed'].includes(r.status)).length, icon: '✅' }];
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-8"><div><h1 className="text-3xl font-bold">{t('welcome')}, {profile?.full_name}!</h1><p className="text-white/50 mt-1">{profile?.companies?.name}</p></div><button onClick={() => setPage('new-request')} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold shadow-lg shadow-cyan-500/25">➕ {t('newRequest')}</button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">{stats.map((s, i) => (<div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5"><div className="text-3xl mb-3">{s.icon}</div><div className="text-3xl font-bold mb-1">{s.value}</div><div className="text-white/50 text-sm">{s.label}</div></div>))}</div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-white/10"><h2 className="text-xl font-bold">Mes Demandes Récentes</h2><button onClick={() => setPage('requests')} className="text-cyan-400 text-sm font-medium hover:underline">Voir tout →</button></div>
        {requests.length === 0 ? (<div className="p-12 text-center text-white/50"><p className="text-5xl mb-4">📋</p><p className="mb-4">Aucune demande</p><button onClick={() => setPage('new-request')} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">{t('newRequest')}</button></div>) : (
          <table className="w-full"><thead><tr className="border-b border-white/10"><th className="text-left p-4 text-white/50 text-sm">N° Demande</th><th className="text-left p-4 text-white/50 text-sm">N° RMA</th><th className="text-left p-4 text-white/50 text-sm">Modèle</th><th className="text-left p-4 text-white/50 text-sm">Service</th><th className="text-left p-4 text-white/50 text-sm">Statut</th></tr></thead>
          <tbody>{requests.slice(0, 5).map(r => { const st = STATUS[r.status] || STATUS.submitted; return (<tr key={r.id} className="border-b border-white/5 hover:bg-white/5"><td className="p-4 font-mono text-cyan-400 font-semibold">{r.request_number || '—'}</td><td className="p-4 font-mono text-emerald-400">{r.rma_number || '—'}</td><td className="p-4">{r.model_name || '—'}</td><td className="p-4 capitalize">{r.requested_service}</td><td className="p-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${st.bg} ${st.text}`}>{st.icon} {t(st.label)}</span></td></tr>); })}</tbody></table>
        )}
      </div>
    </div>
  );
}

function CustomerEquipment({ equipment, t, profile, onRefresh, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ serial_number: '', model_name: '', equipment_type: 'particle_counter', customer_location: '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); const { error } = await supabase.from('equipment').insert({ serial_number: form.serial_number, model_name: form.model_name, equipment_type: form.equipment_type, customer_location: form.customer_location, company_id: profile.company_id, added_by: profile.id }); setSaving(false); if (error) { notify(error.message, 'error'); } else { notify(t('saved')); setShowModal(false); setForm({ serial_number: '', model_name: '', equipment_type: 'particle_counter', customer_location: '' }); onRefresh(); } };
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-8"><div><h1 className="text-3xl font-bold">{t('myEquipment')}</h1><p className="text-white/50 mt-1">{equipment.length} appareils</p></div><button onClick={() => setShowModal(true)} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">➕ {t('addEquipment')}</button></div>
      {equipment.length === 0 ? (<div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center"><p className="text-6xl mb-4">⚙️</p><h2 className="text-xl font-bold mb-2">Aucun équipement</h2><p className="text-white/50 mb-6">Ajoutez vos équipements pour soumettre des demandes</p><button onClick={() => setShowModal(true)} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">{t('addEquipment')}</button></div>) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{equipment.map(eq => (<div key={eq.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 transition-all"><div className="flex justify-between items-start mb-4"><span className={`px-3 py-1 rounded-lg text-xs font-medium ${eq.equipment_type === 'biocollector' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{eq.equipment_type === 'biocollector' ? t('biocollector') : t('particleCounter')}</span></div><h3 className="font-bold text-lg mb-1">{eq.model_name || 'Unknown'}</h3><p className="font-mono text-cyan-400 text-sm mb-3">{eq.serial_number}</p>{eq.customer_location && <p className="text-white/50 text-sm">📍 {eq.customer_location}</p>}</div>))}</div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md bg-[#12122a] border border-white/10 rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-white/10 p-6"><h2 className="text-xl font-bold">{t('addEquipment')}</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm text-white/50 mb-2">{t('serialNumber')} *</label><input type="text" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div>
              <div><label className="block text-sm text-white/50 mb-2">{t('model')}</label><input type="text" value={form.model_name} onChange={e => setForm({...form, model_name: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" /></div>
              <div><label className="block text-sm text-white/50 mb-2">{t('type')}</label><select value={form.equipment_type} onChange={e => setForm({...form, equipment_type: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"><option value="particle_counter">{t('particleCounter')}</option><option value="biocollector">{t('biocollector')}</option><option value="other">Autre</option></select></div>
              <div><label className="block text-sm text-white/50 mb-2">{t('location')}</label><input type="text" value={form.customer_location} onChange={e => setForm({...form, customer_location: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" placeholder="Ex: Salle blanche A" /></div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-medium hover:bg-white/10">{t('cancel')}</button><button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">{saving ? t('saving') : t('save')}</button></div>
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
      <div className="flex justify-between items-start mb-8"><div><h1 className="text-3xl font-bold">{t('myRequests')}</h1><p className="text-white/50 mt-1">{requests.length} demandes</p></div><button onClick={() => setPage('new-request')} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">➕ {t('newRequest')}</button></div>
      {requests.length === 0 ? (<div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center"><p className="text-6xl mb-4">📋</p><h2 className="text-xl font-bold mb-2">Aucune demande</h2><p className="text-white/50 mb-6">Soumettez votre première demande</p><button onClick={() => setPage('new-request')} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">{t('newRequest')}</button></div>) : (
        <div className="space-y-4">{requests.map(r => { const st = STATUS[r.status] || STATUS.submitted; return (<div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex-1 min-w-[200px]"><div className="flex items-center gap-3 mb-2"><span className="font-mono text-cyan-400 font-bold">{r.request_number || '—'}</span>{r.rma_number && <span className="font-mono text-emerald-400 text-sm">RMA: {r.rma_number}</span>}<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${st.bg} ${st.text}`}>{st.icon} {t(st.label)}</span></div><p className="text-white/50 text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : ''}</p></div><div className="flex-1 min-w-[200px]"><p className="font-medium">{r.model_name}</p><p className="font-mono text-sm text-white/50">{r.serial_number}</p></div><div className="flex-1 min-w-[150px]"><p className="capitalize">{r.requested_service}</p></div>{r.quote_total && <div className="text-right"><p className="text-white/50 text-sm">Devis</p><p className="font-bold text-lg text-cyan-400">{r.quote_total?.toFixed(2)} €</p></div>}</div></div>); })}</div>
      )}
    </div>
  );
}

function NewRequestPage({ equipment, addresses, t, profile, onRefresh, notify, setPage }) {
  const [form, setForm] = useState({ equipment_id: '', requested_service: 'calibration', problem_description: '', urgency: 'normal', shipping_address_id: addresses[0]?.id || '' });
  const [submitting, setSubmitting] = useState(false);
  const selectedEq = equipment.find(e => e.id === form.equipment_id);
  const handleSubmit = async (e) => { e.preventDefault(); if (!form.equipment_id) { notify('Sélectionnez un équipement', 'error'); return; } setSubmitting(true); const year = new Date().getFullYear(); const { count } = await supabase.from('service_requests').select('*', { count: 'exact', head: true }); const requestNumber = `SR-${year}-${String((count || 0) + 1).padStart(4, '0')}`; const { error } = await supabase.from('service_requests').insert({ request_number: requestNumber, company_id: profile.company_id, submitted_by: profile.id, equipment_id: form.equipment_id, serial_number: selectedEq?.serial_number, model_name: selectedEq?.model_name, equipment_type: selectedEq?.equipment_type, requested_service: form.requested_service, problem_description: form.problem_description, urgency: form.urgency, shipping_address_id: form.shipping_address_id || null, status: 'submitted', submitted_at: new Date().toISOString() }); setSubmitting(false); if (error) { notify(error.message, 'error'); } else { notify(t('requestSubmitted')); onRefresh(); setPage('requests'); } };
  if (equipment.length === 0) { return (<div className="max-w-2xl mx-auto px-6 py-12"><div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center"><p className="text-6xl mb-4">⚙️</p><h2 className="text-xl font-bold mb-2">Aucun équipement</h2><p className="text-white/50 mb-6">Ajoutez d'abord vos équipements</p><button onClick={() => setPage('equipment')} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">{t('addEquipment')}</button></div></div>); }
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8"><h1 className="text-3xl font-bold">{t('newRequest')}</h1><p className="text-white/50 mt-1">Soumettez une demande de service</p></div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div><label className="block text-sm text-white/50 mb-2">Équipement *</label><select value={form.equipment_id} onChange={e => setForm({...form, equipment_id: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required><option value="">-- Sélectionner --</option>{equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.model_name || 'Unknown'} - {eq.serial_number}</option>)}</select></div>
          <div><label className="block text-sm text-white/50 mb-3">{t('serviceType')} *</label><div className="grid grid-cols-2 gap-3">{[{ value: 'calibration', icon: '⚙️', label: t('calibration') },{ value: 'repair', icon: '🔧', label: t('repair') },{ value: 'calibration_repair', icon: '⚙️🔧', label: t('calibrationRepair') },{ value: 'diagnostic', icon: '🔬', label: t('diagnostic') }].map(opt => (<label key={opt.value} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${form.requested_service === opt.value ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 hover:border-white/20'}`}><input type="radio" name="service" value={opt.value} checked={form.requested_service === opt.value} onChange={e => setForm({...form, requested_service: e.target.value})} className="hidden" /><span className="text-xl">{opt.icon}</span><span className="font-medium">{opt.label}</span></label>))}</div></div>
          <div><label className="block text-sm text-white/50 mb-2">{t('problemDescription')}</label><textarea value={form.problem_description} onChange={e => setForm({...form, problem_description: e.target.value})} rows={4} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500 resize-none" placeholder="Décrivez le problème..." /></div>
          <div><label className="block text-sm text-white/50 mb-3">{t('urgency')}</label><div className="flex gap-4">{['normal', 'urgent', 'critical'].map(u => (<label key={u} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="urgency" value={u} checked={form.urgency === u} onChange={e => setForm({...form, urgency: e.target.value})} className="w-4 h-4 accent-cyan-500" /><span className={`font-medium ${u === 'critical' ? 'text-red-400' : u === 'urgent' ? 'text-amber-400' : ''}`}>{t(u)}</span></label>))}</div></div>
          {addresses.length > 0 && (<div><label className="block text-sm text-white/50 mb-2">Adresse de retour</label><select value={form.shipping_address_id} onChange={e => setForm({...form, shipping_address_id: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500">{addresses.map(a => <option key={a.id} value={a.id}>{a.label} - {a.city}</option>)}</select></div>)}
          <div className="flex gap-4 pt-4"><button type="button" onClick={() => setPage('dashboard')} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl font-medium hover:bg-white/10">{t('cancel')}</button><button type="submit" disabled={submitting || !form.equipment_id} className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">{submitting ? t('saving') : t('submit')}</button></div>
        </form>
      </div>
    </div>
  );
}

function SettingsPage({ profile, addresses, t, onRefresh, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ label: '', attention_to: '', address_line1: '', city: '', postal_code: '', country: 'France', is_default: false });
  const [saving, setSaving] = useState(false);
  const handleSave = async (e) => { e.preventDefault(); setSaving(true); if (form.is_default) { await supabase.from('shipping_addresses').update({ is_default: false }).eq('company_id', profile.company_id); } await supabase.from('shipping_addresses').insert({ ...form, company_id: profile.company_id }); setSaving(false); setShowModal(false); setForm({ label: '', attention_to: '', address_line1: '', city: '', postal_code: '', country: 'France', is_default: false }); notify(t('saved')); onRefresh(); };
  const deleteAddr = async (id) => { if (!confirm('Supprimer?')) return; await supabase.from('shipping_addresses').delete().eq('id', id); notify(t('saved')); onRefresh(); };
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-3xl font-bold">{t('settings')}</h1>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10"><h2 className="text-xl font-bold">Informations du compte</h2></div>
        <div className="p-6 grid md:grid-cols-2 gap-6"><div><p className="text-white/50 text-sm mb-1">{t('contact')}</p><p className="font-medium">{profile?.full_name}</p></div><div><p className="text-white/50 text-sm mb-1">{t('email')}</p><p className="font-medium">{profile?.email}</p></div><div><p className="text-white/50 text-sm mb-1">{t('phone')}</p><p className="font-medium">{profile?.phone || '—'}</p></div><div><p className="text-white/50 text-sm mb-1">{t('company')}</p><p className="font-medium">{profile?.companies?.name}</p></div></div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center"><h2 className="text-xl font-bold">Adresses de livraison</h2><button onClick={() => setShowModal(true)} className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium">➕ Ajouter</button></div>
        <div className="p-6 space-y-4">{addresses.length === 0 ? (<p className="text-center text-white/50 py-8">Aucune adresse</p>) : (addresses.map(a => (<div key={a.id} className={`p-4 rounded-xl border ${a.is_default ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10'}`}><div className="flex justify-between items-start"><div><div className="flex items-center gap-2 mb-2"><h3 className="font-semibold">{a.label}</h3>{a.is_default && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">Par défaut</span>}</div>{a.attention_to && <p className="text-white/50 text-sm">À l'attention de: {a.attention_to}</p>}<p className="text-white/70">{a.address_line1}</p><p className="text-white/70">{a.postal_code} {a.city}</p></div><button onClick={() => deleteAddr(a.id)} className="text-red-400 hover:text-red-300 text-sm">Supprimer</button></div></div>)))}</div>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md bg-[#12122a] border border-white/10 rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-white/10 p-6"><h2 className="text-xl font-bold">Ajouter une adresse</h2></div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="block text-sm text-white/50 mb-2">Nom *</label><input type="text" value={form.label} onChange={e => setForm({...form, label: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div>
              <div><label className="block text-sm text-white/50 mb-2">À l'attention de</label><input type="text" value={form.attention_to} onChange={e => setForm({...form, attention_to: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" /></div>
              <div><label className="block text-sm text-white/50 mb-2">Adresse *</label><input type="text" value={form.address_line1} onChange={e => setForm({...form, address_line1: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-white/50 mb-2">Ville *</label><input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div><div><label className="block text-sm text-white/50 mb-2">Code Postal *</label><input type="text" value={form.postal_code} onChange={e => setForm({...form, postal_code: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" required /></div></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_default} onChange={e => setForm({...form, is_default: e.target.checked})} className="w-4 h-4 accent-cyan-500" /><span>Par défaut</span></label>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-medium hover:bg-white/10">{t('cancel')}</button><button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">{saving ? t('saving') : t('save')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
