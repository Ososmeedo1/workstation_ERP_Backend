require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const routerHandler = require('./router-handler');
const { globalErrorHandler, notFoundHandler } = require('./src/Middlewares/error-handle.middleware');
const { createCorsOptions } = require('./src/Config/cors.config');
const { isProduction } = require('./src/Utils/environment.utils');

const app = express();
const IS_PRODUCTION = isProduction();

let dbConnectionPromise = null;

async function connectDB() {
  // Reuse an established connection when the serverless instance is warm.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Cache the connection promise so concurrent cold-start requests do not
  // each open a separate MongoDB connection.
  if (!dbConnectionPromise) {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined');
    }

    dbConnectionPromise = mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    })
      .then(() => {
        console.log('MongoDB connected successfully');
        return mongoose.connection;
      })
      .catch((error) => {
        // Allow the next request to retry after a transient failure.
        dbConnectionPromise = null;
        throw error;
      });
  }

  return dbConnectionPromise;
}

mongoose.connection.on('disconnected', () => {
  dbConnectionPromise = null;
});

app.use(helmet());
app.use(cors(createCorsOptions()));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(async (req, res, next) => {
  try {
    req.db = await connectDB();
    next();
  } catch (error) {
    console.error('DB connection error:', error.message);
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed. Please check MONGODB_URI and network access.',
      error: IS_PRODUCTION ? undefined : error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'StudySpace ERP Backend is running',
    timestamp: new Date().toISOString(),
    environment: IS_PRODUCTION ? 'production' : (process.env.NODE_ENV || 'development')
  });
});

app.use('/api', routerHandler());

app.use(notFoundHandler);
app.use(globalErrorHandler);

// Vercel imports this module as a handler; only start a listener when the
// file is executed directly (local `npm start` / `npm run dev`).
if (require.main === module && process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to connect to DB:', err.message);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} (no DB)`);
    });
  });
}

module.exports = app;
