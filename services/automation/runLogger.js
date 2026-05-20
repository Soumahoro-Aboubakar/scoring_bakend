const AutomationRun = require('../../models/AutomationRun');
const { automationConfig } = require('../../config/automationConfig');

const createRun = async (type, targetDate = '', providerTrace = {}) => AutomationRun.create({
  type,
  targetDate,
  providerTrace,
});

const appendLog = async (run, level, message, meta = {}) => {
  if (!run) return;
  if (!automationConfig.advancedLogs && level === 'info') return;

  run.logs.push({ level, message, meta });
  await run.save();
};

const finishRun = async (run, status, metrics = {}, error = '') => {
  if (!run) return null;
  run.status = status;
  run.finishedAt = new Date();
  const currentMetrics = typeof run.metrics?.toObject === 'function' ? run.metrics.toObject() : run.metrics;
  run.metrics = { ...currentMetrics, ...metrics };
  run.error = error;
  return run.save();
};

module.exports = {
  appendLog,
  createRun,
  finishRun,
};
