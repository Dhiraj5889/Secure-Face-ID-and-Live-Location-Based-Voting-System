const express = require('express');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const Voter = require('../models/Voter');
const { authenticateToken, requireAdmin, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get all elections (public)
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // If voter, restrict to their ward
    if (req.userType === 'voter' && req.user?.wardId) {
      filter.$or = [
        { isPublic: true },
        { wardId: req.user.wardId }
      ];
    }

    const elections = await Election.find(filter)
      .populate('createdBy', 'username')
      .select('electionId title description startDate endDate status totalVoters totalVotes isPublic')
      .sort({ startDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Election.countDocuments(filter);

    // Compute registered voters per election (active & verified)
    const electionsWithRegistered = await Promise.all(
      elections.map(async (el) => {
        let registeredVoters = 0;
        try {
          registeredVoters = await Voter.countDocuments({
            electionId: el._id,
            isActive: true,
            isVerified: true
          });
        } catch (_) {}
        return {
          ...el.toObject(),
          registeredVoters
        };
      })
    );

    res.json({
      elections: electionsWithRegistered,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total: total
    });

  } catch (error) {
    console.error('Get elections error:', error);
    res.status(500).json({ message: 'Failed to fetch elections' });
  }
});

// Get single election
router.get('/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;

    // Accept either public electionId string or MongoDB ObjectId
    let election = null;
    // Try ObjectId lookup first
    try {
      election = await Election.findById(electionId)
        .populate('createdBy', 'username')
        .select('electionId title description startDate endDate status totalVoters totalVotes isPublic');
    } catch (_) {
      election = null;
    }
    if (!election) {
      election = await Election.findOne({ electionId })
      .populate('createdBy', 'username')
      .select('electionId title description startDate endDate status totalVoters totalVotes isPublic');
    }

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Optional privacy check - relax to avoid crashes when no auth context
    if (election.isPublic === false && req.userType && req.userType !== 'admin') {
      return res.status(403).json({ message: 'Election is private' });
    }

    // Fetch candidates explicitly (avoid strictPopulate errors)
    // Most schemas store election reference as ObjectId on Candidate
    const candidates = await Candidate.find({ electionId: election._id })
      .select('candidateId name party position description imageUrl electionId');

    // Compute registered voters dynamically
    let registeredVoters = 0;
    try {
      registeredVoters = await Voter.countDocuments({
        electionId: election._id,
        isActive: true,
        isVerified: true
      });
    } catch (_) {}

    res.json({
      election: { ...election.toObject(), registeredVoters },
      candidates: candidates,
      timeRemaining: election.timeRemaining,
      duration: election.duration
    });

  } catch (error) {
    console.error('Get election error:', error);
    res.status(500).json({ message: 'Failed to fetch election' });
  }
});

// Create new election (admin only)
router.post('/', authenticateToken, requireAdmin, requirePermission('create_election'), async (req, res) => {
  try {
    const { 
      electionId, 
      title, 
      description, 
      startDate, 
      endDate, 
      positions, 
      isPublic = true 
    } = req.body;

    // Validate required fields
    if (!electionId || !title || !startDate || !endDate || !positions) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if election ID already exists
    const existingElection = await Election.findOne({ electionId });
    if (existingElection) {
      return res.status(400).json({ message: 'Election ID already exists' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    if (start <= new Date()) {
      return res.status(400).json({ message: 'Start date must be in the future' });
    }

    // Create election
    const election = new Election({
      electionId,
      title,
      description,
      startDate: start,
      endDate: end,
      positions,
      isPublic,
      createdBy: req.user._id,
      status: 'upcoming'
    });

    await election.save();

    res.status(201).json({
      message: 'Election created successfully',
      election: {
        electionId: election.electionId,
        title: election.title,
        status: election.status,
        startDate: election.startDate,
        endDate: election.endDate
      }
    });

  } catch (error) {
    console.error('Create election error:', error);
    res.status(500).json({ message: 'Failed to create election' });
  }
});

// Update election (admin only)
router.put('/:electionId', authenticateToken, requireAdmin, requirePermission('create_election'), async (req, res) => {
  try {
    const { electionId } = req.params;
    const updates = req.body;

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Don't allow updates to active or completed elections
    if (election.status === 'active' || election.status === 'completed') {
      return res.status(400).json({ message: 'Cannot update active or completed elections' });
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'startDate', 'endDate', 'positions', 'isPublic'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    const updatedElection = await Election.findOneAndUpdate(
      { electionId },
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Election updated successfully',
      election: updatedElection
    });

  } catch (error) {
    console.error('Update election error:', error);
    res.status(500).json({ message: 'Failed to update election' });
  }
});

// Start election (admin only)
router.post('/:electionId/start', authenticateToken, requireAdmin, requirePermission('create_election'), async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    if (election.status !== 'upcoming') {
      return res.status(400).json({ message: 'Election is not in upcoming status' });
    }

    const now = new Date();
    if (now < election.startDate) {
      return res.status(400).json({ message: 'Cannot start election before scheduled start date' });
    }

    election.status = 'active';
    await election.save();

    res.json({
      message: 'Election started successfully',
      election: {
        electionId: election.electionId,
        status: election.status,
        startDate: election.startDate
      }
    });

  } catch (error) {
    console.error('Start election error:', error);
    res.status(500).json({ message: 'Failed to start election' });
  }
});

// End election (admin only)
router.post('/:electionId/end', authenticateToken, requireAdmin, requirePermission('create_election'), async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    if (election.status !== 'active') {
      return res.status(400).json({ message: 'Election is not active' });
    }

    election.status = 'completed';
    await election.save();

    res.json({
      message: 'Election ended successfully',
      election: {
        electionId: election.electionId,
        status: election.status,
        endDate: election.endDate
      }
    });

  } catch (error) {
    console.error('End election error:', error);
    res.status(500).json({ message: 'Failed to end election' });
  }
});

// Get election statistics
router.get('/:electionId/stats', authenticateToken, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Get vote statistics
    const totalVotes = await Vote.countDocuments({ electionId });
    const verifiedVotes = await Vote.countDocuments({ electionId, isVerified: true });
    
    // Get candidate statistics
    const candidates = await Candidate.find({ electionId })
      .select('candidateId name party position voteCount');

    // Get voting timeline
    const voteTimeline = await Vote.aggregate([
      { $match: { electionId: election._id } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d %H:00:00", date: "$timestamp" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      election: {
        electionId: election.electionId,
        title: election.title,
        status: election.status,
        startDate: election.startDate,
        endDate: election.endDate
      },
      statistics: {
        totalVotes: totalVotes,
        verifiedVotes: verifiedVotes,
        verificationRate: totalVotes > 0 ? (verifiedVotes / totalVotes * 100).toFixed(2) : 0,
        candidates: candidates.length
      },
      candidates: candidates,
      voteTimeline: voteTimeline
    });

  } catch (error) {
    console.error('Election stats error:', error);
    res.status(500).json({ message: 'Failed to fetch election statistics' });
  }
});

// Delete election (admin only)
router.delete('/:electionId', authenticateToken, requireAdmin, requirePermission('create_election'), async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Don't allow deletion of elections with votes
    const voteCount = await Vote.countDocuments({ electionId: election._id });
    if (voteCount > 0) {
      return res.status(400).json({ message: 'Cannot delete election with existing votes' });
    }

    // Delete candidates first
    await Candidate.deleteMany({ electionId: election._id });
    
    // Delete election
    await Election.findByIdAndDelete(election._id);

    res.json({ message: 'Election deleted successfully' });

  } catch (error) {
    console.error('Delete election error:', error);
    res.status(500).json({ message: 'Failed to delete election' });
  }
});

module.exports = router;
