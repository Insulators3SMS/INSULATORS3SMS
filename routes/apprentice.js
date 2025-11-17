const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const requireApprentice = require('../middleware/requireApprentice');
const requireAdmin = require('../middleware/requireAdmin');
const { fetchSubmissions, extractAnswers } = require('../utils/jotformUtils');
const { buildApprenticeData } = require('../utils/apprenticeDataBuilder');

// 🧭 Apprentice Dashboard
router.get('/dashboard', requireApprentice, async (req, res) => {
  const user = req.session.user;
  const reg = user?.reg;

  if (!reg) return res.status(400).send('Missing apprentice registration number.');

  try {
    const apprenticeData = await buildApprenticeData(reg);
    console.log('✅ Sample answers:', apprenticeData.submissions[0]?.answers);

    res.render('dashboard', {
      title: 'Apprentice Dashboard',
      user,
      apprenticeData
    });
  } catch (err) {
    console.error('Error building apprentice data:', err);
    res.status(500).send('Failed to load apprentice dashboard.');
  }
});

// 📝 Admin View: Time Cards by Apprentice Reg #
router.get('/timecards/:reg', requireAdmin, async (req, res) => {
  const regKey = req.params.reg?.toString().trim();
  if (!regKey) return res.status(400).send('Missing apprentice reg number.');

  try {
    const usersPath = path.join(__dirname, '..', 'users.json');
    const raw = fs.readFileSync(usersPath, 'utf8');
    const userRecords = JSON.parse(raw);
    const user = userRecords.find(u => u.reg?.toString().trim() === regKey);

    if (!user) return res.status(404).send('Apprentice not found.');

    const timeSubs = await fetchSubmissions('240755677560162', process.env.API_KEY_TIME);
    const filtered = timeSubs
      .map(sub => ({ ...sub, answers: extractAnswers(sub) }))
      .filter(sub => sub.answers?.reg?.toString().trim() === regKey);

    const totalHours = filtered.reduce((sum, sub) => {
      return sum + (parseFloat(sub.answers?.hours || '0') || 0);
    }, 0);

    res.render('adminTimeCards', {
      user,
      reg: regKey,
      formId: '240755677560162',
      submissions: filtered,
      totalHours
    });
  } catch (err) {
    console.error('Error loading time cards:', err);
    res.status(500).send('Failed to load apprentice time cards.');
  }
});

// 🧾 Apprentice Submission: Embedded Time Card Form
router.get('/submit-timecard', requireApprentice, (req, res) => {
  console.log('✅ /submit-timecard route triggered');

  const { name, reg } = req.session.user || {};
  if (!name || !reg) return res.status(400).send('Missing apprentice session info.');

  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ');

  const formUrl = `https://form.jotform.com/240755677560162?reg=${reg}&memberName[first]=${encodeURIComponent(firstName)}&memberName[last]=${encodeURIComponent(lastName)}`;

  res.render('apprenticeEmbedForm', {
    title: 'Submit Time Card',
    formUrl
  });
});

// 🧪 Placeholder: Raise Requirements
router.get('/raise-requirements', requireApprentice, (req, res) => {
  res.send('Raise Requirements feature coming soon.');
});

module.exports = router;
