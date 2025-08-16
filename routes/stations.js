const express = require('express');
const { body, validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHandler');
const { protect, admin } = require('../middleware/auth');
const Station = require('../models/Station');

const router = express.Router();

// @desc    Get all stations
// @route   GET /api/stations
// @access  Public
const getAllStations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  const zone = req.query.zone || '';

  const query = { isActive: true };

  // Add search filter
  if (search) {
    query.$text = { $search: search };
  }

  // Add zone filter
  if (zone) {
    query.zone = zone;
  }

  const skip = (page - 1) * limit;

  const stations = await Station.find(query)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Station.countDocuments(query);

  paginatedResponse(res, stations, page, limit, total, 'Stations retrieved successfully');
});

// @desc    Get station by ID
// @route   GET /api/stations/:id
// @access  Public
const getStationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const station = await Station.findById(id);

  if (!station) {
    return errorResponse(res, 'Station not found', 404);
  }

  successResponse(res, { station }, 'Station retrieved successfully');
});

// @desc    Create new station
// @route   POST /api/stations
// @access  Private/Admin
const createStation = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, 400);
  }

  const {
    name,
    code,
    latitude,
    longitude,
    address,
    zone,
    facilities = [],
    description
  } = req.body;

  // Check if station already exists
  const orConditions = [{ name }];
  if (code) {
    orConditions.push({ code });
  }
  
  const existingStation = await Station.findOne({
    $or: orConditions
  });

  if (existingStation) {
    const conflictField = existingStation.name === name ? 'name' : 'code';
    return errorResponse(res, `Station with this ${conflictField} already exists`, 400);
  }

  // Create station
  const stationData = {
    name,
    address,
    zone,
    facilities,
    description
  };

  // Only add code if provided
  if (code) {
    stationData.code = code;
  }

  // Only add location if both latitude and longitude are provided
  if (latitude != null && longitude != null) {
    stationData.location = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)]
    };
  }

  const station = await Station.create(stationData);

  successResponse(res, { station }, 'Station created successfully', 201);
});

// @desc    Update station
// @route   PUT /api/stations/:id
// @access  Private/Admin
const updateStation = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, 400);
  }

  const { id } = req.params;
  const {
    name,
    code,
    latitude,
    longitude,
    address,
    zone,
    facilities,
    description,
    isActive
  } = req.body;

  const station = await Station.findById(id);

  if (!station) {
    return errorResponse(res, 'Station not found', 404);
  }

  // Check if name or code already exists (excluding current station)
  if (name || code) {
    const orConditions = [];
    
    if (name) {
      orConditions.push({ name, _id: { $ne: id } });
    }
    
    if (code) {
      orConditions.push({ code, _id: { $ne: id } });
    }

    if (orConditions.length > 0) {
      const existingStation = await Station.findOne({
        $or: orConditions
      });

      if (existingStation) {
        const conflictField = existingStation.name === name ? 'name' : 'code';
        return errorResponse(res, `Station with this ${conflictField} already exists`, 400);
      }
    }
  }

  // Update fields
  if (name) station.name = name;
  if (code !== undefined) {
    station.code = code || undefined; // Set to undefined if empty string or null
  }
  
  // Handle location updates - including null values
  if (latitude !== undefined || longitude !== undefined) {
    if (latitude != null && longitude != null) {
      // Both coordinates provided - update location
      if (!station.location) {
        station.location = { type: 'Point', coordinates: [0, 0] };
      }
      station.location.coordinates = [parseFloat(longitude), parseFloat(latitude)];
    } else if (latitude === null || longitude === null) {
      // One or both coordinates are null - remove location
      station.location = undefined;
    }
  }
  
  if (address) station.address = address;
  if (zone) station.zone = zone;
  if (facilities) station.facilities = facilities;
  if (description !== undefined) station.description = description;
  if (isActive !== undefined) station.isActive = isActive;

  await station.save();

  successResponse(res, { station }, 'Station updated successfully');
});

// @desc    Delete station
// @route   DELETE /api/stations/:id
// @access  Private/Admin
const deleteStation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const station = await Station.findById(id);

  if (!station) {
    return errorResponse(res, 'Station not found', 404);
  }

  // Soft delete - set isActive to false
  station.isActive = false;
  await station.save();

  successResponse(res, null, 'Station deleted successfully');
});

// @desc    Get stations by zone
// @route   GET /api/stations/zone/:zone
// @access  Public
const getStationsByZone = asyncHandler(async (req, res) => {
  const { zone } = req.params;

  const stations = await Station.find({
    zone: zone,
    isActive: true
  }).sort({ name: 1 });

  successResponse(res, { stations }, 'Stations retrieved successfully');
});

// @desc    Get nearby stations
// @route   GET /api/stations/nearby
// @access  Public
const getNearbyStations = asyncHandler(async (req, res) => {
  const { longitude, latitude, maxDistance = 5000 } = req.query; // maxDistance in meters

  if (!longitude || !latitude) {
    return errorResponse(res, 'Longitude and latitude are required', 400);
  }

  const stations = await Station.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseInt(maxDistance)
      }
    },
    isActive: true
  }).sort({ name: 1 });

  successResponse(res, { stations }, 'Nearby stations retrieved successfully');
});

// Validation middleware
const stationValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Station name must be between 2 and 100 characters'),
  body('code')
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage('Station code must be between 2 and 10 characters'),
  body('latitude')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  body('zone')
    .trim()
    .notEmpty()
    .withMessage('Zone is required'),
  body('facilities')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Facilities must be an array'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

// Routes
router.get('/', getAllStations);
router.get('/nearby', getNearbyStations);
router.get('/zone/:zone', getStationsByZone);
router.get('/:id', getStationById);
router.post('/', protect, admin, stationValidation, createStation);
router.put('/:id', protect, admin, stationValidation, updateStation);
router.delete('/:id', protect, admin, deleteStation);

module.exports = router; 