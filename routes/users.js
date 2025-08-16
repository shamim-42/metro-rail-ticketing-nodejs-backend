const express = require('express');
const { body, validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHandler');
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const Trip = require('../models/Trip');

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  successResponse(res, { user }, 'Profile retrieved successfully');
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, 400);
  }

  const { fullName, phoneNumber, photo } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Check if phone number already exists (excluding current user)
  if (phoneNumber && phoneNumber !== user.phoneNumber) {
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return errorResponse(res, 'Phone number already exists', 400);
    }
  }

  // Update fields
  if (fullName) user.fullName = fullName;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (photo !== undefined) user.photo = photo;

  await user.save();

  successResponse(res, { user }, 'Profile updated successfully');
});

// @desc    Deposit money to user account
// @route   POST /api/users/deposit
// @access  Private
const depositMoney = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, 400);
  }

  const { amount, paymentMethod = 'cash', transactionId } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Add balance
  await user.addBalance(amount);

  successResponse(res, {
    user: {
      id: user._id,
      fullName: user.fullName,
      balance: user.balance
    },
    deposit: {
      amount,
      paymentMethod,
      transactionId,
      timestamp: new Date()
    }
  }, 'Deposit successful');
});

// @desc    Get user trip statistics
// @route   GET /api/users/statistics
// @access  Private
const getUserStatistics = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user with current stats
  const user = await User.findById(userId);

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Get additional statistics
  const totalTrips = await Trip.countDocuments({ user: userId });
  const usedTrips = await Trip.countDocuments({ user: userId, status: 'used' });
  const unusedTrips = await Trip.countDocuments({ 
    user: userId, 
    status: 'created',
    expiresAt: { $gt: new Date() }
  });
  const expiredTrips = await Trip.countDocuments({ 
    user: userId, 
    status: 'expired'
  });

  // Get monthly statistics
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const monthlyTrips = await Trip.countDocuments({
    user: userId,
    status: 'used',
    usedAt: { $gte: currentMonth }
  });

  const monthlyExpense = await Trip.aggregate([
    {
      $match: {
        user: user._id,
        status: 'used',
        usedAt: { $gte: currentMonth }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  const monthlyTotal = monthlyExpense.length > 0 ? monthlyExpense[0].total : 0;

  successResponse(res, {
    statistics: {
      totalTrips,
      usedTrips,
      unusedTrips,
      expiredTrips,
      totalExpense: user.totalExpense,
      balance: user.balance,
      monthlyTrips,
      monthlyExpense: monthlyTotal
    }
  }, 'Statistics retrieved successfully');
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  const role = req.query.role || '';

  const query = {};

  // Add search filter
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } }
    ];
  }

  // Add role filter
  if (role) {
    query.role = role;
  }

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(query);

  paginatedResponse(res, users, page, limit, total, 'Users retrieved successfully');
});

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-password');

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  successResponse(res, { user }, 'User retrieved successfully');
});

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, 400);
  }

  const { id } = req.params;
  const { fullName, email, phoneNumber, role, isActive, balance } = req.body;

  const user = await User.findById(id);

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Check if email or phone number already exists (excluding current user)
  if (email || phoneNumber) {
    const existingUser = await User.findOne({
      $or: [
        { email: email || user.email, _id: { $ne: id } },
        { phoneNumber: phoneNumber || user.phoneNumber, _id: { $ne: id } }
      ]
    });

    if (existingUser) {
      return errorResponse(res, 'Email or phone number already exists', 400);
    }
  }

  // Update fields
  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (balance !== undefined) user.balance = balance;

  await user.save();

  successResponse(res, { user }, 'User updated successfully');
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Soft delete - set isActive to false
  user.isActive = false;
  await user.save();

  successResponse(res, null, 'User deleted successfully');
});

// Validation middleware
const profileValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('photo')
    .optional()
    .isURL()
    .withMessage('Please provide a valid photo URL')
];

const depositValidation = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least 1'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'mobile_banking'])
    .withMessage('Invalid payment method'),
  body('transactionId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Transaction ID is required for non-cash payments')
];

const userValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('balance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Balance must be a positive number')
];

// Routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, profileValidation, updateUserProfile);
router.post('/deposit', protect, depositValidation, depositMoney);
router.get('/statistics', protect, getUserStatistics);
router.get('/', protect, admin, getAllUsers);
router.get('/:id', protect, admin, getUserById);
router.put('/:id', protect, admin, userValidation, updateUser);
router.delete('/:id', protect, admin, deleteUser);

module.exports = router; 