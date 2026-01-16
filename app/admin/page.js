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
      "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de réparation."
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
      .select('*, companies(id, name, billing_address, billing_city, billing_postal_code, billing_country, siret, vat_number, phone), profiles!service_requests_submitted_by_fkey(full_name, email, phone), request_devices(*), shipping_addresses(*)')
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
        {activeSheet === 'requests' && <RequestsSheet requests={requests} clients={clients} notify={notify} reload={loadData} profile={profile} />}
        {activeSheet === 'clients' && <ClientsSheet clients={clients} requests={requests} equipment={equipment} notify={notify} reload={loadData} isAdmin={isAdmin} />}
        {activeSheet === 'contracts' && <ContractsSheet clients={clients} notify={notify} />}
        {activeSheet === 'settings' && <SettingsSheet profile={profile} staffMembers={staffMembers} notify={notify} reload={loadData} />}
        {activeSheet === 'admin' && isAdmin && <AdminSheet profile={profile} staffMembers={staffMembers} notify={notify} reload={loadData} />}
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
      setError('Accès non autorisé. Ce portail est réservé au personnel Lighthouse.');
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008f45] disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-6">Accès réservé au personnel Lighthouse France</p>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD - EXACTLY AS ORIGINAL
// ============================================
function DashboardSheet({ requests, notify, reload, isAdmin }) {
  const [selectedRMA, setSelectedRMA] = useState(null);
  const [reviewingBC, setReviewingBC] = useState(null);
  
  const activeRMAs = requests.filter(r => r.request_number && !['completed', 'cancelled'].includes(r.status));
  const needsReview = requests.filter(r => 
    r.status === 'bc_review' || 
    ((r.bc_file_url || r.bc_signature_url) && r.status === 'waiting_bc')
  );
  
  const byStatus = {
    waiting: activeRMAs.filter(r => ['approved', 'waiting_bc', 'waiting_device'].includes(r.status) && !needsReview.find(n => n.id === r.id)),
    received: activeRMAs.filter(r => ['received', 'in_queue'].includes(r.status)),
    inProgress: activeRMAs.filter(r => ['calibration_in_progress', 'repair_in_progress', 'quote_sent'].includes(r.status)),
    ready: activeRMAs.filter(r => ['final_qc', 'ready_to_ship'].includes(r.status)),
    shipped: activeRMAs.filter(r => r.status === 'shipped')
  };
  
  const stats = [
    { label: 'RMAs Actifs', value: activeRMAs.length, color: 'bg-blue-500', icon: '📋' },
    { label: 'BC à vérifier', value: needsReview.length, color: 'bg-red-500', icon: '⚠️' },
    { label: 'En attente', value: byStatus.waiting.length, color: 'bg-amber-500', icon: '⏳' },
    { label: 'Reçus', value: byStatus.received.length, color: 'bg-cyan-500', icon: '📦' },
    { label: 'En cours', value: byStatus.inProgress.length, color: 'bg-indigo-500', icon: '🔧' },
    { label: 'Prêts', value: byStatus.ready.length, color: 'bg-green-500', icon: '✅' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord</h1>
        <button onClick={reload} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">🔄 Actualiser</button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white rounded-xl p-4 shadow-sm ${stat.value > 0 && stat.label === 'BC à vérifier' ? 'ring-2 ring-red-500 animate-pulse' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl text-white`}>{stat.icon}</div>
              <div><p className="text-2xl font-bold text-gray-800">{stat.value}</p><p className="text-sm text-gray-500">{stat.label}</p></div>
            </div>
          </div>
        ))}
      </div>
      
      {needsReview.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-red-200 bg-red-100 rounded-t-xl">
            <h2 className="font-bold text-red-800 text-lg">⚠️ Bons de Commande à Vérifier ({needsReview.length})</h2>
            <p className="text-sm text-red-600">Cliquez sur "Examiner" pour vérifier le document et approuver</p>
          </div>
          <div className="p-4 space-y-3">
            {needsReview.map(rma => (
              <div key={rma.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm border border-red-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                  <div>
                    <span className="font-mono font-bold text-[#00A651] text-lg">{rma.request_number}</span>
                    <p className="font-medium text-gray-800">{rma.companies?.name}</p>
                    <p className="text-sm text-gray-500">
                      BC soumis le {rma.bc_submitted_at ? new Date(rma.bc_submitted_at).toLocaleDateString('fr-FR') : new Date(rma.updated_at).toLocaleDateString('fr-FR')}
                      {rma.bc_signed_by && <span className="ml-2">• Signé par: {rma.bc_signed_by}</span>}
                    </p>
                  </div>
                </div>
                <button onClick={() => setReviewingBC(rma)} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2">
                  🔍 Examiner
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-800">RMAs Actifs ({activeRMAs.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMA</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Client</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Appareil(s)</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Service</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeRMAs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun RMA actif</td></tr>
              ) : activeRMAs.map(rma => {
                const style = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;
                const devices = rma.request_devices || [];
                const hasBCToReview = needsReview.find(n => n.id === rma.id);
                return (
                  <tr key={rma.id} className={`hover:bg-gray-50 ${hasBCToReview ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3"><span className="font-mono font-bold text-[#00A651]">{rma.request_number}</span></td>
                    <td className="px-4 py-3"><p className="font-medium text-gray-800">{rma.companies?.name || '—'}</p></td>
                    <td className="px-4 py-3">
                      {devices.length > 0 ? <div className="text-sm">{devices.slice(0, 2).map((d, i) => <p key={i}>{d.model_name} <span className="text-gray-400">({d.serial_number})</span></p>)}{devices.length > 2 && <p className="text-gray-400">+{devices.length - 2} autres</p>}</div> : <span className="text-gray-400">{rma.serial_number || '—'}</span>}
                    </td>
                    <td className="px-4 py-3"><span className="text-sm">{rma.requested_service === 'calibration' ? '🔬 Étalonnage' : rma.requested_service === 'repair' ? '🔧 Réparation' : rma.requested_service}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(rma.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      {hasBCToReview ? (
                        <button onClick={() => setReviewingBC(rma)} className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded">🔍 Examiner BC</button>
                      ) : (
                        <button onClick={() => setSelectedRMA(rma)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Voir →</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedRMA && <RMADetailModal rma={selectedRMA} onClose={() => setSelectedRMA(null)} notify={notify} reload={reload} />}
      {reviewingBC && <BCReviewModal rma={reviewingBC} onClose={() => setReviewingBC(null)} notify={notify} reload={reload} />}
    </div>
  );
}

// BC Review Modal
function BCReviewModal({ rma, onClose, notify, reload }) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const approveBC = async () => {
    setApproving(true);
    const { error } = await supabase.from('service_requests').update({ status: 'waiting_device', bc_approved_at: new Date().toISOString() }).eq('id', rma.id);
    if (error) notify('Erreur: ' + error.message, 'error'); else { notify('✅ BC approuvé!'); reload(); onClose(); }
    setApproving(false);
  };
  
  const rejectBC = async () => {
    if (!rejectReason.trim()) { notify('Veuillez indiquer la raison du refus', 'error'); return; }
    setRejecting(true);
    const { error } = await supabase.from('service_requests').update({ status: 'waiting_bc', bc_rejected_at: new Date().toISOString(), bc_rejected_reason: rejectReason, bc_file_url: null, bc_signature_url: null, bc_submitted_at: null }).eq('id', rma.id);
    if (error) notify('Erreur: ' + error.message, 'error'); else { notify('BC refusé.'); reload(); onClose(); }
    setRejecting(false);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex" onClick={onClose}>
      <div className="bg-white w-full max-w-6xl m-auto rounded-xl overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white flex justify-between items-center">
          <div><h2 className="text-xl font-bold">Vérification du Bon de Commande</h2><p className="text-red-100">{rma.request_number} • {rma.companies?.name}</p></div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-3xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-lg">📄 Document BC</h3>
              {rma.bc_file_url ? (
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                    <span className="font-medium">Fichier BC</span>
                    <a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Ouvrir ↗</a>
                  </div>
                  {rma.bc_file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <img src={rma.bc_file_url} alt="BC" className="w-full" /> : rma.bc_file_url.match(/\.pdf$/i) ? <iframe src={rma.bc_file_url} className="w-full h-96" title="BC PDF" /> : <div className="p-8 text-center"><a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-500 text-white rounded-lg inline-block">📥 Télécharger</a></div>}
                </div>
              ) : <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">Aucun fichier BC</div>}
              {rma.bc_signature_url && (
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2"><span className="font-medium">Signature électronique</span></div>
                  <div className="p-4 bg-white">
                    <img src={rma.bc_signature_url} alt="Signature" className="max-h-32 mx-auto" />
                    <p className="text-center text-sm text-gray-500 mt-2">Signé par: <strong>{rma.bc_signed_by || '—'}</strong></p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-lg">📋 Détails de la Commande</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-gray-500">N° RMA</p><p className="font-mono font-bold text-[#00A651]">{rma.request_number}</p></div>
                  <div><p className="text-sm text-gray-500">Service</p><p className="font-medium">{rma.requested_service}</p></div>
                  <div><p className="text-sm text-gray-500">Montant HT</p><p className="font-bold text-lg">{rma.quote_total?.toFixed(2) || '—'} €</p></div>
                  <div><p className="text-sm text-gray-500">Appareils</p><p className="font-medium">{rma.request_devices?.length || 1}</p></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Raison du refus (si applicable)</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none" placeholder="Indiquez la raison du refus..." />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between items-center">
          <button onClick={onClose} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium">Annuler</button>
          <div className="flex gap-3">
            <button onClick={rejectBC} disabled={rejecting} className="px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium disabled:opacity-50">{rejecting ? '...' : '❌ Refuser'}</button>
            <button onClick={approveBC} disabled={approving} className="px-8 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50">{approving ? '...' : '✅ Approuver BC'}</button>
          </div>
        </div>
      </div>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b sticky top-0 bg-white flex justify-between items-center">
          <div><h2 className="text-xl font-bold">{rma.request_number}</h2><p className="text-sm text-gray-500">{rma.companies?.name}</p></div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>{style.label}</span>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-bold mb-2">Mettre à jour le statut</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_STYLES).map(([key, val]) => (
                <button key={key} onClick={() => updateStatus(key)} disabled={saving || key === rma.status}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${val.bg} ${val.text} ${key === rma.status ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:opacity-80'} disabled:opacity-50`}>
                  {val.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// REQUESTS SHEET - ONLY NEW REQUESTS
// ============================================
function RequestsSheet({ requests, clients, notify, reload, profile }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const newRequests = requests.filter(r => r.status === 'submitted');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Nouvelles Demandes ({newRequests.length})</h1>
      </div>

      {newRequests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-xl font-medium text-gray-600">Aucune nouvelle demande</p>
          <p className="text-gray-400 mt-2">Toutes les demandes ont été traitées</p>
        </div>
      ) : (
        <div className="space-y-4">
          {newRequests.map(req => {
            const devices = req.request_devices || [];
            return (
              <div key={req.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{req.companies?.name}</h3>
                      <p className="text-sm text-gray-500">Soumis le {new Date(req.created_at).toLocaleDateString('fr-FR')} à {new Date(req.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">Nouvelle demande</span>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Service demandé</p>
                      <p className="font-bold text-lg">{req.requested_service === 'calibration' ? '🔬 Étalonnage' : req.requested_service === 'repair' ? '🔧 Réparation' : req.requested_service}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Appareils</p>
                      <p className="font-bold text-lg">{devices.length || 1} appareil(s)</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Urgence</p>
                      <p className={`font-bold text-lg ${req.urgency === 'urgent' ? 'text-orange-600' : req.urgency === 'critical' ? 'text-red-600' : 'text-green-600'}`}>
                        {req.urgency === 'urgent' ? '⚡ Urgent' : req.urgency === 'critical' ? '🚨 Critique' : '✓ Normal'}
                      </p>
                    </div>
                  </div>

                  {/* Devices list */}
                  {devices.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Appareils à traiter:</p>
                      <div className="grid md:grid-cols-2 gap-2">
                        {devices.map((d, i) => (
                          <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                            <span className="text-2xl">🔬</span>
                            <div>
                              <p className="font-medium">{d.model_name}</p>
                              <p className="text-sm text-gray-500">SN: {d.serial_number}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Problem description */}
                  {req.problem_description && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">📝 Notes / Description du problème:</p>
                      <p className="text-blue-900">{req.problem_description}</p>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="px-8 py-3 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-bold shadow-lg transition-all hover:shadow-xl"
                  >
                    💰 Créer le Devis
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedRequest && (
        <QuoteEditorModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          notify={notify}
          reload={reload}
          profile={profile}
        />
      )}
    </div>
  );
}

// ============================================
// QUOTE EDITOR MODAL
// ============================================
function QuoteEditorModal({ request, onClose, notify, reload, profile }) {
  const [step, setStep] = useState(1);
  const [templateType, setTemplateType] = useState('particle_counter');
  const [lineItems, setLineItems] = useState([]);
  const [shipping, setShipping] = useState(45);
  const [includeShipping, setIncludeShipping] = useState(true);
  const [signatory, setSignatory] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');

  const template = QUOTE_TEMPLATES[templateType];
  const devices = request?.request_devices || [];

  useEffect(() => {
    if (devices.length > 0) {
      setLineItems(devices.map((d, i) => ({
        id: i + 1,
        description: `Étalonnage annuel ${d.model_name}`,
        model: d.model_name,
        serial: d.serial_number,
        price: 630,
        qty: 1
      })));
    } else {
      setLineItems([{ id: 1, description: 'Étalonnage annuel', model: request?.model_name || '', serial: request?.serial_number || '', price: 630, qty: 1 }]);
    }
  }, [request, devices]);

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Date.now(), description: '', model: '', serial: '', price: 0, qty: 1 }]);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal + (includeShipping ? shipping : 0);

  const sendQuote = async () => {
    setSaving(true);
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
    <div className="fixed inset-0 z-50 bg-black/80 flex" onClick={onClose}>
      <div className="bg-white w-full h-full overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1a2e] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-bold">{step === 1 ? '✏️ Créer le Devis' : step === 2 ? '👁️ Aperçu' : '📧 Confirmer'}</h2>
              <p className="text-gray-400">{request.companies?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? 'bg-[#00A651]' : 'bg-gray-600'}`}>{s}</div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-3xl">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="flex h-full">
              {/* Left: Customer Info */}
              <div className="w-80 bg-gray-50 border-r p-6 overflow-y-auto shrink-0">
                <h3 className="font-bold text-gray-800 mb-4">📋 Informations Client</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Entreprise</p>
                    <p className="font-bold text-lg">{request.companies?.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Adresse facturation</p>
                    <p className="text-sm">{request.companies?.billing_address || '—'}</p>
                    <p className="text-sm">{request.companies?.billing_postal_code} {request.companies?.billing_city}</p>
                    <p className="text-sm">{request.companies?.billing_country || 'France'}</p>
                  </div>

                  {request.companies?.siret && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">SIRET</p>
                      <p className="text-sm font-mono">{request.companies?.siret}</p>
                    </div>
                  )}

                  {request.companies?.vat_number && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">N° TVA</p>
                      <p className="text-sm font-mono">{request.companies?.vat_number}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Contact</p>
                    <p className="font-medium">{request.profiles?.full_name || '—'}</p>
                    <p className="text-sm text-gray-600">{request.profiles?.email}</p>
                    {request.profiles?.phone && <p className="text-sm text-gray-600">{request.profiles?.phone}</p>}
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Service demandé</p>
                    <p className="font-bold">{request.requested_service === 'calibration' ? '🔬 Étalonnage' : '🔧 Réparation'}</p>
                    <p className={`text-sm ${request.urgency === 'urgent' ? 'text-orange-600' : request.urgency === 'critical' ? 'text-red-600' : 'text-gray-600'}`}>
                      Urgence: {request.urgency || 'Normal'}
                    </p>
                  </div>

                  {request.problem_description && (
                    <div className="border-t pt-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Notes client</p>
                      <p className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200">{request.problem_description}</p>
                    </div>
                  )}

                  {request.customer_shipping_account && (
                    <div className="border-t pt-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Compte transport client</p>
                      <p className="text-sm font-mono">{request.customer_shipping_account}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Quote Editor */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Template Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-3">Type de prestation</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 'particle_counter', label: 'Compteur Particules', icon: '🔬' },
                      { id: 'bio_collector', label: 'Biocollecteur', icon: '🧫' },
                      { id: 'liquid_counter', label: 'Compteur Liquide', icon: '💧' },
                      { id: 'repair', label: 'Réparation', icon: '🔧' }
                    ].map(t => (
                      <button key={t.id} onClick={() => setTemplateType(t.id)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${templateType === t.id ? 'border-[#00A651] bg-green-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="text-2xl mb-1">{t.icon}</div>
                        <div className="text-sm font-medium">{t.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Items */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-3">Lignes du devis</label>
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Description</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Modèle</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">N° Série</th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-gray-600">Prix HT</th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-600">Qté</th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-gray-600">Total</th>
                          <th className="px-4 py-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map(item => (
                          <tr key={item.id} className="border-t">
                            <td className="px-4 py-2">
                              <input type="text" value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={item.model} onChange={e => updateLineItem(item.id, 'model', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={item.serial} onChange={e => updateLineItem(item.id, 'serial', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={item.price} onChange={e => updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)} className="w-24 px-3 py-2 border rounded-lg text-right" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={item.qty} onChange={e => updateLineItem(item.id, 'qty', parseInt(e.target.value) || 1)} className="w-16 px-3 py-2 border rounded-lg text-center" min="1" />
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-[#00A651]">{(item.price * item.qty).toFixed(2)} €</td>
                            <td className="px-4 py-2">
                              <button onClick={() => removeLineItem(item.id)} className="text-red-500 hover:text-red-700 text-xl">×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-3 bg-gray-50 border-t">
                      <button onClick={addLineItem} className="text-[#00A651] font-medium hover:underline">+ Ajouter une ligne</button>
                    </div>
                  </div>
                </div>

                {/* Shipping */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={includeShipping} onChange={e => setIncludeShipping(e.target.checked)} className="w-5 h-5 text-[#00A651] rounded" />
                    <span className="font-medium">Inclure frais de transport</span>
                    {includeShipping && (
                      <input type="number" value={shipping} onChange={e => setShipping(parseFloat(e.target.value) || 0)} className="w-24 px-3 py-2 border rounded-lg text-right ml-4" />
                    )}
                    {includeShipping && <span className="text-gray-500">€</span>}
                  </label>
                </div>

                {/* Totals */}
                <div className="bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl p-6 mb-6">
                  <div className="flex justify-end">
                    <div className="w-72 space-y-2">
                      <div className="flex justify-between"><span className="text-gray-600">Sous-total HT</span><span className="font-medium">{subtotal.toFixed(2)} €</span></div>
                      {includeShipping && <div className="flex justify-between"><span className="text-gray-600">Transport</span><span className="font-medium">{shipping.toFixed(2)} €</span></div>}
                      <div className="flex justify-between text-xl font-bold pt-2 border-t-2"><span>Total HT</span><span className="text-[#00A651]">{total.toFixed(2)} €</span></div>
                    </div>
                  </div>
                </div>

                {/* Signatory */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Signataire</label>
                  <input type="text" value={signatory} onChange={e => setSignatory(e.target.value)} className="w-64 px-4 py-3 border rounded-xl" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <QuotePreview template={template} lineItems={lineItems} shipping={shipping} includeShipping={includeShipping} total={total} request={request} signatory={signatory} />
          )}

          {step === 3 && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-lg">
                <div className="text-7xl mb-6">📧</div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4">Confirmer l'envoi</h3>
                <p className="text-gray-600 mb-2">Le devis sera envoyé à</p>
                <p className="text-xl font-bold text-gray-800 mb-4">{request.companies?.name}</p>
                <p className="text-4xl font-bold text-[#00A651] mb-8">{total.toFixed(2)} € HT</p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-800">Un numéro RMA sera automatiquement attribué. Le client recevra une notification pour examiner et approuver le devis.</p>
                </div>
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
            {step === 1 && <button onClick={() => setStep(2)} className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold">👁️ Aperçu →</button>}
            {step === 2 && <button onClick={() => setStep(3)} className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold">📧 Préparer l'envoi →</button>}
            {step === 3 && <button onClick={sendQuote} disabled={saving} className="px-10 py-3 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl font-bold text-lg disabled:opacity-50">{saving ? 'Envoi...' : '✅ Envoyer le devis'}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PROFESSIONAL QUOTE PREVIEW
// ============================================
function QuotePreview({ template, lineItems, shipping, includeShipping, total, request, signatory }) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  return (
    <div className="bg-gray-400 p-8 min-h-full">
      <div className="bg-white max-w-[210mm] mx-auto shadow-2xl" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="bg-[#1a1a2e] text-white px-12 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">LIGHTHOUSE</h1>
              <p className="text-xl text-gray-300 mt-1">FRANCE</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#00A651]">OFFRE DE PRIX</p>
              <p className="text-gray-300 mt-2">Créteil, le {today}</p>
            </div>
          </div>
        </div>

        {/* Client Info Bar */}
        <div className="bg-gray-100 px-12 py-6 border-b-4 border-[#00A651]">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Client</p>
              <p className="text-xl font-bold text-gray-800">{request?.companies?.name}</p>
              <p className="text-gray-600">{request?.companies?.billing_address}</p>
              <p className="text-gray-600">{request?.companies?.billing_postal_code} {request?.companies?.billing_city}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Référence</p>
              <p className="text-xl font-mono font-bold text-[#00A651]">N°RM/C/XXXX/X/26</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-12 py-8">
          {/* Service Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1a1a2e] border-b-2 border-[#00A651] pb-2 inline-block">
              {template.title}
            </h2>
          </div>

          {/* Prestations */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Prestations incluses</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              {template.prestations.map((p, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                  <span className="w-6 h-6 bg-[#00A651] text-white rounded-full flex items-center justify-center text-sm shrink-0">✓</span>
                  <span className="text-gray-700">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Equipment & Pricing Table */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Détail de la prestation</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1a1a2e] text-white">
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Modèle</th>
                  <th className="px-4 py-3 text-left">N° Série</th>
                  <th className="px-4 py-3 text-right">Prix unitaire HT</th>
                  <th className="px-4 py-3 text-center">Qté</th>
                  <th className="px-4 py-3 text-right">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 border-b">{item.description}</td>
                    <td className="px-4 py-3 border-b font-medium">{item.model}</td>
                    <td className="px-4 py-3 border-b font-mono text-sm">{item.serial}</td>
                    <td className="px-4 py-3 border-b text-right">{item.price.toFixed(2)} €</td>
                    <td className="px-4 py-3 border-b text-center">{item.qty}</td>
                    <td className="px-4 py-3 border-b text-right font-bold">{(item.price * item.qty).toFixed(2)} €</td>
                  </tr>
                ))}
                {includeShipping && (
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-3 border-b">Frais de transport forfaitaires</td>
                    <td className="px-4 py-3 border-b text-right font-bold">{shipping.toFixed(2)} €</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#00A651] text-white">
                  <td colSpan={5} className="px-4 py-4 text-right text-lg font-bold">TOTAL HT</td>
                  <td className="px-4 py-4 text-right text-2xl font-bold">{total.toFixed(2)} €</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Conditions */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Conditions</h3>
            <div className="text-sm text-gray-600 space-y-2">
              {template.disclaimers.map((d, i) => (
                <p key={i} className="flex items-start gap-2">
                  <span className="text-[#00A651]">•</span>
                  {d}
                </p>
              ))}
            </div>
          </div>

          {/* Payment Terms */}
          <div className="bg-gray-100 rounded-lg p-6 mb-8">
            <p className="font-bold text-gray-700">Conditions de règlement : À réception de facture</p>
            <p className="text-sm text-gray-500 mt-2">Ce devis est valable 30 jours à compter de sa date d'émission.</p>
          </div>

          {/* Signature */}
          <div className="flex justify-between items-end">
            <div>
              <p className="font-bold text-lg">{signatory}</p>
              <p className="text-gray-600">Lighthouse France</p>
            </div>
            <div className="w-32 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
              CAPCERT
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1a1a2e] text-white px-12 py-6 text-center">
          <p className="font-bold text-lg">Lighthouse France</p>
          <p className="text-gray-300">16, rue Paul Séjourné • 94000 CRÉTEIL • Tél. 01 43 77 28 07</p>
          <p className="text-gray-400 text-sm mt-2">salesfrance@golighthouse.com • www.lighthouseworldwide.com</p>
          <p className="text-gray-500 text-xs mt-2">Lighthouse France SAS au capital de 10 000 € • SIRET 501781348 • TVA FR86501781348</p>
        </div>
      </div>
    </div>
  );
}

// Placeholder components for other sheets
function ClientsSheet({ clients, requests, equipment, notify, reload, isAdmin }) {
  return <div className="bg-white rounded-xl p-8"><h1 className="text-2xl font-bold mb-4">Clients ({clients.length})</h1><p className="text-gray-500">Module clients - à venir</p></div>;
}

function ContractsSheet({ clients, notify }) {
  return <div className="bg-white rounded-xl p-8"><h1 className="text-2xl font-bold mb-4">Contrats</h1><p className="text-gray-500">Module contrats - à venir</p></div>;
}

function SettingsSheet({ profile, staffMembers, notify, reload }) {
  return <div className="bg-white rounded-xl p-8"><h1 className="text-2xl font-bold mb-4">Paramètres</h1><p className="text-gray-500">Module paramètres - à venir</p></div>;
}

function AdminSheet({ profile, staffMembers, notify, reload }) {
  return <div className="bg-white rounded-xl p-8"><h1 className="text-2xl font-bold mb-4">Administration</h1><p className="text-gray-500">Module admin - à venir</p></div>;
}
