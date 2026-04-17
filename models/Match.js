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
  predictions: {
    safe: {
      label: { type: String, default: '' },
      confidence: { type: Number, default: 0 }
    },
    risky: {
      label: { type: String, default: '' },
      confidence: { type: Number, default: 0 }
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
    score: { type: String, default: '' }
  },
  isDailyTicket: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
