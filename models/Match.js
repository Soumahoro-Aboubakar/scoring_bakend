const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  homeTeam: {
    name: { type: String, required: true },
    code: { type: String, default: '' } // country code for flag (e.g. 'es', 'fr')
  },
  awayTeam: {
    name: { type: String, required: true },
    code: { type: String, default: '' }
  },
  competition: {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['Champions League', 'Premier League', 'Liga', 'Ligue 1', 'Bundesliga', 'Serie A', 'MLS', 'Autre'],
      default: 'Autre'
    }
  },
  matchDate: { type: Date, required: true },
  matchTime: { type: String, required: true }, // "20:00"
  automation: {
    pipelineStatus: {
      type: String,
      enum: ['manual', 'collected', 'analyzed', 'validated', 'failed'],
      default: 'manual'
    },
    collectionStatus: {
      type: String,
      enum: ['pending', 'collected', 'missing_data', 'failed'],
      default: 'pending'
    },
    analysisStatus: {
      type: String,
      enum: ['pending', 'analyzing', 'analyzed', 'failed'],
      default: 'pending'
    },
    validationStatus: {
      type: String,
      enum: ['pending', 'validated', 'failed'],
      default: 'pending'
    },
    source: {
      provider: { type: String, default: 'manual' },
      url: { type: String, default: '' },
      externalId: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      collectedAt: { type: Date, default: null },
      analyzedAt: { type: Date, default: null },
      validatedAt: { type: Date, default: null }
    },
    modelTrace: {
      collectionProvider: { type: String, default: '' },
      collectionModel: { type: String, default: '' },
      analysisProvider: { type: String, default: '' },
      analysisModel: { type: String, default: '' },
      validationProvider: { type: String, default: '' },
      validationModel: { type: String, default: '' }
    },
    errors: [{
      stage: { type: String, default: '' },
      message: { type: String, default: '' },
      at: { type: Date, default: Date.now }
    }],
    expireAt: { type: Date, default: null }
  },
  predictions: {
    safe: {
      label: { type: String, default: '' },
      confidence: { type: Number, default: 0 }
    },
    risky: {
      label: { type: String, default: '' },
      confidence: { type: Number, default: 0 }
    },
    primary: {
      label: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      probability: { type: Number, default: 0 }
    },
    secondary: {
      label: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      probability: { type: Number, default: 0 }
    },
    exactScore: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
      label: { type: String, default: '' },
      confidence: { type: Number, default: 0 }
    },
    tacticalProfile: {
      home: {
        type: {
          type: String,
          enum: ['offensive', 'defensive', 'hybride', 'agressive offensivement', 'prudente defensivement', 'equilibree'],
          default: 'equilibree'
        },
        explanation: { type: String, default: '' }
      },
      away: {
        type: {
          type: String,
          enum: ['offensive', 'defensive', 'hybride', 'agressive offensivement', 'prudente defensivement', 'equilibree'],
          default: 'equilibree'
        },
        explanation: { type: String, default: '' }
      }
    },
    goalEstimate: {
      minimumGoals: { type: Number, default: 1 },
      label: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      cleanSheetProbability: { type: Number, default: 0 }
    },
    probabilities: {
      homeWin: { type: Number, default: 0 },
      draw: { type: Number, default: 0 },
      awayWin: { type: Number, default: 0 },
      over25: { type: Number, default: 0 },
      bothTeamsScore: { type: Number, default: 0 }
    },
    analysis: {
      summary: { type: String, default: '' },
      logic: { type: String, default: '' },
      statistics: { type: String, default: '' },
      recentForm: { type: String, default: '' },
      offensivePower: { type: String, default: '' },
      defensiveStability: { type: String, default: '' },
      trends: { type: String, default: '' },
      risks: { type: String, default: '' }
    },
    notBet: { type: Boolean, default: false }
  },
  explanation: { type: String, default: '' },
  odds: { type: Number, default: 1.5 },
  result: {
    status: {
      type: String,
      enum: ['pending', 'won', 'lost', 'notbet'],
      default: 'pending'
    },
    score: { type: String, default: '' },
    homeGoals: { type: Number, default: null },
    awayGoals: { type: Number, default: null }
  },
  validation: {
    primaryCorrect: { type: Boolean, default: null },
    secondaryCorrect: { type: Boolean, default: null },
    exactScoreCorrect: { type: Boolean, default: null },
    partialCorrect: { type: Boolean, default: null },
    confidenceScore: { type: Number, default: 0 },
    summary: { type: String, default: '' },
    checkedAt: { type: Date, default: null },
    sourceUrl: { type: String, default: '' }
  },
  isDailyTicket: { type: Boolean, default: false }
}, { timestamps: true });

matchSchema.index({ matchDate: 1, matchTime: 1 });
matchSchema.index({ 'predictions.safe.confidence': -1, matchDate: 1 });
matchSchema.index({ isDailyTicket: 1, matchDate: 1 });
matchSchema.index({ 'result.status': 1, matchDate: -1 });
matchSchema.index({ 'homeTeam.name': 'text', 'awayTeam.name': 'text', 'competition.name': 'text', 'predictions.safe.label': 'text' });
matchSchema.index({ 'automation.pipelineStatus': 1, matchDate: 1 });
matchSchema.index({ 'automation.analysisStatus': 1, matchDate: 1 });
matchSchema.index({ 'automation.validationStatus': 1, matchDate: 1 });
matchSchema.index({ 'automation.source.externalId': 1 }, { sparse: true });
matchSchema.index({ 'automation.expireAt': 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Match', matchSchema);
