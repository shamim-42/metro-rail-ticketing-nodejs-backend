# Metro Rail Ticketing Node.js Backend

A comprehensive RESTful API backend for the Metro Rail Ticketing mobile application, built with Node.js, Express.js, and MongoDB. This API powers a complete metro rail ticket booking system with user management, trip planning, fare calculation, and QR code-based ticketing.

## Flutter Mobile App Repository
**Flutter Mobile App:** https://github.com/shamim-42/metro-rail-ticketing-flutter-mobileapp

## 🚀 Features

- **User Authentication & Authorization**: Secure JWT-based auth system
- **Trip Management**: Create, track, and use QR code-based metro trips
- **Station Management**: Complete CRUD operations for metro stations
- **Dynamic Fare System**: Smart fare calculation between stations
- **Balance Management**: User wallet system with deposit functionality
- **Admin Dashboard Support**: Full admin API for system management
- **Real-time Statistics**: User journey analytics and reporting
- **Serverless Ready**: AWS Lambda deployment support
- **Multi-environment**: Development and production configurations

## 🏗️ Architecture

- **Framework**: Express.js with RESTful API design
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator for input validation
- **Security**: bcryptjs for password hashing
- **Deployment**: AWS Lambda with Serverless framework
- **Development**: Nodemon for hot reloading

## 📋 Prerequisites

- **Node.js** (v18.x or higher)
- **MongoDB** (v4.4 or higher) or MongoDB Atlas
- **npm** or **yarn**
- **AWS CLI** (for deployment)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone git@github.com:shamim-42/metro-rail-ticketing-nodejs-backend.git
cd metro-rail-ticketing-nodejs-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp env.example .env

# Edit with your configuration
nano .env
```

**Required Environment Variables:**
```env
# Server Configuration
PORT=5001
NODE_ENV=development

# MongoDB Configuration  
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/metro_rapid_pass
# Or for MongoDB Atlas:
# MONGODB_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# App Configuration
APP_NAME=Metro Rapid Pass API
APP_VERSION=1.0.0
```

### 4. Start the Server

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

**Serverless Offline (for testing AWS Lambda locally):**
```bash
npm run offline
```

## 📚 API Documentation

### Base URL
- **Development**: `http://localhost:5001/api`
- **Production**: `https://your-lambda-url.amazonaws.com/dev/api`

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com", 
  "phoneNumber": "+1234567890",
  "password": "password123"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User Profile
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Trip Management Endpoints

#### Create New Trip
```http
POST /api/trips
Authorization: Bearer <token>
Content-Type: application/json

{
  "fromStation": "64a7b123456789abcdef0123",
  "toStation": "64a7b123456789abcdef0124", 
  "numberOfPassengers": 2,
  "paymentMethod": "balance"
}
```

#### Use Trip (QR Code Scan)
```http
POST /api/trips/use/:tripCode
Content-Type: application/json

{
  "tripCode": "TRIP-ABC12345"
}
```

#### Get Trip History
```http
GET /api/trips/history?page=1&limit=10&status=used
Authorization: Bearer <token>
```

#### Get Unused Trips
```http
GET /api/trips/unused?page=1&limit=10
Authorization: Bearer <token>
```

### Station Management Endpoints

#### Get All Stations
```http
GET /api/stations?page=1&limit=20&search=dhaka&zone=central
```

#### Create Station (Admin Only)
```http
POST /api/stations
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Dhaka University",
  "code": "DU",
  "latitude": 23.7338,
  "longitude": 90.3928,
  "address": "Dhaka University Campus, Dhaka",
  "zone": "Central",
  "facilities": ["parking", "wifi", "elevator"],
  "description": "Main university campus station"
}
```

#### Update Station (Admin Only)
```http
PUT /api/stations/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Station Name",
  "address": "New Address",
  "facilities": ["parking", "wifi", "elevator", "restroom"]
}
```

### Fare Management Endpoints

#### Get Fare Between Stations
```http
GET /api/fares/in-between?fromStationId=64a7b123&toStationId=64a7b124
```

#### Get All Fares (Admin)
```http
GET /api/fares?page=1&limit=50
Authorization: Bearer <admin_token>
```

#### Create Fare (Admin Only)
```http
POST /api/fares
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fromStation": "64a7b123456789abcdef0123",
  "toStation": "64a7b123456789abcdef0124",
  "fare": 45,
  "distance": 5.2,
  "duration": 15
}
```

#### Update Fare (Admin Only)
```http
PUT /api/fares/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fare": 50,
  "distance": 5.5,
  "duration": 18
}
```

### User Profile Endpoints

#### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Updated Doe",
  "phoneNumber": "+1234567891",
  "photo": "https://example.com/photo.jpg"
}
```

#### Deposit Money
```http
POST /api/users/deposit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100,
  "paymentMethod": "cash"
}
```

#### Get User Statistics
```http
GET /api/users/statistics
Authorization: Bearer <token>
```

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "user": {
      "id": "64a7b123456789abcdef0123",
      "fullName": "John Doe",
      "email": "john@example.com"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation error: Email is required",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Stations retrieved successfully",
  "data": [
    {
      "id": "64a7b123456789abcdef0123",
      "name": "Dhaka University",
      "code": "DU"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🗄️ Database Schema

### User Model
```javascript
{
  fullName: String,
  email: String (unique),
  phoneNumber: String,
  password: String (hashed),
  balance: Number (default: 0),
  totalTrips: Number (default: 0),
  totalExpense: Number (default: 0),
  role: String (enum: ['user', 'admin']),
  photo: String (URL),
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Station Model
```javascript
{
  name: String,
  code: String (unique, 2-4 chars),
  location: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  address: String,
  zone: String,
  facilities: [String],
  description: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Fare Model
```javascript
{
  fromStation: ObjectId (ref: 'Station'),
  toStation: ObjectId (ref: 'Station'),
  fare: Number,
  distance: Number,
  duration: Number (minutes),
  fareType: String (default: 'regular'),
  isActive: Boolean (default: true),
  effectiveFrom: Date,
  effectiveTo: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Trip Model
```javascript
{
  tripCode: String (unique, e.g., 'TRIP-ABC123'),
  user: ObjectId (ref: 'User'),
  boardingStation: ObjectId (ref: 'Station'),
  dropStation: ObjectId (ref: 'Station'),
  boardingStationName: String,
  dropStationName: String,
  fare: Number,
  totalAmount: Number,
  numberOfPassengers: Number,
  status: String (enum: ['created', 'used', 'expired']),
  paymentMethod: String,
  createdAt: Date,
  usedAt: Date,
  expiresAt: Date
}
```

## 🛠️ Development

### Project Structure
```
├── models/                 # Mongoose database models
│   ├── User.js
│   ├── Station.js
│   ├── Fare.js
│   └── Trip.js
├── routes/                 # Express route handlers
│   ├── auth.js
│   ├── users.js
│   ├── stations.js
│   ├── fares.js
│   └── trips.js
├── middleware/             # Custom middleware
│   ├── auth.js            # JWT authentication
│   └── errorHandler.js    # Global error handling
├── utils/                  # Utility functions
│   ├── asyncHandler.js    # Async error wrapper
│   └── responseHandler.js # Standardized responses
├── scripts/               # Database scripts
│   └── addSampleFares.js  # Sample data generation
├── .env                   # Environment variables (ignored)
├── env.example           # Environment template
├── server.js             # Express server setup
├── lambda.js             # AWS Lambda handler
├── serverless.yml        # Serverless configuration
└── package.json          # Dependencies and scripts
```

### Available Scripts
```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm run offline      # Start serverless offline for Lambda testing
npm run deploy       # Deploy to AWS Lambda (dev stage)
npm run deploy:prod  # Deploy to AWS Lambda (prod stage)
npm run logs         # View AWS Lambda logs
npm run remove       # Remove deployed stack
```

### Environment Variables
Create a `.env` file based on `env.example`:

```bash
cp env.example .env
```

**Never commit the `.env` file to version control!**

## 🚀 Deployment

### AWS Lambda Deployment

1. **Configure AWS CLI:**
   ```bash
   aws configure
   ```

2. **Deploy to Development:**
   ```bash
   npm run deploy
   ```

3. **Deploy to Production:**
   ```bash
   npm run deploy:prod
   ```

### Traditional Server Deployment

1. **Set production environment variables**
2. **Install production dependencies:**
   ```bash
   npm install --production
   ```
3. **Start with PM2:**
   ```bash
   pm2 start server.js --name metro-api
   ```

## 🔐 Security Features

- **JWT Authentication** with secure token expiration
- **Password Hashing** using bcryptjs
- **Input Validation** with express-validator
- **CORS** protection for cross-origin requests
- **Environment Variables** for sensitive configuration
- **Admin Role Protection** for administrative endpoints
- **Database Query Sanitization** via Mongoose

## 🧪 Testing

### Sample Data
Run the sample data script to populate your database:

```bash
node scripts/addSampleFares.js
```

### API Testing
Import the Postman collection for complete API testing:
- File: `MetroRapidPass.postman_collection.json`

## 📦 Dependencies

### Production Dependencies
- **express**: Web framework
- **mongoose**: MongoDB ODM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **express-validator**: Input validation
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **serverless-http**: Serverless wrapper for Express
- **uuid**: Unique identifier generation

### Development Dependencies
- **nodemon**: Development auto-restart
- **serverless-offline**: Local Lambda testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 📞 Support

For support, questions, or contributions, please open an issue in the GitHub repository.

---

**Built with ❤️ for efficient metro rail transportation**