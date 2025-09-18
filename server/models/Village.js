const mongoose = require('mongoose');

const villageSchema = new mongoose.Schema({
  villageId: {
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
  constituencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Constituency',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

villageSchema.index({ villageId: 1 });
villageSchema.index({ constituencyId: 1 });

module.exports = mongoose.model('Village', villageSchema);


