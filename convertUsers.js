const fs = require('fs');
const csv = require('csv-parser');

const results = [];

fs.createReadStream('users.csv')
  .pipe(csv({
    mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '') // 🧹 Trim + BOM fix
  }))
  .on('data', (data) => {
    if (data.Name && data.reg && data.password) {
      results.push({
        name: data.Name.trim(),
        reg: data.reg.trim(),
        username: data.reg.trim(),
        password: data.password.trim()
      });
    }
  })
  .on('end', () => {
    fs.writeFileSync('users.json', JSON.stringify(results, null, 2));
    console.log(`✅ Converted ${results.length} users to users.json`);
  });