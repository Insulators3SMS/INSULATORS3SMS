const {
  fetchSubmissions,
  extractAnswers,
  expandBulkFormC,
  groupSubmissionsByReg,
  FORM_ID_A, FORM_ID_B, FORM_ID_C, FORM_ID_D,
  API_KEY_A, API_KEY_B, API_KEY_C, API_KEY_D
} = require('./jotformUtils');

// 🔧 Form E constants
const FORM_ID_E = '252385003600142';
const API_KEY_E = '6518dd498e21207f65922f0c177385fc';
const STATUS_FIELD = 'typeA22';

const workCategories = {
  'A. Tanks': 'aTanks',
  'B. High Temp Pipe': 'bHigh',
  'C. Plumbing': 'calculation52',
  'D. HVAC Pipe': 'calculation53',
  'E. Flexible Wrap': 'calculation54',
  'F. Rigid Insulation': 'calculation55',
  'G. Pumps and Equipment': 'calculation56',
  'H. Firestop': 'calculation57',
  'I. Chilled/ Vapor Sealing': 'calculation58',
  'J. Hard Covering': 'calculation59',
  'K. Low Temperature': 'calculation60',
  'L. Flexible Foam': 'calculation61',
  'M. Cladding/ Jacketing': 'calculation62',
  'N. Material Handling': 'calculation63',
  'O. Removable Pads': 'calculation64',
  'P. Welding/ Pins': 'calculation65',
  'Q. Cement': 'calculation66',
  'R. Canvas': 'calculation67'
};

const goalHours = {
  'A. Tanks': 300,
  'B. High Temp Pipe': 400,
  'C. Plumbing': 600,
  'D. HVAC Pipe': 500,
  'E. Flexible Wrap': 800,
  'F. Rigid Insulation': 400,
  'G. Pumps and Equipment': 300,
  'H. Firestop': 600,
  'I. Chilled/ Vapor Sealing': 400,
  'J. Hard Covering': 300,
  'K. Low Temperature': 200,
  'L. Flexible Foam': 400,
  'M. Cladding/ Jacketing': 400,
  'N. Material Handling': 300,
  'O. Removable Pads': 100,
  'P. Welding/ Pins': 200,
  'Q. Cement': 100,
  'R. Canvas': 100
};

async function buildApprenticeData(reg) {
  const [subsA, subsB, subsC, subsD, subsE] = await Promise.all([
    fetchSubmissions(FORM_ID_A, API_KEY_A),
    fetchSubmissions(FORM_ID_B, API_KEY_B),
    fetchSubmissions(FORM_ID_C, API_KEY_C),
    fetchSubmissions(FORM_ID_D, API_KEY_D),
    fetchSubmissions(FORM_ID_E, API_KEY_E)
  ]);

  const expandedC = subsC.flatMap(sub => {
    const answers = extractAnswers(sub);
    return expandBulkFormC(sub, answers, FORM_ID_C);
  });

  const expandedD = subsD.flatMap(sub => {
    const answers = extractAnswers(sub);
    return expandBulkFormC(sub, answers, FORM_ID_D);
  });

  if (expandedC.length > 0) {
  console.log('✅ Sample Employer Hours submission:');
  console.log('✅ Sample date:', expandedC[0]?.answers?.date);
  console.log('✅ Sample classDate:', expandedC[0]?.answers?.classDate);
}

if (expandedD.length > 0) {
  console.log('✅ Sample Class Hours submission:');
  console.log('✅ Sample date:', expandedD[0]?.answers?.date);
  console.log('✅ Sample classDate:', expandedD[0]?.answers?.classDate);
}


  const allSubs = [
    ...subsA.map(sub => ({ ...sub, answers: extractAnswers(sub), formId: FORM_ID_A })),
    ...subsB.map(sub => ({ ...sub, answers: extractAnswers(sub), formId: FORM_ID_B })),
    ...expandedC,
    ...expandedD
  ];

  const grouped = groupSubmissionsByReg(allSubs, reg);

  (grouped[reg]?.submissions || []).forEach(sub => {
    console.log(`🧪 Submission ${sub.id}`);
    console.log('Raw answers keys:', Object.keys(sub.answers || {}));
  });

  const apprenticeData = grouped[reg] || {
    submissions: [],
    totalHours: 0,
    totalPoints: 0,
    totalEmployerHours: 0,
    totalClassHours: 0
  };

  const categoryTotals = {};
  for (const [label, field] of Object.entries(workCategories)) {
    categoryTotals[label] = apprenticeData.submissions
      .filter(sub => sub.formId === FORM_ID_A)
      .reduce((sum, sub) => {
        const val = parseFloat(sub.answers[field]) || 0;
        return sum + val;
      }, 0);
  }

  apprenticeData.categoryTotals = categoryTotals;
  apprenticeData.goalHours = goalHours;

  // 🧠 Add apprentice status from Form E
  const parsedE = subsE
    .map(sub => ({ ...sub, answers: extractAnswers(sub) }))
    .filter(sub => sub.answers?.reg?.trim() === reg);

  const sortedE = parsedE.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latestE = sortedE[0];

  apprenticeData.apprenticeStatus = latestE?.answers?.[STATUS_FIELD]?.trim() || 'First Year Apprentice';
  apprenticeData.advancementLink = latestE ? `https://www.jotform.com/submission/${latestE.id}` : null;

  console.log('🔍 Sample submission for reg', reg);
  console.log(JSON.stringify(apprenticeData.submissions[0]?.answers, null, 2));

  return apprenticeData;
}

module.exports = { buildApprenticeData };