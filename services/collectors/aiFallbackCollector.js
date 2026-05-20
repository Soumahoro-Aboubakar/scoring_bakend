const { automationConfig } = require('../../config/automationConfig');
const { completeJsonWithProvider } = require('../ai/providerFactory');
const { collectedMatchesJsonSchema } = require('../automation/jsonSchemas');
const { collectedMatchSchema, parseJsonObject } = require('../automation/schemas');
const { makeExternalId } = require('./bbcCollector');

const collectWithAI = async (targetDate, context = {}) => {
  const providerName = automationConfig.ai.collectionProvider;
  const model = automationConfig.ai.collectionModel;
  const trustedSources = automationConfig.sources.trustedFallbackSources.join(', ');

  const prompt = `
Date cible: ${targetDate}
Matchs déjà trouvés: ${JSON.stringify(context.existingMatches || [])}
Sources fiables prioritaires: ${trustedSources}

Recherche les matchs de football programmés pour cette date.
Complète uniquement les rencontres crédibles qui manquent par rapport à la liste fournie.
Chaque match doit contenir homeTeam, awayTeam, competition, matchDate, matchTime, sourceUrl,
externalId, sourceProvider, confidence.
`;

  const raw = await completeJsonWithProvider({
    providerName,
    model,
    system: 'Tu es un collecteur de données football. Tu vérifies les calendriers sur le web et retournes uniquement du JSON strict.',
    prompt,
    schema: collectedMatchesJsonSchema,
    webSearch: automationConfig.ai.enableWebSearch
  });

  const parsed = parseJsonObject(raw);
  const matches = Array.isArray(parsed.matches) ? parsed.matches : [];

  return matches
    .map((item) => ({
      ...item,
      sourceProvider: item.sourceProvider || providerName,
      externalId: item.externalId || makeExternalId({
        homeTeam: item.homeTeam,
        awayTeam: item.awayTeam,
        matchDate: item.matchDate,
        matchTime: item.matchTime,
        competition: item.competition
      })
    }))
    .map((item) => collectedMatchSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data);
};

module.exports = {
  collectWithAI,
};
