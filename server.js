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

// KPI data endpoint - Validated with interview data
app.get('/api/kpis', (req, res) => {
  // Mock data validated with interview insights
  const kpis = {
    salesOverTime: {
      labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      // Sales reflect more activity towards the weekend
      data: [1850, 1700, 2100, 2300, 2800, 3500, 3100] 
    },
    topSellingProducts: {
      // Products are generic daily items as mentioned by the frequent client
      labels: ['Agua Embotellada 600ml', 'Galletas de Soda', 'Jabón de Tocador', 'Arroz (1kg)', 'Aceite Vegetal (1L)'],
      data: [180, 155, 120, 90, 75] // Units sold
    },
    lowStockProducts: {
      // Reflects specific products that a customer might not find
      labels: ['Atún en lata', 'Mayonesa (200g)', 'Café Instantáneo', 'Leche Deslactosada', 'Pan Molde'],
      data: [8, 5, 9, 4, 6] // Units in stock, reflecting the issue of finding specific items
    }
  };
  res.json(kpis);
});

const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }).then(async () => {
  console.log('Sessions table ensured by connect-pg-simple.');

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to sync database:', err);
});