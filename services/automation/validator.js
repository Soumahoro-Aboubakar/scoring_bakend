const Match = require('../../models/Match');
const { automationConfig } = require('../../config/automationConfig');
const { completeJsonWithProvider } = require('../ai/providerFactory');
const { validationJsonSchema } = require('./jsonSchemas');
const { parseJsonObject, validationSchema } = require('./schemas');
const { clearPublicCache } = require('../../utils/cache');

const buildValidationPrompt = (match) => `
Vérifie le résultat réel final de ce match sur le web:
${match.homeTeam.name} vs ${match.awayTeam.name}
Compétition: ${match.competition.name}
Date: ${match.matchDate?.toISOString?.().slice(0, 10)}
Heure: ${match.matchTime}

Prédiction principale: ${match.predictions?.primary?.label || match.predictions?.safe?.label}
Prédiction secondaire: ${match.predictions?.secondary?.label || match.predictions?.risky?.label}
Score exact prédit: ${match.predictions?.exactScore?.label}

Retourne le score final réel, puis indique si l'option principale, l'option secondaire
et le score exact sont corrects. Si le match est reporté/annulé/non joué, utilise resultStatus "notbet".
Retourne uniquement le JSON conforme.
`;

const validateMatch = async (match) => {
  const raw = await completeJsonWithProvider({
    providerName: automationConfig.ai.validationProvider,
    model: automationConfig.ai.validationModel,
    system: 'Tu es un validateur de résultats sportifs. Tu vérifies les scores finaux sur des sources fiables et retournes du JSON strict.',
    prompt: buildValidationPrompt(match),
    schema: validationJsonSchema,
    webSearch: automationConfig.ai.enableWebSearch
  });

  const parsed = validationSchema.parse(parseJsonObject(raw));

  const updated = await Match.findByIdAndUpdate(match._id, {
    result: {
      status: parsed.resultStatus,
      score: parsed.score.replace(/\s+/g, ''),
      homeGoals: parsed.homeGoals,
      awayGoals: parsed.awayGoals
    },
    validation: {
      primaryCorrect: parsed.primaryCorrect,
      secondaryCorrect: parsed.secondaryCorrect,
      exactScoreCorrect: parsed.exactScoreCorrect,
      partialCorrect: parsed.partialCorrect,
      confidenceScore: parsed.confidenceScore,
      summary: parsed.summary,
      checkedAt: new Date(),
      sourceUrl: parsed.sourceUrl || ''
    },
    'automation.pipelineStatus': 'validated',
    'automation.validationStatus': 'validated',
    'automation.source.validatedAt': new Date(),
    'automation.modelTrace.validationProvider': automationConfig.ai.validationProvider,
    'automation.modelTrace.validationModel': automationConfig.ai.validationModel
  }, { new: true });

  clearPublicCache();
  return updated;
};

const markValidationError = async (matchId, error) => Match.findByIdAndUpdate(matchId, {
  'automation.validationStatus': 'failed',
  $push: {
    'automation.errors': {
      stage: 'validation',
      message: error.message,
      at: new Date()
    }
  }
});

const validateMatchesForDate = async ({ targetDate, limit = automationConfig.data.validationBatchSize } = {}) => {
  const filter = {
    'automation.analysisStatus': 'analyzed',
    'automation.validationStatus': { $in: ['pending', 'failed'] }
  };

  if (targetDate) {
    const start = new Date(`${targetDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.matchDate = { $gte: start, $lt: end };
  } else {
    filter.matchDate = { $lt: new Date() };
  }

  const matches = await Match.find(filter)
    .sort({ matchDate: 1, matchTime: 1 })
    .limit(limit);

  const metrics = { validated: 0, failed: 0 };
  for (const match of matches) {
    try {
      await validateMatch(match);
      metrics.validated += 1;
    } catch (error) {
      metrics.failed += 1;
      await markValidationError(match._id, error);
    }
  }

  return metrics;
};

module.exports = {
  validateMatch,
  validateMatchesForDate,
};
