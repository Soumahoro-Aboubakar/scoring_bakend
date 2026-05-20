const parseBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseIntEnv = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseList = (value, fallback = []) => {
  if (!value) return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const defaultAnalysisCriteria = `
Tu analyses des matchs de football avec un niveau professionnel.
Critères obligatoires: forme récente, domicile/extérieur, puissance offensive,
stabilité défensive, calendrier, blessures/suspensions si disponibles,
confrontations directes, motivation, tendances buts, risque de rotation,
probabilités 1/N/2, over 2.5, BTTS et risque global.
Retourne uniquement un JSON valide conforme au schéma demandé.
`;

const automationConfig = {
  enabled: parseBool(process.env.AUTOMATION_ENABLED, true),
  advancedLogs: parseBool(process.env.ADVANCED_LOGS_ENABLED, false),
  cron: {
    enabled: parseBool(process.env.CRON_JOBS_ENABLED, false),
    timezone: process.env.CRON_TIMEZONE || process.env.TZ || 'UTC',
    collectSchedule: process.env.COLLECT_CRON || '0 10,18 * * *',
    analysisSchedule: process.env.ANALYSIS_CRON || '5 10,18 * * *',
    validationSchedule: process.env.VALIDATION_CRON || '30 11,20 * * *',
    cleanupSchedule: process.env.CLEANUP_CRON || '15 3 * * *',
    collectTargetOffsetDays: parseIntEnv(process.env.COLLECT_TARGET_OFFSET_DAYS, 1),
    validationTargetOffsetDays: parseIntEnv(process.env.VALIDATION_TARGET_OFFSET_DAYS, -1),
  },
  tasks: {
    collect: parseBool(process.env.COLLECT_ENABLED, true),
    analyze: parseBool(process.env.ANALYSIS_ENABLED, true),
    validate: parseBool(process.env.VALIDATION_ENABLED, true),
    cleanup: parseBool(process.env.CLEANUP_ENABLED, true),
  },
  ai: {
    defaultProvider: (process.env.AI_PROVIDER || process.env.DEFAULT_PROVIDER || 'OPENAI').toUpperCase(),
    collectionProvider: (process.env.COLLECTION_AI_PROVIDER || process.env.AI_PROVIDER || 'OPENAI').toUpperCase(),
    analysisProvider: (process.env.ANALYSIS_AI_PROVIDER || process.env.AI_PROVIDER || 'OPENAI').toUpperCase(),
    validationProvider: (process.env.VALIDATION_AI_PROVIDER || process.env.AI_PROVIDER || 'OPENAI').toUpperCase(),
    defaultModel: process.env.DEFAULT_MODEL || 'gpt-5.4-mini',
    collectionModel: process.env.COLLECTION_MODEL || process.env.DEFAULT_MODEL || 'gpt-5.4-mini',
    analysisModel: process.env.ANALYSIS_MODEL || 'gpt-5.5',
    validationModel: process.env.VALIDATION_MODEL || 'gpt-5.4-mini',
    enableWebSearch: parseBool(process.env.AI_WEB_SEARCH_ENABLED, true),
    maxRetries: parseIntEnv(process.env.AI_MAX_RETRIES, 2),
  },
  sources: {
    bbcBaseUrl: process.env.BBC_FIXTURES_BASE_URL || 'https://www.bbc.com/sport/football/scores-fixtures',
    trustedFallbackSources: parseList(process.env.TRUSTED_FALLBACK_SOURCES, [
      'bbc.com',
      'espn.com',
      'skysports.com',
      'flashscore.com',
      'sofascore.com',
    ]),
  },
  data: {
    temporaryTtlHours: parseIntEnv(process.env.COLLECTED_TEMP_TTL_HOURS, 48),
    maxMatchesPerRun: parseIntEnv(process.env.MAX_MATCHES_PER_RUN, 80),
    analysisBatchSize: parseIntEnv(process.env.ANALYSIS_BATCH_SIZE, 8),
    validationBatchSize: parseIntEnv(process.env.VALIDATION_BATCH_SIZE, 60),
    minBbcMatchesBeforeFallback: parseIntEnv(process.env.MIN_BBC_MATCHES_BEFORE_FALLBACK, 5),
  },
  criteria: {
    analysis: process.env.ANALYSIS_CRITERIA || defaultAnalysisCriteria,
  },
};

module.exports = {
  automationConfig,
  parseBool,
};
