const express = require('express');
const Match = require('../models/Match');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { serializeMatch } = require('../utils/matchPresentation');

const router = express.Router();

const buildMatchFilter = ({ date, competition, status, bestPicks, search, recommendation }) => {
  const filter = {};

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.matchDate = { $gte: start, $lte: end };
  }

  if (competition && competition !== 'all') {
    filter['competition.type'] = competition;
  }

  if (status && status !== 'all') {
    if (status === 'completed') {
      filter['result.status'] = { $in: ['won', 'lost', 'notbet'] };
    } else if (status === 'pending') {
      filter['result.status'] = 'pending';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Merge with existing date filter if any so we don't accidentally overwrite it
      if (!filter.matchDate) {
        filter.matchDate = { $gte: today };
      } else if (filter.matchDate.$gte < today) {
        filter.matchDate.$gte = today;
      }
    } else {
      filter['result.status'] = status;
    }
  }

  if (bestPicks === 'true') {
    filter['predictions.safe.confidence'] = { $gte: 70 };
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { 'homeTeam.name': regex },
      { 'awayTeam.name': regex },
      { 'competition.name': regex },
      { 'predictions.safe.label': regex },
    ];
  }

  if (recommendation && recommendation !== 'all') {
    const recommendationRegex = {
      V: /victoire|gagne/i,
      N: /nul/i,
      VN: /double chance|victoire.*nul|nul.*victoire/i,
    };

    if (recommendationRegex[recommendation]) {
      filter['predictions.safe.label'] = recommendationRegex[recommendation];
    }
  }

  return filter;
};

// GET /api/matches/home — public homepage payload
router.get('/home', async (req, res) => {
  try {
    const { date, page = 1 } = req.query;

    let targetDate = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        targetDate = parsedDate;
      }
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter = { matchDate: { $gte: startOfDay, $lte: endOfDay } };

    const dates = await Match.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$matchDate' } }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 60 }
    ]);

    const topMatches = await Match.find({
      ...dateFilter,
      'predictions.safe.confidence': { $gte: 80 },
      'predictions.notBet': false
    })
      .sort({ 'predictions.safe.confidence': -1, matchDate: 1, matchTime: 1 })
      .limit(8);

    const pageInt = parseInt(page, 10);
    const limitParams = 20;
    const skipParams = Math.max(0, (pageInt - 1) * limitParams);

    const upcomingMatches = await Match.find({
      ...dateFilter,
      'predictions.notBet': false
    })
      .sort({ matchDate: 1, matchTime: 1 })
      .skip(skipParams)
      .limit(limitParams + 1);

    const hasMoreUpcoming = upcomingMatches.length > limitParams;
    if (hasMoreUpcoming) upcomingMatches.pop();

    const recentResults = await Match.find({
      ...dateFilter,
      'result.status': { $in: ['won', 'lost', 'notbet'] }
    })
      .sort({ matchDate: -1, updatedAt: -1 })
      .limit(6);

    let dailyTicketMatches = await Match.find({
      isDailyTicket: true,
      ...dateFilter
    })
      .sort({ matchDate: 1, matchTime: 1 })
      .limit(4);

    // Provide fallback conditionally. If specifically querying a date and no ticket exists, maybe we shouldn't fallback.
    // However, if it's "today" default behavior, fallback is fine. We'll fallback only if `!date`.
    if (dailyTicketMatches.length === 0 && !date) {
      dailyTicketMatches = await Match.find({ isDailyTicket: true })
        .sort({ matchDate: -1, matchTime: -1 })
        .limit(4);
    }

    const totalConfidence = dailyTicketMatches.length
      ? Math.round(dailyTicketMatches.reduce((sum, match) => sum + (match.predictions?.safe?.confidence || 0), 0) / dailyTicketMatches.length)
      : 0;

    const admin = await User.findOne({ role: 'admin' }).select('socialLinks shareMessage');

    res.json({
      dates: dates.map((item) => ({ date: item._id, count: item.count })),
      topMatches: topMatches.map(serializeMatch),
      upcomingMatches: upcomingMatches.map(serializeMatch),
      hasMoreUpcoming,
      recentResults: recentResults.map(serializeMatch),
      dailyTicket: {
        tickets: dailyTicketMatches.map(serializeMatch),
        totalConfidence,
      },
      socialLinks: admin?.socialLinks || {},
      shareMessage: admin?.shareMessage || '',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/matches — public, with filters
router.get('/', async (req, res) => {
  try {
    const { date, competition, status, bestPicks, search, limit, skip, recommendation } = req.query;
    const filter = buildMatchFilter({ date, competition, status, bestPicks, search, recommendation });

    const total = await Match.countDocuments(filter);
    const matches = await Match.find(filter)
      .sort({ matchDate: -1, matchTime: -1, 'predictions.safe.confidence': -1 })
      .skip(parseInt(skip) || 0)
      .limit(parseInt(limit) || 50);

    res.json({ matches: matches.map(serializeMatch), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/matches/daily-ticket — public
router.get('/daily-ticket', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let tickets = await Match.find({
      isDailyTicket: true,
      matchDate: { $gte: today, $lt: tomorrow }
    }).limit(4);

    // If no tickets for today, get the most recent ones
    if (tickets.length === 0) {
      tickets = await Match.find({ isDailyTicket: true })
        .sort({ matchDate: -1 })
        .limit(4);
    }

    const totalConfidence = tickets.length > 0
      ? Math.round(tickets.reduce((sum, m) => sum + m.predictions.safe.confidence, 0) / tickets.length)
      : 0;

    res.json({ tickets: tickets.map(serializeMatch), totalConfidence });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/matches/dates — returns available dates
router.get('/dates', async (req, res) => {
  try {
    const dates = await Match.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$matchDate' } }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);
    res.json(dates.map(d => ({ date: d._id, count: d.count })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/matches/:id — public
router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match non trouvé' });
    res.json(serializeMatch(match));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/matches/admin/settings — update social links & share message
router.put('/admin/settings', authMiddleware, async (req, res) => {
  try {
    const { socialLinks, shareMessage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { socialLinks, shareMessage },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/matches — admin only
router.post('/', authMiddleware, async (req, res) => {
  try {
    const match = new Match(req.body);
    await match.save();
    res.status(201).json(serializeMatch(match));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/matches/bulk — admin only: accepts an array of match JSON objects
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    // ensure admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Payload doit être un tableau de matches JSON' });
    }

    const results = { total: items.length, saved: 0, skippedDuplicates: 0, failed: 0, failedItems: [] };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        // Basic structure check using the Mongoose model validators
        const candidate = new Match(item);
        // validate (will throw if invalid)
        await candidate.validate();

        // Normalize matchDate to a Date object for duplicate check
        const matchDate = item.matchDate ? new Date(item.matchDate) : null;

        // Duplicate check: same home, away, matchDate (time-insensitive) and matchTime
        const query = {
          'homeTeam.name': item.homeTeam?.name,
          'awayTeam.name': item.awayTeam?.name,
          matchTime: item.matchTime
        };

        if (matchDate) {
          // match exact timestamp if provided
          query.matchDate = matchDate;
        }

        const exists = await Match.findOne(query).exec();
        if (exists) {
          results.skippedDuplicates += 1;
          continue;
        }

        await candidate.save();
        results.saved += 1;
      } catch (err) {
        results.failed += 1;
        // Provide a helpful reason
        const reason = err && err.message ? err.message : 'Invalid structure';
        results.failedItems.push({ index: i, item, reason });
        // continue to next
        continue;
      }
    }

    res.json({
      total: results.total,
      saved: results.saved,
      skippedDuplicates: results.skippedDuplicates,
      failed: results.failed,
      failedItems: results.failedItems
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/matches/:id — admin only
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!match) return res.status(404).json({ message: 'Match non trouvé' });
    res.json(serializeMatch(match));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/matches/:id/result — admin only
router.put('/:id/result', authMiddleware, async (req, res) => {
  try {
    const { status, score } = req.body;
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { 'result.status': status, 'result.score': score || '' },
      { new: true }
    );
    if (!match) return res.status(404).json({ message: 'Match non trouvé' });
    res.json(serializeMatch(match));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/matches/:id — admin only
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match non trouvé' });
    res.json({ message: 'Match supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
