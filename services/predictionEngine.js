const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value || 0)));

const normalizeLabel = (value = '') => value.toString().toLowerCase();

const formatProfile = (profile = 'equilibree') => {
  const labels = {
    offensive: 'Offensive',
    defensive: 'Défensive',
    hybride: 'Hybride',
    'agressive offensivement': 'Agressive offensivement',
    'prudente defensivement': 'Prudente défensivement',
    equilibree: 'Équilibrée',
  };
  return labels[profile] || labels.equilibree;
};

const inferExactScore = ({ primaryLabel, secondaryLabel, confidence }) => {
  const combined = normalizeLabel(`${primaryLabel} ${secondaryLabel}`);

  if (combined.includes('plus de 3.5') || combined.includes('over 3.5')) {
    return { home: 3, away: 1, label: '3-1', confidence: clamp(confidence - 16, 35, 74) };
  }

  if (combined.includes('plus de 2.5') || combined.includes('over 2.5')) {
    return { home: 2, away: 1, label: '2-1', confidence: clamp(confidence - 14, 38, 76) };
  }

  if (combined.includes('moins de 2.5') || combined.includes('under 2.5') || combined.includes('clean sheet')) {
    return { home: 1, away: 0, label: '1-0', confidence: clamp(confidence - 12, 40, 78) };
  }

  if (combined.includes('nul')) {
    return { home: 1, away: 1, label: '1-1', confidence: clamp(confidence - 12, 38, 76) };
  }

  if (combined.includes('extérieur') || combined.includes('away')) {
    return { home: 1, away: 2, label: '1-2', confidence: clamp(confidence - 14, 36, 75) };
  }

  return { home: 2, away: 1, label: '2-1', confidence: clamp(confidence - 10, 42, 78) };
};

const inferProbabilities = ({ primaryLabel, secondaryLabel, confidence }) => {
  const combined = normalizeLabel(`${primaryLabel} ${secondaryLabel}`);
  const base = clamp(confidence, 45, 92);
  const probabilities = {
    homeWin: 44,
    draw: 28,
    awayWin: 28,
    over25: 48,
    bothTeamsScore: 46,
  };

  if (combined.includes('domicile') || combined.includes('équipe a') || combined.includes('equipe a')) {
    probabilities.homeWin = base;
    probabilities.draw = clamp((100 - base) * 0.45, 8, 32);
    probabilities.awayWin = clamp(100 - probabilities.homeWin - probabilities.draw, 6, 38);
  } else if (combined.includes('extérieur') || combined.includes('exterieur') || combined.includes('away')) {
    probabilities.awayWin = base;
    probabilities.draw = clamp((100 - base) * 0.45, 8, 32);
    probabilities.homeWin = clamp(100 - probabilities.awayWin - probabilities.draw, 6, 38);
  } else if (combined.includes('nul')) {
    probabilities.draw = clamp(base, 35, 64);
    probabilities.homeWin = clamp((100 - probabilities.draw) * 0.52, 18, 38);
    probabilities.awayWin = clamp(100 - probabilities.draw - probabilities.homeWin, 16, 38);
  } else if (combined.includes('victoire')) {
    probabilities.homeWin = base;
    probabilities.draw = clamp((100 - base) * 0.5, 10, 30);
    probabilities.awayWin = clamp(100 - probabilities.homeWin - probabilities.draw, 8, 34);
  }

  if (combined.includes('plus de 2.5') || combined.includes('over 2.5')) {
    probabilities.over25 = clamp(base + 4, 55, 88);
    probabilities.bothTeamsScore = clamp(base - 6, 48, 78);
  } else if (combined.includes('moins de 2.5') || combined.includes('under 2.5')) {
    probabilities.over25 = clamp(100 - base, 18, 45);
    probabilities.bothTeamsScore = clamp(100 - base + 8, 24, 50);
  }

  return probabilities;
};

const inferGoalEstimate = ({ primaryLabel, secondaryLabel, confidence, exactScore }) => {
  const combined = normalizeLabel(`${primaryLabel} ${secondaryLabel}`);
  const expectedGoals = (exactScore?.home || 0) + (exactScore?.away || 0);
  const minimumGoals = combined.includes('moins') || combined.includes('under') ? 1 : Math.max(1, Math.min(3, expectedGoals - 1));
  const cleanSheetProbability = exactScore?.home === 0 || exactScore?.away === 0 ? clamp(confidence - 8, 35, 78) : clamp(100 - confidence + 12, 18, 48);

  let label = `Minimum ${minimumGoals} but${minimumGoals > 1 ? 's' : ''} estimé${minimumGoals > 1 ? 's' : ''}`;
  if (cleanSheetProbability >= 65) label = 'Forte probabilité de clean sheet';
  if (confidence < 45) label = 'Faible probabilité de marquer';

  return {
    minimumGoals,
    label,
    confidence: clamp(confidence - 6, 35, 86),
    cleanSheetProbability,
  };
};

const inferTacticalProfile = ({ teamName, side, primaryLabel, secondaryLabel, exactScore, confidence }) => {
  const combined = normalizeLabel(`${primaryLabel} ${secondaryLabel}`);
  const goals = side === 'home' ? exactScore.home : exactScore.away;
  const conceded = side === 'home' ? exactScore.away : exactScore.home;

  let type = 'equilibree';
  if (goals >= 3 || combined.includes('plus de 2.5') || combined.includes('over 2.5')) type = 'agressive offensivement';
  else if (goals >= 2 && confidence >= 70) type = 'offensive';
  else if (conceded === 0 || combined.includes('moins de 2.5') || combined.includes('under 2.5')) type = 'prudente defensivement';
  else if (goals === conceded) type = 'hybride';

  return {
    type,
    label: formatProfile(type),
    explanation: `${teamName || 'Cette équipe'} reçoit le profil ${formatProfile(type).toLowerCase()} car le modèle combine l'option recommandée, le score exact attendu (${exactScore.label}) et un niveau de confiance de ${clamp(confidence)}%.`,
  };
};

const buildAnalysis = ({ data, primary, secondary, exactScore, goalEstimate, probabilities, homeProfile, awayProfile }) => {
  const home = data.homeTeam?.name || 'Domicile';
  const away = data.awayTeam?.name || 'Extérieur';
  const confidence = primary.confidence || 0;
  const odds = Number(data.odds || 0).toFixed(2);
  const existing = data.predictions?.analysis || {};

  return {
    summary: existing.summary || `Le scénario privilégié pour ${home} vs ${away} est ${primary.label}, avec une projection de score exact ${exactScore.label}.`,
    logic: existing.logic || `La recommandation principale est pondérée par la confiance (${confidence}%), la cote (${odds}) et la cohérence avec l'option secondaire (${secondary.label || 'non définie'}).`,
    statistics: existing.statistics || `Probabilités estimées: victoire domicile ${probabilities.homeWin}%, nul ${probabilities.draw}%, victoire extérieur ${probabilities.awayWin}%, plus de 2.5 buts ${probabilities.over25}%.`,
    recentForm: existing.recentForm || `La dynamique récente est interprétée via la stabilité du pronostic, la date du match et le niveau de risque associé à l'option choisie.`,
    offensivePower: existing.offensivePower || `${home} est classé ${homeProfile.label.toLowerCase()} et ${away} ${awayProfile.label.toLowerCase()}, ce qui oriente le volume offensif attendu vers ${goalEstimate.label.toLowerCase()}.`,
    defensiveStability: existing.defensiveStability || `La probabilité de clean sheet est estimée à ${goalEstimate.cleanSheetProbability}%, utilisée pour calibrer le score exact et le minimum de buts.`,
    trends: existing.trends || `Les tendances favorisent ${primary.label}, tandis que ${secondary.label || "l'option secondaire"} sert de couverture tactique si le match devient plus ouvert ou plus fermé que prévu.`,
    risks: existing.risks || `Risque principal: variance élevée du football, carton rouge, rotation d'effectif ou but précoce pouvant déplacer le match hors du scénario attendu.`,
  };
};

const enrichPrediction = (matchData) => {
  const data = typeof matchData.toObject === 'function' ? matchData.toObject() : { ...matchData };
  const predictions = data.predictions || {};
  const primary = {
    label: predictions.primary?.label || predictions.safe?.label || '',
    confidence: clamp(predictions.primary?.confidence || predictions.safe?.confidence || 0),
    probability: clamp(predictions.primary?.probability || predictions.safe?.confidence || 0),
  };
  const secondary = {
    label: predictions.secondary?.label || predictions.risky?.label || '',
    confidence: clamp(predictions.secondary?.confidence || predictions.risky?.confidence || Math.max(primary.confidence - 12, 0)),
    probability: clamp(predictions.secondary?.probability || predictions.risky?.confidence || Math.max(primary.confidence - 12, 0)),
  };

  const exactScore = predictions.exactScore?.label
    ? predictions.exactScore
    : inferExactScore({ primaryLabel: primary.label, secondaryLabel: secondary.label, confidence: primary.confidence });
  const probabilities = Object.values(predictions.probabilities || {}).some(Boolean)
    ? predictions.probabilities
    : inferProbabilities({ primaryLabel: primary.label, secondaryLabel: secondary.label, confidence: primary.confidence });
  const goalEstimate = predictions.goalEstimate?.label
    ? predictions.goalEstimate
    : inferGoalEstimate({ primaryLabel: primary.label, secondaryLabel: secondary.label, confidence: primary.confidence, exactScore });
  const homeProfile = predictions.tacticalProfile?.home?.explanation
    ? predictions.tacticalProfile.home
    : inferTacticalProfile({ teamName: data.homeTeam?.name, side: 'home', primaryLabel: primary.label, secondaryLabel: secondary.label, exactScore, confidence: primary.confidence });
  const awayProfile = predictions.tacticalProfile?.away?.explanation
    ? predictions.tacticalProfile.away
    : inferTacticalProfile({ teamName: data.awayTeam?.name, side: 'away', primaryLabel: primary.label, secondaryLabel: secondary.label, exactScore, confidence: primary.confidence });

  const analysis = buildAnalysis({
    data,
    primary,
    secondary,
    exactScore,
    goalEstimate,
    probabilities,
    homeProfile,
    awayProfile,
  });

  return {
    ...data,
    predictions: {
      ...predictions,
      safe: predictions.safe || primary,
      risky: predictions.risky || secondary,
      primary,
      secondary,
      exactScore,
      tacticalProfile: { home: homeProfile, away: awayProfile },
      goalEstimate,
      probabilities,
      analysis,
    },
  };
};

module.exports = {
  enrichPrediction,
  formatProfile,
};
