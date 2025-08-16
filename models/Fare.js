const mongoose = require('mongoose');

const fareSchema = new mongoose.Schema({
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
    required: [true, 'Fare amount is required'],
    min: [0, 'Fare cannot be negative']
  },
  distance: {
    type: Number,
    required: [true, 'Distance is required'],
    min: [0, 'Distance cannot be negative']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  fareType: {
    type: String,
    enum: ['regular', 'peak', 'off-peak', 'student', 'senior'],
    default: 'regular'
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTo: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index to ensure unique fare between stations
fareSchema.index({ fromStation: 1, toStation: 1, fareType: 1 }, { unique: true });

// Virtual for reverse fare (same fare for return journey)
fareSchema.virtual('reverseFare', {
  ref: 'Fare',
  localField: 'toStation',
  foreignField: 'fromStation',
  justOne: true
});

// Method to get fare between stations
fareSchema.statics.getFare = async function(fromStationId, toStationId, fareType = 'regular') {
  const fare = await this.findOne({
    fromStation: fromStationId,
    toStation: toStationId,
    fareType: fareType,
    isActive: true,
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: new Date() } }
    ]
  }).populate('fromStation', 'name code').populate('toStation', 'name code');
  
  return fare;
};

module.exports = mongoose.model('Fare', fareSchema); 