const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema({
  electionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['constituency', 'village', 'ward'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  positions: [{
    type: String,
    required: true
  }],
  totalVoters: {
    type: Number,
    default: 0
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  merkleRoot: {
    type: String,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  wardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true
  },
  constituencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Constituency',
    index: true
  }
}, {
  timestamps: true
});

// Index for faster queries
electionSchema.index({ electionId: 1 });
electionSchema.index({ title: 1 }, { unique: true });
electionSchema.index({ status: 1 });
electionSchema.index({ startDate: 1, endDate: 1 });
electionSchema.index({ wardId: 1 });
electionSchema.index({ villageId: 1 });
electionSchema.index({ constituencyId: 1 });

// Virtual for election duration
electionSchema.virtual('duration').get(function() {
  return this.endDate - this.startDate;
});

// Virtual for time remaining
electionSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  if (now < this.startDate) return this.startDate - now;
  if (now > this.endDate) return 0;
  return this.endDate - now;
});

module.exports = mongoose.model('Election', electionSchema);
