const express = require('express');
const { body, validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHandler');
const { protect, admin } = require('../middleware/auth');
const Fare = require('../models/Fare');
const Station = require('../models/Station');

const router = express.Router();

// @desc    Get all fares
// @route   GET /api/fares
// @access  Public
const getAllFares = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const fromStation = req.query.fromStation || '';
  const toStation = req.query.toStation || '';
  const fareType = req.query.fareType || '';

  const query = { isActive: true };

  // Add filters
  if (fromStation) query.fromStation = fromStation;
  if (toStation) query.toStation = toStation;
  if (fareType) query.fareType = fareType;

  const skip = (page - 1) * limit;

  const fares = await Fare.find(query)
    .populate('fromStation', 'name code')
    .populate('toStation', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Fare.countDocuments(query);

  paginatedResponse(res, fares, page, limit, total, 'Fares retrieved successfully');
});

// @desc    Get fare by ID
// @route   GET /api/fares/:id
// @access  Public
const getFareById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const fare = await Fare.findById(id)
    .populate('fromStation', 'name code')
    .populate('toStation', 'name code');

  if (!fare) {
    return errorResponse(res, 'Fare not found', 404);
  }

  successResponse(res, { fare }, 'Fare retrieved successfully');
});

// @desc    Get fare between stations
// @route   GET /api/fares/route
// @access  Public
const getFareBetweenStations = asyncHandler(async (req, res) => {
  const { fromStation, toStation, fareType = 'regular' } = req.query;

  if (!fromStation || !toStation) {
    return errorResponse(res, 'From station and to station are required', 400);
  }

  const fare = await Fare.getFare(fromStation, toStation, fareType);

  if (!fare) {
    return errorResponse(res, 'Fare not found for this route', 404);
  }

  successResponse(res, { fare }, 'Fare retrieved successfully');
});

// @desc    Get fare in between stations (by station names)
// @route   GET /api/fares/in-between
// @access  Public
const getFareInBetween = asyncHandler(async (req, res) => {
  const { fromStationId, toStationId, fareType = 'regular' } = req.query;

  if (!fromStationId || !toStationId) {
    return errorResponse(res, 'From station and to station are required', 400);
  }

  console.log(`🔍 Searching for fare from "${fromStationId}" to "${toStationId}"`);

  // First, find the stations by name
  const fromStationDoc = await Station.findOne({ 
    _id: fromStationId 
  });
  const toStationDoc = await Station.findOne({ 
    _id: toStationId 
  });

  if (!fromStationDoc) {
    return errorResponse(res, `From station "${fromStationId}" not found`, 404);
  }

  if (!toStationDoc) {
    return errorResponse(res, `To station "${toStationId}" not found`, 404);
  }

  console.log(`📍 Found stations: ${fromStationDoc.name} (${fromStationDoc._id}) -> ${toStationDoc.name} (${toStationDoc._id})`);

  // Find fare between these stations
  const fare = await Fare.findOne({
    fromStation: fromStationDoc._id,
    toStation: toStationDoc._id,
    fareType: fareType,
    isActive: true
  }).populate('fromStation', 'name code')
    .populate('toStation', 'name code');

  if (!fare) {
    console.log(`❌ No fare found for route: ${fromStationDoc.name} -> ${toStationDoc.name}`);
    return errorResponse(res, `No fare found for route: ${fromStationDoc.name} to ${toStationDoc.name}`, 404);
  }

  console.log(`✅ Found fare: $${fare.fare} for route: ${fromStationDoc.name} -> ${toStationDoc.name}`);

  successResponse(res, { fare }, 'Fare retrieved successfully');
});

// @desc    Create new fare
// @route   POST /api/fares
// @access  Private/Admin
const createFare = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, 400);
  }

  const {
    fromStation,
    toStation,
    fare,
    distance,
    duration,
    fareType = 'regular',
    effectiveFrom,
    effectiveTo
  } = req.body;

  // Check if stations exist
  const fromStationExists = await Station.findById(fromStation);
  const toStationExists = await Station.findById(toStation);

  if (!fromStationExists || !toStationExists) {
    return errorResponse(res, 'One or both stations not found', 404);
  }

  // Check if fare already exists for this route and type
  const existingFare = await Fare.findOne({
    fromStation,
    toStation,
    fareType,
    isActive: true
  });

  if (existingFare) {
    return errorResponse(res, 'Fare already exists for this route and type', 400);
  }

  // Create fare
  const newFare = await Fare.create({
    fromStation,
    toStation,
    fare,
    distance,
    duration,
    fareType,
    effectiveFrom: effectiveFrom || new Date(),
    effectiveTo
  });

  await newFare.populate('fromStation', 'name code');
  await newFare.populate('toStation', 'name code');

  successResponse(res, { fare: newFare }, 'Fare created successfully', 201);
});

// @desc    Update fare (only fare amount, distance, and duration)
// @route   PUT /api/fares/:id
// @access  Private/Admin
const updateFare = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, 400);
  }

  const { id } = req.params;
  const { fare, distance, duration } = req.body;

  // Check if any non-editable fields are being sent
  const nonEditableFields = ['fromStation', 'toStation', 'fareType', 'effectiveFrom', 'effectiveTo', 'isActive'];
  const sentFields = Object.keys(req.body);
  const invalidFields = sentFields.filter(field => nonEditableFields.includes(field));
  
  if (invalidFields.length > 0) {
    return errorResponse(res, `Cannot edit the following fields: ${invalidFields.join(', ')}. Only fare, distance, and duration can be updated.`, 400);
  }

  const fareRecord = await Fare.findById(id);

  if (!fareRecord) {
    return errorResponse(res, 'Fare not found', 404);
  }

  // Update only editable fields
  if (fare !== undefined) fareRecord.fare = fare;
  if (distance !== undefined) fareRecord.distance = distance;
  if (duration !== undefined) fareRecord.duration = duration;

  await fareRecord.save();

  await fareRecord.populate('fromStation', 'name code');
  await fareRecord.populate('toStation', 'name code');

  successResponse(res, { fare: fareRecord }, 'Fare updated successfully');
});

// @desc    Delete fare
// @route   DELETE /api/fares/:id
// @access  Private/Admin
const deleteFare = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const fare = await Fare.findById(id);

  if (!fare) {
    return errorResponse(res, 'Fare not found', 404);
  }

  // Soft delete - set isActive to false
  fare.isActive = false;
  await fare.save();

  successResponse(res, null, 'Fare deleted successfully');
});

// @desc    Get fares by station
// @route   GET /api/fares/station/:stationId
// @access  Public
const getFaresByStation = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const { direction = 'both' } = req.query; // 'from', 'to', or 'both'

  let query = { isActive: true };

  if (direction === 'from') {
    query.fromStation = stationId;
  } else if (direction === 'to') {
    query.toStation = stationId;
  } else {
    query.$or = [
      { fromStation: stationId },
      { toStation: stationId }
    ];
  }

  const fares = await Fare.find(query)
    .populate('fromStation', 'name code')
    .populate('toStation', 'name code')
    .sort({ fare: 1 });

  successResponse(res, { fares }, 'Fares retrieved successfully');
});

// Validation middleware for creating fares
const fareValidation = [
  body('fromStation')
    .isMongoId()
    .withMessage('Valid from station ID is required'),
  body('toStation')
    .isMongoId()
    .withMessage('Valid to station ID is required'),
  body('fare')
    .isFloat({ min: 0 })
    .withMessage('Fare must be a positive number'),
  body('distance')
    .isFloat({ min: 0 })
    .withMessage('Distance must be a positive number'),
  body('duration')
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
  body('fareType')
    .optional()
    .isIn(['regular', 'peak', 'off-peak', 'student', 'senior'])
    .withMessage('Invalid fare type'),
  body('effectiveFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid effective from date'),
  body('effectiveTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid effective to date')
];

// Validation middleware for editing fares (only editable fields)
const fareEditValidation = [
  body('fare')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fare must be a positive number'),
  body('distance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Distance must be a positive number'),
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute')
];

// Routes
router.get('/', getAllFares);
router.get('/route', getFareBetweenStations);
router.get('/in-between', getFareInBetween);
router.get('/station/:stationId', getFaresByStation);
router.get('/:id', getFareById);
router.post('/', protect, admin, fareValidation, createFare);
router.put('/:id', protect, admin, fareEditValidation, updateFare);
router.delete('/:id', protect, admin, deleteFare);

module.exports = router; 