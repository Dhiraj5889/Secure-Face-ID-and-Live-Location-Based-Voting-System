const express = require('express');
const Vote = require('../models/Vote');
const Voter = require('../models/Voter');
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
const Booth = require('../models/Booth');
// Defer getting io from the app to avoid circular dependency
const MerkleTree = require('../utils/merkleTree');
const encryptionService = require('../utils/encryption');
const fingerprintService = require('../utils/fingerprint');
const faceService = require('../utils/face');
const { 
  authenticateToken, 
  requireVoter, 
  checkElectionActive, 
  checkVotingStatus,
  validateFingerprint 
} = require('../middleware/auth');

const router = express.Router();

// Cast a vote
router.post('/cast/:electionId', 
  authenticateToken, 
  requireVoter, 
  checkElectionActive, 
  checkVotingStatus,
  validateFingerprint,
  async (req, res) => {
    try {
      const { electionId } = req.params;
      const { candidateId, position, faceData, boothId, location } = req.body;

      // Validate required fields
      if (!candidateId || !position || !faceData || !boothId) {
        return res.status(400).json({ message: 'Candidate ID, position, face biometric, and boothId are required' });
      }

      // Verify biometric again (fallback to middleware signal for demo environments)
      let biometricValid = false;
      if (faceData && req.user.faceTemplateHash) {
        biometricValid = await faceService.verifyFace(faceData, req.user.faceTemplateHash);
      }
      // Allow middleware validation to pass for non-production demo use-cases
      // no fallback flag now

      if (!biometricValid) {
        return res.status(401).json({ message: 'Biometric verification failed' });
      }

      // Verify voter eligibility by election scope (ward/village/constituency)
      if (req.election.wardId) {
        if (String(req.user.wardId) !== String(req.election.wardId)) {
          return res.status(403).json({ message: 'You are not eligible to vote in this ward election' });
        }
      } else if (req.election.villageId) {
        // Ensure voter belongs to the same village via their ward
        const voterWard = req.user.wardId ? await require('mongoose').model('Ward').findById(req.user.wardId).select('villageId') : null;
        if (!voterWard || String(voterWard.villageId) !== String(req.election.villageId)) {
          return res.status(403).json({ message: 'You are not eligible to vote in this village election' });
        }
      } else if (req.election.constituencyId) {
        // Ensure voter belongs to the same constituency via their ward
        const voterWard = req.user.wardId ? await require('mongoose').model('Ward').findById(req.user.wardId).select('constituencyId') : null;
        if (!voterWard || String(voterWard.constituencyId) !== String(req.election.constituencyId)) {
          return res.status(403).json({ message: 'You are not eligible to vote in this constituency election' });
        }
      }

      // Optional live location requirement
      if (String(process.env.REQUIRE_LOCATION || 'false').toLowerCase() === 'true') {
        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
          return res.status(400).json({ message: 'Location (lat,lng) required for vote casting' });
        }
      }

      // Verify candidate exists and is active
      let candidate = await Candidate.findOne({ 
        candidateId, 
        electionId: req.election._id, 
        isActive: true 
      });
      // Also accept MongoDB ObjectId passed as candidateId
      if (!candidate) {
        try {
          const asObjectId = new (require('mongoose').Types.ObjectId)(candidateId);
          candidate = await Candidate.findOne({ _id: asObjectId, electionId: req.election._id, isActive: true });
        } catch (_) {
          // ignore cast error and keep candidate as null
        }
      }

      if (!candidate) {
        return res.status(400).json({ message: 'Invalid candidate' });
      }

      // Validate booth (auto-create a virtual WEB-CLIENT booth if missing for this election)
      let booth = await Booth.findOne({ boothId, electionId: req.election._id });
      if (!booth) {
        booth = await Booth.create({
          boothId,
          name: boothId === 'WEB-CLIENT' ? 'Web Client Booth' : boothId,
          electionId: req.election._id,
          isActive: true
        });
      }
      if (!booth.isActive) {
        return res.status(400).json({ message: 'Invalid or inactive booth for this election' });
      }

      // Create vote data
      const voteData = {
        voterId: req.user.voterId,
        electionId: electionId,
        candidateId: candidateId,
        position: position,
        boothId: boothId,
        timestamp: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        location: location && location.lat && location.lng ? location : undefined
      };

      // Encrypt vote data
      const electionKey = process.env.ENCRYPTION_KEY || 'default-election-key';
      const { encryptedVote, voteHash } = encryptionService.encryptVote(voteData, electionKey);

      // Create or update vote record (re-vote if allowed)
      let vote;
      const isRevote = Boolean(req.existingVote);
      if (isRevote) {
        const prevCandidateId = req.existingVote.candidateId;
        // Decrement previous candidate count
        await Candidate.findOneAndUpdate(
          { candidateId: prevCandidateId, electionId: req.election._id },
          { $inc: { voteCount: -1 } }
        );

        // Update existing vote fields
        req.existingVote.candidateId = candidateId;
        req.existingVote.position = position;
        req.existingVote.boothId = boothId;
        req.existingVote.encryptedVote = encryptedVote;
        req.existingVote.voteHash = voteHash;
        req.existingVote.ipAddress = req.ip;
        req.existingVote.userAgent = req.get('User-Agent');
        req.existingVote.location = voteData.location;
        req.existingVote.isVerified = true;
        vote = await req.existingVote.save();
      } else {
        // Create vote record
        vote = new Vote({
          voterId: req.user.voterId,
          electionId: electionId,
          candidateId: candidateId,
          position: position,
          boothId: boothId,
          encryptedVote: encryptedVote,
          voteHash: voteHash,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          location: voteData.location,
          isVerified: true
        });

        await vote.save();

        // Update voter's voting status
        await Voter.findByIdAndUpdate(req.user._id, { hasVoted: true });

        // Update election's total votes (count only first submission)
        await Election.findByIdAndUpdate(
          req.election._id,
          { $inc: { totalVotes: 1 } }
        );
      }

      // Increment new candidate's vote count
      await Candidate.findOneAndUpdate(
        { candidateId, electionId: req.election._id },
        { $inc: { voteCount: 1 } }
      );

      // Generate Merkle proof for this vote
      // Use the same stored type for electionId to build the tree consistently
      const allVotes = await Vote.find({ electionId: electionId }).sort({ timestamp: 1 });
      const voteHashes = allVotes.map(v => v.voteHash);
      const merkleTree = new MerkleTree(voteHashes);
      const merkleProof = merkleTree.getProof(voteHash);

      // Update vote with Merkle proof
      vote.merkleProof = merkleProof;
      await vote.save();

      // Update election with new Merkle root
      await Election.findByIdAndUpdate(
        req.election._id,
        { merkleRoot: merkleTree.getRoot() }
      );

      // Emit real-time updates to election and booth rooms
      const io = req.app.get('io');
      if (io) {
        io.to(`election-${electionId}`).emit('vote-update', { electionId, boothId, candidateId, isRevote });
        io.to(`booth-${boothId}`).emit('vote-update', { electionId, boothId, candidateId, isRevote });

        // Also emit scope-level tallies (ward/village/constituency)
        const scopeTallies = await Vote.aggregate([
          { $match: { electionId: req.election._id } },
          { $group: { _id: '$candidateId', count: { $sum: 1 } } }
        ]);
        const totalScopeVotes = scopeTallies.reduce((s, t) => s + (t.count || 0), 0);
        const payload = { electionId, tallies: scopeTallies, totalVotes: totalScopeVotes, ts: new Date().toISOString() };
        if (req.election.wardId) io.to(`ward-${req.election.wardId}`).emit('scope-vote-update', { scope: 'ward', wardId: String(req.election.wardId), ...payload });
        if (req.election.villageId) io.to(`village-${req.election.villageId}`).emit('scope-vote-update', { scope: 'village', villageId: String(req.election.villageId), ...payload });
        if (req.election.constituencyId) io.to(`constituency-${req.election.constituencyId}`).emit('scope-vote-update', { scope: 'constituency', constituencyId: String(req.election.constituencyId), ...payload });
      }

      res.status(201).json({
        message: 'Vote cast successfully',
        voteId: vote.voteId,
        timestamp: vote.timestamp,
        merkleProof: merkleProof,
        isRevote
      });

    } catch (error) {
      console.error('Vote casting error:', error);
      res.status(500).json({ message: 'Failed to cast vote' });
    }
  }
);

// Get vote verification
router.get('/verify/:voteId', authenticateToken, async (req, res) => {
  try {
    const { voteId } = req.params;

    const vote = await Vote.findOne({ voteId });
    if (!vote) {
      return res.status(404).json({ message: 'Vote not found' });
    }

    // Check if user has permission to view this vote
    if (req.userType === 'voter' && vote.voterId !== req.user.voterId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get election for Merkle root (lookup by electionId string)
    const election = await Election.findOne({ electionId: vote.electionId });
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Verify Merkle proof
    const isVerified = MerkleTree.verifyVoteInTree(
      vote.voteHash,
      vote.merkleProof,
      election.merkleRoot
    );

    res.json({
      voteId: vote.voteId,
      electionId: vote.electionId,
      timestamp: vote.timestamp,
      isVerified: isVerified,
      merkleProof: vote.merkleProof,
      merkleRoot: election.merkleRoot
    });

  } catch (error) {
    console.error('Vote verification error:', error);
    res.status(500).json({ message: 'Failed to verify vote' });
  }
});

// Get voter's vote history
router.get('/history', authenticateToken, requireVoter, async (req, res) => {
  try {
    const votes = await Vote.find({ voterId: req.user.voterId })
      .populate('electionId', 'title startDate endDate status')
      .populate('candidateId', 'name party position')
      .select('voteId electionId candidateId position timestamp isVerified')
      .sort({ timestamp: -1 });

    res.json({
      votes: votes,
      totalVotes: votes.length
    });

  } catch (error) {
    console.error('Vote history error:', error);
    res.status(500).json({ message: 'Failed to fetch vote history' });
  }
});

// Get election results (public)
router.get('/results/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;

    // Support both ObjectId and string electionId
    let election = null;
    try {
      election = await Election.findById(electionId);
    } catch (_) { election = null; }
    if (!election) {
      election = await Election.findOne({ electionId });
    }
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Only show results if election is completed or user is admin
    if (election.status !== 'completed' && req.userType !== 'admin') {
      return res.status(403).json({ message: 'Results not available yet' });
    }

    // Aggregate votes by candidateId for this election
    const tallies = await Vote.aggregate([
      { $match: { electionId: election._id } },
      { $group: { _id: '$candidateId', count: { $sum: 1 } } }
    ]);
    const candidateIdToCount = new Map(tallies.map(t => [String(t._id), t.count]));

    // Fetch candidates and attach counts
    const candidatesRaw = await Candidate.find({ electionId: election._id })
      .select('candidateId name party position')
      .lean();
    const candidates = candidatesRaw.map(c => ({
      candidateId: c.candidateId,
      name: c.name,
      party: c.party,
      position: c.position,
      voteCount: candidateIdToCount.get(String(c.candidateId)) || 0
    }));

    // Compute totals and percentages
    const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
    const results = candidates
      .map(c => ({
        ...c,
        percentage: totalVotes > 0 ? (c.voteCount / totalVotes) * 100 : 0
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    res.json({
      election: {
        electionId: election.electionId,
        title: election.title,
        status: election.status,
        startDate: election.startDate,
        endDate: election.endDate,
        registeredVoters: election.totalVoters || 0,
        totalVotes,
        merkleRoot: election.merkleRoot
      },
      results,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Results error:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
});

// Scoped breakdown (ward, village, constituency) per candidate
router.get('/results/:electionId/breakdown', async (req, res) => {
  try {
    const { electionId } = req.params;

    // Resolve election to check status and ids
    let election = null;
    try { election = await Election.findById(electionId); } catch (_) { election = null; }
    if (!election) election = await Election.findOne({ electionId });
    if (!election) return res.status(404).json({ message: 'Election not found' });

    // Only show breakdown if completed or user is admin
    if (election.status !== 'completed' && req.userType !== 'admin') {
      return res.status(403).json({ message: 'Results not available yet' });
    }

    // Helper to run aggregation by a key path in the joined ward
    const buildAgg = (groupKey) => ([
      { $match: { electionId: election.electionId || String(election._id) } },
      { $lookup: { from: 'voters', localField: 'voterId', foreignField: 'voterId', as: 'voter' } },
      { $unwind: '$voter' },
      { $lookup: { from: 'wards', localField: 'voter.wardId', foreignField: '_id', as: 'ward' } },
      { $unwind: '$ward' },
      { $lookup: { from: 'candidates', localField: 'candidateId', foreignField: 'candidateId', as: 'candidate' } },
      { $unwind: '$candidate' },
      { $group: { _id: { scopeId: groupKey, candidateId: '$candidate.candidateId' }, count: { $sum: 1 } } },
      { $project: { _id: 0, scopeId: '$_id.scopeId', candidateId: '$_id.candidateId', count: 1 } }
    ]);

    const [byWard, byVillage, byConstituency] = await Promise.all([
      Vote.aggregate(buildAgg('$ward._id')),
      Vote.aggregate(buildAgg('$ward.villageId')),
      Vote.aggregate(buildAgg('$ward.constituencyId'))
    ]);

    res.json({
      election: {
        electionId: election.electionId,
        title: election.title,
        status: election.status
      },
      byWard,
      byVillage,
      byConstituency,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scoped results error:', error);
    res.status(500).json({ message: 'Failed to fetch scoped results' });
  }
});

// Get real-time vote count
router.get('/count/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    // Support both ObjectId and string electionId
    let totalVotes = 0;
    try {
      const Election = require('../models/Election');
      const el = await Election.findById(electionId).select('_id electionId');
      if (el) {
        totalVotes = await Vote.countDocuments({ electionId: el._id });
      } else {
        const el2 = await Election.findOne({ electionId }).select('_id');
        if (el2) totalVotes = await Vote.countDocuments({ electionId: el2._id });
      }
    } catch (_) {
      const el2 = await Election.findOne({ electionId }).select('_id');
      if (el2) totalVotes = await Vote.countDocuments({ electionId: el2._id });
    }
    
    res.json({
      electionId: electionId,
      totalVotes: totalVotes,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Vote count error:', error);
    res.status(500).json({ message: 'Failed to fetch vote count' });
  }
});

// Audit trail for admin
router.get('/audit/:electionId', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { electionId } = req.params;

    const votes = await Vote.find({ electionId })
      .select('voteId voterId candidateId position timestamp ipAddress isVerified')
      .sort({ timestamp: -1 });

    const election = await Election.findOne({ electionId })
      .select('title startDate endDate totalVotes merkleRoot');

    res.json({
      election: election,
      votes: votes,
      totalVotes: votes.length,
      verifiedVotes: votes.filter(v => v.isVerified).length
    });

  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({ message: 'Failed to fetch audit trail' });
  }
});

module.exports = router;
