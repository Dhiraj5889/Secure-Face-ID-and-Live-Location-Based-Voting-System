import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FaceCapture from '../components/FaceCapture';
import Notification from '../components/Notification';
import { 
  User, 
  Mail, 
  Phone, 
  
  AlertCircle,
  Loader,
  CheckCircle
} from 'lucide-react';

const Register = () => {
  const [userType, setUserType] = useState('voter');
  const [formData, setFormData] = useState({
    voterId: '',
    name: '',
    email: '',
    phone: '',
    dob: '',
    addressVillage: '',
    addressTaluka: '',
    addressDistrict: '',
    faceData: null
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

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
    setErrors(prev => ({
      ...prev,
      face: 'Camera permission denied or unavailable. Allow camera and try again.'
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.dob) {
      newErrors.dob = 'Date of Birth is required';
    } else {
      const birth = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 18) newErrors.dob = 'You must be 18 or older';
    }

    if (!formData.addressVillage.trim()) newErrors.addressVillage = 'Village is required';
    if (!formData.addressTaluka.trim()) newErrors.addressTaluka = 'Taluka is required';
    if (!formData.addressDistrict.trim()) newErrors.addressDistrict = 'District is required';

    if (!formData.voterId.trim()) {
      newErrors.voterId = 'Voter ID is required';
    } else if (formData.voterId.length < 3) {
      newErrors.voterId = 'Voter ID must be at least 3 characters';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.faceData) {
      newErrors.face = 'Face capture is required';
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
      const result = await register({
        ...formData,
        address: {
          village: formData.addressVillage,
          taluka: formData.addressTaluka,
          district: formData.addressDistrict
        },
        faceData: formData.faceData
      }, userType);
      
      if (result.success) {
        setRegistrationSuccess(true);
      } else {
        const message = (result.error || '').toLowerCase();
        const fieldErrors = {};
        if (message.includes('voter') || message.includes('id')) {
          fieldErrors.voterId = 'Voter ID invalid';
        }
        if (message.includes('email')) {
          fieldErrors.email = 'Email already in use or invalid';
        }
        if (message.includes('phone')) {
          fieldErrors.phone = 'Phone number invalid';
        }
        if (message.includes('face')) {
          fieldErrors.face = 'Face capture/verification failed';
        }
        setErrors(fieldErrors);
        if (Object.keys(fieldErrors).length === 0) {
          setGeneralError(result.error || 'Registration failed');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setGeneralError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      voterId: '',
      name: '',
      email: '',
      phone: '',
      dob: '',
      addressVillage: '',
      addressTaluka: '',
      addressDistrict: '',
      faceData: null
    });
    setErrors({});
    setRegistrationSuccess(false);
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Registration Successful!
            </h2>
            
            <p className="text-gray-600 mb-6">
              Your voter registration has been submitted successfully. 
              Please wait for admin verification before you can vote.
            </p>
            
            <div className="space-y-3">
              <Link to="/login" className="btn btn-primary w-full">
                Go to Login
              </Link>
              <Link to="/" className="btn btn-secondary w-full">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            Create Account
          </h2>
          <p className="text-white/80">
            Register as a voter to participate in elections
          </p>
        </div>

        <div className="card">
          {generalError && (
            <div className="mb-4">
              <Notification
                type="error"
                title="Registration error"
                message={generalError}
                duration={6000}
                onClose={() => setGeneralError('')}
              />
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Input */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name *
              </label>
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`form-input ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="Enter your full name"
                />
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="form-group">
              <label htmlFor="dob" className="form-label">
                Date of Birth *
              </label>
              <div className="relative">
                <input
                  id="dob"
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className={`form-input ${errors.dob ? 'border-red-500' : ''}`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">dd-mm-yyyy</p>
              {errors.dob && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.dob}
                </p>
              )}
            </div>
            {/* Voter ID */}
            <div className="form-group">
              <label htmlFor="voterId" className="form-label">
                Voter ID *
              </label>
              <div className="relative">
                <input
                  id="voterId"
                  name="voterId"
                  type="text"
                  value={formData.voterId}
                  onChange={handleInputChange}
                  className={`form-input ${errors.voterId ? 'border-red-500' : ''}`}
                  placeholder="Enter your unique voter ID"
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

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">Village *</label>
                <input name="addressVillage" value={formData.addressVillage} onChange={handleInputChange} className={`form-input ${errors.addressVillage ? 'border-red-500' : ''}`} placeholder="Enter village" />
                {errors.addressVillage && (<p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.addressVillage}</p>)}
              </div>
              <div className="form-group">
                <label className="form-label">Taluka *</label>
                <input name="addressTaluka" value={formData.addressTaluka} onChange={handleInputChange} className={`form-input ${errors.addressTaluka ? 'border-red-500' : ''}`} placeholder="Enter taluka" />
                {errors.addressTaluka && (<p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.addressTaluka}</p>)}
              </div>
              <div className="form-group">
                <label className="form-label">District *</label>
                <input name="addressDistrict" value={formData.addressDistrict} onChange={handleInputChange} className={`form-input ${errors.addressDistrict ? 'border-red-500' : ''}`} placeholder="Enter district" />
                {errors.addressDistrict && (<p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.addressDistrict}</p>)}
              </div>
            </div>

            {/* Email (optional) */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address (optional)
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-input ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="Enter your email address"
                />
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone Input */}
            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Phone Number *
              </label>
              <div className="relative">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`form-input ${errors.phone ? 'border-red-500' : ''}`}
                  placeholder="Enter your phone number"
                />
                <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Face Capture */}
            <div className="form-group">
              <label className="form-label">Face ID Registration *</label>
              <div className="space-y-3">
                <FaceCapture onCapture={handleFaceCapture} onError={handleFaceError} />
                {formData.faceData && (
                  <div className="rounded-lg overflow-hidden border border-neutral-200">
                    <img src={formData.faceData} alt="Face preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover' }} />
                  </div>
                )}
              </div>
              {errors.face && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.face}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.faceData}
              className="btn btn-primary w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Registering...
                </>
              ) : (
                <>Register as Voter</>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign in here
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              <Link to="/" className="text-blue-600 hover:text-blue-800">
                ← Back to Home
              </Link>
            </p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-white/70">
            <span>Your face data is stored as an embedding only (no raw image).</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
