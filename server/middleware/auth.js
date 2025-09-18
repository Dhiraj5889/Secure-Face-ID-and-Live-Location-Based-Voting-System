const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');
const Admin = require('../models/Admin');

// Authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    let user;
    if (decoded.type === 'voter') {
      user = await Voter.findOne({ voterId: decoded.voterId, isActive: true });
    } else if (decoded.type === 'admin') {
      user = await Admin.findOne({ adminId: decoded.adminId, isActive: true });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid token or user not found' });
    }

    req.user = user;
    req.userType = decoded.type;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Check if user is voter
const requireVoter = (req, res, next) => {
  if (req.userType !== 'voter') {
    return res.status(403).json({ message: 'Voter access required' });
  }
  next();
};

// Check admin permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ message: `Permission '${permission}' required` });
    }

    next();
  };
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (windowMs = 5 * 60 * 1000, max = 5) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + req.user?.voterId || req.user?.adminId;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    for (const [attemptKey, attemptData] of attempts.entries()) {
      if (attemptData.timestamp < windowStart) {
        attempts.delete(attemptKey);
      }
    }

    const userAttempts = attempts.get(key) || { count: 0, timestamp: now };
    
    if (userAttempts.count >= max) {
      return res.status(429).json({ 
        message: 'Too many sensitive operations. Please try again later.',
        retryAfter: Math.ceil((userAttempts.timestamp + windowMs - now) / 1000)
      });
    }

    userAttempts.count++;
    userAttempts.timestamp = now;
    attempts.set(key, userAttempts);

    next();
  };
};

// Validate biometric presence (face only)
const validateFingerprint = async (req, res, next) => {
  try {
    const { faceData } = req.body;
    if (!faceData) {
      return res.status(400).json({ message: 'Face biometric data required' });
    }
    // Downstream verification occurs in routes
    req.fingerprintValid = false;
    next();
  } catch (error) {
    return res.status(400).json({ message: 'Invalid biometric payload' });
  }
};

// Check if election is active
const checkElectionActive = async (req, res, next) => {
  try {
    const { electionId } = req.params;
    const Election = require('../models/Election');
    
    // Support both Mongo _id and string electionId (e.g., ELEC123...)
    let election = null;
    if (electionId) {
      election = await Election.findById(electionId).catch(() => null);
      if (!election) {
        election = await Election.findOne({ electionId: electionId });
      }
    }
    
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const now = new Date();
    if (election.status !== 'active' || now < election.startDate || now > election.endDate) {
      return res.status(400).json({ message: 'Election is not currently active' });
    }

    req.election = election;
    // Normalize param to ObjectId for downstream handlers
    req.params.electionId = String(election._id);
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Error checking election status' });
  }
};

// Check if user has already voted
const checkVotingStatus = async (req, res, next) => {
  try {
    const Vote = require('../models/Vote');
    const { electionId } = req.params;
    
    const existingVote = await Vote.findOne({
      voterId: req.user.voterId,
      electionId: electionId
    });

    if (existingVote) {
      // Allow re-vote in demo environments when explicitly enabled
      if (String(process.env.ALLOW_REVOTE).toLowerCase() === 'true') {
        req.existingVote = existingVote;
      } else {
        return res.status(400).json({ message: 'You have already voted in this election' });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Error checking voting status' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireVoter,
  requirePermission,
  sensitiveOperationLimit,
  validateFingerprint,
  checkElectionActive,
  checkVotingStatus
};
