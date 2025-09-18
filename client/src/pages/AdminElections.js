import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminElections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newElection, setNewElection] = useState({});

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user is admin - try different possible role properties
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

    fetchElections();
  }, [user, fetchElections]);

  const handleCreateElection = async (e) => {};

  const handleStatusChange = async (electionId, newStatus) => {
    try {
      const response = await fetch(`/api/admin/elections/${electionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchElections();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating election:', error);
      alert('Error updating election. Please try again.');
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
          <h2>Manage Elections</h2>
        </div>
      </div>

      {/* Create Election form removed per request */}

      <div className="row mt-4">
        <div className="col-md-12">
          <div className="card">
            <div className="card-body">
              <h5>All Elections</h5>
              {elections.length === 0 ? (
                <div className="alert alert-info">
                  No elections found.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {elections.map((election) => (
                        <tr key={election._id}>
                          <td>{election.title}</td>
                          <td>
                            <span className={`badge ${
                              election.status === 'active' ? 'bg-success' :
                              election.status === 'completed' ? 'bg-secondary' :
                              'bg-warning'
                            }`}>
                              {election.status}
                            </span>
                          </td>
                          <td>{new Date(election.startDate).toLocaleString()}</td>
                          <td>{new Date(election.endDate).toLocaleString()}</td>
                          <td>
                            <div className="btn-group" role="group">
                              {election.status === 'draft' && (
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleStatusChange(election._id, 'active')}
                                >
                                  Start
                                </button>
                              )}
                              {election.status === 'active' && (
                                <button
                                  className="btn btn-sm btn-warning"
                                  onClick={() => handleStatusChange(election._id, 'completed')}
                                >
                                  End
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => navigate(`/admin/candidates?electionId=${election._id}`)}
                              >
                                Manage Candidates
                              </button>
                            </div>
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

export default AdminElections;
