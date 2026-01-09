'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Translations
const T = {
  fr: {
    login: 'Connexion', logout: 'Déconnexion', register: 'Créer un compte', email: 'Email', password: 'Mot de passe',
    dashboard: 'Tableau de Bord', myEquipment: 'Mes Équipements', myRequests: 'Mes Demandes', newRequest: 'Nouvelle Demande',
    clients: 'Clients', equipment: 'Équipements', requests: 'Demandes', quotes: 'Devis', rmaTracking: 'Suivi RMA', pricing: 'Tarifs',
    addEquipment: 'Ajouter Équipement', serialNumber: 'N° de Série', model: 'Modèle', type: 'Type', location: 'Emplacement',
    save: 'Enregistrer', cancel: 'Annuler', submit: 'Soumettre', edit: 'Modifier', delete: 'Supprimer', view: 'Voir',
    calibration: 'Calibration', repair: 'Réparation', diagnostic: 'Diagnostic', calibrationRepair: 'Calibration + Réparation',
    serviceType: 'Type de Service', problemDescription: 'Description du Problème', urgency: 'Urgence',
    normal: 'Normal', urgent: 'Urgent', critical: 'Critique', company: 'Société', contact: 'Contact', phone: 'Téléphone',
    address: 'Adresse', city: 'Ville', postalCode: 'Code Postal', loading: 'Chargement...', selectEquipment: 'Sélectionner Équipement',
    createQuote: 'Créer Devis', sendQuote: 'Envoyer Devis', approveQuote: 'Approuver', rejectQuote: 'Refuser',
    totalHT: 'Total HT', tva: 'TVA (20%)', totalTTC: 'Total TTC', parts: 'Pièces', labor: 'Main d\'œuvre', shipping: 'Transport',
    hours: 'Heures', rate: 'Taux', addPart: 'Ajouter Pièce', quantity: 'Qté', unitPrice: 'Prix Unit.', description: 'Description',
    shippingAddress: 'Adresse de livraison', poNumber: 'N° Bon de Commande', notes: 'Notes',
    received: 'Arrivée', startWork: 'Démarrer', complete: 'Terminer', ship: 'Expédier',
    pending: 'En attente', inProgress: 'En cours', completed: 'Terminé', shipped: 'Expédié',
    noEquipment: 'Aucun équipement', noRequests: 'Aucune demande', addFirst: 'Ajoutez d\'abord vos équipements',
    requestSubmitted: 'Demande soumise!', quoteSent: 'Devis envoyé!', saved: 'Enregistré!', errorOccurred: 'Une erreur est survenue',
    customerPortal: 'Portail Client', adminPortal: 'Portail Admin', welcomeBack: 'Bienvenue',
    newRequests: 'Nouvelles demandes', pendingQuotes: 'Devis en attente', activeRMAs: 'RMAs actifs',
    equipmentCount: 'Équipements', activeRequests: 'Demandes actives', awaitingQuote: 'En attente de devis',
    home: 'Accueil', services: 'Services', howItWorks: 'Comment ça marche', contactUs: 'Contactez-nous',
  },
  en: {
    login: 'Login', logout: 'Logout', register: 'Create Account', email: 'Email', password: 'Password',
    dashboard: 'Dashboard', myEquipment: 'My Equipment', myRequests: 'My Requests', newRequest: 'New Request',
    clients: 'Clients', equipment: 'Equipment', requests: 'Requests', quotes: 'Quotes', rmaTracking: 'RMA Tracking', pricing: 'Pricing',
    addEquipment: 'Add Equipment', serialNumber: 'Serial Number', model: 'Model', type: 'Type', location: 'Location',
    save: 'Save', cancel: 'Cancel', submit: 'Submit', edit: 'Edit', delete: 'Delete', view: 'View',
    calibration: 'Calibration', repair: 'Repair', diagnostic: 'Diagnostic', calibrationRepair: 'Calibration + Repair',
    serviceType: 'Service Type', problemDescription: 'Problem Description', urgency: 'Urgency',
    normal: 'Normal', urgent: 'Urgent', critical: 'Critical', company: 'Company', contact: 'Contact', phone: 'Phone',
    address: 'Address', city: 'City', postalCode: 'Postal Code', loading: 'Loading...', selectEquipment: 'Select Equipment',
    createQuote: 'Create Quote', sendQuote: 'Send Quote', approveQuote: 'Approve', rejectQuote: 'Reject',
    totalHT: 'Subtotal', tva: 'VAT (20%)', totalTTC: 'Total', parts: 'Parts', labor: 'Labor', shipping: 'Shipping',
    hours: 'Hours', rate: 'Rate', addPart: 'Add Part', quantity: 'Qty', unitPrice: 'Unit Price', description: 'Description',
    shippingAddress: 'Shipping Address', poNumber: 'PO Number', notes: 'Notes',
    received: 'Received', startWork: 'Start', complete: 'Complete', ship: 'Ship',
    pending: 'Pending', inProgress: 'In Progress', completed: 'Completed', shipped: 'Shipped',
    noEquipment: 'No equipment', noRequests: 'No requests', addFirst: 'Add your equipment first',
    requestSubmitted: 'Request submitted!', quoteSent: 'Quote sent!', saved: 'Saved!', errorOccurred: 'An error occurred',
    customerPortal: 'Customer Portal', adminPortal: 'Admin Portal', welcomeBack: 'Welcome back',
    newRequests: 'New requests', pendingQuotes: 'Pending quotes', activeRMAs: 'Active RMAs',
    equipmentCount: 'Equipment', activeRequests: 'Active requests', awaitingQuote: 'Awaiting quote',
    home: 'Home', services: 'Services', howItWorks: 'How it works', contactUs: 'Contact Us',
  }
};

const STATUS = {
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📨', label: 'Submitted' },
  quoted: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '💰', label: 'Quoted' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', icon: '✅', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: '❌', label: 'Rejected' },
  received: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '📥', label: 'Received' },
  in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '🔧', label: 'In Progress' },
  completed: { bg: 'bg-teal-100', text: 'text-teal-700', icon: '✅', label: 'Completed' },
  shipped: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🚚', label: 'Shipped' },
  pending: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '⏳', label: 'Pending' },
};

// Main App
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('fr');
  const [page, setPage] = useState('home');
  const [toast, setToast] = useState(null);
  
  // Data
  const [equipment, setEquipment] = useState([]);
  const [requests, setRequests] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [models, setModels] = useState([]);
  const [prices, setPrices] = useState([]);

  const t = (key) => T[lang][key] || key;
  const notify = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const isStaff = profile?.role === 'admin' || profile?.role === 'technician';

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      const { data: prof } = await supabase.from('profiles').select('*, companies(*)').eq('id', session.user.id).single();
      setProfile(prof);
      if (prof?.preferred_language) setLang(prof.preferred_language);
      setPage('dashboard');
      await loadData(prof);
    }
    setLoading(false);
  };

  const loadData = async (prof) => {
    const isAdmin = prof?.role === 'admin' || prof?.role === 'technician';
    
    // Load models and prices for everyone
    const [modelsRes, pricesRes] = await Promise.all([
      supabase.from('models').select('*').eq('is_active', true),
      supabase.from('system_settings').select('*'),
    ]);
    setModels(modelsRes.data || []);
    setPrices(pricesRes.data || []);

    if (isAdmin) {
      const [reqRes, compRes, eqRes] = await Promise.all([
        supabase.from('service_requests').select('*, companies(name, client_number)').order('created_at', { ascending: false }),
        supabase.from('companies').select('*, company_contacts(*)').order('name'),
        supabase.from('equipment').select('*, companies(name)').order('created_at', { ascending: false }),
      ]);
      setRequests(reqRes.data || []);
      setCompanies(compRes.data || []);
      setEquipment(eqRes.data || []);
    } else if (prof?.company_id) {
      const [eqRes, reqRes, addrRes] = await Promise.all([
        supabase.from('equipment').select('*').eq('company_id', prof.company_id).order('created_at', { ascending: false }),
        supabase.from('service_requests').select('*').eq('company_id', prof.company_id).order('created_at', { ascending: false }),
        supabase.from('shipping_addresses').select('*').eq('company_id', prof.company_id),
      ]);
      setEquipment(eqRes.data || []);
      setRequests(reqRes.data || []);
      setAddresses(addrRes.data || []);
    }
  };

  const handleLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    setUser(data.user);
    const { data: prof } = await supabase.from('profiles').select('*, companies(*)').eq('id', data.user.id).single();
    setProfile(prof);
    setPage('dashboard');
    await loadData(prof);
    return null;
  };

  const handleRegister = async (formData) => {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email, password: formData.password,
    });
    if (authError) return authError.message;

    // Create company
    const { data: company, error: compError } = await supabase.from('companies').insert({
      name: formData.companyName,
      billing_address: formData.address,
      billing_city: formData.city,
      billing_postal_code: formData.postalCode,
      billing_country: 'France',
      phone: formData.phone,
      email: formData.email,
    }).select().single();
    if (compError) return compError.message;

    // Create profile
    await supabase.from('profiles').insert({
      id: authData.user.id,
      email: formData.email,
      full_name: formData.contactName,
      role: 'customer',
      company_id: company.id,
      phone: formData.phone,
    });

    // Create default address
    await supabase.from('shipping_addresses').insert({
      company_id: company.id,
      label: 'Adresse principale',
      address_line1: formData.address,
      city: formData.city,
      postal_code: formData.postalCode,
      country: 'France',
      is_default: true,
    });

    notify(lang === 'fr' ? 'Compte créé! Vérifiez votre email.' : 'Account created! Check your email.');
    setPage('login');
    return null;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setPage('home');
    setEquipment([]); setRequests([]); setCompanies([]); setAddresses([]);
  };

  // CRUD Operations
  const addEquipment = async (data) => {
    const { error } = await supabase.from('equipment').insert({
      ...data,
      company_id: profile.company_id,
      added_by: profile.id,
    });
    if (error) { notify(error.message, 'error'); return false; }
    notify(t('saved'));
    await loadData(profile);
    return true;
  };

  const submitRequest = async (data) => {
    // Generate request number
    const year = new Date().getFullYear();
    const count = requests.length + 1;
    const requestNumber = `SR-${year}-${String(count).padStart(4, '0')}`;

    const { error } = await supabase.from('service_requests').insert({
      ...data,
      request_number: requestNumber,
      company_id: profile.company_id,
      submitted_by: profile.id,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });
    if (error) { notify(error.message, 'error'); return false; }
    notify(t('requestSubmitted'));
    await loadData(profile);
    return true;
  };

  const updateRequestStatus = async (id, status, extraData = {}) => {
    const updates = { status, ...extraData };
    if (status === 'received') updates.received_at = new Date().toISOString();
    if (status === 'in_progress') updates.started_at = new Date().toISOString();
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    if (status === 'shipped') updates.shipped_at = new Date().toISOString();

    const { error } = await supabase.from('service_requests').update(updates).eq('id', id);
    if (error) { notify(error.message, 'error'); return; }
    notify(t('saved'));
    await loadData(profile);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lh-dark to-lh-blue">
      <div className="text-white text-xl animate-pulse">{t('loading')}</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-fade-in ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <Header user={user} profile={profile} isStaff={isStaff} lang={lang} setLang={setLang} t={t} page={page} setPage={setPage} onLogout={handleLogout} />

      {/* Main Content */}
      <main className="flex-1">
        {!user ? (
          // Public Pages
          <>
            {page === 'home' && <HomePage t={t} lang={lang} setPage={setPage} />}
            {page === 'login' && <LoginPage t={t} lang={lang} onLogin={handleLogin} setPage={setPage} />}
            {page === 'register' && <RegisterPage t={t} lang={lang} onRegister={handleRegister} setPage={setPage} />}
          </>
        ) : isStaff ? (
          // Admin Pages
          <>
            {page === 'dashboard' && <AdminDashboard requests={requests} companies={companies} equipment={equipment} t={t} lang={lang} setPage={setPage} />}
            {page === 'requests' && <AdminRequests requests={requests} t={t} lang={lang} onUpdateStatus={updateRequestStatus} setPage={setPage} />}
            {page === 'clients' && <AdminClients companies={companies} equipment={equipment} t={t} lang={lang} />}
            {page === 'equipment' && <AdminEquipment equipment={equipment} t={t} lang={lang} />}
            {page === 'quote' && <CreateQuotePage request={requests.find(r => r.id === page.requestId)} t={t} lang={lang} models={models} onSave={() => {}} setPage={setPage} />}
          </>
        ) : (
          // Customer Pages
          <>
            {page === 'dashboard' && <CustomerDashboard profile={profile} equipment={equipment} requests={requests} t={t} lang={lang} setPage={setPage} />}
            {page === 'equipment' && <CustomerEquipment equipment={equipment} models={models} t={t} lang={lang} onAdd={addEquipment} />}
            {page === 'requests' && <CustomerRequests requests={requests} t={t} lang={lang} setPage={setPage} />}
            {page === 'new-request' && <NewRequestPage equipment={equipment} addresses={addresses} t={t} lang={lang} onSubmit={submitRequest} setPage={setPage} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-lh-dark text-white py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p className="font-semibold">🔬 LIGHTHOUSE FRANCE</p>
          <p className="opacity-70 mt-1">16 Rue Paul Séjourne, 94000 Créteil | France@golighthouse.com | 01 43 77 28 07</p>
          <p className="opacity-50 mt-2 text-xs">SIRET: 501 781 348 00021 | TVA: FR86 501 781 348</p>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// HEADER COMPONENT
// ============================================
function Header({ user, profile, isStaff, lang, setLang, t, page, setPage, onLogout }) {
  const customerNav = [
    { id: 'dashboard', icon: '📊', label: 'dashboard' },
    { id: 'new-request', icon: '➕', label: 'newRequest' },
    { id: 'requests', icon: '📋', label: 'myRequests' },
    { id: 'equipment', icon: '🔧', label: 'myEquipment' },
  ];
  
  const adminNav = [
    { id: 'dashboard', icon: '📊', label: 'dashboard' },
    { id: 'requests', icon: '📨', label: 'requests' },
    { id: 'clients', icon: '👥', label: 'clients' },
    { id: 'equipment', icon: '🔧', label: 'equipment' },
  ];

  const nav = user ? (isStaff ? adminNav : customerNav) : [];

  return (
    <header className="bg-lh-dark text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage(user ? 'dashboard' : 'home')}>
            <span className="text-2xl">🔬</span>
            <div>
              <div className="font-bold text-lg leading-tight">LIGHTHOUSE</div>
              <div className="text-xs text-lh-yellow -mt-0.5">FRANCE</div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Language */}
            <div className="flex bg-white/10 rounded overflow-hidden">
              <button onClick={() => setLang('fr')} className={`px-2 py-1 text-sm ${lang === 'fr' ? 'bg-white text-lh-dark font-semibold' : ''}`}>FR</button>
              <button onClick={() => setLang('en')} className={`px-2 py-1 text-sm ${lang === 'en' ? 'bg-white text-lh-dark font-semibold' : ''}`}>EN</button>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium">{profile?.full_name}</div>
                  <div className="text-xs text-lh-yellow">{isStaff ? 'Admin' : profile?.companies?.name}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-lh-yellow text-lh-dark flex items-center justify-center font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <button onClick={onLogout} className="text-sm opacity-70 hover:opacity-100">{t('logout')}</button>
              </div>
            ) : (
              <button onClick={() => setPage('login')} className="btn btn-sm bg-lh-yellow text-lh-dark hover:bg-yellow-400">
                {t('login')}
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        {user && (
          <nav className="flex gap-1 pb-2 overflow-x-auto">
            {nav.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  page === item.id ? 'bg-lh-blue text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{t(item.label)}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

// ============================================
// PUBLIC PAGES
// ============================================
function HomePage({ t, lang, setPage }) {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-lh-dark via-lh-blue to-lh-dark text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {lang === 'fr' ? 'Portail de Service Équipement' : 'Equipment Service Portal'}
          </h1>
          <p className="text-xl opacity-90 mb-8">
            {lang === 'fr' ? 'Services professionnels de calibration et réparation pour vos instruments de précision' : 'Professional calibration and repair services for your precision instruments'}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={() => setPage('login')} className="btn px-8 py-3 bg-white text-lh-dark hover:bg-gray-100 text-lg">
              {t('login')}
            </button>
            <button onClick={() => setPage('register')} className="btn px-8 py-3 border-2 border-white hover:bg-white/10 text-lg">
              {t('register')}
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-lh-dark mb-12">
            {lang === 'fr' ? 'Comment ça marche' : 'How It Works'}
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: '📝', title: lang === 'fr' ? 'Créer un compte' : 'Create Account', desc: lang === 'fr' ? 'Inscrivez-vous et ajoutez vos équipements' : 'Sign up and add your equipment' },
              { icon: '📨', title: lang === 'fr' ? 'Soumettre une demande' : 'Submit Request', desc: lang === 'fr' ? 'Décrivez le service dont vous avez besoin' : 'Describe the service you need' },
              { icon: '💰', title: lang === 'fr' ? 'Recevoir un devis' : 'Get Quote', desc: lang === 'fr' ? 'Nous vous envoyons un devis détaillé' : 'We send you a detailed quote' },
              { icon: '🚚', title: lang === 'fr' ? 'Envoyer & Suivre' : 'Ship & Track', desc: lang === 'fr' ? 'Envoyez l\'équipement et suivez le statut' : 'Ship equipment and track status' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl mb-3">{step.icon}</div>
                <div className="text-4xl font-bold text-lh-blue/20 mb-2">{i + 1}</div>
                <h3 className="font-semibold text-lh-dark mb-1">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-lh-dark mb-12">
            {lang === 'fr' ? 'Nos Services' : 'Our Services'}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '⚙️', title: 'Calibration', desc: lang === 'fr' ? 'Calibration annuelle selon ISO 21501-4' : 'Annual calibration per ISO 21501-4', price: lang === 'fr' ? 'À partir de 320€' : 'From €320' },
              { icon: '🔧', title: lang === 'fr' ? 'Réparation' : 'Repair', desc: lang === 'fr' ? 'Diagnostic et réparation de tous les modèles' : 'Diagnosis and repair of all models', price: lang === 'fr' ? 'Sur devis' : 'Quote based' },
              { icon: '🔬', title: 'Diagnostic', desc: lang === 'fr' ? 'Évaluation complète de l\'état de votre équipement' : 'Complete assessment of your equipment', price: '100€' },
            ].map((svc, i) => (
              <div key={i} className="card p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{svc.icon}</div>
                <h3 className="text-xl font-semibold text-lh-dark mb-2">{svc.title}</h3>
                <p className="text-gray-600 mb-4">{svc.desc}</p>
                <div className="text-lh-blue font-semibold">{svc.price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function LoginPage({ t, lang, onLogin, setPage }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await onLogin(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔬</div>
          <h1 className="text-2xl font-bold text-lh-dark">Lighthouse France</h1>
          <p className="text-gray-500">{lang === 'fr' ? 'Connectez-vous à votre compte' : 'Login to your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t('email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">{t('password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
            {loading ? t('loading') : t('login')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          {lang === 'fr' ? 'Pas encore de compte?' : 'No account yet?'}{' '}
          <button onClick={() => setPage('register')} className="text-lh-blue font-medium hover:underline">{t('register')}</button>
        </p>
      </div>
    </div>
  );
}

function RegisterPage({ t, lang, onRegister, setPage }) {
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    companyName: '', contactName: '', phone: '',
    address: '', city: '', postalCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError(lang === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    const err = await onRegister(form);
    if (err) setError(err);
    setLoading(false);
  };

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="py-12 px-4">
      <div className="card max-w-2xl mx-auto overflow-hidden">
        <div className="bg-lh-dark text-white p-6">
          <h1 className="text-xl font-bold">{t('register')}</h1>
          <p className="text-white/70 text-sm">{lang === 'fr' ? 'Créez votre compte entreprise' : 'Create your company account'}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Company Info */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">🏢 {t('company')}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">{t('company')} *</label>
                <input type="text" value={form.companyName} onChange={e => update('companyName', e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">{t('contact')} *</label>
                <input type="text" value={form.contactName} onChange={e => update('contactName', e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">{t('phone')}</label>
                <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="label">{t('address')} *</label>
                <input type="text" value={form.address} onChange={e => update('address', e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">{t('city')} *</label>
                <input type="text" value={form.city} onChange={e => update('city', e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">{t('postalCode')} *</label>
                <input type="text" value={form.postalCode} onChange={e => update('postalCode', e.target.value)} className="input" required />
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">🔐 {lang === 'fr' ? 'Informations de connexion' : 'Login Information'}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">{t('email')} *</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">{t('password')} *</label>
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="input" required minLength={6} />
              </div>
              <div>
                <label className="label">{lang === 'fr' ? 'Confirmer' : 'Confirm'} *</label>
                <input type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} className="input" required />
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setPage('login')} className="btn btn-secondary flex-1">{t('cancel')}</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">{loading ? t('loading') : t('register')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// CUSTOMER PAGES
// ============================================
function CustomerDashboard({ profile, equipment, requests, t, lang, setPage }) {
  const stats = [
    { label: t('equipmentCount'), value: equipment.length, icon: '🔧', color: 'border-blue-500' },
    { label: t('activeRequests'), value: requests.filter(r => !['shipped', 'rejected'].includes(r.status)).length, icon: '📋', color: 'border-yellow-500' },
    { label: t('awaitingQuote'), value: requests.filter(r => r.status === 'submitted').length, icon: '⏳', color: 'border-purple-500' },
    { label: t('completed'), value: requests.filter(r => r.status === 'shipped').length, icon: '✅', color: 'border-green-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('welcomeBack')}, {profile?.full_name}!</h1>
          <p className="text-gray-500">{profile?.companies?.name}</p>
        </div>
        <button onClick={() => setPage('new-request')} className="btn btn-primary">➕ {t('newRequest')}</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`card p-5 border-l-4 ${s.color}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-3xl font-bold text-gray-800">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
              <div className="text-2xl">{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Requests */}
      <div className="card">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">{lang === 'fr' ? 'Demandes récentes' : 'Recent Requests'}</h2>
          <button onClick={() => setPage('requests')} className="text-sm text-lh-blue hover:underline">
            {lang === 'fr' ? 'Voir tout' : 'View all'} →
          </button>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>{t('noRequests')}</p>
            <button onClick={() => setPage('new-request')} className="btn btn-primary mt-4">{t('newRequest')}</button>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr><th className="th">#</th><th className="th">{t('model')}</th><th className="th">{t('serviceType')}</th><th className="th">Status</th><th className="th">Date</th></tr></thead>
            <tbody className="divide-y">
              {requests.slice(0, 5).map(r => {
                const st = STATUS[r.status] || STATUS.pending;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="td font-mono text-lh-blue font-semibold">{r.request_number}</td>
                    <td className="td">{r.model_name || '-'}</td>
                    <td className="td capitalize">{r.requested_service}</td>
                    <td className="td"><span className={`badge ${st.bg} ${st.text}`}>{st.icon} {st.label}</span></td>
                    <td className="td text-gray-500 text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
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

function CustomerEquipment({ equipment, models, t, lang, onAdd }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ serial_number: '', model_name: '', equipment_type: 'particle_counter', customer_location: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const success = await onAdd(form);
    if (success) {
      setShowModal(false);
      setForm({ serial_number: '', model_name: '', equipment_type: 'particle_counter', customer_location: '' });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{t('myEquipment')}</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">➕ {t('addEquipment')}</button>
      </div>

      {equipment.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h2 className="text-xl font-semibold mb-2">{t('noEquipment')}</h2>
          <p className="text-gray-500 mb-6">{t('addFirst')}</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">{t('addEquipment')}</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map(eq => (
            <div key={eq.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="text-3xl">🔬</div>
                <span className={`badge ${eq.equipment_type === 'biocollector' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                  {eq.equipment_type === 'biocollector' ? 'Bio' : 'Counter'}
                </span>
              </div>
              <h3 className="font-semibold text-lg text-lh-dark">{eq.model_name || 'Unknown Model'}</h3>
              <p className="font-mono text-sm text-gray-500">{eq.serial_number}</p>
              {eq.customer_location && <p className="text-sm text-gray-400 mt-2">📍 {eq.customer_location}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add Equipment Modal */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b bg-lh-dark text-white">
              <h2 className="font-semibold">{t('addEquipment')}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">{t('serialNumber')} *</label>
                <input type="text" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} className="input" placeholder="ex: 200113002" required />
              </div>
              <div>
                <label className="label">{t('model')}</label>
                <input type="text" value={form.model_name} onChange={e => setForm({...form, model_name: e.target.value})} className="input" placeholder="ex: SOLAIR 3100+" />
              </div>
              <div>
                <label className="label">{t('type')}</label>
                <select value={form.equipment_type} onChange={e => setForm({...form, equipment_type: e.target.value})} className="input">
                  <option value="particle_counter">{lang === 'fr' ? 'Compteur de particules' : 'Particle Counter'}</option>
                  <option value="biocollector">{lang === 'fr' ? 'Biocollecteur' : 'Biocollector'}</option>
                  <option value="other">{lang === 'fr' ? 'Autre' : 'Other'}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('location')}</label>
                <input type="text" value={form.customer_location} onChange={e => setForm({...form, customer_location: e.target.value})} className="input" placeholder={lang === 'fr' ? 'ex: Salle blanche A' : 'e.g., Cleanroom A'} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">{t('cancel')}</button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? t('loading') : t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerRequests({ requests, t, lang, setPage }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{t('myRequests')}</h1>
        <button onClick={() => setPage('new-request')} className="btn btn-primary">➕ {t('newRequest')}</button>
      </div>

      {requests.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold mb-2">{t('noRequests')}</h2>
          <button onClick={() => setPage('new-request')} className="btn btn-primary mt-4">{t('newRequest')}</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr>
              <th className="th">#</th>
              <th className="th">{t('serialNumber')}</th>
              <th className="th">{t('model')}</th>
              <th className="th">{t('serviceType')}</th>
              <th className="th">Status</th>
              <th className="th">Date</th>
            </tr></thead>
            <tbody className="divide-y">
              {requests.map(r => {
                const st = STATUS[r.status] || STATUS.pending;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="td font-mono text-lh-blue font-semibold">{r.request_number}</td>
                    <td className="td font-mono text-sm">{r.serial_number}</td>
                    <td className="td">{r.model_name || '-'}</td>
                    <td className="td capitalize">{r.requested_service}</td>
                    <td className="td"><span className={`badge ${st.bg} ${st.text}`}>{st.icon} {st.label}</span></td>
                    <td className="td text-gray-500 text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewRequestPage({ equipment, addresses, t, lang, onSubmit, setPage }) {
  const [form, setForm] = useState({
    equipment_id: '',
    serial_number: '',
    model_name: '',
    equipment_type: '',
    requested_service: 'calibration',
    problem_description: '',
    urgency: 'normal',
    shipping_address_id: addresses[0]?.id || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleEquipmentChange = (eqId) => {
    const eq = equipment.find(e => e.id === eqId);
    if (eq) {
      setForm(prev => ({
        ...prev,
        equipment_id: eqId,
        serial_number: eq.serial_number,
        model_name: eq.model_name,
        equipment_type: eq.equipment_type,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipment_id) return;
    setSubmitting(true);
    const success = await onSubmit(form);
    if (success) setPage('requests');
    setSubmitting(false);
  };

  if (equipment.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h2 className="text-xl font-semibold mb-2">{t('noEquipment')}</h2>
          <p className="text-gray-500 mb-6">{t('addFirst')}</p>
          <button onClick={() => setPage('equipment')} className="btn btn-primary">{t('addEquipment')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('newRequest')}</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Equipment Selection */}
        <div>
          <label className="label">{t('selectEquipment')} *</label>
          <select value={form.equipment_id} onChange={e => handleEquipmentChange(e.target.value)} className="input" required>
            <option value="">-- {lang === 'fr' ? 'Sélectionner' : 'Select'} --</option>
            {equipment.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.model_name} - {eq.serial_number}</option>
            ))}
          </select>
        </div>

        {/* Service Type */}
        <div>
          <label className="label">{t('serviceType')} *</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'calibration', label: t('calibration'), icon: '⚙️' },
              { value: 'repair', label: t('repair'), icon: '🔧' },
              { value: 'calibration_repair', label: t('calibrationRepair'), icon: '⚙️🔧' },
              { value: 'diagnostic', label: t('diagnostic'), icon: '🔬' },
            ].map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${form.requested_service === opt.value ? 'border-lh-blue bg-lh-blue/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="service" value={opt.value} checked={form.requested_service === opt.value} onChange={e => setForm({...form, requested_service: e.target.value})} className="hidden" />
                <span className="text-xl">{opt.icon}</span>
                <span className="font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Problem Description */}
        <div>
          <label className="label">{t('problemDescription')}</label>
          <textarea value={form.problem_description} onChange={e => setForm({...form, problem_description: e.target.value})} className="input min-h-[100px]" placeholder={lang === 'fr' ? 'Décrivez le problème ou les symptômes observés...' : 'Describe the problem or symptoms...'} />
        </div>

        {/* Urgency */}
        <div>
          <label className="label">{t('urgency')}</label>
          <div className="flex gap-4">
            {['normal', 'urgent', 'critical'].map(u => (
              <label key={u} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="urgency" value={u} checked={form.urgency === u} onChange={e => setForm({...form, urgency: e.target.value})} className="w-4 h-4 text-lh-blue" />
                <span className={`font-medium ${u === 'critical' ? 'text-red-600' : u === 'urgent' ? 'text-orange-600' : ''}`}>{t(u)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Shipping Address */}
        {addresses.length > 0 && (
          <div>
            <label className="label">{t('shippingAddress')}</label>
            <select value={form.shipping_address_id} onChange={e => setForm({...form, shipping_address_id: e.target.value})} className="input">
              {addresses.map(a => (
                <option key={a.id} value={a.id}>{a.label} - {a.address_line1}, {a.city}</option>
              ))}
            </select>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={() => setPage('dashboard')} className="btn btn-secondary flex-1">{t('cancel')}</button>
          <button type="submit" disabled={submitting || !form.equipment_id} className="btn btn-primary flex-1">{submitting ? t('loading') : t('submit')}</button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// ADMIN PAGES
// ============================================
function AdminDashboard({ requests, companies, equipment, t, lang, setPage }) {
  const stats = [
    { label: t('newRequests'), value: requests.filter(r => r.status === 'submitted').length, icon: '📨', color: 'border-red-500', onClick: () => setPage('requests') },
    { label: t('pendingQuotes'), value: requests.filter(r => r.status === 'quoted').length, icon: '💰', color: 'border-yellow-500' },
    { label: t('activeRMAs'), value: requests.filter(r => ['received', 'in_progress'].includes(r.status)).length, icon: '🔧', color: 'border-purple-500' },
    { label: t('clients'), value: companies.length, icon: '👥', color: 'border-blue-500', onClick: () => setPage('clients') },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('dashboard')}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`card p-5 border-l-4 ${s.color} ${s.onClick ? 'cursor-pointer hover:shadow-md' : ''}`} onClick={s.onClick}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-3xl font-bold text-gray-800">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
              <div className="text-2xl">{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Requests */}
      <div className="card">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">{lang === 'fr' ? 'Demandes récentes' : 'Recent Requests'}</h2>
          <button onClick={() => setPage('requests')} className="text-sm text-lh-blue hover:underline">{lang === 'fr' ? 'Voir tout' : 'View all'} →</button>
        </div>
        <table className="w-full">
          <thead><tr>
            <th className="th">#</th>
            <th className="th">{t('company')}</th>
            <th className="th">{t('model')}</th>
            <th className="th">{t('serviceType')}</th>
            <th className="th">{t('urgency')}</th>
            <th className="th">Status</th>
          </tr></thead>
          <tbody className="divide-y">
            {requests.slice(0, 10).map(r => {
              const st = STATUS[r.status] || STATUS.pending;
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="td font-mono text-lh-blue font-semibold">{r.request_number}</td>
                  <td className="td font-medium">{r.companies?.name || '-'}</td>
                  <td className="td">{r.model_name || '-'}</td>
                  <td className="td capitalize">{r.requested_service}</td>
                  <td className="td">
                    <span className={`badge ${r.urgency === 'critical' ? 'bg-red-100 text-red-700' : r.urgency === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                      {r.urgency}
                    </span>
                  </td>
                  <td className="td"><span className={`badge ${st.bg} ${st.text}`}>{st.icon} {st.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminRequests({ requests, t, lang, onUpdateStatus, setPage }) {
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const filters = [
    { id: 'all', label: lang === 'fr' ? 'Toutes' : 'All' },
    { id: 'submitted', label: lang === 'fr' ? 'Nouvelles' : 'New' },
    { id: 'quoted', label: lang === 'fr' ? 'Devis envoyé' : 'Quoted' },
    { id: 'approved', label: lang === 'fr' ? 'Approuvées' : 'Approved' },
    { id: 'received', label: lang === 'fr' ? 'Reçues' : 'Received' },
    { id: 'in_progress', label: lang === 'fr' ? 'En cours' : 'In Progress' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('requests')}</h1>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`btn btn-sm ${filter === f.id ? 'btn-primary' : 'btn-secondary'}`}>
              {f.label} {f.id !== 'all' && `(${requests.filter(r => r.status === f.id).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="th">#</th>
            <th className="th">{t('company')}</th>
            <th className="th">{t('serialNumber')}</th>
            <th className="th">{t('model')}</th>
            <th className="th">{t('serviceType')}</th>
            <th className="th">{t('urgency')}</th>
            <th className="th">Status</th>
            <th className="th">Actions</th>
          </tr></thead>
          <tbody className="divide-y">
            {filtered.map(r => {
              const st = STATUS[r.status] || STATUS.pending;
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="td font-mono text-lh-blue font-semibold">{r.request_number}</td>
                  <td className="td font-medium">{r.companies?.name || '-'}</td>
                  <td className="td font-mono text-sm">{r.serial_number}</td>
                  <td className="td">{r.model_name || '-'}</td>
                  <td className="td capitalize">{r.requested_service}</td>
                  <td className="td">
                    <span className={`badge ${r.urgency === 'critical' ? 'bg-red-100 text-red-700' : r.urgency === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                      {r.urgency}
                    </span>
                  </td>
                  <td className="td"><span className={`badge ${st.bg} ${st.text}`}>{st.icon} {st.label}</span></td>
                  <td className="td">
                    <div className="flex gap-2">
                      {r.status === 'submitted' && (
                        <button onClick={() => { setSelectedRequest(r); setShowQuoteModal(true); }} className="btn btn-sm btn-primary">{t('createQuote')}</button>
                      )}
                      {r.status === 'approved' && (
                        <button onClick={() => onUpdateStatus(r.id, 'received')} className="btn btn-sm btn-success">{t('received')}</button>
                      )}
                      {r.status === 'received' && (
                        <button onClick={() => onUpdateStatus(r.id, 'in_progress')} className="btn btn-sm bg-purple-600 text-white hover:bg-purple-700">{t('startWork')}</button>
                      )}
                      {r.status === 'in_progress' && (
                        <button onClick={() => onUpdateStatus(r.id, 'completed')} className="btn btn-sm bg-teal-600 text-white hover:bg-teal-700">{t('complete')}</button>
                      )}
                      {r.status === 'completed' && (
                        <button onClick={() => onUpdateStatus(r.id, 'shipped')} className="btn btn-sm bg-gray-600 text-white hover:bg-gray-700">{t('ship')}</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quote Modal */}
      {showQuoteModal && selectedRequest && (
        <QuoteModal 
          request={selectedRequest} 
          t={t} 
          lang={lang} 
          onClose={() => { setShowQuoteModal(false); setSelectedRequest(null); }}
          onSend={async (quoteData) => {
            await onUpdateStatus(selectedRequest.id, 'quoted', quoteData);
            setShowQuoteModal(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}

function QuoteModal({ request, t, lang, onClose, onSend }) {
  const [form, setForm] = useState({
    calibration_price: 330,
    parts_total: 0,
    labor_hours: 0,
    labor_rate: 150,
    shipping_cost: 40,
    notes: '',
  });
  const [sending, setSending] = useState(false);

  const laborTotal = form.labor_hours * form.labor_rate;
  const subtotal = form.calibration_price + form.parts_total + laborTotal + form.shipping_cost;
  const tax = subtotal * 0.2;
  const total = subtotal + tax;

  const handleSend = async () => {
    setSending(true);
    await onSend({
      quote_total_ht: subtotal,
      quote_total_ttc: total,
      quote_notes: form.notes,
    });
    setSending(false);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-lh-dark text-white sticky top-0">
          <h2 className="font-semibold">{t('createQuote')}</h2>
          <p className="text-sm text-white/70">{request.request_number} - {request.companies?.name}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Request Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">{lang === 'fr' ? 'Détails de la demande' : 'Request Details'}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">{t('serialNumber')}:</span> <strong>{request.serial_number}</strong></div>
              <div><span className="text-gray-500">{t('model')}:</span> <strong>{request.model_name}</strong></div>
              <div><span className="text-gray-500">{t('serviceType')}:</span> <strong className="capitalize">{request.requested_service}</strong></div>
              <div><span className="text-gray-500">{t('urgency')}:</span> <strong className="capitalize">{request.urgency}</strong></div>
            </div>
            {request.problem_description && (
              <div className="mt-2 text-sm"><span className="text-gray-500">{t('problemDescription')}:</span> <p className="mt-1">{request.problem_description}</p></div>
            )}
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="font-semibold">{lang === 'fr' ? 'Tarification' : 'Pricing'}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('calibration')} (€)</label>
                <input type="number" value={form.calibration_price} onChange={e => setForm({...form, calibration_price: Number(e.target.value)})} className="input" />
              </div>
              <div>
                <label className="label">{t('parts')} (€)</label>
                <input type="number" value={form.parts_total} onChange={e => setForm({...form, parts_total: Number(e.target.value)})} className="input" />
              </div>
              <div>
                <label className="label">{t('labor')} ({t('hours')})</label>
                <input type="number" step="0.5" value={form.labor_hours} onChange={e => setForm({...form, labor_hours: Number(e.target.value)})} className="input" />
              </div>
              <div>
                <label className="label">{t('rate')} (€/h)</label>
                <input type="number" value={form.labor_rate} onChange={e => setForm({...form, labor_rate: Number(e.target.value)})} className="input" />
              </div>
              <div>
                <label className="label">{t('shipping')} (€)</label>
                <input type="number" value={form.shipping_cost} onChange={e => setForm({...form, shipping_cost: Number(e.target.value)})} className="input" />
              </div>
            </div>

            <div>
              <label className="label">{t('notes')}</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input min-h-[80px]" />
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between"><span className="text-gray-600">{t('totalHT')}:</span><span className="font-semibold">{subtotal.toFixed(2)} €</span></div>
            <div className="flex justify-between"><span className="text-gray-600">{t('tva')}:</span><span className="font-semibold">{tax.toFixed(2)} €</span></div>
            <div className="flex justify-between text-lg border-t pt-2"><span className="font-semibold">{t('totalTTC')}:</span><span className="font-bold text-lh-dark">{total.toFixed(2)} €</span></div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">{t('cancel')}</button>
          <button onClick={handleSend} disabled={sending} className="btn btn-success flex-1">{sending ? t('loading') : t('sendQuote')}</button>
        </div>
      </div>
    </div>
  );
}

function AdminClients({ companies, equipment, t, lang }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('clients')}</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(c => {
          const deviceCount = equipment.filter(e => e.company_id === c.id).length;
          const primaryContact = c.company_contacts?.find(ct => ct.is_primary) || c.company_contacts?.[0];
          return (
            <div key={c.id} className="card p-5 border-t-4 border-lh-blue hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-lh-dark">{c.name}</h3>
                <span className="badge bg-blue-100 text-blue-700">{deviceCount} {lang === 'fr' ? 'appareils' : 'devices'}</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {primaryContact && <p>👤 {primaryContact.full_name}</p>}
                <p>📧 {c.email || '-'}</p>
                <p>📞 {c.phone || '-'}</p>
                <p>📍 {c.billing_postal_code} {c.billing_city}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminEquipment({ equipment, t, lang }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('equipment')}</h1>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="th">{t('serialNumber')}</th>
            <th className="th">{t('model')}</th>
            <th className="th">{t('type')}</th>
            <th className="th">{t('company')}</th>
            <th className="th">{t('location')}</th>
          </tr></thead>
          <tbody className="divide-y">
            {equipment.map(eq => (
              <tr key={eq.id} className="hover:bg-gray-50">
                <td className="td font-mono font-semibold">{eq.serial_number}</td>
                <td className="td">{eq.model_name || '-'}</td>
                <td className="td">
                  <span className={`badge ${eq.equipment_type === 'biocollector' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                    {eq.equipment_type === 'biocollector' ? 'Bio' : 'Counter'}
                  </span>
                </td>
                <td className="td">{eq.companies?.name || '-'}</td>
                <td className="td text-gray-500">{eq.customer_location || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateQuotePage({ request, t, lang, models, onSave, setPage }) {
  return <div className="max-w-6xl mx-auto px-4 py-6"><p>Quote creation page - coming soon</p></div>;
}
