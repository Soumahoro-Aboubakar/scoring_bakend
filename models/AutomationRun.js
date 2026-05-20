const mongoose = require('mongoose');

const automationRunSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['collect', 'analyze', 'validate', 'cleanup', 'pipeline'],
    required: true
  },
  status: {
    type: String,
    enum: ['running', 'success', 'partial', 'failed'],
    default: 'running'
  },
  targetDate: { type: String, default: '' },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
  metrics: {
    found: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    analyzed: { type: Number, default: 0 },
    validated: { type: Number, default: 0 },
    deleted: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  providerTrace: {
    provider: { type: String, default: '' },
    model: { type: String, default: '' }
  },
  logs: [{
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    message: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    at: { type: Date, default: Date.now }
  }],
  error: { type: String, default: '' }
}, { timestamps: true });

automationRunSchema.index({ type: 1, startedAt: -1 });
automationRunSchema.index({ targetDate: 1, type: 1 });

module.exports = mongoose.model('AutomationRun', automationRunSchema);
