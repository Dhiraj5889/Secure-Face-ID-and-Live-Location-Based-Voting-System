const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const voterSchema = new mongoose.Schema({
  voterId: {
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
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  address: {
    village: { type: String, required: true, trim: true },
    taluka: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true }
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  // Optional facial template hash for Face ID authentication
  faceTemplateHash: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    default: undefined
  },
  // Optional ArcFace embedding (512 numbers). Stored as numbers array; not unique.
  faceEmbedding: {
    type: [Number],
    required: false,
    select: false,
    default: undefined
  },
  // Optional stored face thumbnail (base64 data URL)
  faceImage: {
    type: String,
    required: false,
    default: undefined
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  hasVoted: {
    type: Boolean,
    default: false
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  wardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    index: true
  }
}, {
  timestamps: true
});

// Indexes
voterSchema.index({ voterId: 1 });
voterSchema.index(
  { faceTemplateHash: 1 },
  { unique: true, sparse: true, partialFilterExpression: { faceTemplateHash: { $type: 'string' } } }
);
voterSchema.index({ email: 1 });
voterSchema.index({ wardId: 1 });

// Virtual for voter status
voterSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  if (!this.isVerified) return 'unverified';
  if (this.hasVoted) return 'voted';
  return 'eligible';
});

module.exports = mongoose.model('Voter', voterSchema);
