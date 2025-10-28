const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
  // If user is already logged in, send them to the dashboard
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }

  res.render('login', { user: req.session.user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      res.redirect('/dashboard');
    } else {
      res.redirect('/auth/login');
    }
  } catch (err) {
    console.error(err);
    res.redirect('/auth/login');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;