const AutomationControl = require('../../models/AutomationControl');
const { automationConfig } = require('../../config/automationConfig');

const DEFAULT_KEY = 'global';

const getAutomationControl = async () => {
  const defaults = {
    key: DEFAULT_KEY,
    schedulerEnabled: automationConfig.cron.enabled,
    collectEnabled: automationConfig.tasks.collect,
    analysisEnabled: automationConfig.tasks.analyze,
    validationEnabled: automationConfig.tasks.validate,
    cleanupEnabled: automationConfig.tasks.cleanup,
  };

  return AutomationControl.findOneAndUpdate(
    { key: DEFAULT_KEY },
    { $setOnInsert: defaults },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
};

const updateAutomationControl = async (patch, updatedBy = '') => {
  const allowed = ['schedulerEnabled', 'collectEnabled', 'analysisEnabled', 'validationEnabled', 'cleanupEnabled'];
  const $set = { updatedBy };

  allowed.forEach((key) => {
    if (typeof patch[key] === 'boolean') $set[key] = patch[key];
  });

  return AutomationControl.findOneAndUpdate(
    { key: DEFAULT_KEY },
    { $set, $setOnInsert: { key: DEFAULT_KEY } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
};

module.exports = {
  getAutomationControl,
  updateAutomationControl,
};
