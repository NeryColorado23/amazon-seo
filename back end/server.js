const express = require('express');
require('dotenv').config();

const connectDB = require('./config/db');

connectDB();

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/keywords', require('./routes/keywords'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/drafts', require('./routes/drafts'));
app.use('/api/etl', require('./routes/etl'));
app.use('/api/costs', require('./routes/costs'));
app.use('/api/ppc', require('./routes/ppc'));
app.use('/api/overview', require('./routes/overview'));

app.get('/', (req, res) => {
  res.json({ message: 'Amazon SEO API funcionando correctamente', status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});