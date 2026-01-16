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
    console.log('Loading data...');
    
    // Simplified query - removed shipping_addresses join that was causing 400 error
    const { data: reqs, error: reqErr } = await supabase.from('service_requests')
      .select('*, companies(id, name, billing_city), request_devices(*)')
      .order('created_at', { ascending: false });
    console.log('Requests:', reqs, 'Error:', reqErr);
    if (reqs) setRequests(reqs);

    const { data: companies, error: compErr } = await supabase.from('companies')
      .select('*, profiles(id, full_name, email, phone, role), shipping_addresses(*)')
      .order('name', { ascending: true });
    console.log('Companies:', companies, 'Error:', compErr);
    if (companies) setClients(companies);

    const { data: equip, error: equipErr } = await supabase.from('equipment').select('*, companies(name)').order('created_at', { ascending: false });
    console.log('Equipment:', equip, 'Error:', equipErr);
    if (equip) setEquipment(equip);

    const { data: staff, error: staffErr } = await supabase.from('profiles').select('*').in('role', ['lh_admin', 'lh_employee']).order('full_name');
    console.log('Staff:', staff, 'Error:', staffErr);
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
        {activeSheet === 'requests' && <RequestsSheet requests={requests} notify={notify} reload={loadData} />}
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
  const activeRMAs = requests.filter(r => r.request_number && !['completed', 'cancelled'].includes(r.status));
  const needsReview = requests.filter(r => r.status === 'bc_review' || (r.bc_signature_url && r.status === 'waiting_bc'));
  const byStatus = {
    waiting: activeRMAs.filter(r => ['approved', 'waiting_bc', 'waiting_device'].includes(r.status)),
    received: activeRMAs.filter(r => ['received', 'in_queue'].includes(r.status)),
    inProgress: activeRMAs.filter(r => ['calibration_in_progress', 'repair_in_progress', 'quote_sent'].includes(r.status)),
    ready: activeRMAs.filter(r => ['final_qc', 'ready_to_ship'].includes(r.status)),
    shipped: activeRMAs.filter(r => r.status === 'shipped')
  };
  const stats = [
    { label: 'RMAs Actifs', value: activeRMAs.length, color: 'bg-blue-500', icon: '📋' },
    { label: 'À vérifier', value: needsReview.length, color: 'bg-red-500', icon: '⚠️' },
    { label: 'En attente', value: byStatus.waiting.length, color: 'bg-amber-500', icon: '⏳' },
    { label: 'Reçus', value: byStatus.received.length, color: 'bg-cyan-500', icon: '📦' },
    { label: 'En cours', value: byStatus.inProgress.length, color: 'bg-indigo-500', icon: '🔧' },
    { label: 'Prêts', value: byStatus.ready.length, color: 'bg-green-500', icon: '✅' }
  ];

  const approveBC = async (rma) => {
    const { error } = await supabase.from('service_requests').update({ status: 'waiting_device', bc_approved_at: new Date().toISOString() }).eq('id', rma.id);
    if (error) notify('Erreur: ' + error.message, 'error'); else { notify('BC approuvé!'); reload(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord</h1>
        <button onClick={reload} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">🔄 Actualiser</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white rounded-xl p-4 shadow-sm ${stat.value > 0 && stat.label === 'À vérifier' ? 'ring-2 ring-red-500' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl text-white`}>{stat.icon}</div>
              <div><p className="text-2xl font-bold text-gray-800">{stat.value}</p><p className="text-sm text-gray-500">{stat.label}</p></div>
            </div>
          </div>
        ))}
      </div>
      {needsReview.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl">
          <div className="px-6 py-4 border-b border-red-200 bg-red-100"><h2 className="font-bold text-red-800">⚠️ Documents à vérifier ({needsReview.length})</h2></div>
          <div className="p-4 space-y-3">
            {needsReview.map(rma => (
              <div key={rma.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-[#00A651]">{rma.request_number}</span>
                  <div><p className="font-medium">{rma.companies?.name}</p><p className="text-sm text-gray-500">BC reçu le {new Date(rma.updated_at).toLocaleDateString('fr-FR')}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  {rma.bc_signature_url && <a href={rma.bc_signature_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">📄 Voir BC</a>}
                  <button onClick={() => approveBC(rma)} className="px-4 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">✓ Approuver</button>
                  <button onClick={() => setSelectedRMA(rma)} className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200">Détails</button>
                </div>
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
                return (
                  <tr key={rma.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="font-mono font-bold text-[#00A651]">{rma.request_number}</span></td>
                    <td className="px-4 py-3"><p className="font-medium text-gray-800">{rma.companies?.name || '—'}</p><p className="text-xs text-gray-400">{rma.profiles?.email}</p></td>
                    <td className="px-4 py-3">
                      {devices.length > 0 ? <div className="text-sm">{devices.slice(0, 2).map((d, i) => <p key={i}>{d.model_name} <span className="text-gray-400">({d.serial_number})</span></p>)}{devices.length > 2 && <p className="text-gray-400">+{devices.length - 2} autres</p>}</div> : <span className="text-gray-400">{rma.serial_number || '—'}</span>}
                    </td>
                    <td className="px-4 py-3"><span className="text-sm">{rma.requested_service === 'calibration' ? '🔬 Étalonnage' : rma.requested_service === 'repair' ? '🔧 Réparation' : rma.requested_service}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(rma.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3"><button onClick={() => setSelectedRMA(rma)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Voir →</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {selectedRMA && <RMADetailModal rma={selectedRMA} onClose={() => setSelectedRMA(null)} notify={notify} reload={reload} />}
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
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Client</h3><p className="font-medium">{rma.companies?.name}</p><p className="text-sm text-gray-500">{rma.profiles?.full_name}</p><p className="text-sm text-gray-500">{rma.profiles?.email}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Service</h3><p className="font-medium">{rma.requested_service === 'calibration' ? '🔬 Étalonnage' : rma.requested_service === 'repair' ? '🔧 Réparation' : rma.requested_service}</p><p className="text-sm text-gray-500">Créé le {new Date(rma.created_at).toLocaleDateString('fr-FR')}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Documents</h3>{rma.bc_signature_url ? <a href={rma.bc_signature_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">📄 Voir le BC signé</a> : <p className="text-sm text-gray-400">Aucun BC</p>}</div>
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

function RequestsSheet({ requests, notify, reload }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState('pending');
  const pendingRequests = requests.filter(r => r.status === 'submitted' && !r.request_number);
  const displayRequests = filter === 'pending' ? pendingRequests : requests;

  const generateRMANumber = async () => {
    const { data } = await supabase.from('service_requests').select('request_number').like('request_number', 'FR-%').order('request_number', { ascending: false }).limit(1);
    if (data && data.length > 0) { const lastNum = parseInt(data[0].request_number.replace('FR-', '')) || 0; return 'FR-' + String(lastNum + 1).padStart(5, '0'); }
    return 'FR-00001';
  };

  const approveRequest = async (request) => {
    const rmaNumber = await generateRMANumber();
    const { error } = await supabase.from('service_requests').update({ request_number: rmaNumber, status: 'approved', approved_at: new Date().toISOString() }).eq('id', request.id);
    if (error) notify('Erreur: ' + error.message, 'error'); else { notify('RMA ' + rmaNumber + ' créé!'); reload(); setSelectedRequest(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Demandes</h1>
        <div className="flex gap-2">
          <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-200'}`}>En attente ({pendingRequests.length})</button>
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}>Toutes ({requests.length})</button>
        </div>
      </div>
      {pendingRequests.length > 0 && filter === 'pending' && <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg"><p className="font-medium text-amber-800">⚠️ {pendingRequests.length} demande(s) en attente d'approbation</p></div>}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">ID / RMA</th><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Client</th><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Type</th><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Appareils</th><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Soumis</th><th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {displayRequests.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{filter === 'pending' ? 'Aucune demande en attente' : 'Aucune demande'}</td></tr> : displayRequests.map(req => {
              const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
              const devices = req.request_devices || [];
              const isPending = req.status === 'submitted' && !req.request_number;
              return (
                <tr key={req.id} className={`hover:bg-gray-50 ${isPending ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-4 py-3">{req.request_number ? <span className="font-mono font-bold text-[#00A651]">{req.request_number}</span> : <span className="text-amber-600 font-medium">Nouvelle</span>}</td>
                  <td className="px-4 py-3"><p className="font-medium text-gray-800">{req.companies?.name || '—'}</p><p className="text-xs text-gray-400">{req.profiles?.full_name}</p></td>
                  <td className="px-4 py-3"><span className="text-sm">{req.request_type === 'service' ? '🔧 Service' : '📦 Pièces'}</span></td>
                  <td className="px-4 py-3"><span className="text-sm text-gray-600">{devices.length > 0 ? devices.length + ' appareil(s)' : '1 appareil'}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3"><div className="flex gap-2">{isPending && <button onClick={() => approveRequest(req)} className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded">✓ Approuver</button>}<button onClick={() => setSelectedRequest(req)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Voir</button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedRequest && <RequestDetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} onApprove={() => approveRequest(selectedRequest)} />}
    </div>
  );
}

function RequestDetailModal({ request, onClose, onApprove }) {
  const style = STATUS_STYLES[request.status] || STATUS_STYLES.submitted;
  const devices = request.request_devices || [];
  const isPending = request.status === 'submitted' && !request.request_number;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b sticky top-0 bg-white flex justify-between items-center"><div><h2 className="text-xl font-bold text-gray-800">{request.request_number || 'Nouvelle Demande'}</h2><p className="text-sm text-gray-500">{request.companies?.name}</p></div><span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>{style.label}</span></div>
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Client</h3><p className="font-medium">{request.companies?.name}</p><p className="text-sm text-gray-500">{request.profiles?.full_name}</p><p className="text-sm text-gray-500">{request.profiles?.email}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-700 mb-2">Service</h3><p className="font-medium">{request.requested_service === 'calibration' ? '🔬 Étalonnage' : request.requested_service === 'repair' ? '🔧 Réparation' : request.requested_service}</p><p className="text-sm text-gray-500">Soumis le {new Date(request.created_at).toLocaleDateString('fr-FR')}</p></div>
          </div>
          <div><h3 className="font-bold text-gray-700 mb-3">Appareils ({devices.length || 1})</h3>{devices.length > 0 ? <div className="space-y-2">{devices.map((d, i) => <div key={i} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center"><div><p className="font-medium">{d.model_name}</p><p className="text-sm text-gray-500">SN: {d.serial_number}</p></div><span className="text-sm text-gray-400">{d.equipment_type}</span></div>)}</div> : <div className="bg-gray-50 rounded-lg p-3"><p className="font-medium">{request.serial_number}</p></div>}</div>
          {request.problem_description && <div><h3 className="font-bold text-gray-700 mb-2">Notes du client</h3><div className="bg-gray-50 rounded-lg p-4"><p className="text-sm whitespace-pre-wrap">{request.problem_description}</p></div></div>}
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between"><button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Fermer</button>{isPending && <button onClick={onApprove} className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium">✓ Approuver et créer RMA</button>}</div>
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
