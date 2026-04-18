const mongoose = require('mongoose');
const Match = require('./models/Match');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/a90rchitect_football';  

const seedData = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...  ', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connecté pour le seeding');

    // Check if an admin already exists; if so, abort seeding to avoid overwriting
    const existingAdmin = await User.findOne({ role: 'admin' }).exec();
    if (existingAdmin) {
      console.log('⚠️  Un administrateur existe déjà — seeding arrêté.');
      console.log(`👤 Admin existant: ${existingAdmin.username}`);
      process.exit(0);
    }

    // Clear existing matches and users (safe because no admin exists)
    await Match.deleteMany({});
    await User.deleteMany({});

    // Create admin
    const admin = new User({
      username:  process.env.USERNAME || 'admin',
      password: process.env.PASSWORD || 'admin123',
      role: 'admin',
      socialLinks: { telegram: 'https://t.me/architect_pronostics', tiktok: 'https://tiktok.com/@architect_pronostics' },
      shareMessage: '🔥 Découvrez le ticket du jour sur ARCHITECT ! Rejoignez-nous pour des pronostics fiables.'
    });
    await admin.save();
    console.log('👤 Admin créé: admin / admin123');

    // Dates
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2);
    const threeDaysAgo = new Date(today); threeDaysAgo.setDate(today.getDate() - 3);
    const fourDaysAgo = new Date(today); fourDaysAgo.setDate(today.getDate() - 4);
    const fiveDaysAgo = new Date(today); fiveDaysAgo.setDate(today.getDate() - 5);
/*
    const matches = [
      // Today matches
      {
        homeTeam: { name: 'Real Madrid', code: 'es' },
        awayTeam: { name: 'Manchester City', code: 'gb-eng' },
        competition: { name: 'Champions League', type: 'Champions League' },
        matchDate: today, matchTime: '21:00',
        predictions: { safe: { label: 'Plus de 2.5 buts', confidence: 92 }, risky: { label: 'Victoire Real Madrid', confidence: 45 }, notBet: false },
        explanation: 'Le Real Madrid affiche une moyenne de 3.2 buts par match à domicile cette saison. Manchester City, malgré sa solidité défensive, a concédé en moyenne 1.8 buts lors des déplacements en Ligue des Champions. Les 5 dernières confrontations ont toutes produit plus de 2.5 buts.',
        odds: 1.65, isDailyTicket: true,
        result: { status: 'pending', score: '' }
      },
      {
        homeTeam: { name: 'Liverpool', code: 'gb-eng' },
        awayTeam: { name: 'Chelsea', code: 'gb-eng' },
        competition: { name: 'Premier League', type: 'Premier League' },
        matchDate: today, matchTime: '17:30',
        predictions: { safe: { label: 'Les deux équipes marquent', confidence: 88 }, risky: { label: 'Victoire Liverpool', confidence: 55 }, notBet: false },
        explanation: 'Liverpool et Chelsea marquent systématiquement lors de leurs confrontations directes. Sur les 8 derniers matchs entre ces deux équipes, les deux ont marqué à chaque fois. Liverpool est invaincu à Anfield depuis 23 matchs.',
        odds: 1.52, isDailyTicket: true,
        result: { status: 'pending', score: '' }
      },
      {
        homeTeam: { name: 'Bayern Munich', code: 'de' },
        awayTeam: { name: 'Arsenal', code: 'gb-eng' },
        competition: { name: 'Champions League', type: 'Champions League' },
        matchDate: today, matchTime: '21:00',
        predictions: { safe: { label: 'Double chance Bayern/Nul', confidence: 85 }, risky: { label: 'Victoire Bayern Munich', confidence: 62 }, notBet: false },
        explanation: 'Le Bayern Munich est redoutable à l\'Allianz Arena avec 90% de victoires cette saison. Arsenal, bien que solide, peine lors de ses déplacements en Europe. Le Bayern n\'a perdu qu\'un seul match à domicile en Ligue des Champions sur les 3 dernières saisons.',
        odds: 1.35, isDailyTicket: true,
        result: { status: 'pending', score: '' }
      },
      {
        homeTeam: { name: 'Barcelona', code: 'es' },
        awayTeam: { name: 'PSG', code: 'fr' },
        competition: { name: 'Champions League', type: 'Champions League' },
        matchDate: today, matchTime: '21:00',
        predictions: { safe: { label: 'Plus de 1.5 buts', confidence: 95 }, risky: { label: 'Victoire Barcelona', confidence: 48 }, notBet: false },
        explanation: 'Les confrontations Barça-PSG sont historiquement riches en buts. Le Barça marque en moyenne 2.4 buts par match à domicile. PSG a une attaque prolifique mais une défense parfois fragile en déplacement.',
        odds: 1.20, isDailyTicket: true,
        result: { status: 'pending', score: '' }
      },
      {
        homeTeam: { name: 'Juventus', code: 'it' },
        awayTeam: { name: 'Inter Milan', code: 'it' },
        competition: { name: 'Serie A', type: 'Serie A' },
        matchDate: today, matchTime: '20:45',
        predictions: { safe: { label: 'Moins de 3.5 buts', confidence: 78 }, risky: { label: 'Match nul', confidence: 35 }, notBet: false },
        explanation: 'Les derbys d\'Italie sont souvent serrés et tactiques. Sur les 10 dernières confrontations, 7 ont vu moins de 3.5 buts. La Juventus est très disciplinée défensivement à domicile.',
        odds: 1.45,
        result: { status: 'pending', score: '' }
      },
      // Yesterday - validated
      {
        homeTeam: { name: 'Everton', code: 'gb-eng' },
        awayTeam: { name: 'Fulham', code: 'gb-eng' },
        competition: { name: 'Premier League', type: 'Premier League' },
        matchDate: yesterday, matchTime: '16:00',
        predictions: { safe: { label: 'Victoire Fulham', confidence: 75 }, risky: { label: 'Plus de 2.5 buts', confidence: 40 }, notBet: false },
        explanation: 'Fulham est en excellente forme avec 4 victoires consécutives. Everton est avant-dernier et n\'a marqué que 2 buts en 5 matchs à domicile.',
        odds: 2.10,
        result: { status: 'won', score: '0 - 2' }
      },
      {
        homeTeam: { name: 'Marseille', code: 'fr' },
        awayTeam: { name: 'Lyon', code: 'fr' },
        competition: { name: 'Ligue 1', type: 'Ligue 1' },
        matchDate: yesterday, matchTime: '21:00',
        predictions: { safe: { label: 'Les deux équipes marquent', confidence: 82 }, risky: { label: 'Victoire Marseille', confidence: 52 }, notBet: false },
        explanation: 'L\'Olympico est toujours un match ouvert. Les deux équipes marquent dans 80% de leurs confrontations récentes. Le Vélodrome pousse l\'OM mais Lyon possède une attaque redoutable.',
        odds: 1.60,
        result: { status: 'won', score: '2 - 1' }
      },
      {
        homeTeam: { name: 'Sevilla', code: 'es' },
        awayTeam: { name: 'Real Betis', code: 'es' },
        competition: { name: 'La Liga', type: 'Liga' },
        matchDate: yesterday, matchTime: '21:00',
        predictions: { safe: { label: 'Double chance Séville/Nul', confidence: 70 }, risky: { label: 'Victoire Séville', confidence: 42 }, notBet: false },
        explanation: 'Le derby sévillan est électrique mais Séville domine généralement à domicile. 4 victoires sur les 5 derniers derbys à domicile.',
        odds: 1.85,
        result: { status: 'lost', score: '1 - 2' }
      },
      {
        homeTeam: { name: 'Napoli', code: 'it' },
        awayTeam: { name: 'Roma', code: 'it' },
        competition: { name: 'Serie A', type: 'Serie A' },
        matchDate: yesterday, matchTime: '18:00',
        predictions: { safe: { label: 'Plus de 1.5 buts', confidence: 90 }, risky: { label: 'Victoire Napoli', confidence: 65 }, notBet: false },
        explanation: 'Napoli est la meilleure attaque de Serie A à domicile. Roma concède beaucoup de buts en déplacement cette saison.',
        odds: 1.30,
        result: { status: 'won', score: '3 - 1' }
      },
      // Two days ago
      {
        homeTeam: { name: 'Dortmund', code: 'de' },
        awayTeam: { name: 'Atletico Madrid', code: 'es' },
        competition: { name: 'Champions League', type: 'Champions League' },
        matchDate: twoDaysAgo, matchTime: '21:00',
        predictions: { safe: { label: 'Plus de 1.5 buts', confidence: 84 }, risky: { label: 'Victoire Dortmund', confidence: 50 }, notBet: false },
        explanation: 'Dortmund est très offensif à domicile au Signal Iduna Park. L\'Atletico joue défensif mais Dortmund trouve souvent la faille.',
        odds: 1.40,
        result: { status: 'won', score: '2 - 1' }
      },
      {
        homeTeam: { name: 'AC Milan', code: 'it' },
        awayTeam: { name: 'Atalanta', code: 'it' },
        competition: { name: 'Serie A', type: 'Serie A' },
        matchDate: twoDaysAgo, matchTime: '20:45',
        predictions: { safe: { label: 'Les deux équipes marquent', confidence: 76 }, risky: { label: 'Victoire Atalanta', confidence: 38 }, notBet: false },
        explanation: 'L\'Atalanta marque dans presque tous ses matchs. Milan est fragile défensivement mais reste dangereux à San Siro.',
        odds: 1.55,
        result: { status: 'won', score: '1 - 2' }
      },
      {
        homeTeam: { name: 'Tottenham', code: 'gb-eng' },
        awayTeam: { name: 'Newcastle', code: 'gb-eng' },
        competition: { name: 'Premier League', type: 'Premier League' },
        matchDate: twoDaysAgo, matchTime: '17:30',
        predictions: { safe: { label: 'Match nul ou victoire Newcastle', confidence: 72 }, risky: { label: 'Victoire Newcastle', confidence: 44 }, notBet: false },
        explanation: 'Newcastle est dans une forme exceptionnelle avec 6 matchs sans défaite. Tottenham peine en régularité cette saison.',
        odds: 1.80,
        result: { status: 'lost', score: '3 - 1' }
      },
      // Older matches
      {
        homeTeam: { name: 'RB Leipzig', code: 'de' },
        awayTeam: { name: 'Freiburg', code: 'de' },
        competition: { name: 'Bundesliga', type: 'Bundesliga' },
        matchDate: threeDaysAgo, matchTime: '15:30',
        predictions: { safe: { label: 'Victoire Leipzig', confidence: 80 }, risky: { label: 'Plus de 3.5 buts', confidence: 32 }, notBet: false },
        explanation: 'Leipzig domine généralement à domicile contre Freiburg. 5 victoires sur les 6 dernières confrontations à domicile.',
        odds: 1.50,
        result: { status: 'won', score: '2 - 0' }
      },
      {
        homeTeam: { name: 'Monaco', code: 'fr' },
        awayTeam: { name: 'Lille', code: 'fr' },
        competition: { name: 'Ligue 1', type: 'Ligue 1' },
        matchDate: fourDaysAgo, matchTime: '21:00',
        predictions: { safe: { label: 'Plus de 1.5 buts', confidence: 88 }, risky: { label: 'Victoire Monaco', confidence: 58 }, notBet: false },
        explanation: 'Monaco est l\'équipe la plus spectaculaire de Ligue 1 cette saison. Lille concède des buts en déplacement.',
        odds: 1.25,
        result: { status: 'won', score: '3 - 1' }
      },
      {
        homeTeam: { name: 'Ajax', code: 'nl' },
        awayTeam: { name: 'PSV', code: 'nl' },
        competition: { name: 'Eredivisie', type: 'Autre' },
        matchDate: fiveDaysAgo, matchTime: '20:00',
        predictions: { safe: { label: 'Les deux équipes marquent', confidence: 85 }, risky: { label: 'Match nul', confidence: 30 }, notBet: true },
        explanation: 'Match trop incertain pour une prédiction fiable. Les deux équipes sont au même niveau et les cotes ne sont pas intéressantes.',
        odds: 1.70,
        result: { status: 'notbet', score: '1 - 1' }
      }
    ];*/

    await Match.insertMany(matches);
    console.log(`⚽ ${matches.length} matchs insérés`);

    console.log('✅ Seeding terminé !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur de seeding:', error.message);
    process.exit(1);
  }
};

seedData();
