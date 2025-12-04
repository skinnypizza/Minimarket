const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { sequelize, connectDB } = require('./config/db');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const connectPgSimple = require('connect-pg-simple');
const { Pool } = require('pg'); // Import Pool from pg

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

// Create a new pg.Pool instance for connect-pg-simple
const pgPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Session middleware
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool: pgPool, // Use the new pgPool instance
    tableName: 'sessions',   // Use another table-name than the default "session" one
    createTable: true // Automatically create the sessions table if it doesn't exist
  }),
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
app.use('/api/sales', require('./routes/sales'));
app.use('/users', require('./routes/users'));
app.use('/reports', require('./routes/reports'));

const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }).then(async () => {
  console.log('Sessions table ensured by connect-pg-simple.');

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to sync database:', err);
});