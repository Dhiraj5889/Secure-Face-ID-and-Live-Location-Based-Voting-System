const mongoose = require('mongoose');

const constituencySchema = new mongoose.Schema({
  constituencyId: {
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
  code: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

constituencySchema.index({ constituencyId: 1 });
constituencySchema.index({ name: 1 });

module.exports = mongoose.model('Constituency', constituencySchema);


