import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import FaceCapture from '../components/FaceCapture';
import DashboardLayout from '../components/DashboardLayout';

const Vote = () => {
  const { electionId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const [capturedFace, setCapturedFace] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState({ lat: null, lng: null, accuracy: null, error: '' });

  useEffect(() => {
    if (!electionId) {
      navigate('/elections', { replace: true });
      return;
    }

    const fetchElectionAndCandidates = async () => {
      try {
        setLoading(true);

        // Try primary: GET /api/elections/:electionId (should include embedded candidates)
        let electionData = null;
        let candidateList = [];
        try {
          const eRes = await axios.get(`/api/elections/${electionId}`);
          electionData = eRes.data?.election || eRes.data?.election || null;
          // Candidates are returned at top-level: { election, candidates: [...] }
          const topLevelCandidates = Array.isArray(eRes.data?.candidates) ? eRes.data.candidates : [];
          candidateList = Array.isArray(electionData?.candidates) && electionData.candidates.length
            ? electionData.candidates
            : topLevelCandidates;
        } catch (errPrimary) {
          console.error('Election fetch failed, falling back to list:', errPrimary);
          // Fallback: GET /api/elections then find by electionId (no candidates)
          try {
            const listRes = await axios.get('/api/elections');
            const list = Array.isArray(listRes.data?.elections) ? listRes.data.elections : (Array.isArray(listRes.data) ? listRes.data : []);
            electionData = list.find(e => String(e.electionId || e._id) === String(electionId)) || null;
          } catch (errList) {
            console.error('Elections list fetch failed:', errList);
            electionData = null;
          }
        }

        setElection(electionData);

        // If no embedded candidates, attempt admin candidates (may require admin)
        if (!candidateList.length && electionData) {
          try {
            const adminList = await axios.get('/api/admin/candidates');
            const all = Array.isArray(adminList.data?.candidates) ? adminList.data.candidates : [];
            candidateList = all.filter(c => String(c.electionId?._id || c.electionId || c.election) === String(electionId));
          } catch (errAdmin) {
            console.error('Error fetching admin candidates (may be restricted):', errAdmin);
            candidateList = [];
          }
        }

        // Only registered/approved candidates
        const filtered = candidateList.filter(c => c.isRegistered === true || c.approved === true || c.status === 'approved' || c.status === 'registered' || typeof c.isRegistered === 'undefined');

        // Normalize shape
        const normalized = filtered.map(c => ({
          candidateId: String(c.candidateId || c._id || c.id || ''),
          name: c.name || c.candidateName || 'Candidate',
          party: c.party || c.partyName || '',
          description: c.description || c.bio || '',
          image: c.image || null
        }));

        setCandidates(normalized);
      } catch (err) {
        console.error('Error loading election/candidates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchElectionAndCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId]);

  // Capture live location on entry
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeo(g => ({ ...g, error: 'Geolocation not supported' }));
      return;
    }
    const onSuccess = (pos) => {
      setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, error: '' });
    };
    const onError = (err) => {
      setGeo(g => ({ ...g, error: err.message || 'Location permission denied' }));
    };
    navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }, []);

  const handleFaceCapture = (faceData) => {
    setCapturedFace(faceData);
    setFaceVerified(!!faceData);
  };

  const handleVoteSubmit = async () => {
    if (!selectedCandidate || !faceVerified) {
      return;
    }

    setSubmitting(true);
    
    try {
      await axios.post(
        `/api/votes/cast/${electionId}`,
        {
          candidateId: selectedCandidate,
          position: 'general',
          boothId: 'WEB-CLIENT',
          faceData: capturedFace,
          location: geo.lat && geo.lng ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy } : undefined
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      navigate('/dashboard');
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to cast vote';
      console.error('Vote submit failed', e);
      // Show user-friendly message
      if (typeof message === 'string') {
        // Highlight the already-voted case
        if (message.toLowerCase().includes('already voted')) {
          toast.info('You have already voted in this election.');
          // Optionally redirect after a short delay
          setTimeout(() => navigate('/dashboard'), 800);
        } else {
          toast.error(message);
        }
      } else {
        toast.error('Failed to cast vote');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Voting" subtitle="Loading election details...">
        <div className="flex items-center justify-center py-12">
          <div className="spinner mr-3"></div>
          <span className="text-neutral-600">Loading election...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!election) {
    return (
      <DashboardLayout title="Voting" subtitle="Election not found">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-neutral-600 mb-2">Election Not Found</h3>
          <p className="text-neutral-500">The election you're looking for doesn't exist or has been removed.</p>
          <button 
            className="btn btn-primary mt-4"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Cast Your Vote" 
      subtitle={`Participating in: ${election.title}`}
    >
      {/* Election Header */}
      <div className="card mb-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-h2 text-neutral-900 mb-4">{election.title}</h1>
          <p className="text-body-lg text-neutral-600 mb-6 max-w-3xl mx-auto">{election.description}</p>
          <div className="flex items-center justify-center space-x-6 text-sm text-neutral-500">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Ends: {new Date(election.endDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure Voting</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Candidate Selection */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-h3 text-neutral-900 mb-6 text-center">Select Your Candidate</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {candidates.map((candidate, index) => (
                <div 
                  key={candidate.candidateId} 
                  className={`bg-white border-2 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 hover:shadow-xl ${
                    selectedCandidate === candidate.candidateId 
                      ? 'border-saffron-500 shadow-xl scale-105' 
                      : 'border-neutral-200 hover:border-saffron-300 hover:scale-[1.02]'
                  }`}
                  onClick={() => setSelectedCandidate(candidate.candidateId)}
                  style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                >
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-saffron-500 to-chakra-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <span className="text-3xl font-bold text-white">
                        {candidate.name.charAt(0)}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-1">{candidate.name}</h3>
                    <p className="text-chakra-blue-600 font-semibold mb-3 text-base">{candidate.party}</p>
                    {candidate.description && (
                      <p className="text-neutral-600 text-sm leading-relaxed line-clamp-3">{candidate.description}</p>
                    )}
                    {selectedCandidate === candidate.candidateId && (
                      <div className="mt-4 inline-flex items-center px-2.5 py-1 rounded-full bg-saffron-100">
                        <svg className="w-4 h-4 text-saffron-700 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        </svg>
                        <span className="text-saffron-700 font-semibold text-xs">Selected</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Voting Process */}
        <div className="space-y-6">
          {/* Biometric Method Toggle */}
          {/* Face ID only */}

          {/* Face Verification */}
          <div className="card">
            <h3 className="text-h4 text-neutral-900 mb-6 text-center">Face ID Verification</h3>
            <div className="max-w-md mx-auto">
              <div className="space-y-4">
                <FaceCapture onCapture={handleFaceCapture} />
                {capturedFace && (
                  <div className="rounded-xl overflow-hidden border border-neutral-200">
                    <img 
                      src={capturedFace} 
                      alt="Face preview" 
                      style={{ width: '100%', maxHeight: 260, objectFit: 'cover' }} 
                    />
                  </div>
                )}
              </div>
              {faceVerified && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-800 font-medium text-sm">Face captured</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="card">
            <div className="space-y-4">
              <button
                className={`w-full py-4 text-lg font-semibold rounded-xl transition-all duration-200 flex items-center justify-center ${
                  !selectedCandidate || !faceVerified || submitting
                    ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                    : 'bg-saffron-500 hover:bg-saffron-600 text-white shadow-lg hover:shadow-xl'
                }`}
                onClick={handleVoteSubmit}
              disabled={!selectedCandidate || !faceVerified || submitting}
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-3"></div>
                    Submitting Vote...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Vote
                  </div>
                )}
              </button>
              
              <button
                className="w-full py-3 bg-white border-2 border-neutral-300 hover:border-saffron-300 text-neutral-700 hover:text-saffron-700 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center"
                onClick={() => navigate('/dashboard')}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
            
            {/* Voting Status */}
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <div className="space-y-3 text-sm">
                <div className={`flex items-center justify-between ${selectedCandidate ? 'text-green-600' : 'text-neutral-400'}`}>
                  <span>Candidate Selected</span>
                  {selectedCandidate ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div className={`flex items-center justify-between ${faceVerified ? 'text-green-600' : 'text-neutral-400'}`}>
                  <span>Face Captured</span>
                  {faceVerified ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Vote;
