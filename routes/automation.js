const express = require('express');
const AutomationRun = require('../models/AutomationRun');
const Match = require('../models/Match');
const { authMiddleware } = require('../middleware/auth');
const { automationConfig } = require('../config/automationConfig');
const {
  analyzeMatchesForDate,
  cleanupTemporaryMatches,
  collectMatchesForDate,
  runFullPipeline,
  validatePredictionsForDate,
} = require('../services/automation/orchestrator');

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  return next();
};

router.get('/config', authMiddleware, requireAdmin, (req, res) => {
  res.json({
    enabled: automationConfig.enabled,
    cron: automationConfig.cron,
    tasks: automationConfig.tasks,
    ai: {
      defaultProvider: automationConfig.ai.defaultProvider,
      collectionProvider: automationConfig.ai.collectionProvider,
      analysisProvider: automationConfig.ai.analysisProvider,
      validationProvider: automationConfig.ai.validationProvider,
      defaultModel: automationConfig.ai.defaultModel,
      collectionModel: automationConfig.ai.collectionModel,
      analysisModel: automationConfig.ai.analysisModel,
      validationModel: automationConfig.ai.validationModel,
      enableWebSearch: automationConfig.ai.enableWebSearch,
    },
    data: automationConfig.data,
    sources: automationConfig.sources,
  });
});

router.get('/runs', authMiddleware, requireAdmin, async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 30, 100);
  const runs = await AutomationRun.find()
    .sort({ startedAt: -1 })
    .limit(limit)
    .lean();
  res.json({ runs });
});

router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
  const [collected, analyzed, validated, failed] = await Promise.all([
    Match.countDocuments({ 'automation.pipelineStatus': 'collected' }),
    Match.countDocuments({ 'automation.pipelineStatus': 'analyzed' }),
    Match.countDocuments({ 'automation.pipelineStatus': 'validated' }),
    Match.countDocuments({ 'automation.pipelineStatus': 'failed' }),
  ]);
  res.json({ collected, analyzed, validated, failed });
});

router.post('/collect', authMiddleware, requireAdmin, async (req, res) => {
  const run = await collectMatchesForDate(req.body?.targetDate);
  res.json(run);
});

router.post('/analyze', authMiddleware, requireAdmin, async (req, res) => {
  const run = await analyzeMatchesForDate(req.body?.targetDate);
  res.json(run);
});

router.post('/validate', authMiddleware, requireAdmin, async (req, res) => {
  const run = await validatePredictionsForDate(req.body?.targetDate);
  res.json(run);
});

router.post('/cleanup', authMiddleware, requireAdmin, async (req, res) => {
  const run = await cleanupTemporaryMatches();
  res.json(run);
});

router.post('/pipeline', authMiddleware, requireAdmin, async (req, res) => {
  const run = await runFullPipeline(req.body?.targetDate);
  res.json(run);
});

module.exports = router;
