const { automationConfig } = require('../../config/automationConfig');
const GeminiProvider = require('./providers/geminiProvider');
const OpenAIProvider = require('./providers/openaiProvider');
const { withRetry } = require('../automation/retry');

const providers = {
  OPENAI: OpenAIProvider,
  GEMINI: GeminiProvider,
};

const getProvider = (providerName = automationConfig.ai.defaultProvider) => {
  const normalized = String(providerName || '').toUpperCase();
  const Provider = providers[normalized];
  if (!Provider) {
    throw new Error(`Unsupported AI provider: ${providerName}`);
  }
  return new Provider();
};

const completeJsonWithProvider = async ({ providerName, model, system, prompt, schema, webSearch }) => {
  const provider = getProvider(providerName);
  return withRetry(
    () => provider.completeJson({ model, system, prompt, schema, webSearch }),
    { retries: automationConfig.ai.maxRetries }
  );
};

module.exports = {
  completeJsonWithProvider,
  getProvider,
};
