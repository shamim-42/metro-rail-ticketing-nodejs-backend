const express = require('express');
const { body, validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHandler');
const { protect } = require('../middleware/auth');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Fare = require('../models/Fare');

const router = express.Router();

// @desc    Create a new trip
// @route   POST /api/trips
// @access  Private
const createTrip = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, 400);
  }

  const { fromStation, toStation, numberOfPassengers, paymentMethod = 'balance' } = req.body;

  // Get fare for the route
  const fare = await Fare.getFare(fromStation, toStation);
  
  if (!fare) {
    return errorResponse(res, 'Fare not found for this route', 404);
  }

  const totalAmount = fare.fare * numberOfPassengers;

  // Check if user has sufficient balance
  const user = await User.findById(req.user.id);
  
  if (paymentMethod === 'balance' && user.balance < totalAmount) {
    return errorResponse(res, 'Insufficient balance', 400);
  }

  // Create trip
  const trip = await Trip.create({
    user: req.user.id,
    fromStation,
    toStation,
    fare: fare.fare,
    numberOfPassengers,
    totalAmount,
    paymentMethod
  });

  // Deduct balance if payment method is balance
  if (paymentMethod === 'balance') {
    await user.deductBalance(totalAmount);
  }

  // Populate station details
  await trip.populate('fromStation', 'name code');
  await trip.populate('toStation', 'name code');

  successResponse(res, {
    trip: {
      id: trip._id,
      tripCode: trip.tripCode,
      fromStation: trip.fromStation,
      toStation: trip.toStation,
      fare: trip.fare,
      numberOfPassengers: trip.numberOfPassengers,
      totalAmount: trip.totalAmount,
      status: trip.status,
      expiresAt: trip.expiresAt,
      paymentMethod: trip.paymentMethod,
      paymentStatus: trip.paymentStatus
    }
  }, 'Trip created successfully', 201);
});

// @desc    Use a trip (scan QR code)
// @route   POST /api/trips/use/:tripCode
// @access  Public
const useTrip = asyncHandler(async (req, res) => {
  const { tripCode } = req.params;

  // Get valid trip
  const trip = await Trip.getValidTrip(tripCode);

  if (!trip) {
    return errorResponse(res, 'Invalid or expired trip code', 404);
  }

  try {
    // Use the trip
    await trip.useTrip();

    // Update user trip statistics
    await trip.user.updateTripStats(trip.totalAmount);

    successResponse(res, {
      trip: {
        id: trip._id,
        tripCode: trip.tripCode,
        user: trip.user,
        fromStation: trip.fromStation,
        toStation: trip.toStation,
        fare: trip.fare,
        numberOfPassengers: trip.numberOfPassengers,
        totalAmount: trip.totalAmount,
        status: trip.status,
        usedAt: trip.usedAt,
        journeyStartTime: trip.journeyStartTime
      }
    }, 'Trip used successfully');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

// @desc    Complete journey
// @route   POST /api/trips/:id/complete
// @access  Private
const completeJourney = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trip = await Trip.findById(id);

  if (!trip) {
    return errorResponse(res, 'Trip not found', 404);
  }

  // Check if user owns the trip
  if (trip.user.toString() !== req.user.id) {
    return errorResponse(res, 'Not authorized', 403);
  }

  try {
    await trip.completeJourney();

    successResponse(res, {
      trip: {
        id: trip._id,
        tripCode: trip.tripCode,
        status: trip.status,
        journeyStartTime: trip.journeyStartTime,
        journeyEndTime: trip.journeyEndTime
      }
    }, 'Journey completed successfully');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

// @desc    Get user's trip history
// @route   GET /api/trips/history
// @access  Private
const getTripHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await Trip.getUserHistory(req.user.id, page, limit);

  paginatedResponse(res, result.trips, page, limit, result.total, 'Trip history retrieved successfully');
});

// @desc    Get unused trips
// @route   GET /api/trips/unused
// @access  Private
const getUnusedTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.getUnusedTrips(req.user.id);

  successResponse(res, { trips }, 'Unused trips retrieved successfully');
});

// @desc    Get trip by ID
// @route   GET /api/trips/:id
// @access  Private
const getTripById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trip = await Trip.findById(id)
    .populate('user', 'fullName phoneNumber')
    .populate('fromStation', 'name code')
    .populate('toStation', 'name code');

  if (!trip) {
    return errorResponse(res, 'Trip not found', 404);
  }

  // Check if user owns the trip or is admin
  if (trip.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return errorResponse(res, 'Not authorized', 403);
  }

  successResponse(res, { trip }, 'Trip retrieved successfully');
});

// Validation middleware
const createTripValidation = [
  body('fromStation')
    .isMongoId()
    .withMessage('Valid from station ID is required'),
  body('toStation')
    .isMongoId()
    .withMessage('Valid to station ID is required'),
  body('numberOfPassengers')
    .isInt({ min: 1, max: 10 })
    .withMessage('Number of passengers must be between 1 and 10'),
  body('paymentMethod')
    .optional()
    .isIn(['balance', 'cash', 'card'])
    .withMessage('Invalid payment method')
];

// Routes
router.post('/', protect, createTripValidation, createTrip);
router.get('/history', protect, getTripHistory);
router.get('/unused', protect, getUnusedTrips);
router.post('/use/:tripCode', useTrip);
router.post('/:id/complete', protect, completeJourney);
router.get('/:id', protect, getTripById);

module.exports = router; 