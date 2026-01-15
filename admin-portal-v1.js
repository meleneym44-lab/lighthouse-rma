'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================
// STATUS STYLES
// ============================================
const STATUS_STYLES = {
  submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Nouvelle demande' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'RMA Créé' },
  waiting_bc: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attente BC' },
  waiting_po: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attente BC' },
  waiting_device: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Attente Appareil' },
  received: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Reçu' },
  in_queue: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'File d\'attente' },
  calibration_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Étalonnage' },
  repair_in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Réparation' },
  inspection_complete: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Inspection terminée' },
  quote_sent: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Devis envoyé' },
  quote_approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Devis approuvé' },
  repair_declined: { bg: 'bg-red-100', text: 'text-red-700', label: 'Réparation refusée' },
  final_qc: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Contrôle final' },
  ready_to_ship: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Prêt à expédier' },
  shipped: { bg: 'bg-green-100', text: 'text-green-700', label: 'Expédié' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Terminé' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' }
};

// ============================================
// MAIN ADMIN PORTAL
// ============================================
export default function AdminPortal() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState('dashboard');
  const [toast, setToast] = useState(null);

  // Data
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);

  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Check auth and load data
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: p } = await supabase
          .from('profiles')
          .select('*, companies(*)')
          .eq('id', session.user.id)
          .single();
        
        if (p) {
          // Check if user is Lighthouse staff
          if (p.role !== 'lh_admin' && p.role !== 'lh_employee') {
            // Not authorized - redirect to customer portal
            window.location.href = '/';
            return;
          }
          setProfile(p);
          await loadData();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const loadData = async () => {
    // Load all requests
    const { data: reqs } = await supabase
      .from('service_requests')
      .select(`
        *,
        companies(name),
        profiles(full_name, email),
        request_devices(*),
        shipping_addresses(*)
      `)
      .order('created_at', { ascending: false });
    
    if (reqs) setRequests(reqs);

    // Load all clients (companies)
    const { data: companies } = await supabase
      .from('companies')
      .select(`
        *,
        profiles(id, full_name, email, role),
        service_requests(id, status)
      `)
      .order('name', { ascending: true });
    
    if (companies) setClients(companies);

    // Load staff members
    const { data: staff } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['lh_admin', 'lh_employee'])
      .order('full_name', { ascending: true });
    
    if (staff) setStaffMembers(staff);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // Check permissions for sheets
  const hasAccess = (sheet) => {
    if (profile?.role === 'lh_admin') return true; // Admin has access to everything
    
    // For employees, check their permissions (stored in profile or separate table)
    const permissions = profile?.sheet_permissions || ['dashboard', 'requests'];
    return permissions.includes(sheet);
  };

  // Available sheets based on role
  const sheets = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: '📊', requiresAdmin: false },
    { id: 'requests', label: 'Demandes', icon: '📋', requiresAdmin: false },
    { id: 'clients', label: 'Clients', icon: '👥', requiresAdmin: false },
    { id: 'contracts', label: 'Contrats', icon: '📄', requiresAdmin: false },
    { id: 'settings', label: 'Paramètres', icon: '⚙️', requiresAdmin: false },
    { id: 'admin', label: 'Admin', icon: '🔐', requiresAdmin: true }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-[#1a1a2e] text-white shadow-lg">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-[#00A651]">LIGHTHOUSE</div>
              <div className="text-sm text-gray-400">France • Admin Portal</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{profile?.full_name}</p>
                <p className="text-xs text-gray-400">
                  {profile?.role === 'lh_admin' ? '👑 Administrateur' : '👤 Employé'}
                </p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-[#1a1a2e] border-t border-gray-700">
        <div className="max-w-full mx-auto px-6">
          <div className="flex gap-1">
            {sheets.map(sheet => {
              if (sheet.requiresAdmin && profile?.role !== 'lh_admin') return null;
              if (!hasAccess(sheet.id)) return null;
              
              return (
                <button
                  key={sheet.id}
                  onClick={() => setActiveSheet(sheet.id)}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                    activeSheet === sheet.id
                      ? 'bg-[#00A651] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <span>{sheet.icon}</span>
                  {sheet.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-full mx-auto p-6">
        {activeSheet === 'dashboard' && (
          <DashboardSheet 
            requests={requests} 
            notify={notify}
            reload={loadData}
          />
        )}
        {activeSheet === 'requests' && (
          <RequestsSheet 
            requests={requests} 
            notify={notify}
            reload={loadData}
          />
        )}
        {activeSheet === 'clients' && (
          <ClientsSheet 
            clients={clients}
            requests={requests}
            notify={notify}
            reload={loadData}
          />
        )}
        {activeSheet === 'contracts' && (
          <ContractsSheet 
            clients={clients}
            notify={notify}
          />
        )}
        {activeSheet === 'settings' && (
          <SettingsSheet 
            profile={profile}
            staffMembers={staffMembers}
            notify={notify}
            reload={loadData}
          />
        )}
        {activeSheet === 'admin' && profile?.role === 'lh_admin' && (
          <AdminSheet 
            profile={profile}
            staffMembers={staffMembers}
            notify={notify}
            reload={loadData}
          />
        )}
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

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check if user is Lighthouse staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

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

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#00A651] text-white rounded-lg font-bold hover:bg-[#008f45] disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Accès réservé au personnel Lighthouse France
        </p>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD SHEET - Live RMA Overview
// ============================================
function DashboardSheet({ requests, notify, reload }) {
  // Filter active RMAs (approved and in progress)
  const activeRMAs = requests.filter(r => 
    r.request_number && !['submitted', 'completed', 'cancelled'].includes(r.status)
  );

  // Group by status
  const byStatus = {
    waiting: activeRMAs.filter(r => ['approved', 'waiting_bc', 'waiting_po', 'waiting_device'].includes(r.status)),
    received: activeRMAs.filter(r => ['received', 'in_queue'].includes(r.status)),
    inProgress: activeRMAs.filter(r => ['calibration_in_progress', 'repair_in_progress', 'inspection_complete', 'quote_sent'].includes(r.status)),
    ready: activeRMAs.filter(r => ['final_qc', 'ready_to_ship'].includes(r.status)),
    shipped: activeRMAs.filter(r => r.status === 'shipped')
  };

  // Stats
  const stats = [
    { label: 'RMAs Actifs', value: activeRMAs.length, color: 'bg-blue-500', icon: '📋' },
    { label: 'En attente', value: byStatus.waiting.length, color: 'bg-amber-500', icon: '⏳' },
    { label: 'Reçus', value: byStatus.received.length, color: 'bg-cyan-500', icon: '📦' },
    { label: 'En cours', value: byStatus.inProgress.length, color: 'bg-indigo-500', icon: '🔧' },
    { label: 'Prêts', value: byStatus.ready.length, color: 'bg-green-500', icon: '✅' },
    { label: 'Expédiés (7j)', value: byStatus.shipped.length, color: 'bg-gray-500', icon: '🚚' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord</h1>
        <button
          onClick={reload}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl text-white`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active RMAs Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">RMAs Actifs</h2>
        </div>
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
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Aucun RMA actif
                  </td>
                </tr>
              ) : (
                activeRMAs.map(rma => {
                  const style = STATUS_STYLES[rma.status] || STATUS_STYLES.submitted;
                  const devices = rma.request_devices || [];
                  
                  return (
                    <tr key={rma.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-[#00A651]">{rma.request_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{rma.companies?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{rma.profiles?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {devices.length > 0 ? (
                          <div className="text-sm">
                            {devices.slice(0, 2).map((d, i) => (
                              <p key={i}>{d.model_name} <span className="text-gray-400">({d.serial_number})</span></p>
                            ))}
                            {devices.length > 2 && (
                              <p className="text-gray-400">+{devices.length - 2} autres</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">{rma.serial_number || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {rma.requested_service === 'calibration' ? '🔬 Étalonnage' :
                           rma.requested_service === 'repair' ? '🔧 Réparation' :
                           rma.requested_service}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(rma.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
                          Voir →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================
// REQUESTS SHEET - Incoming Requests
// ============================================
function RequestsSheet({ requests, notify, reload }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState('pending'); // pending, all

  // Filter requests
  const pendingRequests = requests.filter(r => r.status === 'submitted' && !r.request_number);
  const allRequests = requests;

  const displayRequests = filter === 'pending' ? pendingRequests : allRequests;

  // Generate next RMA number
  const generateRMANumber = async () => {
    const { data } = await supabase
      .from('service_requests')
      .select('request_number')
      .like('request_number', 'FR-%')
      .order('request_number', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].request_number.replace('FR-', '')) || 0;
      return `FR-${String(lastNum + 1).padStart(5, '0')}`;
    }
    return 'FR-00001';
  };

  // Approve request and assign RMA number
  const approveRequest = async (request) => {
    const rmaNumber = await generateRMANumber();
    
    const { error } = await supabase
      .from('service_requests')
      .update({
        request_number: rmaNumber,
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', request.id);

    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify(`RMA ${rmaNumber} créé!`);
      reload();
      setSelectedRequest(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Demandes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-200'
            }`}
          >
            En attente ({pendingRequests.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200'
            }`}
          >
            Toutes ({allRequests.length})
          </button>
        </div>
      </div>

      {/* Pending Requests Alert */}
      {pendingRequests.length > 0 && filter === 'pending' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <p className="font-medium text-amber-800">
            ⚠️ {pendingRequests.length} demande(s) en attente d'approbation
          </p>
        </div>
      )}

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="overflow-x-auto">
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
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {filter === 'pending' ? 'Aucune demande en attente' : 'Aucune demande'}
                  </td>
                </tr>
              ) : (
                displayRequests.map(req => {
                  const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
                  const devices = req.request_devices || [];
                  const isPending = req.status === 'submitted' && !req.request_number;
                  
                  return (
                    <tr key={req.id} className={`hover:bg-gray-50 ${isPending ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        {req.request_number ? (
                          <span className="font-mono font-bold text-[#00A651]">{req.request_number}</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Nouvelle</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{req.companies?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{req.profiles?.full_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {req.request_type === 'service' ? '🔧 Service' : '📦 Pièces'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {devices.length > 0 ? `${devices.length} appareil(s)` : '1 appareil'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(req.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {isPending && (
                            <button 
                              onClick={() => approveRequest(req)}
                              className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
                            >
                              ✓ Approuver
                            </button>
                          )}
                          <button 
                            onClick={() => setSelectedRequest(req)}
                            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            Voir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal 
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={() => approveRequest(selectedRequest)}
          notify={notify}
          reload={reload}
        />
      )}
    </div>
  );
}

// ============================================
// REQUEST DETAIL MODAL
// ============================================
function RequestDetailModal({ request, onClose, onApprove, notify, reload }) {
  const [status, setStatus] = useState(request.status);
  const [saving, setSaving] = useState(false);

  const style = STATUS_STYLES[request.status] || STATUS_STYLES.submitted;
  const devices = request.request_devices || [];
  const isPending = request.status === 'submitted' && !request.request_number;

  const updateStatus = async (newStatus) => {
    setSaving(true);
    const { error } = await supabase
      .from('service_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', request.id);

    if (error) {
      notify(`Erreur: ${error.message}`, 'error');
    } else {
      notify('Statut mis à jour!');
      reload();
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b sticky top-0 bg-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {request.request_number || 'Nouvelle Demande'}
            </h2>
            <p className="text-sm text-gray-500">{request.companies?.name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
            {style.label}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Client Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 mb-2">Client</h3>
              <p className="font-medium">{request.companies?.name}</p>
              <p className="text-sm text-gray-500">{request.profiles?.full_name}</p>
              <p className="text-sm text-gray-500">{request.profiles?.email}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 mb-2">Service</h3>
              <p className="font-medium">
                {request.requested_service === 'calibration' ? '🔬 Étalonnage' :
                 request.requested_service === 'repair' ? '🔧 Réparation' :
                 request.requested_service}
              </p>
              <p className="text-sm text-gray-500">
                Soumis le {new Date(request.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
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
                    </div>
                    <span className="text-sm text-gray-400">{d.equipment_type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium">{request.serial_number}</p>
                <p className="text-sm text-gray-500">{request.equipment_type}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {request.problem_description && (
            <div>
              <h3 className="font-bold text-gray-700 mb-2">Notes du client</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{request.problem_description}</p>
              </div>
            </div>
          )}

          {/* Status Update */}
          {!isPending && (
            <div>
              <h3 className="font-bold text-gray-700 mb-2">Mettre à jour le statut</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_STYLES).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => updateStatus(key)}
                    disabled={saving || key === request.status}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${val.bg} ${val.text} ${
                      key === request.status ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:opacity-80'
                    } disabled:opacity-50`}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            Fermer
          </button>
          {isPending && (
            <button
              onClick={onApprove}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
            >
              ✓ Approuver et créer RMA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// CLIENTS SHEET
// ============================================
function ClientsSheet({ clients, requests, notify, reload }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.profiles?.some(p => p.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg w-64"
        />
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Entreprise</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">RMAs</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map(client => {
                const clientRequests = client.service_requests || [];
                const activeCount = clientRequests.filter(r => !['completed', 'cancelled', 'shipped'].includes(r.status)).length;
                const mainContact = client.profiles?.find(p => p.role === 'admin') || client.profiles?.[0];
                
                return (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{client.name}</p>
                      <p className="text-xs text-gray-400">{client.billing_city}</p>
                    </td>
                    <td className="px-4 py-3">
                      {mainContact ? (
                        <div>
                          <p className="text-sm">{mainContact.full_name}</p>
                          <p className="text-xs text-gray-400">{mainContact.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        {clientRequests.length} total
                        {activeCount > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {activeCount} actif(s)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        Actif
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => setSelectedClient(client)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Voir →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          requests={requests.filter(r => r.company_id === selectedClient.id)}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}

// ============================================
// CLIENT DETAIL MODAL
// ============================================
function ClientDetailModal({ client, requests, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">{client.name}</h2>
          <p className="text-sm text-gray-500">{client.billing_address}, {client.billing_city}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 mb-2">Informations</h3>
              <p><span className="text-gray-500">SIRET:</span> {client.siret || '—'}</p>
              <p><span className="text-gray-500">TVA:</span> {client.vat_number || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 mb-2">Contacts</h3>
              {client.profiles?.map(p => (
                <div key={p.id} className="mb-2">
                  <p className="font-medium">{p.full_name}</p>
                  <p className="text-sm text-gray-500">{p.email}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Request History */}
          <div>
            <h3 className="font-bold text-gray-700 mb-3">Historique des demandes ({requests.length})</h3>
            <div className="space-y-2">
              {requests.map(req => {
                const style = STATUS_STYLES[req.status] || STATUS_STYLES.submitted;
                return (
                  <div key={req.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="font-mono font-medium">{req.request_number || 'En attente'}</p>
                      <p className="text-sm text-gray-500">{req.requested_service}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(req.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CONTRACTS SHEET
// ============================================
function ContractsSheet({ clients, notify }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Contrats de Calibration</h1>
      
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
        <p className="text-4xl mb-4">📄</p>
        <p className="font-medium">Module Contrats</p>
        <p className="text-sm">Gestion des contrats de calibration à venir</p>
      </div>
    </div>
  );
}

// ============================================
// SETTINGS SHEET
// ============================================
function SettingsSheet({ profile, staffMembers, notify, reload }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Paramètres</h1>
      
      {/* Staff Members */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">Équipe Lighthouse</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {staffMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00A651] text-white flex items-center justify-center font-bold">
                    {member.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  member.role === 'lh_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {member.role === 'lh_admin' ? '👑 Admin' : '👤 Employé'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ADMIN SHEET (Restricted)
// ============================================
function AdminSheet({ profile, staffMembers, notify, reload }) {
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🔐 Administration</h1>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pricing Module */}
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-3xl mb-3">💰</div>
          <h3 className="font-bold text-gray-800">Tarification</h3>
          <p className="text-sm text-gray-500">Gérer les prix des services</p>
        </div>

        {/* Permissions */}
        <div 
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setShowPermissions(true)}
        >
          <div className="text-3xl mb-3">🔑</div>
          <h3 className="font-bold text-gray-800">Permissions</h3>
          <p className="text-sm text-gray-500">Gérer les accès des employés</p>
        </div>

        {/* System */}
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-3xl mb-3">⚙️</div>
          <h3 className="font-bold text-gray-800">Système</h3>
          <p className="text-sm text-gray-500">Configuration avancée</p>
        </div>
      </div>

      {/* Permissions Modal */}
      {showPermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPermissions(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Gestion des Permissions</h2>
            </div>
            <div className="p-6 space-y-4">
              {staffMembers.filter(m => m.role === 'lh_employee').map(member => (
                <div key={member.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['dashboard', 'requests', 'clients', 'contracts', 'settings'].map(sheet => (
                      <label key={sheet} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" defaultChecked={sheet === 'dashboard' || sheet === 'requests'} />
                        <span className="text-sm capitalize">{sheet}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {staffMembers.filter(m => m.role === 'lh_employee').length === 0 && (
                <p className="text-center text-gray-400 py-4">Aucun employé à configurer</p>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setShowPermissions(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
                Fermer
              </button>
              <button className="px-4 py-2 bg-[#00A651] text-white rounded-lg">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
