console.log('Keys in process.env:');
Object.keys(process.env).forEach(key => {
  const value = process.env[key];
  console.log(`- ${key}: ${value ? 'HAS VALUE' : 'EMPTY'}`);
});
