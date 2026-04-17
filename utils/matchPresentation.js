const getRecommendationType = (label = '') => {
  const normalized = label.toLowerCase();

  if (!normalized) return 'AUTRE';
  if (normalized.includes('double chance')) return 'VN';
  if (normalized.includes('nul') && normalized.includes('victoire')) return 'VN';
  if (normalized.includes('nul')) return 'N';
  if (normalized.includes('victoire') || normalized.includes('gagne')) return 'V';

  return 'AUTRE';
};

const getRecommendationLabel = (type) => {
  if (type === 'V') return 'Victoire';
  if (type === 'N') return 'Nul';
  if (type === 'VN') return 'Victoire ou Nul';
  return 'Autre option';
};

const getMatchStatusLabel = (status = 'pending') => {
  if (status === 'won') return 'Gagné';
  if (status === 'lost') return 'Perdu';
  if (status === 'notbet') return 'No Bet';
  return 'À venir';
};

const serializeMatch = (match) => {
  const data = typeof match.toObject === 'function' ? match.toObject() : match;
  const recommendationType = getRecommendationType(data.predictions?.safe?.label);
  const confidence = data.predictions?.safe?.confidence || 0;

  return {
    ...data,
    recommendationType,
    recommendationLabel: getRecommendationLabel(recommendationType),
    displayStatus: getMatchStatusLabel(data.result?.status),
    topMatch: confidence >= 80 && !data.predictions?.notBet,
  };
};

module.exports = {
  getRecommendationType,
  getRecommendationLabel,
  getMatchStatusLabel,
  serializeMatch,
};
