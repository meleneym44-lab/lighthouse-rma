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
    { id: 'pricing', label: 'Tarifs & Pièces', icon: '💰' },
    { id: 'contracts', label: 'Contrats', icon: '📄' },
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
        {activeSheet === 'dashboard' && <DashboardSheet requests={requests} notify={notify} reload={loadData} isAdmin={isAdmin} />}
        {activeSheet === 'requests' && <RequestsSheet requests={requests} notify={notify} reload={loadData} profile={profile} />}
        {activeSheet === 'clients' && <ClientsSheet clients={clients} requests={requests} equipment={equipment} notify={notify} reload={loadData} isAdmin={isAdmin} />}
        {activeSheet === 'pricing' && <PricingSheet notify={notify} isAdmin={isAdmin} />}
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

function DashboardSheet({ requests, notify, reload, isAdmin }) {
  const [selectedRMA, setSelectedRMA] = useState(null);
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
              <div key={rma.id} onClick={() => setSelectedRMA(rma)} className="bg-white rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 border border-slate-200">
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

function RMADetailModal({ rma, onClose, notify, reload }) {
  const [saving, setSaving] = useState(false);
  const [internalNotes, setInternalNotes] = useState(rma.internal_notes || '');
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
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

  const archiveRMA = async () => {
    setSaving(true);
    const { error } = await supabase.from('service_requests').update({ 
      status: 'archived', 
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    }).eq('id', rma.id);
    if (error) notify('Erreur: ' + error.message, 'error'); 
    else { notify('📦 RMA archivé!'); reload(); onClose(); }
    setSaving(false);
  };

  const unarchiveRMA = async () => {
    setSaving(true);
    const { error } = await supabase.from('service_requests').update({ 
      status: 'completed', // Set back to completed when unarchiving
      archived_at: null,
      updated_at: new Date().toISOString() 
    }).eq('id', rma.id);
    if (error) notify('Erreur: ' + error.message, 'error'); 
    else { notify('RMA restauré!'); reload(); }
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
              {rma.signed_quote_url && <a href={rma.signed_quote_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">📝 Devis Signé</a>}
              {rma.quote_url && <a href={rma.quote_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">💰 Devis</a>}
              {!rma.bc_file_url && !rma.bc_signature_url && !rma.quote_url && !rma.signed_quote_url && <p className="text-sm text-gray-400">Aucun document</p>}
            </div>
          </div>
          
          {/* Per-Device Status Management */}
          <div>
            <h3 className="font-bold text-gray-700 mb-3">Appareils ({devices.length || 1}) - Statut par appareil</h3>
            {devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map((d, i) => {
                  const deviceStatus = d.status || rma.status;
                  const deviceStyle = STATUS_STYLES[deviceStatus] || STATUS_STYLES.submitted;
                  return (
                    <div key={d.id || i} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-800">{d.model_name}</p>
                          <p className="text-sm text-gray-500">SN: {d.serial_number}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {d.service_type === 'calibration' ? '🔬 Étalonnage' : 
                             d.service_type === 'repair' ? '🔧 Réparation' : 
                             d.service_type === 'calibration_repair' || d.service_type === 'cal_repair' ? '🔬+🔧' : d.service_type}
                          </p>
                          {d.notes && <p className="text-sm text-gray-400 mt-1 italic">{d.notes}</p>}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${deviceStyle.bg} ${deviceStyle.text}`}>
                          {deviceStyle.label}
                        </span>
                      </div>
                      {rma.status !== 'archived' && (
                        <div className="flex flex-wrap gap-1">
                          {['received', 'in_queue', 'calibration_in_progress', 'repair_in_progress', 'final_qc', 'ready_to_ship', 'shipped', 'completed'].map(key => {
                            const val = STATUS_STYLES[key];
                            if (!val) return null;
                            return (
                              <button 
                                key={key} 
                                onClick={async () => {
                                  setSaving(true);
                                  const { error } = await supabase.from('request_devices').update({ status: key, status_updated_at: new Date().toISOString() }).eq('id', d.id);
                                  if (error) notify('Erreur: ' + error.message, 'error'); 
                                  else { notify(`Appareil mis à jour: ${val.label}`); reload(); }
                                  setSaving(false);
                                }} 
                                disabled={saving || key === deviceStatus} 
                                className={`px-2 py-1 rounded text-xs font-medium ${val.bg} ${val.text} ${key === deviceStatus ? 'ring-2 ring-offset-1 ring-gray-400' : 'hover:opacity-80'} disabled:opacity-50`}
                              >
                                {val.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3"><p className="font-medium">{rma.serial_number}</p></div>
            )}
          </div>
          
          {rma.problem_description && <div><h3 className="font-bold text-gray-700 mb-2">Notes du client</h3><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm whitespace-pre-wrap">{rma.problem_description}</p></div></div>}
          <div><h3 className="font-bold text-gray-700 mb-2">Notes internes</h3><textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Ajouter des notes internes..." className="w-full px-4 py-3 border border-gray-300 rounded-lg h-24 resize-none" /><button onClick={saveNotes} disabled={saving} className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">{saving ? 'Enregistrement...' : 'Enregistrer les notes'}</button></div>
          
          {rma.status !== 'archived' && (
            <div><h3 className="font-bold text-gray-700 mb-2">Statut global RMA</h3><p className="text-xs text-gray-500 mb-2">Change le statut de tous les appareils en même temps</p><div className="flex flex-wrap gap-2">{workflowStatuses.map(key => { const val = STATUS_STYLES[key]; if (!val) return null; return <button key={key} onClick={() => updateStatus(key)} disabled={saving || key === rma.status} className={`px-3 py-1.5 rounded text-sm font-medium ${val.bg} ${val.text} ${key === rma.status ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:opacity-80'} disabled:opacity-50`}>{val.label}</button>; })}</div></div>
          )}
          
          {/* Archive/Unarchive Section */}
          <div className="border-t pt-4">
            <h3 className="font-bold text-gray-700 mb-2">Actions</h3>
            {rma.status === 'archived' ? (
              <button onClick={unarchiveRMA} disabled={saving} className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium">
                📤 Restaurer ce RMA
              </button>
            ) : (
              <>
                {!showArchiveConfirm ? (
                  <button onClick={() => setShowArchiveConfirm(true)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                    📦 Archiver ce RMA
                  </button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 font-medium mb-2">⚠️ Confirmer l'archivage ?</p>
                    <p className="text-sm text-amber-700 mb-3">Ce RMA sera masqué de la vue principale mais restera accessible dans les archives.</p>
                    <div className="flex gap-2">
                      <button onClick={archiveRMA} disabled={saving} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">
                        {saving ? 'Archivage...' : 'Oui, archiver'}
                      </button>
                      <button onClick={() => setShowArchiveConfirm(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
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

  const devices = request?.request_devices || [];
  const signatory = profile?.full_name || 'Lighthouse France';
  const today = new Date();
  
  // Check if client is in France Metropolitan for shipping
  // Check company billing postal code - this should be the main address
  const clientPostalCode = request?.companies?.billing_postal_code || 
                           request?.companies?.postal_code || 
                           '';
  const isMetro = clientPostalCode ? isFranceMetropolitan(clientPostalCode) : true; // Default to France if no postal code
  const defaultShipping = isMetro ? 45 : 0;

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
        
        return {
          id: d.id || `device-${i}`,
          model: d.model_name || '',
          serial: d.serial_number || '',
          deviceType: deviceType,
          serviceType: serviceType,
          needsCalibration: needsCal,
          needsRepair: needsRepair,
          customerNotes: d.notes || d.problem_description || '',
          calibrationPrice: needsCal ? calTemplate.defaultPrice : 0,
          repairPrice: needsRepair ? REPAIR_TEMPLATE.defaultPrice : 0,
          additionalParts: [], // For extra parts/labor
          shipping: defaultShipping
        };
      }));
    }
  }, []);

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

  // Send quote
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
        serviceTotal: getDeviceServiceTotal(d)
      })),
      requiredSections,
      servicesSubtotal,
      shippingTotal,
      grandTotal,
      isMetro,
      createdBy: signatory,
      createdAt: new Date().toISOString()
    };

    const { error } = await supabase.from('service_requests').update({
      request_number: rmaNumber,
      status: 'quote_sent',
      quoted_at: new Date().toISOString(),
      quote_total: grandTotal,
      quote_subtotal: servicesSubtotal,
      quote_shipping: shippingTotal,
      quote_data: quoteData,
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
                {step === 1 && 'Créer le Devis'}
                {step === 2 && 'Aperçu du Devis'}
                {step === 3 && 'Confirmer l\'envoi'}
              </h2>
              <p className="text-gray-400">{request.companies?.name} • {devicePricing.length} appareil(s)</p>
            </div>
            <div className="flex gap-1">
              {[1,2,3].map(s => (
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
          
          {/* ==================== STEP 1: PRICING EDITOR ==================== */}
          {step === 1 && (
            <div className="flex h-full">
              {/* LEFT SIDE - Customer Info & Devices */}
              <div className="flex-1 p-6 overflow-y-auto">
                
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
                      <div key={device.id} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
                        {/* Device Header */}
                        <div className="bg-[#1a1a2e] text-white px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-2 py-1 rounded text-sm font-bold">#{index + 1}</span>
                            <div>
                              <p className="font-bold">{device.model || 'Appareil'}</p>
                              <p className="text-sm text-gray-300">SN: {device.serial} • {getDeviceTypeLabel(device.deviceType)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {device.needsCalibration && <span className="bg-blue-500 px-2 py-1 rounded text-xs">🔬 Cal</span>}
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

                        {/* Pricing Inputs */}
                        <div className="p-4 space-y-3">
                          {device.needsCalibration && (
                            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                              <div>
                                <span className="font-medium text-blue-800">Main d'œuvre étalonnage</span>
                                <span className="text-xs text-blue-600 ml-2">({calTemplate.icon} {getDeviceTypeLabel(device.deviceType)})</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={device.calibrationPrice}
                                  onChange={e => updateDevice(device.id, 'calibrationPrice', parseFloat(e.target.value) || 0)}
                                  className="w-24 px-3 py-2 border rounded-lg text-right font-medium"
                                />
                                <span className="text-gray-500 font-medium">€</span>
                              </div>
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
                          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg border-t mt-3">
                            <span className="font-medium text-gray-700">
                              {isMetro ? 'Frais de port' : 'Transport (géré par client)'}
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={device.shipping}
                                onChange={e => updateDevice(device.id, 'shipping', parseFloat(e.target.value) || 0)}
                                className="w-20 px-3 py-2 border rounded-lg text-right"
                              />
                              <span className="text-gray-500">€</span>
                            </div>
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
                    <div key={device.id} className="bg-white rounded-lg p-3 border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{device.model}</p>
                          <p className="text-xs text-gray-500">SN: {device.serial}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#00A651]">{(getDeviceServiceTotal(device) + device.shipping).toFixed(2)} €</p>
                          <p className="text-xs text-gray-400">dont port: {device.shipping}€</p>
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
                        
                        const rows = [
                          <tr key={`${device.id}-main`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                            <td className="px-4 py-3 font-medium">{device.model}</td>
                            <td className="px-4 py-3 font-mono text-xs">{device.serial}</td>
                            <td className="px-4 py-3">{services.join(' + ')}</td>
                            <td className="px-4 py-3 text-right font-medium">{deviceTotal.toFixed(2)} €</td>
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
                          <tr key={`${device.id}-shipping`} className="bg-gray-200 text-gray-600">
                            <td className="px-4 py-2 pl-8 text-sm" colSpan={3}>↳ Frais de port</td>
                            <td className="px-4 py-2 text-right text-sm">{device.shipping.toFixed(2)} €</td>
                          </tr>
                        );
                        
                        return rows;
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300">
                        <td className="px-4 py-3 font-medium" colSpan={3}>Sous-total services</td>
                        <td className="px-4 py-3 text-right font-medium">{servicesSubtotal.toFixed(2)} €</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium" colSpan={3}>Total frais de port</td>
                        <td className="px-4 py-3 text-right font-medium">{shippingTotal.toFixed(2)} €</td>
                      </tr>
                      <tr className="bg-[#00A651] text-white">
                        <td className="px-4 py-4 font-bold text-lg" colSpan={3}>TOTAL HT</td>
                        <td className="px-4 py-4 text-right font-bold text-2xl">{grandTotal.toFixed(2)} €</td>
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
                <div className="w-24 h-24 bg-[#00A651] rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-5xl text-white">📧</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Confirmer l'envoi du devis</h3>
                <p className="text-gray-600 mb-6">Le devis sera envoyé au client et disponible sur son portail.</p>
                
                <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
                  <p className="text-lg font-bold text-gray-800 mb-1">{request.companies?.name}</p>
                  <p className="text-sm text-gray-500 mb-4">{devicePricing.length} appareil(s)</p>
                  
                  <div className="space-y-2 text-sm border-t pt-3">
                    {devicePricing.map(d => (
                      <div key={d.id} className="flex justify-between">
                        <span>{d.model} <span className="text-gray-400">({d.serial})</span></span>
                        <span className="font-medium">{(getDeviceServiceTotal(d) + d.shipping).toFixed(2)} €</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                      <span>Total HT</span>
                      <span className="text-[#00A651]">{grandTotal.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-left">
                  <p className="font-medium mb-2">Après envoi :</p>
                  <p className="mb-1">✓ Un numéro RMA sera attribué automatiquement</p>
                  <p className="mb-1">✓ Le client recevra une notification</p>
                  <p>✓ Le devis sera disponible sur son portail</p>
                </div>
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
            {step < 3 && (
              <button onClick={() => setStep(step + 1)} className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">
                Suivant →
              </button>
            )}
            {step === 3 && (
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
    const { data, error } = await supabase
      .from('parts_pricing')
      .select('*')
      .order('part_number', { ascending: true });
    
    if (error) {
      console.error('Error loading parts:', error);
      notify('Erreur de chargement des pièces', 'error');
    } else {
      setParts(data || []);
    }
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

          // Process each row
          let created = 0;
          let updated = 0;
          let errors = 0;

          for (const row of jsonData) {
            // Map Excel columns to database fields (flexible column naming)
            const partNumber = row['Part Number'] || row['part_number'] || row['PartNumber'] || row['Ref'] || row['Reference'] || row['SKU'];
            const description = row['Description'] || row['description'] || row['Name'] || row['Nom'];
            const descriptionFr = row['Description FR'] || row['description_fr'] || row['Nom FR'] || row['Description Francais'];
            const category = row['Category'] || row['category'] || row['Categorie'] || row['Type'];
            const price = parseFloat(row['Price'] || row['price'] || row['Unit Price'] || row['Prix'] || row['Prix Unitaire'] || 0);
            const quantity = parseInt(row['Quantity'] || row['quantity'] || row['Stock'] || row['Qty'] || 0);
            const location = row['Location'] || row['location'] || row['Emplacement'];
            const supplier = row['Supplier'] || row['supplier'] || row['Fournisseur'];

            if (!partNumber) {
              errors++;
              continue;
            }

            // Check if part exists
            const { data: existing } = await supabase
              .from('parts_pricing')
              .select('id')
              .eq('part_number', partNumber.toString().trim())
              .single();

            const partData = {
              part_number: partNumber.toString().trim(),
              description: description || null,
              description_fr: descriptionFr || null,
              category: category || null,
              unit_price: isNaN(price) ? null : price,
              quantity_in_stock: isNaN(quantity) ? 0 : quantity,
              location: location || null,
              supplier: supplier || null,
              last_price_update: new Date().toISOString()
            };

            if (existing) {
              // Update existing part
              const { error } = await supabase
                .from('parts_pricing')
                .update(partData)
                .eq('id', existing.id);
              
              if (error) {
                console.error('Update error:', error);
                errors++;
              } else {
                updated++;
              }
            } else {
              // Create new part
              const { error } = await supabase
                .from('parts_pricing')
                .insert(partData);
              
              if (error) {
                console.error('Insert error:', error);
                errors++;
              } else {
                created++;
              }
            }
          }

          notify(`Import terminé: ${created} créés, ${updated} mis à jour${errors > 0 ? `, ${errors} erreurs` : ''}`, errors > 0 ? 'error' : 'success');
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
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-600">Import en cours...</span>
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
