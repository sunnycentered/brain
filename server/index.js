require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const dbInit = require('./models/initDb');
const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activity');
const keywordsRoutes = require('./routes/keywords');
const plansRoutes = require('./routes/plans');
const reportsRoutes = require('./routes/reports');
const contentRoutes = require('./routes/content');
const telegramRoutes = require('./routes/telegram');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// Initialize DB
const db = dbInit();
app.locals.db = db;

// Routes
app.use('/auth', authRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/keywords', keywordsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/telegram', telegramRoutes);

// Auto-start Telegram polling on boot
if (process.env.TELEGRAM_POLL === 'true' || process.env.TELEGRAM_POLL === '1') {
  setImmediate(async () => {
    try {
      const axios = require('axios');
      await axios.post(`http://localhost:${PORT}/api/telegram/start-polling`);
      console.log('[tg] Telegram polling started automatically');
    } catch (e) {
      console.warn('[tg] Could not auto-start polling:', e.message);
    }
  });
}

app.get('/', (req, res) => {
  res.json({ message: 'Public Insta backend running' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

