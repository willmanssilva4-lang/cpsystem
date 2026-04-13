const bcrypt = require('bcryptjs');
bcrypt.hash('admin', 10).then(hash => {
  console.log(hash);
}).catch(err => {
  console.error(err);
});
