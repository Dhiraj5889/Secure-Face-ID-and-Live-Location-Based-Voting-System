const express = require('express');
const Admin = require('../models/Admin');
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
const Vote = require('../models/Vote');
const Voter = require('../models/Voter');
const Party = require('../models/Party');
const Booth = require('../models/Booth');
const { authenticateToken, requireAdmin, requirePermission } = require('../middleware/auth');
const Constituency = require('../models/Constituency');
const Village = require('../models/Village');
const Ward = require('../models/Ward');

const router = express.Router();

// ========== Admin Voter Registration ==========
// Create/register a voter with ward assignment
// POST /api/admin/voters
router.post('/voters', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { voterId, name, email, phone, dob, address, wardId } = req.body;

    // Required fields
    if (!voterId || !name || !email || !phone || !dob || !address || !address.village || !address.taluka || !address.district || !wardId) {
      return res.status(400).json({ message: 'voterId, name, email, phone, dob, address (village,taluka,district), wardId are required' });
    }

    // 18+ age validation
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) {
      return res.status(400).json({ message: 'Invalid dob' });
    }
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 18) {
      return res.status(400).json({ message: 'Voter must be 18 or older' });
    }

    // Ward existence (allow either _id or wardId)
    const ward = await Ward.findOne({ $or: [{ _id: wardId }, { wardId }] });
    if (!ward) return res.status(404).json({ message: 'Ward not found' });

    // Uniqueness checks (case-insensitive email)
    const existing = await Voter.findOne({
      $or: [
        { voterId },
        { email: { $regex: new RegExp(`^${String(email).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { phone }
      ]
    });
    if (existing) {
      return res.status(400).json({ message: 'Voter with same voterId, email, or phone already exists' });
    }

    const created = await Voter.create({
      voterId,
      name,
      email,
      phone,
      dob: birth,
      address: { village: address.village, taluka: address.taluka, district: address.district },
      wardId: ward._id,
      isVerified: true,
      isActive: true
    });

    res.status(201).json({
      message: 'Voter registered successfully',
      voter: {
        _id: created._id,
        voterId: created.voterId,
        name: created.name,
        email: created.email,
        phone: created.phone,
        dob: created.dob,
        address: created.address,
        wardId: created.wardId,
        status: created.status
      }
    });
  } catch (error) {
    console.error('Admin create voter error:', error);
    res.status(500).json({ message: 'Failed to register voter' });
  }
});

// Create new admin (super admin only)
router.post('/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check if current user is super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }

    const { adminId, username, email, password, role = 'admin', permissions = [] } = req.body;

    // Validate required fields
    if (!adminId || !username || !email || !password) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ adminId }, { username }, { email }]
    });

    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // Create new admin
    const admin = new Admin({
      adminId,
      username,
      email,
      password,
      role,
      permissions
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        adminId: admin.adminId,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Failed to create admin' });
  }
});

// Get all admins (super admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check if current user is super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }

    const admins = await Admin.find()
      .select('adminId username email role permissions isActive lastLogin createdAt')
      .sort({ createdAt: -1 });

    res.json({ admins });

  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Failed to fetch admins' });
  }
});

// Get admin profile
router.get('/profile', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    admin: {
      adminId: req.user.adminId,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions,
      lastLogin: req.user.lastLogin,
      createdAt: req.user.createdAt
    }
  });
});

// Update admin profile
router.put('/profile', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;

    // Check for uniqueness
    if (updateData.username || updateData.email) {
      const existingAdmin = await Admin.findOne({
        _id: { $ne: req.user._id },
        $or: [
          updateData.username ? { username: updateData.username } : {},
          updateData.email ? { email: updateData.email } : {}
        ]
      });

      if (existingAdmin) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profile updated successfully',
      admin: {
        adminId: updatedAdmin.adminId,
        username: updatedAdmin.username,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        permissions: updatedAdmin.permissions
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Change password
router.post('/change-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password required' });
    }

    // Verify current password
    const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Get dashboard statistics
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get basic statistics
    const totalVoters = await Voter.countDocuments();
    const totalElections = await Election.countDocuments();
    const totalCandidates = await Candidate.countDocuments();
    const totalVotes = await Vote.countDocuments();

    // Get active elections
    const activeElections = await Election.find({ status: 'active' })
      .select('electionId title startDate endDate totalVotes')
      .sort({ startDate: -1 });

    // Get recent votes
    const recentVotes = await Vote.find()
      .populate('electionId', 'title')
      .populate('candidateId', 'name party')
      .select('voteId electionId candidateId timestamp')
      .sort({ timestamp: -1 })
      .limit(10);

    // Get voter registration trends
    const registrationTrends = await Voter.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$registrationDate" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    // Get vote trends
    const voteTrends = await Vote.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    res.json({
      statistics: {
        totalVoters: totalVoters,
        totalElections: totalElections,
        totalCandidates: totalCandidates,
        totalVotes: totalVotes,
        activeElections: activeElections.length
      },
      activeElections: activeElections,
      recentVotes: recentVotes,
      trends: {
        registrations: registrationTrends,
        votes: voteTrends
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// Manage candidates
// Candidate create with multipart support for photo/sign
const multerCand = require('multer');
const uploadCand = multerCand({ storage: multerCand.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/candidates', authenticateToken, requireAdmin, requirePermission('manage_candidates'), uploadCand.fields([{ name: 'photo', maxCount: 1 }, { name: 'sign', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, party, position, description, imageUrl, manifesto, electionId } = req.body;

    // Validate required fields
    if (!name || !party || !position || !electionId) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Resolve election by Mongo _id or by electionId string
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

    // Enforce constituency scope: candidate must be created within election's constituency
    const constituencyId = election.constituencyId || null;
    if (!constituencyId) {
      return res.status(400).json({ message: 'Election has no constituency scope set' });
    }

    // Generate unique candidateId
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const candidateId = `CAND${timestamp}${randomSuffix}`;

    // Check if candidate already exists for this election
    const existingCandidate = await Candidate.findOne({ 
      name, 
      party, 
      electionId 
    });
    if (existingCandidate) {
      return res.status(400).json({ message: 'Candidate already exists for this election' });
    }

    // Optional uploaded images
    let photoUrl;
    let signUrl;
    if (req.files && req.files.photo && req.files.photo[0]) {
      const mime = req.files.photo[0].mimetype || 'image/png';
      if (!/^image\//.test(mime)) return res.status(400).json({ message: 'Photo must be an image' });
      photoUrl = `data:${mime};base64,${req.files.photo[0].buffer.toString('base64')}`;
    }
    if (req.files && req.files.sign && req.files.sign[0]) {
      const mime = req.files.sign[0].mimetype || 'image/png';
      if (!/^image\//.test(mime)) return res.status(400).json({ message: 'Sign must be an image' });
      signUrl = `data:${mime};base64,${req.files.sign[0].buffer.toString('base64')}`;
    }

    // Create candidate
    const candidate = new Candidate({
      candidateId,
      name,
      party,
      position,
      description,
      imageUrl,
      photoUrl: photoUrl || undefined,
      signUrl: signUrl || undefined,
      manifesto,
      electionId: election._id,
      constituencyId
    });

    await candidate.save();

    res.status(201).json({
      message: 'Candidate created successfully',
      candidate: {
        candidateId: candidate.candidateId,
        name: candidate.name,
        party: candidate.party,
        position: candidate.position,
        description: candidate.description,
        imageUrl: candidate.imageUrl,
        manifesto: candidate.manifesto,
        electionId: candidate.electionId,
        voteCount: candidate.voteCount,
        isActive: candidate.isActive
      }
    });

  } catch (error) {
    console.error('Create candidate error:', error);
    res.status(500).json({ message: 'Failed to create candidate' });
  }
});

// Get all candidates
router.get('/candidates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { electionId, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (electionId) {
      filter.electionId = electionId;
    }

    const candidates = await Candidate.find(filter)
      .populate('electionId', 'title electionId')
      .select('candidateId name party position description imageUrl manifesto voteCount isActive electionId')
      .sort({ voteCount: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Candidate.countDocuments(filter);

    res.json({
      candidates: candidates,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total: total
    });

  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ message: 'Failed to fetch candidates' });
  }
});

// Update candidate
router.put('/candidates/:candidateId', authenticateToken, requireAdmin, requirePermission('manage_candidates'), async (req, res) => {
  try {
    const { candidateId } = req.params;
    const updates = req.body;

    const candidate = await Candidate.findOne({ candidateId });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const allowedUpdates = ['name', 'party', 'position', 'description', 'imageUrl', 'manifesto', 'isActive'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    const updatedCandidate = await Candidate.findOneAndUpdate(
      { candidateId },
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Candidate updated successfully',
      candidate: updatedCandidate
    });

  } catch (error) {
    console.error('Update candidate error:', error);
    res.status(500).json({ message: 'Failed to update candidate' });
  }
});

// Delete candidate
router.delete('/candidates/:candidateId', authenticateToken, requireAdmin, requirePermission('manage_candidates'), async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await Candidate.findOne({ candidateId });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Check if candidate has votes
    const voteCount = await Vote.countDocuments({ candidateId });
    if (voteCount > 0) {
      return res.status(400).json({ message: 'Cannot delete candidate with existing votes' });
    }

    await Candidate.findByIdAndDelete(candidate._id);

    res.json({ message: 'Candidate deleted successfully' });

  } catch (error) {
    console.error('Delete candidate error:', error);
    res.status(500).json({ message: 'Failed to delete candidate' });
  }
});

// Get admin dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalElections = await Election.countDocuments();
    const activeElections = await Election.countDocuments({ status: 'active' });
    const totalVoters = await Voter.countDocuments();
    const totalVotes = await Vote.countDocuments();
    const totalBooths = await Booth.countDocuments();

    res.json({
      totalElections,
      activeElections,
      totalVoters,
      totalVotes,
      totalBooths
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});
// Booth-wise counts per candidate for an election
router.get('/stats/booth-wise', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { electionId } = req.query;
    if (!electionId) return res.status(400).json({ message: 'electionId is required' });

    const pipeline = [
      { $match: { electionId: require('mongoose').Types.ObjectId(electionId) } },
      { $group: { _id: { boothId: '$boothId', candidateId: '$candidateId' }, count: { $sum: 1 } } },
      { $group: { _id: '$_id.boothId', candidates: { $push: { candidateId: '$_id.candidateId', votes: '$count' } }, total: { $sum: '$count' } } },
      { $sort: { _id: 1 } }
    ];

    const results = await Vote.aggregate(pipeline);
    res.json({ booths: results });
  } catch (error) {
    console.error('Booth-wise stats error:', error);
    res.status(500).json({ message: 'Failed to fetch booth-wise stats' });
  }
});

// Aggregate per candidate across all booths
router.get('/stats/candidate-aggregate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { electionId } = req.query;
    if (!electionId) return res.status(400).json({ message: 'electionId is required' });

    const pipeline = [
      { $match: { electionId: require('mongoose').Types.ObjectId(electionId) } },
      { $group: { _id: '$candidateId', votes: { $sum: 1 } } },
      { $sort: { votes: -1 } }
    ];
    const results = await Vote.aggregate(pipeline);
    res.json({ candidates: results });
  } catch (error) {
    console.error('Candidate aggregate stats error:', error);
    res.status(500).json({ message: 'Failed to fetch candidate aggregate stats' });
  }
});

// Danger: Bulk delete voters, candidates, and parties
// DELETE /api/admin/bulk-delete?confirm=DELETE&what=voters,candidates,parties&force=true
router.delete('/bulk-delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { confirm, what = '', force } = req.query;
    if (confirm !== 'DELETE') return res.status(400).json({ message: 'Confirmation required: ?confirm=DELETE' });

    const targets = new Set(String(what).split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
    if (targets.size === 0) return res.status(400).json({ message: 'Specify what to delete: voters,candidates,parties' });

    const summary = {};

    if (targets.has('voters')) {
      const filter = force === 'true' ? {} : { hasVoted: { $ne: true } };
      const r = await Voter.deleteMany(filter);
      summary.voters = r.deletedCount;
    }

    if (targets.has('candidates')) {
      // Only delete candidates with zero votes unless force=true
      let candFilter = {};
      if (force === 'true') {
        const r = await Candidate.deleteMany({});
        summary.candidates = r.deletedCount;
      } else {
        const votedCandidateIds = await Vote.distinct('candidateId');
        const r = await Candidate.deleteMany({ _id: { $nin: votedCandidateIds } });
        summary.candidates = r.deletedCount;
      }
    }

    if (targets.has('parties')) {
      // Only delete parties that have no candidates unless force=true
      if (force === 'true') {
        const r = await Party.deleteMany({});
        summary.parties = r.deletedCount;
      } else {
        const partiesInUse = await Candidate.distinct('party');
        const r = await Party.deleteMany({ name: { $nin: partiesInUse } });
        summary.parties = r.deletedCount;
      }
    }

    res.json({ message: 'Bulk delete complete', summary, force: force === 'true' });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Failed to bulk delete' });
  }
});

// Get all elections (admin view)
router.get('/elections', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const elections = await Election.find()
      .sort({ createdAt: -1 });

    res.json(elections);

  } catch (error) {
    console.error('Get elections error:', error);
    res.status(500).json({ message: 'Failed to fetch elections' });
  }
});

// Create new election
router.post('/elections', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, startDate, endDate, type, status = 'draft', positions = [], wardId, villageId, constituencyId } = req.body;

    // Validate required fields
    if (!title || !startDate || !endDate || !type) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Enforce scope linkage by type
    const typeLower = String(type).toLowerCase();
    if (typeLower === 'ward' && !wardId) return res.status(400).json({ message: 'wardId required for ward election' });
    if (typeLower === 'village' && !villageId) return res.status(400).json({ message: 'villageId required for village election' });
    if (typeLower === 'constituency' && !constituencyId) return res.status(400).json({ message: 'constituencyId required for constituency election' });

    // Generate unique electionId
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const electionId = `ELEC${timestamp}${randomSuffix}`;

    // Ensure unique title
    const existingTitle = await Election.findOne({ title: { $regex: new RegExp(`^${String(title).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    if (existingTitle) return res.status(400).json({ message: 'Election title already exists' });

    // Create new election
    const election = new Election({
      electionId,
      title,
      description,
      startDate: start,
      endDate: end,
      type: typeLower,
      status,
      positions: positions.length > 0 ? positions : ['President'], // Default position if none provided
      createdBy: req.user._id,
      wardId: typeLower === 'ward' ? wardId : undefined,
      villageId: typeLower === 'village' ? villageId : undefined,
      constituencyId: typeLower === 'constituency' ? constituencyId : undefined
    });

    await election.save();

    res.status(201).json({
      message: 'Election created successfully',
      election
    });

  } catch (error) {
    console.error('Create election error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      user: req.user ? { id: req.user._id, adminId: req.user.adminId } : 'No user'
    });
    res.status(500).json({ 
      message: 'Failed to create election',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update election status
router.put('/elections/:electionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    election.status = status;
    await election.save();

    res.json({
      message: 'Election status updated successfully',
      election
    });

  } catch (error) {
    console.error('Update election error:', error);
    res.status(500).json({ message: 'Failed to update election' });
  }
});

// Get all parties
router.get('/parties', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const parties = await Party.find()
      .sort({ name: 1 });

    res.json({ parties });

  } catch (error) {
    console.error('Get parties error:', error);
    res.status(500).json({ message: 'Failed to fetch parties' });
  }
});

// Create new party
// Party create with optional multipart logo upload (`logo` field)
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/parties', authenticateToken, requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    const { name, shortName, symbol, color, description, foundedYear } = req.body;

    // Validate required fields
    if (!name || !shortName) {
      return res.status(400).json({ message: 'Party name and short name are required' });
    }

    // Check if party already exists
    const existingParty = await Party.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { shortName: { $regex: new RegExp(`^${String(shortName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ]
    });

    if (existingParty) {
      return res.status(400).json({ message: 'Party already exists' });
    }

    // Generate unique partyId
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const partyId = `PARTY${timestamp}${randomSuffix}`;

    // Handle logo upload (store as data URL here; switch to S3/GridFS for production)
    let logoDataUrl;
    if (req.file) {
      const mime = req.file.mimetype || 'image/png';
      if (!/^image\//.test(mime)) return res.status(400).json({ message: 'Logo must be an image' });
      logoDataUrl = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
    }

    // Create new party
    const party = new Party({
      partyId,
      name,
      shortName,
      symbol: logoDataUrl || symbol,
      color: color || '#000000',
      description,
      foundedYear: foundedYear ? parseInt(foundedYear) : null
    });

    await party.save();

    res.status(201).json({
      message: 'Party created successfully',
      party
    });

  } catch (error) {
    console.error('Create party error:', error);
    res.status(500).json({ message: 'Failed to create party' });
  }
});

// Update party
router.put('/parties/:partyId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { partyId } = req.params;
    const updates = req.body;

    const party = await Party.findOne({ partyId });
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }

    const allowedUpdates = ['name', 'shortName', 'symbol', 'color', 'description', 'foundedYear', 'isActive'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    const updatedParty = await Party.findOneAndUpdate(
      { partyId },
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Party updated successfully',
      party: updatedParty
    });

  } catch (error) {
    console.error('Update party error:', error);
    res.status(500).json({ message: 'Failed to update party' });
  }
});

// Delete party
router.delete('/parties/:partyId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { partyId } = req.params;

    const party = await Party.findOne({ partyId });
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }

    // Check if party has candidates
    const candidateCount = await Candidate.countDocuments({ party: party.name });
    if (candidateCount > 0) {
      return res.status(400).json({ message: 'Cannot delete party with existing candidates' });
    }

    await Party.findByIdAndDelete(party._id);

    res.json({ message: 'Party deleted successfully' });

  } catch (error) {
    console.error('Delete party error:', error);
    res.status(500).json({ message: 'Failed to delete party' });
  }
});

// System audit log
router.get('/audit', authenticateToken, requireAdmin, requirePermission('audit_votes'), async (req, res) => {
  try {
    const { page = 1, limit = 50, type, startDate, endDate } = req.query;
    
    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // This would typically come from an audit log collection
    // For now, we'll use votes as an example
    const auditLogs = await Vote.find(filter)
      .populate('electionId', 'title')
      .populate('candidateId', 'name party')
      .select('voteId voterId electionId candidateId timestamp ipAddress isVerified')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Vote.countDocuments(filter);

    res.json({
      auditLogs: auditLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total: total
    });

  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
// Booths: CRUD
// List booths for an election
router.get('/booths', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { electionId } = req.query;
    const filter = electionId ? { electionId } : {};
    const booths = await Booth.find(filter).select('boothId name location electionId isActive createdAt');
    res.json({ booths });
  } catch (error) {
    console.error('Get booths error:', error);
    res.status(500).json({ message: 'Failed to fetch booths' });
  }
});

// ========== Constituency/Village/Ward Management ==========
// Create constituency
router.post('/geo/constituencies', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { constituencyId, name, code, state } = req.body;
    if (!constituencyId || !name) return res.status(400).json({ message: 'constituencyId and name are required' });
    const exists = await Constituency.findOne({ constituencyId });
    if (exists) return res.status(400).json({ message: 'Constituency already exists' });
    const c = await Constituency.create({ constituencyId, name, code, state });
    res.status(201).json({ message: 'Constituency created', constituency: c });
  } catch (e) {
    console.error('Create constituency error:', e); res.status(500).json({ message: 'Failed to create constituency' });
  }
});

// List constituencies
router.get('/geo/constituencies', authenticateToken, requireAdmin, async (_req, res) => {
  const list = await Constituency.find({}).sort({ name: 1 });
  res.json({ constituencies: list });
});

// Create village under constituency
router.post('/geo/villages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { villageId, name, constituencyId } = req.body;
    if (!villageId || !name || !constituencyId) return res.status(400).json({ message: 'villageId, name, constituencyId required' });
    const constituency = await Constituency.findOne({ $or: [{ _id: constituencyId }, { constituencyId }] });
    if (!constituency) return res.status(404).json({ message: 'Constituency not found' });
    const exists = await Village.findOne({ villageId });
    if (exists) return res.status(400).json({ message: 'Village already exists' });
    const v = await Village.create({ villageId, name, constituencyId: constituency._id });
    res.status(201).json({ message: 'Village created', village: v });
  } catch (e) { console.error('Create village error:', e); res.status(500).json({ message: 'Failed to create village' }); }
});

// List villages for a constituency
router.get('/geo/villages', authenticateToken, requireAdmin, async (req, res) => {
  const { constituencyId } = req.query;
  const filter = {};
  if (constituencyId) {
    const c = await Constituency.findOne({ $or: [{ _id: constituencyId }, { constituencyId }] });
    if (c) filter.constituencyId = c._id; else return res.json({ villages: [] });
  }
  const list = await Village.find(filter).sort({ name: 1 });
  res.json({ villages: list });
});

// Create ward under village
router.post('/geo/wards', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { wardId, name, villageId } = req.body;
    if (!wardId || !name || !villageId) return res.status(400).json({ message: 'wardId, name, villageId required' });
    const village = await Village.findOne({ $or: [{ _id: villageId }, { villageId }] });
    if (!village) return res.status(404).json({ message: 'Village not found' });
    const constituency = await Constituency.findById(village.constituencyId);
    const exists = await Ward.findOne({ wardId });
    if (exists) return res.status(400).json({ message: 'Ward already exists' });
    const w = await Ward.create({ wardId, name, villageId: village._id, constituencyId: constituency._id });
    res.status(201).json({ message: 'Ward created', ward: w });
  } catch (e) { console.error('Create ward error:', e); res.status(500).json({ message: 'Failed to create ward' }); }
});

// List wards for a village
router.get('/geo/wards', authenticateToken, requireAdmin, async (req, res) => {
  const { villageId } = req.query;
  const filter = {};
  if (villageId) {
    const v = await Village.findOne({ $or: [{ _id: villageId }, { villageId }] });
    if (v) filter.villageId = v._id; else return res.json({ wards: [] });
  }
  const list = await Ward.find(filter).sort({ name: 1 });
  res.json({ wards: list });
});

// Assign ward to voter
router.post('/geo/assign-ward', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { voterId, wardId } = req.body;
    if (!voterId || !wardId) return res.status(400).json({ message: 'voterId and wardId are required' });
    const voter = await Voter.findOne({ voterId });
    if (!voter) return res.status(404).json({ message: 'Voter not found' });
    const ward = await Ward.findOne({ $or: [{ _id: wardId }, { wardId }] });
    if (!ward) return res.status(404).json({ message: 'Ward not found' });
    voter.wardId = ward._id;
    await voter.save();
    res.json({ message: 'Ward assigned to voter', voter: { voterId: voter.voterId, wardId: voter.wardId } });
  } catch (e) { console.error('Assign ward error:', e); res.status(500).json({ message: 'Failed to assign ward' }); }
});

// Create ward-level election
router.post('/geo/ward-elections', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, startDate, endDate, wardId, positions = [] } = req.body;
    if (!title || !startDate || !endDate || !wardId) return res.status(400).json({ message: 'title, startDate, endDate, wardId required' });
    const ward = await Ward.findOne({ $or: [{ _id: wardId }, { wardId }] });
    if (!ward) return res.status(404).json({ message: 'Ward not found' });
    const timestamp = Date.now(); const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const electionId = `ELEC${timestamp}${randomSuffix}`;
    const election = await Election.create({
      electionId,
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'upcoming',
      positions: positions.length ? positions : ['Member'],
      createdBy: req.user._id,
      wardId: ward._id,
      villageId: ward.villageId,
      constituencyId: ward.constituencyId
    });
    res.status(201).json({ message: 'Ward election created', election });
  } catch (e) { console.error('Create ward election error:', e); res.status(500).json({ message: 'Failed to create ward election' }); }
});

// Create booth
router.post('/booths', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, location = '', electionId, isActive = true } = req.body;
    if (!name || !electionId) {
      return res.status(400).json({ message: 'Name and electionId are required' });
    }

    const booth = new Booth({ name, location, electionId, isActive });
    await booth.save();
    res.status(201).json({ message: 'Booth created', booth });
  } catch (error) {
    console.error('Create booth error:', error);
    res.status(500).json({ message: 'Failed to create booth' });
  }
});

// Update booth
router.put('/booths/:boothId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { boothId } = req.params;
    const updates = req.body;
    const updated = await Booth.findOneAndUpdate({ boothId }, updates, { new: true });
    if (!updated) return res.status(404).json({ message: 'Booth not found' });
    res.json({ message: 'Booth updated', booth: updated });
  } catch (error) {
    console.error('Update booth error:', error);
    res.status(500).json({ message: 'Failed to update booth' });
  }
});

// Delete booth
router.delete('/booths/:boothId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { boothId } = req.params;
    const deleted = await Booth.findOneAndDelete({ boothId });
    if (!deleted) return res.status(404).json({ message: 'Booth not found' });
    res.json({ message: 'Booth deleted' });
  } catch (error) {
    console.error('Delete booth error:', error);
    res.status(500).json({ message: 'Failed to delete booth' });
  }
});
