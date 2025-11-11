require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

// 🧭 Routes
const adminRoutes = require('./routes/admin');
const apprenticeRoutes = require('./routes/apprentice');

// 🛠️ Utils
const {
  fetchSubmissions,
  extractAnswers,
  expandBulkFormC,
  groupSubmissionsByReg
} = require('./utils/jotformUtils');

const { buildApprenticeData } = require('./utils/apprenticeDataBuilder');

const app = express();
const PORT = process.env.PORT || 3000;

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

// 🧭 Mount routes
app.use('/admin', adminRoutes);
app.use('/apprentice', apprenticeRoutes);

// 🔐 Load user credentials
let users = [];
try {
  users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
} catch (err) {
  console.error('Failed to load users.json:', err);
}

// 🔐 Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.user = user;
    return res.redirect(user.role === 'admin' ? '/admin/home' : '/dashboard');
  }

  res.status(401).send(`
    <h2>Login failed</h2>
    <p>Invalid username or password.</p>
    <p><a href="/login.html">Try again</a></p>
  `);
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

// 🏛️ Admin Dashboard
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

// 🚪 Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Error logging out');
    res.redirect('/login.html');
  });
});

// 🏠 Root route
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