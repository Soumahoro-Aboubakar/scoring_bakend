const matchAnalysisJsonSchema = {
  name: 'football_match_analysis',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['exactScore', 'primary', 'secondary', 'tacticalProfile', 'goalEstimate', 'probabilities', 'analysis'],
    properties: {
      exactScore: {
        type: 'object',
        additionalProperties: false,
        required: ['home', 'away', 'confidence'],
        properties: {
          home: { type: 'integer', minimum: 0, maximum: 15 },
          away: { type: 'integer', minimum: 0, maximum: 15 },
          confidence: { type: 'number', minimum: 0, maximum: 100 }
        }
      },
      primary: recommendationSchema(),
      secondary: recommendationSchema(),
      tacticalProfile: {
        type: 'object',
        additionalProperties: false,
        required: ['home', 'away'],
        properties: {
          home: tacticalProfileSchema(),
          away: tacticalProfileSchema()
        }
      },
      goalEstimate: {
        type: 'object',
        additionalProperties: false,
        required: ['minimumGoals', 'label', 'confidence', 'cleanSheetProbability'],
        properties: {
          minimumGoals: { type: 'integer', minimum: 0, maximum: 8 },
          label: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 100 },
          cleanSheetProbability: { type: 'number', minimum: 0, maximum: 100 }
        }
      },
      probabilities: {
        type: 'object',
        additionalProperties: false,
        required: ['homeWin', 'draw', 'awayWin', 'over25', 'bothTeamsScore'],
        properties: {
          homeWin: { type: 'number', minimum: 0, maximum: 100 },
          draw: { type: 'number', minimum: 0, maximum: 100 },
          awayWin: { type: 'number', minimum: 0, maximum: 100 },
          over25: { type: 'number', minimum: 0, maximum: 100 },
          bothTeamsScore: { type: 'number', minimum: 0, maximum: 100 }
        }
      },
      analysis: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'logic', 'statistics', 'recentForm', 'offensivePower', 'defensiveStability', 'trends', 'risks'],
        properties: {
          summary: { type: 'string' },
          logic: { type: 'string' },
          statistics: { type: 'string' },
          recentForm: { type: 'string' },
          offensivePower: { type: 'string' },
          defensiveStability: { type: 'string' },
          trends: { type: 'string' },
          risks: { type: 'string' }
        }
      }
    }
  }
};

const collectedMatchesJsonSchema = {
  name: 'collected_football_matches',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['matches'],
    properties: {
      matches: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['homeTeam', 'awayTeam', 'competition', 'matchDate', 'matchTime', 'sourceUrl', 'externalId', 'sourceProvider', 'confidence'],
          properties: {
            homeTeam: { type: 'string' },
            awayTeam: { type: 'string' },
            competition: { type: 'string' },
            matchDate: { type: 'string' },
            matchTime: { type: 'string' },
            sourceUrl: { type: 'string' },
            externalId: { type: 'string' },
            sourceProvider: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 100 }
          }
        }
      }
    }
  }
};

const validationJsonSchema = {
  name: 'football_match_validation',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['score', 'homeGoals', 'awayGoals', 'resultStatus', 'primaryCorrect', 'secondaryCorrect', 'exactScoreCorrect', 'partialCorrect', 'confidenceScore', 'summary', 'sourceUrl'],
    properties: {
      score: { type: 'string' },
      homeGoals: { type: 'integer', minimum: 0, maximum: 30 },
      awayGoals: { type: 'integer', minimum: 0, maximum: 30 },
      resultStatus: { type: 'string', enum: ['won', 'lost', 'notbet'] },
      primaryCorrect: { type: 'boolean' },
      secondaryCorrect: { type: 'boolean' },
      exactScoreCorrect: { type: 'boolean' },
      partialCorrect: { type: 'boolean' },
      confidenceScore: { type: 'number', minimum: 0, maximum: 100 },
      summary: { type: 'string' },
      sourceUrl: { type: 'string' }
    }
  }
};

function recommendationSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'confidence', 'probability'],
    properties: {
      label: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 100 },
      probability: { type: 'number', minimum: 0, maximum: 100 }
    }
  };
}

function tacticalProfileSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'explanation'],
    properties: {
      type: {
        type: 'string',
        enum: ['offensive', 'defensive', 'hybride', 'agressive offensivement', 'prudente defensivement', 'equilibree']
      },
      explanation: { type: 'string' }
    }
  };
}

module.exports = {
  collectedMatchesJsonSchema,
  matchAnalysisJsonSchema,
  validationJsonSchema,
};
