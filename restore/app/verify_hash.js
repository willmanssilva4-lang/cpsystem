const bcrypt = require('bcryptjs');
const hash = '$2b$10$4x6p.HmWkY4oC025G9pgBO6LLc5bp/hgVKz5GUK/lf50GrATWBbBq';
const pass = 'admin';
console.log('Hash:', hash);
console.log('Pass:', pass);
console.log('Match:', bcrypt.compareSync(pass, hash));
