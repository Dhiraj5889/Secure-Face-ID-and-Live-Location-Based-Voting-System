import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminCandidates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const electionId = queryParams.get('electionId');

  const [candidates, setCandidates] = useState([]);
  const [parties, setParties] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCandidateForm, setShowCreateCandidateForm] = useState(false);
  const [showCreatePartyForm, setShowCreatePartyForm] = useState(false);
  const [selectedElection, setSelectedElection] = useState(electionId || '');
  
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    party: '',
    position: '',
    description: '',
    imageUrl: '',
    manifesto: ''
  });

  const [newParty, setNewParty] = useState({
    name: '',
    shortName: '',
    symbol: '',
    color: '#000000',
    description: '',
    foundedYear: ''
  });

  const fetchCandidates = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/candidates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched candidates data:', data);
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  }, []);

  const fetchParties = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/parties', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setParties(data.parties || []);
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  }, []);

  const fetchElections = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/elections', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setElections(data);
      }
    } catch (error) {
      console.error('Error fetching elections:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user is admin
    const isAdmin = user?.role === 'admin' || 
                   user?.role === 'super_admin' || 
                   user?.userType === 'admin' ||
                   user?.adminId !== undefined ||
                   user?.id?.startsWith('ADMIN') ||
                   user?.name === 'admin';

    if (!isAdmin) {
      navigate('/login');
      return;
    }

    fetchCandidates();
    fetchParties();
    fetchElections();
    setLoading(false);
  }, [user, fetchCandidates, fetchParties, fetchElections]);

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    
    if (!selectedElection) {
      alert('Please select an election first');
      return;
    }

    try {
      const partyValue = newCandidate.party === '__independent__' ? 'Independent' : newCandidate.party;
      const payload = { ...newCandidate, party: partyValue, electionId: selectedElection };
      console.log('Creating candidate with data:', payload);
      
      const response = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Candidate created successfully:', result);
        setShowCreateCandidateForm(false);
        setNewCandidate({
          name: '',
          party: '',
          position: '',
          description: '',
          imageUrl: '',
          manifesto: ''
        });
        // Force refresh candidates list
        setTimeout(() => {
          fetchCandidates();
        }, 500);
      } else {
        const error = await response.json();
        console.error('Server error response:', error);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating candidate:', error);
      alert('Error creating candidate. Please try again.');
    }
  };

  const handleCreateParty = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Creating party with data:', newParty);
      
      const response = await fetch('/api/admin/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newParty)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Party created successfully:', result);
        setShowCreatePartyForm(false);
        setNewParty({
          name: '',
          shortName: '',
          symbol: '',
          color: '#000000',
          description: '',
          foundedYear: ''
        });
        fetchParties();
      } else {
        const error = await response.json();
        console.error('Server error response:', error);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating party:', error);
      alert('Error creating party. Please try again.');
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchCandidates();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('Error deleting candidate. Please try again.');
    }
  };

  const handleDeleteParty = async (partyId) => {
    if (!window.confirm('Are you sure you want to delete this party?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/parties/${partyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchParties();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting party:', error);
      alert('Error deleting party. Please try again.');
    }
  };

  const filteredCandidates = selectedElection 
    ? candidates.filter(candidate => {
        const matches = candidate.electionId === selectedElection || candidate.electionId?._id === selectedElection;
        console.log('Candidate filter check:', {
          candidateId: candidate.candidateId,
          candidateElectionId: candidate.electionId,
          selectedElection,
          matches
        });
        return matches;
      })
    : candidates;

  if (loading) {
    return (
      <div className="container">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Manage Candidates & Parties</h2>
            <div>
              <button 
                className="btn btn-primary me-2"
                onClick={() => setShowCreateCandidateForm(true)}
              >
                Add Candidate
              </button>
              <button 
                className="btn btn-success"
                onClick={() => setShowCreatePartyForm(true)}
              >
                Add Party
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Election Selection */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5>Select Election</h5>
              <select 
                className="form-select"
                value={selectedElection}
                onChange={(e) => setSelectedElection(e.target.value)}
              >
                <option value="">All Elections</option>
                {elections.map((election) => (
                  <option key={election._id} value={election._id}>
                    {election.title} ({election.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Create Candidate Form */}
      {showCreateCandidateForm && (
        <div className="row mb-4">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h5>Add New Candidate</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleCreateCandidate}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newCandidate.name}
                          onChange={(e) => setNewCandidate({...newCandidate, name: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Party</label>
                        <select
                          className="form-select"
                          value={newCandidate.party}
                          onChange={(e) => setNewCandidate({...newCandidate, party: e.target.value})}
                          required
                        >
                          <option value="">Select Party</option>
                          <option value="__independent__">Independent (No Party)</option>
                          {parties.map((party) => (
                            <option key={party._id} value={party.name}>
                              {party.name} ({party.shortName})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Position</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newCandidate.position}
                          onChange={(e) => setNewCandidate({...newCandidate, position: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Image URL</label>
                        <input
                          type="url"
                          className="form-control"
                          value={newCandidate.imageUrl}
                          onChange={(e) => setNewCandidate({...newCandidate, imageUrl: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={newCandidate.description}
                      onChange={(e) => setNewCandidate({...newCandidate, description: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Manifesto</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={newCandidate.manifesto}
                      onChange={(e) => setNewCandidate({...newCandidate, manifesto: e.target.value})}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">Add Candidate</button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowCreateCandidateForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Party Form */}
      {showCreatePartyForm && (
        <div className="row mb-4">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h5>Add New Party</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleCreateParty}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Party Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newParty.name}
                          onChange={(e) => setNewParty({...newParty, name: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Short Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newParty.shortName}
                          onChange={(e) => setNewParty({...newParty, shortName: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Symbol</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newParty.symbol}
                          onChange={(e) => setNewParty({...newParty, symbol: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Color</label>
                        <input
                          type="color"
                          className="form-control"
                          value={newParty.color}
                          onChange={(e) => setNewParty({...newParty, color: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Founded Year</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newParty.foundedYear}
                      onChange={(e) => setNewParty({...newParty, foundedYear: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={newParty.description}
                      onChange={(e) => setNewParty({...newParty, description: e.target.value})}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-success">Add Party</button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowCreatePartyForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidates Table */}
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5>Candidates {selectedElection && `- ${elections.find(e => e._id === selectedElection)?.title}`}</h5>
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={() => fetchCandidates()}
              >
                Refresh
              </button>
            </div>
                          <div className="card-body">
                {/* Debug Info */}
                <div className="alert alert-info mb-3">
                  <strong>Debug Info:</strong><br/>
                  Total Candidates: {candidates.length}<br/>
                  Selected Election: {selectedElection}<br/>
                  Filtered Candidates: {filteredCandidates.length}<br/>
                  Elections Available: {elections.length}
                </div>
                
                {filteredCandidates.length === 0 ? (
                  <div className="alert alert-info">
                    No candidates found.
                  </div>
                ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Party</th>
                        <th>Position</th>
                        <th>Election</th>
                        <th>Vote Count</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((candidate) => (
                        <tr key={candidate._id}>
                          <td>
                            <div className="d-flex align-items-center">
                              {candidate.imageUrl && (
                                <div className="rounded-circle me-2 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', overflow: 'hidden' }}>
                                  <img 
                                    src={candidate.imageUrl} 
                                    alt={candidate.name}
                                    style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                                  />
                                </div>
                              )}
                              <div>
                                <strong>{candidate.name}</strong>
                                {candidate.description && (
                                  <div className="text-muted small">{candidate.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {candidate.party ? (
                              <span className="badge bg-primary">{candidate.party}</span>
                            ) : (
                              <span className="badge bg-secondary">Independent</span>
                            )}
                          </td>
                          <td>{candidate.position}</td>
                          <td>{elections.find(e => e._id === candidate.electionId)?.title}</td>
                          <td>{candidate.voteCount || 0}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteCandidate(candidate.candidateId)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Parties Table */}
      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <h5>Political Parties</h5>
            </div>
            <div className="card-body">
              {parties.length === 0 ? (
                <div className="alert alert-info">
                  No parties found.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Short Name</th>
                        <th>Symbol</th>
                        <th>Founded</th>
                        <th>Candidates</th>
                        <th>Total Votes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parties.map((party) => (
                        <tr key={party._id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div 
                                className="rounded-circle me-2"
                                style={{ 
                                  width: '20px', 
                                  height: '20px', 
                                  backgroundColor: party.color 
                                }}
                              ></div>
                              <strong>{party.name}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{party.shortName}</span>
                          </td>
                          <td>{party.symbol}</td>
                          <td>{party.foundedYear}</td>
                          <td>{party.totalCandidates}</td>
                          <td>{party.totalVotes}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteParty(party.partyId)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCandidates;
