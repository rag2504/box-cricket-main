import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Booking from '../server/models/Booking.js';
import User from '../server/models/User.js';
import Ground from '../server/models/Ground.js';
import Location from '../server/models/Location.js';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4001;

// --- CONFIG ---
const MONGO_URI = 'mongodb+srv://rag123456:rag123456@cluster0.qipvo.mongodb.net/boxcricket?retryWrites=true&w=majority'; // Atlas URI, using boxcricket DB

// --- Connect to MongoDB Atlas ---
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas (Owner Panel)');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error (Owner Panel):', err.message);
    process.exit(1);
  });

// --- Proxy API requests to admin panel backend ---
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:4000',
  changeOrigin: true,
}));

// Serve static files from the owner-panel directory
app.use(express.static(__dirname));

// Fallback to index.html for any route (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Owner Panel running at http://localhost:${PORT}/`);
}); 