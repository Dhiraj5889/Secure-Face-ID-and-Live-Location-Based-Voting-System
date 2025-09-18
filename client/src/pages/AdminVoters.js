import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminVoters = () => {
  const { user, userType } = useAuth();
  const navigate = useNavigate();
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newVoter, setNewVoter] = useState({
    name: '',
    email: '',
    voterId: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    const isAdmin = (userType === 'admin') || user?.role === 'admin' || user?.role === 'super_admin';
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchVoters();
  }, [user, userType, navigate]);

  const fetchVoters = async () => {
    try {
      const response = await fetch('/api/voters', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVoters(Array.isArray(data) ? data : (data.voters || []));
      }
    } catch (error) {
      console.error('Error fetching voters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVoter = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/voters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newVoter)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setNewVoter({
          name: '',
          email: '',
          voterId: '',
          phone: '',
          address: ''
        });
        fetchVoters();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating voter:', error);
      alert('Error creating voter. Please try again.');
    }
  };

  const handleDeleteVoter = async (voterId) => {
    if (!window.confirm('Are you sure you want to delete this voter?')) {
      return;
    }

    try {
      const response = await fetch(`/api/voters/${voterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchVoters();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting voter:', error);
      alert('Error deleting voter. Please try again.');
    }
  };

  const handleVerifyVoter = async (voterId) => {
    try {
      const response = await fetch(`/api/voters/${voterId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchVoters();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error verifying voter:', error);
      alert('Error verifying voter. Please try again.');
    }
  };

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
          <div className="d-flex justify-content-between align-items-center">
            <h2>Manage Voters</h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Register New Voter
            </button>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="row mt-4">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h5>Register New Voter</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleCreateVoter}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Full Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newVoter.name}
                          onChange={(e) => setNewVoter({...newVoter, name: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={newVoter.email}
                          onChange={(e) => setNewVoter({...newVoter, email: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Voter ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newVoter.voterId}
                          onChange={(e) => setNewVoter({...newVoter, voterId: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={newVoter.phone}
                          onChange={(e) => setNewVoter({...newVoter, phone: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={newVoter.address}
                      onChange={(e) => setNewVoter({...newVoter, address: e.target.value})}
                      required
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">Register Voter</button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowCreateForm(false)}
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

      <div className="row mt-4">
        <div className="col-md-12">
          <div className="card">
            <div className="card-body">
              <h5>Registered Voters</h5>
              {voters.length === 0 ? (
                <div className="alert alert-info">
                  No voters registered yet.
                </div>
              ) : (
                <div className="table-responsive w-100" style={{overflowX: 'auto'}}>
                  <table className="table table-striped table-bordered table-hover align-middle" style={{tableLayout: 'auto', minWidth: '1100px'}}>
                    <thead className="text-center">
                      <tr>
                        <th style={{minWidth: '200px'}}>Name</th>
                        <th className="text-nowrap">Voter ID</th>
                        <th style={{minWidth: '160px'}}>Village</th>
                        <th style={{minWidth: '160px'}}>Taluka</th>
                        <th style={{minWidth: '160px'}}>District</th>
                        <th className="text-center text-nowrap" style={{minWidth: '140px'}}>DOB</th>
                        <th className="text-center text-nowrap" style={{minWidth: '160px'}}>Phone</th>
                        <th style={{minWidth: '180px'}}>Ward</th>
                        <th style={{minWidth: '180px'}}>Constituency</th>
                        <th>Status</th>
                        <th className="text-nowrap text-center" style={{minWidth: '200px'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-center">
                      {voters.map((voter) => {
                        const dob = voter.dob ? new Date(voter.dob) : null;
                        const dobStr = dob ? dob.toLocaleDateString() : '-';
                        const address = voter.address || {};
                        const village = address.village || '-';
                        const taluka = address.taluka || '-';
                        const district = address.district || '-';
                        const wardName = voter.wardId?.name || voter.ward?.name || voter.wardId?.wardName || voter.wardId || '-';
                        const constituencyName =
                          voter.constituencyId?.name ||
                          voter.wardId?.constituency?.name ||
                          voter.constituency?.name || '-';
                        return (
                          <tr key={voter._id}>
                            <td className="fw-semibold text-truncate" title={voter.name || '-'} style={{maxWidth: '260px'}}>{voter.name || '-'}</td>
                            <td className="text-nowrap">{voter.voterId || '-'}</td>
                            <td className="text-wrap" title={village} style={{whiteSpace: 'normal', wordBreak: 'break-word'}}>{village}</td>
                            <td className="text-wrap" title={taluka} style={{whiteSpace: 'normal', wordBreak: 'break-word'}}>{taluka}</td>
                            <td className="text-wrap" title={district} style={{whiteSpace: 'normal', wordBreak: 'break-word'}}>{district}</td>
                            <td className="text-center text-nowrap">{dobStr}</td>
                            <td className="text-center text-nowrap">{voter.phone || '-'}</td>
                            <td className="text-truncate" title={wardName} style={{maxWidth: '200px'}}>{wardName}</td>
                            <td className="text-truncate" title={constituencyName} style={{maxWidth: '200px'}}>{constituencyName}</td>
                            <td>
                              <span className={`badge ${
                                voter.isVerified ? 'bg-success' : 'bg-warning'
                              }`}>
                                {voter.isVerified ? 'Verified' : 'Pending'}
                              </span>
                            </td>
                            <td className="d-flex justify-content-center gap-2" style={{minWidth: '200px'}}>
                              {!voter.isVerified && (
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleVerifyVoter(voter.voterId)}
                                >
                                  Verify
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteVoter(voter.voterId)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
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

export default AdminVoters;
