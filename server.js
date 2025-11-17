require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

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
const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));

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

// 🏛️ Admin Dashboard with error handling
app.get('/admin/home', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.redirect('/login.html');
    }

    const reg = req.session.user.reg;
    const submissions = await fetchSubmissions(FORM_ID_C, API_KEY_C);

    const parsed = submissions
      .filter(sub => sub && typeof sub.answers === 'object')
      .map(sub => {
        try {
          return extractAnswers(sub);
        } catch (err) {
          console.warn('Failed to extract answers from submission:', sub?.id || 'unknown');
          return null;
        }
      })
      .filter(ans => ans);

    const apprenticeData = expandBulkFormC(parsed);

    res.render('adminHome', {
      user: {
        name: req.session.user.name,
        reg
      },
      apprenticeData
    });
  } catch (err) {
    console.error('Error rendering /admin/home:', err);
    res.status(500).send(`
      <h2>Admin Dashboard Error</h2>
      <p>Something went wrong while loading your dashboard.</p>
      <p><a href="/logout">Log out</a></p>
    `);
  }
});

// 🚪 Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Error logging out');
    res.redirect('/login.html');
  });
});

// 🏠 Root route
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// 🧱 404 fallback
app.use((req, res) => {
  res.status(404).send('<h2>404 - Page Not Found</h2><p><a href="/login.html">Return to login</a></p>');
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});