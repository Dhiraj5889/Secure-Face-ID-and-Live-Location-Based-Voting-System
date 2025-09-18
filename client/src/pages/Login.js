import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FaceCapture from '../components/FaceCapture';
import Notification from '../components/Notification';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Loader
} from 'lucide-react';

const Login = () => {
  const [userType, setUserType] = useState('voter');
  const [formData, setFormData] = useState({
    voterId: '',
    username: '',
    password: '',
    faceData: null
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const { login, isAuthenticated, userType: currentUserType } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || (currentUserType === 'admin' ? '/admin' : '/dashboard');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleFaceCapture = (faceData) => {
    setFormData(prev => ({
      ...prev,
      faceData
    }));
  };

  const handleFaceError = (error) => {
    console.error('Face capture error:', error);
    setErrors(prev => ({ ...prev, face: 'Camera permission denied or unavailable.' }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (userType === 'voter') {
      if (!formData.voterId.trim()) {
        newErrors.voterId = 'Voter ID is required';
      }
      if (!formData.faceData) {
        newErrors.face = 'Face capture is required';
      }
    } else {
      if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
      }
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setGeneralError('');

    try {
      const credentials = userType === 'voter' 
        ? {
            voterId: formData.voterId.trim(),
            faceData: formData.faceData
          }
        : {
            username: formData.username,
            password: formData.password
          };

      const result = await login(credentials, userType);
      
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        const message = (result.error || '').toLowerCase();
        const fieldErrors = {};
        if (userType === 'voter') {
          if (message.includes('voter') || message.includes('id')) {
            fieldErrors.voterId = 'Voter ID invalid';
          }
          if (message.includes('face')) {
            fieldErrors.face = 'Face verification failed. Try again.';
          }
        } else {
          if (message.includes('username')) {
            fieldErrors.username = 'Username not found';
          }
          if (message.includes('password')) {
            fieldErrors.password = 'Invalid password';
          }
        }
        setErrors(fieldErrors);
        if (Object.keys(fieldErrors).length === 0) {
          setGeneralError(result.error || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setGeneralError('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      voterId: '',
      username: '',
      password: '',
      faceData: null
    });
    setErrors({});
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left: Hero / Branding */}
        <div className="hidden lg:block">
          <div className="glass-card p-8">
            {/* Removed hero branding and feature blocks per request */}
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className="card">
          {generalError && (
            <div className="mb-4">
              <Notification
                type="error"
                title="Login error"
                message={generalError}
                duration={6000}
                onClose={() => setGeneralError('')}
              />
            </div>
          )}
          {/* User Type Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-3">
            <button
              type="button"
              onClick={() => {
                setUserType('voter');
                resetForm();
              }}
              className={`flex-1 py-3 px-5 rounded-lg text-sm font-semibold transition-all border ${
                userType === 'voter'
                  ? 'bg-white text-blue-700 border-blue-200 shadow'
                  : 'bg-transparent text-gray-700 border-transparent hover:bg-white hover:shadow'
              }`}
              aria-selected={userType === 'voter'}
            >
              <User className="w-5 h-5 inline mr-2" />
              Voter
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType('admin');
                resetForm();
              }}
              className={`flex-1 py-3 px-5 rounded-lg text-sm font-semibold transition-all border ${
                userType === 'admin'
                  ? 'bg-white text-blue-700 border-blue-200 shadow'
                  : 'bg-transparent text-gray-700 border-transparent hover:bg-white hover:shadow'
              }`}
              aria-selected={userType === 'admin'}
            >
              <Lock className="w-5 h-5 inline mr-2" />
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {userType === 'voter' ? (
              <>
                {/* Voter ID Input */}
                <div className="form-group">
                  <label htmlFor="voterId" className="form-label">
                    Voter ID
                  </label>
                  <div className="relative">
                    <input
                      id="voterId"
                      name="voterId"
                      type="text"
                      value={formData.voterId}
                      onChange={handleInputChange}
                      className={`form-input ${errors.voterId ? 'border-red-500' : ''}`}
                      placeholder="Enter your voter ID"
                    />
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                  {errors.voterId && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.voterId}
                    </p>
                  )}
                </div>

                {/* Face Capture */}
                <div className="form-group">
                  <label className="form-label">Face ID Authentication</label>
                  <FaceCapture onCapture={handleFaceCapture} onError={handleFaceError} disabled={!formData.voterId.trim()} />
                  {errors.face && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.face}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Username Input */}
                <div className="form-group">
                  <label htmlFor="username" className="form-label">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleInputChange}
                      className={`form-input ${errors.username ? 'border-red-500' : ''}`}
                      placeholder="Enter your username"
                    />
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.username}
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`form-input pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.password}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  {userType === 'voter' ? <User className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                Register here
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              <Link to="/" className="text-blue-600 hover:text-blue-800">
                ← Back to Home
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center lg:col-span-2">
          <div className="inline-flex items-center space-x-2 text-sm text-white/80">
            <Lock className="w-4 h-4" />
            <span>Your data is protected with end-to-end encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
