import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';

const Section = ({ id, title, children, actions }) => (
  <div id={id} className="card" style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 className="text-h3" style={{ margin: 0 }}>{title}</h3>
      <div>{actions}</div>
    </div>
    {children}
  </div>
);

const AdminGeo = () => {
  const [constituencies, setConstituencies] = useState([]);
  const [villages, setVillages] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdElection, setCreatedElection] = useState(null);

  const fetchConstituencies = async () => {
    const res = await axios.get('/api/admin/geo/constituencies');
    setConstituencies(res.data.constituencies || []);
  };
  const fetchVillages = async (constituencyId) => {
    const res = await axios.get('/api/admin/geo/villages', { params: { constituencyId } });
    setVillages(res.data.villages || []);
  };
  const fetchWards = async (villageId) => {
    const res = await axios.get('/api/admin/geo/wards', { params: { villageId } });
    setWards(res.data.wards || []);
  };

  useEffect(() => { fetchConstituencies(); }, []);
  useEffect(() => { if (selectedConstituency) fetchVillages(selectedConstituency); else setVillages([]); setSelectedVillage(''); setWards([]); }, [selectedConstituency]);
  useEffect(() => { if (selectedVillage) fetchWards(selectedVillage); else setWards([]); }, [selectedVillage]);

  const handleCreateConstituency = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const constituencyId = form.constituencyId.value.trim();
    const name = form.name.value.trim();
    const code = form.code.value.trim();
    const state = form.state.value.trim();
    if (!constituencyId || !name) return;
    setLoading(true);
    try {
      await axios.post('/api/admin/geo/constituencies', { constituencyId, name, code, state });
      await fetchConstituencies();
      form.reset();
    } finally { setLoading(false); }
  };

  const handleCreateVillage = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const villageId = form.villageId.value.trim();
    const name = form.villageName.value.trim();
    const constituencyId = selectedConstituency;
    if (!villageId || !name || !constituencyId) return;
    setLoading(true);
    try {
      await axios.post('/api/admin/geo/villages', { villageId, name, constituencyId });
      await fetchVillages(selectedConstituency);
      form.reset();
    } finally { setLoading(false); }
  };

  const handleCreateWard = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const wardId = form.wardId.value.trim();
    const name = form.wardName.value.trim();
    const villageId = selectedVillage;
    if (!wardId || !name || !villageId) return;
    setLoading(true);
    try {
      await axios.post('/api/admin/geo/wards', { wardId, name, villageId });
      await fetchWards(selectedVillage);
      form.reset();
    } finally { setLoading(false); }
  };

  const handleAssignWard = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const voterId = form.voterId.value.trim();
    const wardId = form.assignWardId.value.trim();
    if (!voterId || !wardId) return;
    setLoading(true);
    try {
      await axios.post('/api/admin/geo/assign-ward', { voterId, wardId });
      form.reset();
    } finally { setLoading(false); }
  };

  const villageOptions = useMemo(() => villages.map(v => ({ id: v._id || v.villageId, name: v.name })), [villages]);
  const wardOptions = useMemo(() => wards.map(w => ({ id: w._id || w.wardId, name: w.name })), [wards]);

  return (
    <DashboardLayout title="Admin: Constituencies, Villages, Wards" subtitle="Manage geography and assign voters to wards">
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <a href="#section-constituencies" className="btn btn-outline">Constituencies</a>
          <a href="#section-villages" className="btn btn-outline">Villages</a>
          <a href="#section-wards" className="btn btn-outline">Wards</a>
          <a href="#section-assign" className="btn btn-outline">Assign Voter</a>
          <a href="#section-ward-election" className="btn btn-outline">Create Ward Election</a>
        </div>
      </div>

      <Section id="section-constituencies" title="Constituencies" actions={null}>
        <form onSubmit={handleCreateConstituency} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          <input name="constituencyId" placeholder="Constituency ID" className="form-input" />
          <input name="name" placeholder="Name" className="form-input" />
          <input name="code" placeholder="Code" className="form-input" />
          <input name="state" placeholder="State" className="form-input" />
          <button className="btn btn-primary" disabled={loading} style={{ gridColumn: 'span 4' }}>Create Constituency</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th>ID</th><th>Name</th><th>Code</th><th>State</th></tr></thead>
            <tbody>
              {constituencies.map(c => (
                <tr key={c._id}><td>{c.constituencyId}</td><td>{c.name}</td><td>{c.code}</td><td>{c.state}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="section-villages" title="Villages" actions={null}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <select value={selectedConstituency} onChange={e => setSelectedConstituency(e.target.value)} className="form-input">
            <option value="">Select Constituency</option>
            {constituencies.map(c => (<option key={c._id} value={c._id}>{c.name}</option>))}
          </select>
        </div>
        <form onSubmit={handleCreateVillage} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <input name="villageId" placeholder="Village ID" className="form-input" />
          <input name="villageName" placeholder="Name" className="form-input" />
          <button className="btn btn-primary" disabled={loading}>Create Village</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full"><thead><tr><th>ID</th><th>Name</th></tr></thead>
            <tbody>{villages.map(v => (<tr key={v._id}><td>{v.villageId}</td><td>{v.name}</td></tr>))}</tbody>
          </table>
        </div>
      </Section>

      <Section id="section-wards" title="Wards" actions={null}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <select value={selectedVillage} onChange={e => setSelectedVillage(e.target.value)} className="form-input">
            <option value="">Select Village</option>
            {villageOptions.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
          </select>
        </div>
        <form onSubmit={handleCreateWard} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <input name="wardId" placeholder="Ward ID" className="form-input" />
          <input name="wardName" placeholder="Name" className="form-input" />
          <button className="btn btn-primary" disabled={loading}>Create Ward</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full"><thead><tr><th>ID</th><th>Name</th></tr></thead>
            <tbody>{wardOptions.map(w => (<tr key={w.id}><td>{w.id}</td><td>{w.name}</td></tr>))}</tbody>
          </table>
        </div>
      </Section>

      <Section id="section-assign" title="Assign Ward to Voter" actions={null}>
        <form onSubmit={handleAssignWard} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <input name="voterId" placeholder="Voter ID" className="form-input" />
          <input name="assignWardId" placeholder="Ward ID or _id" className="form-input" />
          <button className="btn btn-primary" disabled={loading}>Assign</button>
        </form>
      </Section>

      <Section id="section-ward-election" title="Create Ward-level Election" actions={null}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const wardId = form.electionWardId.value.trim();
            const title = form.electionTitle.value.trim();
            const description = form.electionDescription.value.trim();
            const startDate = form.electionStart.value;
            const endDate = form.electionEnd.value;
            const positionsRaw = form.electionPositions.value.trim();
            const positions = positionsRaw ? positionsRaw.split(',').map(p => p.trim()).filter(Boolean) : [];
            if (!wardId || !title || !startDate || !endDate) return;
            setLoading(true);
            try {
            const res = await axios.post('/api/admin/geo/ward-elections', { wardId, title, description, startDate, endDate, positions });
            setCreatedElection({ id: res.data?.election?._id || null, title, wardId });
              form.reset();
            } finally { setLoading(false); }
          }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
        >
          <select name="electionWardId" className="form-input">
            <option value="">Select Ward</option>
            {wardOptions.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
          </select>
          <input name="electionTitle" placeholder="Election Title" className="form-input" />
          <input name="electionDescription" placeholder="Description (optional)" className="form-input" />
          <input type="text" name="electionPositions" placeholder="Positions (comma-separated)" className="form-input" />
          <input type="datetime-local" name="electionStart" className="form-input" />
          <input type="datetime-local" name="electionEnd" className="form-input" />
          <button className="btn btn-primary" disabled={loading} style={{ gridColumn: 'span 2' }}>Create Election</button>
        </form>
      </Section>

      {createdElection && (
        <div className="card animate-fadeInUp" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h4 className="text-h4" style={{ margin: 0 }}>Election Created</h4>
              <p className="eci-muted" style={{ margin: 0 }}>“{createdElection.title}” has been created for the selected ward.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/admin/elections" className="btn btn-primary">Add Party</Link>
              <Link to="/admin/candidates" className="btn btn-outline">Add Candidates</Link>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminGeo;


