const Match = require('../../models/Match');
const { automationConfig } = require('../../config/automationConfig');
const { completeJsonWithProvider } = require('../ai/providerFactory');
const { matchAnalysisJsonSchema } = require('./jsonSchemas');
const { matchAnalysisSchema, parseJsonObject } = require('./schemas');
const { clearPublicCache } = require('../../utils/cache');

const buildAnalysisPrompt = (match) => `
Critères configurés:
${automationConfig.criteria.analysis}

Match:
${match.homeTeam.name} vs ${match.awayTeam.name}
Compétition: ${match.competition.name}
Date: ${match.matchDate?.toISOString?.().slice(0, 10)}
Heure: ${match.matchTime}
Source: ${match.automation?.source?.url || 'non fournie'}

Objectif:
Produis une analyse footballistique avancée avec score exact, option principale,
option secondaire, profils tactiques, minimum de buts, probabilités et risques.
Ne retourne que le JSON conforme au schéma.
`;

const analyzeMatch = async (match) => {
  await Match.findByIdAndUpdate(match._id, {
    'automation.analysisStatus': 'analyzing'
  });

  const raw = await completeJsonWithProvider({
    providerName: automationConfig.ai.analysisProvider,
    model: automationConfig.ai.analysisModel,
    system: 'Tu es un analyste football senior. Tu utilises les données web temps réel si disponibles et tu retournes du JSON strict.',
    prompt: buildAnalysisPrompt(match),
    schema: matchAnalysisJsonSchema,
    webSearch: automationConfig.ai.enableWebSearch
  });

  const parsed = matchAnalysisSchema.parse(parseJsonObject(raw));

  const existingPredictions = typeof match.predictions?.toObject === 'function'
    ? match.predictions.toObject()
    : (match.predictions || {});

  const updated = await Match.findByIdAndUpdate(match._id, {
    predictions: {
      ...existingPredictions,
      safe: {
        label: parsed.primary.label,
        confidence: parsed.primary.confidence
      },
      risky: {
        label: parsed.secondary.label,
        confidence: parsed.secondary.confidence
      },
      primary: parsed.primary,
      secondary: parsed.secondary,
      exactScore: parsed.exactScore,
      tacticalProfile: parsed.tacticalProfile,
      goalEstimate: parsed.goalEstimate,
      probabilities: parsed.probabilities,
      analysis: parsed.analysis,
      notBet: false
    },
    explanation: parsed.analysis.summary,
    'automation.pipelineStatus': 'analyzed',
    'automation.analysisStatus': 'analyzed',
    'automation.source.analyzedAt': new Date(),
    'automation.modelTrace.analysisProvider': automationConfig.ai.analysisProvider,
    'automation.modelTrace.analysisModel': automationConfig.ai.analysisModel,
    'automation.expireAt': null
  }, { new: true });

  clearPublicCache();
  return updated;
};

const markAnalysisError = async (matchId, error) => Match.findByIdAndUpdate(matchId, {
  'automation.analysisStatus': 'failed',
  'automation.pipelineStatus': 'failed',
  $push: {
    'automation.errors': {
      stage: 'analysis',
      message: error.message,
      at: new Date()
    }
  }
});

const analyzePendingMatches = async ({ targetDate, limit = automationConfig.data.analysisBatchSize } = {}) => {
  const filter = {
    'automation.analysisStatus': { $in: ['pending', 'failed'] },
    'automation.collectionStatus': 'collected'
  };

  if (targetDate) {
    const start = new Date(`${targetDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.matchDate = { $gte: start, $lt: end };
  }

  const matches = await Match.find(filter)
    .sort({ matchDate: 1, matchTime: 1 })
    .limit(limit);

  const metrics = { analyzed: 0, failed: 0 };
  for (const match of matches) {
    try {
      await analyzeMatch(match);
      metrics.analyzed += 1;
    } catch (error) {
      metrics.failed += 1;
      await markAnalysisError(match._id, error);
    }
  }

  return metrics;
};

module.exports = {
  analyzeMatch,
  analyzePendingMatches,
};
