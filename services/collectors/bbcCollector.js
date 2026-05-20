const crypto = require('crypto');
const { automationConfig } = require('../../config/automationConfig');
const { collectedMatchSchema } = require('../automation/schemas');

const normalizeTeamName = (value = '') => value.replace(/\s+/g, ' ').trim();

const normalizeCompetition = (value = '') => normalizeTeamName(value) || 'Autre';

const makeExternalId = ({ homeTeam, awayTeam, matchDate, matchTime, competition }) => crypto
  .createHash('sha1')
  .update(`${matchDate}|${matchTime}|${competition}|${homeTeam}|${awayTeam}`.toLowerCase())
  .digest('hex');

const normalizeTime = (value = '') => {
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return '00:00';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const extractJsonBlobs = (html) => {
  const blobs = [];
  const scriptMatches = html.matchAll(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scriptMatches) {
    try {
      blobs.push(JSON.parse(match[1]));
    } catch {
      // Ignore non-JSON script blocks.
    }
  }

  const nextData = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextData) {
    try {
      blobs.push(JSON.parse(nextData[1]));
    } catch {
      // Ignore malformed embedded state.
    }
  }

  return blobs;
};

const walk = (value, visitor) => {
  if (!value || typeof value !== 'object') return;
  visitor(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visitor));
    return;
  }
  Object.values(value).forEach((item) => walk(item, visitor));
};

const objectToMatchCandidate = (node, targetDate, sourceUrl) => {
  const home = node.homeTeam || node.home || node.homeContestant || node.team1 || node.home_team;
  const away = node.awayTeam || node.away || node.awayContestant || node.team2 || node.away_team;
  const homeName = normalizeTeamName(home?.name || home?.fullName || home?.displayName || node.homeTeamName || node.homeName || '');
  const awayName = normalizeTeamName(away?.name || away?.fullName || away?.displayName || node.awayTeamName || node.awayName || '');

  if (!homeName || !awayName || homeName === awayName) return null;

  const rawDate = node.startDate || node.date || node.matchDate || node.kickoffTime || node.startTime || '';
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const dateText = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : targetDate;
  const matchDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? dateText : targetDate;
  const rawTime = node.time || node.matchTime || node.kickoffTime || node.startTime || rawDate || '';
  const matchTime = normalizeTime(rawTime);
  const competition = normalizeCompetition(
    node.competition?.name || node.tournament?.name || node.stage?.name || node.event?.name || node.competitionName
  );

  return {
    homeTeam: homeName,
    awayTeam: awayName,
    competition,
    matchDate,
    matchTime,
    sourceUrl,
    sourceProvider: 'BBC',
    externalId: node.id || node.uid || makeExternalId({ homeTeam: homeName, awayTeam: awayName, matchDate, matchTime, competition }),
    confidence: 85,
  };
};

const extractFromJson = (html, targetDate, sourceUrl) => {
  const found = [];
  const seen = new Set();
  const blobs = extractJsonBlobs(html);

  blobs.forEach((blob) => {
    walk(blob, (node) => {
      const candidate = objectToMatchCandidate(node, targetDate, sourceUrl);
      if (!candidate) return;
      const key = `${candidate.homeTeam}|${candidate.awayTeam}|${candidate.matchDate}|${candidate.matchTime}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      found.push(candidate);
    });
  });

  return found;
};

const extractFromHtmlText = (html, targetDate, sourceUrl) => {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

  const candidates = [];
  const regex = /([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9.'() -]{2,60})\s+(?:v|vs)\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9.'() -]{2,60})/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const homeTeam = normalizeTeamName(match[1]);
    const awayTeam = normalizeTeamName(match[2]);
    const competition = 'Autre';
    candidates.push({
      homeTeam,
      awayTeam,
      competition,
      matchDate: targetDate,
      matchTime: '00:00',
      sourceUrl,
      sourceProvider: 'BBC',
      externalId: makeExternalId({ homeTeam, awayTeam, matchDate: targetDate, matchTime: '00:00', competition }),
      confidence: 55,
    });
  }

  return candidates;
};

const collectBBCMatches = async (targetDate) => {
  const sourceUrl = `${automationConfig.sources.bbcBaseUrl}/${targetDate}`;
  const response = await fetch(sourceUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 A90rchitectAutomation/1.0',
      Accept: 'text/html,application/xhtml+xml'
    }
  });

  if (!response.ok) {
    throw new Error(`BBC fixtures request failed with ${response.status}`);
  }

  const html = await response.text();
  const candidates = [
    ...extractFromJson(html, targetDate, sourceUrl),
    ...extractFromHtmlText(html, targetDate, sourceUrl),
  ];
  const seen = new Set();

  return candidates
    .map((candidate) => collectedMatchSchema.safeParse(candidate))
    .filter((result) => result.success)
    .map((result) => result.data)
    .filter((candidate) => {
      const key = `${candidate.homeTeam}|${candidate.awayTeam}|${candidate.matchDate}|${candidate.matchTime}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

module.exports = {
  collectBBCMatches,
  makeExternalId,
};
