const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, options = {}) => {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 750;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await sleep(baseDelayMs * (attempt + 1));
    }
  }

  throw lastError;
};

module.exports = { withRetry };
