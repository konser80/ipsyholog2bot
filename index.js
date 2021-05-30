// const express = require('express');
const async = require('async');
const notify = require('notify');
const config = require('./config');
// const routes = require('./router');
// const logger = require('./bot/logger');
const poster = require('./bot/poster');
const triggers = require('./bot/triggers');
const common = require('./common');
const bot = require('./bot');
require('useful');

// const isProd = process.env.NODE_ENV !== 'development';
let data = {};

// create server
// const app = express();
// app.use(routes);

// terminate procedures
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

async.auto({
  importTriggers: (cb) => { triggers.importTriggers(data, cb); },
  loadGoogle: (cb) => {
    common.loadData(['posts', 'chats'], (e, res) => {
      if (e) {
        console.error(`[-] load google data: ${e.message}`);
        return cb(e);
      }
      console.log('[+] google: OK');
      data = Object.assign(data, res);
      return cb();
    });
  },
  loadTriggers: ['importTriggers', 'loadGoogle', (res, cb) => { triggers.loadTriggers(data, cb); }],
  launchBot: ['loadTriggers', 'loadGoogle', (res, cb) => {
    // init telegram bot
    bot.init(bot, data);
    // launch
    bot.launch(config.launch)
      .then(() => {
        console.log('[+] bot started');
        data.bot = bot;
        return cb();
      })
      .catch((e) => {
        console.error(`[-] bot start error: ${e.message}`);
        return cb(e);
      });
  }],
  setSchedules: ['launchBot', (res, cb) => { poster.setSchedules(data); cb(); }],
}, (e) => {
  notify('[ipsyholog2bot] (re)start bot');

  if (e) {
    console.log('[-] shutting down because of an error');
    console.error(e);
    shutdown('SOFT_SHUTDOWN');
    return;
  }

  console.log('[+] service started');
});


// if (isProd) app.use(bot.webhookCallback(config.hookPath));

// start http server
// const server = app.listen(3001, 'localhost', () => {
//   console.debug('[+] server listens port 3001');
//
// });

// load google data


// start bot


function shutdown(signal) {
  console.info(`[x] ${signal} signal received`);

  // logger.exportData(data);
  poster.cancelSchedules(data);
  bot.stop(signal);
  // console.log(res);
  // process.exit(0);

  // server.close((e) => {
  //   if (e) console.log(e);
  //   console.log('[+] HTTP server closed');
  // });
  // .then((m) => console.log(`[ ] bot stop: ${m}`))
  // .catch((e) => console.log(`[ ] bot stop error: ${e.message}`));

  // setTimeout(() => {
  //   console.log('[+] forcefully shutting down');
  //   process.exit(1);
  // }, 15000);
}
