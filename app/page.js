'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { translations, statusColors } from '@/lib/translations';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('fr');
  const [notification, setNotification] = useState(null);
  const [page, setPage] = useState('home');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Data
  const [equipment, setEquipment] = useState([]);
  const [requests, setRequests] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [companies, setCompanies] = useState([]);

  const t = (key) => translations[lang][key] || key;
  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase.from('profiles').select('*, companies(*)').eq('id', session.user.id).single();
        setProfile(prof);
        if (prof?.preferred_language) setLang(prof.preferred_language);
        setPage('dashboard');
        await loadData(prof);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadData = async (prof) => {
    const companyId = prof?.company_id;
    const isStaff = prof?.role === 'admin' || prof?.role === 'technician';
    
    if (isStaff) {
      const [reqRes, compRes, eqRes] = await Promise.all([
        supabase.from('service_requests').select('*, companies(name)').order('created_at', { ascending: false }),
        supabase.from('companies').select('*').order('name'),
        supabase.from('equipment').select('*, companies(name)').order('serial_number'),
      ]);
      setRequests(reqRes.data || []);
      setCompanies(compRes.data || []);
      setEquipment(eqRes.data || []);
    } else if (companyId) {
      const [eqRes, reqRes, addrRes] = await Promise.all([
        supabase.from('equipment').select('*').eq('company_id', companyId),
        supabase.from('service_requests').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('shipping_addresses').select('*').eq('company_id', companyId),
      ]);
      setEquipment(eqRes.data || []);
      setRequests(reqRes.data || []);
      setAddresses(addrRes.data || []);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) { setLoginError(t('errorLogin')); }
    else {
      setUser(data.user);
      const { data: prof } = await supabase.from('profiles').select('*, companies(*)').eq('id', data.user.id).single();
      setProfile(prof);
      setPage('dashboard');
      await loadData(prof);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setPage('home');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lh-dark to-lh-blue"><div className="text-white text-xl">{t('loading')}</div></div>;
  }

  const isStaff = profile?.role === 'admin' || profile?.role === 'technician';
  const navItems = isStaff 
    ? [{ id: 'dashboard', icon: '📊', label: 'dashboard' }, { id: 'requests', icon: '📨', label: 'requests' }, { id: 'clients', icon: '👥', label: 'clients' }, { id: 'equipment', icon: '🔧', label: 'equipment' }]
    : [{ id: 'dashboard', icon: '📊', label: 'dashboard' }, { id: 'requests', icon: '📋', label: 'myRequests' }, { id: 'new-request', icon: '➕', label: 'newRequest' }, { id: 'equipment', icon: '🔧', label: 'myEquipment' }];

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{notification.msg}</div>}
      
      {/* Header */}
      <header className={user ? "bg-lh-dark text-white" : "bg-white shadow-sm"}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage(user ? 'dashboard' : 'home')}>
            <div className="text-2xl">🔬</div>
            <div><div className={`font-bold ${user ? 'text-white' : 'text-lh-dark'}`}>LIGHTHOUSE FRANCE</div>
            {user && <div className="text-xs text-lh-yellow">{isStaff ? 'Admin Portal' : 'Customer Portal'}</div>}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex rounded p-0.5 ${user ? 'bg-white/10' : 'bg-gray-100'}`}>
              <button onClick={() => setLang('fr')} className={`px-2 py-1 rounded text-sm ${lang === 'fr' ? (user ? 'bg-white text-lh-dark' : 'bg-white shadow-sm') : ''}`}>FR</button>
              <button onClick={() => setLang('en')} className={`px-2 py-1 rounded text-sm ${lang === 'en' ? (user ? 'bg-white text-lh-dark' : 'bg-white shadow-sm') : ''}`}>EN</button>
            </div>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-lh-yellow text-lh-dark flex items-center justify-center font-bold text-sm">{profile?.full_name?.charAt(0) || 'U'}</div>
                <span className="hidden md:inline text-sm">{profile?.full_name}</span>
                <button onClick={handleLogout} className="text-sm opacity-70 hover:opacity-100">{t('logout')}</button>
              </div>
            ) : (
              <button onClick={() => setPage('login')} className="btn btn-primary btn-sm">{t('login')}</button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation for logged in users */}
      {user && (
        <nav className="bg-lh-dark border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setPage(item.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap flex items-center gap-2 border-b-2 transition-colors ${page === item.id ? 'text-white border-lh-yellow bg-white/10' : 'text-white/70 border-transparent hover:text-white'}`}>
                <span>{item.icon}</span><span className="hidden sm:inline">{t(item.label)}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Public Home */}
        {!user && page === 'home' && (
          <div className="-mx-4 -mt-6">
            <section className="bg-gradient-to-br from-lh-dark to-lh-blue text-white py-20 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Equipment Service Portal</h1>
                <p className="text-xl opacity-90 mb-8">{lang === 'fr' ? 'Services professionnels de calibration et réparation' : 'Professional calibration and repair services'}</p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <button onClick={() => setPage('login')} className="btn btn-lg bg-white text-lh-dark hover:bg-gray-100">{t('login')}</button>
                  <button onClick={() => setPage('register')} className="btn btn-lg border-2 border-white text-white hover:bg-white/10">{t('register')}</button>
                </div>
              </div>
            </section>
            <section className="py-16 px-4">
              <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
                {[{ icon: '⚙️', title: lang === 'fr' ? 'Calibration' : 'Calibration' }, { icon: '🔧', title: lang === 'fr' ? 'Réparation' : 'Repair' }, { icon: '📋', title: lang === 'fr' ? 'Suivi en ligne' : 'Online Tracking' }].map((s, i) => (
                  <div key={i} className="card p-6 text-center"><div className="text-4xl mb-3">{s.icon}</div><h3 className="text-lg font-semibold">{s.title}</h3></div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Login */}
        {!user && page === 'login' && (
          <div className="max-w-md mx-auto mt-12">
            <div className="card p-8">
              <div className="text-center mb-6"><div className="text-5xl mb-2">🔬</div><h1 className="text-2xl font-bold text-lh-dark">Lighthouse France</h1></div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div><label className="label">{t('email')}</label><input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="input" required /></div>
                <div><label className="label">{t('password')}</label><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="input" required /></div>
                {loginError && <div className="text-red-500 text-sm">{loginError}</div>}
                <button type="submit" className="btn btn-primary w-full">{t('login')}</button>
              </form>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {user && page === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">{t('dashboard')} - {isStaff ? 'Admin' : profile?.companies?.name}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {isStaff ? (
                <>
                  <StatCard label={lang === 'fr' ? 'Nouvelles demandes' : 'New Requests'} value={requests.filter(r => r.status === 'submitted').length} color="border-red-500" icon="📨" />
                  <StatCard label={lang === 'fr' ? 'En attente' : 'Pending'} value={requests.filter(r => r.status === 'quoted').length} color="border-yellow-500" icon="⏳" />
                  <StatCard label={t('clients')} value={companies.length} color="border-blue-500" icon="👥" />
                  <StatCard label={t('equipment')} value={equipment.length} color="border-green-500" icon="🔧" />
                </>
              ) : (
                <>
                  <StatCard label={t('myEquipment')} value={equipment.length} color="border-blue-500" icon="🔧" />
                  <StatCard label={lang === 'fr' ? 'Demandes actives' : 'Active Requests'} value={requests.filter(r => !['delivered', 'rejected'].includes(r.status)).length} color="border-yellow-500" icon="📋" />
                  <StatCard label={lang === 'fr' ? 'En attente de devis' : 'Awaiting Quote'} value={requests.filter(r => r.status === 'submitted').length} color="border-purple-500" icon="⏳" />
                  <StatCard label={lang === 'fr' ? 'Complétés' : 'Completed'} value={requests.filter(r => r.status === 'delivered').length} color="border-green-500" icon="✅" />
                </>
              )}
            </div>
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50"><h2 className="font-semibold">{lang === 'fr' ? 'Demandes récentes' : 'Recent Requests'}</h2></div>
              <table className="w-full"><thead className="table-header"><tr><th className="table-cell">#</th><th className="table-cell">{isStaff ? t('company') : t('model')}</th><th className="table-cell">{t('serviceType')}</th><th className="table-cell">Status</th></tr></thead>
              <tbody className="divide-y">{requests.slice(0, 5).map(r => {
                const sc = statusColors[r.status] || statusColors.draft;
                return <tr key={r.id} className="hover:bg-gray-50"><td className="table-cell font-mono text-lh-blue font-semibold">{r.request_number || '-'}</td><td className="table-cell">{isStaff ? r.companies?.name : r.model_name}</td><td className="table-cell capitalize">{r.requested_service}</td><td className="table-cell"><span className={`badge ${sc.bg} ${sc.text}`}>{sc.icon} {r.status}</span></td></tr>;
              })}</tbody></table>
            </div>
          </div>
        )}

        {/* Requests List */}
        {user && page === 'requests' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">{isStaff ? t('requests') : t('myRequests')}</h1>
            {!isStaff && <button onClick={() => setPage('new-request')} className="btn btn-primary">➕ {t('newRequest')}</button>}</div>
            <div className="card overflow-hidden">
              <table className="w-full"><thead className="table-header"><tr><th className="table-cell">#</th>{isStaff && <th className="table-cell">{t('company')}</th>}<th className="table-cell">{t('serialNumber')}</th><th className="table-cell">{t('model')}</th><th className="table-cell">{t('serviceType')}</th><th className="table-cell">Status</th>{isStaff && <th className="table-cell">Actions</th>}</tr></thead>
              <tbody className="divide-y">{requests.map(r => {
                const sc = statusColors[r.status] || statusColors.draft;
                return <tr key={r.id} className="hover:bg-gray-50"><td className="table-cell font-mono text-lh-blue font-semibold">{r.request_number || '-'}</td>{isStaff && <td className="table-cell">{r.companies?.name}</td>}<td className="table-cell font-mono text-sm">{r.serial_number}</td><td className="table-cell">{r.model_name}</td><td className="table-cell capitalize">{r.requested_service}</td><td className="table-cell"><span className={`badge ${sc.bg} ${sc.text}`}>{sc.icon} {r.status}</span></td>{isStaff && <td className="table-cell">{r.status === 'submitted' && <button className="btn btn-sm btn-primary">{lang === 'fr' ? 'Créer Devis' : 'Create Quote'}</button>}</td>}</tr>;
              })}</tbody></table>
            </div>
          </div>
        )}

        {/* New Request Form (Customer only) */}
        {user && !isStaff && page === 'new-request' && (
          <NewRequestForm equipment={equipment} addresses={addresses} profile={profile} t={t} lang={lang} notify={notify} onSuccess={() => { loadData(profile); setPage('requests'); }} setPage={setPage} />
        )}

        {/* Equipment */}
        {user && page === 'equipment' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">{isStaff ? t('equipment') : t('myEquipment')}</h1>
            {!isStaff && <button onClick={() => notify('Add equipment modal coming soon!')} className="btn btn-primary">➕ {t('addEquipment')}</button>}</div>
            <div className="card overflow-hidden">
              <table className="w-full"><thead className="table-header"><tr><th className="table-cell">{t('serialNumber')}</th><th className="table-cell">{t('model')}</th><th className="table-cell">{t('type')}</th>{isStaff && <th className="table-cell">{t('company')}</th>}<th className="table-cell">{t('location')}</th></tr></thead>
              <tbody className="divide-y">{equipment.map(eq => (
                <tr key={eq.id} className="hover:bg-gray-50"><td className="table-cell font-mono font-semibold">{eq.serial_number}</td><td className="table-cell">{eq.model_name || '-'}</td><td className="table-cell"><span className={`badge ${eq.equipment_type === 'biocollector' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{eq.equipment_type === 'biocollector' ? 'Bio' : 'Counter'}</span></td>{isStaff && <td className="table-cell">{eq.companies?.name || '-'}</td>}<td className="table-cell text-gray-500">{eq.customer_location || '-'}</td></tr>
              ))}</tbody></table>
            </div>
          </div>
        )}

        {/* Clients (Admin only) */}
        {user && isStaff && page === 'clients' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">{t('clients')}</h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map(c => (
                <div key={c.id} className="card p-6 border-t-4 border-lh-blue">
                  <h3 className="font-bold text-lg mb-2">{c.name}</h3>
                  <p className="text-sm text-gray-600">📧 {c.email || '-'}</p>
                  <p className="text-sm text-gray-600">📞 {c.phone || '-'}</p>
                  <p className="text-sm text-gray-600">📍 {c.billing_postal_code} {c.billing_city}</p>
                  <div className="mt-3"><span className="badge bg-blue-100 text-blue-700">{equipment.filter(e => e.company_id === c.id).length} {lang === 'fr' ? 'appareils' : 'devices'}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-lh-dark text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>🔬 LIGHTHOUSE FRANCE</p>
          <p className="opacity-60">16 Rue Paul Séjourne, 94000 Créteil | France@golighthouse.com</p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return <div className={`card p-6 border-l-4 ${color}`}><div className="flex justify-between"><div><div className="text-3xl font-bold">{value}</div><div className="text-sm text-gray-500">{label}</div></div><div className="text-2xl">{icon}</div></div></div>;
}

function NewRequestForm({ equipment, addresses, profile, t, lang, notify, onSuccess, setPage }) {
  const [form, setForm] = useState({ equipment_id: '', requested_service: 'calibration', problem_description: '', urgency: 'normal', shipping_address_id: addresses[0]?.id || '' });
  const [submitting, setSubmitting] = useState(false);
  const selectedEq = equipment.find(e => e.id === form.equipment_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipment_id) { notify(lang === 'fr' ? 'Sélectionnez un équipement' : 'Select equipment', 'error'); return; }
    setSubmitting(true);
    const year = new Date().getFullYear();
    const { data: counter } = await supabase.from('system_settings').select('value').eq('key', 'request_counter').single();
    const num = counter?.value?.counter || 1;
    const requestNumber = `SR-${year}-${String(num).padStart(4, '0')}`;
    await supabase.from('system_settings').update({ value: { year, counter: num + 1 } }).eq('key', 'request_counter');
    const { error } = await supabase.from('service_requests').insert({
      request_number: requestNumber, company_id: profile.company_id, submitted_by: profile.id, equipment_id: form.equipment_id,
      serial_number: selectedEq?.serial_number, model_name: selectedEq?.model_name, equipment_type: selectedEq?.equipment_type,
      requested_service: form.requested_service, problem_description: form.problem_description, urgency: form.urgency,
      shipping_address_id: form.shipping_address_id, status: 'submitted', submitted_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) notify(error.message, 'error'); else { notify(t('requestSubmitted')); onSuccess(); }
  };

  if (equipment.length === 0) return <div className="card p-12 text-center"><div className="text-5xl mb-4">🔧</div><h2 className="text-xl font-semibold mb-2">{lang === 'fr' ? 'Aucun équipement' : 'No equipment'}</h2><p className="text-gray-500 mb-4">{lang === 'fr' ? 'Ajoutez d\'abord vos équipements' : 'Add your equipment first'}</p><button onClick={() => setPage('equipment')} className="btn btn-primary">{t('addEquipment')}</button></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('submitRequest')}</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div><label className="label">{t('selectEquipment')} *</label><select value={form.equipment_id} onChange={e => setForm({...form, equipment_id: e.target.value})} className="input" required><option value="">-- Select --</option>{equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.model_name} - {eq.serial_number}</option>)}</select></div>
        <div><label className="label">{t('serviceType')} *</label><select value={form.requested_service} onChange={e => setForm({...form, requested_service: e.target.value})} className="input"><option value="calibration">{t('calibration')}</option><option value="repair">{t('repair')}</option><option value="calibration_repair">{t('calibrationRepair')}</option><option value="diagnostic">{t('diagnostic')}</option></select></div>
        <div><label className="label">{t('problemDescription')}</label><textarea value={form.problem_description} onChange={e => setForm({...form, problem_description: e.target.value})} className="input min-h-[100px]" placeholder={lang === 'fr' ? 'Décrivez le problème...' : 'Describe the problem...'} /></div>
        <div><label className="label">{t('urgency')}</label><div className="flex gap-4">{['normal', 'urgent', 'critical'].map(u => <label key={u} className="flex items-center gap-2"><input type="radio" name="urgency" value={u} checked={form.urgency === u} onChange={e => setForm({...form, urgency: e.target.value})} /><span className={u === 'critical' ? 'text-red-600' : u === 'urgent' ? 'text-orange-600' : ''}>{t(u)}</span></label>)}</div></div>
        {addresses.length > 0 && <div><label className="label">{t('shippingAddress')}</label><select value={form.shipping_address_id} onChange={e => setForm({...form, shipping_address_id: e.target.value})} className="input">{addresses.map(a => <option key={a.id} value={a.id}>{a.label} - {a.city}</option>)}</select></div>}
        <div className="flex gap-3"><button type="button" onClick={() => setPage('dashboard')} className="btn btn-secondary flex-1">{t('cancel')}</button><button type="submit" disabled={submitting} className="btn btn-primary flex-1">{submitting ? t('loading') : t('submit')}</button></div>
      </form>
    </div>
  );
}
