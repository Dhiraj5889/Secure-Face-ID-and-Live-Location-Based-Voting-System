import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Vote, 
  Clock, 
  Users, 
  Calendar,
  ArrowRight,
  Filter,
  Search,
  Loader
} from 'lucide-react';

const Elections = () => {
  const { electionId } = useParams();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/elections');
      setElections(response.data.elections);
    } catch (err) {
      setError('Failed to fetch elections');
      console.error('Error fetching elections:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      upcoming: { class: 'badge-info', text: 'Upcoming' },
      active: { class: 'badge-success', text: 'Active' },
      completed: { class: 'badge-warning', text: 'Completed' },
      cancelled: { class: 'badge-danger', text: 'Cancelled' }
    };
    
    const config = statusConfig[status] || statusConfig.upcoming;
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getTimeRemaining = (startDate, endDate, status) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (status === 'upcoming') {
      const diff = start - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return `Starts in ${days} day${days !== 1 ? 's' : ''}`;
    } else if (status === 'active') {
      const diff = end - now;
      const hours = Math.ceil(diff / (1000 * 60 * 60));
      return `${hours} hours remaining`;
    } else if (status === 'completed') {
      return 'Election completed';
    }
    
    return '';
  };

  const filteredElections = (electionId
    ? elections.filter(e => String(e.electionId || e._id) === String(electionId))
    : elections
  ).filter(election => {
    const matchesSearch = election.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         election.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || election.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading elections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchElections} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Elections
        </h1>
        <p className="text-xl text-white/80">
          Participate in secure digital elections
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search elections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input form-select"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Elections Grid */}
      {filteredElections.length === 0 ? (
        <div className="card text-center py-12">
          <Vote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No elections found
          </h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'No elections are currently available'
            }
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredElections.map((election) => (
            <div key={election._id} className="card hover:transform hover:scale-105 transition-transform duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {election.title}
                  </h3>
                  {getStatusBadge(election.status)}
                </div>
                <Vote className="w-8 h-8 text-blue-600" />
              </div>

              {election.description && (
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {election.description}
                </p>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    {new Date(election.startDate).toLocaleDateString()} - {' '}
                    {new Date(election.endDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{election.totalVoters} registered voters</span>
                </div>

                {election.status === 'active' && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Vote className="w-4 h-4 mr-2" />
                    <span>{election.totalVotes} votes cast</span>
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{getTimeRemaining(election.startDate, election.endDate, election.status)}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <Link
                  to={`/elections/${election.electionId || election._id}`}
                  className="btn btn-outline flex-1"
                >
                  View Details
                </Link>
                
                {election.status === 'active' && (
                  <Link
                    to={`/vote/${election.electionId || election._id}`}
                    className="btn btn-primary flex-1"
                  >
                    Vote Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                
                {election.status === 'completed' && (
                  <Link
                    to={`/results/${election.electionId || election._id}`}
                    className="btn btn-success flex-1"
                  >
                    View Results
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {elections.filter(e => e.status === 'upcoming').length}
            </div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {elections.filter(e => e.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {elections.filter(e => e.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {elections.length}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Elections;
