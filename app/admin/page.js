'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const STATUS_STYLES = {
  submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Nouvelle demande' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'RMA Créé' },
  waiting_bc: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attente BC' },
  bc_review: { bg: 'bg-orange-100', text: 'text-orange-700', label: '⚠️ BC à vérifier' },
  bc_rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ BC Rejeté' },
  waiting_device: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Attente Appareil' },
  received: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Reçu' },
  in_queue: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'File attente' },
  calibration_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Étalonnage' },
  repair_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Réparation' },
  quote_sent: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Devis envoyé' },
  quote_revision_requested: { bg: 'bg-red-100', text: 'text-red-700', label: '🔴 Modification demandée' },
  quote_approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Devis approuvé' },
  final_qc: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Contrôle final' },
  ready_to_ship: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Prêt à expédier' },
  shipped: { bg: 'bg-green-100', text: 'text-green-700', label: 'Expédié' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Terminé' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' }
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
      .select('*, companies(id, name, billing_city), request_devices(*)')
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
  
  // Count pending requests and modification requests
  const pendingCount = requests.filter(r => r.status === 'submitted' && !r.request_number).length;
  const modificationCount = requests.filter(r => r.status === 'quote_revision_requested').length;
  const totalBadge = pendingCount + modificationCount;
  
  const sheets = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: '📊' },
    { id: 'requests', label: 'Demandes', icon: '📋', badge: totalBadge },
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
              className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap relative ${activeSheet === sheet.id ? 'bg-[#00A651] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              <span>{sheet.icon}</span>{sheet.label}
              {sheet.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {sheet.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-full mx-auto p-6">
        {activeSheet === 'dashboard' && <DashboardSheet requests={requests} notify={notify} reload={loadData} isAdmin={isAdmin} />}
        {activeSheet === 'requests' && <RequestsSheet requests={requests} notify={notify} reload={loadData} profile={profile} />}
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

function DashboardSheet({ requests, notify, reload, isAdmin }) {
  const [selectedRMA, setSelectedRMA] = useState(null);
  const [reviewingBC, setReviewingBC] = useState(null);
  
  const activeRMAs = requests.filter(r => r.request_number && !['completed', 'cancelled'].includes(r.status));
  // BC needs review if status is bc_review OR if bc_file_url/bc_signature_url exists and status is still waiting_bc
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
      
      {/* Stats */}
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
      
      {/* BC Review Section - Top Priority */}
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
                <button
                  onClick={() => setReviewingBC(rma)}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  🔍 Examiner
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Active RMAs Table */}
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
      
      {/* RMA Detail Modal */}
      {selectedRMA && <RMADetailModal rma={selectedRMA} onClose={() => setSelectedRMA(null)} notify={notify} reload={reload} />}
      
      {/* BC Review Modal */}
      {reviewingBC && <BCReviewModal rma={reviewingBC} onClose={() => setReviewingBC(null)} notify={notify} reload={reload} />}
    </div>
  );
}

// BC Review Modal - Full screen document review
function BCReviewModal({ rma, onClose, notify, reload }) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const approveBC = async () => {
    setApproving(true);
    const { error } = await supabase
      .from('service_requests')
      .update({ 
        status: 'waiting_device', 
        bc_approved_at: new Date().toISOString(),
        bc_approved_by: 'admin' // TODO: use actual admin ID
      })
      .eq('id', rma.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('✅ BC approuvé! En attente de l\'appareil.');
      reload();
      onClose();
    }
    setApproving(false);
  };
  
  const rejectBC = async () => {
    if (!rejectReason.trim()) {
      notify('Veuillez indiquer la raison du refus', 'error');
      return;
    }
    setRejecting(true);
    const { error } = await supabase
      .from('service_requests')
      .update({ 
        status: 'bc_rejected', // Status that shows rejection to customer
        bc_rejected_at: new Date().toISOString(),
        bc_rejection_reason: rejectReason,
        // Clear old BC data so they can resubmit
        bc_file_url: null,
        bc_signature_url: null,
        bc_submitted_at: null
      })
      .eq('id', rma.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('BC refusé. Le client devra soumettre un nouveau BC.');
      reload();
      onClose();
    }
    setRejecting(false);
  };
  
  const devices = rma.request_devices || [];
  
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex" onClick={onClose}>
      <div className="bg-white w-full max-w-6xl m-auto rounded-xl overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Vérification du Bon de Commande</h2>
            <p className="text-red-100">{rma.request_number} • {rma.companies?.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-3xl">&times;</button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Document Preview */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-lg">📄 Document BC</h3>
              
              {/* BC File */}
              {rma.bc_file_url ? (
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                    <span className="font-medium">Fichier BC uploadé</span>
                    <a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                      Ouvrir dans nouvel onglet ↗
                    </a>
                  </div>
                  {rma.bc_file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={rma.bc_file_url} alt="BC Document" className="w-full" />
                  ) : rma.bc_file_url.match(/\.pdf$/i) ? (
                    <iframe src={rma.bc_file_url} className="w-full h-96" title="BC PDF" />
                  ) : (
                    <div className="p-8 text-center">
                      <a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-500 text-white rounded-lg inline-block">
                        📥 Télécharger le fichier
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
                  Aucun fichier BC uploadé
                </div>
              )}
              
              {/* Signature */}
              {rma.bc_signature_url && (
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2">
                    <span className="font-medium">Signature électronique</span>
                  </div>
                  <div className="p-4 bg-white">
                    <img src={rma.bc_signature_url} alt="Signature" className="max-h-32 mx-auto" />
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Signé par: <strong>{rma.bc_signed_by || '—'}</strong>
                      {rma.bc_signature_date && <span> le {new Date(rma.bc_signature_date).toLocaleDateString('fr-FR')}</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right: Order Details */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-lg">📋 Détails de la Commande</h3>
              
              {/* RMA Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">N° RMA</p>
                    <p className="font-mono font-bold text-[#00A651]">{rma.request_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Service demandé</p>
                    <p className="font-medium">{rma.requested_service}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date soumission BC</p>
                    <p className="font-medium">{rma.bc_submitted_at ? new Date(rma.bc_submitted_at).toLocaleString('fr-FR') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="font-medium">{rma.companies?.name}</p>
                  </div>
                </div>
              </div>
              
              {/* Devices */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">Appareils ({devices.length})</h4>
                <div className="space-y-2">
                  {devices.map((d, i) => (
                    <div key={i} className="bg-white rounded p-3 border">
                      <p className="font-medium">{d.model_name}</p>
                      <p className="text-sm text-gray-500">SN: {d.serial_number} • {d.service_type}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Quote Info (if available) */}
              {(rma.quote_total || rma.quote_url) && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">💰 Devis envoyé</h4>
                  {rma.quote_total && <p className="text-2xl font-bold text-blue-700">{rma.quote_total.toFixed(2)} €</p>}
                  {rma.quote_url && (
                    <a href={rma.quote_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                      Voir le devis ↗
                    </a>
                  )}
                </div>
              )}
              
              {/* Reject Reason Input */}
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">Refuser le BC?</h4>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Indiquez la raison du refus (document illisible, montant incorrect, etc.)..."
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm h-20 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between items-center">
          <button onClick={onClose} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium">
            Annuler
          </button>
          <div className="flex gap-3">
            <button
              onClick={rejectBC}
              disabled={rejecting}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {rejecting ? 'Refus...' : '❌ Refuser BC'}
            </button>
            <button
              onClick={approveBC}
              disabled={approving}
              className="px-8 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50"
            >
              {approving ? 'Approbation...' : '✅ Approuver BC'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RMADetailModal({ rma, onClose, notify, reload }) {
  const [saving, setSaving] = useState(false);
  const [internalNotes, setInternalNotes] = useState(rma.internal_notes || '');
  const style = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;
  const devices = rma.request_devices || [];
  const workflowStatuses = ['approved', 'waiting_bc', 'bc_review', 'waiting_device', 'received', 'in_queue', 'calibration_in_progress', 'repair_in_progress', 'quote_sent', 'quote_approved', 'final_qc', 'ready_to_ship', 'shipped', 'completed'];

  const updateStatus = async (newStatus) => {
    setSaving(true);
    const { error } = await supabase.from('service_requests').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', rma.id);
    if (error) notify('Erreur: ' + error.message, 'error'); else { notify('Statut mis à jour!'); reload(); }
    setSaving(false);
  };

  const saveNotes = async () => {
    setSaving(true);
    const { error } = await supabase.from('service_requests').update({ internal_notes: internalNotes }).eq('id', rma.id);
    if (error) notify('Erreur: ' + error.message, 'error'); else notify('Notes enregistrées!');
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b sticky top-0 bg-white flex justify-between items-center z-10">
          <div><h2 className="text-xl font-bold text-gray-800">{rma.request_number}</h2><p className="text-sm text-gray-500">{rma.companies?.name}</p></div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>{style.label}</span>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Client</h3><p className="font-medium">{rma.companies?.name}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Service</h3><p className="font-medium">{rma.requested_service}</p><p className="text-sm text-gray-500">Créé le {new Date(rma.created_at).toLocaleDateString('fr-FR')}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Documents</h3>
              {rma.bc_file_url && <a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">📄 BC Fichier</a>}
              {rma.bc_signature_url && <a href={rma.bc_signature_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">✍️ Signature</a>}
              {rma.quote_url && <a href={rma.quote_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">💰 Devis</a>}
              {!rma.bc_file_url && !rma.bc_signature_url && !rma.quote_url && <p className="text-sm text-gray-400">Aucun document</p>}
            </div>
          </div>
          <div><h3 className="font-bold text-gray-700 mb-3">Appareils ({devices.length || 1})</h3>
            {devices.length > 0 ? <div className="space-y-2">{devices.map((d, i) => <div key={i} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center"><div><p className="font-medium">{d.model_name}</p><p className="text-sm text-gray-500">SN: {d.serial_number}</p>{d.notes && <p className="text-sm text-gray-400 mt-1">{d.notes}</p>}</div><span className="text-sm text-gray-400">{d.service_type}</span></div>)}</div> : <div className="bg-gray-50 rounded-lg p-3"><p className="font-medium">{rma.serial_number}</p></div>}
          </div>
          {rma.problem_description && <div><h3 className="font-bold text-gray-700 mb-2">Notes du client</h3><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm whitespace-pre-wrap">{rma.problem_description}</p></div></div>}
          <div><h3 className="font-bold text-gray-700 mb-2">Notes internes</h3><textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Ajouter des notes internes..." className="w-full px-4 py-3 border border-gray-300 rounded-lg h-24 resize-none" /><button onClick={saveNotes} disabled={saving} className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">{saving ? 'Enregistrement...' : 'Enregistrer les notes'}</button></div>
          <div><h3 className="font-bold text-gray-700 mb-2">Mettre à jour le statut</h3><div className="flex flex-wrap gap-2">{workflowStatuses.map(key => { const val = STATUS_STYLES[key]; if (!val) return null; return <button key={key} onClick={() => updateStatus(key)} disabled={saving || key === rma.status} className={`px-3 py-1.5 rounded text-sm font-medium ${val.bg} ${val.text} ${key === rma.status ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:opacity-80'} disabled:opacity-50`}>{val.label}</button>; })}</div></div>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 sticky bottom-0"><button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Fermer</button></div>
      </div>
    </div>
  );
}

function RequestsSheet({ requests, notify, reload, profile }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quoteRequest, setQuoteRequest] = useState(null);
  const [filter, setFilter] = useState('pending');
  
  const pendingRequests = requests.filter(r => r.status === 'submitted' && !r.request_number);
  const modificationRequests = requests.filter(r => r.status === 'quote_revision_requested');
  const allPending = [...modificationRequests, ...pendingRequests];
  const displayRequests = filter === 'pending' ? allPending : requests;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Demandes</h1>
        <div className="flex gap-2">
          <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-200'}`}>
            En attente ({allPending.length})
          </button>
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}>
            Toutes ({requests.length})
          </button>
        </div>
      </div>
      
      {/* Modification Requests Alert */}
      {modificationRequests.length > 0 && filter === 'pending' && (
        <div className="bg-red-50 border-2 border-red-300 p-4 rounded-xl">
          <p className="font-bold text-red-800">🔴 {modificationRequests.length} demande(s) de modification de devis</p>
          <p className="text-sm text-red-600">Le client a demandé des modifications - veuillez réviser et renvoyer</p>
        </div>
      )}
      
      {pendingRequests.length > 0 && filter === 'pending' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <p className="font-medium text-amber-800">⚠️ {pendingRequests.length} nouvelle(s) demande(s) - Créez un devis pour traiter</p>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">ID / RMA</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Client</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Type</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Appareils</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Soumis</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayRequests.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{filter === 'pending' ? 'Aucune demande en attente' : 'Aucune demande'}</td></tr>
            ) : displayRequests.map(req => {
              const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
              const devices = req.request_devices || [];
              const isPending = req.status === 'submitted' && !req.request_number;
              const needsRevision = req.status === 'quote_revision_requested';
              
              return (
                <tr key={req.id} className={`hover:bg-gray-50 ${needsRevision ? 'bg-red-50' : isPending ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    {req.request_number ? (
                      <span className="font-mono font-bold text-[#00A651]">{req.request_number}</span>
                    ) : (
                      <span className="text-amber-600 font-medium">Nouvelle</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><p className="font-medium text-gray-800">{req.companies?.name || '—'}</p></td>
                  <td className="px-4 py-3"><span className="text-sm">{req.request_type === 'service' ? '🔧 Service' : '📦 Pièces'}</span></td>
                  <td className="px-4 py-3"><span className="text-sm text-gray-600">{devices.length > 0 ? devices.length + ' appareil(s)' : '1 appareil'}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(isPending || needsRevision) && (
                        <button onClick={() => setQuoteRequest(req)} className={`px-3 py-1 text-sm text-white rounded font-medium ${needsRevision ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00A651] hover:bg-[#008f45]'}`}>
                          {needsRevision ? '🔴 Réviser Devis' : '💰 Créer Devis'}
                        </button>
                      )}
                      <button onClick={() => setSelectedRequest(req)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Voir</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedRequest && <RequestDetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} onCreateQuote={() => { setSelectedRequest(null); setQuoteRequest(selectedRequest); }} />}
      {quoteRequest && <QuoteEditorModal request={quoteRequest} onClose={() => setQuoteRequest(null)} notify={notify} reload={reload} profile={profile} />}
    </div>
  );
}

function RequestDetailModal({ request, onClose, onCreateQuote }) {
  const style = STATUS_STYLES[request.status] || STATUS_STYLES.submitted;
  const devices = request.request_devices || [];
  const isPending = request.status === 'submitted' && !request.request_number;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b sticky top-0 bg-white flex justify-between items-center"><div><h2 className="text-xl font-bold text-gray-800">{request.request_number || 'Nouvelle Demande'}</h2><p className="text-sm text-gray-500">{request.companies?.name}</p></div><span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>{style.label}</span></div>
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Client</h3><p className="font-medium">{request.companies?.name}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Service</h3><p className="font-medium">{request.requested_service}</p><p className="text-sm text-gray-500">Soumis le {new Date(request.created_at).toLocaleDateString('fr-FR')}</p></div>
          </div>
          <div><h3 className="font-bold text-gray-700 mb-3">Appareils ({devices.length || 1})</h3>{devices.length > 0 ? <div className="space-y-2">{devices.map((d, i) => <div key={i} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center"><div><p className="font-medium">{d.model_name}</p><p className="text-sm text-gray-500">SN: {d.serial_number}</p></div><span className="text-sm text-gray-400">{d.equipment_type}</span></div>)}</div> : <div className="bg-gray-50 rounded-lg p-3"><p className="font-medium">{request.serial_number}</p></div>}</div>
          {request.problem_description && <div><h3 className="font-bold text-gray-700 mb-2">Notes du client</h3><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm whitespace-pre-wrap">{request.problem_description}</p></div></div>}
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between"><button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Fermer</button>{isPending && <button onClick={onCreateQuote} className="px-6 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium">💰 Créer Devis</button>}</div>
      </div>
    </div>
  );
}

function ClientsSheet({ clients, requests, equipment, notify, reload, isAdmin }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState('');
  const filteredClients = clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.profiles?.some(p => p.email?.toLowerCase().includes(search.toLowerCase())));
  const getClientStats = (clientId) => { const clientRequests = requests.filter(r => r.company_id === clientId); return { total: clientRequests.length, active: clientRequests.filter(r => !['completed', 'cancelled', 'shipped'].includes(r.status) && r.request_number).length }; };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-gray-800">Clients ({clients.length})</h1><input type="text" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg w-80" /></div>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Entreprise</th><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Contact principal</th><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Ville</th><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMAs</th><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filteredClients.map(client => { const stats = getClientStats(client.id); const mainContact = client.profiles?.find(p => p.role === 'admin') || client.profiles?.[0]; return (
              <tr key={client.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedClient(client)}>
                <td className="px-4 py-3"><p className="font-medium text-gray-800">{client.name}</p></td>
                <td className="px-4 py-3">{mainContact ? <div><p className="text-sm">{mainContact.full_name}</p><p className="text-xs text-gray-400">{mainContact.email}</p></div> : <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{client.billing_city || '—'}</td>
                <td className="px-4 py-3"><span className="text-sm">{stats.total} total{stats.active > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{stats.active} actif(s)</span>}</span></td>
                <td className="px-4 py-3"><button onClick={e => { e.stopPropagation(); setSelectedClient(client); }} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Voir →</button></td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
      {selectedClient && <ClientDetailModal client={selectedClient} requests={requests.filter(r => r.company_id === selectedClient.id)} equipment={equipment.filter(e => e.company_id === selectedClient.id)} onClose={() => setSelectedClient(null)} notify={notify} reload={reload} isAdmin={isAdmin} />}
    </div>
  );
}

function ClientDetailModal({ client, requests, equipment, onClose, notify, reload, isAdmin }) {
  const [activeTab, setActiveTab] = useState('rmas');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: client.name || '', billing_address: client.billing_address || '', billing_city: client.billing_city || '', billing_postal_code: client.billing_postal_code || '', siret: client.siret || '', vat_number: client.vat_number || '' });
  const [saving, setSaving] = useState(false);
  const tabs = [{ id: 'rmas', label: 'RMAs', icon: '📋', count: requests.length }, { id: 'devices', label: 'Appareils', icon: '🔧', count: equipment.length }, { id: 'info', label: 'Informations', icon: 'ℹ️' }, { id: 'contacts', label: 'Contacts', icon: '👤', count: client.profiles?.length || 0 }];
  const saveClient = async () => { setSaving(true); const { error } = await supabase.from('companies').update(editData).eq('id', client.id); if (error) notify('Erreur: ' + error.message, 'error'); else { notify('Client mis à jour!'); setEditing(false); reload(); } setSaving(false); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] text-white flex justify-between items-center"><div><h2 className="text-xl font-bold">{client.name}</h2><p className="text-sm text-gray-300">{client.billing_city}</p></div><button onClick={onClose} className="text-white/70 hover:text-white text-2xl">&times;</button></div>
        <div className="border-b bg-gray-50 flex">{tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 ${activeTab === tab.id ? 'border-[#00A651] text-[#00A651] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><span>{tab.icon}</span>{tab.label}{tab.count !== undefined && <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">{tab.count}</span>}</button>)}</div>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'rmas' && <div className="space-y-3">{requests.length === 0 ? <p className="text-center text-gray-400 py-8">Aucun RMA</p> : requests.map(req => { const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted; return <div key={req.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center hover:bg-gray-100"><div className="flex items-center gap-4"><span className="font-mono font-bold text-[#00A651]">{req.request_number || 'En attente'}</span><div><p className="font-medium">{req.requested_service}</p><p className="text-sm text-gray-500">{req.request_devices?.length || 1} appareil(s)</p></div></div><div className="text-right"><span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span><p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleDateString('fr-FR')}</p></div></div>; })}</div>}
          {activeTab === 'devices' && <div className="space-y-3">{equipment.length === 0 ? <p className="text-center text-gray-400 py-8">Aucun appareil</p> : equipment.map(eq => <div key={eq.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center"><div><p className="font-medium">{eq.model_name}</p><p className="text-sm text-gray-500">SN: {eq.serial_number}</p>{eq.nickname && <p className="text-xs text-gray-400">"{eq.nickname}"</p>}</div><span className="text-sm text-gray-400">{eq.brand}</span></div>)}</div>}
          {activeTab === 'info' && <div className="space-y-4">{editing ? <div className="space-y-4 max-w-lg"><div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label><input type="text" value={editData.billing_address} onChange={e => setEditData({ ...editData, billing_address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label><input type="text" value={editData.billing_postal_code} onChange={e => setEditData({ ...editData, billing_postal_code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Ville</label><input type="text" value={editData.billing_city} onChange={e => setEditData({ ...editData, billing_city: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label><input type="text" value={editData.siret} onChange={e => setEditData({ ...editData, siret: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">N° TVA</label><input type="text" value={editData.vat_number} onChange={e => setEditData({ ...editData, vat_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div></div><div className="flex gap-2 pt-2"><button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button><button onClick={saveClient} disabled={saving} className="px-4 py-2 bg-[#00A651] text-white rounded-lg disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div></div> : <div className="space-y-4">{isAdmin && <button onClick={() => setEditing(true)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">✏️ Modifier</button>}<div className="grid md:grid-cols-2 gap-4"><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-500">Nom</p><p className="font-medium">{client.name}</p></div><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-500">Adresse</p><p className="font-medium">{client.billing_address || '—'}</p><p className="text-sm text-gray-600">{client.billing_postal_code} {client.billing_city}</p></div><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-500">SIRET</p><p className="font-medium">{client.siret || '—'}</p></div><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-500">N° TVA</p><p className="font-medium">{client.vat_number || '—'}</p></div></div></div>}</div>}
          {activeTab === 'contacts' && <div className="space-y-3">{client.profiles?.map(contact => <div key={contact.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center font-bold">{contact.full_name?.charAt(0)?.toUpperCase()}</div><div><p className="font-medium">{contact.full_name}</p><p className="text-sm text-gray-500">{contact.email}</p>{contact.phone && <p className="text-sm text-gray-400">{contact.phone}</p>}</div></div><span className={`px-2 py-1 rounded-full text-xs ${contact.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>{contact.role === 'admin' ? '👑 Admin' : '👤 Utilisateur'}</span></div>)}</div>}
        </div>
      </div>
    </div>
  );
}

function ContractsSheet({ clients, notify }) { return <div className="space-y-6"><h1 className="text-2xl font-bold text-gray-800">Contrats de Calibration</h1><div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400"><p className="text-4xl mb-4">📄</p><p className="font-medium">Module Contrats</p><p className="text-sm">Gestion des contrats à venir</p></div></div>; }

function SettingsSheet({ profile, staffMembers, notify, reload }) { return <div className="space-y-6"><h1 className="text-2xl font-bold text-gray-800">Paramètres</h1><div className="bg-white rounded-xl shadow-sm"><div className="px-6 py-4 border-b"><h2 className="font-bold text-gray-800">Équipe Lighthouse</h2></div><div className="p-6 space-y-3">{staffMembers.map(member => <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#00A651] text-white flex items-center justify-center font-bold">{member.full_name?.charAt(0)?.toUpperCase()}</div><div><p className="font-medium">{member.full_name}</p><p className="text-sm text-gray-500">{member.email}</p></div></div><span className={`px-3 py-1 rounded-full text-sm ${member.role === 'lh_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{member.role === 'lh_admin' ? '👑 Admin' : '👤 Employé'}</span></div>)}</div></div></div>; }

function AdminSheet({ profile, staffMembers, notify, reload }) { return <div className="space-y-6"><h1 className="text-2xl font-bold text-gray-800">🔐 Administration</h1><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"><div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md cursor-pointer"><div className="text-3xl mb-3">💰</div><h3 className="font-bold text-gray-800">Tarification</h3><p className="text-sm text-gray-500">Gérer les prix des services</p></div><div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md cursor-pointer"><div className="text-3xl mb-3">🔑</div><h3 className="font-bold text-gray-800">Permissions</h3><p className="text-sm text-gray-500">Gérer les accès des employés</p></div><div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md cursor-pointer"><div className="text-3xl mb-3">⚙️</div><h3 className="font-bold text-gray-800">Système</h3><p className="text-sm text-gray-500">Configuration avancée</p></div></div></div>; }

// France Metropolitan check for shipping
const isFranceMetropolitan = (postalCode) => {
  if (!postalCode) return false;
  const cleaned = postalCode.toString().replace(/\s/g, '');
  if (!/^\d{5}$/.test(cleaned)) return false;
  const dept = parseInt(cleaned.substring(0, 2), 10);
  return dept >= 1 && dept <= 95;
};

// Device Type Configurations
const DEVICE_TYPES = {
  particle_counter: {
    id: 'particle_counter',
    label: 'Compteur de Particules (Air)',
    icon: '🔬',
    color: 'blue',
    calibration: {
      title: "Réglage, entretien et vérification d'étalonnage d'un compteur de particules aéroportées",
      prestations: [
        "Vérification des fonctionnalités du compteur",
        "Vérification et réglage du débit",
        "Vérification de la cellule de mesure",
        "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
        "Vérification en nombre par comparaison à un étalon étalonné selon la norme ISO 17025, conformément à la norme ISO 21501-4",
        "Fourniture d'un rapport de test et de calibration"
      ],
      defaultPrice: 630
    },
    repair: {
      title: "Réparation d'un compteur de particules",
      prestations: [
        "Diagnostic complet de l'appareil",
        "Remplacement des pièces défectueuses (pièces facturées en sus)",
        "Tests de fonctionnement complets",
        "Vérification d'étalonnage post-réparation"
      ],
      defaultPrice: 200
    }
  },
  bio_collector: {
    id: 'bio_collector',
    label: 'Bio Collecteur',
    icon: '🧫',
    color: 'green',
    calibration: {
      title: "Vérification d'étalonnage d'un biocollecteur",
      prestations: [
        "Vérification des fonctionnalités de l'appareil",
        "Vérification et réglage du débit",
        "Vérification de la cellule d'impaction",
        "Fourniture d'un rapport de test et de calibration"
      ],
      defaultPrice: 330
    },
    repair: {
      title: "Réparation d'un biocollecteur",
      prestations: [
        "Diagnostic complet de l'appareil",
        "Remplacement des pièces défectueuses",
        "Tests de fonctionnement",
        "Vérification post-réparation"
      ],
      defaultPrice: 180
    }
  },
  liquid_counter: {
    id: 'liquid_counter',
    label: 'Compteur de Particules (Liquide)',
    icon: '💧',
    color: 'cyan',
    calibration: {
      title: "Réglage, entretien et vérification d'étalonnage d'un compteur de particules en milieu liquide",
      prestations: [
        "Vérification des fonctionnalités du compteur",
        "Vérification et réglage du débit",
        "Vérification de la cellule de mesure optique",
        "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
        "Vérification en nombre par comparaison à un étalon",
        "Fourniture d'un rapport de test et de calibration"
      ],
      defaultPrice: 750
    },
    repair: {
      title: "Réparation d'un compteur liquide",
      prestations: [
        "Diagnostic complet de l'appareil",
        "Remplacement des pièces défectueuses",
        "Tests de fonctionnement complets",
        "Vérification d'étalonnage post-réparation"
      ],
      defaultPrice: 250
    }
  },
  temp_humidity: {
    id: 'temp_humidity',
    label: 'Capteur Temp/Humidité',
    icon: '🌡️',
    color: 'orange',
    calibration: {
      title: "Étalonnage d'un capteur de température et humidité",
      prestations: [
        "Vérification des fonctionnalités du capteur",
        "Étalonnage température sur points de référence",
        "Étalonnage humidité relative",
        "Fourniture d'un certificat d'étalonnage"
      ],
      defaultPrice: 280
    },
    repair: {
      title: "Réparation d'un capteur",
      prestations: [
        "Diagnostic",
        "Remplacement composants défectueux",
        "Tests de fonctionnement"
      ],
      defaultPrice: 150
    }
  },
  other: {
    id: 'other',
    label: 'Autre Équipement',
    icon: '📦',
    color: 'gray',
    calibration: {
      title: "Service d'étalonnage",
      prestations: [
        "Vérification des fonctionnalités",
        "Étalonnage selon spécifications",
        "Fourniture d'un rapport"
      ],
      defaultPrice: 400
    },
    repair: {
      title: "Service de réparation",
      prestations: [
        "Diagnostic",
        "Réparation",
        "Tests"
      ],
      defaultPrice: 200
    }
  }
};

const DISCLAIMERS = [
  "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.",
  "Un devis complémentaire sera établi si des pièces sont trouvées défectueuses.",
  "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de maintenance.",
  "Les équipements envoyés devront être décontaminés de toutes substances chimiques, bactériennes ou radioactives."
];

function QuoteEditorModal({ request, onClose, notify, reload, profile }) {
  const [step, setStep] = useState(1); // 1=Configure, 2=Review by Type, 3=Final Summary, 4=Confirm
  const [deviceQuotes, setDeviceQuotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [quoteRef, setQuoteRef] = useState('');

  const devices = request?.request_devices || [];
  const signatory = profile?.full_name || 'Lighthouse France';
  const today = new Date();
  
  // Check if client is in France Metropolitan for shipping
  const clientPostalCode = request?.companies?.billing_postal_code || request?.companies?.postal_code || '';
  const isMetro = isFranceMetropolitan(clientPostalCode);
  const shippingPerDevice = isMetro ? 45 : 0;
  const shippingNote = isMetro ? null : "Retour géré par le client (hors France métropolitaine)";

  useEffect(() => {
    const year = today.getFullYear().toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setQuoteRef(`LM/${year}${month}/XXX`);
    
    // Initialize device quotes from request
    if (devices.length > 0) {
      setDeviceQuotes(devices.map((d, i) => {
        // Try to auto-detect device type from model name
        const modelLower = (d.model_name || '').toLowerCase();
        let detectedType = 'particle_counter'; // default
        if (modelLower.includes('bio') || modelLower.includes('impac')) detectedType = 'bio_collector';
        else if (modelLower.includes('liquid') || modelLower.includes('liqui')) detectedType = 'liquid_counter';
        else if (modelLower.includes('temp') || modelLower.includes('humid') || modelLower.includes('thermo')) detectedType = 'temp_humidity';
        
        // Detect service type
        const serviceType = d.service_type || request?.requested_service || 'calibration';
        const needsCal = serviceType.includes('calibration') || serviceType === 'cal_repair';
        const needsRepair = serviceType.includes('repair') || serviceType === 'cal_repair';
        
        const typeConfig = DEVICE_TYPES[detectedType];
        
        return {
          id: d.id || `device-${i}`,
          model: d.model_name || '',
          serial: d.serial_number || '',
          deviceType: detectedType,
          needsCalibration: needsCal || serviceType === 'calibration',
          needsRepair: needsRepair || serviceType === 'repair',
          customerNotes: d.problem_description || d.notes || '', // Internal only
          calibrationPrice: typeConfig.calibration.defaultPrice,
          repairPrice: typeConfig.repair.defaultPrice,
          parts: [], // Additional parts/items
          shipping: shippingPerDevice
        };
      }));
    } else {
      // Single device fallback
      setDeviceQuotes([{
        id: 'device-1',
        model: request?.model_name || '',
        serial: request?.serial_number || '',
        deviceType: 'particle_counter',
        needsCalibration: true,
        needsRepair: false,
        customerNotes: request?.problem_description || '',
        calibrationPrice: 630,
        repairPrice: 200,
        parts: [],
        shipping: shippingPerDevice
      }]);
    }
  }, []);

  // Group devices by type for display
  const devicesByType = deviceQuotes.reduce((acc, dq) => {
    if (!acc[dq.deviceType]) acc[dq.deviceType] = [];
    acc[dq.deviceType].push(dq);
    return acc;
  }, {});

  // Update device quote
  const updateDevice = (deviceId, updates) => {
    setDeviceQuotes(prev => prev.map(dq => 
      dq.id === deviceId ? { ...dq, ...updates } : dq
    ));
  };

  // Add part to device
  const addPart = (deviceId) => {
    setDeviceQuotes(prev => prev.map(dq => {
      if (dq.id === deviceId) {
        return { ...dq, parts: [...dq.parts, { id: Date.now(), description: '', price: 0, qty: 1 }] };
      }
      return dq;
    }));
  };

  // Update part
  const updatePart = (deviceId, partId, field, value) => {
    setDeviceQuotes(prev => prev.map(dq => {
      if (dq.id === deviceId) {
        return {
          ...dq,
          parts: dq.parts.map(p => p.id === partId ? { ...p, [field]: value } : p)
        };
      }
      return dq;
    }));
  };

  // Remove part
  const removePart = (deviceId, partId) => {
    setDeviceQuotes(prev => prev.map(dq => {
      if (dq.id === deviceId) {
        return { ...dq, parts: dq.parts.filter(p => p.id !== partId) };
      }
      return dq;
    }));
  };

  // Calculate device total
  const getDeviceTotal = (dq) => {
    let total = 0;
    if (dq.needsCalibration) total += dq.calibrationPrice;
    if (dq.needsRepair) total += dq.repairPrice;
    total += dq.parts.reduce((sum, p) => sum + (p.price * p.qty), 0);
    total += dq.shipping;
    return total;
  };

  // Grand totals
  const servicesTotal = deviceQuotes.reduce((sum, dq) => {
    let t = 0;
    if (dq.needsCalibration) t += dq.calibrationPrice;
    if (dq.needsRepair) t += dq.repairPrice;
    t += dq.parts.reduce((s, p) => s + (p.price * p.qty), 0);
    return sum + t;
  }, 0);
  const shippingTotal = deviceQuotes.reduce((sum, dq) => sum + dq.shipping, 0);
  const grandTotal = servicesTotal + shippingTotal;

  const sendQuote = async () => {
    setSaving(true);
    
    let rmaNumber = request.request_number;
    if (!rmaNumber) {
      const { data } = await supabase.from('service_requests').select('request_number').like('request_number', 'FR-%').order('request_number', { ascending: false }).limit(1);
      const lastNum = data?.[0]?.request_number ? parseInt(data[0].request_number.replace('FR-', '')) : 0;
      rmaNumber = 'FR-' + String(lastNum + 1).padStart(5, '0');
    }

    // Store quote data for customer portal to display
    const quoteData = {
      devices: deviceQuotes.map(dq => ({
        model: dq.model,
        serial: dq.serial,
        deviceType: dq.deviceType,
        needsCalibration: dq.needsCalibration,
        needsRepair: dq.needsRepair,
        calibrationPrice: dq.calibrationPrice,
        repairPrice: dq.repairPrice,
        parts: dq.parts,
        shipping: dq.shipping,
        total: getDeviceTotal(dq)
      })),
      servicesTotal,
      shippingTotal,
      grandTotal,
      isMetro,
      shippingNote,
      createdBy: signatory,
      createdAt: new Date().toISOString()
    };

    const { error } = await supabase.from('service_requests').update({
      request_number: rmaNumber,
      status: 'quote_sent',
      quoted_at: new Date().toISOString(),
      quote_total: grandTotal,
      quote_subtotal: servicesTotal,
      quote_shipping: shippingTotal,
      quote_data: quoteData, // Store full quote structure
      quote_revision_notes: null
    }).eq('id', request.id);

    if (error) { notify('Erreur: ' + error.message, 'error'); }
    else { notify('✅ Devis envoyé! RMA: ' + rmaNumber); reload(); onClose(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex" onClick={onClose}>
      <div className="bg-white w-full h-full md:w-[98%] md:h-[98%] md:m-auto md:rounded-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1a2e] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-bold">
                {step === 1 && '1. Configuration des appareils'}
                {step === 2 && '2. Détails par type'}
                {step === 3 && '3. Récapitulatif final'}
                {step === 4 && '4. Confirmer l\'envoi'}
              </h2>
              <p className="text-gray-400">{request.companies?.name} • {deviceQuotes.length} appareil(s)</p>
            </div>
            <div className="flex gap-1">
              {[1,2,3,4].map(s => (
                <div key={s} className={`w-8 h-2 rounded-full ${step >= s ? 'bg-[#00A651]' : 'bg-gray-600'}`} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total HT</p>
              <p className="text-2xl font-bold text-[#00A651]">{grandTotal.toFixed(2)} €</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* STEP 1: Configure Devices */}
          {step === 1 && (
            <div className="p-6">
              {/* Revision Warning */}
              {request.status === 'quote_revision_requested' && (
                <div className="mb-6 p-4 bg-red-100 border-2 border-red-300 rounded-xl">
                  <p className="font-bold text-red-800">🔴 Modification demandée par le client</p>
                  <p className="text-red-700 mt-1">{request.quote_revision_notes}</p>
                </div>
              )}

              {/* Non-Metro Warning */}
              {!isMetro && (
                <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
                  <p className="font-bold text-amber-800">⚠️ Client hors France métropolitaine</p>
                  <p className="text-amber-700 text-sm">Les frais de retour ne sont pas inclus. Le client gère son propre transport.</p>
                </div>
              )}

              <div className="grid gap-4">
                {deviceQuotes.map((dq, index) => {
                  const typeConfig = DEVICE_TYPES[dq.deviceType];
                  return (
                    <div key={dq.id} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
                      {/* Device Header */}
                      <div className={`bg-${typeConfig.color}-600 text-white px-4 py-3 flex items-center justify-between`} style={{backgroundColor: dq.deviceType === 'particle_counter' ? '#2563eb' : dq.deviceType === 'bio_collector' ? '#16a34a' : dq.deviceType === 'liquid_counter' ? '#0891b2' : dq.deviceType === 'temp_humidity' ? '#ea580c' : '#6b7280'}}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{typeConfig.icon}</span>
                          <div>
                            <p className="font-bold">{dq.model || `Appareil ${index + 1}`}</p>
                            <p className="text-sm opacity-80">SN: {dq.serial || '—'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs opacity-80">Total appareil</p>
                          <p className="text-xl font-bold">{getDeviceTotal(dq).toFixed(2)} €</p>
                        </div>
                      </div>

                      {/* Customer Notes - Internal Only */}
                      {dq.customerNotes && (
                        <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
                          <p className="text-xs text-yellow-700 font-medium">💬 Note interne (client):</p>
                          <p className="text-sm text-yellow-800">{dq.customerNotes}</p>
                        </div>
                      )}

                      <div className="p-4 grid md:grid-cols-2 gap-4">
                        {/* Left: Device Type & Service Selection */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'appareil</label>
                            <select
                              value={dq.deviceType}
                              onChange={e => {
                                const newType = e.target.value;
                                const newConfig = DEVICE_TYPES[newType];
                                updateDevice(dq.id, {
                                  deviceType: newType,
                                  calibrationPrice: newConfig.calibration.defaultPrice,
                                  repairPrice: newConfig.repair.defaultPrice
                                });
                              }}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              {Object.values(DEVICE_TYPES).map(t => (
                                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={dq.needsCalibration}
                                onChange={e => updateDevice(dq.id, { needsCalibration: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded"
                              />
                              <span className="font-medium">🔬 Étalonnage</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={dq.needsRepair}
                                onChange={e => updateDevice(dq.id, { needsRepair: e.target.checked })}
                                className="w-5 h-5 text-orange-600 rounded"
                              />
                              <span className="font-medium">🔧 Réparation</span>
                            </label>
                          </div>
                        </div>

                        {/* Right: Pricing */}
                        <div className="space-y-3">
                          {dq.needsCalibration && (
                            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                              <span className="text-sm font-medium text-blue-800">Main d'œuvre étalonnage</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={dq.calibrationPrice}
                                  onChange={e => updateDevice(dq.id, { calibrationPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-24 px-2 py-1 border rounded text-right"
                                />
                                <span className="text-gray-500">€</span>
                              </div>
                            </div>
                          )}
                          {dq.needsRepair && (
                            <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                              <span className="text-sm font-medium text-orange-800">Main d'œuvre réparation</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={dq.repairPrice}
                                  onChange={e => updateDevice(dq.id, { repairPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-24 px-2 py-1 border rounded text-right"
                                />
                                <span className="text-gray-500">€</span>
                              </div>
                            </div>
                          )}

                          {/* Parts */}
                          {dq.parts.map(part => (
                            <div key={part.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                              <input
                                type="text"
                                value={part.description}
                                onChange={e => updatePart(dq.id, part.id, 'description', e.target.value)}
                                placeholder="Pièce / Service..."
                                className="flex-1 px-2 py-1 border rounded text-sm"
                              />
                              <input
                                type="number"
                                value={part.price}
                                onChange={e => updatePart(dq.id, part.id, 'price', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border rounded text-right text-sm"
                              />
                              <span className="text-xs text-gray-500">€ ×</span>
                              <input
                                type="number"
                                value={part.qty}
                                onChange={e => updatePart(dq.id, part.id, 'qty', parseInt(e.target.value) || 1)}
                                className="w-12 px-2 py-1 border rounded text-center text-sm"
                                min="1"
                              />
                              <button onClick={() => removePart(dq.id, part.id)} className="text-red-500 hover:text-red-700 text-lg">&times;</button>
                            </div>
                          ))}
                          <button onClick={() => addPart(dq.id)} className="text-sm text-[#00A651] font-medium hover:underline">+ Ajouter pièce/service</button>

                          {/* Shipping */}
                          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg mt-2">
                            <span className="text-sm font-medium text-gray-700">
                              {isMetro ? 'Frais de port (aller-retour)' : 'Transport (géré par client)'}
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={dq.shipping}
                                onChange={e => updateDevice(dq.id, { shipping: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 border rounded text-right"
                              />
                              <span className="text-gray-500">€</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Review by Device Type */}
          {step === 2 && (
            <div className="p-6 bg-gray-100">
              <div className="max-w-4xl mx-auto space-y-6">
                {Object.entries(devicesByType).map(([typeId, devices]) => {
                  const typeConfig = DEVICE_TYPES[typeId];
                  const hasCalibration = devices.some(d => d.needsCalibration);
                  const hasRepair = devices.some(d => d.needsRepair);
                  
                  return (
                    <div key={typeId} className="bg-white rounded-xl shadow-lg overflow-hidden">
                      {/* Type Header */}
                      <div className="px-6 py-4 text-white flex items-center gap-3" style={{backgroundColor: typeId === 'particle_counter' ? '#2563eb' : typeId === 'bio_collector' ? '#16a34a' : typeId === 'liquid_counter' ? '#0891b2' : typeId === 'temp_humidity' ? '#ea580c' : '#6b7280'}}>
                        <span className="text-3xl">{typeConfig.icon}</span>
                        <div>
                          <h3 className="text-xl font-bold">{typeConfig.label}</h3>
                          <p className="text-sm opacity-80">{devices.length} appareil(s)</p>
                        </div>
                      </div>

                      <div className="p-6">
                        {/* Calibration Section */}
                        {hasCalibration && (
                          <div className="mb-6">
                            <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                              <span className="text-blue-600">🔬</span> {typeConfig.calibration.title}
                            </h4>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-sm font-medium text-gray-600 mb-2">Prestations incluses :</p>
                              <ul className="space-y-1">
                                {typeConfig.calibration.prestations.map((p, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="text-[#00A651]">▸</span>
                                    {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Repair Section */}
                        {hasRepair && (
                          <div className="mb-6">
                            <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                              <span className="text-orange-600">🔧</span> {typeConfig.repair.title}
                            </h4>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-sm font-medium text-gray-600 mb-2">Prestations incluses :</p>
                              <ul className="space-y-1">
                                {typeConfig.repair.prestations.map((p, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="text-orange-500">▸</span>
                                    {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Devices in this type */}
                        <div className="border-t pt-4">
                          <p className="text-sm font-medium text-gray-600 mb-2">Appareils concernés :</p>
                          <div className="space-y-2">
                            {devices.map(d => (
                              <div key={d.id} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded">
                                <div>
                                  <span className="font-medium">{d.model}</span>
                                  <span className="text-gray-500 ml-2">SN: {d.serial}</span>
                                  <span className="ml-3 text-sm">
                                    {d.needsCalibration && <span className="text-blue-600 mr-2">🔬 Cal</span>}
                                    {d.needsRepair && <span className="text-orange-600">🔧 Rép</span>}
                                  </span>
                                </div>
                                <span className="font-bold text-[#00A651]">{getDeviceTotal(d).toFixed(2)} €</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Final Summary */}
          {step === 3 && (
            <div className="p-6 bg-gray-200">
              <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden" style={{ fontFamily: 'Arial, sans-serif' }}>
                {/* Quote Header */}
                <div className="px-8 pt-6 pb-4 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-gray-800">LIGHTHOUSE</h1>
                      <p className="text-gray-500">Worldwide Solutions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#00A651]">OFFRE DE PRIX</p>
                      <p className="text-sm text-gray-500">Réf: {quoteRef}</p>
                    </div>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="bg-gray-100 px-8 py-3 flex justify-between text-sm">
                  <div><p className="text-xs text-gray-500">Date</p><p className="font-medium">{today.toLocaleDateString('fr-FR')}</p></div>
                  <div><p className="text-xs text-gray-500">Validité</p><p className="font-medium">30 jours</p></div>
                  <div><p className="text-xs text-gray-500">Conditions</p><p className="font-medium">À réception de facture</p></div>
                </div>

                {/* Client Info */}
                <div className="px-8 py-4 border-b">
                  <p className="text-xs text-gray-500 uppercase">Client</p>
                  <p className="font-bold text-lg">{request.companies?.name}</p>
                  {request.companies?.billing_address && <p className="text-gray-600 text-sm">{request.companies?.billing_address}</p>}
                  <p className="text-gray-600 text-sm">{request.companies?.billing_postal_code} {request.companies?.billing_city}</p>
                </div>

                {/* Summary Table - All Devices */}
                <div className="px-8 py-6">
                  <h3 className="font-bold text-gray-800 mb-4">Récapitulatif des prestations</h3>
                  
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1a1a2e] text-white">
                        <th className="px-3 py-2 text-left">Appareil</th>
                        <th className="px-3 py-2 text-left">N° Série</th>
                        <th className="px-3 py-2 text-left">Service</th>
                        <th className="px-3 py-2 text-right">Prix HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceQuotes.map((dq, i) => {
                        const services = [];
                        if (dq.needsCalibration) services.push('Étalonnage');
                        if (dq.needsRepair) services.push('Réparation');
                        
                        return (
                          <tr key={dq.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-3 py-3 font-medium">{dq.model}</td>
                            <td className="px-3 py-3 font-mono text-xs">{dq.serial}</td>
                            <td className="px-3 py-3">{services.join(' + ')}</td>
                            <td className="px-3 py-3 text-right font-medium">{getDeviceTotal(dq).toFixed(2)} €</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-6 border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sous-total services</span>
                      <span className="font-medium">{servicesTotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {isMetro ? `Frais de port (${deviceQuotes.length} appareil(s) × ${shippingPerDevice}€)` : 'Transport (géré par client)'}
                      </span>
                      <span className="font-medium">{shippingTotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#00A651] text-white px-4 py-3 rounded-lg mt-4">
                      <span className="font-bold text-lg">TOTAL HT</span>
                      <span className="font-bold text-2xl">{grandTotal.toFixed(2)} €</span>
                    </div>
                  </div>

                  {/* Disclaimers */}
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-xs text-gray-500 uppercase mb-2">Conditions</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {DISCLAIMERS.map((d, i) => (
                        <li key={i}>• {d}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Signature Area */}
                  <div className="mt-6 pt-4 border-t flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-500">Établi par</p>
                      <p className="font-bold">{signatory}</p>
                      <p className="text-sm text-gray-600">Lighthouse France</p>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <p>Signature client</p>
                      <div className="w-40 h-16 border-2 border-dashed border-gray-300 rounded mt-1"></div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-[#1a1a2e] text-white px-8 py-3 text-center text-xs">
                  <p className="font-medium">Lighthouse France SAS</p>
                  <p className="text-gray-400">16, rue Paul Séjourné • 94000 CRÉTEIL • Tél. 01 43 77 28 07</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirm */}
          {step === 4 && (
            <div className="flex items-center justify-center min-h-full p-8">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-[#00A651] rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-5xl text-white">📧</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Confirmer l'envoi du devis</h3>
                <p className="text-gray-600 mb-6">Le devis sera envoyé au client et disponible sur son portail.</p>
                
                <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
                  <p className="text-lg font-bold text-gray-800 mb-1">{request.companies?.name}</p>
                  <p className="text-sm text-gray-500 mb-4">{deviceQuotes.length} appareil(s)</p>
                  
                  <div className="space-y-2 text-sm">
                    {deviceQuotes.map(dq => (
                      <div key={dq.id} className="flex justify-between">
                        <span>{dq.model}</span>
                        <span className="font-medium">{getDeviceTotal(dq).toFixed(2)} €</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                      <span>Total HT</span>
                      <span className="text-[#00A651]">{grandTotal.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-left">
                  <p className="mb-1">✓ Un numéro RMA sera automatiquement attribué</p>
                  <p className="mb-1">✓ Le client recevra une notification</p>
                  <p>✓ Le devis sera disponible sur son portail</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between items-center shrink-0">
          <button onClick={step === 1 ? onClose : () => setStep(step - 1)} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium">
            {step === 1 ? 'Annuler' : '← Retour'}
          </button>
          <div className="flex gap-3">
            {step < 4 && (
              <button onClick={() => setStep(step + 1)} className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">
                Suivant →
              </button>
            )}
            {step === 4 && (
              <button onClick={sendQuote} disabled={saving} className="px-10 py-3 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-bold text-lg disabled:opacity-50">
                {saving ? 'Envoi en cours...' : '✅ Confirmer et Envoyer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
