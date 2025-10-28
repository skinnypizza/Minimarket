const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    next();
  } catch (err) {
    console.error(err);
    res.redirect('/auth/login');
  }
};

exports.admin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.redirect('/dashboard');
  }
};