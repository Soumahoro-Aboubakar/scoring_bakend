const express = require('express');
const Match = require('../models/Match');

const router = express.Router();

// GET /api/stats/global
router.get('/global', async (req, res) => {
  try {
    const total = await Match.countDocuments({ 'result.status': { $ne: 'pending' } });
    const won = await Match.countDocuments({ 'result.status': 'won' });
    const lost = await Match.countDocuments({ 'result.status': 'lost' });
    const notbet = await Match.countDocuments({ 'result.status': 'notbet' });
    const pending = await Match.countDocuments({ 'result.status': 'pending' });

    const successRate = total > 0 ? Math.round((won / (won + lost)) * 100 * 10) / 10 : 0;

    // Stats by bet type
    const byType = await Match.aggregate([
      { $match: { 'result.status': { $in: ['won', 'lost'] } } },
      { $group: {
        _id: '$predictions.safe.label',
        total: { $sum: 1 },
        won: { $sum: { $cond: [{ $eq: ['$result.status', 'won'] }, 1, 0] } }
      }},
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    res.json({ total: total + pending, won, lost, notbet, pending, successRate, byType });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/stats/daily/:date
router.get('/daily/:date', async (req, res) => {
  try {
    const start = new Date(req.params.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(req.params.date);
    end.setHours(23, 59, 59, 999);

    const matches = await Match.find({ matchDate: { $gte: start, $lte: end } });
    const won = matches.filter(m => m.result.status === 'won').length;
    const lost = matches.filter(m => m.result.status === 'lost').length;
    const pending = matches.filter(m => m.result.status === 'pending').length;
    const notbet = matches.filter(m => m.result.status === 'notbet').length;
    const successRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    res.json({ date: req.params.date, total: matches.length, won, lost, pending, notbet, successRate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/stats/chart — weekly performance for chart
router.get('/chart', async (req, res) => {
  try {
    const { period } = req.query; // '7' or '30'
    const days = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await Match.aggregate([
      { $match: { matchDate: { $gte: startDate }, 'result.status': { $in: ['won', 'lost'] } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$matchDate' } },
        won: { $sum: { $cond: [{ $eq: ['$result.status', 'won'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ['$result.status', 'lost'] }, 1, 0] } },
        total: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    const chartData = data.map(d => ({
      date: d._id,
      successRate: d.total > 0 ? Math.round((d.won / d.total) * 100) : 0,
      won: d.won,
      lost: d.lost
    }));

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/stats/admin — admin info (social links, etc.)
router.get('/admin-info', async (req, res) => {
  try {
    const User = require('../models/User');
    const admin = await User.findOne({ role: 'admin' }).select('socialLinks shareMessage');
    res.json(admin || { socialLinks: {}, shareMessage: '' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
