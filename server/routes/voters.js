const express = require('express');
const Voter = require('../models/Voter');
const { authenticateToken, requireAdmin, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get all voters (admin only)
router.get('/', authenticateToken, requireAdmin, requirePermission('manage_voters'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const filter = {};
    
    if (status) {
      switch (status) {
        case 'verified':
          filter.isVerified = true;
          break;
        case 'unverified':
          filter.isVerified = false;
          break;
        case 'voted':
          filter.hasVoted = true;
          break;
        case 'active':
          filter.isActive = true;
          break;
        case 'inactive':
          filter.isActive = false;
          break;
      }
    }

    if (search) {
      filter.$or = [
        { voterId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const voters = await Voter.find(filter)
      .select('voterId name email phone dob address isVerified hasVoted isActive registrationDate lastLogin wardId constituencyId')
      .populate({ 
        path: 'wardId', 
        select: 'name constituencyId',
        populate: { path: 'constituencyId', select: 'name' }
      })
      .sort({ registrationDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Voter.countDocuments(filter);

    res.json({
      voters: voters,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total: total
    });

  } catch (error) {
    console.error('Get voters error:', error);
    res.status(500).json({ message: 'Failed to fetch voters' });
  }
});

// Get single voter
router.get('/:voterId', authenticateToken, async (req, res) => {
  try {
    const { voterId } = req.params;

    // Check if user has permission to view this voter
    if (req.userType === 'voter' && req.user.voterId !== voterId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const voter = await Voter.findOne({ voterId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    // Don't return sensitive data for non-admin users
    const voterData = {
      voterId: voter.voterId,
      name: voter.name,
      email: voter.email,
      phone: voter.phone,
      isVerified: voter.isVerified,
      hasVoted: voter.hasVoted,
      registrationDate: voter.registrationDate,
      lastLogin: voter.lastLogin,
      status: voter.status
    };

    // Include additional data for admin users
    if (req.userType === 'admin') {
      voterData.isActive = voter.isActive;
      voterData.fingerprintHash = voter.fingerprintHash;
    }

    res.json({ voter: voterData });

  } catch (error) {
    console.error('Get voter error:', error);
    res.status(500).json({ message: 'Failed to fetch voter' });
  }
});

// Verify voter (admin only)
router.post('/:voterId/verify', authenticateToken, requireAdmin, requirePermission('manage_voters'), async (req, res) => {
  try {
    const { voterId } = req.params;

    const voter = await Voter.findOne({ voterId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    if (voter.isVerified) {
      return res.status(400).json({ message: 'Voter is already verified' });
    }

    voter.isVerified = true;
    await voter.save();

    res.json({
      message: 'Voter verified successfully',
      voter: {
        voterId: voter.voterId,
        name: voter.name,
        isVerified: voter.isVerified
      }
    });

  } catch (error) {
    console.error('Verify voter error:', error);
    res.status(500).json({ message: 'Failed to verify voter' });
  }
});

// Unverify voter (admin only)
router.post('/:voterId/unverify', authenticateToken, requireAdmin, requirePermission('manage_voters'), async (req, res) => {
  try {
    const { voterId } = req.params;

    const voter = await Voter.findOne({ voterId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    if (!voter.isVerified) {
      return res.status(400).json({ message: 'Voter is not verified' });
    }

    voter.isVerified = false;
    await voter.save();

    res.json({
      message: 'Voter unverified successfully',
      voter: {
        voterId: voter.voterId,
        name: voter.name,
        isVerified: voter.isVerified
      }
    });

  } catch (error) {
    console.error('Unverify voter error:', error);
    res.status(500).json({ message: 'Failed to unverify voter' });
  }
});

// Activate/Deactivate voter (admin only)
router.post('/:voterId/toggle-status', authenticateToken, requireAdmin, requirePermission('manage_voters'), async (req, res) => {
  try {
    const { voterId } = req.params;

    const voter = await Voter.findOne({ voterId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    voter.isActive = !voter.isActive;
    await voter.save();

    res.json({
      message: `Voter ${voter.isActive ? 'activated' : 'deactivated'} successfully`,
      voter: {
        voterId: voter.voterId,
        name: voter.name,
        isActive: voter.isActive
      }
    });

  } catch (error) {
    console.error('Toggle voter status error:', error);
    res.status(500).json({ message: 'Failed to toggle voter status' });
  }
});

// Update voter profile
router.put('/:voterId', authenticateToken, async (req, res) => {
  try {
    const { voterId } = req.params;
    const updates = req.body;

    // Check if user has permission to update this voter
    if (req.userType === 'voter' && req.user.voterId !== voterId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const voter = await Voter.findOne({ voterId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    // Define allowed updates based on user type
    const allowedUpdates = req.userType === 'admin' 
      ? ['name', 'email', 'phone', 'isVerified', 'isActive']
      : ['name', 'email', 'phone'];

    const updateData = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Check for email uniqueness
    if (updateData.email && updateData.email !== voter.email) {
      const existingVoter = await Voter.findOne({ email: updateData.email });
      if (existingVoter) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const updatedVoter = await Voter.findOneAndUpdate(
      { voterId },
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Voter updated successfully',
      voter: {
        voterId: updatedVoter.voterId,
        name: updatedVoter.name,
        email: updatedVoter.email,
        phone: updatedVoter.phone,
        isVerified: updatedVoter.isVerified,
        hasVoted: updatedVoter.hasVoted
      }
    });

  } catch (error) {
    console.error('Update voter error:', error);
    res.status(500).json({ message: 'Failed to update voter' });
  }
});

// Get voter statistics (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, requirePermission('manage_voters'), async (req, res) => {
  try {
    const totalVoters = await Voter.countDocuments();
    const verifiedVoters = await Voter.countDocuments({ isVerified: true });
    const activeVoters = await Voter.countDocuments({ isActive: true });
    const votedVoters = await Voter.countDocuments({ hasVoted: true });

    // Registration trends
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

    res.json({
      statistics: {
        totalVoters: totalVoters,
        verifiedVoters: verifiedVoters,
        activeVoters: activeVoters,
        votedVoters: votedVoters,
        verificationRate: totalVoters > 0 ? (verifiedVoters / totalVoters * 100).toFixed(2) : 0,
        votingRate: totalVoters > 0 ? (votedVoters / totalVoters * 100).toFixed(2) : 0
      },
      registrationTrends: registrationTrends
    });

  } catch (error) {
    console.error('Voter stats error:', error);
    res.status(500).json({ message: 'Failed to fetch voter statistics' });
  }
});

// Delete voter (admin only)
router.delete('/:voterId', authenticateToken, requireAdmin, requirePermission('manage_voters'), async (req, res) => {
  try {
    const { voterId } = req.params;

    const voter = await Voter.findOne({ voterId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    // Check if voter has voted
    if (voter.hasVoted) {
      return res.status(400).json({ message: 'Cannot delete voter who has already voted' });
    }

    await Voter.findByIdAndDelete(voter._id);

    res.json({ message: 'Voter deleted successfully' });

  } catch (error) {
    console.error('Delete voter error:', error);
    res.status(500).json({ message: 'Failed to delete voter' });
  }
});

module.exports = router;

// BULK DELETE ALL VOTERS (admin only; dangerous)
// Usage: DELETE /api/voters/all?confirm=yes[&force=true]
// If force is not true, voters with hasVoted=true will be preserved.
router.delete('/all', authenticateToken, requireAdmin, requirePermission('manage_voters'), async (req, res) => {
  try {
    const { confirm, force } = req.query;
    if (confirm !== 'yes') {
      return res.status(400).json({ message: "Add ?confirm=yes to proceed" });
    }

    const filter = force === 'true' ? {} : { hasVoted: { $ne: true } };
    const result = await Voter.deleteMany(filter);

    res.json({ message: 'Voters deleted', deletedCount: result.deletedCount, force: force === 'true' });
  } catch (error) {
    console.error('Bulk delete voters error:', error);
    res.status(500).json({ message: 'Failed to delete voters' });
  }
});
