'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================
// STATUS DEFINITIONS
// ============================================
const STATUS_STYLES = {
  submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Nouvelle demande' },
  quote_sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Devis envoyé' },
  quote_approved: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Devis approuvé' },
  bc_review: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'BC à vérifier' },
  waiting_device: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attente appareil' },
  received: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Reçu' },
  in_queue: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'File attente' },
  calibration_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Étalonnage en cours' },
  repair_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Réparation en cours' },
  final_qc: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Contrôle final' },
  ready_to_ship: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Prêt à expédier' },
  shipped: { bg: 'bg-green-100', text: 'text-green-700', label: 'Expédié' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Terminé' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' }
};

// ============================================
// QUOTE TEMPLATES
// ============================================
const QUOTE_TEMPLATES = {
  particle_counter: {
    title: "Réglage, entretien et vérification d'étalonnage d'un compteur de particules",
    prestations: [
      "Vérification des fonctionnalités du compteur",
      "Vérification et réglage du débit",
      "Vérification de la cellule de mesure",
      "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
      "Vérification en nombre par comparaison à un étalon étalonné selon la norme ISO 17025, conformément à la norme ISO 21501-4",
      "Fourniture d'un rapport de test et de calibration"
    ],
    disclaimers: [
      "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.",
      "Un devis sera systématiquement établi si des pièces sont trouvées défectueuses et nécessitent un remplacement ou une réparation.",
      "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de maintenance. Vérifiez que vous les avez bien sauvegardés avant d'envoyer votre appareil.",
      "Les équipements envoyés pour calibration ou maintenance devront être décontaminés de toutes substances chimiques, bactériennes ou radioactives."
    ]
  },
  bio_collector: {
    title: "Vérification d'étalonnage d'un biocollecteur",
    prestations: [
      "Vérification et réglage du débit",
      "Vérification de la cellule d'impaction",
      "Fourniture d'un rapport de test et de calibration"
    ],
    disclaimers: [
      "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.",
      "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de maintenance.",
      "Les équipements envoyés pour calibration devront être décontaminés de toutes substances chimiques, bactériennes ou radioactives."
    ]
  },
  liquid_counter: {
    title: "Réglage, entretien et vérification d'étalonnage d'un compteur de particules liquides",
    prestations: [
      "Vérification des fonctionnalités du compteur",
      "Vérification et réglage du débit",
      "Vérification de la cellule de mesure",
      "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
      "Fourniture d'un rapport de test et de calibration"
    ],
    disclaimers: [
      "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.",
      "Un devis sera systématiquement établi si des pièces sont trouvées défectueuses.",
      "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de maintenance.",
      "Les équipements envoyés pour calibration devront être décontaminés de toutes substances chimiques, bactériennes ou radioactives."
    ]
  },
  repair: {
    title: "Devis de réparation",
    prestations: [
      "Diagnostic complet de l'appareil",
      "Remplacement des pièces défectueuses",
      "Tests de fonctionnement",
      "Vérification d'étalonnage post-réparation"
    ],
    disclaimers: [
      "Ce devis est valable 30 jours à compter de sa date d'émission.",
      "Les pièces remplacées restent la propriété de Lighthouse France.",
      "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de réparation."
    ]
  }
};

// ============================================
// DUMMY PRICE LIST (will be in database later)
// ============================================
const PRICE_LIST = [
  { code: 'CAL-PC-STD', description: 'Étalonnage annuel compteur de particules standard', model: 'Tous modèles', price: 630, category: 'calibration' },
  { code: 'CAL-PC-HH', description: 'Étalonnage annuel HandHeld 3016', model: 'HH 3016', price: 630, category: 'calibration' },
  { code: 'CAL-PC-APEX', description: 'Étalonnage annuel Apex série', model: 'Apex R2/R3/R5', price: 580, category: 'calibration' },
  { code: 'CAL-PC-SOLAIR', description: 'Étalonnage annuel Solair série', model: 'Solair 1100/3100', price: 650, category: 'calibration' },
  { code: 'CAL-BIO', description: 'Étalonnage biocollecteur', model: 'Bio collecteur', price: 330, category: 'calibration' },
  { code: 'CAL-LIQ', description: 'Étalonnage compteur liquide LS20', model: 'LS20', price: 1000, category: 'calibration' },
  { code: 'SVC-CLEAN', description: 'Nettoyage cellule', model: 'Tous', price: 150, category: 'service', unit: 'heure' },
  { code: 'SVC-DIAG', description: 'Diagnostic complet', model: 'Tous', price: 120, category: 'service' },
  { code: 'SHIP-FR', description: 'Frais de transport France', model: '-', price: 45, category: 'shipping' },
  { code: 'SHIP-EU', description: 'Frais de transport Europe', model: '-', price: 140, category: 'shipping' },
  { code: 'SHIP-INT', description: 'Frais de transport International', model: '-', price: 250, category: 'shipping' },
  { code: 'PART-PUMP', description: 'Pompe de remplacement', model: 'Divers', price: 450, category: 'parts' },
  { code: 'PART-LASER', description: 'Module laser', model: 'Divers', price: 1200, category: 'parts' },
  { code: 'PART-SENSOR', description: 'Capteur de débit', model: 'Divers', price: 280, category: 'parts' },
  { code: 'PART-BATT', description: 'Batterie', model: 'HandHeld', price: 180, category: 'parts' },
];

// ============================================
// MAIN APP COMPONENT
// ============================================
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

  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    const { data: reqs } = await supabase.from('service_requests')
      .select('*, companies(id, name, billing_address, billing_city, billing_postal_code), request_devices(*)')
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
  }, []);

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
  
  const sheets = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: '📊' },
    { id: 'requests', label: 'Demandes', icon: '📋' },
    { id: 'rmas', label: 'RMAs', icon: '🔧' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'settings', label: 'Paramètres', icon: '⚙️' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: '🔐' }] : [])
  ];

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin" /></div>;
  if (!user || !profile) return <LoginPage />;

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}
      <header className="bg-[#1a1a2e] text-white shadow-lg">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-[#00A651]">LIGHTHOUSE</div>
            <div className="text-sm text-gray-400">France • Admin Portal</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{profile?.full_name}</p>
              <p className="text-xs text-gray-400">{isAdmin ? '👑 Administrateur' : '👤 Employé'}</p>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm">Déconnexion</button>
          </div>
        </div>
      </header>
      <nav className="bg-[#1a1a2e] border-t border-gray-700">
        <div className="max-w-full mx-auto px-6 flex gap-1 overflow-x-auto">
          {sheets.map(sheet => (
            <button key={sheet.id} onClick={() => setActiveSheet(sheet.id)}
              className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${activeSheet === sheet.id ? 'bg-[#00A651] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              <span>{sheet.icon}</span>{sheet.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-full mx-auto p-6">
        {activeSheet === 'dashboard' && <DashboardSheet requests={requests} notify={notify} reload={loadData} />}
        {activeSheet === 'requests' && <RequestsSheet requests={requests} clients={clients} notify={notify} reload={loadData} profile={profile} />}
        {activeSheet === 'rmas' && <RMAsSheet requests={requests} notify={notify} reload={loadData} />}
        {activeSheet === 'clients' && <ClientsSheet clients={clients} requests={requests} />}
        {activeSheet === 'settings' && <SettingsSheet staffMembers={staffMembers} />}
        {activeSheet === 'admin' && isAdmin && <AdminSheet />}
      </main>
    </div>
  );
}

// ============================================
// LOGIN PAGE
// ============================================
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
      setError('Accès non autorisé.');
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
          <h1 className="text-3xl font-bold text-[#00A651]">LIGHTHOUSE</h1>
          <p className="text-gray-500 mt-2">France • Portail Administrateur</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 border rounded-lg" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full px-4 py-3 border rounded-lg" required />
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008f45] disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD SHEET
// ============================================
function DashboardSheet({ requests, notify, reload }) {
  const newRequests = requests.filter(r => r.status === 'submitted');
  const bcToReview = requests.filter(r => r.status === 'bc_review');
  const activeRMAs = requests.filter(r => r.request_number && !['completed', 'cancelled', 'submitted', 'quote_sent'].includes(r.status));
  const quoteSent = requests.filter(r => r.status === 'quote_sent');

  const stats = [
    { label: 'Nouvelles demandes', value: newRequests.length, color: 'bg-amber-500', icon: '📥' },
    { label: 'Devis en attente', value: quoteSent.length, color: 'bg-blue-500', icon: '💰' },
    { label: 'BC à vérifier', value: bcToReview.length, color: 'bg-red-500', icon: '⚠️' },
    { label: 'RMAs actifs', value: activeRMAs.length, color: 'bg-green-500', icon: '🔧' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord</h1>
        <button onClick={reload} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium">🔄 Actualiser</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`bg-white rounded-xl p-5 shadow-sm ${s.value > 0 && (s.label.includes('BC') || s.label.includes('Nouvelles')) ? 'ring-2 ring-red-400 animate-pulse' : ''}`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${s.color} rounded-xl flex items-center justify-center text-2xl text-white shadow-lg`}>{s.icon}</div>
              <div>
                <p className="text-3xl font-bold text-gray-800">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Requests Alert */}
      {newRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl">
          <div className="px-6 py-4 border-b border-amber-200 bg-amber-100 rounded-t-xl">
            <h2 className="font-bold text-amber-800 text-lg">📥 Nouvelles Demandes ({newRequests.length})</h2>
            <p className="text-sm text-amber-600">Créez un devis pour traiter ces demandes</p>
          </div>
          <div className="p-4 space-y-2">
            {newRequests.slice(0, 5).map(req => (
              <div key={req.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-lg">📋</div>
                  <div>
                    <p className="font-bold text-gray-800">{req.companies?.name}</p>
                    <p className="text-sm text-gray-500">{req.request_devices?.length || 1} appareil(s) • {req.requested_service}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-400">{new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BC to Review Alert */}
      {bcToReview.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl">
          <div className="px-6 py-4 border-b border-red-200 bg-red-100 rounded-t-xl">
            <h2 className="font-bold text-red-800 text-lg">⚠️ Bons de Commande à Vérifier ({bcToReview.length})</h2>
          </div>
          <div className="p-4 space-y-2">
            {bcToReview.map(rma => (
              <div key={rma.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-[#00A651]">{rma.request_number}</span>
                  <span className="text-gray-600">{rma.companies?.name}</span>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">À vérifier</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// REQUESTS SHEET - Where quotes are created
// ============================================
function RequestsSheet({ requests, clients, notify, reload, profile }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showQuoteEditor, setShowQuoteEditor] = useState(false);
  
  const newRequests = requests.filter(r => r.status === 'submitted');
  const quoteSent = requests.filter(r => r.status === 'quote_sent');
  const allRequests = requests.filter(r => ['submitted', 'quote_sent', 'quote_approved', 'bc_review'].includes(r.status));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Demandes</h1>
      </div>

      {/* New Requests - Need Quote */}
      {newRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-amber-50">
            <h2 className="font-bold text-amber-800">📥 Nouvelles Demandes - Créer Devis ({newRequests.length})</h2>
          </div>
          <div className="divide-y">
            {newRequests.map(req => (
              <div key={req.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-xl">📋</div>
                  <div>
                    <p className="font-bold text-gray-800">{req.companies?.name}</p>
                    <p className="text-sm text-gray-500">
                      {req.request_devices?.length || 1} appareil(s) • {req.requested_service === 'calibration' ? 'Étalonnage' : 'Réparation'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Soumis le {new Date(req.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedRequest(req); setShowQuoteEditor(true); }}
                  className="px-6 py-3 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-bold shadow-lg transition-all hover:shadow-xl"
                >
                  💰 Créer Devis
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quotes Sent - Waiting Response */}
      {quoteSent.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-blue-50">
            <h2 className="font-bold text-blue-800">💰 Devis Envoyés - En attente ({quoteSent.length})</h2>
          </div>
          <div className="divide-y">
            {quoteSent.map(req => (
              <div key={req.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">⏳</div>
                  <div>
                    <p className="font-bold text-gray-800">{req.companies?.name}</p>
                    <p className="text-sm text-gray-500">
                      {req.request_devices?.length || 1} appareil(s) • Total: <span className="font-bold text-[#00A651]">{req.quote_total?.toFixed(2)} € HT</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Devis envoyé le {req.quoted_at ? new Date(req.quoted_at).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">En attente client</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Requests Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Toutes les demandes ({allRequests.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Client</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Appareils</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Service</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Montant</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allRequests.map(req => {
                const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
                return (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{req.companies?.name}</td>
                    <td className="px-4 py-3 text-sm">{req.request_devices?.length || 1}</td>
                    <td className="px-4 py-3 text-sm">{req.requested_service === 'calibration' ? '🔬 Étalonnage' : '🔧 Réparation'}</td>
                    <td className="px-4 py-3 font-bold text-[#00A651]">{req.quote_total ? `${req.quote_total.toFixed(2)} €` : '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      {req.status === 'submitted' && (
                        <button onClick={() => { setSelectedRequest(req); setShowQuoteEditor(true); }} className="px-3 py-1 bg-[#00A651] text-white rounded text-sm">Créer Devis</button>
                      )}
                      {req.status === 'quote_sent' && (
                        <button onClick={() => { setSelectedRequest(req); setShowQuoteEditor(true); }} className="px-3 py-1 bg-gray-200 rounded text-sm">Voir Devis</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quote Editor Modal */}
      {showQuoteEditor && selectedRequest && (
        <QuoteEditorModal
          request={selectedRequest}
          onClose={() => { setShowQuoteEditor(false); setSelectedRequest(null); }}
          notify={notify}
          reload={reload}
          profile={profile}
        />
      )}
    </div>
  );
}

// ============================================
// QUOTE EDITOR MODAL - Full workflow
// ============================================
function QuoteEditorModal({ request, onClose, notify, reload, profile }) {
  const [step, setStep] = useState(1); // 1: Edit, 2: Preview, 3: Confirm Send
  const [templateType, setTemplateType] = useState('particle_counter');
  const [lineItems, setLineItems] = useState([]);
  const [customPrestations, setCustomPrestations] = useState([]);
  const [shipping, setShipping] = useState(45);
  const [includeShipping, setIncludeShipping] = useState(true);
  const [signatory, setSignatory] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [searchCode, setSearchCode] = useState('');

  const template = QUOTE_TEMPLATES[templateType];

  // Initialize line items from request devices
  useEffect(() => {
    if (request?.request_devices?.length > 0) {
      const items = request.request_devices.map((d, i) => {
        // Try to find matching price from price list
        const matchingPrice = PRICE_LIST.find(p => 
          p.model.toLowerCase().includes(d.model_name?.toLowerCase() || '') ||
          d.model_name?.toLowerCase().includes(p.model.toLowerCase())
        );
        return {
          id: i + 1,
          code: matchingPrice?.code || 'CAL-PC-STD',
          description: matchingPrice?.description || `Étalonnage annuel ${d.model_name}`,
          model: d.model_name,
          serial: d.serial_number,
          price: matchingPrice?.price || 630,
          qty: 1
        };
      });
      setLineItems(items);
    } else {
      setLineItems([{ id: 1, code: 'CAL-PC-STD', description: 'Étalonnage annuel', model: '', serial: '', price: 630, qty: 1 }]);
    }
    setCustomPrestations([...template.prestations]);
  }, [request, template.prestations]);

  // Add item from price list
  const addFromPriceList = (priceItem) => {
    setLineItems([...lineItems, {
      id: Date.now(),
      code: priceItem.code,
      description: priceItem.description,
      model: priceItem.model,
      serial: '',
      price: priceItem.price,
      qty: 1
    }]);
    setSearchCode('');
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal + (includeShipping ? shipping : 0);

  const filteredPriceList = PRICE_LIST.filter(p => 
    searchCode && (
      p.code.toLowerCase().includes(searchCode.toLowerCase()) ||
      p.description.toLowerCase().includes(searchCode.toLowerCase())
    )
  );

  const sendQuote = async () => {
    setSaving(true);
    
    // Generate RMA number
    const { data: lastRMA } = await supabase.from('service_requests').select('request_number').like('request_number', 'FR-%').order('request_number', { ascending: false }).limit(1);
    const lastNum = lastRMA?.[0]?.request_number ? parseInt(lastRMA[0].request_number.replace('FR-', '')) : 0;
    const rmaNumber = 'FR-' + String(lastNum + 1).padStart(5, '0');

    const { error } = await supabase.from('service_requests').update({
      request_number: rmaNumber,
      status: 'quote_sent',
      quoted_at: new Date().toISOString(),
      quote_total: total,
      quote_subtotal: subtotal,
      quote_shipping: includeShipping ? shipping : 0
    }).eq('id', request.id);

    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify(`✅ Devis envoyé! RMA: ${rmaNumber}`);
      reload();
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex" onClick={onClose}>
      <div className="bg-white w-full h-full md:w-[95%] md:h-[95%] md:m-auto md:rounded-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">
              {step === 1 && '✏️ Créer Devis'}
              {step === 2 && '👁️ Aperçu du Devis'}
              {step === 3 && '📧 Confirmer l\'envoi'}
            </h2>
            <p className="text-gray-300">{request.companies?.name} • {request.request_devices?.length || 1} appareil(s)</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Step indicators */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-[#00A651] text-white' : 'bg-gray-600 text-gray-400'}`}>{s}</div>
              ))}
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-3xl ml-4">&times;</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="p-6 space-y-6">
              {/* Template Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Type de prestation</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'particle_counter', label: 'Compteur Particules', icon: '🔬' },
                    { id: 'bio_collector', label: 'Biocollecteur', icon: '🧫' },
                    { id: 'liquid_counter', label: 'Compteur Liquide', icon: '💧' },
                    { id: 'repair', label: 'Réparation', icon: '🔧' }
                  ].map(t => (
                    <button key={t.id} onClick={() => { setTemplateType(t.id); setCustomPrestations([...QUOTE_TEMPLATES[t.id].prestations]); }}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${templateType === t.id ? 'border-[#00A651] bg-green-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-3xl mb-2">{t.icon}</div>
                      <div className="text-sm font-bold">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price List Search */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Ajouter depuis la liste de prix</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchCode}
                    onChange={e => setSearchCode(e.target.value)}
                    placeholder="Rechercher par code ou description..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#00A651] focus:outline-none"
                  />
                  {filteredPriceList.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-gray-200 rounded-xl mt-1 shadow-xl z-10 max-h-64 overflow-y-auto">
                      {filteredPriceList.map(p => (
                        <button key={p.code} onClick={() => addFromPriceList(p)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0">
                          <div>
                            <span className="font-mono text-sm text-[#00A651] mr-2">{p.code}</span>
                            <span className="text-gray-700">{p.description}</span>
                          </div>
                          <span className="font-bold">{p.price} €</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Lignes du devis</label>
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Code</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Modèle</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">N° Série</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-600">Prix HT</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-600">Qté</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-600">Total</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, i) => (
                        <tr key={item.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <input type="text" value={item.code} onChange={e => updateLineItem(item.id, 'code', e.target.value)}
                              className="w-full px-2 py-2 border rounded-lg text-sm font-mono" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                              className="w-full px-2 py-2 border rounded-lg text-sm" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={item.model} onChange={e => updateLineItem(item.id, 'model', e.target.value)}
                              className="w-full px-2 py-2 border rounded-lg text-sm" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={item.serial} onChange={e => updateLineItem(item.id, 'serial', e.target.value)}
                              className="w-full px-2 py-2 border rounded-lg text-sm" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={item.price} onChange={e => updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-2 border rounded-lg text-sm text-right" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={item.qty} onChange={e => updateLineItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-2 border rounded-lg text-sm text-center" min="1" />
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-[#00A651]">{(item.price * item.qty).toFixed(2)} €</td>
                          <td className="px-4 py-2">
                            <button onClick={() => removeLineItem(item.id)} className="text-red-500 hover:text-red-700 text-xl">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-gray-50 border-t">
                    <button onClick={() => setLineItems([...lineItems, { id: Date.now(), code: '', description: '', model: '', serial: '', price: 0, qty: 1 }])}
                      className="text-[#00A651] font-medium hover:underline">+ Ajouter une ligne</button>
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={includeShipping} onChange={e => setIncludeShipping(e.target.checked)} className="w-5 h-5 text-[#00A651] rounded" />
                  <span className="font-medium">Inclure frais de transport</span>
                </label>
                {includeShipping && (
                  <div className="flex items-center gap-2">
                    <input type="number" value={shipping} onChange={e => setShipping(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border rounded-lg text-right" />
                    <span className="text-gray-500">€</span>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl p-6">
                <div className="flex justify-end">
                  <div className="w-72 space-y-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Sous-total HT</span>
                      <span className="font-medium">{subtotal.toFixed(2)} €</span>
                    </div>
                    {includeShipping && (
                      <div className="flex justify-between text-gray-600">
                        <span>Transport forfaitaire</span>
                        <span className="font-medium">{shipping.toFixed(2)} €</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-300">
                      <span>Total HT</span>
                      <span className="text-[#00A651]">{total.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatory */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Signataire</label>
                <input type="text" value={signatory} onChange={e => setSignatory(e.target.value)}
                  className="w-72 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#00A651] focus:outline-none" />
              </div>
            </div>
          )}

          {step === 2 && (
            <QuotePreviewFull
              template={template}
              customPrestations={customPrestations}
              lineItems={lineItems}
              shipping={shipping}
              includeShipping={includeShipping}
              total={total}
              request={request}
              signatory={signatory}
            />
          )}

          {step === 3 && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="text-6xl mb-6">📧</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Confirmer l'envoi du devis</h3>
              <p className="text-gray-600 mb-2">Le devis sera envoyé à <strong>{request.companies?.name}</strong></p>
              <p className="text-3xl font-bold text-[#00A651] mb-8">{total.toFixed(2)} € HT</p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-lg text-center">
                <p className="text-blue-800">
                  Un numéro RMA sera automatiquement attribué et le client recevra une notification pour examiner et approuver le devis.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between items-center shrink-0">
          <button onClick={step === 1 ? onClose : () => setStep(step - 1)} className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-xl font-medium">
            {step === 1 ? 'Annuler' : '← Retour'}
          </button>
          <div className="flex gap-3">
            {step === 1 && (
              <button onClick={() => setStep(2)} disabled={lineItems.length === 0}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">
                👁️ Aperçu →
              </button>
            )}
            {step === 2 && (
              <button onClick={() => setStep(3)} className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold">
                📧 Préparer l'envoi →
              </button>
            )}
            {step === 3 && (
              <button onClick={sendQuote} disabled={saving} className="px-10 py-3 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl font-bold text-lg disabled:opacity-50 shadow-lg">
                {saving ? 'Envoi en cours...' : '✅ Envoyer le devis'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FULL QUOTE PREVIEW (PDF-like)
// ============================================
function QuotePreviewFull({ template, customPrestations, lineItems, shipping, includeShipping, total, request, signatory }) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  return (
    <div className="bg-gray-300 p-8 min-h-full">
      <div className="bg-white max-w-[210mm] mx-auto shadow-2xl" style={{ minHeight: '297mm' }}>
        {/* Page 1 */}
        <div className="p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">LIGHTHOUSE</h1>
              <p className="text-xl text-gray-500 font-light">FRANCE</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{request?.companies?.name}</p>
              <p className="text-gray-600">{request?.companies?.billing_address}</p>
              <p className="text-gray-600">{request?.companies?.billing_postal_code} {request?.companies?.billing_city}</p>
            </div>
          </div>

          {/* Reference */}
          <div className="mb-8">
            <p className="text-sm text-gray-600"><span className="font-semibold">Nos Réf. :</span> <span className="font-mono">N°RM/C/XXXX/X/26</span></p>
            <p className="text-sm text-gray-600">Créteil, le {today}</p>
          </div>

          {/* Title Box */}
          <div className="border-2 border-blue-500 rounded-lg p-5 mb-8 text-center bg-blue-50">
            <h2 className="text-blue-600 font-bold text-xl mb-1">Offre de prix</h2>
            <p className="text-blue-600 font-medium">{template.title}</p>
          </div>

          {/* Prestations */}
          <div className="mb-8">
            <h3 className="font-bold text-lg underline mb-4">Prestation :</h3>
            <ul className="space-y-3">
              {customPrestations.map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold">➤</span>
                  <span className="text-gray-700">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimers */}
          <div className="mb-8 space-y-3 text-sm text-gray-600 leading-relaxed">
            {template.disclaimers.map((d, i) => (
              <p key={i}>{d}</p>
            ))}
          </div>

          {/* Document link */}
          <div className="mb-8">
            <p className="font-semibold text-gray-700">Document à joindre avec votre envoi</p>
            <a href="#" className="text-blue-600 hover:underline text-sm">http://www.gometrologie.com/wp-content/uploads/Retour-Appareil.pdf</a>
          </div>

          {/* Equipment & Pricing */}
          {lineItems.length > 0 && lineItems[0].model && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold">
                <span className="underline">Matériel concerné</span> : {lineItems[0].model}
                {lineItems[0].serial && <span className="ml-6"><span className="underline">Numéro de série</span> : {lineItems[0].serial}</span>}
              </p>
            </div>
          )}

          <div className="mb-8">
            <p className="font-bold text-lg underline mb-4">Prix de la prestation :</p>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-blue-500">¤</span>
                  <span className="text-gray-700">{item.description} : </span>
                  <span className="font-bold">{item.price.toFixed(2)} € HT</span>
                  <span className="text-gray-500">par appareil</span>
                </div>
              ))}
              {includeShipping && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-blue-500">¤</span>
                  <span className="text-gray-700">Prix transport forfaitaire : </span>
                  <span className="font-bold">{shipping.toFixed(2)} € </span>
                  <span className="text-gray-500">par envoi</span>
                </div>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-8">
            <p className="text-xl font-bold text-green-800">
              Total avec forfait envoi : <span className="text-2xl">{total.toFixed(2)} € HT</span> par appareil
            </p>
          </div>

          {/* Payment terms */}
          <p className="mb-8 text-gray-700">Règlement à réception de facture</p>

          {/* Signatory */}
          <div className="mb-10">
            <p className="font-semibold text-lg">{signatory}</p>
            <p className="text-gray-600">Lighthouse France</p>
          </div>

          {/* Terms link */}
          <p className="text-sm text-gray-500 mb-10">
            Consultez nos conditions générales de vente sur notre site <span className="text-blue-600">www.gometrologie.com</span>
          </p>

          {/* CAPCERT Logo placeholder */}
          <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <span className="text-gray-400 text-xs text-center">CAPCERT<br/>Logo</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-blue-500 p-6 text-center bg-gray-50">
          <p className="font-bold text-blue-600 text-lg">Lighthouse France</p>
          <p className="text-blue-600">16, rue Paul Séjourné 94000 CRETEIL</p>
          <p className="text-blue-600">Tél. 01 43 77 28 07</p>
          <p className="text-gray-500 text-sm">salesfrance@golighthouse.com • www.gometrologie.com</p>
          <p className="text-gray-400 text-xs mt-2">Lighthouse France SAS au capital de 10 000 € • SIRET 501781348 • TVA FR86501781348</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// RMAs SHEET
// ============================================
function RMAsSheet({ requests, notify, reload }) {
  const [selectedRMA, setSelectedRMA] = useState(null);
  const activeRMAs = requests.filter(r => r.request_number && !['completed', 'cancelled', 'submitted', 'quote_sent'].includes(r.status));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">RMAs Actifs ({activeRMAs.length})</h1>
      
      <div className="bg-white rounded-xl shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMA</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Client</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Appareils</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Montant</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {activeRMAs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun RMA actif</td></tr>
            ) : activeRMAs.map(rma => {
              const style = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;
              return (
                <tr key={rma.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-[#00A651]">{rma.request_number}</td>
                  <td className="px-4 py-3 font-medium">{rma.companies?.name}</td>
                  <td className="px-4 py-3">{rma.request_devices?.length || 1}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span></td>
                  <td className="px-4 py-3 font-bold">{rma.quote_total?.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedRMA(rma)} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm">Détails</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRMA && <RMADetailModal rma={selectedRMA} onClose={() => setSelectedRMA(null)} notify={notify} reload={reload} />}
    </div>
  );
}

function RMADetailModal({ rma, onClose, notify, reload }) {
  const [saving, setSaving] = useState(false);
  const style = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;

  const updateStatus = async (newStatus) => {
    setSaving(true);
    const { error } = await supabase.from('service_requests').update({ status: newStatus }).eq('id', rma.id);
    if (error) notify('Erreur: ' + error.message, 'error'); else { notify('Statut mis à jour!'); reload(); }
    setSaving(false);
  };

  const approveBC = async () => {
    setSaving(true);
    const { error } = await supabase.from('service_requests').update({ 
      status: 'waiting_device', 
      bc_approved_at: new Date().toISOString() 
    }).eq('id', rma.id);
    if (error) notify('Erreur: ' + error.message, 'error'); else { notify('BC approuvé!'); reload(); onClose(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl m-auto rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 bg-[#1a1a2e] text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{rma.request_number}</h2>
            <p className="text-gray-300">{rma.companies?.name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>{style.label}</span>
        </div>
        <div className="p-6 space-y-6">
          {/* BC Review */}
          {rma.status === 'bc_review' && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <h3 className="font-bold text-red-800 mb-3">⚠️ Bon de Commande à vérifier</h3>
              {rma.bc_file_url && (
                <a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-white rounded-lg text-blue-600 hover:bg-blue-50 mb-3">📄 Voir le document BC</a>
              )}
              {rma.bc_signature_url && (
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-500 mb-2">Signature:</p>
                  <img src={rma.bc_signature_url} alt="Signature" className="max-h-20 border rounded" />
                </div>
              )}
              <button onClick={approveBC} disabled={saving} className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50">
                {saving ? '...' : '✅ Approuver BC'}
              </button>
            </div>
          )}

          {/* Status Update */}
          <div>
            <h3 className="font-bold mb-3">Mettre à jour le statut</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_STYLES).filter(([key]) => !['submitted', 'quote_sent'].includes(key)).map(([key, val]) => (
                <button key={key} onClick={() => updateStatus(key)} disabled={saving || key === rma.status}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${val.bg} ${val.text} ${key === rma.status ? 'ring-2 ring-offset-2' : 'hover:opacity-80'} disabled:opacity-50`}>
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="font-bold mb-3">Documents</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Devis</p>
                <p className="font-medium">{rma.quote_url ? '✅ Disponible' : '—'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Bon de commande</p>
                <p className="font-medium">{rma.bc_file_url ? '✅ Reçu' : '—'}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-100 border-t">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg">Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CLIENTS SHEET
// ============================================
function ClientsSheet({ clients, requests }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Clients ({clients.length})</h1>
      <div className="bg-white rounded-xl shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Entreprise</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Ville</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMAs</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Contacts</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map(c => {
              const rmaCount = requests.filter(r => r.company_id === c.id && r.request_number).length;
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.billing_city || '—'}</td>
                  <td className="px-4 py-3">{rmaCount}</td>
                  <td className="px-4 py-3">{c.profiles?.length || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// SETTINGS SHEET
// ============================================
function SettingsSheet({ staffMembers }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Paramètres</h1>
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b"><h2 className="font-bold">Équipe Lighthouse</h2></div>
        <div className="p-6 space-y-3">
          {staffMembers.map(m => (
            <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#00A651] text-white flex items-center justify-center font-bold text-lg">{m.full_name?.charAt(0)}</div>
                <div><p className="font-medium">{m.full_name}</p><p className="text-sm text-gray-500">{m.email}</p></div>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${m.role === 'lh_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200'}`}>
                {m.role === 'lh_admin' ? '👑 Admin' : '👤 Employé'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// ADMIN SHEET
// ============================================
function AdminSheet() {
  const [showPriceList, setShowPriceList] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🔐 Administration</h1>
      
      <div className="grid md:grid-cols-3 gap-4">
        <div onClick={() => setShowPriceList(true)} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg cursor-pointer transition-shadow">
          <div className="text-4xl mb-4">💰</div>
          <h3 className="font-bold text-lg">Liste de Prix</h3>
          <p className="text-sm text-gray-500">Gérer les tarifs des services</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg cursor-pointer transition-shadow">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="font-bold text-lg">Templates Devis</h3>
          <p className="text-sm text-gray-500">Modifier les modèles de devis</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg cursor-pointer transition-shadow">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="font-bold text-lg">Utilisateurs</h3>
          <p className="text-sm text-gray-500">Gérer les accès</p>
        </div>
      </div>

      {/* Price List Modal */}
      {showPriceList && (
        <div className="fixed inset-0 z-50 bg-black/50 flex" onClick={() => setShowPriceList(false)}>
          <div className="bg-white w-full max-w-5xl m-auto rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-[#1a1a2e] text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">💰 Liste de Prix</h2>
              <button onClick={() => setShowPriceList(false)} className="text-white/70 hover:text-white text-2xl">&times;</button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Modèle</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Catégorie</th>
                    <th className="px-4 py-3 text-right text-sm font-bold">Prix HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {PRICE_LIST.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-[#00A651]">{p.code}</td>
                      <td className="px-4 py-3">{p.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.model}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          p.category === 'calibration' ? 'bg-blue-100 text-blue-700' :
                          p.category === 'service' ? 'bg-green-100 text-green-700' :
                          p.category === 'shipping' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{p.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{p.price.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-gray-100 border-t flex justify-between">
              <p className="text-sm text-gray-500">💡 Ces prix seront stockés en base de données ultérieurement</p>
              <button onClick={() => setShowPriceList(false)} className="px-4 py-2 bg-gray-300 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
