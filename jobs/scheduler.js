const cron = require('node-cron');
const { automationConfig } = require('../config/automationConfig');
const {
  analyzeMatchesForDate,
  cleanupTemporaryMatches,
  collectMatchesForDate,
  getRelativeDateString,
  validatePredictionsForDate,
} = require('../services/automation/orchestrator');

let scheduledTasks = [];
const running = new Set();

const guard = (name, fn) => async () => {
  if (running.has(name)) return;
  running.add(name);
  try {
    await fn();
  } catch (error) {
    console.error(`[automation:${name}]`, error.message);
  } finally {
    running.delete(name);
  }
};

const schedule = (name, expression, fn) => {
  const task = cron.schedule(expression, guard(name, fn), {
    scheduled: true,
    timezone: automationConfig.cron.timezone
  });
  scheduledTasks.push(task);
  return task;
};

const startScheduler = () => {
  if (!automationConfig.enabled || !automationConfig.cron.enabled) {
    console.log('⏸️  Automation scheduler disabled');
    return [];
  }

  stopScheduler();

  schedule('collect', automationConfig.cron.collectSchedule, () => {
    const targetDate = getRelativeDateString(automationConfig.cron.collectTargetOffsetDays);
    return collectMatchesForDate(targetDate);
  });

  schedule('analyze', automationConfig.cron.analysisSchedule, () => analyzeMatchesForDate());

  schedule('validate', automationConfig.cron.validationSchedule, () => {
    const targetDate = getRelativeDateString(automationConfig.cron.validationTargetOffsetDays);
    return validatePredictionsForDate(targetDate);
  });

  schedule('cleanup', automationConfig.cron.cleanupSchedule, () => cleanupTemporaryMatches());

  console.log(`🕒 Automation scheduler enabled (${automationConfig.cron.timezone})`);
  return scheduledTasks;
};

const stopScheduler = () => {
  scheduledTasks.forEach((task) => task.stop());
  scheduledTasks = [];
};

module.exports = {
  startScheduler,
  stopScheduler,
};
