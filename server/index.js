require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');

const connectDB = require('./config/database');
const Voter = require('./models/Voter');
const authRoutes = require('./routes/auth');
const voterRoutes = require('./routes/voters');
const electionRoutes = require('./routes/elections');
const voteRoutes = require('./routes/votes');
const adminRoutes = require('./routes/admin');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Attach io to app for access in routes without circular import
app.set('io', io);

// Connect to MongoDB
connectDB();

// Ensure voter indexes are correct (fix legacy indexes that indexed nulls)
(async () => {
  try {
    const indexes = await Voter.collection.indexes();

    const fpIdx = indexes.find(i => i.name === 'fingerprintHash_1');
    if (fpIdx && (!fpIdx.sparse || !fpIdx.partialFilterExpression)) {
      try { await Voter.collection.dropIndex('fingerprintHash_1'); } catch (e) { /* ignore */ }
    }

    const faceIdx = indexes.find(i => i.name === 'faceTemplateHash_1');
    if (faceIdx && (!faceIdx.sparse || !faceIdx.partialFilterExpression)) {
      try { await Voter.collection.dropIndex('faceTemplateHash_1'); } catch (e) { /* ignore */ }
    }

    await Voter.syncIndexes();
  } catch (e) {
    console.error('Index sync error:', e);
  }
})();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting with proper configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health' // Skip health check
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join election room
  socket.on('join-election', (electionId) => {
    socket.join(`election-${electionId}`);
    console.log(`User ${socket.id} joined election ${electionId}`);
  });

  // Join booth room
  socket.on('join-booth', (boothId) => {
    socket.join(`booth-${boothId}`);
    console.log(`User ${socket.id} joined booth ${boothId}`);
  });

  // Leave election room
  socket.on('leave-election', (electionId) => {
    socket.leave(`election-${electionId}`);
    console.log(`User ${socket.id} left election ${electionId}`);
  });

  // Leave booth room
  socket.on('leave-booth', (boothId) => {
    socket.leave(`booth-${boothId}`);
    console.log(`User ${socket.id} left booth ${boothId}`);
  });

  // Handle vote casting
  socket.on('cast-vote', async (voteData) => {
    try {
      // Broadcast vote update to all users in the election room
      socket.to(`election-${voteData.electionId}`).emit('vote-update', {
        electionId: voteData.electionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('vote-error', { message: error.message });
    }
  });

  // Handle real-time results
  socket.on('request-results', (electionId) => {
    // This would fetch and send real-time results
    socket.emit('results-update', {
      electionId,
      message: 'Results will be updated in real-time'
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = { app, io };
