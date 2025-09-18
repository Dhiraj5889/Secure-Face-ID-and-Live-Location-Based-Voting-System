const mongoose = require('mongoose');
const crypto = require('crypto');

const voteSchema = new mongoose.Schema({
  voteId: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomUUID()
  },
  voterId: {
    type: String,
    required: true,
    ref: 'Voter'
  },
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Election'
  },
  candidateId: {
    type: String,
    required: true,
    ref: 'Candidate'
  },
  boothId: {
    type: String,
    required: true,
    ref: 'Booth'
  },
  position: {
    type: String,
    required: true
  },
  // Encrypted vote data
  encryptedVote: {
    type: String,
    required: true
  },
  // Hash of the vote for integrity
  voteHash: {
    type: String,
    required: true
  },
  // Merkle tree proof (array of { hash, position })
  merkleProof: [
    new mongoose.Schema({
      hash: { type: String, required: true },
      position: { type: String, enum: ['left', 'right'], required: true }
    }, { _id: false })
  ],
  // Timestamp when vote was cast
  timestamp: {
    type: Date,
    default: Date.now
  },
  // IP address for audit trail
  ipAddress: {
    type: String,
    required: true
  },
  // User agent for audit trail
  userAgent: {
    type: String,
    required: true
  },
  // Optional geolocation at time of voting
  location: {
    lat: { type: Number },
    lng: { type: Number },
    accuracy: { type: Number }
  },
  // Vote verification status
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
voteSchema.index({ voteId: 1 });
voteSchema.index({ voterId: 1, electionId: 1 }, { unique: true });
voteSchema.index({ electionId: 1 });
voteSchema.index({ candidateId: 1 });
voteSchema.index({ boothId: 1 });
voteSchema.index({ timestamp: 1 });

// Compound index to prevent duplicate votes
voteSchema.index({ voterId: 1, electionId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
