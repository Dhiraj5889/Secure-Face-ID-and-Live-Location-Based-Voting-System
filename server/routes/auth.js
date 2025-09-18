const express = require('express');
const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');
const Admin = require('../models/Admin');
const fingerprintService = require('../utils/fingerprint');
const faceService = require('../utils/face');
const { authenticateToken, sensitiveOperationLimit } = require('../middleware/auth');

const router = express.Router();

// Voter registration
router.post('/register/voter', sensitiveOperationLimit(), async (req, res) => {
  try {
    const { voterId, name, email, phone, dob, address, fingerprintData, faceData } = req.body;

    // Validate required fields
    if (!voterId || !name || !email || !phone || !dob || !address || !address.village || !address.taluka || !address.district || (!fingerprintData && !faceData)) {
      return res.status(400).json({ message: 'Required fields missing; include dob and full address (village, taluka, district) plus fingerprintData or faceData' });
    }

    // Age >= 18 check
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) {
      return res.status(400).json({ message: 'Invalid date of birth' });
    }
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 18) {
      return res.status(400).json({ message: 'You must be at least 18 years old to register' });
    }

    // Check if voter already exists
    const existingVoter = await Voter.findOne({
      $or: [{ voterId }, { email }]
    });

    if (existingVoter) {
      return res.status(400).json({ message: 'Voter already exists' });
    }

    // Generate biometric templates
    const fingerprintHash = fingerprintData ? fingerprintService.generateFingerprintHash(fingerprintData) : undefined;
    const faceTemplateHash = faceData ? await faceService.generateFaceTemplateHash(faceData) : undefined;

    // Check if fingerprint is already registered
    if (fingerprintHash) {
      const existingFingerprint = await Voter.findOne({ fingerprintHash });
      if (existingFingerprint) {
        return res.status(400).json({ message: 'Fingerprint already registered' });
      }
    }
    if (faceTemplateHash) {
      const existingFace = await Voter.findOne({ faceTemplateHash });
      if (existingFace) {
        return res.status(400).json({ message: 'Face already registered' });
      }
    }

    // Create new voter (omit undefined biometric fields to avoid null unique index conflicts)
    const voterData = {
      voterId: String(voterId).trim(),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      dob: birth,
      address: {
        village: String(address.village).trim(),
        taluka: String(address.taluka).trim(),
        district: String(address.district).trim()
      },
      isVerified: false
    };
    if (fingerprintHash !== undefined) {
      voterData.fingerprintHash = fingerprintHash;
    }
    if (faceTemplateHash !== undefined) {
      voterData.faceTemplateHash = faceTemplateHash;
      // keep a small face thumbnail for UI (store as provided base64)
      voterData.faceImage = faceData;
    }

    // Strip any null/undefined biometric fields defensively
    Object.keys(voterData).forEach(k => {
      if (voterData[k] === null || voterData[k] === undefined) {
        delete voterData[k];
      }
    });
    const voter = new Voter(voterData);

    await voter.save();

    res.status(201).json({
      message: 'Voter registered successfully',
      voterId: voter.voterId,
      status: 'pending_verification'
    });
  } catch (error) {
    console.error('Voter registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Voter login with fingerprint
router.post('/login/voter', sensitiveOperationLimit(60 * 1000, 10), async (req, res) => {
  try {
    const { voterId, fingerprintData, faceData } = req.body;

    if (!voterId || (!fingerprintData && !faceData)) {
      return res.status(400).json({ message: 'Voter ID and biometric data (fingerprint or face) required' });
    }

    // Normalize and find voter (case-insensitive match on voterId)
    const normalizedVoterId = String(voterId).trim();
    const voter = await Voter.findOne({
      voterId: { $regex: new RegExp(`^${normalizedVoterId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (!voter) {
      return res.status(401).json({ message: 'Invalid voter ID' });
    }
    if (!voter.isActive) {
      return res.status(401).json({ message: 'Voter account inactive' });
    }

    // Verify biometric (fingerprint or face). Either method can succeed.
    let fingerprintAttempted = Boolean(fingerprintData);
    let faceAttempted = Boolean(faceData);
    let fingerprintMatched = false;
    let faceMatched = false;

    if (fingerprintAttempted && voter.fingerprintHash) {
      fingerprintMatched = fingerprintService.verifyFingerprint(fingerprintData, voter.fingerprintHash);
    }

    if (!fingerprintMatched && faceAttempted) {
      if (!voter.faceTemplateHash) {
        // Enroll face on first successful login if not enrolled yet
        try {
          voter.faceTemplateHash = await faceService.generateFaceTemplateHash(faceData);
          await voter.save();
          faceMatched = true;
        } catch (e) {
          faceMatched = false;
        }
      } else {
        faceMatched = await faceService.verifyFace(faceData, voter.faceTemplateHash);
      }
    }

    const biometricValid = fingerprintMatched || faceMatched;

    if (!biometricValid) {
      if (fingerprintAttempted && !faceAttempted) {
        return res.status(401).json({ message: 'Fingerprint verification failed' });
      }
      if (faceAttempted && !fingerprintAttempted) {
        return res.status(401).json({ message: 'Face not matched' });
      }
      return res.status(401).json({ message: 'Fingerprint and Face verification failed' });
    }

    // Check if voter is verified
    if (!voter.isVerified) {
      return res.status(401).json({ message: 'Voter not verified yet' });
    }

    // Update last login
    voter.lastLogin = new Date();
    await voter.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        voterId: voter.voterId,
        type: 'voter'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      voter: {
        voterId: voter.voterId,
        name: voter.name,
        email: voter.email,
        hasVoted: voter.hasVoted,
        isVerified: voter.isVerified,
        faceImage: voter.faceImage
      }
    });
  } catch (error) {
    console.error('Voter login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Admin login
router.post('/login/admin', sensitiveOperationLimit(60 * 1000, 10), async (req, res) => {
  try {
    console.log('🔐 Admin login attempt:', { username: req.body.username, hasPassword: !!req.body.password });
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Find admin
    console.log('🔍 Searching for admin with username:', username);
    const admin = await Admin.findOne({ username, isActive: true });
    
    if (!admin) {
      console.log('❌ Admin not found or inactive');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('✅ Admin found:', { adminId: admin.adminId, role: admin.role });

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(401).json({ message: 'Account is locked' });
    }

    // Verify password
    console.log('🔐 Verifying password...');
    const isPasswordValid = await admin.comparePassword(password);
    console.log('🔐 Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      // Increment login attempts
      admin.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      await admin.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin.adminId,
        type: 'admin',
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log('✅ Admin login successful, generating token...');
    res.json({
      message: 'Login successful',
      token,
      admin: {
        adminId: admin.adminId,
        username: admin.username,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    userType: req.userType,
    user: {
      id: req.user.voterId || req.user.adminId,
      name: req.user.name || req.user.username,
      isVerified: req.user.isVerified
    }
  });
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    const token = jwt.sign(
      { 
        voterId: req.user.voterId || req.user.adminId,
        type: req.userType
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Token refreshed',
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

module.exports = router;
