# Secure Voting System

A comprehensive, secure digital voting system built with React.js, Node.js, MongoDB, and advanced cryptographic techniques including Merkle Trees, fingerprint authentication, and real-time capabilities.

## 🚀 Features

### Security Features
- **Fingerprint Authentication**: Biometric voter identification using fingerprint scanning
- **End-to-End Encryption**: AES-256 encryption for all vote data
- **Merkle Tree Verification**: Blockchain-inspired technology for vote integrity
- **Audit Trail**: Complete logging of all voting activities
- **Rate Limiting**: Protection against brute force attacks
- **JWT Authentication**: Secure token-based authentication

### Core Functionality
- **Real-time Voting**: Live vote casting with WebSocket integration
- **Centralized Management**: Comprehensive admin dashboard
- **Vote Verification**: Cryptographic proof of vote integrity
- **Results Dashboard**: Real-time election results
- **Voter Management**: Complete voter registration and verification system
- **Candidate Management**: Admin tools for managing election candidates

### User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Beautiful, intuitive interface with smooth animations
- **Real-time Updates**: Live notifications and status updates
- **Accessibility**: WCAG compliant design

## 🛠️ Technology Stack

### Frontend
- **React.js 18**: Modern React with hooks and context
- **React Router**: Client-side routing
- **Socket.io Client**: Real-time communication
- **Axios**: HTTP client for API calls
- **Crypto-js**: Client-side encryption utilities
- **Lucide React**: Beautiful icon library
- **React Toastify**: Notification system

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling
- **Socket.io**: Real-time bidirectional communication
- **JWT**: JSON Web Token authentication
- **Bcrypt**: Password hashing
- **Helmet**: Security middleware
- **Rate Limiting**: Request throttling

### Security & Cryptography
- **Merkle Trees**: Vote integrity verification
- **AES-256-GCM**: Symmetric encryption
- **SHA-256/SHA-512**: Cryptographic hashing
- **HMAC**: Message authentication codes
- **PBKDF2**: Key derivation function

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn** package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd secure-voting-system
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/secure_voting
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
ENCRYPTION_KEY=your_32_character_encryption_key_here
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

### 4. Database Setup

Make sure MongoDB is running on your system:

```bash
# Start MongoDB (if not running as a service)
mongod
```

### 5. Run the Application

#### Development Mode (Recommended)
```bash
# From the root directory
npm run dev
```

This will start both the server (port 5000) and client (port 3000) concurrently.

#### Production Mode
```bash
# Build the client
npm run build

# Start the server
npm run server
```

## 📱 Usage

### For Voters

1. **Registration**: Register with your voter ID, personal information, and fingerprint
2. **Verification**: Wait for admin verification of your registration
3. **Login**: Use your voter ID and fingerprint to authenticate
4. **Vote**: Select candidates in active elections
5. **Verification**: Verify your vote using the provided Merkle proof

### For Administrators

1. **Login**: Use admin credentials to access the admin panel
2. **Election Management**: Create, start, and end elections
3. **Voter Management**: Verify voter registrations and manage voter accounts
4. **Candidate Management**: Add and manage election candidates
5. **Results**: View real-time election results and audit trails

## 🔒 Security Considerations

### Data Protection
- All sensitive data is encrypted at rest and in transit
- Fingerprint data is hashed and stored securely
- Vote data is encrypted and can only be decrypted with proper keys

### Authentication & Authorization
- Multi-factor authentication using fingerprint biometrics
- Role-based access control for different user types
- Session management with secure JWT tokens

### Vote Integrity
- Merkle tree implementation ensures vote tampering detection
- Cryptographic proofs for vote verification
- Complete audit trail for all voting activities

### Network Security
- HTTPS enforcement in production
- Rate limiting to prevent abuse
- CORS configuration for secure cross-origin requests

## 🏗️ Architecture

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │   Node.js API   │    │    MongoDB      │
│                 │◄──►│                 │◄──►│                 │
│ - Authentication│    │ - REST API      │    │ - Voters        │
│ - Voting UI     │    │ - WebSocket     │    │ - Elections     │
│ - Real-time     │    │ - Security      │    │ - Votes         │
│ - Fingerprint   │    │ - Encryption    │    │ - Candidates    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
1. **Registration**: Voter data → Encryption → Database
2. **Authentication**: Fingerprint → Hash verification → JWT token
3. **Voting**: Vote data → Encryption → Merkle tree → Database
4. **Verification**: Merkle proof → Cryptographic verification

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register/voter` - Voter registration
- `POST /api/auth/login/voter` - Voter login
- `POST /api/auth/login/admin` - Admin login
- `GET /api/auth/verify` - Token verification

### Elections
- `GET /api/elections` - Get all elections
- `GET /api/elections/:id` - Get specific election
- `POST /api/elections` - Create election (admin)
- `PUT /api/elections/:id` - Update election (admin)

### Voting
- `POST /api/votes/cast/:electionId` - Cast vote
- `GET /api/votes/verify/:voteId` - Verify vote
- `GET /api/votes/results/:electionId` - Get results

### Admin
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/voters` - Manage voters
- `GET /api/admin/candidates` - Manage candidates

## 🧪 Testing

### Running Tests
```bash
# Run client tests
cd client
npm test

# Run server tests
cd server
npm test
```

### Test Coverage
- Unit tests for utility functions
- Integration tests for API endpoints
- End-to-end tests for critical user flows

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb://your-production-db
   JWT_SECRET=your-production-jwt-secret
   ENCRYPTION_KEY=your-production-encryption-key
   ```

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Deploy to Server**
   - Use PM2 for process management
   - Configure reverse proxy (Nginx)
   - Set up SSL certificates
   - Configure firewall rules

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- **Blockchain Integration**: Full blockchain implementation
- **Multi-language Support**: Internationalization
- **Advanced Analytics**: Detailed voting analytics
- **Mobile App**: Native mobile applications
- **Voice Authentication**: Additional biometric options
- **Offline Voting**: Offline capability with sync

## ⚠️ Disclaimer

This is a demonstration project for educational purposes. For production use in real elections, additional security audits, compliance checks, and regulatory approvals may be required.

---

**Built with ❤️ for secure and transparent democracy**
