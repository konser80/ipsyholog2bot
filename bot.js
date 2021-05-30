const { Telegraf } = require('telegraf');
const config = require('./config');
const logger = require('./bot/logger');
const triggers = require('./bot/triggers');
// const controllers = require('./controllers');

const tgBot = new Telegraf(config.token);

function init(bot, data) {

  // bot.use(logger);
  bot.use(logger.console);

  // reload action
  // bot.command('reloadtriggers', () => triggers.loadTriggers(data));

  bot.use((ctx, next) => logger.addChat(ctx, next, data));

  // bot.start(controllers.onStart);
  // bot.start((ctx) => ctx.reply('Welcome'));

  bot.use((ctx, next) => triggers.message(ctx, next, data));

  bot.help((ctx) => ctx.reply('you need some help?'));
  // bot.hears('hi', (ctx) => ctx.reply('Hey there'));
  // bot.start((ctx) => { ctx.reply('Welcome'); });
  // bot.help(controllers.onHelp);

  // bot.command('getchatid', (ctx) => { ctx.reply(ctx.message.chat.id); });
  // bot.hears('ping', (ctx) => { ctx.reply('here'); });

  // bot.on('text', controllers.onText);

  // bot.configure(services)
  // bot.configure(middlewares)
  // bot.configure(controllers)


  bot.catch((e, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`);
    console.error(e);
  });
}


module.exports = tgBot;
module.exports.init = init;
