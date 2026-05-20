const Match = require('../../models/Match');
const { automationConfig } = require('../../config/automationConfig');

const toDate = (dateString) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return new Date(dateString);
  return date;
};

const getTemporaryExpireAt = () => new Date(Date.now() + automationConfig.data.temporaryTtlHours * 60 * 60 * 1000);

const buildDuplicateQuery = (match) => ({
  'homeTeam.name': match.homeTeam,
  'awayTeam.name': match.awayTeam,
  matchDate: toDate(match.matchDate),
  matchTime: match.matchTime
});

const upsertCollectedMatches = async (matches) => {
  const metrics = { inserted: 0, updated: 0, skipped: 0 };
  const saved = [];

  for (const item of matches.slice(0, automationConfig.data.maxMatchesPerRun)) {
    const query = item.externalId
      ? { 'automation.source.externalId': item.externalId }
      : buildDuplicateQuery(item);

    const update = {
      $setOnInsert: {
        homeTeam: { name: item.homeTeam, code: '' },
        awayTeam: { name: item.awayTeam, code: '' },
        competition: { name: item.competition, type: 'Autre' },
        matchDate: toDate(item.matchDate),
        matchTime: item.matchTime,
        predictions: {
          safe: { label: '', confidence: 0 },
          risky: { label: '', confidence: 0 },
          notBet: false
        },
        odds: 1.5,
        result: { status: 'pending', score: '' },
        'automation.pipelineStatus': 'collected',
        'automation.analysisStatus': 'pending',
        'automation.validationStatus': 'pending',
        'automation.expireAt': getTemporaryExpireAt()
      },
      $set: {
        'automation.collectionStatus': 'collected',
        'automation.source.provider': item.sourceProvider,
        'automation.source.url': item.sourceUrl || '',
        'automation.source.externalId': item.externalId || '',
        'automation.source.confidence': item.confidence || 70,
        'automation.source.collectedAt': new Date(),
        'automation.modelTrace.collectionProvider': automationConfig.ai.collectionProvider,
        'automation.modelTrace.collectionModel': automationConfig.ai.collectionModel
      }
    };

    const before = await Match.findOne(query).select('_id automation.analysisStatus').lean();
    const doc = await Match.findOneAndUpdate(query, update, { upsert: true, new: true, setDefaultsOnInsert: true });

    if (!before) metrics.inserted += 1;
    else if (before.automation?.analysisStatus === 'analyzed') metrics.skipped += 1;
    else metrics.updated += 1;

    saved.push(doc);
  }

  return { metrics, saved };
};

module.exports = {
  getTemporaryExpireAt,
  toDate,
  upsertCollectedMatches,
};
