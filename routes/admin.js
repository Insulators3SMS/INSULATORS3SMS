const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const {
  fetchSubmissions,
  expandBulkFormC,
  FORM_ID_A, FORM_ID_B, FORM_ID_C, FORM_ID_D,
  API_KEY_A, API_KEY_B, API_KEY_C, API_KEY_D
} = require('../utils/jotformUtils');
const { buildApprenticeData } = require('../utils/apprenticeDataBuilder');

// 🛡️ Restrict access to admins only
function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    res.status(403).send('Access denied. Admins only.');
  }
}

// 🧠 Normalize answers (used only for Forms A & B)
function extractAnswers(sub) {
  const answers = {};
  Object.values(sub.answers || {}).forEach(field => {
    if (field?.name && field.hasOwnProperty('answer')) {
      answers[field.name] = field.answer;
      if (field.name === field.answer) {
        answers['reg'] = field.name;
      }
      if (field.name === 'reg') {
        answers['reg'] = field.answer;
      }
    }
  });
  return answers;
}

// 🔧 Aggregation logic
async function getAggregatedApprenticeData() {
  const usersPath = path.join(__dirname, '..', 'users.json');
  let userRecords = [];
  try {
    const raw = fs.readFileSync(usersPath, 'utf8');
    userRecords = JSON.parse(raw).filter(u => u.reg !== 'admin' && !u.isAdmin);
  } catch (err) {
    console.error('Error reading users.json:', err);
  }

  const apprentices = await Promise.all(
    userRecords.map(async user => {
      const reg = user.reg.toString().trim();
      const apprenticeData = await buildApprenticeData(reg);

      return {
        reg,
        name: user.name || '—',
        email: user.email || '',
        totalHours: apprenticeData.totalHours,
        totalPoints: apprenticeData.totalPoints,
        totalEmployerHours: apprenticeData.totalEmployerHours,
        totalClassHours: apprenticeData.totalClassHours
      };
    })
  );

  return apprentices;
}

// 🏠 Admin homepage
router.get('/', requireAdmin, (req, res) => {
  res.render('adminHome');
});

// ➕➖ Add/Delete apprentice page
router.get('/manage-apprentices', requireAdmin, (req, res) => {
  res.render('manageApprentices');
});

// 👥 View apprentice roster
router.get('/view-apprentices', requireAdmin, async (req, res) => {
  try {
    const apprentices = await getAggregatedApprenticeData();
    res.render("adminViewAll", { apprentices });
  } catch (err) {
    console.error('Error loading apprentice roster:', err);
    if (!res.headersSent) {
      res.status(500).send('Failed to load apprentice roster.');
    }
  }
});
router.get('/record-attendance', requireAdmin, (req, res) => {
  res.render('adminEmbedForm', {
    title: 'Record Class Attendance',
    formUrl: 'https://form.jotform.com/252274710275152'
  });
});

router.get('/record-employer-hours', requireAdmin, (req, res) => {
  res.render('adminEmbedForm', {
    title: 'Record Employer Hours',
    formUrl: 'https://form.jotform.com/252059096099063'
  });
});
// 📊 Aggregated apprentice dashboard
router.get('/viewall', requireAdmin, async (req, res) => {
  try {
    const apprentices = await getAggregatedApprenticeData();
    res.render('adminViewAll', { apprentices });
  } catch (err) {
    console.error('Error loading apprentice data:', err);
    if (!res.headersSent) {
      res.status(500).send('Failed to load apprentice data.');
    }
  }
});

// 👤 View individual apprentice dashboard (admin side)
router.get('/apprentice/:reg', requireAdmin, async (req, res) => {
  const regKey = req.params.reg?.toString().trim();
  if (!regKey) return res.status(400).send('Missing apprentice reg number.');

  try {
    const usersPath = path.join(__dirname, '..', 'users.json');
    const raw = fs.readFileSync(usersPath, 'utf8');
    const userRecords = JSON.parse(raw);
    const user = userRecords.find(u => u.reg?.toString().trim() === regKey);

    if (!user) return res.status(404).send('Apprentice not found.');

    const apprenticeData = await buildApprenticeData(regKey);

    res.render('adminViewApprentice', { user, apprenticeData });
  } catch (err) {
    console.error('Error loading individual apprentice view:', err);
    res.status(500).send('Failed to load apprentice dashboard.');
  }
});

router.get('/advance/:reg', requireAdmin, async (req, res) => {
  const regKey = req.params.reg?.toString().trim();
  if (!regKey) return res.status(400).send('Missing apprentice reg number.');

  try {
    const usersPath = path.join(__dirname, '..', 'users.json');
    const raw = fs.readFileSync(usersPath, 'utf8');
    const userRecords = JSON.parse(raw);
    const user = userRecords.find(u => u.reg?.toString().trim() === regKey);

    if (!user) return res.status(404).send('Apprentice not found.');

    // Embed Form E for advancement
    const jotformURL = `https://form.jotform.com/252385003600142?typeA22=${regKey}`;

    res.render('adminAdvanceApprentice', {
      user,
      reg: regKey,
      jotformURL
    });
  } catch (err) {
    console.error('Error loading advancement form:', err);
    res.status(500).send('Failed to load advancement form.');
  }
});

// 🧮 Assess apprentice points (admin side)
router.get('/points/:reg', requireAdmin, async (req, res) => {
  const regKey = req.params.reg?.toString().trim();
  if (!regKey) return res.status(400).send('Missing apprentice reg number.');

  try {
    const usersPath = path.join(__dirname, '..', 'users.json');
    const raw = fs.readFileSync(usersPath, 'utf8');
    const userRecords = JSON.parse(raw);
    const user = userRecords.find(u => u.reg?.toString().trim() === regKey);

    if (!user) return res.status(404).send('Apprentice not found.');

    const bSubs = await fetchSubmissions(FORM_ID_B, API_KEY_B);
    const filtered = bSubs
      .map(sub => ({ ...sub, answers: extractAnswers(sub) }))
      .filter(sub => sub.answers?.reg?.toString().trim() === regKey);

    const totalPoints = filtered.reduce((sum, sub) => {
      return sum + (parseInt(sub.answers?.calculation || '0') || 0);
    }, 0);

    res.render('adminAssessPoints', {
      user,
      reg: regKey,
      formId: FORM_ID_B,
      submissions: filtered,
      totalPoints
    });
  } catch (err) {
    console.error('Error loading points assessment:', err);
    res.status(500).send('Failed to load apprentice points.');
  }
});

module.exports = router;