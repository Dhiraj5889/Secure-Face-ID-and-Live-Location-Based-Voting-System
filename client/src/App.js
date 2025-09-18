import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
// Removed duplicate Navigation to use ECIHeader across all pages
import ECIHeader from './components/ECIHeader';
import ECIFooter from './components/ECIFooter';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Vote from './pages/Vote';
import Results from './pages/Results';
import Elections from './pages/Elections';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AdminElections from './pages/AdminElections';
import AdminVoters from './pages/AdminVoters';
import AdminCandidates from './pages/AdminCandidates';
import AdminGeo from './pages/AdminGeo';
import Profile from './pages/Profile';
import VerificationPending from './pages/VerificationPending';
import './App.css';

function AppContent() {
  const location = useLocation();
  const hideChrome = false;
  return (
    <div className="App">
      <ECIHeader />
      <main className="eci-main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route 
                  path="/elections" 
                  element={
                    <ProtectedRoute>
                      <Elections />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/elections/:electionId" 
                  element={
                    <ProtectedRoute>
                      <Elections />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/verification-pending" element={<VerificationPending />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/vote/:electionId" 
                  element={
                    <ProtectedRoute>
                      <Vote />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/results/:electionId" 
                  element={
                    <ProtectedRoute>
                      <Results />
                    </ProtectedRoute>
                  } 
                />
                {/* Base results index for header link */}
                <Route 
                  path="/results" 
                  element={
                    <ProtectedRoute>
                      <div className="container" style={{padding:'24px 16px'}}>
                        <h2 className="text-h2" style={{marginBottom:12}}>Results</h2>
                        <p className="text-body">Select an election from your dashboard or the elections list to view results.</p>
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute userType="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/elections" 
                  element={
                    <ProtectedRoute userType="admin">
                      <AdminElections />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/voters" 
                  element={
                    <ProtectedRoute userType="admin">
                      <AdminVoters />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/candidates" 
                  element={
                    <ProtectedRoute userType="admin">
                      <AdminCandidates />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/geo" 
                  element={
                    <ProtectedRoute userType="admin">
                      <AdminGeo />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
      </main>
      <ECIFooter />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppContent />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
