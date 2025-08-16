const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Station name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Station name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
    uppercase: true,
    maxlength: [10, 'Station code cannot exceed 10 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function(v) {
          return v && v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90'
      }
    }
  },
  address: {
    type: String,
    required: [true, 'Station address is required'],
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  zone: {
    type: String,
    required: [true, 'Zone is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  facilities: {
    type: [{
      type: String,
      enum: ['parking', 'elevator', 'escalator', 'wheelchair', 'restroom', 'food', 'atm', 'wifi']
    }],
    default: []
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Index for geospatial queries (sparse index - only for stations with location)
stationSchema.index({ location: '2dsphere' }, { sparse: true });

// Index for name and code searches
stationSchema.index({ name: 'text', code: 'text' });

module.exports = mongoose.model('Station', stationSchema); 