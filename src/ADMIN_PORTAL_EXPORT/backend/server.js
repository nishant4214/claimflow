// ============================================================================
// ADMIN PORTAL - EXPRESS SERVER
// ============================================================================

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/database');

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ============================================================================
// ROUTES
// ============================================================================

const authRoutes = require('./routes/authRoutes');
const claimRoutes = require('./routes/claimRoutes');
const configRoutes = require('./routes/configRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/config', configRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// ============================================================================
// DATABASE CONNECTION CHECK
// ============================================================================

async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connected successfully');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Check database connection first
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.error('Cannot start server without database connection');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;