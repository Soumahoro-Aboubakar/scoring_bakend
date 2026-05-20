const { z } = require('zod');

const scoreSchema = z.object({
  home: z.number().int().min(0).max(15),
  away: z.number().int().min(0).max(15),
  confidence: z.number().min(0).max(100)
}).transform((score) => ({
  ...score,
  label: `${score.home}-${score.away}`
}));

const recommendationSchema = z.object({
  label: z.string().min(2).max(120),
  confidence: z.number().min(0).max(100),
  probability: z.number().min(0).max(100).optional()
});

const tacticalProfileSchema = z.object({
  type: z.enum(['offensive', 'defensive', 'hybride', 'agressive offensivement', 'prudente defensivement', 'equilibree']),
  explanation: z.string().min(10).max(800)
});

const matchAnalysisSchema = z.object({
  exactScore: scoreSchema,
  primary: recommendationSchema,
  secondary: recommendationSchema,
  tacticalProfile: z.object({
    home: tacticalProfileSchema,
    away: tacticalProfileSchema
  }),
  goalEstimate: z.object({
    minimumGoals: z.number().int().min(0).max(8),
    label: z.string().min(3).max(140),
    confidence: z.number().min(0).max(100),
    cleanSheetProbability: z.number().min(0).max(100)
  }),
  probabilities: z.object({
    homeWin: z.number().min(0).max(100),
    draw: z.number().min(0).max(100),
    awayWin: z.number().min(0).max(100),
    over25: z.number().min(0).max(100),
    bothTeamsScore: z.number().min(0).max(100)
  }),
  analysis: z.object({
    summary: z.string().min(20).max(1200),
    logic: z.string().min(20).max(1200),
    statistics: z.string().min(20).max(1200),
    recentForm: z.string().min(20).max(1200),
    offensivePower: z.string().min(20).max(1200),
    defensiveStability: z.string().min(20).max(1200),
    trends: z.string().min(20).max(1200),
    risks: z.string().min(20).max(1200)
  })
});

const collectedMatchSchema = z.object({
  homeTeam: z.string().min(1).max(120),
  awayTeam: z.string().min(1).max(120),
  competition: z.string().min(1).max(160).default('Autre'),
  matchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  matchTime: z.string().regex(/^\d{2}:\d{2}$/).default('00:00'),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  externalId: z.string().optional().default(''),
  sourceProvider: z.string().optional().default('BBC'),
  confidence: z.number().min(0).max(100).optional().default(70)
});

const validationSchema = z.object({
  score: z.string().regex(/^\d{1,2}\s*-\s*\d{1,2}$/),
  homeGoals: z.number().int().min(0).max(30),
  awayGoals: z.number().int().min(0).max(30),
  resultStatus: z.enum(['won', 'lost', 'notbet']),
  primaryCorrect: z.boolean(),
  secondaryCorrect: z.boolean(),
  exactScoreCorrect: z.boolean(),
  partialCorrect: z.boolean(),
  confidenceScore: z.number().min(0).max(100),
  summary: z.string().min(10).max(1000),
  sourceUrl: z.string().url().optional().or(z.literal(''))
});

const parseJsonObject = (value) => {
  if (typeof value === 'object' && value !== null) return value;
  if (typeof value !== 'string') throw new Error('AI response is not JSON text');

  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
};

module.exports = {
  collectedMatchSchema,
  matchAnalysisSchema,
  parseJsonObject,
  validationSchema,
};
