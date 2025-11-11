// utils/getAllApprentices.js

const {
  fetchSubmissions,
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
} = require('./jotformUtils');

async function getAllApprentices() {
  // 🔄 Fetch all submissions from all forms
  const [formA, formB, formC, formD] = await Promise.all([
    fetchSubmissions(FORM_ID_A, API_KEY_A),
    fetchSubmissions(FORM_ID_B, API_KEY_B),
    fetchSubmissions(FORM_ID_C, API_KEY_C),
    fetchSubmissions(FORM_ID_D, API_KEY_D)
  ]);

  // 🔍 Expand bulk Form C entries
  const expandedFormC = formC.flatMap(expandBulkFormC);

  // 🧩 Combine all submissions
  const allSubmissions = [...formA, ...formB, ...expandedFormC, ...formD];

  // 🧠 Group by apprentice reg number
  const grouped = groupSubmissionsByReg(allSubmissions);

  // 📊 Transform grouped data into array of totals
  const apprenticeSummaries = Object.entries(grouped).map(([reg, data]) => {
    const name = Object.keys(data.nameCount)[0] || '—';
    return {
      reg,
      name,
      totalHours: data.totalHours,
      totalPoints: data.totalPoints,
      totalEmployerHours: data.totalEmployerHours,
      totalClassHours: data.totalClassHours
    };
  });

  return apprenticeSummaries;
}

module.exports = getAllApprentices;