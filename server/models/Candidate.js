const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  candidateId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  party: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  // Optional separate photo and sign/logo (stored as Data URL or external URL)
  photoUrl: {
    type: String,
    trim: true
  },
  signUrl: {
    type: String,
    trim: true
  },
  manifesto: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  voteCount: {
    type: Number,
    default: 0
  },
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true
  },
  constituencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Constituency',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
candidateSchema.index({ candidateId: 1 });
candidateSchema.index({ electionId: 1 });
candidateSchema.index({ position: 1 });
candidateSchema.index({ constituencyId: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
