const express = require('express');
const async = require('async');
const notify = require('notify');
const routes = require('./router');
const config = require('./config');
// const logger = require('./bot/logger');
const poster = require('./bot/poster');
const finances = require('./bot/finances');
const triggers = require('./bot/triggers');
const common = require('./common');
const bot = require('./bot');
require('useful');

let data = {};
let server;

console.log(`[+] production: ${config.isProd}`);


// start process
async.auto({
  importTriggers: (cb) => { triggers.importTriggers(data, cb); },
  loadGoogle: (cb) => {
    common.loadData(['posts', 'chats'], (e, res) => {
      if (e) {
        console.error(`[-] load google data: ${e.message}`);
        return cb(e);
      }
      data = Object.assign(data, res);
      console.log(`[+] google: OK, chats:${data.chats.length}, posts: ${data.posts.length}`);
      return cb();
    });
  },
  inits: (cb) => { finances.init(cb); },
  webserver: (cb) => {

    const app = express();
    app.use(routes);
    if (config.isProd) app.use(bot.webhookCallback(config.hookPath));

    server = app.listen(config.web_port, config.web_host, () => {
      console.log(`[+] http start OK, port ${config.web_port}`);
      cb();
    });
  },
  loadTriggers: ['importTriggers', 'loadGoogle', (res, cb) => { triggers.loadTriggers(data, cb); }],
  launchBot: ['loadTriggers', 'loadGoogle', 'webserver', (res, cb) => {
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

// terminate procedures
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

function shutdown(signal) {
  console.info(`[x] ${signal} signal received`);

  // logger.exportData(data);
  poster.cancelSchedules(data);
  bot.stop(signal);
  // console.log(res);
  // process.exit(0);

  if (server) {
    server.close((e) => {
      if (e) console.log(e);
      console.log('[+] HTTP server closed');
    });
  }
}
