const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const matchRoutes = require('./routes/matches');
const authRoutes = require('./routes/auth');
const statsRoutes = require('./routes/stats');
const automationRoutes = require('./routes/automation');
const { startScheduler } = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/a90rchitect_football';



// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/matches', matchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/automation', automationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Connect to MongoDB and start server
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connecté' , MONGO_URI);
  /*  app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      require('./seed');
    });
*/

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  startScheduler();

  // Seed uniquement si activé
  if (process.env.SEED === 'true') {
    require('./seed');
  }

  // Auto-ping pour éviter sleep
  const BACKEND_URL = process.env.BACKEND_URL;

  if (!BACKEND_URL) {
    console.warn('⚠️ BACKEND_URL non défini, auto-ping désactivé');
    return;
  }

  setInterval(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      const data = await res.json();
      console.log('🔄 Ping serveur OK:', data.status);
    } catch (err) {
      console.error('❌ Ping échoué:', err.message);
    }
  }, 40000); // 40 secondes
});



  })
  .catch(err => {
    console.error('❌ Erreur MongoDB:', err.message);
    process.exit(1);
  });
