const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema({
  wardId: {
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
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
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

wardSchema.index({ wardId: 1 });
wardSchema.index({ villageId: 1 });
wardSchema.index({ constituencyId: 1 });

module.exports = mongoose.model('Ward', wardSchema);


