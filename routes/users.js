const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const userController = require('../controllers/userController');

// All user routes require admin authentication
router.use(protect, admin);

// @desc    Get all users
// @route   GET /users
router.get('/', userController.getAllUsers);

// @desc    Update user
// @route   PUT /users/:id
router.put('/:id', userController.updateUser);

// @desc    Delete user
// @route   DELETE /users/:id
router.delete('/:id', userController.deleteUser);

module.exports = router;
