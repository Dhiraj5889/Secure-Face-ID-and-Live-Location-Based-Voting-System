import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import DashboardLayout from '../components/DashboardLayout';
import Chart from '../components/Chart';

const Dashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchElections = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/elections');
        const list = Array.isArray(res.data?.elections) ? res.data.elections : (Array.isArray(res.data) ? res.data : []);

        const now = new Date();
        const normalized = list.map(e => {
          const start = new Date(e.startDate || e.start_time || e.start);
          const end = new Date(e.endDate || e.end_time || e.end);
          let status = e.status;
          if (!status) {
            if (isFinite(start) && isFinite(end)) {
              if (now < start) status = 'upcoming';
              else if (now > end) status = 'completed';
              else status = 'active';
            } else {
              status = 'upcoming';
            }
          }
          return {
            _id: e._id || e.id || e.electionId,
            title: e.title || e.name || 'Election',
            description: e.description || '',
            status,
            startDate: e.startDate || e.start_time || e.start || null,
            endDate: e.endDate || e.end_time || e.end || null,
            registeredVoters: e.registeredVoters || e.totalVoters || 0,
            totalVotes: e.totalVotes || e.votes || 0,
          };
        });

        setElections(normalized);
      } catch (err) {
        console.error('Error fetching elections:', err);
        setElections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, []);

  const handleVote = (electionId) => {
    navigate(`/vote/${electionId}`);
  };

  const handleViewResults = (electionId) => {
    navigate(`/results/${electionId}`);
  };

  const showNotification = (message, type = 'info') => {
    console.log('Showing notification:', message, type);
    
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm transform transition-all duration-300 ${
      type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-medium">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Auto remove after 6 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 6000);
  };

  const handleCreateElection = () => {};

  const handleViewReports = () => {
    console.log('View Reports clicked. User:', user);
    console.log('User type:', user?.userType);
    console.log('User role:', user?.role);
    
    // First check if user is logged in
    if (!user) {
      showNotification('Please log in first to access this feature.', 'error');
      return;
    }
    
    // Check if user is admin - try different possible role properties
    const isAdmin = user?.role === 'admin' || 
                   user?.role === 'super_admin' || 
                   user?.userType === 'admin' ||
                   user?.adminId !== undefined ||
                   user?.id?.startsWith('ADMIN') ||
                   user?.name === 'admin';
    
    if (isAdmin) {
      console.log('User is admin, navigating to admin dashboard');
      navigate('/admin');
    } else {
      console.log('User is not admin, showing notification');
      showNotification('Only administrators can view reports. Please contact your system administrator.', 'error');
    }
  };

  const handleSettings = () => {
    navigate('/profile');
  };

  // Dashboard statistics
  const stats = [
    {
      label: 'Active Elections',
      value: elections.filter(e => e.status === 'active').length,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      change: 12
    },
    {
      label: 'Total Votes Cast',
      value: elections.reduce((sum, e) => sum + e.totalVotes, 0).toLocaleString(),
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      change: 8
    },
    {
      label: 'Registered Voters',
      value: elections.reduce((sum, e) => sum + e.registeredVoters, 0).toLocaleString(),
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      change: 15
    },
    {
      label: 'Voter Turnout',
      value: `${Math.round((elections.reduce((sum, e) => sum + e.totalVotes, 0) / elections.reduce((sum, e) => sum + e.registeredVoters, 0)) * 100)}%`,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      change: 5
    }
  ];

  // Chart data
  const chartData = {
    voterTurnout: {
      data: elections.map(e => {
        const rv = Number(e.registeredVoters) || 0;
        const tv = Number(e.totalVotes) || 0;
        if (rv <= 0) return 0;
        return Math.max(0, Math.min(100, Math.round((tv / rv) * 100)));
      }),
      labels: elections.map(e => (e.title || '').split(' ')[0] || 'Election')
    },
    votesByElection: {
      data: elections.map(e => Number(e.totalVotes) || 0),
      labels: elections.map(e => (e.title || '').split(' ')[0] || 'Election')
    }
  };

  // Sidebar navigation
  const sidebar = (
    <div className="space-y-4">
      <div className="card">
        <h3 className="text-h4 text-neutral-900 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button 
            className="btn btn-primary w-full hover:scale-105 transition-transform duration-200 relative"
            onClick={handleCreateElection}
            title="Create a new election (Admin only)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Election
            <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-xs px-1 rounded-full">ADMIN</span>
          </button>
          <button 
            className="btn btn-outline w-full hover:scale-105 transition-transform duration-200 relative"
            onClick={handleViewReports}
            title="View detailed reports (Admin only)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Reports
            <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-xs px-1 rounded-full">ADMIN</span>
          </button>
          <button 
            className="btn btn-ghost w-full hover:scale-105 transition-transform duration-200"
            onClick={handleSettings}
            title="Access your profile settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-h4 text-neutral-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900">New vote cast</p>
              <p className="text-xs text-neutral-500">2 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900">Election started</p>
              <p className="text-xs text-neutral-500">1 hour ago</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900">New voter registered</p>
              <p className="text-xs text-neutral-500">3 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome to your secure voting dashboard">
        <div className="flex items-center justify-center py-12">
          <div className="spinner mr-3"></div>
          <span className="text-neutral-600">Loading dashboard...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle="Welcome back! Here's what's happening with your elections."
      stats={stats}
      sidebar={sidebar}
    >
      {/* Charts Section - Compact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {(chartData.voterTurnout.data.length > 0 && chartData.voterTurnout.data.some(v => v > 0)) ? (
          <Chart
            type="bar"
            title="Vote Distribution"
            subtitle="Percentage of turnout per election"
            data={chartData.voterTurnout.data}
            labels={chartData.voterTurnout.labels}
            height={200}
            colors={['#3b82f6', '#22c55e', '#f59e0b']}
          />
        ) : (
          <div className="card flex items-center justify-center"><span className="text-neutral-600 text-sm">No turnout data</span></div>
        )}

        {(chartData.votesByElection.data.length > 0 && chartData.votesByElection.data.some(v => v > 0)) ? (
          <Chart
            type="line"
            title="Votes Cast Over Time"
            subtitle="Total votes per election"
            data={chartData.votesByElection.data}
            labels={chartData.votesByElection.labels}
            height={200}
            colors={['#f97316']}
          />
        ) : (
          <div className="card flex items-center justify-center"><span className="text-neutral-600 text-sm">No votes data</span></div>
        )}
      </div>

      {/* Elections Section - Compact */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-h4 text-neutral-900">Presidential Election 2024</h3>
            <p className="text-neutral-600 mt-1 text-sm">Manage and monitor your current elections</p>
          </div>
          {/* Admin-only New Election button removed per request */}
        </div>

        {elections.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-600 mb-2">No Elections Available</h3>
            <p className="text-neutral-500">Create your first election to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {elections.map((election, index) => (
              <div 
                key={election._id} 
                className="card hover-lift animate-fadeInUp" 
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-neutral-900 mb-1">{election.title}</h3>
                    <p className="text-neutral-600 text-xs mb-2">{election.description}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    election.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : election.status === 'completed'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {election.status}
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Registered Voters:</span>
                    <span className="font-medium">{election.registeredVoters.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Total Votes:</span>
                    <span className="font-medium">{election.totalVotes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">End Date:</span>
                    <span className="font-medium">{new Date(election.endDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {election.status === 'active' && (
                    <button
                      className="btn btn-primary btn-sm flex-1"
                      onClick={() => handleVote(election._id)}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Vote Now
                    </button>
                  )}
                  <button
                    className="btn btn-outline btn-sm flex-1"
                    onClick={() => handleViewResults(election._id)}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Results
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Section - Temporary */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-h4 text-neutral-900">Debug Info</h3>
            <p className="text-neutral-600 mt-1 text-sm">Current user authentication status</p>
          </div>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => {
              console.log('Current user:', user);
              showNotification(`User: ${user ? 'Logged in' : 'Not logged in'}, Type: ${user?.userType || 'None'}, Role: ${user?.role || 'None'}`, 'info');
            }}
          >
            Check User Status
          </button>
        </div>
        <div className="text-sm text-neutral-600">
          <p>User: {user ? 'Logged in' : 'Not logged in'}</p>
          <p>User Type: {user?.userType || 'None'}</p>
          <p>User Role: {user?.role || 'None'}</p>
          <p>Admin ID: {user?.adminId || 'None'}</p>
        </div>
      </div>

      {/* Security Features Section - Compact */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-h4 text-neutral-900">Security Features</h3>
            <p className="text-neutral-600 mt-1 text-sm">Advanced security measures protecting your vote</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-6 bg-gradient-to-br from-saffron-50 to-saffron-100 rounded-xl flex flex-col items-center justify-center" style={{ minHeight: 160 }}>
            <div className="rounded-full flex items-center justify-center mb-3" style={{ width: 56, height: 56, background: 'var(--saffron-500)' }}>
              <img src="/icons/fingerprint.svg" alt="Fingerprint" style={{ width: 28, height: 28 }} />
            </div>
            <h4 className="text-base font-semibold text-neutral-900 mb-1">Fingerprint Auth</h4>
            <p className="text-sm text-neutral-600">Biometric verification</p>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-india-green-50 to-india-green-100 rounded-xl flex flex-col items-center justify-center" style={{ minHeight: 160 }}>
            <div className="rounded-full flex items-center justify-center mb-3" style={{ width: 56, height: 56, background: 'var(--india-green-500)' }}>
              <img src="/icons/shield.svg" alt="Shield" style={{ width: 28, height: 28 }} />
            </div>
            <h4 className="text-base font-semibold text-neutral-900 mb-1">Merkle Tree</h4>
            <p className="text-sm text-neutral-600">Vote integrity</p>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-chakra-blue-50 to-chakra-blue-100 rounded-xl flex flex-col items-center justify-center" style={{ minHeight: 160 }}>
            <div className="rounded-full flex items-center justify-center mb-3" style={{ width: 56, height: 56, background: 'var(--chakra-blue-500)' }}>
              <img src="/icons/lock.svg" alt="Lock" style={{ width: 28, height: 28 }} />
            </div>
            <h4 className="text-base font-semibold text-neutral-900 mb-1">AES-256</h4>
            <p className="text-sm text-neutral-600">End-to-end encryption</p>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex flex-col items-center justify-center" style={{ minHeight: 160 }}>
            <div className="rounded-full flex items-center justify-center mb-3" style={{ width: 56, height: 56, background: 'purple' }}>
              <img src="/icons/chart.svg" alt="Chart" style={{ width: 28, height: 28 }} />
            </div>
            <h4 className="text-base font-semibold text-neutral-900 mb-1">Audit Trail</h4>
            <p className="text-sm text-neutral-600">Complete transparency</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
