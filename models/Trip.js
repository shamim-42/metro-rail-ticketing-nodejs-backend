const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const tripSchema = new mongoose.Schema({
  tripCode: {
    type: String,
    required: true,
    unique: true,
    default: () => `TRIP-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  fromStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: [true, 'From station is required']
  },
  toStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: [true, 'To station is required']
  },
  fare: {
    type: Number,
    required: [true, 'Fare is required'],
    min: [0, 'Fare cannot be negative']
  },
  numberOfPassengers: {
    type: Number,
    required: [true, 'Number of passengers is required'],
    min: [1, 'At least 1 passenger is required'],
    max: [10, 'Maximum 10 passengers allowed']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['created', 'used', 'expired', 'cancelled'],
    default: 'created'
  },
  usedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // Trip expires in 24 hours from creation
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  journeyStartTime: {
    type: Date,
    default: null
  },
  journeyEndTime: {
    type: Date,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['balance', 'cash', 'card'],
    default: 'balance'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// // Index for trip code searches
// tripSchema.index({ tripCode: 1 });

// Index for user trips
tripSchema.index({ user: 1, createdAt: -1 });

// Index for status queries
tripSchema.index({ status: 1, expiresAt: 1 });

// Method to use trip
tripSchema.methods.useTrip = function() {
  if (this.status !== 'created') {
    throw new Error('Trip cannot be used. Status: ' + this.status);
  }
  
  if (this.expiresAt < new Date()) {
    this.status = 'expired';
    throw new Error('Trip has expired');
  }
  
  this.status = 'used';
  this.usedAt = new Date();
  this.journeyStartTime = new Date();
  
  return this.save();
};

// Method to complete journey
tripSchema.methods.completeJourney = function() {
  if (this.status !== 'used') {
    throw new Error('Journey cannot be completed. Trip status: ' + this.status);
  }
  
  this.journeyEndTime = new Date();
  return this.save();
};

// Static method to get valid trip by code
tripSchema.statics.getValidTrip = async function(tripCode) {
  const trip = await this.findOne({
    tripCode: tripCode,
    status: 'created',
    expiresAt: { $gt: new Date() }
  }).populate('user', 'fullName phoneNumber')
    .populate('fromStation', 'name code')
    .populate('toStation', 'name code');
  
  return trip;
};

// Static method to get user's trip history
tripSchema.statics.getUserHistory = async function(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  const trips = await this.find({ user: userId })
    .populate('fromStation', 'name code')
    .populate('toStation', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await this.countDocuments({ user: userId });
  
  return {
    trips,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Static method to get unused trips
tripSchema.statics.getUnusedTrips = async function(userId) {
  return await this.find({
    user: userId,
    status: 'created',
    expiresAt: { $gt: new Date() }
  }).populate('fromStation', 'name code')
    .populate('toStation', 'name code')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Trip', tripSchema); 