const mongoose = require('mongoose');
const Match = require('./models/Match');
const { data_1, data_2 } = require('../data.js');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/architect_football';
console.log(MONGO_URI, 'MONGO_URI');
const normalizeMatch = (m) => ({
  ...m,
  matchDate: new Date(m.matchDate)
});

//i got this error Erreur import: querySrv ENOTFOUND _mongodb._tcp.cluster0.mdzcvgx.mongodb.net
//it's because the MONGO_URI is not correct
//i need to use the local mongodb
//mongodb://127.0.0.1:27017/architect_football
//i want save data in production not in local

const upsertMatches = async (matches) => {
  let inserted = 0;
  for (const m of matches) {
    const norm = normalizeMatch(m);
    try {
      await Match.findOneAndUpdate(
        { 'homeTeam.name': norm.homeTeam.name, 'awayTeam.name': norm.awayTeam.name, matchDate: norm.matchDate },
        { $set: norm },
        { upsert: true, returnDocument: 'after' }
      );
      inserted += 1;
    } catch (err) {
      console.error('Erreur upsert match', norm.homeTeam?.name, 'vs', norm.awayTeam?.name, err.message);
    }
  }
  return inserted;
};

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connecté');

    const which = process.argv[2] || 'both'; // 'data_1', 'data_2', or 'both'
    let total = 0;

    if (which === 'data_1' || which === 'both') {
      console.log('Importation de data_1...');
      total += await upsertMatches(data_1);
    }

    if (which === 'data_2' || which === 'both') {
      console.log('Importation de data_2...');
      total += await upsertMatches(data_2);
    }

    console.log(`Import terminé. ${total} enregistrements upsertés.`);
    process.exit(0);
  } catch (error) {
    console.error('Erreur import:', error.message);
    process.exit(1);
  }
};

run();
