const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  partyId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  shortName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  symbol: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#000000',
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  foundedYear: {
    type: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalCandidates: {
    type: Number,
    default: 0
  },
  totalVotes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
partySchema.index({ partyId: 1 });
partySchema.index({ name: 1 }, { unique: true });
partySchema.index({ shortName: 1 }, { unique: true });

module.exports = mongoose.model('Party', partySchema);
