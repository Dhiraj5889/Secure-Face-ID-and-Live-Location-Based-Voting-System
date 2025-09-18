const mongoose = require('mongoose');
const crypto = require('crypto');

const boothSchema = new mongoose.Schema({
	boothId: {
		type: String,
		required: true,
		unique: true,
		default: () => `BOOTH-${crypto.randomUUID().slice(0,8).toUpperCase()}`
	},
	name: {
		type: String,
		required: true,
		trim: true
	},
	location: {
		type: String,
		trim: true,
		default: ''
	},
	electionId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'Election'
	},
	isActive: {
		type: Boolean,
		default: true
	}
}, { timestamps: true });

boothSchema.index({ electionId: 1 });
boothSchema.index({ boothId: 1 }, { unique: true });

module.exports = mongoose.model('Booth', boothSchema);


