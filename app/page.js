'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const Logo = ({ className = "h-12" }) => (
  <svg viewBox="0 0 300 60" className={className}>
    <defs><pattern id="lines" patternUnits="userSpaceOnUse" width="4" height="40"><line x1="2" y1="0" x2="2" y2="40" stroke="#1E3A5F" strokeWidth="2"/></pattern></defs>
    <rect x="0" y="10" width="40" height="40" fill="url(#lines)"/>
    <text x="50" y="38" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="#1E3A5F">LIGHTHOUSE</text>
    <text x="50" y="55" fontFamily="Arial, sans-serif" fontSize="16" fill="#3B7AB4">FRANCE</text>
  </svg>
);

const T = {
  fr: {
    login: 'Connexion', logout: 'Déconnexion', register: 'Créer un compte', email: 'Email', password: 'Mot de passe',
    confirmPassword: 'Confirmer', noAccount: "Pas encore de compte?",
    home: 'Accueil', dashboard: 'Tableau de Bord', settings: 'Paramètres',
    myEquipment: 'Mes Équipements', myRequests: 'Mes Demandes', newRequest: 'Nouvelle Demande',
    requests: 'Demandes', clients: 'Clients', equipment: 'Équipements',
    addEquipment: 'Ajouter un Équipement', serialNumber: 'N° de Série', model: 'Modèle', type: 'Type', location: 'Emplacement',
    particleCounter: 'Compteur de particules', biocollector: 'Biocollecteur', other: 'Autre',
    submitRequest: 'Soumettre une Demande', selectEquipment: 'Sélectionner un Équipement',
    serviceType: 'Type de Service', problemDescription: 'Description du Problème',
    calibration: 'Calibration', repair: 'Réparation', diagnostic: 'Diagnostic', calibrationRepair: 'Calibration + Réparation',
    urgency: 'Urgence', normal: 'Normal', urgent: 'Urgent', critical: 'Critique',
    createQuote: 'Créer un Devis', sendQuote: 'Envoyer le Devis',
    totalHT: 'Total HT', tva: 'TVA (20%)', totalTTC: 'Total TTC',
    parts: 'Pièces', labor: "Main d'œuvre", shipping: 'Transport', hours: 'Heures', rate: 'Taux/heure',
    pending: 'En attente', submitted: 'Soumise', quoted: 'Devis envoyé', approved: 'Approuvée',
    rejected: 'Refusée', received: 'Reçu', inProgress: 'En cours', completed: 'Terminé', shipped: 'Expédié',
    accountSettings: 'Paramètres du Compte', shippingAddresses: 'Adresses de Livraison',
    accountInfo: 'Informations du Compte', addAddress: 'Ajouter une Adresse',
    setDefault: 'Définir par défaut', defaultAddress: 'Adresse par défaut',
    locationName: 'Nom du lieu', attentionTo: "À l'attention de", streetAddress: 'Adresse',
    city: 'Ville', postalCode: 'Code Postal', country: 'Pays', phone: 'Téléphone',
    changePassword: 'Changer le mot de passe', currentPassword: 'Mot de passe actuel', newPassword: 'Nouveau mot de passe',
    company: 'Société', contact: 'Contact', address: 'Adresse',
    save: 'Enregistrer', cancel: 'Annuler', submit: 'Soumettre', edit: 'Modifier', delete: 'Supprimer',
    markReceived: 'Marquer reçu', startWork: 'Démarrer', markComplete: 'Terminer', markShipped: 'Expédier',
    loading: 'Chargement...', saving: 'Enregistrement...', noData: 'Aucune donnée',
    noEquipment: 'Aucun équipement enregistré', noRequests: 'Aucune demande',
    addEquipmentFirst: "Ajoutez d'abord vos équipements pour soumettre une demande.",
    saved: 'Enregistré!', error: 'Erreur', requestSubmitted: 'Demande soumise!',
    welcomeBack: 'Bienvenue', activeRequests: 'Demandes actives', awaitingQuote: 'En attente de devis',
    newRequests: 'Nouvelles demandes', pendingQuotes: 'Devis en attente', activeRMAs: 'RMAs en cours',
    recentRequests: 'Demandes récentes', viewAll: 'Voir tout',
    heroTitle: 'Portail de Service Équipement', heroSubtitle: 'Services de calibration et réparation pour vos instruments',
    howItWorks: 'Comment ça marche', ourServices: 'Nos Services',
    step1Title: 'Créer un compte', step1Desc: 'Inscrivez-vous et ajoutez vos équipements',
    step2Title: 'Soumettre une demande', step2Desc: 'Décrivez le service dont vous avez besoin',
    step3Title: 'Recevoir un devis', step3Desc: 'Nous vous envoyons un devis détaillé',
    step4Title: 'Envoyer & Suivre', step4Desc: "Envoyez l'équipement et suivez le statut",
    calibrationDesc: 'Calibration annuelle selon ISO 21501-4', repairDesc: 'Diagnostic et réparation',
    diagnosticDesc: "Évaluation complète de l'équipement", fromPrice: 'À partir de', onQuote: 'Sur devis',
    all: 'Tous', in_progress: 'En cours',
  },
  en: {
    login: 'Login', logout: 'Logout', register: 'Create Account', email: 'Email', password: 'Password',
    confirmPassword: 'Confirm', noAccount: "Don't have an account?",
    home: 'Home', dashboard: 'Dashboard', settings: 'Settings',
    myEquipment: 'My Equipment', myRequests: 'My Requests', newRequest: 'New Request',
    requests: 'Requests', clients: 'Clients', equipment: 'Equipment',
    addEquipment: 'Add Equipment', serialNumber: 'Serial Number', model: 'Model', type: 'Type', location: 'Location',
    particleCounter: 'Particle Counter', biocollector: 'Biocollector', other: 'Other',
    submitRequest: 'Submit Request', selectEquipment: 'Select Equipment',
    serviceType: 'Service Type', problemDescription: 'Problem Description',
    calibration: 'Calibration', repair: 'Repair', diagnostic: 'Diagnostic', calibrationRepair: 'Calibration + Repair',
    urgency: 'Urgency', normal: 'Normal', urgent: 'Urgent', critical: 'Critical',
    createQuote: 'Create Quote', sendQuote: 'Send Quote',
    totalHT: 'Subtotal', tva: 'VAT (20%)', totalTTC: 'Total',
    parts: 'Parts', labor: 'Labor', shipping: 'Shipping', hours: 'Hours', rate: 'Rate/hour',
    pending: 'Pending', submitted: 'Submitted', quoted: 'Quote Sent', approved: 'Approved',
    rejected: 'Rejected', received: 'Received', inProgress: 'In Progress', completed: 'Completed', shipped: 'Shipped',
    accountSettings: 'Account Settings', shippingAddresses: 'Shipping Addresses',
    accountInfo: 'Account Information', addAddress: 'Add Address',
    setDefault: 'Set as Default', defaultAddress: 'Default',
    locationName: 'Location Name', attentionTo: 'Attention', streetAddress: 'Address',
    city: 'City', postalCode: 'Postal Code', country: 'Country', phone: 'Phone',
    changePassword: 'Change Password', currentPassword: 'Current Password', newPassword: 'New Password',
    company: 'Company', contact: 'Contact', address: 'Address',
    save: 'Save', cancel: 'Cancel', submit: 'Submit', edit: 'Edit', delete: 'Delete',
    markReceived: 'Mark Received', startWork: 'Start Work', markComplete: 'Complete', markShipped: 'Ship',
    loading: 'Loading...', saving: 'Saving...', noData: 'No data',
    noEquipment: 'No equipment registered', noRequests: 'No requests',
    addEquipmentFirst: 'Add your equipment first to submit a request.',
    saved: 'Saved!', error: 'Error', requestSubmitted: 'Request submitted!',
    welcomeBack: 'Welcome back', activeRequests: 'Active Requests', awaitingQuote: 'Awaiting Quote',
    newRequests: 'New Requests', pendingQuotes: 'Pending Quotes', activeRMAs: 'Active RMAs',
    recentRequests: 'Recent Requests', viewAll: 'View All',
    heroTitle: 'Equipment Service Portal', heroSubtitle: 'Calibration and repair services for your instruments',
    howItWorks: 'How It Works', ourServices: 'Our Services',
    step1Title: 'Create Account', step1Desc: 'Sign up and add your equipment',
    step2Title: 'Submit Request', step2Desc: 'Describe the service you need',
    step3Title: 'Get Quote', step3Desc: 'We send you a detailed quote',
    step4Title: 'Ship & Track', step4Desc: 'Ship equipment and track status',
    calibrationDesc: 'Annual calibration per ISO 21501-4', repairDesc: 'Diagnosis and repair',
    diagnosticDesc: 'Complete equipment assessment', fromPrice: 'From', onQuote: 'Quote based',
    all: 'All', in_progress: 'In Progress',
  }
};

const STATUS_CONFIG = {
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📨' },
  quoted: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '💰' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: '❌' },
  received: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '📥' },
  in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '🔧' },
  completed: { bg: 'bg-teal-100', text: 'text-teal-700', icon: '✅' },
  shipped: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🚚' },
  pending: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '⏳' },
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
  const notify = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const isStaff = profile?.role === 'admin' || profile?.role === 'technician';

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
          supabase.from('service_requests').select('*, companies(name)').order('created_at', { ascending: false }),
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
      await supabase.from('shipping_addresses').insert({ company_id: company.id, label: 'Main Address', address_line1: formData.address, city: formData.city, postal_code: formData.postalCode, country: 'France', is_default: true });
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
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lh-dark to-lh-blue"><div className="text-white text-xl">{t('loading')}</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {toast && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{toast.msg}</div>}
      <Header user={user} profile={profile} isStaff={isStaff} lang={lang} setLang={setLang} t={t} page={page} setPage={setPage} onLogout={handleLogout} />
      <main className="flex-1">
        {!user ? (
          <>{page === 'home' && <HomePage t={t} setPage={setPage} />}{page === 'login' && <LoginPage t={t} onLogin={handleLogin} setPage={setPage} />}{page === 'register' && <RegisterPage t={t} lang={lang} onRegister={handleRegister} setPage={setPage} />}</>
        ) : isStaff ? (
          <>{page === 'dashboard' && <AdminDashboard requests={requests} companies={companies} equipment={equipment} t={t} lang={lang} setPage={setPage} />}{page === 'requests' && <AdminRequests requests={requests} t={t} lang={lang} onRefresh={refreshData} notify={notify} />}{page === 'clients' && <AdminClients companies={companies} equipment={equipment} t={t} lang={lang} />}{page === 'equipment' && <AdminEquipment equipment={equipment} t={t} lang={lang} />}</>
        ) : (
          <>{page === 'dashboard' && <CustomerDashboard profile={profile} equipment={equipment} requests={requests} t={t} setPage={setPage} />}{page === 'equipment' && <CustomerEquipment equipment={equipment} t={t} lang={lang} profile={profile} onRefresh={refreshData} notify={notify} />}{page === 'requests' && <CustomerRequests requests={requests} t={t} setPage={setPage} />}{page === 'new-request' && <NewRequestPage equipment={equipment} addresses={addresses} t={t} lang={lang} profile={profile} onRefresh={refreshData} notify={notify} setPage={setPage} />}{page === 'settings' && <SettingsPage profile={profile} addresses={addresses} t={t} lang={lang} onRefresh={refreshData} notify={notify} />}</>
        )}
      </main>
      <footer className="bg-lh-dark text-white py-6"><div className="max-w-6xl mx-auto px-4 text-center"><p className="text-sm opacity-80">16 Rue Paul Séjourne, 94000 Créteil | France@golighthouse.com | 01 43 77 28 07</p></div></footer>
    </div>
  );
}

function Header({ user, profile, isStaff, lang, setLang, t, page, setPage, onLogout }) {
  const customerNav = [{ id: 'dashboard', icon: '📊', label: 'dashboard' },{ id: 'new-request', icon: '➕', label: 'newRequest' },{ id: 'requests', icon: '📋', label: 'myRequests' },{ id: 'equipment', icon: '🔧', label: 'myEquipment' },{ id: 'settings', icon: '⚙️', label: 'settings' }];
  const adminNav = [{ id: 'dashboard', icon: '📊', label: 'dashboard' },{ id: 'requests', icon: '📨', label: 'requests' },{ id: 'clients', icon: '👥', label: 'clients' },{ id: 'equipment', icon: '🔧', label: 'equipment' }];
  const nav = user ? (isStaff ? adminNav : customerNav) : [];
  return (
    <header className="bg-lh-dark text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <div className="cursor-pointer" onClick={() => setPage(user ? 'dashboard' : 'home')}><Logo className="h-10" /></div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white/10 rounded overflow-hidden">
              <button onClick={() => setLang('fr')} className={`px-3 py-1 text-sm ${lang === 'fr' ? 'bg-white text-lh-dark' : ''}`}>FR</button>
              <button onClick={() => setLang('en')} className={`px-3 py-1 text-sm ${lang === 'en' ? 'bg-white text-lh-dark' : ''}`}>EN</button>
            </div>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right"><div className="text-sm">{profile?.full_name}</div><div className="text-xs text-lh-yellow">{isStaff ? 'Admin' : profile?.companies?.name}</div></div>
                <div className="w-9 h-9 rounded-full bg-lh-yellow text-lh-dark flex items-center justify-center font-bold">{profile?.full_name?.charAt(0) || 'U'}</div>
                <button onClick={onLogout} className="text-sm opacity-70 hover:opacity-100">{t('logout')}</button>
              </div>
            ) : (<button onClick={() => setPage('login')} className="btn btn-sm bg-lh-yellow text-lh-dark">{t('login')}</button>)}
          </div>
        </div>
        {user && <nav className="flex gap-1 pb-2 overflow-x-auto">{nav.map(item => (<button key={item.id} onClick={() => setPage(item.id)} className={`nav-item flex items-center gap-2 ${page === item.id ? 'nav-active' : 'nav-inactive'}`}><span>{item.icon}</span><span className="hidden sm:inline">{t(item.label)}</span></button>))}</nav>}
      </div>
    </header>
  );
}

function HomePage({ t, setPage }) {
  return (
    <div>
      <section className="bg-gradient-to-br from-lh-dark via-lh-blue to-lh-dark text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">{t('heroTitle')}</h1>
          <p className="text-xl opacity-90 mb-8">{t('heroSubtitle')}</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => setPage('login')} className="btn btn-lg bg-white text-lh-dark">{t('login')}</button>
            <button onClick={() => setPage('register')} className="btn btn-lg border-2 border-white">{t('register')}</button>
          </div>
        </div>
      </section>
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-lh-dark mb-12">{t('howItWorks')}</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[{ icon: '📝', n: 1, title: t('step1Title'), desc: t('step1Desc') },{ icon: '📨', n: 2, title: t('step2Title'), desc: t('step2Desc') },{ icon: '💰', n: 3, title: t('step3Title'), desc: t('step3Desc') },{ icon: '🚚', n: 4, title: t('step4Title'), desc: t('step4Desc') }].map(s => (
              <div key={s.n} className="text-center"><div className="text-4xl mb-3">{s.icon}</div><div className="text-5xl font-bold text-lh-blue/10 -mt-10 mb-3">{s.n}</div><h3 className="font-semibold text-lh-dark mb-2">{s.title}</h3><p className="text-gray-600 text-sm">{s.desc}</p></div>
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md overflow-hidden">
        <div className="bg-lh-dark p-6 text-center"><Logo className="h-12 mx-auto" /></div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">{t('email')}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required /></div>
            <div><label className="label">{t('password')}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn btn-primary w-full">{loading ? t('loading') : t('login')}</button>
          </form>
          <p className="text-center mt-6 text-gray-500">{t('noAccount')} <button onClick={() => setPage('register')} className="text-lh-blue font-semibold">{t('register')}</button></p>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ t, lang, onRegister, setPage }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', companyName: '', contactName: '', phone: '', address: '', city: '', postalCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; } setLoading(true); setError(''); const err = await onRegister(form); if (err) setError(err); setLoading(false); };
  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="py-12 px-4">
      <div className="card max-w-2xl mx-auto overflow-hidden">
        <div className="bg-lh-dark text-white p-6"><h1 className="text-xl font-bold">{t('register')}</h1></div>
        <form onSubmit={handleSubmit} className="card-body space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="label">{t('company')} *</label><input type="text" value={form.companyName} onChange={e => u('companyName', e.target.value)} className="input" required /></div>
            <div><label className="label">{t('contact')} *</label><input type="text" value={form.contactName} onChange={e => u('contactName', e.target.value)} className="input" required /></div>
            <div><label className="label">{t('phone')}</label><input type="tel" value={form.phone} onChange={e => u('phone', e.target.value)} className="input" /></div>
            <div className="md:col-span-2"><label className="label">{t('address')} *</label><input type="text" value={form.address} onChange={e => u('address', e.target.value)} className="input" required /></div>
            <div><label className="label">{t('city')} *</label><input type="text" value={form.city} onChange={e => u('city', e.target.value)} className="input" required /></div>
            <div><label className="label">{t('postalCode')} *</label><input type="text" value={form.postalCode} onChange={e => u('postalCode', e.target.value)} className="input" required /></div>
            <div className="md:col-span-2"><label className="label">{t('email')} *</label><input type="email" value={form.email} onChange={e => u('email', e.target.value)} className="input" required /></div>
            <div><label className="label">{t('password')} *</label><input type="password" value={form.password} onChange={e => u('password', e.target.value)} className="input" required minLength={6} /></div>
            <div><label className="label">{t('confirmPassword')} *</label><input type="password" value={form.confirmPassword} onChange={e => u('confirmPassword', e.target.value)} className="input" required /></div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3"><button type="button" onClick={() => setPage('login')} className="btn btn-secondary flex-1">{t('cancel')}</button><button type="submit" disabled={loading} className="btn btn-primary flex-1">{loading ? t('loading') : t('register')}</button></div>
        </form>
      </div>
    </div>
  );
}

function CustomerDashboard({ profile, equipment, requests, t, setPage }) {
  const stats = [{ label: t('myEquipment'), value: equipment.length, icon: '🔧', color: 'border-blue-500' },{ label: t('activeRequests'), value: requests.filter(r => !['shipped', 'rejected'].includes(r.status)).length, icon: '📋', color: 'border-yellow-500' },{ label: t('awaitingQuote'), value: requests.filter(r => r.status === 'submitted').length, icon: '⏳', color: 'border-purple-500' },{ label: t('completed'), value: requests.filter(r => r.status === 'shipped').length, icon: '✅', color: 'border-green-500' }];
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">{t('welcomeBack')}, {profile?.full_name}!</h1><p className="text-gray-500">{profile?.companies?.name}</p></div><button onClick={() => setPage('new-request')} className="btn btn-primary">➕ {t('newRequest')}</button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{stats.map((s, i) => (<div key={i} className={`stat-card ${s.color}`}><div className="flex justify-between"><div><div className="text-3xl font-bold">{s.value}</div><div className="text-sm text-gray-500">{s.label}</div></div><div className="text-3xl">{s.icon}</div></div></div>))}</div>
      <div className="card">
        <div className="card-header flex justify-between items-center"><h2 className="card-title">{t('recentRequests')}</h2><button onClick={() => setPage('requests')} className="text-lh-blue text-sm">{t('viewAll')} →</button></div>
        {requests.length === 0 ? (<div className="card-body text-center py-12"><div className="text-5xl mb-3">📋</div><p className="text-gray-500 mb-4">{t('noRequests')}</p><button onClick={() => setPage('new-request')} className="btn btn-primary">{t('newRequest')}</button></div>) : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">#</th><th className="th">{t('model')}</th><th className="th">{t('serviceType')}</th><th className="th">Status</th><th className="th">Date</th></tr></thead><tbody className="divide-y">{requests.slice(0, 5).map(r => { const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending; return (<tr key={r.id} className="hover:bg-gray-50"><td className="td font-mono text-lh-blue font-semibold">{r.request_number || '-'}</td><td className="td">{r.model_name || '-'}</td><td className="td capitalize">{r.requested_service}</td><td className="td"><span className={`badge ${st.bg} ${st.text}`}>{st.icon} {r.status}</span></td><td className="td text-gray-500 text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td></tr>); })}</tbody></table></div>
        )}
      </div>
    </div>
  );
}

function CustomerEquipment({ equipment, t, lang, profile, onRefresh, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ serial_number: '', model_name: '', equipment_type: 'particle_counter', customer_location: '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from('equipment').insert({ serial_number: form.serial_number, model_name: form.model_name, equipment_type: form.equipment_type, customer_location: form.customer_location, company_id: profile.company_id, added_by: profile.id });
    setSaving(false);
    if (error) { notify(error.message, 'error'); } else { notify(t('saved')); setShowModal(false); setForm({ serial_number: '', model_name: '', equipment_type: 'particle_counter', customer_location: '' }); onRefresh(); }
  };
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center"><h1 className="section-title">{t('myEquipment')}</h1><button onClick={() => setShowModal(true)} className="btn btn-primary">➕ {t('addEquipment')}</button></div>
      {equipment.length === 0 ? (<div className="card card-body text-center py-16"><div className="text-6xl mb-4">🔧</div><h2 className="text-xl font-semibold mb-2">{t('noEquipment')}</h2><p className="text-gray-500 mb-6">{t('addEquipmentFirst')}</p><button onClick={() => setShowModal(true)} className="btn btn-primary">{t('addEquipment')}</button></div>) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{equipment.map(eq => (<div key={eq.id} className="card card-body hover:shadow-md"><div className="flex justify-between mb-3"><div className="text-3xl">🔬</div><span className={`badge ${eq.equipment_type === 'biocollector' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{eq.equipment_type === 'biocollector' ? t('biocollector') : t('particleCounter')}</span></div><h3 className="font-bold text-lg text-lh-dark">{eq.model_name || 'Unknown'}</h3><p className="font-mono text-sm text-gray-500">{eq.serial_number}</p>{eq.customer_location && <p className="text-sm text-gray-400 mt-2">📍 {eq.customer_location}</p>}</div>))}</div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="bg-lh-dark text-white p-4"><h2 className="font-semibold">{t('addEquipment')}</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">{t('serialNumber')} *</label><input type="text" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} className="input" required /></div>
              <div><label className="label">{t('model')}</label><input type="text" value={form.model_name} onChange={e => setForm({...form, model_name: e.target.value})} className="input" /></div>
              <div><label className="label">{t('type')}</label><select value={form.equipment_type} onChange={e => setForm({...form, equipment_type: e.target.value})} className="input"><option value="particle_counter">{t('particleCounter')}</option><option value="biocollector">{t('biocollector')}</option><option value="other">{t('other')}</option></select></div>
              <div><label className="label">{t('location')}</label><input type="text" value={form.customer_location} onChange={e => setForm({...form, customer_location: e.target.value})} className="input" /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">{t('cancel')}</button><button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? t('saving') : t('save')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerRequests({ requests, t, setPage }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center"><h1 className="section-title">{t('myRequests')}</h1><button onClick={() => setPage('new-request')} className="btn btn-primary">➕ {t('newRequest')}</button></div>
      {requests.length === 0 ? (<div className="card card-body text-center py-16"><div className="text-6xl mb-4">📋</div><h2 className="text-xl font-semibold mb-2">{t('noRequests')}</h2><button onClick={() => setPage('new-request')} className="btn btn-primary mt-4">{t('newRequest')}</button></div>) : (
        <div className="card overflow-hidden"><table className="w-full"><thead><tr><th className="th">#</th><th className="th">{t('serialNumber')}</th><th className="th">{t('model')}</th><th className="th">{t('serviceType')}</th><th className="th">Status</th><th className="th">Date</th></tr></thead><tbody className="divide-y">{requests.map(r => { const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending; return (<tr key={r.id} className="hover:bg-gray-50"><td className="td font-mono text-lh-blue font-semibold">{r.request_number || '-'}</td><td className="td font-mono text-sm">{r.serial_number}</td><td className="td">{r.model_name || '-'}</td><td className="td capitalize">{r.requested_service}</td><td className="td"><span className={`badge ${st.bg} ${st.text}`}>{st.icon} {r.status}</span></td><td className="td text-gray-500 text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td></tr>); })}</tbody></table></div>
      )}
    </div>
  );
}

function NewRequestPage({ equipment, addresses, t, lang, profile, onRefresh, notify, setPage }) {
  const [form, setForm] = useState({ equipment_id: '', requested_service: 'calibration', problem_description: '', urgency: 'normal', shipping_address_id: addresses[0]?.id || '' });
  const [submitting, setSubmitting] = useState(false);
  const selectedEq = equipment.find(e => e.id === form.equipment_id);
  const handleSubmit = async (e) => {
    e.preventDefault(); if (!form.equipment_id) { notify(t('selectEquipment'), 'error'); return; }
    setSubmitting(true);
    const year = new Date().getFullYear();
    const { count } = await supabase.from('service_requests').select('*', { count: 'exact', head: true });
    const requestNumber = `SR-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
    const { error } = await supabase.from('service_requests').insert({ request_number: requestNumber, company_id: profile.company_id, submitted_by: profile.id, equipment_id: form.equipment_id, serial_number: selectedEq?.serial_number, model_name: selectedEq?.model_name, equipment_type: selectedEq?.equipment_type, requested_service: form.requested_service, problem_description: form.problem_description, urgency: form.urgency, shipping_address_id: form.shipping_address_id || null, status: 'submitted', submitted_at: new Date().toISOString() });
    setSubmitting(false);
    if (error) { notify(error.message, 'error'); } else { notify(t('requestSubmitted')); onRefresh(); setPage('requests'); }
  };
  if (equipment.length === 0) { return (<div className="max-w-2xl mx-auto px-4 py-12"><div className="card card-body text-center py-16"><div className="text-6xl mb-4">🔧</div><h2 className="text-xl font-semibold mb-2">{t('noEquipment')}</h2><p className="text-gray-500 mb-6">{t('addEquipmentFirst')}</p><button onClick={() => setPage('equipment')} className="btn btn-primary">{t('addEquipment')}</button></div></div>); }
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="section-title">{t('submitRequest')}</h1>
      <form onSubmit={handleSubmit} className="card card-body space-y-6">
        <div><label className="label">{t('selectEquipment')} *</label><select value={form.equipment_id} onChange={e => setForm({...form, equipment_id: e.target.value})} className="input" required><option value="">-- Select --</option>{equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.model_name || 'Unknown'} - {eq.serial_number}</option>)}</select></div>
        <div><label className="label">{t('serviceType')} *</label><div className="grid grid-cols-2 gap-3">{[{ value: 'calibration', icon: '⚙️', label: t('calibration') },{ value: 'repair', icon: '🔧', label: t('repair') },{ value: 'calibration_repair', icon: '⚙️🔧', label: t('calibrationRepair') },{ value: 'diagnostic', icon: '🔬', label: t('diagnostic') }].map(opt => (<label key={opt.value} className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer ${form.requested_service === opt.value ? 'border-lh-blue bg-lh-light' : 'border-gray-200'}`}><input type="radio" name="service" value={opt.value} checked={form.requested_service === opt.value} onChange={e => setForm({...form, requested_service: e.target.value})} className="hidden" /><span className="text-xl">{opt.icon}</span><span className="font-medium">{opt.label}</span></label>))}</div></div>
        <div><label className="label">{t('problemDescription')}</label><textarea value={form.problem_description} onChange={e => setForm({...form, problem_description: e.target.value})} className="input min-h-[100px]" /></div>
        <div><label className="label">{t('urgency')}</label><div className="flex gap-6">{['normal', 'urgent', 'critical'].map(u => (<label key={u} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="urgency" value={u} checked={form.urgency === u} onChange={e => setForm({...form, urgency: e.target.value})} className="w-4 h-4" /><span className={`font-medium ${u === 'critical' ? 'text-red-600' : u === 'urgent' ? 'text-orange-600' : ''}`}>{t(u)}</span></label>))}</div></div>
        {addresses.length > 0 && (<div><label className="label">{t('shippingAddresses')}</label><select value={form.shipping_address_id} onChange={e => setForm({...form, shipping_address_id: e.target.value})} className="input">{addresses.map(a => <option key={a.id} value={a.id}>{a.label} - {a.address_line1}, {a.city}</option>)}</select></div>)}
        <div className="flex gap-3"><button type="button" onClick={() => setPage('dashboard')} className="btn btn-secondary flex-1">{t('cancel')}</button><button type="submit" disabled={submitting || !form.equipment_id} className="btn btn-primary flex-1">{submitting ? t('saving') : t('submit')}</button></div>
      </form>
    </div>
  );
}

function SettingsPage({ profile, addresses, t, lang, onRefresh, notify }) {
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({ label: '', attention_to: '', address_line1: '', city: '', postal_code: '', country: 'France', is_default: false });
  const [saving, setSaving] = useState(false);
  const handleSaveAddress = async (e) => {
    e.preventDefault(); setSaving(true);
    if (addressForm.is_default) { await supabase.from('shipping_addresses').update({ is_default: false }).eq('company_id', profile.company_id); }
    if (editingAddress) { await supabase.from('shipping_addresses').update(addressForm).eq('id', editingAddress.id); }
    else { await supabase.from('shipping_addresses').insert({ ...addressForm, company_id: profile.company_id }); }
    setSaving(false); setShowAddressModal(false); setEditingAddress(null); setAddressForm({ label: '', attention_to: '', address_line1: '', city: '', postal_code: '', country: 'France', is_default: false }); notify(t('saved')); onRefresh();
  };
  const deleteAddress = async (id) => { if (!confirm('Delete?')) return; await supabase.from('shipping_addresses').delete().eq('id', id); notify(t('saved')); onRefresh(); };
  const setDefault = async (id) => { await supabase.from('shipping_addresses').update({ is_default: false }).eq('company_id', profile.company_id); await supabase.from('shipping_addresses').update({ is_default: true }).eq('id', id); notify(t('saved')); onRefresh(); };
  const openEdit = (addr) => { setEditingAddress(addr); setAddressForm({ label: addr.label, attention_to: addr.attention_to || '', address_line1: addr.address_line1, city: addr.city, postal_code: addr.postal_code, country: addr.country || 'France', is_default: addr.is_default }); setShowAddressModal(true); };
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="section-title">{t('accountSettings')}</h1>
      <div className="card">
        <div className="card-header flex justify-between items-center"><h2 className="card-title">{t('shippingAddresses')}</h2><button onClick={() => { setEditingAddress(null); setAddressForm({ label: '', attention_to: '', address_line1: '', city: '', postal_code: '', country: 'France', is_default: false }); setShowAddressModal(true); }} className="btn btn-primary btn-sm">➕ {t('addAddress')}</button></div>
        <div className="card-body space-y-4">{addresses.length === 0 ? (<p className="text-gray-500 text-center py-8">{t('noData')}</p>) : (addresses.map(addr => (<div key={addr.id} className={`address-card ${addr.is_default ? 'border-green-500' : ''}`}><div className="flex flex-col sm:flex-row justify-between gap-4"><div className="flex-1"><div className="flex items-center gap-2 mb-2"><h3 className="font-semibold text-lh-dark">{addr.label}</h3>{addr.is_default && <span className="badge bg-green-100 text-green-700">{t('defaultAddress')}</span>}</div>{addr.attention_to && <p className="text-gray-500 text-sm">{t('attentionTo')}: {addr.attention_to}</p>}<p>{addr.address_line1}</p><p>{addr.postal_code} {addr.city}, {addr.country}</p></div><div className="flex gap-2 flex-wrap">{!addr.is_default && <button onClick={() => setDefault(addr.id)} className="btn btn-outline btn-sm">{t('setDefault')}</button>}<button onClick={() => openEdit(addr)} className="btn btn-secondary btn-sm">{t('edit')}</button><button onClick={() => deleteAddress(addr.id)} className="btn btn-danger btn-sm">{t('delete')}</button></div></div></div>)))}</div>
      </div>
      <div className="card">
        <div className="card-header"><h2 className="card-title">{t('accountInfo')}</h2></div>
        <div className="card-body"><div className="grid md:grid-cols-2 gap-6"><div><p className="text-gray-500 text-sm">{t('contact')}</p><p className="font-semibold">{profile?.full_name}</p></div><div><p className="text-gray-500 text-sm">{t('email')}</p><p className="font-semibold">{profile?.email}</p></div><div><p className="text-gray-500 text-sm">{t('phone')}</p><p className="font-semibold">{profile?.phone || '-'}</p></div><div><p className="text-gray-500 text-sm">{t('company')}</p><p className="font-semibold">{profile?.companies?.name}</p></div></div></div>
      </div>
      {showAddressModal && (
        <div className="modal-overlay" onClick={() => setShowAddressModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="bg-lh-dark text-white p-4"><h2 className="font-semibold">{editingAddress ? t('edit') : t('addAddress')}</h2></div>
            <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
              <div><label className="label">{t('locationName')} *</label><input type="text" value={addressForm.label} onChange={e => setAddressForm({...addressForm, label: e.target.value})} className="input" required /></div>
              <div><label className="label">{t('attentionTo')}</label><input type="text" value={addressForm.attention_to} onChange={e => setAddressForm({...addressForm, attention_to: e.target.value})} className="input" /></div>
              <div><label className="label">{t('streetAddress')} *</label><input type="text" value={addressForm.address_line1} onChange={e => setAddressForm({...addressForm, address_line1: e.target.value})} className="input" required /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">{t('city')} *</label><input type="text" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="input" required /></div><div><label className="label">{t('postalCode')} *</label><input type="text" value={addressForm.postal_code} onChange={e => setAddressForm({...addressForm, postal_code: e.target.value})} className="input" required /></div></div>
              <div><label className="label">{t('country')}</label><input type="text" value={addressForm.country} onChange={e => setAddressForm({...addressForm, country: e.target.value})} className="input" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={addressForm.is_default} onChange={e => setAddressForm({...addressForm, is_default: e.target.checked})} className="w-4 h-4" /><span>{t('setDefault')}</span></label>
              <div className="flex gap-3"><button type="button" onClick={() => setShowAddressModal(false)} className="btn btn-secondary flex-1">{t('cancel')}</button><button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? t('saving') : t('save')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ requests, companies, equipment, t, lang, setPage }) {
  const stats = [{ label: t('newRequests'), value: requests.filter(r => r.status === 'submitted').length, icon: '📨', color: 'border-blue-500' },{ label: t('pendingQuotes'), value: requests.filter(r => r.status === 'quoted').length, icon: '💰', color: 'border-yellow-500' },{ label: t('activeRMAs'), value: requests.filter(r => ['approved', 'received', 'in_progress'].includes(r.status)).length, icon: '🔧', color: 'border-purple-500' },{ label: t('clients'), value: companies.length, icon: '👥', color: 'border-green-500' }];
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{stats.map((s, i) => (<div key={i} className={`stat-card ${s.color}`}><div className="flex justify-between"><div><div className="text-3xl font-bold">{s.value}</div><div className="text-sm text-gray-500">{s.label}</div></div><div className="text-3xl">{s.icon}</div></div></div>))}</div>
      <div className="card">
        <div className="card-header flex justify-between items-center"><h2 className="card-title">{t('recentRequests')}</h2><button onClick={() => setPage('requests')} className="text-lh-blue text-sm">{t('viewAll')} →</button></div>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">#</th><th className="th">{t('company')}</th><th className="th">{t('model')}</th><th className="th">{t('serviceType')}</th><th className="th">Status</th></tr></thead><tbody className="divide-y">{requests.slice(0, 10).map(r => { const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending; return (<tr key={r.id} className="hover:bg-gray-50"><td className="td font-mono text-lh-blue font-semibold">{r.request_number || '-'}</td><td className="td">{r.companies?.name || '-'}</td><td className="td">{r.model_name || '-'}</td><td className="td capitalize">{r.requested_service}</td><td className="td"><span className={`badge ${st.bg} ${st.text}`}>{st.icon} {r.status}</span></td></tr>); })}</tbody></table></div>
      </div>
    </div>
  );
}

function AdminRequests({ requests, t, lang, onRefresh, notify }) {
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quoteForm, setQuoteForm] = useState({ calibration: 320, parts: 0, labor_hours: 0, labor_rate: 65, shipping: 25, notes: '' });
  const [saving, setSaving] = useState(false);
  const filters = ['all', 'submitted', 'quoted', 'approved', 'received', 'in_progress', 'completed', 'shipped'];
  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const subtotal = quoteForm.calibration + quoteForm.parts + (quoteForm.labor_hours * quoteForm.labor_rate) + quoteForm.shipping;
  const tax = subtotal * 0.2;
  const total = subtotal + tax;
  const updateStatus = async (id, newStatus) => { await supabase.from('service_requests').update({ status: newStatus }).eq('id', id); notify(t('saved')); onRefresh(); };
  const sendQuote = async () => { setSaving(true); await supabase.from('service_requests').update({ status: 'quoted', quote_calibration: quoteForm.calibration, quote_parts: quoteForm.parts, quote_labor_hours: quoteForm.labor_hours, quote_labor_rate: quoteForm.labor_rate, quote_shipping: quoteForm.shipping, quote_notes: quoteForm.notes, quote_subtotal: subtotal, quote_tax: tax, quote_total: total, quoted_at: new Date().toISOString() }).eq('id', selectedRequest.id); setSaving(false); notify(t('saved')); setSelectedRequest(null); onRefresh(); };
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="section-title">{t('requests')}</h1>
      <div className="flex gap-2 flex-wrap">{filters.map(f => (<button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? 'bg-lh-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t(f)} ({f === 'all' ? requests.length : requests.filter(r => r.status === f).length})</button>))}</div>
      <div className="card overflow-hidden"><table className="w-full"><thead><tr><th className="th">#</th><th className="th">{t('company')}</th><th className="th">{t('serialNumber')}</th><th className="th">{t('model')}</th><th className="th">{t('serviceType')}</th><th className="th">{t('urgency')}</th><th className="th">Status</th><th className="th">Actions</th></tr></thead><tbody className="divide-y">{filtered.map(r => { const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending; return (<tr key={r.id} className="hover:bg-gray-50"><td className="td font-mono text-lh-blue font-semibold">{r.request_number || '-'}</td><td className="td">{r.companies?.name || '-'}</td><td className="td font-mono text-sm">{r.serial_number}</td><td className="td">{r.model_name || '-'}</td><td className="td capitalize">{r.requested_service}</td><td className="td"><span className={`badge ${r.urgency === 'critical' ? 'bg-red-100 text-red-700' : r.urgency === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>{r.urgency}</span></td><td className="td"><span className={`badge ${st.bg} ${st.text}`}>{st.icon} {r.status}</span></td><td className="td"><div className="flex gap-2">{r.status === 'submitted' && <button onClick={() => setSelectedRequest(r)} className="btn btn-sm btn-primary">{t('createQuote')}</button>}{r.status === 'approved' && <button onClick={() => updateStatus(r.id, 'received')} className="btn btn-sm btn-success">{t('markReceived')}</button>}{r.status === 'received' && <button onClick={() => updateStatus(r.id, 'in_progress')} className="btn btn-sm bg-purple-600 text-white">{t('startWork')}</button>}{r.status === 'in_progress' && <button onClick={() => updateStatus(r.id, 'completed')} className="btn btn-sm bg-teal-600 text-white">{t('markComplete')}</button>}{r.status === 'completed' && <button onClick={() => updateStatus(r.id, 'shipped')} className="btn btn-sm bg-gray-600 text-white">{t('markShipped')}</button>}</div></td></tr>); })}</tbody></table></div>
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-lh-dark text-white p-4"><h2 className="font-semibold">{t('createQuote')}</h2><p className="text-sm opacity-70">{selectedRequest.request_number} - {selectedRequest.companies?.name}</p></div>
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-semibold mb-3">Request Details</h3><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-gray-500">{t('serialNumber')}:</span> <strong>{selectedRequest.serial_number}</strong></div><div><span className="text-gray-500">{t('model')}:</span> <strong>{selectedRequest.model_name}</strong></div><div><span className="text-gray-500">{t('serviceType')}:</span> <strong className="capitalize">{selectedRequest.requested_service}</strong></div><div><span className="text-gray-500">{t('urgency')}:</span> <strong className="capitalize">{selectedRequest.urgency}</strong></div></div>{selectedRequest.problem_description && (<div className="mt-3 text-sm"><span className="text-gray-500">{t('problemDescription')}:</span><p className="mt-1">{selectedRequest.problem_description}</p></div>)}</div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">{t('calibration')} (€)</label><input type="number" value={quoteForm.calibration} onChange={e => setQuoteForm({...quoteForm, calibration: Number(e.target.value)})} className="input" /></div><div><label className="label">{t('parts')} (€)</label><input type="number" value={quoteForm.parts} onChange={e => setQuoteForm({...quoteForm, parts: Number(e.target.value)})} className="input" /></div><div><label className="label">{t('labor')} ({t('hours')})</label><input type="number" step="0.5" value={quoteForm.labor_hours} onChange={e => setQuoteForm({...quoteForm, labor_hours: Number(e.target.value)})} className="input" /></div><div><label className="label">{t('rate')} (€/h)</label><input type="number" value={quoteForm.labor_rate} onChange={e => setQuoteForm({...quoteForm, labor_rate: Number(e.target.value)})} className="input" /></div><div><label className="label">{t('shipping')} (€)</label><input type="number" value={quoteForm.shipping} onChange={e => setQuoteForm({...quoteForm, shipping: Number(e.target.value)})} className="input" /></div></div>
              <div><label className="label">Notes</label><textarea value={quoteForm.notes} onChange={e => setQuoteForm({...quoteForm, notes: e.target.value})} className="input min-h-[80px]" /></div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2"><div className="flex justify-between"><span className="text-gray-600">{t('totalHT')}:</span><span className="font-semibold">{subtotal.toFixed(2)} €</span></div><div className="flex justify-between"><span className="text-gray-600">{t('tva')}:</span><span className="font-semibold">{tax.toFixed(2)} €</span></div><div className="flex justify-between text-lg border-t pt-2"><span className="font-semibold">{t('totalTTC')}:</span><span className="font-bold text-lh-dark">{total.toFixed(2)} €</span></div></div>
            </div>
            <div className="p-4 border-t flex gap-3"><button onClick={() => setSelectedRequest(null)} className="btn btn-secondary flex-1">{t('cancel')}</button><button onClick={sendQuote} disabled={saving} className="btn btn-success flex-1">{saving ? t('saving') : t('sendQuote')}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminClients({ companies, equipment, t, lang }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="section-title">{t('clients')}</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{companies.map(c => { const devCount = equipment.filter(e => e.company_id === c.id).length; const contact = c.company_contacts?.[0]; return (<div key={c.id} className="card card-body border-t-4 border-lh-blue hover:shadow-md"><div className="flex justify-between mb-3"><h3 className="font-bold text-lg text-lh-dark">{c.name}</h3><span className="badge bg-blue-100 text-blue-700">{devCount} devices</span></div><div className="space-y-1 text-sm text-gray-600">{contact && <p>👤 {contact.full_name}</p>}<p>📧 {c.email || '-'}</p><p>📞 {c.phone || '-'}</p><p>📍 {c.billing_postal_code} {c.billing_city}</p></div></div>); })}</div>
    </div>
  );
}

function AdminEquipment({ equipment, t, lang }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="section-title">{t('equipment')}</h1>
      <div className="card overflow-hidden"><table className="w-full"><thead><tr><th className="th">{t('serialNumber')}</th><th className="th">{t('model')}</th><th className="th">{t('type')}</th><th className="th">{t('company')}</th><th className="th">{t('location')}</th></tr></thead><tbody className="divide-y">{equipment.map(eq => (<tr key={eq.id} className="hover:bg-gray-50"><td className="td font-mono font-semibold">{eq.serial_number}</td><td className="td">{eq.model_name || '-'}</td><td className="td"><span className={`badge ${eq.equipment_type === 'biocollector' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{eq.equipment_type === 'biocollector' ? 'Bio' : 'Counter'}</span></td><td className="td">{eq.companies?.name || '-'}</td><td className="td text-gray-500">{eq.customer_location || '-'}</td></tr>))}</tbody></table></div>
    </div>
  );
}
