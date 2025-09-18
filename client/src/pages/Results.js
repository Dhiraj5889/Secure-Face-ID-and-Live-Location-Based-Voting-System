import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import Chart from '../components/Chart';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Results = () => {
  const { electionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Export helpers
  const downloadBlob = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!Array.isArray(results) || results.length === 0) return;
    const headers = ['Rank', 'Candidate', 'Party', 'Votes', 'Percentage'];
    const rows = results.map((r, idx) => [
      String(idx + 1),
      '"' + (r.name || '').replace(/"/g, '""') + '"',
      '"' + (r.party || '').replace(/"/g, '""') + '"',
      String(r.votes ?? r.voteCount ?? 0),
      (r.percentage ?? 0).toFixed(2)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const title = (election?.title || 'results').replace(/[^a-z0-9-_]+/gi, '_');
    downloadBlob(csv, `${title}_results.csv`, 'text/csv;charset=utf-8;');
  };

  const handleDownloadReport = () => {
    const title = election?.title || 'Election Results';
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(String(title), 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Status: ${election?.status || 'N/A'}`, 40, 60);
    doc.text(`Start: ${election?.startDate ? new Date(election.startDate).toLocaleString() : 'N/A'}`, 40, 75);
    doc.text(`End: ${election?.endDate ? new Date(election.endDate).toLocaleString() : 'N/A'}`, 40, 90);
    doc.text(`Registered Voters: ${Number(election?.registeredVoters || 0).toLocaleString()}`, 40, 105);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 120);

    // Table data
    const tableBody = (results || []).map((r, idx) => ([
      String(idx + 1),
      r.name || 'Candidate',
      r.party || '',
      String(r.votes ?? r.voteCount ?? 0),
      `${Number(r.percentage ?? 0).toFixed(2)}%`
    ]));

    autoTable(doc, {
      startY: 140,
      head: [['Rank', 'Candidate', 'Party', 'Votes', 'Percentage']],
      body: tableBody,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    const safeTitle = title.replace(/[^a-z0-9-_]+/gi, '_');
    doc.save(`${safeTitle}_results.pdf`);
  };

  useEffect(() => {
    if (!electionId) {
      navigate('/elections', { replace: true });
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);

        // Use backend route: /api/votes/results/:electionId
        let resultsData = [];
        const res = await axios.get(`/api/votes/results/${electionId}`);
        if (Array.isArray(res.data)) {
          resultsData = res.data;
        } else if (Array.isArray(res.data.results)) {
          resultsData = res.data.results;
        } else {
          resultsData = [];
        }

        // Election meta if provided
        if (res.data && res.data.election) {
          setElection({
            title: res.data.election.title,
            status: res.data.election.status,
            totalVotes: res.data.election.totalVotes || 0,
            registeredVoters: res.data.election.registeredVoters || 0,
            startDate: res.data.election.startDate || null,
            endDate: res.data.election.endDate || null
          });
        }

        // If election meta not loaded, fetch election by id
        if (!election) {
          try {
            const eRes = await axios.get(`/api/elections/${electionId}`);
            setElection(eRes.data?.election || eRes.data || null);
          } catch (_) {
            // ignore if endpoint not available
          }
        }

        // Normalize results to expected shape
        const normalized = resultsData.map((r) => ({
          candidateId: String(r.candidateId || r.candidate || r._id || ''),
          name: r.name || r.candidateName || 'Candidate',
          party: r.party || r.partyName || '',
          votes: Number(r.votes || r.voteCount || r.totalVotes || 0),
          percentage: Number(r.percentage || r.percent || 0)
        }));

        setResults(normalized);
      } catch (err) {
        console.error('Error fetching results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId]);

  if (loading) {
    return (
      <DashboardLayout title="Election Results" subtitle="Loading results...">
        <div className="flex items-center justify-center py-12">
          <div className="spinner mr-3"></div>
          <span className="text-neutral-600">Loading results...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!election) {
    return (
      <DashboardLayout title="Election Results" subtitle="Election not found">
        <div className="text-center py-12">
          <div className="rounded-full flex items-center justify-center mx-auto mb-4" style={{ width: 56, height: 56, background: '#fecaca' }}>
            <img src="/icons/error.svg" alt="Error" style={{ width: 28, height: 28 }} />
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

  // Guard: voters cannot see results until election is completed
  if (user?.userType === 'voter' && election?.status !== 'completed') {
    return (
      <DashboardLayout title="Election Results" subtitle={election?.title || ''}>
        <div className="card text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-neutral-700 mb-2">Results are not available yet</h3>
          <p className="text-neutral-500">Results will be visible after the election is completed.</p>
        </div>
      </DashboardLayout>
    );
  }

  // Chart data derived from server results (voteCount per candidate)
  const voteCounts = Array.isArray(results) ? results.map(r => Number(r.votes || r.voteCount || 0)) : [];
  const labels = Array.isArray(results) ? results.map(r => (r.name || '').split(' ')[0] || 'Candidate') : [];
  const totalVotesComputed = voteCounts.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  const percentages = voteCounts.map(v => totalVotesComputed > 0 ? Math.round((v / totalVotesComputed) * 100) : 0);
  const chartData = {
    votes: voteCounts,
    labels,
    percentages
  };

  // Statistics
  const stats = [
    {
      label: 'Total Votes Cast',
      value: Number(election?.totalVotes || 0).toLocaleString(),
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      label: 'Voter Turnout',
      value: `${(() => {
        const tv = Number(election?.totalVotes || 0);
        const rv = Number(election?.registeredVoters || 0);
        if (rv <= 0) return 0;
        return Math.max(0, Math.min(100, Math.round((tv / rv) * 100)));
      })()}%`,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      label: 'Leading Candidate',
      value: results[0]?.name || 'N/A',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Margin of Victory',
      value: `${(results[0]?.percentage - results[1]?.percentage).toFixed(1)}%`,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  ];

  return (
    <DashboardLayout 
      title="Election Results" 
      subtitle={`Live results for ${election.title}`}
      stats={stats}
    >
      {/* Election Header */}
      <div className="card mb-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center rounded-full mb-4" style={{ width: 56, height: 56, background: 'linear-gradient(to right, #22c55e, #3b82f6)' }}>
            <img src="/icons/chart.svg" alt="Results" style={{ width: 28, height: 28 }} />
          </div>
          <h1 className="text-h2 text-neutral-900 mb-4">{election.title}</h1>
          <p className="text-body-lg text-neutral-600 mb-6 max-w-3xl mx-auto">{election.description}</p>
          
          {/* Live Updates Indicator */}
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-green-600 font-medium">Live Updates</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-neutral-500">Verified Results</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Chart
          type="pie"
          title="Vote Distribution"
          subtitle="Percentage breakdown of votes by candidate"
          data={chartData.percentages}
          labels={chartData.labels}
          height={300}
          colors={['#3b82f6', '#22c55e', '#f59e0b']}
        />
        
        <Chart
          type="bar"
          title="Votes by Candidate"
          subtitle="Total votes received by each candidate"
          data={chartData.votes}
          labels={chartData.labels}
          height={300}
          colors={['#8b5cf6', '#06b6d4', '#f97316']}
        />
      </div>

      {/* Detailed Results */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-h3 text-neutral-900">Detailed Results</h3>
            <p className="text-neutral-600 mt-1">Complete breakdown of election results</p>
          </div>
          <button className="btn btn-outline" onClick={handleExportCSV}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Results
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Party
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Votes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {results.map((result, index) => (
                <tr key={result.candidateId} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-sm">
                          {result.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">{result.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-neutral-600">{result.party}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-neutral-900">
                      {result.votes.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-neutral-900">
                      {result.percentage.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-32">
                      <div className="progress">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${result.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Election Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="card">
          <h4 className="text-h4 text-neutral-900 mb-4">Election Information</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-600">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                election.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {election.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Start Date:</span>
              <span className="text-neutral-900">{new Date(election.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">End Date:</span>
              <span className="text-neutral-900">{new Date(election.endDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Registered Voters:</span>
              <span className="text-neutral-900">{Number(election?.registeredVoters || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="text-h4 text-neutral-900 mb-4">Security Features</h4>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: 'var(--saffron-500)' }}>
                <img src="/icons/fingerprint.svg" alt="Fingerprint" style={{ width: 28, height: 28 }} />
              </div>
              <span className="text-neutral-700 mt-2">Fingerprint Authentication</span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: 'var(--india-green-500)' }}>
                <img src="/icons/shield.svg" alt="Merkle" style={{ width: 28, height: 28 }} />
              </div>
              <span className="text-neutral-700 mt-2">Merkle Tree Verification</span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: 'var(--chakra-blue-500)' }}>
                <img src="/icons/lock.svg" alt="Encryption" style={{ width: 28, height: 28 }} />
              </div>
              <span className="text-neutral-700 mt-2">End-to-End Encryption</span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: 'purple' }}>
                <img src="/icons/chart.svg" alt="Realtime" style={{ width: 28, height: 28 }} />
              </div>
              <span className="text-neutral-700 mt-2">Real-time Updates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 mt-8">
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/dashboard')}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Dashboard
        </button>
        
        <button className="btn btn-outline" onClick={handleDownloadReport}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Report
        </button>
      </div>
    </DashboardLayout>
  );
};

export default Results;
