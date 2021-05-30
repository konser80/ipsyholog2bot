const router = require('express').Router();

// logger
router.use((req, res, next) => {
  console.debug(`${req.headers['x-real-ip'] || req.ip} ${req.method} ${req.originalUrl} HTTP/${req.httpVersion} ${req.headers['user-agent']}`);
  next();
});

// root
// router.get('/', (req, res) => {
//   console.log('=== HEADERS ===');
//   console.log(req.headers);
//   console.log('=== QUERY ===');
//   console.log(req.query);
//
//   console.log('root request');
//   res.send('root');
// });

// start
// router.get('/:id/start', (req, res) => {
//   console.log('=== START ===');
//   console.log(req.params);
//   console.log('=== QUERY ===');
//   console.log(req.query);
//
//   res.send('OK');
// });

// root & all other
router.get('/*', (req, res) => {
  res.send('14400 dialup modem connection: no signal');
});


module.exports = router;
