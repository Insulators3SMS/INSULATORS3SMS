const axios = require('axios');

// ✅ Replace these with your actual form IDs and API keys
const FORM_ID_A = '240755677560162';
const API_KEY_A = '499cbbb838d4e8480f8d31d33c2623a5';
const FORM_ID_B = '252054690292053';
const API_KEY_B = 'c44294cbe6aa15d13be3cb5fae3e2f0f';
const FORM_ID_C = '252059096099063';
const API_KEY_C = '100ab5d44da2ea5daa192f3e4b04aff3';
const FORM_ID_D = '252274710275152';
const API_KEY_D = '60776cc91bd9c89bda6d8321e6724546';

async function fetchSubmissions(formId, apiKey) {
  const allSubmissions = [];
  let offset = 0;
  const limit = 200;
  let hasMore = true;

  try {
    while (hasMore) {
      const url = `https://api.jotform.com/form/${formId}/submissions?apiKey=${apiKey}&limit=${limit}&offset=${offset}`;
      const response = await axios.get(url);
      const batch = response.data.content || [];

      allSubmissions.push(...batch);
      hasMore = batch.length === limit;
      offset += limit;
    }

    return allSubmissions;
  } catch (err) {
    console.error(`Paginated fetch error for form ${formId}:`, err);
    return [];
  }
}

function extractAnswers(sub) {
  const answers = {};
  for (const [key, field] of Object.entries(sub.answers || {})) {
    const name = field?.name || key;
    if (name) {
      answers[name] = field.hasOwnProperty('answer') ? field.answer : field;
    }
  }
  return answers;
}

function expandBulkFormC(sub, answers, formId) {
  const expanded = [];

  Object.entries(answers).forEach(([key, value]) => {
    if (/^\d{5,}$/.test(key)) {
      expanded.push({
        ...sub,
        formId,
        answers: {
          reg: key,
          [key]: value,
          date: answers['date'],
          classDate: answers['classDate'],
          memberName: answers['memberName']
        }
      });
    }
  });

  return expanded;
}

function groupSubmissionsByReg(submissions, filterReg = '') {
  const grouped = {};

  submissions.forEach(sub => {
    const answers = sub.answers;
    const reg = answers['reg']?.trim();
    if (!reg || (filterReg && reg !== filterReg)) return;

    if (!grouped[reg]) {
      grouped[reg] = {
        submissions: [],
        nameCount: {},
        totalHours: 0,
        totalPoints: 0,
        totalEmployerHours: 0,
        totalClassHours: 0
      };
    }

    const formId = sub.form_id || sub.formId || null;
    const name = answers['memberName'];
    const fullName = typeof name === 'object'
      ? `${name.last || ''} ${name.first || ''}`.trim()
      : name?.trim() || '—';

    if (formId === FORM_ID_A && fullName && fullName !== '—') {
      grouped[reg].nameCount = { [fullName]: Infinity };
    } else if (fullName && fullName !== '—') {
      grouped[reg].nameCount[fullName] = (grouped[reg].nameCount[fullName] || 0) + 1;
    }

    grouped[reg].submissions.push(sub);

    switch (formId) {
      case FORM_ID_A:
        grouped[reg].totalHours += parseFloat(answers['totalHours'] || answers['hours'] || '0') || 0;
        break;
      case FORM_ID_B:
        grouped[reg].totalPoints += parseInt(answers['calculation'] || '0') || 0;
        break;
      case FORM_ID_C: {
        let employerHours = 0;
        if (answers['employerHours']) employerHours += parseFloat(answers['employerHours']) || 0;
        if (answers[reg]) employerHours += parseFloat(answers[reg]) || 0;
        grouped[reg].totalEmployerHours += employerHours;
        break;
      }
      case FORM_ID_D: {
        let classHours = 0;
        if (answers['classHours']) classHours += parseFloat(answers['classHours']) || 0;
        if (answers[reg]) classHours += parseFloat(answers[reg]) || 0;
        grouped[reg].totalClassHours += classHours;
        break;
      }
    }
  });

  return grouped;
}

module.exports = {
  fetchSubmissions,
  extractAnswers,
  expandBulkFormC,
  groupSubmissionsByReg,
  FORM_ID_A,
  FORM_ID_B,
  FORM_ID_C,
  FORM_ID_D,
  API_KEY_A,
  API_KEY_B,
  API_KEY_C,
  API_KEY_D
};