const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Load config
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cookies
app.use(cookieParser());

// Session middleware
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000, // 30 minutos de inactividad
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  },
  rolling: true // Renueva la sesión en cada petición
}));

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.messages = req.session.messages || [];
  delete req.session.messages;
  next();
});

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/api', require('./routes/api'));
app.use('/cart', require('./routes/cart'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});