require('dotenv').config();
require('dotenv').config();

const FORM_ID_A = process.env.FORM_ID_A;
const API_KEY_A = process.env.API_KEY_A;

const FORM_ID_B = process.env.FORM_ID_B;
const API_KEY_B = process.env.API_KEY_B;

const FORM_ID_C = process.env.FORM_ID_C;
const API_KEY_C = process.env.API_KEY_C;

const FORM_ID_D = process.env.FORM_ID_D;
const API_KEY_D = process.env.API_KEY_D;
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

// 🧭 Admin routes
const adminRoutes = require('./routes/admin');
const apprenticeRoutes = require('./routes/apprentice');


const {
  fetchSubmissions,
  extractAnswers,
  expandBulkFormC,
  groupSubmissionsByReg,
  FORM_ID_A, FORM_ID_B, FORM_ID_C, FORM_ID_D,
  API_KEY_A, API_KEY_B, API_KEY_C, API_KEY_D
} = require('./utils/jotformUtils');
const { buildApprenticeData } = require('./utils/apprenticeDataBuilder');

const app = express();
const PORT = 3000;

// 🧩 Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key', // 🔒 Replace in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 🧭 Mount admin routes
app.use('/admin', adminRoutes);
app.use('/apprentice', apprenticeRoutes);


// 🔐 Load user credentials
const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));

// 🔐 Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.user = user;

    // Redirect based on role
    if (user.role === 'admin') {
      res.redirect('/admin/home');
    } else {
      res.redirect('/dashboard');
    }
  } else {
    res.status(401).send(`
      <h2>Login failed</h2>
      <p>Invalid username or password.</p>
      <p><a href="/login.html">Try again</a></p>
    `);
  }
});

// 📊 Apprentice Dashboard
app.get('/dashboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/login.html');

  const reg = req.session.user.reg;
  const apprenticeData = await buildApprenticeData(reg);

  res.render('dashboard', {
    user: {
      name: req.session.user.name,
      reg
    },
    apprenticeData
  });
});

  // 🏛️ Admin Dashboard with Apprentice Data
app.get('/admin/home', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/login.html');
  }

  const reg = req.session.user.reg;
  const apprenticeData = await buildApprenticeData(reg);

  res.render('adminHome', {
    user: {
      name: req.session.user.name,
      reg
    },
    apprenticeData
  });
});

// 🚪 Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Error logging out');
    res.redirect('/login.html');
  });
});

app.get('/', (req, res) => {
  res.send(`
    <h2>Welcome to the Insulators Dashboard</h2>
    <p><a href="/login.html">Go to Login</a></p>
  `);
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
