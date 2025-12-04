const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const reportsController = require('../controllers/reportsController');

/**
 * Reports Routes
 * All routes require admin authentication
 */

// @desc    Get report preview with KPIs
// @route   GET /reports/preview
// @access  Private/Admin
router.get('/preview', protect, admin, reportsController.getReportPreview);

// @desc    Generate and download PDF report
// @route   GET /reports/pdf
// @access  Private/Admin
router.get('/pdf', protect, admin, reportsController.generatePDFReport);

// @desc    Generate and download CSV report
// @route   GET /reports/csv
// @access  Private/Admin
router.get('/csv', protect, admin, reportsController.generateCSVReport);

module.exports = router;
