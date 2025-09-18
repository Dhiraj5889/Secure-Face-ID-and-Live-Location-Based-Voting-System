import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    totalVoters: 0,
    totalVotes: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
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

    fetchStats();
  }, [user, fetchStats]); // Add fetchStats to dependencies

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
          <h2>Admin Dashboard</h2>
          <p className="text-muted">Welcome, {user?.name || user?.email}</p>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-3 mb-3">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <h5>Total Elections</h5>
              <h3>{stats.totalElections}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <h5>Active Elections</h5>
              <h3>{stats.activeElections}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <h5>Total Voters</h5>
              <h3>{stats.totalVoters}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-warning text-white">
            <div className="card-body text-center">
              <h5>Total Votes</h5>
              <h3>{stats.totalVotes}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-12">
          <h4>Quick Actions</h4>
          <div className="row">
            <div className="col-md-3 mb-3">
              <div className="card">
                <div className="card-body text-center">
                  <h5>Manage Elections</h5>
                  <p className="text-muted">Create and manage elections</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/admin/elections')}
                  >
                    Go to Elections
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card">
                <div className="card-body text-center">
                  <h5>Manage Voters</h5>
                  <p className="text-muted">Register and manage voters</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/admin/voters')}
                  >
                    Go to Voters
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card">
                <div className="card-body text-center">
                  <h5>Manage Candidates</h5>
                  <p className="text-muted">Add and manage candidates</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/admin/candidates')}
                  >
                    Go to Candidates
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card">
                <div className="card-body text-center">
                  <h5>View Profile</h5>
                  <p className="text-muted">Manage your profile</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/profile')}
                  >
                    Go to Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
