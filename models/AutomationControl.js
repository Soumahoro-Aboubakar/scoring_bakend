const mongoose = require('mongoose');

const automationControlSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  schedulerEnabled: { type: Boolean, default: true },
  collectEnabled: { type: Boolean, default: true },
  analysisEnabled: { type: Boolean, default: true },
  validationEnabled: { type: Boolean, default: true },
  cleanupEnabled: { type: Boolean, default: true },
  updatedBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('AutomationControl', automationControlSchema);
