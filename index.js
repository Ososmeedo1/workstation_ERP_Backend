require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const routerHandler = require('./router-handler');
const { globalErrorHandler, notFoundHandler } = require('./src/Middlewares/error-handle.middleware');

const app = express();

app.use(helmet());

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'StudySpace ERP Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.use('/api', routerHandler());

app.use(notFoundHandler);
app.use(globalErrorHandler);

let cachedDb = null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error('MONGODB_URI is not defined');
    return null;
  }
  try {
    await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    cachedDb = mongoose.connection;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
  return cachedDb;
}

app.use(async (req, res, next) => {
  try {
    req.db = await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

module.exports = app;
