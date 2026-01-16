'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const STATUS_STYLES = {
  submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Nouvelle demande' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'RMA Créé' },
  waiting_bc: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attente BC' },
  bc_review: { bg: 'bg-orange-100', text: 'text-orange-700', label: '⚠️ BC à vérifier' },
  waiting_device: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Attente Appareil' },
  received: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Reçu' },
  in_queue: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'File attente' },
  calibration_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Étalonnage' },
  repair_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Réparation' },
  quote_sent: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Devis envoyé' },
  quote_approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Devis approuvé' },
  final_qc: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Contrôle final' },
  ready_to_ship: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Prêt à expédier' },
  shipped: { bg: 'bg-green-100', text: 'text-green-700', label: 'Expédié' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Terminé' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' }
};

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
      "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de réparation.",
      "Les équipements envoyés pour réparation devront être décontaminés de toutes substances chimiques, bactériennes ou radioactives."
    ]
  }
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
    { id: 'quotes', label: 'Devis', icon: '💰' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'contracts', label: 'Contrats', icon: '📄' },
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
              className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap ${activeSheet === sheet.id ? 'bg-[#00A651] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              <span>{sheet.icon}</span>{sheet.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-full mx-auto p-6">
        {activeSheet === 'dashboard' && <DashboardSheet requests={requests} notify={notify} reload={loadData} isAdmin={isAdmin} />}
        {activeSheet === 'requests' && <RequestsSheet requests={requests} notify={notify} reload={loadData} />}
        {activeSheet === 'quotes' && <QuotesSheet requests={requests} clients={clients} notify={notify} reload={loadData} profile={profile} />}
        {activeSheet === 'clients' && <ClientsSheet clients={clients} requests={requests} equipment={equipment} notify={notify} reload={loadData} isAdmin={isAdmin} />}
        {activeSheet === 'contracts' && <ContractsSheet />}
        {activeSheet === 'settings' && <SettingsSheet staffMembers={staffMembers} />}
        {activeSheet === 'admin' && isAdmin && <AdminSheet />}
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

// ========== QUOTES SHEET ==========
function QuotesSheet({ requests, clients, notify, reload, profile }) {
  const [showEditor, setShowEditor] = useState(false);
  const [selectedRMA, setSelectedRMA] = useState(null);
  
  const rmasWithQuotes = requests.filter(r => r.quote_total || r.quoted_at);
  const rmasWithoutQuotes = requests.filter(r => r.request_number && !r.quote_total && !r.quoted_at && !['completed', 'cancelled'].includes(r.status));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Devis</h1>
        <button onClick={() => setShowEditor(true)} className="px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium">+ Nouveau Devis</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-2xl text-white">💰</div>
            <div><p className="text-2xl font-bold">{rmasWithQuotes.length}</p><p className="text-sm text-gray-500">Devis créés</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center text-2xl text-white">⏳</div>
            <div><p className="text-2xl font-bold">{requests.filter(r => r.status === 'quote_sent').length}</p><p className="text-sm text-gray-500">En attente</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl text-white">✓</div>
            <div><p className="text-2xl font-bold">{requests.filter(r => r.status === 'quote_approved').length}</p><p className="text-sm text-gray-500">Approuvés</p></div>
          </div>
        </div>
      </div>

      {/* RMAs without quotes */}
      {rmasWithoutQuotes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl">
          <div className="px-6 py-4 border-b border-amber-200"><h2 className="font-bold text-amber-800">RMAs sans devis ({rmasWithoutQuotes.length})</h2></div>
          <div className="p-4 space-y-2">
            {rmasWithoutQuotes.map(rma => (
              <div key={rma.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-[#00A651]">{rma.request_number}</span>
                  <span>{rma.companies?.name}</span>
                  <span className="text-sm text-gray-400">{rma.request_devices?.length || 1} appareil(s)</span>
                </div>
                <button onClick={() => { setSelectedRMA(rma); setShowEditor(true); }} className="px-4 py-2 bg-[#00A651] text-white rounded-lg text-sm">Créer Devis</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quotes table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b"><h2 className="font-bold">Devis Récents</h2></div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMA</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Client</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Montant HT</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Date</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rmasWithQuotes.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun devis</td></tr>
            ) : rmasWithQuotes.map(rma => (
              <tr key={rma.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-[#00A651]">{rma.request_number}</td>
                <td className="px-4 py-3">{rma.companies?.name}</td>
                <td className="px-4 py-3 font-bold">{rma.quote_total?.toFixed(2)} €</td>
                <td className="px-4 py-3">
                  {rma.status === 'quote_sent' && <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">En attente</span>}
                  {rma.status === 'quote_approved' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Approuvé</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{rma.quoted_at ? new Date(rma.quoted_at).toLocaleDateString('fr-FR') : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setSelectedRMA(rma); setShowEditor(true); }} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditor && <QuoteEditor rma={selectedRMA} requests={requests} onClose={() => { setShowEditor(false); setSelectedRMA(null); }} notify={notify} reload={reload} profile={profile} />}
    </div>
  );
}

// ========== QUOTE EDITOR ==========
function QuoteEditor({ rma, requests, onClose, notify, reload, profile }) {
  const [selectedRMA, setSelectedRMA] = useState(rma);
  const [templateType, setTemplateType] = useState('particle_counter');
  const [lineItems, setLineItems] = useState([{ id: 1, description: 'Étalonnage annuel', model: '', serial: '', price: 630, qty: 1 }]);
  const [shipping, setShipping] = useState(45);
  const [includeShipping, setIncludeShipping] = useState(true);
  const [signatory, setSignatory] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const template = QUOTE_TEMPLATES[templateType];
  
  useEffect(() => {
    if (selectedRMA?.request_devices?.length > 0) {
      const items = selectedRMA.request_devices.map((d, i) => ({
        id: i + 1,
        description: `Étalonnage annuel ${d.model_name}`,
        model: d.model_name,
        serial: d.serial_number,
        price: 630,
        qty: 1
      }));
      setLineItems(items);
    }
  }, [selectedRMA]);

  const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal + (includeShipping ? shipping : 0);

  const saveQuote = async (send = false) => {
    if (!selectedRMA) { notify('Sélectionnez un RMA', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('service_requests').update({
      quoted_at: new Date().toISOString(),
      quote_total: total,
      quote_subtotal: subtotal,
      quote_shipping: includeShipping ? shipping : 0,
      status: send ? 'quote_sent' : selectedRMA.status
    }).eq('id', selectedRMA.id);
    if (error) notify('Erreur: ' + error.message, 'error');
    else { notify(send ? 'Devis envoyé!' : 'Devis enregistré!'); reload(); if (send) onClose(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex" onClick={onClose}>
      <div className="bg-white w-full max-w-6xl m-auto rounded-xl overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 bg-gradient-to-r from-[#00A651] to-[#008f45] text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{selectedRMA ? `Devis - ${selectedRMA.request_number}` : 'Nouveau Devis'}</h2>
            <p className="text-green-100">{selectedRMA?.companies?.name || 'Sélectionnez un RMA'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPreview(!showPreview)} className="px-4 py-2 bg-white/20 rounded-lg text-sm">{showPreview ? '✏️ Éditer' : '👁️ Aperçu'}</button>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">&times;</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showPreview ? (
            <QuotePreview template={template} lineItems={lineItems} shipping={shipping} includeShipping={includeShipping} total={total} rma={selectedRMA} signatory={signatory} />
          ) : (
            <div className="p-6 space-y-6">
              {/* RMA Selection */}
              {!rma && (
                <div>
                  <label className="block text-sm font-medium mb-2">RMA</label>
                  <select value={selectedRMA?.id || ''} onChange={e => setSelectedRMA(requests.find(r => r.id === e.target.value))} className="w-full px-4 py-3 border rounded-lg">
                    <option value="">-- Choisir --</option>
                    {requests.filter(r => r.request_number && !r.quote_total).map(r => (
                      <option key={r.id} value={r.id}>{r.request_number} - {r.companies?.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Template */}
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'particle_counter', label: 'Compteur Particules', icon: '🔬' },
                    { id: 'bio_collector', label: 'Biocollecteur', icon: '🧫' },
                    { id: 'liquid_counter', label: 'Compteur Liquide', icon: '💧' },
                    { id: 'repair', label: 'Réparation', icon: '🔧' }
                  ].map(t => (
                    <button key={t.id} onClick={() => setTemplateType(t.id)} className={`p-4 rounded-lg border-2 text-center ${templateType === t.id ? 'border-[#00A651] bg-green-50' : 'border-gray-200'}`}>
                      <div className="text-2xl mb-1">{t.icon}</div>
                      <div className="text-sm font-medium">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-sm font-medium mb-2">Tarification</label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm">Description</th>
                        <th className="px-4 py-2 text-left text-sm">Modèle</th>
                        <th className="px-4 py-2 text-left text-sm">N° Série</th>
                        <th className="px-4 py-2 text-right text-sm">Prix HT</th>
                        <th className="px-4 py-2 text-center text-sm">Qté</th>
                        <th className="px-4 py-2 text-right text-sm">Total</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, i) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-2"><input type="text" value={item.description} onChange={e => { const n = [...lineItems]; n[i].description = e.target.value; setLineItems(n); }} className="w-full px-2 py-1 border rounded text-sm" /></td>
                          <td className="px-4 py-2"><input type="text" value={item.model} onChange={e => { const n = [...lineItems]; n[i].model = e.target.value; setLineItems(n); }} className="w-full px-2 py-1 border rounded text-sm" /></td>
                          <td className="px-4 py-2"><input type="text" value={item.serial} onChange={e => { const n = [...lineItems]; n[i].serial = e.target.value; setLineItems(n); }} className="w-full px-2 py-1 border rounded text-sm" /></td>
                          <td className="px-4 py-2"><input type="number" value={item.price} onChange={e => { const n = [...lineItems]; n[i].price = parseFloat(e.target.value) || 0; setLineItems(n); }} className="w-20 px-2 py-1 border rounded text-sm text-right" /></td>
                          <td className="px-4 py-2"><input type="number" value={item.qty} onChange={e => { const n = [...lineItems]; n[i].qty = parseInt(e.target.value) || 1; setLineItems(n); }} className="w-14 px-2 py-1 border rounded text-sm text-center" min="1" /></td>
                          <td className="px-4 py-2 text-right font-medium">{(item.price * item.qty).toFixed(2)} €</td>
                          <td className="px-4 py-2"><button onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))} className="text-red-500">✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-gray-50 border-t">
                    <button onClick={() => setLineItems([...lineItems, { id: Date.now(), description: '', model: '', serial: '', price: 0, qty: 1 }])} className="text-sm text-[#00A651]">+ Ajouter ligne</button>
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={includeShipping} onChange={e => setIncludeShipping(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Frais de transport</span>
                </label>
                {includeShipping && <input type="number" value={shipping} onChange={e => setShipping(parseFloat(e.target.value) || 0)} className="w-24 px-3 py-2 border rounded-lg text-sm" />}
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm"><span>Sous-total HT</span><span>{subtotal.toFixed(2)} €</span></div>
                    {includeShipping && <div className="flex justify-between text-sm"><span>Transport</span><span>{shipping.toFixed(2)} €</span></div>}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total HT</span><span className="text-[#00A651]">{total.toFixed(2)} €</span></div>
                  </div>
                </div>
              </div>

              {/* Signatory */}
              <div>
                <label className="block text-sm font-medium mb-2">Signataire</label>
                <input type="text" value={signatory} onChange={e => setSignatory(e.target.value)} className="w-64 px-4 py-3 border rounded-lg" />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between">
          <button onClick={onClose} className="px-6 py-2 bg-gray-300 rounded-lg">Annuler</button>
          <div className="flex gap-3">
            <button onClick={() => saveQuote(false)} disabled={saving || !selectedRMA} className="px-6 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50">{saving ? '...' : '💾 Enregistrer'}</button>
            <button onClick={() => saveQuote(true)} disabled={saving || !selectedRMA} className="px-8 py-2 bg-[#00A651] text-white rounded-lg font-bold disabled:opacity-50">{saving ? '...' : '📧 Envoyer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== QUOTE PREVIEW ==========
function QuotePreview({ template, lineItems, shipping, includeShipping, total, rma, signatory }) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  return (
    <div className="bg-gray-200 p-8">
      <div className="bg-white max-w-[210mm] mx-auto shadow-xl p-12" style={{ minHeight: '297mm' }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">LIGHTHOUSE</h1>
            <p className="text-lg text-gray-600">FRANCE</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">{rma?.companies?.name}</p>
            <p>{rma?.companies?.billing_address}</p>
            <p>{rma?.companies?.billing_postal_code} {rma?.companies?.billing_city}</p>
          </div>
        </div>

        <div className="mb-6 text-sm">
          <p><strong>Nos Réf. :</strong> {rma?.request_number}</p>
          <p>Créteil, le {today}</p>
        </div>

        {/* Title Box */}
        <div className="border-2 border-blue-400 rounded p-4 mb-6 text-center">
          <h2 className="text-blue-600 font-bold text-lg">Offre de prix</h2>
          <p className="text-blue-600">{template.title}</p>
        </div>

        {/* Prestations */}
        <div className="mb-6">
          <h3 className="font-bold underline mb-3">Prestation :</h3>
          <ul className="space-y-2">
            {template.prestations.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-blue-600">➤</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimers */}
        <div className="mb-6 text-sm space-y-2 text-gray-700">
          {template.disclaimers.map((d, i) => <p key={i}>{d}</p>)}
        </div>

        {/* Equipment & Pricing */}
        {lineItems[0]?.model && (
          <p className="mb-4 font-medium">
            <span className="underline">Matériel concerné</span> : {lineItems[0].model}
            {lineItems[0].serial && <span className="ml-4"><span className="underline">N° de série</span> : {lineItems[0].serial}</span>}
          </p>
        )}

        <div className="mb-6">
          <p className="font-medium underline mb-2">Prix de la prestation :</p>
          <ul className="space-y-1 text-sm">
            {lineItems.map((item, i) => (
              <li key={i}>¤ {item.description} : <strong>{item.price.toFixed(2)} € HT</strong> par appareil</li>
            ))}
            {includeShipping && <li>¤ Prix transport forfaitaire : {shipping.toFixed(2)} € par envoi</li>}
          </ul>
        </div>

        <p className="font-bold text-lg mb-6">Total avec forfait envoi : {total.toFixed(2)} € HT par appareil</p>
        <p className="mb-6 text-sm">Règlement à réception de facture</p>

        <div className="mb-8">
          <p className="font-medium">{signatory}</p>
          <p className="text-sm text-gray-600">Lighthouse France</p>
        </div>

        <p className="text-sm text-gray-600 mb-8">Consultez nos conditions générales de vente sur notre site <span className="text-blue-600">www.gometrologie.com</span></p>

        {/* CAPCERT placeholder */}
        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs mb-8">CAPCERT</div>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-sm text-blue-600">
          <p className="font-bold">Lighthouse France</p>
          <p>16, rue Paul Séjourné 94000 CRETEIL • Tél. 01 43 77 28 07</p>
          <p className="text-xs text-gray-500">Lighthouse France SAS SIRET 501781348 TVA FR86501781348</p>
        </div>
      </div>
    </div>
  );
}

// ========== DASHBOARD ==========
function DashboardSheet({ requests, notify, reload }) {
  const [reviewingBC, setReviewingBC] = useState(null);
  const activeRMAs = requests.filter(r => r.request_number && !['completed', 'cancelled'].includes(r.status));
  const needsReview = requests.filter(r => r.status === 'bc_review' || ((r.bc_file_url || r.bc_signature_url) && r.status === 'waiting_bc'));

  const stats = [
    { label: 'RMAs Actifs', value: activeRMAs.length, color: 'bg-blue-500', icon: '📋' },
    { label: 'BC à vérifier', value: needsReview.length, color: 'bg-red-500', icon: '⚠️' },
    { label: 'En attente', value: activeRMAs.filter(r => ['approved', 'waiting_bc', 'waiting_device'].includes(r.status)).length, color: 'bg-amber-500', icon: '⏳' },
    { label: 'En cours', value: activeRMAs.filter(r => ['calibration_in_progress', 'repair_in_progress'].includes(r.status)).length, color: 'bg-indigo-500', icon: '🔧' },
    { label: 'Prêts', value: activeRMAs.filter(r => ['final_qc', 'ready_to_ship'].includes(r.status)).length, color: 'bg-green-500', icon: '✅' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tableau de Bord</h1>
        <button onClick={reload} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">🔄 Actualiser</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`bg-white rounded-xl p-4 shadow-sm ${s.value > 0 && s.label === 'BC à vérifier' ? 'ring-2 ring-red-500' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${s.color} rounded-lg flex items-center justify-center text-2xl text-white`}>{s.icon}</div>
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-sm text-gray-500">{s.label}</p></div>
            </div>
          </div>
        ))}
      </div>

      {needsReview.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl">
          <div className="px-6 py-4 border-b border-red-200 bg-red-100"><h2 className="font-bold text-red-800">⚠️ BC à Vérifier ({needsReview.length})</h2></div>
          <div className="p-4 space-y-2">
            {needsReview.map(rma => (
              <div key={rma.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-[#00A651]">{rma.request_number}</span>
                  <span>{rma.companies?.name}</span>
                </div>
                <button onClick={() => setReviewingBC(rma)} className="px-4 py-2 bg-red-500 text-white rounded-lg">Examiner</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b"><h2 className="font-bold">RMAs Actifs ({activeRMAs.length})</h2></div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMA</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Client</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {activeRMAs.slice(0, 10).map(rma => {
              const s = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;
              return (
                <tr key={rma.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-[#00A651]">{rma.request_number}</td>
                  <td className="px-4 py-3">{rma.companies?.name}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${s.bg} ${s.text}`}>{s.label}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(rma.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reviewingBC && <BCReviewModal rma={reviewingBC} onClose={() => setReviewingBC(null)} notify={notify} reload={reload} />}
    </div>
  );
}

function BCReviewModal({ rma, onClose, notify, reload }) {
  const [approving, setApproving] = useState(false);
  const approveBC = async () => {
    setApproving(true);
    const { error } = await supabase.from('service_requests').update({ status: 'waiting_device', bc_approved_at: new Date().toISOString() }).eq('id', rma.id);
    if (error) notify('Erreur: ' + error.message, 'error'); else { notify('BC approuvé!'); reload(); onClose(); }
    setApproving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl m-auto rounded-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 bg-red-500 text-white flex justify-between">
          <h2 className="font-bold">Vérification BC - {rma.request_number}</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="p-6">
          <p className="mb-4"><strong>Client:</strong> {rma.companies?.name}</p>
          {rma.bc_file_url && <a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer" className="block p-4 bg-blue-50 text-blue-600 rounded-lg mb-4">📄 Voir le document BC</a>}
          {rma.bc_signature_url && <div><p className="text-sm text-gray-500 mb-2">Signature:</p><img src={rma.bc_signature_url} alt="Signature" className="max-h-24 border rounded" /></div>}
        </div>
        <div className="px-6 py-4 bg-gray-100 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-lg">Annuler</button>
          <button onClick={approveBC} disabled={approving} className="px-6 py-2 bg-green-500 text-white rounded-lg font-bold disabled:opacity-50">{approving ? '...' : '✅ Approuver'}</button>
        </div>
      </div>
    </div>
  );
}

// ========== REQUESTS ==========
function RequestsSheet({ requests, notify, reload }) {
  const pending = requests.filter(r => r.status === 'submitted' && !r.request_number);
  
  const approve = async (req) => {
    const { data } = await supabase.from('service_requests').select('request_number').like('request_number', 'FR-%').order('request_number', { ascending: false }).limit(1);
    const lastNum = data?.[0]?.request_number ? parseInt(data[0].request_number.replace('FR-', '')) : 0;
    const rmaNumber = 'FR-' + String(lastNum + 1).padStart(5, '0');
    const { error } = await supabase.from('service_requests').update({ request_number: rmaNumber, status: 'approved', approved_at: new Date().toISOString() }).eq('id', req.id);
    if (error) notify('Erreur: ' + error.message, 'error'); else { notify(`RMA ${rmaNumber} créé!`); reload(); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Demandes</h1>
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="font-bold text-amber-800 mb-3">⏳ En attente d'approbation ({pending.length})</h2>
          {pending.map(req => (
            <div key={req.id} className="flex items-center justify-between p-3 bg-white rounded-lg mb-2">
              <div><span className="font-medium">{req.companies?.name}</span> <span className="text-sm text-gray-500">• {req.request_devices?.length || 1} appareil(s)</span></div>
              <button onClick={() => approve(req)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">✓ Approuver</button>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b"><h2 className="font-bold">Toutes les demandes ({requests.length})</h2></div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold">RMA</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Client</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {requests.map(req => {
              const s = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
              return (
                <tr key={req.id}>
                  <td className="px-4 py-3 font-mono font-bold text-[#00A651]">{req.request_number || 'Nouvelle'}</td>
                  <td className="px-4 py-3">{req.companies?.name}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${s.bg} ${s.text}`}>{s.label}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== CLIENTS ==========
function ClientsSheet({ clients, requests }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clients ({clients.length})</h1>
      <div className="bg-white rounded-xl shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold">Entreprise</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Ville</th>
              <th className="px-4 py-3 text-left text-sm font-bold">RMAs</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map(c => {
              const count = requests.filter(r => r.company_id === c.id).length;
              return (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(c)}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.billing_city || '—'}</td>
                  <td className="px-4 py-3">{count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-lg m-auto rounded-xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{selected.name}</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Adresse:</strong> {selected.billing_address || '—'}</p>
              <p><strong>Ville:</strong> {selected.billing_postal_code} {selected.billing_city}</p>
              <p><strong>SIRET:</strong> {selected.siret || '—'}</p>
            </div>
            <button onClick={() => setSelected(null)} className="mt-6 px-4 py-2 bg-gray-200 rounded-lg">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractsSheet() {
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Contrats</h1><div className="bg-white rounded-xl p-8 text-center text-gray-400"><p className="text-4xl mb-4">📄</p><p>Module Contrats - À venir</p></div></div>;
}

function SettingsSheet({ staffMembers }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b"><h2 className="font-bold">Équipe Lighthouse</h2></div>
        <div className="p-6 space-y-3">
          {staffMembers.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00A651] text-white flex items-center justify-center font-bold">{m.full_name?.charAt(0)}</div>
                <div><p className="font-medium">{m.full_name}</p><p className="text-sm text-gray-500">{m.email}</p></div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${m.role === 'lh_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>{m.role === 'lh_admin' ? '👑 Admin' : '👤 Employé'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminSheet() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🔐 Administration</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md cursor-pointer"><div className="text-3xl mb-3">💰</div><h3 className="font-bold">Tarification</h3><p className="text-sm text-gray-500">Gérer les prix</p></div>
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md cursor-pointer"><div className="text-3xl mb-3">🔑</div><h3 className="font-bold">Permissions</h3><p className="text-sm text-gray-500">Accès employés</p></div>
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md cursor-pointer"><div className="text-3xl mb-3">⚙️</div><h3 className="font-bold">Système</h3><p className="text-sm text-gray-500">Configuration</p></div>
      </div>
    </div>
  );
}
