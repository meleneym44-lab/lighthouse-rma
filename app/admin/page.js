'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Expose supabase to window for debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

const STATUS_STYLES = {
  submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Nouvelle demande' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'RMA Créé' },
  waiting_bc: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attente BC' },
  bc_review: { bg: 'bg-orange-100', text: 'text-orange-700', label: '⚠️ BC à vérifier' },
  bc_rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ BC Rejeté' },
  waiting_device: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Attente Appareil' },
  received: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Reçu' },
  in_queue: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'File attente' },
  inspection: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Inspection' },
  calibration_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Étalonnage' },
  repair_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Réparation' },
  quote_sent: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Devis envoyé' },
  quote_revision_requested: { bg: 'bg-red-100', text: 'text-red-700', label: '🔴 Modification demandée' },
  quote_approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Devis approuvé' },
  final_qc: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Contrôle final' },
  ready_to_ship: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Prêt à expédier' },
  shipped: { bg: 'bg-green-100', text: 'text-green-700', label: 'Expédié' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Terminé' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-500', label: '📦 Archivé' }
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
  const [contracts, setContracts] = useState([]);
  const [selectedRMA, setSelectedRMA] = useState(null); // Full-page RMA view

  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async (refreshSelectedRMA = false) => {
    const { data: reqs } = await supabase.from('service_requests')
      .select('*, companies(id, name, billing_city, billing_address, billing_postal_code), request_devices(*)')
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

    const { data: contractsData } = await supabase.from('contracts').select('id, status').order('created_at', { ascending: false });
    if (contractsData) setContracts(contractsData);
    
    // Only refresh selected RMA if explicitly requested AND we have one selected
    if (refreshSelectedRMA && selectedRMA) {
      const { data: updatedRMA } = await supabase
        .from('service_requests')
        .select('*, companies(id, name, billing_city, billing_address, billing_postal_code), request_devices(*)')
        .eq('id', selectedRMA.id)
        .single();
      if (updatedRMA) setSelectedRMA(updatedRMA);
    }
  }, [selectedRMA]);

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
  // Contract badge: new requests, BC pending review, OR quote revision requested
  const contractActionCount = contracts.filter(c => 
    c.status === 'requested' || 
    c.status === 'bc_pending' || 
    c.status === 'quote_revision_requested'
  ).length;
  // QC badge: count devices in final_qc status
  const qcPendingCount = requests.reduce((count, r) => 
    count + (r.request_devices?.filter(d => d.status === 'final_qc' && !d.qc_complete)?.length || 0), 0);
  
  const sheets = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: '📊' },
    { id: 'requests', label: 'Demandes', icon: '📋', badge: totalBadge > 0 ? totalBadge : null },
    { id: 'qc', label: 'Contrôle Qualité', icon: '✅', badge: qcPendingCount > 0 ? qcPendingCount : null },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'pricing', label: 'Tarifs & Pièces', icon: '💰' },
    { id: 'contracts', label: 'Contrats', icon: '📄', badge: contractActionCount > 0 ? contractActionCount : null },
    { id: 'settings', label: 'Paramètres', icon: '⚙️' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: '🔐' }] : [])
  ];

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin" /></div>;
  if (!user || !profile) return <LoginPage />;

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}
      <header className="bg-white text-[#1a1a2e] shadow-lg border-b-4 border-[#00A651]">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/images/logos/lighthouse-logo.png" 
              alt="Lighthouse France" 
              className="h-10 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="items-center gap-2 hidden">
              <span className="text-2xl font-bold text-[#00A651]">LIGHTHOUSE</span>
            </div>
            <div className="text-sm text-gray-500">France • Admin Portal</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{profile?.full_name}</p>
              <p className="text-xs text-gray-500">{isAdmin ? 'Administrateur' : 'Employe'}</p>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white">Deconnexion</button>
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
        {/* Full-page RMA View */}
        {selectedRMA ? (
          <RMAFullPage 
            rma={selectedRMA} 
            onBack={() => setSelectedRMA(null)} 
            notify={notify} 
            reload={() => loadData(true)}
            profile={profile}
          />
        ) : (
          <>
            {activeSheet === 'dashboard' && <DashboardSheet requests={requests} notify={notify} reload={loadData} isAdmin={isAdmin} onSelectRMA={setSelectedRMA} />}
            {activeSheet === 'requests' && <RequestsSheet requests={requests} notify={notify} reload={loadData} profile={profile} />}
            {activeSheet === 'qc' && <QCSheet requests={requests} notify={notify} reload={loadData} profile={profile} />}
            {activeSheet === 'clients' && <ClientsSheet clients={clients} requests={requests} equipment={equipment} notify={notify} reload={loadData} isAdmin={isAdmin} />}
            {activeSheet === 'pricing' && <PricingSheet notify={notify} isAdmin={isAdmin} />}
            {activeSheet === 'contracts' && <ContractsSheet clients={clients} notify={notify} profile={profile} reloadMain={loadData} />}
            {activeSheet === 'settings' && <SettingsSheet profile={profile} staffMembers={staffMembers} notify={notify} reload={loadData} />}
            {activeSheet === 'admin' && isAdmin && <AdminSheet profile={profile} staffMembers={staffMembers} notify={notify} reload={loadData} />}
          </>
        )}
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
          <img 
            src="/images/logos/lighthouse-logo.png" 
            alt="Lighthouse France" 
            className="h-14 w-auto mx-auto mb-3"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <h1 className="text-3xl font-bold text-[#00A651] hidden">LIGHTHOUSE</h1>
          <p className="text-gray-500 mt-2">France - Portail Administrateur</p>
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

function DashboardSheet({ requests, notify, reload, isAdmin, onSelectRMA }) {
  const [reviewingBC, setReviewingBC] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  
  const archivedRMAs = requests.filter(r => r.status === 'archived');
  const activeRMAs = requests.filter(r => r.request_number && !['completed', 'cancelled', 'archived'].includes(r.status));
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
        <div className="flex gap-2">
          {archivedRMAs.length > 0 && (
            <button 
              onClick={() => setShowArchived(!showArchived)} 
              className={`px-4 py-2 rounded-lg text-sm ${showArchived ? 'bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              📦 Archives ({archivedRMAs.length})
            </button>
          )}
          <button onClick={reload} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">🔄 Actualiser</button>
        </div>
      </div>
      
      {/* Archived RMAs Section */}
      {showArchived && archivedRMAs.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-700">📦 RMAs Archivés ({archivedRMAs.length})</h2>
          </div>
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {archivedRMAs.map(rma => (
              <div key={rma.id} onClick={() => onSelectRMA(rma)} className="bg-white rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-slate-500">{rma.request_number}</span>
                  <span className="text-sm text-slate-600">{rma.companies?.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Archivé le {rma.archived_at ? new Date(rma.archived_at).toLocaleDateString('fr-FR') : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
                  <tr key={rma.id} className={`hover:bg-gray-50 cursor-pointer ${hasBCToReview ? 'bg-red-50' : ''}`} onClick={() => !hasBCToReview && onSelectRMA(rma)}>
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
                        <button onClick={(e) => { e.stopPropagation(); setReviewingBC(rma); }} className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded">🔍 Examiner BC</button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); onSelectRMA(rma); }} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Voir →</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
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
        bc_approved_at: new Date().toISOString()
        // bc_approved_by removed - was causing UUID error
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
        status: 'bc_rejected', // Show rejection to customer
        bc_rejected_at: new Date().toISOString(),
        bc_rejection_reason: rejectReason,
        // Clear old BC data
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

// ============================================
// CONTRACT BC REVIEW MODAL - Copied from RMA BCReviewModal
// ============================================
function ContractBCReviewModal({ contract, onClose, notify, reload }) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const approveBC = async () => {
    setApproving(true);
    const { error } = await supabase
      .from('contracts')
      .update({ 
        status: 'active', 
        bc_approved_at: new Date().toISOString()
      })
      .eq('id', contract.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('✅ Contrat activé! Le client peut maintenant utiliser ses tokens.');
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
      .from('contracts')
      .update({ 
        status: 'bc_rejected',
        bc_rejection_reason: rejectReason,
        // Clear old BC data so customer can resubmit
        bc_file_url: null,
        signed_quote_url: null,
        bc_submitted_at: null
      })
      .eq('id', contract.id);
    
    if (error) {
      notify('Erreur: ' + error.message, 'error');
    } else {
      notify('BC refusé. Le client devra soumettre un nouveau BC.');
      reload();
      onClose();
    }
    setRejecting(false);
  };
  
  const devices = contract.contract_devices || [];
  const totalPrice = devices.reduce((sum, d) => sum + (d.unit_price || 0), 0);
  const totalTokens = devices.reduce((sum, d) => sum + (d.tokens_total || 0), 0);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex" onClick={onClose}>
      <div className="bg-white w-full max-w-6xl m-auto rounded-xl overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Vérification du Bon de Commande - Contrat</h2>
            <p className="text-orange-100">{contract.contract_number} • {contract.companies?.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-3xl">&times;</button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Document Preview */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-lg">📄 Documents</h3>
              
              {/* Signed Quote PDF */}
              {contract.signed_quote_url ? (
                <div className="border-2 border-green-200 rounded-lg overflow-hidden">
                  <div className="bg-green-100 px-4 py-2 flex justify-between items-center">
                    <span className="font-medium text-green-800">✅ Devis Signé (PDF)</span>
                    <a href={contract.signed_quote_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">
                      Ouvrir dans nouvel onglet ↗
                    </a>
                  </div>
                  <iframe src={contract.signed_quote_url} className="w-full h-96" title="Devis Signé PDF" />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
                  Aucun devis signé (signature électronique uniquement)
                </div>
              )}
              
              {/* BC File (if uploaded separately) */}
              {contract.bc_file_url && (
                <div className="border-2 border-purple-200 rounded-lg overflow-hidden">
                  <div className="bg-purple-100 px-4 py-2 flex justify-between items-center">
                    <span className="font-medium text-purple-800">📋 Bon de Commande Client</span>
                    <a href={contract.bc_file_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline text-sm">
                      Ouvrir dans nouvel onglet ↗
                    </a>
                  </div>
                  {contract.bc_file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={contract.bc_file_url} alt="BC Document" className="w-full" />
                  ) : contract.bc_file_url.match(/\.pdf$/i) ? (
                    <iframe src={contract.bc_file_url} className="w-full h-64" title="BC PDF" />
                  ) : (
                    <div className="p-8 text-center">
                      <a href={contract.bc_file_url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-purple-500 text-white rounded-lg inline-block">
                        📥 Télécharger le fichier
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              {/* Signature Info */}
              {contract.bc_signed_by && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-sm text-gray-600">
                    <strong>Signé par:</strong> {contract.bc_signed_by}
                  </p>
                  {contract.bc_submitted_at && (
                    <p className="text-sm text-gray-500">
                      <strong>Date:</strong> {new Date(contract.bc_submitted_at).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Right: Contract Details */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-lg">📋 Détails du Contrat</h3>
              
              {/* Contract Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">N° Contrat</p>
                    <p className="font-mono font-bold text-[#00A651]">{contract.contract_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Période</p>
                    <p className="font-medium text-sm">
                      {new Date(contract.start_date).toLocaleDateString('fr-FR')} - {new Date(contract.end_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date soumission BC</p>
                    <p className="font-medium">{contract.bc_submitted_at ? new Date(contract.bc_submitted_at).toLocaleString('fr-FR') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="font-medium">{contract.companies?.name}</p>
                  </div>
                </div>
              </div>
              
              {/* Pricing Summary */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">💰 Récapitulatif</h4>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-green-700">{devices.length} appareils • {totalTokens} étalonnages/an</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{totalPrice.toFixed(2)} € HT</p>
                </div>
              </div>
              
              {/* Devices */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">Appareils ({devices.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {devices.map((d, i) => (
                    <div key={i} className="bg-white rounded p-3 border">
                      <p className="font-medium">{d.model_name || 'Appareil'}</p>
                      <p className="text-sm text-gray-500">SN: {d.serial_number} • {d.tokens_total || 1} étal./an • {(d.unit_price || 0).toFixed(2)} €</p>
                    </div>
                  ))}
                </div>
              </div>
              
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
              {approving ? 'Activation...' : '✅ Approuver & Activer Contrat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// RMA FULL PAGE VIEW - Main service interface
// ============================================
function RMAFullPage({ rma, onBack, notify, reload, profile }) {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showAvenantPreview, setShowAvenantPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const devices = rma.request_devices || [];
  const style = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;
  const isContractRMA = rma.is_contract_rma || rma.contract_id;
  
  // Count inspections done
  const inspectionsDone = devices.filter(d => d.inspection_complete || d.service_findings).length;
  const allInspectionsDone = devices.length > 0 && inspectionsDone === devices.length;
  
  // Check if any device has additional work
  const devicesWithAdditionalWork = devices.filter(d => d.additional_work_needed && d.additional_work_items?.length > 0);
  const totalAdditionalWork = devicesWithAdditionalWork.reduce((sum, device) => {
    const deviceTotal = (device.additional_work_items || []).reduce((dSum, item) => 
      dSum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0
    );
    return sum + deviceTotal;
  }, 0);

  // Update RMA status
  const updateStatus = async (newStatus) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', rma.id);
      if (error) throw error;
      notify('Statut mis à jour!');
      reload();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSaving(false);
  };

  // If viewing device service screen
  if (selectedDevice) {
    return (
      <DeviceServiceModal
        device={selectedDevice}
        rma={rma}
        onBack={() => { setSelectedDevice(null); reload(); }}
        notify={notify}
        reload={reload}
        profile={profile}
      />
    );
  }

  // Check if avenant was already sent
  const avenantSent = rma.avenant_sent_at;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium"
          >
            ← Tableau de Bord
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">{rma.request_number}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
                {style.label}
              </span>
              {isContractRMA && (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                  📋 CONTRAT
                </span>
              )}
              {avenantSent && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                  📄 Avenant envoyé
                </span>
              )}
            </div>
            <p className="text-gray-500">Créé le {new Date(rma.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Show avenant button only if not already sent */}
          {allInspectionsDone && devicesWithAdditionalWork.length > 0 && !avenantSent && (
            <button 
              onClick={() => setShowAvenantPreview(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium"
            >
              📄 Créer Avenant (€{totalAdditionalWork.toFixed(2)})
            </button>
          )}
          {/* Show view avenant if already sent */}
          {avenantSent && (
            <button 
              onClick={() => setShowAvenantPreview(true)}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium"
            >
              📄 Voir Avenant (€{rma.avenant_total?.toFixed(2) || totalAdditionalWork.toFixed(2)})
            </button>
          )}
          {allInspectionsDone && devicesWithAdditionalWork.length === 0 && (
            <button 
              onClick={() => updateStatus('final_qc')}
              disabled={saving}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
            >
              ✓ Envoyer au QC
            </button>
          )}
        </div>
      </div>

      {/* Client Info Card */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-800">INFORMATIONS CLIENT</h2>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Client</p>
              <p className="font-bold text-gray-800 text-lg">{rma.companies?.name}</p>
              {rma.companies?.billing_address && (
                <p className="text-sm text-gray-500">{rma.companies.billing_address}</p>
              )}
              {rma.companies?.billing_postal_code && rma.companies?.billing_city && (
                <p className="text-sm text-gray-500">{rma.companies.billing_postal_code} {rma.companies.billing_city}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Service Demandé</p>
              <p className="font-medium text-gray-800">
                {rma.requested_service === 'calibration' ? '🔬 Étalonnage' : 
                 rma.requested_service === 'repair' ? '🔧 Réparation' : rma.requested_service}
              </p>
              <p className="text-sm text-gray-500 mt-1">{devices.length} appareil(s)</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">BC Original</p>
              <p className="font-bold text-gray-800">{rma.quote_total ? `€${rma.quote_total.toFixed(2)}` : '—'}</p>
              {rma.bc_submitted_at && (
                <p className="text-sm text-green-600">✓ Approuvé {new Date(rma.bc_submitted_at).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Documents</p>
              <div className="space-y-1">
                {rma.quote_url && <a href={rma.quote_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">📄 Devis</a>}
                {rma.bc_file_url && <a href={rma.bc_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">📋 BC</a>}
                {rma.signed_quote_url && <a href={rma.signed_quote_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">✍️ Devis Signé</a>}
                {!rma.quote_url && !rma.bc_file_url && !rma.signed_quote_url && <span className="text-gray-400 text-sm">Aucun</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Progression des inspections</span>
          <span className="text-sm font-bold text-gray-800">{inspectionsDone}/{devices.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all ${allInspectionsDone ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${devices.length > 0 ? (inspectionsDone / devices.length) * 100 : 0}%` }}
          />
        </div>
        {allInspectionsDone && (
          <p className="text-green-600 text-sm mt-2 font-medium">
            ✓ Toutes les inspections sont terminées
            {devicesWithAdditionalWork.length > 0 && ` • ${devicesWithAdditionalWork.length} appareil(s) avec travaux supplémentaires`}
          </p>
        )}
      </div>

      {/* Devices List - Horizontal Rows */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-800">APPAREILS ({devices.length})</h2>
        </div>
        <div className="divide-y">
          {devices.map((device, idx) => {
            const hasFindings = device.service_findings || device.inspection_complete;
            const hasAdditionalWork = device.additional_work_needed && device.additional_work_items?.length > 0;
            const additionalTotal = hasAdditionalWork 
              ? device.additional_work_items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0)
              : 0;
            const deviceStatus = device.status || rma.status;
            const deviceStyle = STATUS_STYLES[deviceStatus] || STATUS_STYLES.submitted;

            return (
              <div 
                key={device.id || idx}
                onClick={() => setSelectedDevice(device)}
                className={`px-6 py-4 cursor-pointer transition-all hover:bg-gray-50 ${
                  hasFindings 
                    ? hasAdditionalWork 
                      ? 'bg-amber-50 hover:bg-amber-100' 
                      : 'bg-green-50 hover:bg-green-100'
                    : ''
                }`}
              >
                <div className="flex items-center gap-6">
                  {/* Status Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                    hasFindings 
                      ? hasAdditionalWork ? 'bg-amber-200 text-amber-700' : 'bg-green-200 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {hasFindings ? (hasAdditionalWork ? '⚠' : '✓') : (idx + 1)}
                  </div>

                  {/* Device Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-gray-800">{device.model_name}</h3>
                      <span className="text-sm text-gray-500">SN: {device.serial_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${deviceStyle.bg} ${deviceStyle.text}`}>
                        {deviceStyle.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {device.service_type === 'calibration' ? '🔬 Étalonnage' : '🔧 Réparation'}
                      </span>
                    </div>
                    
                    {/* Customer Notes */}
                    {device.notes && (
                      <p className="text-sm text-blue-600 mb-1">
                        📝 Client: "{device.notes}"
                      </p>
                    )}

                    {/* Findings Preview */}
                    {hasFindings && device.service_findings && (
                      <p className="text-sm text-gray-600 truncate">
                        Constatations: {device.service_findings}
                      </p>
                    )}
                  </div>

                  {/* Additional Work / Status */}
                  <div className="flex-shrink-0 text-right">
                    {hasFindings ? (
                      <>
                        {hasAdditionalWork ? (
                          <div>
                            <p className="text-lg font-bold text-amber-700">€{additionalTotal.toFixed(2)}</p>
                            <p className="text-xs text-amber-600">Travaux supp.</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-lg font-bold text-green-700">RAS</p>
                            <p className="text-xs text-green-600">Aucun travaux</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-500">En attente</p>
                        <p className="text-xs text-blue-600">Cliquer →</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avenant Preview Modal */}
      {showAvenantPreview && (
        <AvenantPreviewModal
          rma={rma}
          devices={devices}
          onClose={() => setShowAvenantPreview(false)}
          notify={notify}
          reload={reload}
          alreadySent={avenantSent}
        />
      )}
    </div>
  );
}

// Device Service Modal - For filling inspection/findings
function DeviceServiceModal({ device, rma, onBack, notify, reload, profile }) {
  const [findings, setFindings] = useState(device.service_findings || '');
  const [additionalWorkNeeded, setAdditionalWorkNeeded] = useState(device.additional_work_needed || false);
  const [workItems, setWorkItems] = useState(device.additional_work_items || []);
  const [workCompleted, setWorkCompleted] = useState(device.work_completed || '');
  const [saving, setSaving] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [partsLoading, setPartsLoading] = useState({});
  const [technicianName, setTechnicianName] = useState(device.technician_name || '');
  const [staffMembers, setStaffMembers] = useState([]);
  
  // Lock work items if they were previously saved (have items in DB)
  const [workItemsLocked, setWorkItemsLocked] = useState((device.additional_work_items || []).length > 0);
  
  // Report options - initialize from device data, empty string means not selected yet, 'none' means don't show
  const [calType, setCalType] = useState(device.cal_type || '');
  const [receptionResult, setReceptionResult] = useState(device.reception_result || '');
  
  // Certificate upload for calibrations
  const [certificateUrl, setCertificateUrl] = useState(device.calibration_certificate_url || '');
  const [uploadingCert, setUploadingCert] = useState(false);
  
  const isCalibration = device.service_type === 'calibration' || device.service_type === 'both';
  const needsCertificate = isCalibration && !certificateUrl;
  
  const calTypeOptions = [
    { value: 'none', label: 'Ne pas afficher' },
    { value: 'ISO 21501-4', label: 'ISO 21501-4' },
    { value: 'Non-ISO', label: 'Non-ISO' },
    { value: 'Bio Collecteur', label: 'Bio Collecteur' },
    { value: 'Compteur Liquide', label: 'Compteur Liquide' },
    { value: 'Sonde de Température', label: 'Sonde de Température' },
    { value: 'Diluteur', label: 'Diluteur' }
  ];
  
  const receptionOptions = [
    { value: 'none', label: 'Ne pas afficher' },
    { value: 'Conforme', label: 'Conforme' },
    { value: 'Non conforme', label: 'Non conforme' },
    { value: 'À vérifier', label: 'À vérifier' }
  ];
  
  // Load staff members for technician dropdown
  useEffect(() => {
    const loadStaff = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      if (data) setStaffMembers(data.filter(s => s.full_name)); // Only show profiles with names
    };
    loadStaff();
  }, []);
  
  // Upload certificate handler
  const handleCertificateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      notify('Veuillez télécharger un fichier PDF', 'error');
      return;
    }
    
    setUploadingCert(true);
    try {
      const fileName = `certificates/${rma.request_number}/${device.serial_number}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
      
      // Save to device record
      const { error: updateError } = await supabase.from('request_devices').update({
        calibration_certificate_url: publicUrl,
        calibration_certificate_uploaded_at: new Date().toISOString()
      }).eq('id', device.id);
      
      if (updateError) throw updateError;
      
      setCertificateUrl(publicUrl);
      notify('✓ Certificat téléchargé');
      reload();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setUploadingCert(false);
  };
  
  const avenantSent = rma.avenant_sent_at;
  const avenantApproved = rma.avenant_approved_at;
  const reportComplete = device.report_complete;
  
  const getDefaultChecklist = () => {
    if (device.service_type === 'calibration') {
      return [
        { id: 'visual_inspection', label: 'Inspection visuelle effectuée', checked: false },
        { id: 'cleaning', label: 'Nettoyage effectué', checked: false },
        { id: 'calibration_performed', label: 'Étalonnage réalisé selon procédure', checked: false },
        { id: 'results_within_spec', label: 'Résultats dans les spécifications', checked: false },
        { id: 'certificate_generated', label: 'Certificat d\'étalonnage généré', checked: false },
      ];
    } else {
      return [
        { id: 'visual_inspection', label: 'Inspection visuelle effectuée', checked: false },
        { id: 'diagnostic', label: 'Diagnostic complet réalisé', checked: false },
        { id: 'repair_performed', label: 'Réparation effectuée', checked: false },
        { id: 'parts_replaced', label: 'Pièces remplacées (si applicable)', checked: false },
        { id: 'functional_test', label: 'Test fonctionnel OK', checked: false },
      ];
    }
  };
  
  const [checklist, setChecklist] = useState(() => {
    const saved = device.work_checklist;
    if (saved && Object.keys(saved).length > 0) {
      return getDefaultChecklist().map(item => ({ ...item, checked: saved[item.id] || false }));
    }
    return getDefaultChecklist();
  });
  
  const toggleChecklistItem = (id) => setChecklist(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  
  // Add work item with part number field
  const addWorkItem = () => setWorkItems([...workItems, { id: Date.now(), part_number: '', description: '', quantity: 1, price: 0 }]);
  
  const updateWorkItem = (id, field, value) => setWorkItems(workItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  
  const removeWorkItem = (id) => setWorkItems(workItems.filter(item => item.id !== id));
  
  // Lookup part by part number from existing parts_pricing table
  const lookupPart = async (itemId, partNumber) => {
    if (!partNumber || partNumber.length < 2) return;
    
    setPartsLoading(prev => ({ ...prev, [itemId]: true }));
    try {
      const { data, error } = await supabase
        .from('parts_pricing')
        .select('part_number, description, description_fr, unit_price')
        .ilike('part_number', `%${partNumber}%`)
        .limit(1)
        .single();
      
      if (data && !error) {
        // Use French description if available, otherwise English
        const desc = data.description_fr || data.description || '';
        setWorkItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, description: desc, price: data.unit_price || 0, part_number: data.part_number } : item
        ));
        notify(`✓ ${data.part_number}: ${desc}`);
      }
    } catch (err) {
      // Part not found - that's okay, user can enter manually
    }
    setPartsLoading(prev => ({ ...prev, [itemId]: false }));
  };
  
  const totalAdditional = workItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);
  const canPreviewReport = findings.trim() && workCompleted.trim() && technicianName && calType && receptionResult && (!isCalibration || certificateUrl);
  
  const getValidationMessage = () => {
    const missing = [];
    if (!technicianName) missing.push('Technicien');
    if (!calType) missing.push('Étalonnage effectué');
    if (!receptionResult) missing.push('Résultats à la réception');
    if (!findings.trim()) missing.push('Constatations');
    if (!workCompleted.trim()) missing.push('Actions effectuées');
    if (isCalibration && !certificateUrl) missing.push('Certificat d\'étalonnage');
    return missing.length > 0 ? `Veuillez remplir: ${missing.join(', ')}` : null;
  };
  
  const handlePreviewClick = () => {
    if (canPreviewReport) {
      setShowReportPreview(true);
    } else {
      notify(getValidationMessage(), 'error');
    }
  };
  
  const saveProgress = async () => {
    setSaving(true);
    const checklistObj = {};
    checklist.forEach(item => { checklistObj[item.id] = item.checked; });
    try {
      const { error } = await supabase.from('request_devices').update({
        service_findings: findings, additional_work_needed: additionalWorkNeeded,
        additional_work_items: additionalWorkNeeded ? workItems : [],
        work_completed: workCompleted, work_checklist: checklistObj,
        technician_name: technicianName,
        cal_type: calType,
        reception_result: receptionResult
      }).eq('id', device.id);
      if (error) throw error;
      notify('✓ Enregistré');
      // Lock work items after successful save if there are any
      if (additionalWorkNeeded && workItems.length > 0) {
        setWorkItemsLocked(true);
      }
      reload();
    } catch (err) { notify('Erreur: ' + err.message, 'error'); }
    setSaving(false);
  };
  
  const completeReport = async () => {
    setSaving(true);
    const checklistObj = {};
    checklist.forEach(item => { checklistObj[item.id] = item.checked; });
    try {
      const { error } = await supabase.from('request_devices').update({
        service_findings: findings, additional_work_needed: additionalWorkNeeded,
        additional_work_items: additionalWorkNeeded ? workItems : [],
        work_completed: workCompleted, work_checklist: checklistObj,
        technician_name: technicianName,
        cal_type: calType,
        reception_result: receptionResult,
        report_complete: true, report_completed_at: new Date().toISOString(), status: 'final_qc'
      }).eq('id', device.id);
      if (error) throw error;
      notify('✓ Rapport terminé → QC!');
      reload();
      onBack();
    } catch (err) { notify('Erreur: ' + err.message, 'error'); }
    setSaving(false);
  };

  if (showReportPreview) {
    return <ReportPreviewModal device={device} rma={rma} findings={findings} workCompleted={workCompleted} checklist={checklist} additionalWorkNeeded={additionalWorkNeeded} workItems={workItems} onClose={() => setShowReportPreview(false)} onComplete={completeReport} canComplete={!additionalWorkNeeded || avenantApproved} saving={saving} technicianName={technicianName} calType={calType} receptionResult={receptionResult} />;
  }

  const renderActionButtons = () => {
    if (reportComplete) return <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">✓ Rapport terminé</span>;
    if (!additionalWorkNeeded) return (<><button onClick={saveProgress} disabled={saving} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button><button onClick={handlePreviewClick} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">📄 Aperçu Rapport →</button></>);
    if (additionalWorkNeeded && !avenantSent) return (<><button onClick={saveProgress} disabled={saving} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button><span className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm">⚠️ Créer avenant depuis page RMA</span></>);
    if (additionalWorkNeeded && avenantSent && !avenantApproved) return (<><button onClick={saveProgress} disabled={saving} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button><span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg">⏳ Attente approbation</span></>);
    if (additionalWorkNeeded && avenantApproved) return (<><button onClick={saveProgress} disabled={saving} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button><button onClick={handlePreviewClick} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">📄 Aperçu Rapport →</button></>);
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">← Retour</button>
          <div><h1 className="text-2xl font-bold text-gray-800">SERVICE - {device.model_name}</h1><p className="text-gray-500">SN: {device.serial_number} • RMA: {rma.request_number}</p></div>
        </div>
        <div className="flex items-center gap-3">{renderActionButtons()}</div>
      </div>

      {additionalWorkNeeded && (
        <div className={`rounded-lg p-3 ${avenantApproved ? 'bg-green-100 border border-green-300' : avenantSent ? 'bg-purple-100 border border-purple-300' : 'bg-amber-100 border border-amber-300'}`}>
          <span className={`font-medium ${avenantApproved ? 'text-green-800' : avenantSent ? 'text-purple-800' : 'text-amber-800'}`}>
            {avenantApproved ? '✓ Avenant approuvé par le client' : avenantSent ? '📤 Avenant envoyé - En attente approbation' : '⚠️ Travaux supplémentaires détectés - Avenant requis'}
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold text-gray-700 mb-3">Appareil</h3>
            <div className="space-y-2">
              <div><p className="text-xs text-gray-500">Modèle</p><p className="font-bold text-gray-800">{device.model_name}</p></div>
              <div><p className="text-xs text-gray-500">N° série</p><p className="font-medium text-gray-800">{device.serial_number}</p></div>
              <div><p className="text-xs text-gray-500">Service</p><p className="font-medium">{device.service_type === 'calibration' ? '🔬 Étalonnage' : '🔧 Réparation'}</p></div>
            </div>
          </div>
          {device.notes && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
              <h3 className="font-bold text-amber-800 mb-2">📝 Notes Client</h3>
              <p className="text-amber-900">"{device.notes}"</p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl border p-4">
            <h3 className="font-bold text-gray-700 mb-2">Client</h3>
            <p className="font-medium text-gray-800">{rma.companies?.name}</p>
          </div>
          
          {/* Report Options Section */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 space-y-3">
            <h3 className="font-bold text-blue-800">Options du Rapport</h3>
            
            {/* Technician */}
            <div>
              <label className="text-sm text-gray-600 block mb-1">Technicien(ne) de service *</label>
              <select 
                value={technicianName} 
                onChange={e => setTechnicianName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">— Sélectionner —</option>
                {staffMembers.map(s => (
                  <option key={s.id} value={s.full_name}>{s.full_name}</option>
                ))}
              </select>
            </div>
            
            {/* Calibration Type */}
            <div>
              <label className="text-sm text-gray-600 block mb-1">Étalonnage effectué *</label>
              <select value={calType} onChange={e => setCalType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">— Sélectionner —</option>
                {calTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            
            {/* Reception Result */}
            <div>
              <label className="text-sm text-gray-600 block mb-1">Résultats à la réception *</label>
              <select value={receptionResult} onChange={e => setReceptionResult(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">— Sélectionner —</option>
                {receptionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          
          {/* Certificate Upload - Only for calibrations */}
          {isCalibration && (
            <div className={`rounded-xl border p-4 ${certificateUrl ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <h3 className={`font-bold mb-2 ${certificateUrl ? 'text-green-800' : 'text-amber-800'}`}>
                📜 Certificat d'Étalonnage {certificateUrl ? '✓' : '*'}
              </h3>
              
              {certificateUrl ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-700">Certificat téléchargé</p>
                  <div className="flex gap-2">
                    <a href={certificateUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
                      📄 Voir PDF
                    </a>
                    <label className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm cursor-pointer">
                      Remplacer
                      <input type="file" accept=".pdf" onChange={handleCertificateUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-amber-700 mb-2">Requis pour envoyer au QC</p>
                  <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${uploadingCert ? 'bg-gray-300' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
                    {uploadingCert ? '⏳ Téléchargement...' : '📤 Télécharger PDF'}
                    <input type="file" accept=".pdf" onChange={handleCertificateUpload} disabled={uploadingCert} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold text-gray-700 mb-2">1. CONSTATATIONS *</h3>
            <p className="text-sm text-gray-500 mb-3">Ce que vous avez observé (apparaît sur rapport et avenant)</p>
            <textarea value={findings} onChange={e => setFindings(e.target.value)} placeholder="Ex: Calibration effectuée selon les spécifications..." className="w-full px-4 py-3 border rounded-xl h-28 resize-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800">2. Travaux supplémentaires ?</h3>
                <p className="text-sm text-gray-500">Pièces ou main d'œuvre en plus</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setAdditionalWorkNeeded(false); setWorkItemsLocked(false); }} className={`px-4 py-2 rounded-lg font-medium ${!additionalWorkNeeded ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Non (RAS)</button>
                <button onClick={() => setAdditionalWorkNeeded(true)} className={`px-4 py-2 rounded-lg font-medium ${additionalWorkNeeded ? 'bg-amber-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Oui</button>
              </div>
            </div>
            {additionalWorkNeeded && (
              <div className="border-t pt-4">
                {/* Locked state - show read-only with edit button */}
                {workItemsLocked ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500 flex items-center gap-2">🔒 Pièces enregistrées</span>
                      <button onClick={() => setWorkItemsLocked(false)} className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg">✏️ Modifier</button>
                    </div>
                    <div className="space-y-2">
                      {workItems.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 bg-gray-100 rounded-lg p-3">
                          <span className="text-gray-400 w-6">{idx + 1}.</span>
                          <span className="text-gray-500 text-sm w-24">{item.part_number || '—'}</span>
                          <span className="flex-1 font-medium">{item.description}</span>
                          <span className="text-gray-600">×{item.quantity}</span>
                          <span className="font-bold text-amber-700 w-24 text-right">€{(parseFloat(item.price) || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {workItems.length > 0 && (
                      <div className="mt-4 pt-4 border-t flex justify-between">
                        <span className="font-medium">Sous-total:</span>
                        <span className="text-xl font-bold text-amber-700">€{totalAdditional.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Editable state */
                  <div>
                    <div className="space-y-2">
                      {workItems.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                          <span className="text-gray-400 w-6">{idx + 1}.</span>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={item.part_number || ''} 
                              onChange={e => updateWorkItem(item.id, 'part_number', e.target.value)}
                              onBlur={e => lookupPart(item.id, e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && lookupPart(item.id, e.target.value)}
                              placeholder="N° Pièce" 
                              className="w-28 px-3 py-2 border rounded-lg text-sm"
                            />
                            {partsLoading[item.id] && <span className="absolute right-2 top-2 text-blue-500 text-sm">...</span>}
                          </div>
                          <input type="text" value={item.description} onChange={e => updateWorkItem(item.id, 'description', e.target.value)} placeholder="Description" className="flex-1 px-3 py-2 border rounded-lg" />
                          <input type="number" value={item.quantity} onChange={e => updateWorkItem(item.id, 'quantity', e.target.value)} className="w-16 px-3 py-2 border rounded-lg text-center" min="1" />
                          <span className="text-gray-400">€</span>
                          <input type="number" value={item.price} onChange={e => updateWorkItem(item.id, 'price', e.target.value)} className="w-24 px-3 py-2 border rounded-lg text-right" step="0.01" />
                          <button onClick={() => removeWorkItem(item.id)} className="p-2 text-red-500 hover:bg-red-100 rounded">✕</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={addWorkItem} className="mt-3 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">+ Ajouter pièce</button>
                    {workItems.length > 0 && (
                      <div className="mt-4 pt-4 border-t flex justify-between">
                        <span className="font-medium">Sous-total:</span>
                        <span className="text-xl font-bold text-amber-700">€{totalAdditional.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold text-gray-700 mb-2">3. TRAVAUX RÉALISÉS *</h3>
            <p className="text-sm text-gray-500 mb-4">Cochez et décrivez le travail effectué</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 uppercase mb-3">Checklist</p>
              <div className="space-y-2">
                {checklist.map(item => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg">
                    <input type="checkbox" checked={item.checked} onChange={() => toggleChecklistItem(item.id)} className="w-5 h-5 rounded text-green-600" />
                    <span className={item.checked ? 'text-green-700' : 'text-gray-700'}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <textarea value={workCompleted} onChange={e => setWorkCompleted(e.target.value)} placeholder="Décrivez les travaux réalisés..." className="w-full px-4 py-3 border rounded-xl h-28 resize-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Report Preview Modal - Exact replica of official Lighthouse France Rapport PDF
function ReportPreviewModal({ device, rma, findings, workCompleted, checklist, additionalWorkNeeded, workItems, onClose, onComplete, canComplete, saving, technicianName, calType, receptionResult }) {
  const today = new Date().toLocaleDateString('fr-FR');
  const serviceTypeText = device.service_type === 'calibration' ? 'Étalonnage' : device.service_type === 'repair' ? 'Réparation' : 'Étalonnage et Réparation';
  const motifText = device.notes ? `${serviceTypeText} - ${device.notes}` : serviceTypeText;
  
  const showCalType = calType && calType !== 'none';
  const showReceptionResult = receptionResult && receptionResult !== 'none';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">← Retour</button>
          <div><h1 className="text-2xl font-bold text-gray-800">📄 Aperçu Rapport de Service</h1><p className="text-gray-500">{device.model_name} • SN: {device.serial_number}</p></div>
        </div>
        <div className="flex items-center gap-3">
          {canComplete ? (
            <button onClick={onComplete} disabled={saving} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50">{saving ? 'Envoi...' : '✓ Terminer Rapport → QC'}</button>
          ) : (
            <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg">⏳ Approbation client requise</span>
          )}
        </div>
      </div>

      {/* Report Document - Exact replica of PDF */}
      <div className="bg-gray-400 p-8 min-h-full flex justify-center">
        <div className="bg-white shadow-2xl w-full max-w-3xl relative" style={{ fontFamily: 'Arial, sans-serif', padding: '40px 50px', minHeight: '1000px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Logo Header - Using actual logo image */}
          <div className="mb-10">
            <img 
              src="/images/logos/lighthouse-logo.png" 
              alt="Lighthouse Worldwide Solutions" 
              className="h-12 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="items-center gap-2 hidden">
              <div className="flex flex-col gap-0.5 mr-2">
                <div className="w-12 h-2 bg-[#FFD200]"></div>
                <div className="w-12 h-2 bg-[#003366]"></div>
              </div>
              <div>
                <span className="text-2xl font-bold tracking-wide" style={{ color: '#003366' }}>LIGHTHOUSE</span>
                <p className="text-xs tracking-widest text-gray-500 -mt-1">WORLDWIDE SOLUTIONS</p>
              </div>
            </div>
          </div>

          {/* Main Content - Grows to fill space */}
          <div className="flex-grow">
            {/* Info Table - Client/Device info */}
            <table className="w-full text-sm mb-6" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '150px' }} />
                <col style={{ width: '200px' }} />
                <col />
              </colgroup>
              <tbody>
                {/* Row 1: Date + RMA */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Date d'achèvement</td>
                  <td className="py-1 text-gray-800">{today}</td>
                  <td className="py-1 text-gray-800">
                    <span className="font-bold text-[#003366]">RMA # </span>{rma.request_number}
                  </td>
                </tr>
                
                {/* Row 2: Client */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Client</td>
                  <td className="py-1 text-gray-800" colSpan="2">{rma.companies?.name}</td>
                </tr>
                
                {/* Row 3: Adresse */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Adresse</td>
                  <td className="py-1 text-gray-800" colSpan="2">{rma.companies?.billing_address || '—'}</td>
                </tr>
                
                {/* Row 4: Code postal + Contact */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Code postal / Ville</td>
                  <td className="py-1 text-gray-800">{rma.companies?.billing_postal_code} {rma.companies?.billing_city}</td>
                  <td className="py-1 text-gray-800">
                    <span className="font-bold text-[#003366]">Contact </span>{rma.companies?.contact_name || '—'}
                  </td>
                </tr>
                
                {/* Row 5: Téléphone + Technicien label */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Téléphone</td>
                  <td className="py-1 text-gray-800">{rma.companies?.phone || '—'}</td>
                  <td className="py-1 text-gray-800 align-top">
                    <span className="font-bold text-[#003366]">Technicien(ne) de service</span>
                  </td>
                </tr>
                
                {/* Row 6: Modèle + Technicien name */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Modèle#</td>
                  <td className="py-1 text-gray-800">{device.model_name}</td>
                  <td className="py-1 text-gray-800">{technicianName || 'Lighthouse France'}</td>
                </tr>
                
                {/* Row 7: Numéro de série */}
                <tr>
                  <td className="py-1 font-bold text-[#003366] align-top whitespace-nowrap">Numéro de série</td>
                  <td className="py-1 text-gray-800" colSpan="2">{device.serial_number}</td>
                </tr>
              </tbody>
            </table>

            {/* Content Sections */}
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '170px' }} />
                <col />
              </colgroup>
              <tbody>
                {/* Motif de retour = Service type + Customer notes */}
                <tr>
                  <td className="pt-6 pb-2 font-bold text-[#003366] align-top whitespace-nowrap">Motif de retour</td>
                  <td className="pt-6 pb-2 text-gray-800" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>{motifText}</td>
                </tr>
                
                {/* Étalonnage effectué - only if not 'none' */}
                {showCalType && (
                  <tr>
                    <td className="py-2 font-bold text-[#003366] align-top whitespace-nowrap">Étalonnage effectué</td>
                    <td className="py-2 text-gray-800">{calType}</td>
                  </tr>
                )}
                
                {/* Résultats à la réception - only if not 'none' */}
                {showReceptionResult && (
                  <tr>
                    <td className="py-2 font-bold text-[#003366] align-top whitespace-nowrap">Résultats à la réception</td>
                    <td className="py-2 text-gray-800">{receptionResult}</td>
                  </tr>
                )}
                
                {/* Constatations (Tech findings) */}
                <tr>
                  <td className="pt-6 pb-2 font-bold text-[#003366] align-top whitespace-nowrap">Constatations</td>
                  <td className="pt-6 pb-2 text-gray-800" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{findings || '—'}</td>
                </tr>
                
                {/* Actions effectuées (Work description) */}
                <tr>
                  <td className="py-2 font-bold text-[#003366] align-top whitespace-nowrap">Actions effectuées</td>
                  <td className="py-2 text-gray-800" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{workCompleted || '—'}</td>
                </tr>
                
                {/* Travaux réalisés (Checklist) - more space above */}
                <tr>
                  <td className="pt-10 pb-2 font-bold text-[#003366] align-top whitespace-nowrap">Travaux réalisés</td>
                  <td className="pt-10 pb-2">
                    <div className="space-y-1">
                      {checklist.filter(item => item.checked).map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="text-[#003366]">☑</span>
                          <span className="text-gray-800">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer - Always at bottom */}
          <div className="text-center text-sm text-gray-600 mt-auto pt-8">
            <p className="font-bold text-[#003366]">Lighthouse Worldwide Solutions France</p>
            <p>16 Rue Paul Séjourné 94000 Créteil France</p>
            <p>01 43 77 28 07</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Avenant Preview Modal - Shows additional work quote to send to client
function AvenantPreviewModal({ rma, devices, onClose, notify, reload, alreadySent }) {
  const [sending, setSending] = useState(false);
  const devicesWithWork = devices.filter(d => d.additional_work_needed && d.additional_work_items?.length > 0);
  const devicesRAS = devices.filter(d => !d.additional_work_needed || !d.additional_work_items?.length);
  
  const totalAvenant = devicesWithWork.reduce((sum, device) => {
    const deviceTotal = (device.additional_work_items || []).reduce((dSum, item) => 
      dSum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0
    );
    return sum + deviceTotal;
  }, 0);
  
  const sendAvenant = async () => {
    setSending(true);
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'quote_sent',
          avenant_total: totalAvenant,
          avenant_sent_at: new Date().toISOString()
        })
        .eq('id', rma.id);
      
      if (error) throw error;
      notify('✓ Avenant envoyé au client!');
      reload();
      onClose();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSending(false);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800">📄 Avenant au Devis</h2>
              {alreadySent && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                  ✓ Envoyé le {new Date(rma.avenant_sent_at).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">Travaux supplémentaires découverts lors du service</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
        </div>
        
        <div className="p-6">
          {/* Quote Header - Like official document */}
          <div className="border-2 border-gray-300 rounded-xl overflow-hidden mb-6">
            {/* Company Header */}
            <div className="bg-[#1a1a2e] text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">LIGHTHOUSE FRANCE</h3>
                  <p className="text-gray-300 text-sm mt-1">Service Métrologie & Calibration</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[#00A651]">AVENANT</p>
                  <p className="text-gray-300">RMA: {rma.request_number}</p>
                  <p className="text-gray-400 text-sm">{alreadySent ? new Date(rma.avenant_sent_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
            
            {/* Client Info */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Client</p>
                  <p className="font-bold text-gray-800">{rma.companies?.name}</p>
                  {rma.companies?.billing_address && <p className="text-sm text-gray-600">{rma.companies.billing_address}</p>}
                  {rma.companies?.billing_postal_code && <p className="text-sm text-gray-600">{rma.companies.billing_postal_code} {rma.companies.billing_city}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-medium">Référence</p>
                  <p className="font-bold text-gray-800">{rma.request_number}</p>
                  <p className="text-sm text-gray-600">Devis initial: {rma.quote_total ? `€${rma.quote_total.toFixed(2)}` : '—'}</p>
                </div>
              </div>
            </div>
            
            {/* Introduction */}
            <div className="px-6 py-4 bg-amber-50 border-b">
              <p className="text-sm text-amber-800">
                <strong>Objet:</strong> Suite à l'inspection de vos appareils, nous avons constaté des travaux supplémentaires nécessaires. 
                Veuillez trouver ci-dessous le détail des interventions recommandées.
              </p>
            </div>
            
            {/* Devices with additional work */}
            <div className="divide-y">
              {devicesWithWork.map((device, idx) => {
                const deviceTotal = (device.additional_work_items || []).reduce((sum, item) => 
                  sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0
                );
                
                return (
                  <div key={device.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-gray-800 text-lg">{device.model_name}</p>
                        <p className="text-sm text-gray-500">N° de série: {device.serial_number}</p>
                        <p className="text-xs text-gray-400">Service: {device.service_type === 'calibration' ? 'Étalonnage' : 'Réparation'}</p>
                      </div>
                      <span className="text-xl font-bold text-gray-800">€{deviceTotal.toFixed(2)}</span>
                    </div>
                    
                    {/* Findings */}
                    {device.service_findings && (
                      <div className="bg-gray-100 rounded-lg p-4 mb-4">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Constatations du technicien</p>
                        <p className="text-gray-700">{device.service_findings}</p>
                      </div>
                    )}
                    
                    {/* Work Items Table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-gray-600">Description</th>
                          <th className="text-center py-2 text-gray-600 w-20">Qté</th>
                          <th className="text-right py-2 text-gray-600 w-24">Prix Unit.</th>
                          <th className="text-right py-2 text-gray-600 w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(device.additional_work_items || []).map((item, itemIdx) => (
                          <tr key={itemIdx} className="border-b border-gray-100">
                            <td className="py-2">{item.description}</td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 text-right">€{(parseFloat(item.price) || 0).toFixed(2)}</td>
                            <td className="py-2 text-right font-medium">€{((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            
            {/* Devices without additional work (RAS) */}
            {devicesRAS.length > 0 && (
              <div className="px-6 py-4 bg-green-50 border-t">
                <p className="text-sm text-green-800 font-medium mb-2">Appareils sans travaux supplémentaires:</p>
                <div className="space-y-1">
                  {devicesRAS.map(device => (
                    <p key={device.id} className="text-sm text-green-700">
                      ✓ {device.model_name} (SN: {device.serial_number}) - {device.service_findings || 'RAS'}
                    </p>
                  ))}
                </div>
              </div>
            )}
            
            {/* Total */}
            <div className="px-6 py-4 flex justify-between items-center bg-[#00A651] text-white">
              <span className="text-lg font-bold">TOTAL AVENANT</span>
              <span className="text-2xl font-bold">€{totalAvenant.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Terms */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Ce devis est valable 30 jours à compter de sa date d'émission.</p>
            <p>• Les travaux seront effectués après réception de votre accord écrit.</p>
            <p>• Conditions de règlement: 30 jours fin de mois.</p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center sticky bottom-0">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
            ← Fermer
          </button>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
              📥 Télécharger PDF
            </button>
            {!alreadySent && (
              <button 
                onClick={sendAvenant}
                disabled={sending}
                className="px-6 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium disabled:opacity-50"
              >
                {sending ? 'Envoi...' : '📧 Envoyer au Client'}
              </button>
            )}
            {alreadySent && (
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                ✓ Envoyé le {new Date(rma.avenant_sent_at).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>
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
              const isContractRMA = req.is_contract_rma || req.contract_id;
              
              return (
                <tr key={req.id} className={`hover:bg-gray-50 ${needsRevision ? 'bg-red-50' : isPending ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {req.request_number ? (
                        <span className="font-mono font-bold text-[#00A651]">{req.request_number}</span>
                      ) : (
                        <span className="text-amber-600 font-medium">Nouvelle</span>
                      )}
                      {isContractRMA && (
                        <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-700">
                          📋
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">{req.companies?.name || '—'}</p>
                    </div>
                  </td>
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
        <div className="px-6 py-4 border-b sticky top-0 bg-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{request.request_number || 'Nouvelle Demande'}</h2>
            <p className="text-sm text-gray-500">{request.companies?.name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>{style.label}</span>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Client</h3><p className="font-medium">{request.companies?.name}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Service</h3><p className="font-medium">{request.requested_service}</p><p className="text-sm text-gray-500">Soumis le {new Date(request.created_at).toLocaleDateString('fr-FR')}</p></div>
          </div>
          
          {/* Devices */}
          <div>
            <h3 className="font-bold text-gray-700 mb-3">Appareils ({devices.length || 1})</h3>
            {devices.length > 0 ? (
              <div className="space-y-2">
                {devices.map((d, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{d.model_name}</p>
                      <p className="text-sm text-gray-500">SN: {d.serial_number}</p>
                      {d.service_type && <p className="text-xs text-gray-400">{d.service_type}</p>}
                    </div>
                    <span className="text-sm text-gray-400">{d.equipment_type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3"><p className="font-medium">{request.serial_number}</p></div>
            )}
          </div>
          
          {request.problem_description && <div><h3 className="font-bold text-gray-700 mb-2">Notes du client</h3><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm whitespace-pre-wrap">{request.problem_description}</p></div></div>}
        </div>
        
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Fermer</button>
          {isPending && (
            <button onClick={onCreateQuote} className="px-6 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium">
              💰 Créer Devis
            </button>
          )}
        </div>
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

// ============================================
// QC SHEET - Quality Control Review & Approve
// ============================================
function QCSheet({ requests, notify, reload, profile }) {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedRMA, setSelectedRMA] = useState(null);
  const [filter, setFilter] = useState('pending'); // pending, completed
  
  // Get all devices that need QC or have completed QC
  const allDevices = requests.flatMap(r => 
    (r.request_devices || []).map(d => ({ ...d, rma: r }))
  ).filter(d => d.status === 'final_qc' || d.qc_complete);
  
  const pendingDevices = allDevices.filter(d => !d.qc_complete);
  const completedDevices = allDevices.filter(d => d.qc_complete);
  const displayedDevices = filter === 'pending' ? pendingDevices : completedDevices;
  
  if (selectedDevice && selectedRMA) {
    return (
      <QCReviewModal 
        device={selectedDevice} 
        rma={selectedRMA} 
        onBack={() => { setSelectedDevice(null); setSelectedRMA(null); reload(); }}
        notify={notify}
        profile={profile}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">✅ Contrôle Qualité</h1>
          <p className="text-gray-500">Vérification finale avant expédition</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            En attente ({pendingDevices.length})
          </button>
          <button onClick={() => setFilter('completed')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            Terminé ({completedDevices.length})
          </button>
        </div>
      </div>
      
      {displayedDevices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <p className="text-4xl mb-4">{filter === 'pending' ? '🎉' : '📭'}</p>
          <p className="text-gray-500">{filter === 'pending' ? 'Aucun appareil en attente de contrôle qualité' : 'Aucun contrôle qualité terminé'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">RMA</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Client</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Appareil</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">N° Série</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Service</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Technicien</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayedDevices.map(device => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-blue-600">{device.rma.request_number}</td>
                  <td className="px-4 py-3 text-gray-800">{device.rma.companies?.name}</td>
                  <td className="px-4 py-3 font-medium">{device.model_name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-sm">{device.serial_number}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${device.service_type === 'calibration' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {device.service_type === 'calibration' ? 'Étalonnage' : 'Réparation'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{device.technician_name || '—'}</td>
                  <td className="px-4 py-3">
                    {device.qc_complete ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Validé</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">En attente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => { setSelectedDevice(device); setSelectedRMA(device.rma); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${device.qc_complete ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                      {device.qc_complete ? 'Voir' : 'Contrôler →'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// QC Review Modal - View report, certificate, then approve
function QCReviewModal({ device, rma, onBack, notify, profile }) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Report, 2: Certificate, 3: Approve
  const [qcNotes, setQcNotes] = useState(device.qc_notes || '');
  const today = new Date().toLocaleDateString('fr-FR');
  
  // Get checklist from device
  const checklist = device.work_checklist || {};
  const defaultChecklist = [
    { id: 'visual', label: 'Inspection visuelle effectuée', checked: checklist.visual !== false },
    { id: 'cleaning', label: 'Nettoyage effectué', checked: checklist.cleaning !== false },
    { id: 'calibration', label: 'Étalonnage réalisé selon procédure', checked: checklist.calibration !== false },
    { id: 'results', label: 'Résultats dans les spécifications', checked: checklist.results !== false },
    { id: 'certificate', label: 'Certificat d\'étalonnage généré', checked: checklist.certificate !== false }
  ];
  
  const serviceTypeText = device.service_type === 'calibration' ? 'Étalonnage' : device.service_type === 'repair' ? 'Réparation' : 'Étalonnage et Réparation';
  const motifText = device.notes ? `${serviceTypeText} - ${device.notes}` : serviceTypeText;
  
  const showCalType = device.cal_type && device.cal_type !== 'none';
  const showReceptionResult = device.reception_result && device.reception_result !== 'none';
  
  const approveQC = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('request_devices').update({
        qc_complete: true,
        qc_completed_at: new Date().toISOString(),
        qc_completed_by: profile?.id,
        qc_notes: qcNotes,
        status: 'ready_to_ship'
      }).eq('id', device.id);
      
      if (error) throw error;
      notify('✓ Contrôle qualité validé - Prêt pour expédition!');
      onBack();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSaving(false);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">← Retour</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">CONTRÔLE QUALITÉ</h1>
            <p className="text-gray-500">{device.model_name} • SN: {device.serial_number} • {rma.request_number}</p>
          </div>
        </div>
        {device.qc_complete && (
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">✓ Déjà validé</span>
        )}
      </div>
      
      {/* Progress Steps */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setStep(1)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium ${step === 1 ? 'bg-blue-500 text-white' : step > 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
          >
            {step > 1 ? '✓' : '1.'} Rapport de Service
          </button>
          <div className="w-8 h-0.5 bg-gray-300"></div>
          <button 
            onClick={() => setStep(2)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium ${step === 2 ? 'bg-blue-500 text-white' : step > 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
          >
            {step > 2 ? '✓' : '2.'} Certificat
          </button>
          <div className="w-8 h-0.5 bg-gray-300"></div>
          <button 
            onClick={() => setStep(3)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium ${step === 3 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            3. Validation
          </button>
        </div>
      </div>
      
      {/* Step 1: Service Report */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-gray-400 p-8 min-h-full flex justify-center">
            <div className="bg-white shadow-2xl w-full max-w-3xl relative" style={{ fontFamily: 'Arial, sans-serif', padding: '40px 50px', minHeight: '800px', display: 'flex', flexDirection: 'column' }}>
              
              {/* Logo */}
              <div className="mb-8">
                <img src="/images/logos/lighthouse-logo.png" alt="Lighthouse" className="h-12 w-auto" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>

              {/* Info Table */}
              <table className="w-full text-sm mb-6" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '200px' }} />
                  <col />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Date d'achèvement</td>
                    <td className="py-1 text-gray-800">{device.report_completed_at ? new Date(device.report_completed_at).toLocaleDateString('fr-FR') : today}</td>
                    <td className="py-1 text-gray-800"><span className="font-bold text-[#003366]">RMA # </span>{rma.request_number}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Client</td>
                    <td className="py-1 text-gray-800" colSpan="2">{rma.companies?.name}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Adresse</td>
                    <td className="py-1 text-gray-800" colSpan="2">{rma.companies?.billing_address || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Code postal / Ville</td>
                    <td className="py-1 text-gray-800">{rma.companies?.billing_postal_code} {rma.companies?.billing_city}</td>
                    <td className="py-1 text-gray-800"><span className="font-bold text-[#003366]">Contact </span>{rma.companies?.contact_name || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Téléphone</td>
                    <td className="py-1 text-gray-800">{rma.companies?.phone || '—'}</td>
                    <td className="py-1 text-gray-800"><span className="font-bold text-[#003366]">Technicien(ne) de service</span></td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Modèle#</td>
                    <td className="py-1 text-gray-800">{device.model_name}</td>
                    <td className="py-1 text-gray-800">{device.technician_name || 'Lighthouse France'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold text-[#003366] whitespace-nowrap">Numéro de série</td>
                    <td className="py-1 text-gray-800" colSpan="2">{device.serial_number}</td>
                  </tr>
                </tbody>
              </table>

              {/* Content */}
              <div className="flex-grow">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '170px' }} />
                    <col />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="pt-6 pb-2 font-bold text-[#003366] whitespace-nowrap">Motif de retour</td>
                      <td className="pt-6 pb-2 text-gray-800">{motifText}</td>
                    </tr>
                    {showCalType && (
                      <tr>
                        <td className="py-2 font-bold text-[#003366] whitespace-nowrap">Étalonnage effectué</td>
                        <td className="py-2 text-gray-800">{device.cal_type}</td>
                      </tr>
                    )}
                    {showReceptionResult && (
                      <tr>
                        <td className="py-2 font-bold text-[#003366] whitespace-nowrap">Résultats à la réception</td>
                        <td className="py-2 text-gray-800">{device.reception_result}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="pt-6 pb-2 font-bold text-[#003366] whitespace-nowrap">Constatations</td>
                      <td className="pt-6 pb-2 text-gray-800 whitespace-pre-wrap">{device.service_findings || '—'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-bold text-[#003366] whitespace-nowrap">Actions effectuées</td>
                      <td className="py-2 text-gray-800 whitespace-pre-wrap">{device.work_completed || '—'}</td>
                    </tr>
                    <tr>
                      <td className="pt-8 pb-2 font-bold text-[#003366] whitespace-nowrap">Travaux réalisés</td>
                      <td className="pt-8 pb-2">
                        <div className="space-y-1">
                          {defaultChecklist.filter(item => item.checked).map(item => (
                            <div key={item.id} className="flex items-center gap-2">
                              <span className="text-[#003366]">☑</span>
                              <span className="text-gray-800">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="text-center text-sm text-gray-600 mt-auto pt-8">
                <p className="font-bold text-[#003366]">Lighthouse Worldwide Solutions France</p>
                <p>16 Rue Paul Séjourné 94000 Créteil France</p>
                <p>01 43 77 28 07</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              Rapport OK → Voir Certificat
            </button>
          </div>
        </div>
      )}
      
      {/* Step 2: Certificate */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-center mb-6">
              <p className="text-6xl mb-4">📜</p>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {device.service_type === 'repair' ? 'Documents de Réparation' : 'Certificat d\'Étalonnage'}
              </h2>
              <p className="text-gray-500">Vérifiez que le document est correct et complet</p>
            </div>
            
            {device.calibration_certificate_url ? (
              <div className="space-y-4">
                {/* PDF Embed */}
                <div className="bg-gray-100 rounded-xl overflow-hidden" style={{ height: '600px' }}>
                  <iframe 
                    src={device.calibration_certificate_url} 
                    className="w-full h-full"
                    title="Certificat d'étalonnage"
                  />
                </div>
                <div className="text-center">
                  <a href={device.calibration_certificate_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    📄 Ouvrir dans un nouvel onglet
                  </a>
                </div>
              </div>
            ) : device.service_type === 'repair' ? (
              <div className="bg-gray-100 rounded-xl p-12 text-center">
                <p className="text-gray-600">Réparation - pas de certificat d'étalonnage requis</p>
                <p className="text-sm text-gray-400 mt-2">Vérifiez le rapport de service à l'étape précédente</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                <p className="text-red-600 font-medium">⚠️ Certificat non téléchargé</p>
                <p className="text-sm text-red-500 mt-2">Le technicien doit télécharger le certificat avant validation QC</p>
              </div>
            )}
            
            <p className="text-sm text-gray-500 mt-4 text-center">
              Vérifiez: Nom client, N° série, Date, Tolérances, Signatures
            </p>
          </div>
          
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
              ← Retour au Rapport
            </button>
            <button onClick={() => setStep(3)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              {device.calibration_certificate_url || device.service_type === 'repair' ? 'Document OK → Validation' : 'Continuer →'}
            </button>
          </div>
        </div>
      )}
      
      {/* Step 3: Approve */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-center mb-8">
              <p className="text-6xl mb-4">✅</p>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Validation Finale</h2>
              <p className="text-gray-500">Confirmez que tous les documents sont corrects</p>
            </div>
            
            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-gray-700 mb-4">Résumé</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Client:</span> <span className="font-medium">{rma.companies?.name}</span></div>
                <div><span className="text-gray-500">RMA:</span> <span className="font-medium text-blue-600">{rma.request_number}</span></div>
                <div><span className="text-gray-500">Appareil:</span> <span className="font-medium">{device.model_name}</span></div>
                <div><span className="text-gray-500">N° Série:</span> <span className="font-medium font-mono">{device.serial_number}</span></div>
                <div><span className="text-gray-500">Service:</span> <span className="font-medium">{serviceTypeText}</span></div>
                <div><span className="text-gray-500">Technicien:</span> <span className="font-medium">{device.technician_name || '—'}</span></div>
              </div>
            </div>
            
            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes QC (optionnel)</label>
              <textarea 
                value={qcNotes}
                onChange={e => setQcNotes(e.target.value)}
                placeholder="Remarques ou observations..."
                className="w-full px-4 py-3 border rounded-xl h-20 resize-none"
              />
            </div>
            
            {/* Checkmarks */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-green-700">
                <span className="text-xl">✓</span>
                <span>Rapport de service vérifié</span>
              </div>
              <div className="flex items-center gap-3 text-green-700">
                <span className="text-xl">✓</span>
                <span>Certificat d'étalonnage vérifié</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
              ← Retour
            </button>
            {!device.qc_complete ? (
              <button 
                onClick={approveQC} 
                disabled={saving}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-lg disabled:opacity-50"
              >
                {saving ? 'Validation...' : '✓ J\'approuve - Prêt pour expédition'}
              </button>
            ) : (
              <span className="px-6 py-3 bg-green-100 text-green-700 rounded-lg font-medium">✓ Déjà validé</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CONTRACTS SHEET - Full Implementation
// ============================================
function ContractsSheet({ clients, notify, profile, reloadMain }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [quoteContract, setQuoteContract] = useState(null); // For opening quote editor
  const [reviewingContractBC, setReviewingContractBC] = useState(null); // For BC review modal
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contracts')
      .select('*, companies(id, name), contract_devices(*)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading contracts:', error);
      notify('Erreur de chargement des contrats', 'error');
    } else {
      setContracts(data || []);
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const CONTRACT_STATUS_STYLES = {
    requested: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🆕 Nouvelle demande' },
    quote_sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: '📧 Devis envoyé' },
    quote_approved: { bg: 'bg-purple-100', text: 'text-purple-700', label: '✅ Devis approuvé' },
    bc_pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: '📄 Attente BC' },
    active: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Actif' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: '⏰ Expiré' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Annulé' }
  };

  const getStatusBadge = (status) => {
    const style = CONTRACT_STATUS_STYLES[status] || CONTRACT_STATUS_STYLES.requested;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span>;
  };

  // Separate new requests from processed contracts
  const newRequests = contracts.filter(c => c.status === 'requested');
  const processedContracts = contracts.filter(c => c.status !== 'requested');
  
  // Filter processed contracts
  const filteredContracts = processedContracts.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'active') return c.status === 'active';
    if (filter === 'pending') return ['quote_sent', 'quote_approved', 'bc_pending'].includes(c.status);
    if (filter === 'expired') return c.status === 'expired';
    return true;
  });

  const stats = {
    pending: processedContracts.filter(c => ['quote_sent', 'quote_approved', 'bc_pending'].includes(c.status)).length,
    active: processedContracts.filter(c => c.status === 'active').length,
    expired: processedContracts.filter(c => c.status === 'expired').length
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Contract Detail View
  if (selectedContract) {
    return (
      <ContractDetailView 
        contract={selectedContract}
        clients={clients}
        notify={notify}
        onClose={() => setSelectedContract(null)}
        onUpdate={() => { loadContracts(); if (reloadMain) reloadMain(); }}
      />
    );
  }
  
  // Contract Quote Editor
  if (quoteContract) {
    return (
      <ContractQuoteEditor
        contract={quoteContract}
        profile={profile}
        notify={notify}
        onClose={() => setQuoteContract(null)}
        onSent={() => { setQuoteContract(null); loadContracts(); if (reloadMain) reloadMain(); }}
      />
    );
  }
  
  // Contract BC Review Modal - render on top of main view
  const contractBCModal = reviewingContractBC && (
    <ContractBCReviewModal 
      contract={reviewingContractBC}
      onClose={() => setReviewingContractBC(null)}
      notify={notify}
      reload={() => { loadContracts(); if (reloadMain) reloadMain(); }}
    />
  );
  
  // Manual Contract Creation
  if (showCreateModal) {
    return (
      <CreateContractModal
        clients={clients}
        notify={notify}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { setShowCreateModal(false); loadContracts(); if (reloadMain) reloadMain(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* BC Review Modal - renders on top */}
      {contractBCModal}
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Contrats d'Étalonnage</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium flex items-center gap-2"
        >
          <span>+</span> Créer Contrat Manuellement
        </button>
      </div>
      
      {/* ============================================ */}
      {/* BC À VÉRIFIER - Top Priority */}
      {/* ============================================ */}
      {(() => {
        const bcPendingContracts = contracts.filter(c => c.status === 'bc_pending');
        if (bcPendingContracts.length === 0) return null;
        return (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg">
            <div className="px-6 py-4 border-b border-red-200 bg-red-100 rounded-t-xl">
              <h2 className="font-bold text-red-800 text-lg">⚠️ BC Contrats à Vérifier ({bcPendingContracts.length})</h2>
              <p className="text-sm text-red-600">Vérifiez le BC et activez le contrat</p>
            </div>
            <div className="p-4 space-y-3">
              {bcPendingContracts.map(contract => (
                <div key={contract.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm border border-red-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                    <div>
                      <span className="font-mono font-bold text-[#00A651]">{contract.contract_number}</span>
                      <p className="font-medium text-gray-800">{contract.companies?.name || contract.company_name_manual}</p>
                      <p className="text-sm text-gray-500">
                        BC soumis le {contract.bc_submitted_at ? new Date(contract.bc_submitted_at).toLocaleDateString('fr-FR') : '—'}
                        {contract.bc_signed_by && <span className="ml-2">• Signé par: {contract.bc_signed_by}</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReviewingContractBC(contract)}
                    className="px-6 py-3 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-bold"
                  >
                    📋 Vérifier BC & Activer
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      
      {/* ============================================ */}
      {/* NOUVELLES DEMANDES DE CONTRAT - Top Priority */}
      {/* ============================================ */}
      {newRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-amber-200 bg-amber-100 rounded-t-xl">
            <h2 className="font-bold text-amber-800 text-lg">🆕 Nouvelles Demandes de Contrat ({newRequests.length})</h2>
            <p className="text-sm text-amber-600">Cliquez sur "Créer Devis Contrat" pour établir le devis</p>
          </div>
          <div className="p-4 space-y-3">
            {newRequests.map(contract => {
              const devices = contract.contract_devices || [];
              return (
                <div key={contract.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm border border-amber-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">📋</div>
                    <div>
                      <p className="font-medium text-gray-800">{contract.companies?.name || 'Client'}</p>
                      <p className="text-sm text-gray-500">
                        {devices.length} appareil(s) • Demandé le {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-xs text-gray-400">
                        Période souhaitée: {new Date(contract.start_date).toLocaleDateString('fr-FR')} - {new Date(contract.end_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedContract(contract)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                    >
                      Voir détails
                    </button>
                    <button
                      onClick={() => setQuoteContract(contract)}
                      className="px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium"
                    >
                      💰 Créer Devis Contrat
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div 
          onClick={() => setFilter('pending')}
          className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'pending' ? 'ring-2 ring-blue-400' : ''}`}
        >
          <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">En cours</div>
        </div>
        <div 
          onClick={() => setFilter('active')}
          className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'active' ? 'ring-2 ring-green-400' : ''}`}
        >
          <div className="text-3xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Actifs</div>
        </div>
        <div 
          onClick={() => setFilter('expired')}
          className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'expired' ? 'ring-2 ring-gray-400' : ''}`}
        >
          <div className="text-3xl font-bold text-gray-600">{stats.expired}</div>
          <div className="text-sm text-gray-600">Expirés</div>
        </div>
        <div 
          onClick={() => setFilter('all')}
          className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'all' ? 'ring-2 ring-purple-400' : ''}`}
        >
          <div className="text-3xl font-bold text-purple-600">{processedContracts.length}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-800">
            {filter === 'all' ? 'Tous les contrats' : 
             filter === 'pending' ? 'En cours de traitement' :
             filter === 'active' ? 'Contrats actifs' : 'Contrats expirés'}
          </h2>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="text-sm text-gray-500 hover:text-gray-700">
              Voir tout
            </button>
          )}
        </div>
        
        {filteredContracts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-2">📄</p>
            <p>Aucun contrat trouvé</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600">N° Contrat</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600">Client</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600">Période</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600">Appareils</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredContracts.map(contract => {
                const devices = contract.contract_devices || [];
                const totalTokens = devices.reduce((sum, d) => sum + (d.tokens_total || 0), 0);
                const usedTokens = devices.reduce((sum, d) => sum + (d.tokens_used || 0), 0);
                
                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-[#1E3A5F]">{contract.contract_number || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{contract.companies?.name || contract.company_name_manual || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(contract.start_date).toLocaleDateString('fr-FR')} - {new Date(contract.end_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold">{devices.length}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${usedTokens >= totalTokens ? 'text-red-600' : 'text-green-600'}`}>
                        {totalTokens - usedTokens}/{totalTokens}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(contract.status)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedContract(contract)}
                        className="px-3 py-1 bg-[#3B7AB4] text-white text-sm rounded hover:bg-[#1E3A5F]"
                      >
                        Voir
                      </button>
                    </td>
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

// ============================================
// CONTRACT QUOTE EDITOR - Like RMA Quote Editor
// ============================================
function ContractQuoteEditor({ contract, profile, notify, onClose, onSent }) {
  const [step, setStep] = useState(1); // 1=Edit, 2=Preview, 3=Confirm
  const [saving, setSaving] = useState(false);
  const [quoteRef, setQuoteRef] = useState('');
  const today = new Date();
  
  // Signatory name from profile
  const signatory = profile?.full_name || 'Lighthouse France';
  
  // Contract dates (editable)
  const [contractDates, setContractDates] = useState({
    start_date: contract.start_date || new Date().toISOString().split('T')[0],
    end_date: contract.end_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });
  
  // Initialize pricing for each device
  const [devicePricing, setDevicePricing] = useState(
    (contract.contract_devices || []).map(d => ({
      id: d.id,
      serial_number: d.serial_number,
      model_name: d.model_name || '',
      device_type: d.device_type || 'particle_counter',
      tokens_total: d.tokens_total || 1,
      unit_price: d.unit_price || 350
    }))
  );

  useEffect(() => {
    const year = today.getFullYear().toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setQuoteRef(`CTR/${year}${month}/XXX`);
  }, []);

  const updateDevice = (id, field, value) => {
    setDevicePricing(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const totalPrice = devicePricing.reduce((sum, d) => sum + (parseFloat(d.unit_price) || 0), 0);
  const totalTokens = devicePricing.reduce((sum, d) => sum + (parseInt(d.tokens_total) || 0), 0);

  const getDeviceTypeLabel = (type) => {
    const labels = {
      particle_counter: 'Compteur Particules Aéroportées',
      bio_collector: 'Bio Collecteur',
      liquid_counter: 'Compteur Particules Liquide',
      temp_humidity: 'Capteur Temp/Humidité',
      other: 'Autre Équipement'
    };
    return labels[type] || type;
  };

  // Get calibration descriptions by device type
  const getCalibrationPrestations = (deviceType) => {
    const templates = {
      particle_counter: [
        "Vérification des fonctionnalités du compteur",
        "Vérification et réglage du débit",
        "Vérification de la cellule de mesure",
        "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
        "Vérification en nombre par comparaison à un étalon étalonné selon la norme ISO 17025, conformément à la norme ISO 21501-4",
        "Fourniture d'un rapport de test et de calibration"
      ],
      bio_collector: [
        "Vérification des fonctionnalités de l'appareil",
        "Vérification et réglage du débit",
        "Vérification de la cellule d'impaction",
        "Contrôle des paramètres de collecte",
        "Fourniture d'un rapport de test et de calibration"
      ],
      liquid_counter: [
        "Vérification des fonctionnalités du compteur",
        "Vérification et réglage du débit",
        "Vérification de la cellule de mesure optique",
        "Contrôle et réglage des seuils de mesures granulométrique à l'aide de sphères de latex calibrées et certifiées",
        "Vérification en nombre par comparaison à un étalon",
        "Fourniture d'un rapport de test et de calibration"
      ],
      temp_humidity: [
        "Vérification des fonctionnalités du capteur",
        "Étalonnage température sur points de référence certifiés",
        "Étalonnage humidité relative",
        "Vérification de la stabilité des mesures",
        "Fourniture d'un certificat d'étalonnage"
      ],
      other: [
        "Vérification des fonctionnalités de l'appareil",
        "Étalonnage selon les spécifications du fabricant",
        "Tests de fonctionnement",
        "Fourniture d'un rapport de test"
      ]
    };
    return templates[deviceType] || templates.other;
  };

  // Group devices by type for the quote
  const devicesByType = devicePricing.reduce((acc, d) => {
    const type = d.device_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(d);
    return acc;
  }, {});

  const sendQuote = async () => {
    setSaving(true);
    try {
      // Generate contract number if not exists
      let contractNumber = contract.contract_number;
      if (!contractNumber) {
        const year = new Date().getFullYear();
        const { data: existing } = await supabase
          .from('contracts')
          .select('contract_number')
          .like('contract_number', `CTR-${year}-%`)
          .order('contract_number', { ascending: false })
          .limit(1);
        const lastNum = existing?.[0]?.contract_number 
          ? parseInt(existing[0].contract_number.split('-')[2]) 
          : 0;
        contractNumber = `CTR-${year}-${String(lastNum + 1).padStart(3, '0')}`;
      }

      // Update contract - only use columns that definitely exist
      const { error: updateError } = await supabase.from('contracts').update({
        contract_number: contractNumber,
        start_date: contractDates.start_date,
        end_date: contractDates.end_date,
        status: 'quote_sent'
      }).eq('id', contract.id);

      if (updateError) {
        console.error('Contract update error:', updateError);
        throw updateError;
      }

      // Update device pricing
      for (const d of devicePricing) {
        const { error: deviceError } = await supabase.from('contract_devices').update({
          tokens_total: d.tokens_total,
          unit_price: d.unit_price
        }).eq('id', d.id);
        
        if (deviceError) {
          console.error('Device update error:', deviceError);
        }
      }

      // Try to update optional quote fields (may not exist in schema)
      try {
        await supabase.from('contracts').update({
          quote_total: totalPrice,
          quote_data: { 
            devices: devicePricing, 
            totalPrice, 
            totalTokens, 
            createdBy: signatory,
            createdAt: new Date().toISOString() 
          },
          quote_sent_at: new Date().toISOString()
        }).eq('id', contract.id);
      } catch (e) {
        console.log('Optional quote fields not updated (columns may not exist)');
      }

      // Create notification for the client (optional - may not have notifications table)
      try {
        await supabase.from('notifications').insert({
          company_id: contract.company_id,
          type: 'contract_quote',
          title: 'Nouveau Devis Contrat',
          message: `Votre devis de contrat d'étalonnage ${contractNumber} est disponible. ${devicePricing.length} appareil(s) - ${totalPrice.toFixed(2)} € HT/an. Consultez votre portail pour approuver.`,
          data: { contract_id: contract.id, contract_number: contractNumber },
          read: false
        });
      } catch (notifErr) {
        console.log('Notification not created (table may not exist):', notifErr);
      }

      notify(`✅ Devis contrat envoyé! N° ${contractNumber}`);
      onSent();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">← Retour</button>
        <h1 className="text-2xl font-bold text-gray-800">Créer Devis Contrat</h1>
        <div className="flex gap-1 ml-4">
          {[1,2,3].map(s => (
            <div key={s} className={`w-8 h-2 rounded-full ${step >= s ? 'bg-[#00A651]' : 'bg-gray-300'}`} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1a2e] text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">
              {step === 1 && 'Tarification du Contrat'}
              {step === 2 && 'Aperçu du Devis'}
              {step === 3 && 'Confirmer l\'envoi'}
            </h2>
            <p className="text-gray-300">{contract.companies?.name} • {devicePricing.length} appareil(s)</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total HT / an</p>
            <p className="text-2xl font-bold text-[#00A651]">{totalPrice.toFixed(2)} €</p>
          </div>
        </div>

        {/* Step 1: Pricing */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            {/* Contract Info & Dates */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-bold text-lg">{contract.companies?.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-sm text-gray-500 block mb-1">Date début</label>
                <input
                  type="date"
                  value={contractDates.start_date}
                  onChange={e => setContractDates({...contractDates, start_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-sm text-gray-500 block mb-1">Date fin</label>
                <input
                  type="date"
                  value={contractDates.end_date}
                  onChange={e => setContractDates({...contractDates, end_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Devices Pricing */}
            <div>
              <h3 className="font-bold text-gray-800 mb-4">Tarification par Appareil</h3>
              <div className="space-y-3">
                {devicePricing.map((device, index) => (
                  <div key={device.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center gap-4">
                      <span className="bg-[#1a1a2e] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</span>
                      <div className="flex-1 grid md:grid-cols-5 gap-4 items-center">
                        <div>
                          <p className="font-medium">{device.model_name || 'Appareil'}</p>
                          <p className="text-sm text-gray-500">SN: {device.serial_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Type</p>
                          <p className="text-sm">{getDeviceTypeLabel(device.device_type)}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Étalonnages/an</label>
                          <input
                            type="number"
                            value={device.tokens_total}
                            onChange={e => updateDevice(device.id, 'tokens_total', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border rounded-lg"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Prix unitaire € HT</label>
                          <input
                            type="number"
                            value={device.unit_price}
                            onChange={e => updateDevice(device.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border rounded-lg"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Sous-total</p>
                          <p className="font-bold text-[#00A651]">{(device.unit_price || 0).toFixed(2)} €</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-emerald-50 rounded-lg p-4 flex justify-between items-center border border-emerald-200">
              <div>
                <span className="text-emerald-800 font-medium">{devicePricing.length} appareil(s)</span>
                <span className="text-emerald-600 mx-3">•</span>
                <span className="text-emerald-800">{totalTokens} étalonnage(s) inclus</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-emerald-600">Total HT / an</p>
                <p className="text-2xl font-bold text-emerald-800">{totalPrice.toFixed(2)} €</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview - EXACTLY MATCHES CUSTOMER PORTAL */}
        {step === 2 && (
          <div className="p-6 bg-gray-200 min-h-full">
            <div className="max-w-4xl mx-auto bg-white shadow-xl" style={{ fontFamily: 'Arial, sans-serif' }}>
              
              {/* Quote Header */}
              <div className="px-8 pt-8 pb-4 border-b-4 border-[#00A651]">
                <div className="flex justify-between items-start">
                  <div>
                    <img 
                      src="/images/logos/lighthouse-logo.png" 
                      alt="Lighthouse France" 
                      className="h-14 w-auto mb-1"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div className="hidden">
                      <h1 className="text-3xl font-bold tracking-tight text-[#1a1a2e]">LIGHTHOUSE</h1>
                      <p className="text-gray-500">Worldwide Solutions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#00A651]">OFFRE DE PRIX</p>
                    <p className="text-gray-500">N° {quoteRef}</p>
                  </div>
                </div>
              </div>

              {/* Info Bar */}
              <div className="bg-gray-100 px-8 py-3 flex justify-between text-sm border-b">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Date</p>
                  <p className="font-medium">{today.toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Période du Contrat</p>
                  <p className="font-medium">{new Date(contractDates.start_date).toLocaleDateString('fr-FR')} - {new Date(contractDates.end_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Validité Devis</p>
                  <p className="font-medium">30 jours</p>
                </div>
              </div>

              {/* Client Info */}
              <div className="px-8 py-4 border-b">
                <p className="text-xs text-gray-500 uppercase">Client</p>
                <p className="font-bold text-xl text-[#1a1a2e]">{contract.companies?.name}</p>
                {contract.companies?.billing_address && <p className="text-gray-600">{contract.companies?.billing_address}</p>}
                <p className="text-gray-600">{contract.companies?.billing_postal_code} {contract.companies?.billing_city}</p>
              </div>

              {/* SERVICE SECTIONS BY DEVICE TYPE - Green Headers like Customer Portal */}
              {Object.entries(devicesByType).map(([type, typeDevices]) => {
                const prestations = getCalibrationPrestations(type);
                const typeTotal = typeDevices.reduce((sum, d) => sum + (d.unit_price || 0), 0);
                const typeTokens = typeDevices.reduce((sum, d) => sum + (d.tokens_total || 0), 0);
                
                return (
                  <div key={type} className="border-b">
                    {/* Type Header with GREEN background - matching customer */}
                    <div className="bg-[#00A651] text-white px-8 py-3">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {type === 'particle_counter' && '🔬 '}
                        {type === 'bio_collector' && '🧫 '}
                        {type === 'liquid_counter' && '💧 '}
                        {type === 'temp_humidity' && '🌡️ '}
                        {type === 'other' && '📦 '}
                        Étalonnage {getDeviceTypeLabel(type)}
                      </h3>
                    </div>
                    
                    {/* Prestations */}
                    <div className="px-8 py-4 bg-gray-50">
                      <p className="text-xs text-gray-500 uppercase mb-2">Prestations Incluses</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {prestations.map((p, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[#00A651]">✓</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Devices Table */}
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-8 py-2 text-left text-xs font-bold text-gray-600">Appareil</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-gray-600">N° Série</th>
                          <th className="px-4 py-2 text-center text-xs font-bold text-gray-600">Étal./an</th>
                          <th className="px-8 py-2 text-right text-xs font-bold text-gray-600">Prix HT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typeDevices.map((d, i) => (
                          <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-8 py-2 font-medium">{d.model_name || getDeviceTypeLabel(d.device_type)}</td>
                            <td className="px-4 py-2 font-mono text-sm">{d.serial_number}</td>
                            <td className="px-4 py-2 text-center">{d.tokens_total}</td>
                            <td className="px-8 py-2 text-right font-medium">{(d.unit_price || 0).toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-green-50">
                          <td className="px-8 py-2 font-bold" colSpan={2}>Sous-total Étalonnage {getDeviceTypeLabel(type)}</td>
                          <td className="px-4 py-2 text-center font-medium">{typeTokens} étal.</td>
                          <td className="px-8 py-2 text-right font-bold text-[#00A651]">{typeTotal.toFixed(2)} €</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}

              {/* Grand Total */}
              <div className="mx-8 my-6 bg-[#00A651] text-white rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="text-lg font-bold">TOTAL CONTRAT ANNUEL HT</p>
                  <p className="text-emerald-100 text-sm">{totalTokens} étalonnage(s) inclus pendant la période du contrat</p>
                </div>
                <p className="text-3xl font-bold">{totalPrice.toFixed(2)} €</p>
              </div>

              {/* Terms */}
              <div className="px-8 py-4 border-t bg-gray-50">
                <p className="text-xs text-gray-500 uppercase mb-2">Conditions du contrat</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Validité du contrat: {new Date(contractDates.start_date).toLocaleDateString('fr-FR')} au {new Date(contractDates.end_date).toLocaleDateString('fr-FR')}</li>
                  <li>• {totalTokens} étalonnage(s) inclus à utiliser pendant la période contractuelle</li>
                  <li>• Étalonnages supplémentaires facturés au tarif standard en vigueur</li>
                  <li>• Frais de port inclus (France métropolitaine)</li>
                  <li>• Paiement à 30 jours date de facture</li>
                </ul>
              </div>

              {/* Signature Section - MATCHING CUSTOMER PORTAL */}
              <div className="px-8 py-6 border-t flex justify-between items-end">
                <div className="flex items-end gap-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Établi par</p>
                    <p className="font-bold text-lg">{signatory}</p>
                    <p className="text-gray-600">Lighthouse France</p>
                  </div>
                  <img 
                    src="/images/logos/capcert-logo.png" 
                    alt="Capcert Certification" 
                    className="h-20 w-auto"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-1">Signature client</p>
                  <div className="w-48 h-20 border-2 border-dashed border-gray-300 rounded"></div>
                  <p className="text-xs text-gray-400 mt-1">Lu et approuvé</p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#1a1a2e] text-white px-8 py-4 text-center text-sm">
                <p className="font-medium">Lighthouse France SAS</p>
                <p className="text-gray-400">16, rue Paul Séjourné • 94000 CRÉTEIL • Tél. 01 43 77 28 07</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="p-8 text-center max-w-lg mx-auto">
            <div className="w-24 h-24 bg-[#00A651] rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl text-white">📧</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Confirmer l'envoi du devis</h3>
            <p className="text-gray-600 mb-6">Le devis de contrat sera envoyé au client et disponible sur son portail.</p>
            
            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <p className="text-lg font-bold text-gray-800 mb-1">{contract.companies?.name}</p>
              <p className="text-sm text-gray-500 mb-2">Période: {new Date(contractDates.start_date).toLocaleDateString('fr-FR')} - {new Date(contractDates.end_date).toLocaleDateString('fr-FR')}</p>
              <p className="text-sm text-gray-500 mb-4">{devicePricing.length} appareil(s) • {totalTokens} étalonnage(s)/an</p>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total HT / an</span>
                <span className="text-[#00A651]">{totalPrice.toFixed(2)} €</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-left">
              <p className="font-medium mb-2">Après envoi :</p>
              <p className="mb-1">✓ Le client recevra une notification sur son portail</p>
              <p className="mb-1">✓ Il pourra consulter et approuver le devis</p>
              <p className="mb-1">✓ Après approbation, il soumettra son bon de commande</p>
              <p>✓ Le contrat sera activé après validation du BC</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between">
          <button 
            onClick={step === 1 ? onClose : () => setStep(step - 1)} 
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium"
          >
            {step === 1 ? 'Annuler' : '← Retour'}
          </button>
          <div className="flex gap-3">
            {step < 3 && (
              <button 
                onClick={() => setStep(step + 1)} 
                className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                Suivant →
              </button>
            )}
            {step === 3 && (
              <button 
                onClick={sendQuote} 
                disabled={saving}
                className="px-10 py-3 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-bold text-lg disabled:opacity-50"
              >
                {saving ? 'Envoi...' : '✅ Envoyer le Devis'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================
// CONTRACT DETAIL VIEW
// ============================================
function ContractDetailView({ contract, clients, notify, onClose, onUpdate }) {
  const [editMode, setEditMode] = useState(contract.status === 'requested');
  const [saving, setSaving] = useState(false);
  const [devices, setDevices] = useState(contract.contract_devices || []);
  const [contractData, setContractData] = useState({
    start_date: contract.start_date || new Date().toISOString().split('T')[0],
    end_date: contract.end_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    internal_notes: contract.internal_notes || ''
  });
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Check for existing active contracts for this client
  const [existingContracts, setExistingContracts] = useState([]);
  
  useEffect(() => {
    const checkExisting = async () => {
      if (!contract.company_id) return;
      const { data } = await supabase
        .from('contracts')
        .select('id, contract_number, start_date, end_date, status')
        .eq('company_id', contract.company_id)
        .eq('status', 'active')
        .neq('id', contract.id);
      setExistingContracts(data || []);
    };
    checkExisting();
  }, [contract.company_id, contract.id]);

  const updateDevice = (deviceId, field, value) => {
    setDevices(devices.map(d => d.id === deviceId ? { ...d, [field]: value } : d));
  };

  const saveDeviceChanges = async () => {
    setSaving(true);
    try {
      // Update contract dates and notes
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          internal_notes: contractData.internal_notes
        })
        .eq('id', contract.id);

      if (contractError) throw contractError;

      // Update each device
      for (const device of devices) {
        const { error } = await supabase
          .from('contract_devices')
          .update({
            tokens_total: device.tokens_total,
            unit_price: device.unit_price
          })
          .eq('id', device.id);
        
        if (error) throw error;
      }

      notify('Modifications enregistrées', 'success');
      setEditMode(false);
      onUpdate();
    } catch (err) {
      console.error('Error saving:', err);
      notify('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateContractStatus = async (newStatus) => {
    setSaving(true);
    try {
      const updates = { status: newStatus };
      
      if (newStatus === 'active') {
        updates.bc_approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contract.id);

      if (error) throw error;

      notify(`Statut mis à jour: ${newStatus}`, 'success');
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error updating status:', err);
      notify('Erreur lors de la mise à jour', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalPrice = devices.reduce((sum, d) => sum + (parseFloat(d.unit_price) || 0), 0);
  const totalTokens = devices.reduce((sum, d) => sum + (parseInt(d.tokens_total) || 0), 0);

  const CONTRACT_STATUS_STYLES = {
    requested: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🆕 Nouvelle demande' },
    quote_sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: '📧 Devis envoyé' },
    quote_approved: { bg: 'bg-purple-100', text: 'text-purple-700', label: '✅ Devis approuvé' },
    bc_pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: '📄 Attente BC' },
    active: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Actif' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: '⏰ Expiré' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Annulé' }
  };

  const getStatusBadge = (status) => {
    const style = CONTRACT_STATUS_STYLES[status] || CONTRACT_STATUS_STYLES.requested;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
      >
        ← Retour aux contrats
      </button>

      {/* Warning for existing active contracts */}
      {existingContracts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-800">Contrat existant détecté</h3>
              <p className="text-sm text-amber-700">
                Ce client a déjà {existingContracts.length} contrat(s) actif(s):
              </p>
              <ul className="text-sm text-amber-700 mt-1">
                {existingContracts.map(c => (
                  <li key={c.id}>• {c.contract_number} ({new Date(c.start_date).toLocaleDateString('fr-FR')} - {new Date(c.end_date).toLocaleDateString('fr-FR')})</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* BC REVIEW SECTION - Shows when client has submitted BC */}
      {contract.status === 'bc_pending' && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl">📄</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-orange-800">Bon de Commande à Vérifier</h2>
              <p className="text-orange-700">
                Le client a soumis son bon de commande. Vérifiez les documents et activez le contrat.
              </p>
              {contract.bc_submitted_at && (
                <p className="text-sm text-orange-600 mt-1">
                  Soumis le {new Date(contract.bc_submitted_at).toLocaleDateString('fr-FR')} à {new Date(contract.bc_submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  {contract.bc_signed_by && ` par ${contract.bc_signed_by}`}
                </p>
              )}
            </div>
          </div>
          
          {/* Documents */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Signed Quote PDF */}
            {contract.signed_quote_url && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600">✅</span>
                  </div>
                  <div>
                    <p className="font-bold text-green-800">Devis Signé</p>
                    <p className="text-xs text-green-600">PDF avec signature client</p>
                  </div>
                </div>
                <a
                  href={contract.signed_quote_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg text-center font-medium hover:bg-green-700"
                >
                  📥 Voir le Devis Signé
                </a>
              </div>
            )}
            
            {/* BC File */}
            {contract.bc_file_url && (
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600">📋</span>
                  </div>
                  <div>
                    <p className="font-bold text-purple-800">Bon de Commande</p>
                    <p className="text-xs text-purple-600">Document uploadé par le client</p>
                  </div>
                </div>
                <a
                  href={contract.bc_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-center font-medium hover:bg-purple-700"
                >
                  📥 Voir le BC
                </a>
              </div>
            )}
            
            {/* No documents */}
            {!contract.signed_quote_url && !contract.bc_file_url && (
              <div className="col-span-2 bg-white rounded-lg p-4 border border-gray-200 text-center text-gray-500">
                <p>Aucun document attaché (signature électronique uniquement)</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => updateContractStatus('active')}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008c44] disabled:opacity-50"
            >
              ✅ Approuver et Activer le Contrat
            </button>
            <button
              onClick={() => {
                const reason = window.prompt('Raison du rejet:');
                if (reason) {
                  // Update with rejection
                  supabase.from('contracts').update({
                    status: 'bc_rejected',
                    bc_rejection_reason: reason
                  }).eq('id', contract.id).then(() => {
                    notify('BC rejeté', 'success');
                    onUpdate();
                  });
                }
              }}
              disabled={saving}
              className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 disabled:opacity-50"
            >
              ❌ Rejeter
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">
              Contrat {contract.contract_number || '(En attente)'}
            </h1>
            <p className="text-gray-600">{contract.companies?.name}</p>
          </div>
          {getStatusBadge(contract.status)}
        </div>

        {/* Contract Period */}
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Date de début</label>
            {editMode ? (
              <input
                type="date"
                value={contractData.start_date}
                onChange={e => setContractData({...contractData, start_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            ) : (
              <p className="text-gray-900">{new Date(contract.start_date).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Date de fin</label>
            {editMode ? (
              <input
                type="date"
                value={contractData.end_date}
                onChange={e => setContractData({...contractData, end_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            ) : (
              <p className="text-gray-900">{new Date(contract.end_date).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Durée</label>
            <p className="text-gray-900">
              {Math.round((new Date(contractData.end_date) - new Date(contractData.start_date)) / (1000 * 60 * 60 * 24 * 30))} mois
            </p>
          </div>
        </div>

        {/* Customer Notes */}
        {contract.customer_notes && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-bold text-blue-800 text-sm mb-1">Notes du client:</h4>
            <p className="text-sm text-blue-700">{contract.customer_notes}</p>
          </div>
        )}

        {/* Internal Notes */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-1">Notes internes</label>
          {editMode ? (
            <textarea
              value={contractData.internal_notes}
              onChange={e => setContractData({...contractData, internal_notes: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Notes visibles uniquement par l'équipe..."
            />
          ) : (
            <p className="text-gray-600 text-sm">{contract.internal_notes || '—'}</p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#1E3A5F]">{devices.length}</div>
            <div className="text-sm text-gray-600">Appareils</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalTokens}</div>
            <div className="text-sm text-gray-600">Étalonnages inclus</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#3B7AB4]">{totalPrice.toFixed(2)} €</div>
            <div className="text-sm text-gray-600">Total HT</div>
          </div>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Appareils ({devices.length})</h2>
          {!editMode && contract.status !== 'active' && (
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              ✏️ Modifier
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">Surnom</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">N° Série</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">Modèle</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">Type</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-600">Prix unitaire</th>
                {contract.status === 'active' && (
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">Utilisés</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {devices.map((device, idx) => (
                <tr key={device.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm">{device.nickname || '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono">{device.serial_number}</td>
                  <td className="px-4 py-3 text-sm font-medium">{device.model_name}</td>
                  <td className="px-4 py-3 text-sm">
                    {device.device_type === 'particle_counter' && '🔬 Compteur Air'}
                    {device.device_type === 'bio_collector' && '🧫 Bio Collecteur'}
                    {device.device_type === 'liquid_counter' && '💧 Compteur Liquide'}
                    {device.device_type === 'temp_humidity' && '🌡️ Temp/Humidité'}
                    {device.device_type === 'other' && '📦 Autre'}
                    {!device.device_type && '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editMode ? (
                      <input
                        type="number"
                        min="1"
                        value={device.tokens_total || 2}
                        onChange={e => updateDevice(device.id, 'tokens_total', parseInt(e.target.value) || 2)}
                        className="w-16 px-2 py-1 border rounded text-center"
                      />
                    ) : (
                      <span className="font-bold">{device.tokens_total || 2}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editMode ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={device.unit_price || ''}
                        onChange={e => updateDevice(device.id, 'unit_price', e.target.value)}
                        className="w-24 px-2 py-1 border rounded text-right"
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="font-medium">{device.unit_price ? `${parseFloat(device.unit_price).toFixed(2)} €` : '—'}</span>
                    )}
                  </td>
                  {contract.status === 'active' && (
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${(device.tokens_used || 0) >= (device.tokens_total || 2) ? 'text-red-600' : 'text-green-600'}`}>
                        {device.tokens_used || 0}/{device.tokens_total || 2}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right font-bold">Total:</td>
                <td className="px-4 py-3 text-center font-bold text-green-600">{totalTokens}</td>
                <td className="px-4 py-3 text-right font-bold text-[#1E3A5F]">{totalPrice.toFixed(2)} €</td>
                {contract.status === 'active' && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap gap-3">
          {editMode && (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={saveDeviceChanges}
                disabled={saving}
                className="px-4 py-2 bg-[#00A651] text-white rounded-lg hover:bg-[#008c44] disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </>
          )}

          {!editMode && contract.status === 'requested' && (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 border border-[#3B7AB4] text-[#3B7AB4] rounded-lg hover:bg-blue-50"
              >
                ✏️ Définir les prix et tokens
              </button>
              <button
                onClick={() => updateContractStatus('quote_sent')}
                disabled={saving || !devices.every(d => d.unit_price)}
                className="px-4 py-2 bg-[#3B7AB4] text-white rounded-lg hover:bg-[#1E3A5F] disabled:opacity-50"
              >
                📧 Envoyer le devis
              </button>
            </>
          )}

          {contract.status === 'quote_sent' && (
            <button
              onClick={() => updateContractStatus('quote_approved')}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              ✅ Marquer devis approuvé
            </button>
          )}

          {contract.status === 'quote_approved' && (
            <button
              onClick={() => updateContractStatus('bc_pending')}
              disabled={saving}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              📄 En attente du BC
            </button>
          )}

          {contract.status === 'bc_pending' && (
            <button
              onClick={() => updateContractStatus('active')}
              disabled={saving}
              className="px-4 py-2 bg-[#00A651] text-white rounded-lg hover:bg-[#008c44] disabled:opacity-50"
            >
              ✅ Activer le contrat
            </button>
          )}

          {contract.status !== 'cancelled' && contract.status !== 'active' && !editMode && (
            <button
              onClick={() => {
                if (window.confirm('Êtes-vous sûr de vouloir annuler ce contrat? Tapez "annuler contrat" pour confirmer.')) {
                  const confirmation = window.prompt('Tapez "annuler contrat" pour confirmer:');
                  if (confirmation?.toLowerCase() === 'annuler contrat') {
                    updateContractStatus('cancelled');
                  }
                }
              }}
              disabled={saving}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              ❌ Annuler Contrat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// CREATE CONTRACT MODAL - Manual Contract Creation
// ============================================
// ============================================
// BC FILE UPLOADER (Admin side)
// ============================================
function BCFileUploader({ onUploaded, currentUrl }) {
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState(currentUrl || '');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `bc_manual_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('bc-documents')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('bc-documents')
        .getPublicUrl(fileName);
      
      onUploaded(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erreur upload: ' + err.message);
    }
    setUploading(false);
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onUploaded(urlInput.trim());
    }
  };

  if (currentUrl) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-green-600 text-sm">✅ BC ajouté</span>
        <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline">Voir</a>
        <button 
          onClick={() => onUploaded('')} 
          className="text-red-500 text-sm hover:underline"
        >
          Supprimer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setUrlMode(false)}
          className={`px-3 py-1 text-xs rounded ${!urlMode ? 'bg-[#00A651] text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          📄 Fichier
        </button>
        <button
          type="button"
          onClick={() => setUrlMode(true)}
          className={`px-3 py-1 text-xs rounded ${urlMode ? 'bg-[#00A651] text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          🔗 Lien
        </button>
      </div>
      
      {urlMode ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-3 py-2 bg-[#00A651] text-white rounded-lg text-sm"
          >
            OK
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#00A651] hover:bg-green-50 transition-colors">
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600">Upload...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl mb-1">📄</div>
                <p className="text-xs text-gray-600">Cliquez pour sélectionner</p>
                <p className="text-xs text-gray-400">PDF, DOC, Image</p>
              </>
            )}
          </div>
        </label>
      )}
    </div>
  );
}

function CreateContractModal({ clients, notify, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [contractData, setContractData] = useState({
    company_id: '',
    company_name: '', // For display when no company selected
    contract_number: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'active',
    internal_notes: '',
    bc_url: ''
  });
  const [devices, setDevices] = useState([
    { id: Date.now(), serial_number: '', model_name: '', device_type: 'particle_counter', nickname: '', tokens_total: 1, unit_price: 0 }
  ]);

  const addDevice = () => {
    setDevices([...devices, { id: Date.now(), serial_number: '', model_name: '', device_type: 'particle_counter', nickname: '', tokens_total: 1, unit_price: 0 }]);
  };

  const removeDevice = (id) => {
    if (devices.length > 1) {
      setDevices(devices.filter(d => d.id !== id));
    }
  };

  const updateDevice = (id, field, value) => {
    setDevices(devices.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const generateContractNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CTR-${year}-${random}`;
  };

  useEffect(() => {
    if (!contractData.contract_number) {
      setContractData(prev => ({ ...prev, contract_number: generateContractNumber() }));
    }
  }, []);

  const handleSubmit = async () => {
    // Validate
    if (!contractData.company_id && !contractData.company_name) {
      notify('Veuillez sélectionner un client ou entrer un nom', 'error');
      return;
    }
    if (devices.length === 0 || !devices.some(d => d.serial_number)) {
      notify('Veuillez ajouter au moins un appareil avec un numéro de série', 'error');
      return;
    }

    setSaving(true);
    try {
      // Create contract
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: contractData.company_id || null,
          company_name_manual: contractData.company_id ? null : contractData.company_name,
          contract_number: contractData.contract_number,
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          status: contractData.status,
          internal_notes: contractData.internal_notes,
          bc_url: contractData.bc_url || null
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Add devices
      const deviceInserts = devices.filter(d => d.serial_number).map(d => ({
        contract_id: contract.id,
        serial_number: d.serial_number,
        model_name: d.model_name,
        device_type: d.device_type,
        nickname: d.nickname,
        tokens_total: d.tokens_total || 2,
        tokens_used: 0,
        unit_price: d.unit_price || 0
      }));

      const { error: devicesError } = await supabase
        .from('contract_devices')
        .insert(deviceInserts);

      if (devicesError) throw devicesError;

      notify('✅ Contrat créé avec succès!');
      onCreated();
    } catch (err) {
      console.error('Error creating contract:', err);
      notify('Erreur: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalPrice = devices.reduce((sum, d) => sum + (parseFloat(d.unit_price) || 0), 0);
  const totalTokens = devices.reduce((sum, d) => sum + (parseInt(d.tokens_total) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">← Retour</button>
          <h1 className="text-2xl font-bold text-gray-800">Créer un Contrat Manuellement</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1a2e] text-white">
          <h2 className="text-xl font-bold">Nouveau Contrat d'Étalonnage</h2>
          <p className="text-gray-300 text-sm">Pour les contrats existants non créés par le client</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Client Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client existant</label>
              <select
                value={contractData.company_id}
                onChange={e => setContractData({ ...contractData, company_id: e.target.value, company_name: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
              >
                <option value="">— Sélectionner un client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ou nom du client (si pas de compte)</label>
              <input
                type="text"
                value={contractData.company_name}
                onChange={e => setContractData({ ...contractData, company_name: e.target.value, company_id: '' })}
                placeholder="Nom de l'entreprise..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
                disabled={!!contractData.company_id}
              />
              <p className="text-xs text-gray-500 mt-1">Vous pourrez lier le contrat à un compte plus tard</p>
            </div>
          </div>

          {/* Contract Details */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">N° Contrat</label>
              <input
                type="text"
                value={contractData.contract_number}
                onChange={e => setContractData({ ...contractData, contract_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
              <input
                type="date"
                value={contractData.start_date}
                onChange={e => setContractData({ ...contractData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
              <input
                type="date"
                value={contractData.end_date}
                onChange={e => setContractData({ ...contractData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={contractData.status}
                onChange={e => setContractData({ ...contractData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="active">✅ Actif</option>
                <option value="bc_pending">📄 Attente BC</option>
                <option value="quote_approved">✅ Devis approuvé</option>
                <option value="expired">⏰ Expiré</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bon de Commande (optionnel)</label>
              <BCFileUploader 
                onUploaded={(url) => setContractData({ ...contractData, bc_url: url })}
                currentUrl={contractData.bc_url}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes internes</label>
            <textarea
              value={contractData.internal_notes}
              onChange={e => setContractData({ ...contractData, internal_notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Notes sur ce contrat..."
            />
          </div>

          {/* Devices Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Appareils sous contrat ({devices.length})</h3>
              <button
                onClick={addDevice}
                className="px-4 py-2 bg-[#00A651] text-white rounded-lg text-sm hover:bg-[#008f45]"
              >
                + Ajouter appareil
              </button>
            </div>

            <div className="space-y-3">
              {devices.map((device, index) => (
                <div key={device.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-start gap-4">
                    <span className="bg-[#1a1a2e] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</span>
                    <div className="flex-1 grid md:grid-cols-6 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">N° Série *</label>
                        <input
                          type="text"
                          value={device.serial_number}
                          onChange={e => updateDevice(device.id, 'serial_number', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="SN..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Modèle</label>
                        <input
                          type="text"
                          value={device.model_name}
                          onChange={e => updateDevice(device.id, 'model_name', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="Modèle..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select
                          value={device.device_type}
                          onChange={e => updateDevice(device.id, 'device_type', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="particle_counter">Compteur particules</option>
                          <option value="bio_collector">Bio collecteur</option>
                          <option value="liquid_counter">Compteur liquide</option>
                          <option value="temp_humidity">Temp/Humidité</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tokens/an</label>
                        <input
                          type="number"
                          value={device.tokens_total}
                          onChange={e => updateDevice(device.id, 'tokens_total', parseInt(e.target.value) || 2)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Prix €</label>
                        <input
                          type="number"
                          value={device.unit_price}
                          onChange={e => updateDevice(device.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="flex items-end">
                        {devices.length > 1 && (
                          <button
                            onClick={() => removeDevice(device.id)}
                            className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 bg-emerald-50 rounded-lg p-4 flex justify-between items-center">
              <div>
                <span className="text-emerald-800 font-medium">{devices.filter(d => d.serial_number).length} appareil(s)</span>
                <span className="text-emerald-600 mx-3">•</span>
                <span className="text-emerald-800">{totalTokens} tokens total</span>
              </div>
              <div className="text-right">
                <span className="text-emerald-800 font-bold text-xl">{totalPrice.toFixed(2)} €</span>
                <span className="text-emerald-600 text-sm ml-2">HT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between">
          <button onClick={onClose} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-bold disabled:opacity-50"
          >
            {saving ? 'Création...' : '✅ Créer le Contrat'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsSheet({ profile, staffMembers, notify, reload }) { return <div className="space-y-6"><h1 className="text-2xl font-bold text-gray-800">Paramètres</h1><div className="bg-white rounded-xl shadow-sm"><div className="px-6 py-4 border-b"><h2 className="font-bold text-gray-800">Équipe Lighthouse</h2></div><div className="p-6 space-y-3">{staffMembers.map(member => <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#00A651] text-white flex items-center justify-center font-bold">{member.full_name?.charAt(0)?.toUpperCase()}</div><div><p className="font-medium">{member.full_name}</p><p className="text-sm text-gray-500">{member.email}</p></div></div><span className={`px-3 py-1 rounded-full text-sm ${member.role === 'lh_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{member.role === 'lh_admin' ? '👑 Admin' : '👤 Employé'}</span></div>)}</div></div></div>; }

function AdminSheet({ profile, staffMembers, notify, reload }) { return <div className="space-y-6"><h1 className="text-2xl font-bold text-gray-800">🔐 Administration</h1><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"><div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md cursor-pointer"><div className="text-3xl mb-3">💰</div><h3 className="font-bold text-gray-800">Tarification</h3><p className="text-sm text-gray-500">Gérer les prix des services</p></div><div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md cursor-pointer"><div className="text-3xl mb-3">🔑</div><h3 className="font-bold text-gray-800">Permissions</h3><p className="text-sm text-gray-500">Gérer les accès des employés</p></div><div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md cursor-pointer"><div className="text-3xl mb-3">⚙️</div><h3 className="font-bold text-gray-800">Système</h3><p className="text-sm text-gray-500">Configuration avancée</p></div></div></div>; }

// ============================================
// QUOTE TEMPLATES - Calibration by Device Type
// ============================================
const CALIBRATION_TEMPLATES = {
  particle_counter: {
    icon: '🔬',
    title: "Étalonnage Compteur de Particules Aéroportées",
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
  bio_collector: {
    icon: '🧫',
    title: "Étalonnage Bio Collecteur",
    prestations: [
      "Vérification des fonctionnalités de l'appareil",
      "Vérification et réglage du débit",
      "Vérification de la cellule d'impaction",
      "Contrôle des paramètres de collecte",
      "Fourniture d'un rapport de test et de calibration"
    ],
    defaultPrice: 330
  },
  liquid_counter: {
    icon: '💧',
    title: "Étalonnage Compteur de Particules en Milieu Liquide",
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
  temp_humidity: {
    icon: '🌡️',
    title: "Étalonnage Capteur Température/Humidité",
    prestations: [
      "Vérification des fonctionnalités du capteur",
      "Étalonnage température sur points de référence certifiés",
      "Étalonnage humidité relative",
      "Vérification de la stabilité des mesures",
      "Fourniture d'un certificat d'étalonnage"
    ],
    defaultPrice: 280
  },
  other: {
    icon: '📦',
    title: "Étalonnage Équipement",
    prestations: [
      "Vérification des fonctionnalités de l'appareil",
      "Étalonnage selon les spécifications du fabricant",
      "Tests de fonctionnement",
      "Fourniture d'un rapport de test"
    ],
    defaultPrice: 400
  }
};

// ============================================
// REPAIR TEMPLATE - Same for all device types
// ============================================
const REPAIR_TEMPLATE = {
  icon: '🔧',
  title: "Réparation",
  prestations: [
    "Diagnostic complet de l'appareil",
    "Identification des composants défectueux",
    "Remplacement des pièces défectueuses (pièces facturées en sus)",
    "Tests de fonctionnement complets",
    "Vérification d'étalonnage post-réparation si applicable"
  ],
  defaultPrice: 200
};

// ============================================
// DISCLAIMERS
// ============================================
const QUOTE_DISCLAIMERS = [
  "Cette offre n'inclut pas la réparation ou l'échange de pièces non consommables.",
  "Un devis complémentaire sera établi si des pièces sont trouvées défectueuses et nécessitent un remplacement.",
  "Les mesures stockées dans les appareils seront éventuellement perdues lors des opérations de maintenance.",
  "Les équipements envoyés devront être décontaminés de toutes substances chimiques, bactériennes ou radioactives."
];

// France Metropolitan check for shipping
const isFranceMetropolitan = (postalCode) => {
  if (!postalCode) return false;
  const cleaned = postalCode.toString().replace(/\s/g, '');
  if (!/^\d{5}$/.test(cleaned)) return false;
  const dept = parseInt(cleaned.substring(0, 2), 10);
  return dept >= 1 && dept <= 95;
};

// ============================================
// QUOTE EDITOR MODAL
// ============================================
function QuoteEditorModal({ request, onClose, notify, reload, profile }) {
  const [step, setStep] = useState(1); // 1=Edit Pricing, 2=Preview, 3=Confirm
  const [devicePricing, setDevicePricing] = useState([]);
  const [saving, setSaving] = useState(false);
  const [quoteRef, setQuoteRef] = useState('');
  const [contractInfo, setContractInfo] = useState(null); // Active contract data
  const [loadingContract, setLoadingContract] = useState(true);

  const devices = request?.request_devices || [];
  const signatory = profile?.full_name || 'Lighthouse France';
  const today = new Date();
  
  // Check if client is in France Metropolitan for shipping
  const clientPostalCode = request?.companies?.billing_postal_code || 
                           request?.companies?.postal_code || 
                           '';
  const isMetro = clientPostalCode ? isFranceMetropolitan(clientPostalCode) : true;
  const defaultShipping = isMetro ? 45 : 0;

  // ============================================
  // CONTRACT DETECTION - Match by serial number
  // ============================================
  useEffect(() => {
    const checkContract = async () => {
      // Trim whitespace from serial numbers
      const deviceSerials = devices.map(d => (d.serial_number || '').trim()).filter(Boolean);
      console.log('🔍 Checking contracts for serial numbers:', deviceSerials);
      
      if (deviceSerials.length === 0) {
        console.log('❌ No serial numbers to check');
        setLoadingContract(false);
        return;
      }
      
      const todayStr = new Date().toISOString().split('T')[0];
      console.log('📅 Today:', todayStr);
      
      try {
        // First, get all active contracts (simplified query)
        const { data: activeContracts, error: contractError } = await supabase
          .from('contracts')
          .select('id, contract_number, start_date, end_date, company_id')
          .eq('status', 'active')
          .lte('start_date', todayStr)
          .gte('end_date', todayStr);
        
        console.log('📋 Active contracts:', activeContracts, 'Error:', contractError);
        
        if (contractError) {
          console.error('Contract query error:', contractError);
          setLoadingContract(false);
          return;
        }
        
        if (!activeContracts || activeContracts.length === 0) {
          console.log('❌ No active contracts found');
          setLoadingContract(false);
          return;
        }
        
        // Get contract IDs
        const contractIds = activeContracts.map(c => c.id);
        console.log('📋 Contract IDs:', contractIds);
        
        // Now get contract devices separately
        const { data: contractDevicesData, error: devicesError } = await supabase
          .from('contract_devices')
          .select('*')
          .in('contract_id', contractIds);
        
        console.log('📋 Contract devices:', contractDevicesData, 'Error:', devicesError);
        
        if (devicesError) {
          console.error('Contract devices query error:', devicesError);
          setLoadingContract(false);
          return;
        }
        
        // Build map of serial numbers to contract devices
        const deviceMap = {};
        let matchedContract = null;
        
        for (const cd of (contractDevicesData || [])) {
          const contract = activeContracts.find(c => c.id === cd.contract_id);
          if (!contract) continue;
          
          const tokensRemaining = (cd.tokens_total || 0) - (cd.tokens_used || 0);
          const serialTrimmed = (cd.serial_number || '').trim();
          
          // Check if this contract device matches any RMA device
          if (deviceSerials.includes(serialTrimmed)) {
            console.log(`✅ MATCH! Serial "${serialTrimmed}" found in contract ${contract.contract_number}`);
            matchedContract = contract;
          }
          
          deviceMap[serialTrimmed] = {
            contract_id: contract.id,
            contract_number: contract.contract_number,
            contract_device_id: cd.id,
            tokens_remaining: tokensRemaining,
            tokens_total: cd.tokens_total || 0,
            unit_price: cd.unit_price || 0
          };
        }
        
        console.log('📋 Device map:', deviceMap);
        
        // Check which RMA devices are in the map
        let hasMatch = false;
        deviceSerials.forEach(sn => {
          if (deviceMap[sn]) {
            console.log(`✅ RMA device "${sn}" is covered by contract ${deviceMap[sn].contract_number}, tokens remaining: ${deviceMap[sn].tokens_remaining}`);
            hasMatch = true;
          } else {
            console.log(`❌ RMA device "${sn}" is NOT in any contract`);
          }
        });
        
        if (hasMatch) {
          setContractInfo({
            contracts: activeContracts,
            primaryContract: matchedContract || activeContracts[0],
            deviceMap
          });
          console.log('✅ Contract info set!');
        } else {
          console.log('❌ No matching serial numbers found in contracts');
        }
      } catch (err) {
        console.error('Contract check error:', err);
      }
      
      setLoadingContract(false);
    };
    
    checkContract();
  }, [devices]);

  // Determine which service sections are needed based on devices
  const getRequiredSections = () => {
    const sections = { calibration: new Set(), repair: false };
    
    devices.forEach(d => {
      const serviceType = d.service_type || '';
      const deviceType = d.device_type || 'particle_counter';
      
      if (serviceType.includes('calibration') || serviceType === 'calibration_repair' || serviceType === 'cal_repair') {
        sections.calibration.add(deviceType);
      }
      if (serviceType.includes('repair') || serviceType === 'calibration_repair' || serviceType === 'cal_repair') {
        sections.repair = true;
      }
    });
    
    return {
      calibrationTypes: Array.from(sections.calibration),
      hasRepair: sections.repair
    };
  };

  const requiredSections = getRequiredSections();

  useEffect(() => {
    if (loadingContract) return; // Wait for contract check
    
    console.log('📊 Initializing device pricing, contractInfo:', contractInfo);
    
    // Generate quote reference
    const year = today.getFullYear().toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setQuoteRef(`LH/${year}${month}/XXX`);
    
    // Initialize device pricing from request
    if (devices.length > 0) {
      setDevicePricing(devices.map((d, i) => {
        const deviceType = d.device_type || 'particle_counter';
        const serviceType = d.service_type || 'calibration';
        const needsCal = serviceType.includes('calibration') || serviceType === 'calibration_repair' || serviceType === 'cal_repair';
        const needsRepair = serviceType.includes('repair') || serviceType === 'calibration_repair' || serviceType === 'cal_repair';
        
        const calTemplate = CALIBRATION_TEMPLATES[deviceType] || CALIBRATION_TEMPLATES.particle_counter;
        
        // Check contract coverage - trim serial number for matching
        const serialTrimmed = (d.serial_number || '').trim();
        const contractDevice = contractInfo?.deviceMap?.[serialTrimmed];
        const isContractCovered = needsCal && contractDevice && contractDevice.tokens_remaining > 0;
        const tokensExhausted = needsCal && contractDevice && contractDevice.tokens_remaining <= 0;
        
        console.log(`📊 Device ${serialTrimmed}: contractDevice=`, contractDevice, 'isContractCovered=', isContractCovered);
        
        return {
          id: d.id || `device-${i}`,
          model: d.model_name || '',
          serial: serialTrimmed,
          deviceType: deviceType,
          serviceType: serviceType,
          needsCalibration: needsCal,
          needsRepair: needsRepair,
          customerNotes: d.notes || d.problem_description || '',
          // Contract coverage
          isContractCovered: isContractCovered,
          tokensExhausted: tokensExhausted,
          contractDeviceId: contractDevice?.contract_device_id || null,
          contractId: contractDevice?.contract_id || null,
          tokensRemaining: contractDevice?.tokens_remaining || 0,
          // Pricing - 0 for contract-covered calibrations
          calibrationPrice: isContractCovered ? 0 : (needsCal ? calTemplate.defaultPrice : 0),
          repairPrice: needsRepair ? REPAIR_TEMPLATE.defaultPrice : 0,
          additionalParts: [],
          shipping: isContractCovered ? 0 : defaultShipping
        };
      }));
    }
  }, [loadingContract, contractInfo]);

  // Update device pricing
  const updateDevice = (deviceId, field, value) => {
    setDevicePricing(prev => prev.map(d => 
      d.id === deviceId ? { ...d, [field]: value } : d
    ));
  };

  // Add part to device
  const addPart = (deviceId) => {
    setDevicePricing(prev => prev.map(d => {
      if (d.id === deviceId) {
        return { ...d, additionalParts: [...d.additionalParts, { id: Date.now(), description: '', price: 0 }] };
      }
      return d;
    }));
  };

  // Update part
  const updatePart = (deviceId, partId, field, value) => {
    setDevicePricing(prev => prev.map(d => {
      if (d.id === deviceId) {
        return { ...d, additionalParts: d.additionalParts.map(p => p.id === partId ? { ...p, [field]: value } : p) };
      }
      return d;
    }));
  };

  // Remove part
  const removePart = (deviceId, partId) => {
    setDevicePricing(prev => prev.map(d => {
      if (d.id === deviceId) {
        return { ...d, additionalParts: d.additionalParts.filter(p => p.id !== partId) };
      }
      return d;
    }));
  };

  // Calculate device subtotal (services only, no shipping)
  const getDeviceServiceTotal = (d) => {
    let total = 0;
    if (d.needsCalibration) total += d.calibrationPrice;
    if (d.needsRepair) total += d.repairPrice;
    total += d.additionalParts.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
    return total;
  };

  // Calculate totals
  const servicesSubtotal = devicePricing.reduce((sum, d) => sum + getDeviceServiceTotal(d), 0);
  const shippingTotal = devicePricing.reduce((sum, d) => sum + (parseFloat(d.shipping) || 0), 0);
  const grandTotal = servicesSubtotal + shippingTotal;

  // Get device type label
  const getDeviceTypeLabel = (type) => {
    const labels = {
      particle_counter: 'Compteur Particules (Air)',
      bio_collector: 'Bio Collecteur',
      liquid_counter: 'Compteur Particules (Liquide)',
      temp_humidity: 'Capteur Temp/Humidité',
      other: 'Autre'
    };
    return labels[type] || type;
  };

  // Check if fully covered by contract (all calibrations covered, no repairs)
  const isFullyContractCovered = devicePricing.every(d => {
    if (d.needsCalibration && !d.isContractCovered) return false;
    if (d.needsRepair) return false; // Repairs are not covered
    return true;
  }) && devicePricing.some(d => d.isContractCovered);
  
  // Check if any device is contract covered
  const hasContractCoveredDevices = devicePricing.some(d => d.isContractCovered);

  // Send quote (or auto-approve for contract)
  const sendQuote = async () => {
    setSaving(true);
    
    let rmaNumber = request.request_number;
    if (!rmaNumber) {
      const { data } = await supabase.from('service_requests').select('request_number').like('request_number', 'FR-%').order('request_number', { ascending: false }).limit(1);
      const lastNum = data?.[0]?.request_number ? parseInt(data[0].request_number.replace('FR-', '')) : 0;
      rmaNumber = 'FR-' + String(lastNum + 1).padStart(5, '0');
    }

    // Save complete quote data
    const quoteData = {
      devices: devicePricing.map(d => ({
        model: d.model,
        serial: d.serial,
        deviceType: d.deviceType,
        serviceType: d.serviceType,
        needsCalibration: d.needsCalibration,
        needsRepair: d.needsRepair,
        calibrationPrice: d.calibrationPrice,
        repairPrice: d.repairPrice,
        additionalParts: d.additionalParts,
        shipping: d.shipping,
        serviceTotal: getDeviceServiceTotal(d),
        // Contract info
        isContractCovered: d.isContractCovered,
        contractDeviceId: d.contractDeviceId
      })),
      requiredSections,
      servicesSubtotal,
      shippingTotal,
      grandTotal,
      isMetro,
      isContractRMA: hasContractCoveredDevices,
      createdBy: signatory,
      createdAt: new Date().toISOString()
    };

    try {
      // Determine status and whether to auto-approve
      let newStatus = 'quote_sent';
      let bcUrl = null;
      
      // If fully contract covered (calibration only, all covered), auto-approve
      if (isFullyContractCovered) {
        newStatus = 'waiting_device'; // Skip quote approval, go straight to waiting
        bcUrl = contractInfo?.primaryContract?.bc_url; // Copy BC from contract
      }

      const updateData = {
        request_number: rmaNumber,
        status: newStatus,
        quoted_at: new Date().toISOString(),
        quote_total: grandTotal,
        quote_subtotal: servicesSubtotal,
        quote_shipping: shippingTotal,
        quote_data: quoteData,
        quote_revision_notes: null,
        // Contract fields
        is_contract_rma: hasContractCoveredDevices,
        contract_id: hasContractCoveredDevices ? contractInfo?.primaryContract?.id : null
      };
      
      // Add BC URL if contract-covered
      if (bcUrl) {
        updateData.bc_url = bcUrl;
        updateData.bc_approved_at = new Date().toISOString();
      }

      const { error } = await supabase.from('service_requests').update(updateData).eq('id', request.id);

      if (error) throw error;

      // Update request_devices with contract info
      for (const d of devicePricing) {
        if (d.id && d.isContractCovered) {
          await supabase.from('request_devices').update({
            contract_device_id: d.contractDeviceId,
            contract_covered: true
          }).eq('id', d.id);
        }
      }

      if (isFullyContractCovered) {
        notify(`✅ Contrat! RMA ${rmaNumber} créé - En attente de réception (BC contrat copié)`);
      } else if (hasContractCoveredDevices) {
        notify(`✅ Devis envoyé! RMA: ${rmaNumber} (certains appareils sous contrat)`);
      } else {
        notify('✅ Devis envoyé! RMA: ' + rmaNumber);
      }
      
      reload(); 
      onClose();
    } catch (err) {
      notify('Erreur: ' + err.message, 'error');
    }
    
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex" onClick={onClose}>
      <div className="bg-white w-full h-full md:w-[98%] md:h-[98%] md:m-auto md:rounded-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`px-6 py-4 text-white flex justify-between items-center shrink-0 ${isFullyContractCovered ? 'bg-emerald-600' : 'bg-[#1a1a2e]'}`}>
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {step === 1 && (isFullyContractCovered ? '📋 RMA Contrat' : 'Créer le Devis')}
                {step === 2 && 'Aperçu du Devis'}
                {step === 3 && (isFullyContractCovered ? 'Confirmer RMA Contrat' : 'Confirmer l\'envoi')}
              </h2>
              <p className="text-gray-300">{request.companies?.name} • {devicePricing.length} appareil(s)</p>
            </div>
            <div className="flex gap-1">
              {[1,2,3].map(s => (
                <div key={s} className={`w-8 h-2 rounded-full ${step >= s ? (isFullyContractCovered ? 'bg-white' : 'bg-[#00A651]') : 'bg-gray-600'}`} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-300">Total HT</p>
              {isFullyContractCovered ? (
                <p className="text-2xl font-bold text-white">CONTRAT</p>
              ) : (
                <p className="text-2xl font-bold text-[#00A651]">{grandTotal.toFixed(2)} €</p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Loading Contract Check */}
          {loadingContract && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Vérification contrat en cours...</span>
              </div>
            </div>
          )}
          
          {/* ==================== STEP 1: PRICING EDITOR ==================== */}
          {step === 1 && !loadingContract && (
            <div className="flex h-full">
              {/* LEFT SIDE - Customer Info & Devices */}
              <div className="flex-1 p-6 overflow-y-auto">
                
                {/* CONTRACT CUSTOMER BANNER */}
                {hasContractCoveredDevices && (
                  <div className="mb-6 p-4 rounded-xl border-2 bg-emerald-50 border-emerald-300">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">📋</span>
                      <div className="flex-1">
                        <p className="font-bold text-emerald-800">
                          Contrat détecté
                        </p>
                        <p className="text-emerald-700 text-sm mt-1">
                          {isFullyContractCovered 
                            ? 'Étalonnage(s) couvert(s) par contrat. Le RMA sera créé directement en "Attente Appareil" avec le BC du contrat.'
                            : `${devicePricing.filter(d => d.isContractCovered).length} appareil(s) couvert(s) par contrat. Les réparations ou appareils non couverts seront facturés normalement.`
                          }
                        </p>
                        {contractInfo?.primaryContract && (
                          <p className="text-xs text-emerald-600 mt-2">
                            Contrat: {contractInfo.primaryContract.contract_number} • 
                            Valide jusqu'au {new Date(contractInfo.primaryContract.end_date).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Revision Request Alert */}
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
                    <p className="text-amber-700 text-sm">Les frais de retour sont à 0€ par défaut. Le client gère son propre transport.</p>
                  </div>
                )}

                {/* Customer Info Card */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-gray-800 mb-3">Client</h3>
                  <p className="text-lg font-bold text-[#1E3A5F]">{request.companies?.name}</p>
                  {request.companies?.billing_address && (
                    <p className="text-sm text-gray-600">{request.companies?.billing_address}</p>
                  )}
                  <p className="text-sm text-gray-600">{request.companies?.billing_postal_code} {request.companies?.billing_city}</p>
                </div>

                {/* Detected Service Sections */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-blue-800 mb-2">Sections du devis (auto-détectées)</h3>
                  <div className="flex flex-wrap gap-2">
                    {requiredSections.calibrationTypes.map(type => (
                      <span key={type} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {CALIBRATION_TEMPLATES[type]?.icon} Étal. {getDeviceTypeLabel(type)}
                      </span>
                    ))}
                    {requiredSections.hasRepair && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                        🔧 Réparation
                      </span>
                    )}
                  </div>
                </div>

                {/* Device Pricing Cards */}
                <h3 className="font-bold text-gray-800 mb-3">Tarification par Appareil</h3>
                <div className="space-y-4">
                  {devicePricing.map((device, index) => {
                    const calTemplate = CALIBRATION_TEMPLATES[device.deviceType] || CALIBRATION_TEMPLATES.particle_counter;
                    return (
                      <div key={device.id} className={`border-2 rounded-xl overflow-hidden ${device.isContractCovered ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'}`}>
                        {/* Device Header */}
                        <div className={`px-4 py-3 flex items-center justify-between ${device.isContractCovered ? 'bg-emerald-600' : 'bg-[#1a1a2e]'} text-white`}>
                          <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-2 py-1 rounded text-sm font-bold">#{index + 1}</span>
                            <div>
                              <p className="font-bold">{device.model || 'Appareil'}</p>
                              <p className="text-sm text-gray-300">SN: {device.serial} • {getDeviceTypeLabel(device.deviceType)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {device.isContractCovered && (
                              <span className="bg-white text-emerald-600 px-2 py-1 rounded text-xs font-bold">📋 CONTRAT</span>
                            )}
                            {device.tokensExhausted && (
                              <span className="bg-amber-500 px-2 py-1 rounded text-xs font-bold">⚠️ Tokens épuisés</span>
                            )}
                            {device.needsCalibration && !device.isContractCovered && <span className="bg-blue-500 px-2 py-1 rounded text-xs">🔬 Cal</span>}
                            {device.needsRepair && <span className="bg-orange-500 px-2 py-1 rounded text-xs">🔧 Rép</span>}
                          </div>
                        </div>

                        {/* Customer Notes (Internal) */}
                        {device.customerNotes && (
                          <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
                            <p className="text-xs text-yellow-700 font-medium">💬 Note client (interne) :</p>
                            <p className="text-sm text-yellow-800">{device.customerNotes}</p>
                          </div>
                        )}
                        
                        {/* Contract Coverage Info */}
                        {device.isContractCovered && (
                          <div className="bg-emerald-100 px-4 py-2 border-b border-emerald-200">
                            <p className="text-sm text-emerald-800">
                              <span className="font-bold">📋 Couvert par contrat</span> 
                              <span className="ml-2">• Tokens restants: {device.tokensRemaining}</span>
                            </p>
                          </div>
                        )}
                        {device.tokensExhausted && (
                          <div className="bg-amber-100 px-4 py-2 border-b border-amber-200">
                            <p className="text-sm text-amber-800">
                              <span className="font-bold">⚠️ Tokens épuisés</span> - Facturation au tarif normal
                            </p>
                          </div>
                        )}

                        {/* Pricing Inputs */}
                        <div className="p-4 space-y-3">
                          {device.needsCalibration && (
                            <div className={`flex items-center justify-between p-3 rounded-lg ${device.isContractCovered ? 'bg-emerald-100' : 'bg-blue-50'}`}>
                              <div>
                                <span className={`font-medium ${device.isContractCovered ? 'text-emerald-800' : 'text-blue-800'}`}>Main d'œuvre étalonnage</span>
                                <span className={`text-xs ml-2 ${device.isContractCovered ? 'text-emerald-600' : 'text-blue-600'}`}>({calTemplate.icon} {getDeviceTypeLabel(device.deviceType)})</span>
                              </div>
                              {device.isContractCovered ? (
                                <div className="flex items-center gap-2">
                                  <span className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg">
                                    CONTRAT
                                  </span>
                                  <span className="text-emerald-600 font-medium">0,00 €</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={device.calibrationPrice}
                                    onChange={e => updateDevice(device.id, 'calibrationPrice', parseFloat(e.target.value) || 0)}
                                    className="w-24 px-3 py-2 border rounded-lg text-right font-medium"
                                  />
                                  <span className="text-gray-500 font-medium">€</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {device.needsRepair && (
                            <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                              <span className="font-medium text-orange-800">Main d'œuvre réparation</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={device.repairPrice}
                                  onChange={e => updateDevice(device.id, 'repairPrice', parseFloat(e.target.value) || 0)}
                                  className="w-24 px-3 py-2 border rounded-lg text-right font-medium"
                                />
                                <span className="text-gray-500 font-medium">€</span>
                              </div>
                            </div>
                          )}

                          {/* Additional Parts */}
                          {device.additionalParts.map(part => (
                            <div key={part.id} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                              <input
                                type="text"
                                value={part.description}
                                onChange={e => updatePart(device.id, part.id, 'description', e.target.value)}
                                placeholder="Pièce ou service supplémentaire..."
                                className="flex-1 px-3 py-2 border rounded-lg"
                              />
                              <input
                                type="number"
                                value={part.price}
                                onChange={e => updatePart(device.id, part.id, 'price', e.target.value)}
                                className="w-24 px-3 py-2 border rounded-lg text-right"
                                placeholder="0"
                              />
                              <span className="text-gray-500">€</span>
                              <button onClick={() => removePart(device.id, part.id)} className="text-red-500 hover:text-red-700 text-xl px-2">×</button>
                            </div>
                          ))}
                          
                          <button onClick={() => addPart(device.id)} className="text-sm text-[#00A651] font-medium hover:underline">
                            + Ajouter pièce/service
                          </button>

                          {/* Shipping */}
                          <div className={`flex items-center justify-between p-3 rounded-lg border-t mt-3 ${device.isContractCovered ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                            <span className={`font-medium ${device.isContractCovered ? 'text-emerald-700' : 'text-gray-700'}`}>
                              {device.isContractCovered ? 'Frais de port (inclus contrat)' : isMetro ? 'Frais de port' : 'Transport (géré par client)'}
                            </span>
                            {device.isContractCovered ? (
                              <div className="flex items-center gap-2">
                                <span className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg">
                                  CONTRAT
                                </span>
                                <span className="text-emerald-600 font-medium">0,00 €</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={device.shipping}
                                  onChange={e => updateDevice(device.id, 'shipping', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-3 py-2 border rounded-lg text-right"
                                />
                                <span className="text-gray-500">€</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT SIDE - Pricing Summary */}
              <div className="w-80 bg-gray-50 border-l p-6 overflow-y-auto shrink-0">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">💰 Récapitulatif</h3>
                
                {/* Per-device totals */}
                <div className="space-y-3 mb-6">
                  {devicePricing.map((device, i) => (
                    <div key={device.id} className={`rounded-lg p-3 border ${device.isContractCovered ? 'bg-emerald-50 border-emerald-200' : 'bg-white'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{device.model}</p>
                          <p className="text-xs text-gray-500">SN: {device.serial}</p>
                        </div>
                        <div className="text-right">
                          {device.isContractCovered ? (
                            <>
                              <p className="font-bold text-emerald-600">CONTRAT</p>
                              <p className="text-xs text-emerald-500">Inclus dans le contrat</p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-[#00A651]">{(getDeviceServiceTotal(device) + device.shipping).toFixed(2)} €</p>
                              <p className="text-xs text-gray-400">dont port: {device.shipping}€</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total services</span>
                    <span className="font-medium">{servicesSubtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Frais de port total</span>
                    <span className="font-medium">{shippingTotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#00A651] text-white px-4 py-3 rounded-lg mt-4">
                    <span className="font-bold">TOTAL HT</span>
                    <span className="font-bold text-xl">{grandTotal.toFixed(2)} €</span>
                  </div>
                </div>

                {/* Signatory */}
                <div className="mt-6 pt-4 border-t">
                  <p className="text-xs text-gray-500 uppercase mb-1">Établi par</p>
                  <p className="font-medium">{signatory}</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== STEP 2: QUOTE PREVIEW ==================== */}
          {step === 2 && (
            <div className="p-6 bg-gray-200 min-h-full">
              <div className="max-w-4xl mx-auto bg-white shadow-xl" style={{ fontFamily: 'Arial, sans-serif' }}>
                
                {/* Quote Header */}
                <div className="px-8 pt-8 pb-4 border-b-4 border-[#00A651]">
                  <div className="flex justify-between items-start">
                    <div>
                      <img 
                        src="/images/logos/lighthouse-logo.png" 
                        alt="Lighthouse France" 
                        className="h-14 w-auto mb-1"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div className="hidden">
                        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a2e]">LIGHTHOUSE</h1>
                        <p className="text-gray-500">Worldwide Solutions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#00A651]">OFFRE DE PRIX</p>
                      <p className="text-gray-500">Ref: {quoteRef}</p>
                    </div>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="bg-gray-100 px-8 py-3 flex justify-between text-sm border-b">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Date</p>
                    <p className="font-medium">{today.toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Validité</p>
                    <p className="font-medium">30 jours</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Conditions</p>
                    <p className="font-medium">À réception de facture</p>
                  </div>
                </div>

                {/* Client Info */}
                <div className="px-8 py-4 border-b">
                  <p className="text-xs text-gray-500 uppercase">Client</p>
                  <p className="font-bold text-xl text-[#1a1a2e]">{request.companies?.name}</p>
                  {request.companies?.billing_address && <p className="text-gray-600">{request.companies?.billing_address}</p>}
                  <p className="text-gray-600">{request.companies?.billing_postal_code} {request.companies?.billing_city}</p>
                </div>

                {/* ===== SERVICE DESCRIPTION SECTIONS ===== */}
                <div className="px-8 py-6 space-y-6">
                  
                  {/* Calibration Sections - One per device type */}
                  {requiredSections.calibrationTypes.map(type => {
                    const template = CALIBRATION_TEMPLATES[type];
                    return (
                      <div key={type} className="border-l-4 border-blue-500 pl-4">
                        <h3 className="font-bold text-lg text-[#1a1a2e] mb-3 flex items-center gap-2">
                          <span>{template.icon}</span> {template.title}
                        </h3>
                        <ul className="space-y-1">
                          {template.prestations.map((p, i) => (
                            <li key={i} className="text-gray-700 flex items-start gap-2">
                              <span className="text-[#00A651] mt-1">▸</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}

                  {/* Repair Section */}
                  {requiredSections.hasRepair && (
                    <div className="border-l-4 border-orange-500 pl-4">
                      <h3 className="font-bold text-lg text-[#1a1a2e] mb-3 flex items-center gap-2">
                        <span>{REPAIR_TEMPLATE.icon}</span> {REPAIR_TEMPLATE.title}
                      </h3>
                      <ul className="space-y-1">
                        {REPAIR_TEMPLATE.prestations.map((p, i) => (
                          <li key={i} className="text-gray-700 flex items-start gap-2">
                            <span className="text-orange-500 mt-1">▸</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* ===== PRICING BREAKDOWN TABLE ===== */}
                <div className="px-8 py-6 bg-gray-50">
                  <h3 className="font-bold text-lg text-[#1a1a2e] mb-4">Récapitulatif des Prix</h3>
                  
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1a1a2e] text-white">
                        <th className="px-4 py-3 text-left">Appareil</th>
                        <th className="px-4 py-3 text-left">N° Série</th>
                        <th className="px-4 py-3 text-left">Service</th>
                        <th className="px-4 py-3 text-right">Prix HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devicePricing.map((device, i) => {
                        const services = [];
                        if (device.needsCalibration) services.push('Étalonnage');
                        if (device.needsRepair) services.push('Réparation');
                        const deviceTotal = getDeviceServiceTotal(device);
                        
                        console.log('📄 Preview device:', device.serial, 'isContractCovered:', device.isContractCovered, 'shipping:', device.shipping);
                        
                        const rows = [
                          <tr key={`${device.id}-main`} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} ${device.isContractCovered ? 'bg-emerald-50' : ''}`}>
                            <td className="px-4 py-3 font-medium">
                              {device.model}
                              {device.isContractCovered && <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded">CONTRAT</span>}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{device.serial}</td>
                            <td className="px-4 py-3">{services.join(' + ')}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              {device.isContractCovered ? (
                                <span className="text-emerald-600 font-bold">Contrat</span>
                              ) : (
                                `${deviceTotal.toFixed(2)} €`
                              )}
                            </td>
                          </tr>
                        ];
                        
                        device.additionalParts.forEach(part => {
                          rows.push(
                            <tr key={`${device.id}-part-${part.id}`} className="bg-gray-50 text-gray-600">
                              <td className="px-4 py-2 pl-8 text-sm" colSpan={3}>↳ {part.description || 'Pièce/Service'}</td>
                              <td className="px-4 py-2 text-right text-sm">{parseFloat(part.price || 0).toFixed(2)} €</td>
                            </tr>
                          );
                        });
                        
                        rows.push(
                          <tr key={`${device.id}-shipping`} className={`${device.isContractCovered ? 'bg-emerald-100' : 'bg-gray-200'} text-gray-600`}>
                            <td className="px-4 py-2 pl-8 text-sm" colSpan={3}>↳ Frais de port</td>
                            <td className="px-4 py-2 text-right text-sm">
                              {device.isContractCovered ? (
                                <span className="text-emerald-600 font-medium">Contrat</span>
                              ) : (
                                `${device.shipping.toFixed(2)} €`
                              )}
                            </td>
                          </tr>
                        );
                        
                        return rows;
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300">
                        <td className="px-4 py-3 font-medium" colSpan={3}>Sous-total services</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {isFullyContractCovered ? <span className="text-emerald-600 font-bold">Contrat</span> : `${servicesSubtotal.toFixed(2)} €`}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium" colSpan={3}>Total frais de port</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {isFullyContractCovered ? <span className="text-emerald-600 font-bold">Contrat</span> : `${shippingTotal.toFixed(2)} €`}
                        </td>
                      </tr>
                      <tr className={isFullyContractCovered ? "bg-emerald-600 text-white" : "bg-[#00A651] text-white"}>
                        <td className="px-4 py-4 font-bold text-lg" colSpan={3}>TOTAL HT</td>
                        <td className="px-4 py-4 text-right font-bold text-2xl">
                          {isFullyContractCovered ? 'Contrat' : `${grandTotal.toFixed(2)} €`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Disclaimers */}
                <div className="px-8 py-4 border-t">
                  <p className="text-xs text-gray-500 uppercase mb-2">Conditions</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {QUOTE_DISCLAIMERS.map((d, i) => (
                      <li key={i}>• {d}</li>
                    ))}
                  </ul>
                </div>

                {/* Signature Section */}
                <div className="px-8 py-6 border-t flex justify-between items-end">
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Etabli par</p>
                      <p className="font-bold text-lg">{signatory}</p>
                      <p className="text-gray-600">Lighthouse France</p>
                    </div>
                    {/* Capcert Logo */}
                    <img 
                      src="/images/logos/capcert-logo.png" 
                      alt="Capcert Certification" 
                      className="h-20 w-auto"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Signature client</p>
                    <div className="w-48 h-20 border-2 border-dashed border-gray-300 rounded"></div>
                    <p className="text-xs text-gray-400 mt-1">Lu et approuve</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-[#1a1a2e] text-white px-8 py-4 text-center text-sm">
                  <p className="font-medium">Lighthouse France SAS</p>
                  <p className="text-gray-400">16, rue Paul Sejourne - 94000 CRETEIL - Tel. 01 43 77 28 07</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== STEP 3: CONFIRM ==================== */}
          {step === 3 && (
            <div className="flex items-center justify-center min-h-full p-8">
              <div className="text-center max-w-lg">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isFullyContractCovered ? 'bg-emerald-500' : 'bg-[#00A651]'}`}>
                  <span className="text-5xl text-white">{isFullyContractCovered ? '📋' : '📧'}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {isFullyContractCovered ? 'Créer le RMA (Contrat)' : 'Confirmer l\'envoi du devis'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {isFullyContractCovered 
                    ? 'Le RMA sera créé directement en "Attente Appareil" avec le BC du contrat.'
                    : 'Le devis sera envoyé au client et disponible sur son portail.'
                  }
                </p>
                
                <div className={`rounded-xl p-6 mb-6 text-left ${isFullyContractCovered ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
                  <p className="text-lg font-bold text-gray-800 mb-1">{request.companies?.name}</p>
                  <p className="text-sm text-gray-500 mb-4">{devicePricing.length} appareil(s)</p>
                  
                  <div className="space-y-2 text-sm border-t pt-3">
                    {devicePricing.map(d => (
                      <div key={d.id} className="flex justify-between items-center">
                        <span>
                          {d.model} <span className="text-gray-400">({d.serial})</span>
                          {d.isContractCovered && <span className="ml-2 px-2 py-0.5 bg-emerald-200 text-emerald-700 rounded text-xs font-bold">CONTRAT</span>}
                        </span>
                        <span className="font-medium">
                          {d.isContractCovered ? '0,00 €' : `${(getDeviceServiceTotal(d) + d.shipping).toFixed(2)} €`}
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                      <span>Total HT</span>
                      <span className={isFullyContractCovered ? 'text-emerald-600' : 'text-[#00A651]'}>
                        {grandTotal.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>

                {isFullyContractCovered ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 text-left">
                    <p className="font-medium mb-2">🎯 Workflow contrat :</p>
                    <p className="mb-1">✓ Un numéro RMA sera attribué automatiquement</p>
                    <p className="mb-1">✓ Le BC du contrat sera copié dans le RMA</p>
                    <p className="mb-1">✓ Statut directement "Attente Appareil"</p>
                    <p>✓ Pas d'approbation client nécessaire</p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-left">
                    <p className="font-medium mb-2">Après envoi :</p>
                    <p className="mb-1">✓ Un numéro RMA sera attribué automatiquement</p>
                    <p className="mb-1">✓ Le client recevra une notification</p>
                    <p>✓ Le devis sera disponible sur son portail</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-gray-100 border-t flex justify-between items-center shrink-0">
          <button onClick={step === 1 ? onClose : () => setStep(step - 1)} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium">
            {step === 1 ? 'Annuler' : '← Retour'}
          </button>
          <div className="flex gap-3">
            {step < 3 && !loadingContract && (
              <button onClick={() => setStep(step + 1)} className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">
                Suivant →
              </button>
            )}
            {step === 3 && (
              <button 
                onClick={sendQuote} 
                disabled={saving} 
                className={`px-10 py-3 text-white rounded-lg font-bold text-lg disabled:opacity-50 ${isFullyContractCovered ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#00A651] hover:bg-[#008f45]'}`}
              >
                {saving ? 'Envoi en cours...' : isFullyContractCovered ? '📋 Créer RMA Contrat' : '✅ Confirmer et Envoyer'}
              </button>
            )}
            {loadingContract && step === 1 && (
              <div className="px-8 py-2 bg-gray-300 text-gray-500 rounded-lg font-medium">
                Chargement...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PRICING SHEET COMPONENT
// ============================================
function PricingSheet({ notify, isAdmin }) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load parts from database
  const loadParts = useCallback(async () => {
    setLoading(true);
    
    // Load all parts using pagination (Supabase has 1000 row limit per request)
    let allParts = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('parts_pricing')
        .select('*')
        .order('part_number', { ascending: true })
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error('Error loading parts:', error);
        notify('Erreur de chargement des pièces', 'error');
        break;
      }
      
      if (data && data.length > 0) {
        allParts = [...allParts, ...data];
        offset += pageSize;
        hasMore = data.length === pageSize; // If we got less than pageSize, we're done
      } else {
        hasMore = false;
      }
    }
    
    setParts(allParts);
    console.log(`Loaded ${allParts.length} parts total`);
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  // Get unique categories for filter
  const categories = [...new Set(parts.map(p => p.category).filter(Boolean))];

  // Filter parts based on search and category
  const filteredParts = parts.filter(part => {
    const matchesSearch = !searchTerm || 
      part.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description_fr?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Handle Excel file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    
    try {
      // Load SheetJS library dynamically
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            notify('Le fichier est vide', 'error');
            setUploading(false);
            return;
          }

          // OPTIMIZED BULK IMPORT
          const partsToUpsert = [];
          let skipped = 0;

          // Get all column names from first row and normalize them
          const originalColumns = Object.keys(jsonData[0]);
          console.log('=== EXCEL COLUMN DEBUG ===');
          console.log('Raw columns:', originalColumns);
          originalColumns.forEach((col, i) => {
            console.log(`Column ${i}: "${col}" (length: ${col.length}, chars: ${[...col].map(c => c.charCodeAt(0)).join(',')})`);
          });
          console.log('First row values:', jsonData[0]);

          // Create a normalized column map (strip all whitespace, lowercase, remove accents)
          const normalizeKey = (str) => {
            return str.toString()
              .toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
              .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric
          };

          const columnMap = {};
          originalColumns.forEach(col => {
            columnMap[normalizeKey(col)] = col;
          });
          console.log('Normalized column map:', columnMap);

          // Smart column finder - finds best match
          const findColumn = (row, ...searchTerms) => {
            // First: try direct match on original columns
            for (const term of searchTerms) {
              if (row[term] !== undefined && row[term] !== null && row[term] !== '') {
                return row[term];
              }
            }
            // Second: try normalized match
            for (const term of searchTerms) {
              const normalizedTerm = normalizeKey(term);
              const matchedOriginal = columnMap[normalizedTerm];
              if (matchedOriginal && row[matchedOriginal] !== undefined && row[matchedOriginal] !== null && row[matchedOriginal] !== '') {
                return row[matchedOriginal];
              }
            }
            // Third: try partial match (column contains search term)
            const rowKeys = Object.keys(row);
            for (const term of searchTerms) {
              const normalizedTerm = normalizeKey(term);
              for (const key of rowKeys) {
                if (normalizeKey(key).includes(normalizedTerm) || normalizedTerm.includes(normalizeKey(key))) {
                  if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                    return row[key];
                  }
                }
              }
            }
            return null;
          };

          // Parse each row
          for (const row of jsonData) {
            const partNumber = findColumn(row, 'Part Number', 'PartNumber', 'part_number', 'Ref', 'Reference', 'SKU', 'PN', 'Part No', 'Numéro', 'N° Pièce');
            const description = findColumn(row, 'Description', 'Desc', 'Name', 'Nom', 'Désignation', 'Designation', 'Libellé', 'Libelle', 'Label');
            const descriptionFr = findColumn(row, 'Description FR', 'description_fr', 'Nom FR');
            const category = findColumn(row, 'Category', 'Categorie', 'Catégorie', 'Type', 'Cat', 'Famille');
            const rawPrice = findColumn(row, 'Price', 'Prix', 'Unit Price', 'Prix Unitaire', 'Cost', 'Tarif', 'PU', 'Prix HT', 'Montant');
            const rawQuantity = findColumn(row, 'Quantity', 'Stock', 'Qty', 'QTY', 'Qté', 'Quantité');
            const location = findColumn(row, 'Location', 'Emplacement', 'Loc', 'Lieu');
            const supplier = findColumn(row, 'Supplier', 'Fournisseur', 'Vendor', 'Source');

            if (!partNumber) {
              skipped++;
              continue;
            }

            const price = parseFloat(rawPrice) || null;
            const quantity = parseInt(rawQuantity) || 0;

            partsToUpsert.push({
              part_number: partNumber.toString().trim(),
              description: description ? description.toString().trim() : null,
              description_fr: descriptionFr ? descriptionFr.toString().trim() : null,
              category: category ? category.toString().trim() : null,
              unit_price: price,
              quantity_in_stock: quantity,
              location: location ? location.toString().trim() : null,
              supplier: supplier ? supplier.toString().trim() : null,
              last_price_update: new Date().toISOString()
            });
          }

          // DEDUPLICATE - keep last occurrence of each part number (in case Excel has duplicates)
          const partsMap = new Map();
          for (const part of partsToUpsert) {
            partsMap.set(part.part_number, part); // Later entries overwrite earlier ones
          }
          const uniqueParts = Array.from(partsMap.values());
          const duplicatesRemoved = partsToUpsert.length - uniqueParts.length;
          
          console.log('=== DEDUPLICATION ===');
          console.log(`Original: ${partsToUpsert.length}, Unique: ${uniqueParts.length}, Duplicates removed: ${duplicatesRemoved}`);

          // Log sample
          if (uniqueParts.length > 0) {
            console.log('=== PARSED DATA SAMPLE ===');
            console.log('First part:', uniqueParts[0]);
            console.log('Second part:', uniqueParts[1]);
            const withDesc = uniqueParts.filter(p => p.description);
            console.log(`Parts with description: ${withDesc.length}/${uniqueParts.length}`);
          }

          if (uniqueParts.length === 0) {
            notify('Aucune pièce valide trouvée dans le fichier', 'error');
            setUploading(false);
            return;
          }
          
          // Replace partsToUpsert with deduplicated list
          const partsToImport = uniqueParts;

          // Step 2: Get ALL existing part numbers
          const { data: existingParts, error: fetchError } = await supabase
            .from('parts_pricing')
            .select('part_number');
          
          if (fetchError) {
            console.error('Error fetching existing parts:', fetchError);
          }
          
          const existingPartNumbers = new Set((existingParts || []).map(p => p.part_number));
          
          // Separate into inserts and updates
          const toInsert = partsToImport.filter(p => !existingPartNumbers.has(p.part_number));
          const toUpdate = partsToImport.filter(p => existingPartNumbers.has(p.part_number));

          console.log(`=== IMPORT PLAN ===`);
          console.log(`Total unique parts: ${partsToImport.length}`);
          console.log(`New (INSERT): ${toInsert.length}`);
          console.log(`Existing (UPDATE): ${toUpdate.length}`);
          console.log(`Skipped (no part number): ${skipped}`);
          console.log(`Duplicates in Excel: ${duplicatesRemoved}`);

          // Step 3: Process inserts in batches
          const batchSize = 200; // Smaller batches for reliability
          let insertErrors = 0;
          let updateErrors = 0;
          
          // INSERT new parts
          for (let i = 0; i < toInsert.length; i += batchSize) {
            const batch = toInsert.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(toInsert.length / batchSize);
            
            console.log(`INSERT batch ${batchNum}/${totalBatches} (${batch.length} parts)`);
            
            const { error } = await supabase
              .from('parts_pricing')
              .insert(batch);
            
            if (error) {
              console.error(`INSERT batch ${batchNum} error:`, error);
              insertErrors += batch.length;
            }
          }

          // UPDATE existing parts (one by one to avoid conflicts)
          let updateCount = 0;
          for (const part of toUpdate) {
            const { error } = await supabase
              .from('parts_pricing')
              .update({
                description: part.description,
                description_fr: part.description_fr,
                category: part.category,
                unit_price: part.unit_price,
                quantity_in_stock: part.quantity_in_stock,
                location: part.location,
                supplier: part.supplier,
                last_price_update: part.last_price_update
              })
              .eq('part_number', part.part_number);
            
            if (error) {
              updateErrors++;
              if (updateErrors <= 3) console.error(`UPDATE error for ${part.part_number}:`, error);
            } else {
              updateCount++;
            }
            
            // Progress log every 100
            if (updateCount % 100 === 0) {
              console.log(`Updated ${updateCount}/${toUpdate.length}...`);
            }
          }

          const totalErrors = insertErrors + updateErrors;
          const message = `Import terminé: ${toInsert.length - insertErrors} créés, ${toUpdate.length - updateErrors} mis à jour${skipped > 0 ? `, ${skipped} ignorés` : ''}${totalErrors > 0 ? `, ${totalErrors} erreurs` : ''}`;
          
          notify(message, totalErrors > 0 ? 'error' : 'success');
          loadParts();
          setShowUploadModal(false);
        } catch (err) {
          console.error('Parse error:', err);
          notify('Erreur lors de la lecture du fichier Excel', 'error');
        }
        setUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Upload error:', err);
      notify('Erreur lors du chargement du fichier', 'error');
      setUploading(false);
    }
  };

  // Save part (create or update)
  const savePart = async (partData) => {
    try {
      if (editingPart?.id) {
        // Update
        const { error } = await supabase
          .from('parts_pricing')
          .update({ ...partData, last_price_update: new Date().toISOString() })
          .eq('id', editingPart.id);
        
        if (error) throw error;
        notify('Pièce mise à jour');
      } else {
        // Create
        const { error } = await supabase
          .from('parts_pricing')
          .insert({ ...partData, last_price_update: new Date().toISOString() });
        
        if (error) throw error;
        notify('Pièce créée');
      }
      loadParts();
      setEditingPart(null);
      setShowAddModal(false);
    } catch (err) {
      console.error('Save error:', err);
      notify('Erreur lors de la sauvegarde', 'error');
    }
  };

  // Delete part
  const deletePart = async (id) => {
    if (!confirm('Supprimer cette pièce ?')) return;
    
    const { error } = await supabase.from('parts_pricing').delete().eq('id', id);
    if (error) {
      notify('Erreur lors de la suppression', 'error');
    } else {
      notify('Pièce supprimée');
      loadParts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tarifs & Pièces</h1>
          <p className="text-gray-500">{parts.length} pièces au catalogue</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2"
          >
            📤 Importer Excel
          </button>
          {isAdmin && (
            <button
              onClick={() => { setEditingPart(null); setShowAddModal(true); }}
              className="px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium flex items-center gap-2"
            >
              + Ajouter Pièce
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Rechercher par numéro de pièce ou description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
        >
          <option value="all">Toutes catégories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-gray-500">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Aucune pièce ne correspond à votre recherche' 
                : 'Aucune pièce au catalogue. Importez un fichier Excel pour commencer.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">N° Pièce</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Catégorie</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Prix Unit.</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Emplacement</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredParts.map(part => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-[#1a1a2e]">{part.part_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-800">{part.description || '-'}</p>
                      {part.description_fr && part.description_fr !== part.description && (
                        <p className="text-xs text-gray-500">{part.description_fr}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {part.category && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{part.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#00A651]">
                      {part.unit_price ? `${part.unit_price.toFixed(2)} €` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        part.quantity_in_stock === 0 ? 'bg-red-100 text-red-700' :
                        part.quantity_in_stock <= (part.reorder_level || 5) ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {part.quantity_in_stock || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{part.location || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => { setEditingPart(part); setShowAddModal(true); }}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => deletePart(part.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Importer un fichier Excel</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <p className="text-4xl mb-4">📁</p>
                <p className="text-gray-600 mb-4">
                  Glissez-déposez votre fichier Excel ici ou
                </p>
                <label className="cursor-pointer inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  Sélectionner un fichier
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-800 mb-2">Colonnes attendues :</p>
                <ul className="text-blue-700 text-xs space-y-1">
                  <li>• <strong>Part Number</strong> (obligatoire) - Numéro de pièce unique</li>
                  <li>• <strong>Description</strong> - Description en anglais</li>
                  <li>• <strong>Description FR</strong> - Description en français</li>
                  <li>• <strong>Category</strong> - Catégorie (ex: Filtres, Capteurs...)</li>
                  <li>• <strong>Price</strong> - Prix unitaire HT</li>
                  <li>• <strong>Quantity</strong> - Quantité en stock</li>
                  <li>• <strong>Location</strong> - Emplacement de stockage</li>
                  <li>• <strong>Supplier</strong> - Fournisseur</li>
                </ul>
              </div>

              {uploading && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-green-800 font-medium">Import en cours...</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    Traitement par lots de 500 pièces. Pour 3000 pièces, comptez environ 30 secondes à 2 minutes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <PartEditModal
          part={editingPart}
          onSave={savePart}
          onClose={() => { setShowAddModal(false); setEditingPart(null); }}
        />
      )}
    </div>
  );
}

// ============================================
// PART EDIT MODAL
// ============================================
function PartEditModal({ part, onSave, onClose }) {
  const [formData, setFormData] = useState({
    part_number: part?.part_number || '',
    description: part?.description || '',
    description_fr: part?.description_fr || '',
    category: part?.category || '',
    unit_price: part?.unit_price || '',
    quantity_in_stock: part?.quantity_in_stock || 0,
    reorder_level: part?.reorder_level || 5,
    location: part?.location || '',
    supplier: part?.supplier || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.part_number.trim()) {
      alert('Le numéro de pièce est obligatoire');
      return;
    }
    onSave({
      ...formData,
      unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
      quantity_in_stock: parseInt(formData.quantity_in_stock) || 0,
      reorder_level: parseInt(formData.reorder_level) || 5
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{part ? 'Modifier la pièce' : 'Ajouter une pièce'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Pièce *</label>
              <input
                type="text"
                value={formData.part_number}
                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
                required
                disabled={!!part}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
                placeholder="ex: Filtres, Capteurs, Pompes..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (EN)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (FR)</label>
            <input
              type="text"
              value={formData.description_fr}
              onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix Unitaire (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input
                type="number"
                value={formData.quantity_in_stock}
                onChange={(e) => setFormData({ ...formData, quantity_in_stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seuil réapprovisionnement</label>
              <input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
                placeholder="ex: Étagère A3, Tiroir 12..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg font-medium"
            >
              {part ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
