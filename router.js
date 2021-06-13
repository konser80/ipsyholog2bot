const router = require('express').Router();
const bodyParser = require('body-parser');


// JSON
router.use(bodyParser.json()); // support json encoded bodies
router.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// logger
router.use((req, res, next) => {
  const ip = req.headers['x-real-ip'] || req.ip;
  console.debug(`${ip} ${req.method} ${req.originalUrl} HTTP/${req.httpVersion} ${req.headers['user-agent']}`);
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
