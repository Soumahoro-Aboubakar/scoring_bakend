const Match = require('../../models/Match');
const { automationConfig } = require('../../config/automationConfig');
const { collectBBCMatches } = require('../collectors/bbcCollector');
const { collectWithAI } = require('../collectors/aiFallbackCollector');
const { upsertCollectedMatches } = require('./matchPersistence');
const { analyzePendingMatches } = require('./analyzer');
const { validateMatchesForDate } = require('./validator');
const { appendLog, createRun, finishRun } = require('./runLogger');

const toDateString = (date) => date.toISOString().slice(0, 10);

const getRelativeDateString = (offsetDays = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return toDateString(date);
};

const collectMatchesForDate = async (targetDate = getRelativeDateString(automationConfig.cron.collectTargetOffsetDays)) => {
  const run = await createRun('collect', targetDate, {
    provider: automationConfig.ai.collectionProvider,
    model: automationConfig.ai.collectionModel
  });

  try {
    let matches = [];
    if (automationConfig.tasks.collect) {
      matches = await collectBBCMatches(targetDate);
      await appendLog(run, 'info', 'BBC collection finished', { found: matches.length });
    }

    if (matches.length < automationConfig.data.minBbcMatchesBeforeFallback && automationConfig.ai.enableWebSearch) {
      const fallbackMatches = await collectWithAI(targetDate, { existingMatches: matches });
      matches = [...matches, ...fallbackMatches];
      await appendLog(run, 'info', 'AI fallback collection finished', { found: fallbackMatches.length });
    }

    const seen = new Set();
    const uniqueMatches = matches.filter((match) => {
      const key = `${match.homeTeam}|${match.awayTeam}|${match.matchDate}|${match.matchTime}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const { metrics } = await upsertCollectedMatches(uniqueMatches);
    return finishRun(run, 'success', { found: uniqueMatches.length, ...metrics });
  } catch (error) {
    await appendLog(run, 'error', error.message);
    return finishRun(run, 'failed', { failed: 1 }, error.message);
  }
};

const analyzeMatchesForDate = async (targetDate) => {
  const run = await createRun('analyze', targetDate || '', {
    provider: automationConfig.ai.analysisProvider,
    model: automationConfig.ai.analysisModel
  });

  try {
    if (!automationConfig.tasks.analyze) {
      return finishRun(run, 'success', { skipped: 1 });
    }
    const metrics = await analyzePendingMatches({ targetDate });
    return finishRun(run, metrics.failed ? 'partial' : 'success', metrics);
  } catch (error) {
    await appendLog(run, 'error', error.message);
    return finishRun(run, 'failed', { failed: 1 }, error.message);
  }
};

const validatePredictionsForDate = async (targetDate = getRelativeDateString(automationConfig.cron.validationTargetOffsetDays)) => {
  const run = await createRun('validate', targetDate, {
    provider: automationConfig.ai.validationProvider,
    model: automationConfig.ai.validationModel
  });

  try {
    if (!automationConfig.tasks.validate) {
      return finishRun(run, 'success', { skipped: 1 });
    }
    const metrics = await validateMatchesForDate({ targetDate });
    return finishRun(run, metrics.failed ? 'partial' : 'success', metrics);
  } catch (error) {
    await appendLog(run, 'error', error.message);
    return finishRun(run, 'failed', { failed: 1 }, error.message);
  }
};

const cleanupTemporaryMatches = async () => {
  const run = await createRun('cleanup');
  try {
    if (!automationConfig.tasks.cleanup) {
      return finishRun(run, 'success', { skipped: 1 });
    }

    const cutoff = new Date(Date.now() - automationConfig.data.temporaryTtlHours * 60 * 60 * 1000);
    const result = await Match.deleteMany({
      'automation.analysisStatus': { $ne: 'analyzed' },
      'automation.source.collectedAt': { $lt: cutoff }
    });

    return finishRun(run, 'success', { deleted: result.deletedCount || 0 });
  } catch (error) {
    await appendLog(run, 'error', error.message);
    return finishRun(run, 'failed', { failed: 1 }, error.message);
  }
};

const runFullPipeline = async (targetDate = getRelativeDateString(automationConfig.cron.collectTargetOffsetDays)) => {
  const run = await createRun('pipeline', targetDate);
  try {
    const collectRun = await collectMatchesForDate(targetDate);
    const analysisRun = await analyzeMatchesForDate(targetDate);
    const status = collectRun.status === 'failed' || analysisRun.status === 'failed' ? 'partial' : 'success';
    return finishRun(run, status, {
      found: collectRun.metrics?.found || 0,
      inserted: collectRun.metrics?.inserted || 0,
      updated: collectRun.metrics?.updated || 0,
      analyzed: analysisRun.metrics?.analyzed || 0,
      failed: (collectRun.metrics?.failed || 0) + (analysisRun.metrics?.failed || 0)
    });
  } catch (error) {
    await appendLog(run, 'error', error.message);
    return finishRun(run, 'failed', { failed: 1 }, error.message);
  }
};

module.exports = {
  analyzeMatchesForDate,
  cleanupTemporaryMatches,
  collectMatchesForDate,
  getRelativeDateString,
  runFullPipeline,
  validatePredictionsForDate,
};
