const fs = require('fs');
const validator = require('validator');
const fetch = require('node-fetch');
const config = require('../config');
const common = require('../common');
const poster = require('./poster');
require('useful');

const FILENAME = 'triggers.json';


// ==============================================
function processTriggers(ctx, cb, data) {
  const { triggers } = data;

  for (let i = 0; i < triggers.length; i += 1) {

    // process every trigger
    const trigger = triggers[i];
    if (checkTrigger(ctx, trigger)) {
      doTriggerAction(ctx, trigger, data);
      if (trigger.break) break;
    }

  }
  cb(); // non-async
}
// ==============================================
function checkTrigger(ctx, trigger) {
  let res = true;
  if (config.debug) { console.debug('fn.checkTrigger'); console.debug(trigger); }

  for (let i = 0; i < trigger.regex.length; i += 1) {

    const strSource = pathReplace(ctx.update, trigger.regex[i].src);
    if (config.debug) console.debug(`src1: ${trigger.regex[i].src}`);
    if (config.debug) console.debug(`src2: ${strSource}`);

    const sRegex = new RegExp(trigger.regex[i].val, 'i');
    const boolNot = trigger.regex[i].not === 'not';
    if (config.debug) console.debug(`boolNot: ${boolNot}`);

    const regResult = strSource.match(sRegex);
    if (config.debug) { console.debug('regResult:'); console.debug(regResult); }
    if ((!regResult && !boolNot) || (regResult && boolNot)) res = false;
    // console.debug(`result: ${reg_res}, res = ${res}\n`);
  }

  console.debug(`[·] trigger ${trigger.id || ''}: ${res}`);
  return res;
}
// ==============================================
function doTriggerAction(ctx, trigger, data) {

  trigger.actions.forEach((item) => {

    console.log(`[+] trigger action: ${item.action}`);
    // console.debug(ctx.update);
    // console.debug(ctx.update.message);
    // console.debug(ctx.update.message.chat);

    const msgText = pathReplace(ctx.update, item.message || '');
    const extra = {};
    const msg = {
      chat_id: item.to || ctx.update.message?.chat.id || ctx.update.callback_query?.message.chat.id,
      msg_id: ctx.update.message?.message_id || ctx.update.callback_query?.message.message_id,
      text: msgText,
      extra
    };
    if (item.keyboard) {
      extra.reply_markup = {
        keyboard: item.keyboard,
        one_time_keyboard: true,
        resize_keyboard: true
      };
    }

    if (item.inline) {
      console.log('item.inline');
      console.log(item.inline);
      extra.reply_markup = {
        inline_keyboard: [],
      };
      item.inline.forEach((x) => {
        const sButtons = x.split(',');
        const btn = {};
        btn.text = sButtons[0].trim();
        if (validator.isURL(sButtons[1])) btn.url = pathReplace(ctx.update, sButtons[1]);
        if (sButtons[2] !== 'null') btn.callback_data = sButtons[2];
        extra.reply_markup.inline_keyboard.push([btn]);
      });
    }
    if (config.debug) console.debug(msg);

    // actions
    if (item.action === 'text') {
      // console.debug(`[+] reply: ${msgText}`);
      poster.sendMessage(data, msg);
    }
    if (item.action === 'reply') {
      // console.debug(`[+] reply: ${msgText}`);
      msg.extra.reply_to_message_id = msg.msg_id;
      poster.sendMessage(data, msg);
    }

    if (item.action === 'delete') {
      if (config.debug) console.debug(`delete: ${msg.chat_id}:${msg.msg_id}`);
      data.bot.telegram.deleteMessage(msg.chat_id, msg.msg_id);
    }

    if (item.action === 'reloadgoogle') {

      common.loadData(['posts'], (e, res) => {
        if (e) {
          console.error(`[-] load google data: ${e.message}`);
          ctx.reply(`[-] load google data: ${e.message}`);
          return;
        }
        data.posts = res.posts;

        const reply = poster.setSchedules(data);
        msg.text = `google load OK, total posts: ${data.posts.length}, active: ${reply}`;
        console.log(`[+] ${msg.text}`);
        poster.sendMessage(data, msg);
      });
    }

    if (item.action === 'turnoff') {

      poster.cancelSchedules(data);
      console.debug('[+] schedules canceled');
      poster.sendMessage(data, msg);
    }

    if (item.action === 'reload') {
      loadTriggers(data, (e, res) => {
        if (res) msg.text += `\nloaded: ${res}`;
        if (e) msg.text += `\nerrors: ${e}`;
        poster.sendMessage(data, msg);
      });
    }

    if (item.url && item.url !== '') {
      const url = pathReplace(ctx.update, item.url);
      if (validator.isURL(url)) {
        console.log(`[+] URL fetch: ${url}`);
        fetch(url)
          .then((response) => response.text())
          .then((content) => { console.log(content); })
          .catch((e) => { console.error(e); });

      }
    }
  });
}


// ==============================================
function pathReplace(object, strPath) {
  const re = /{(.+?)}/gi;
  let res = strPath;
  let regex = re.exec(strPath);

  while (regex && regex[0] && regex[1]) {

    const replaceText = pathReplaceOnce(object, regex[1]);
    res = res.replace(regex[0], replaceText);
    regex = re.exec(strPath);
  }
  const result = res.replace(/ +/g, ' ');
  return result;
}
// ==============================================
function pathReplaceOnce(object, path) {

  if (!object) return '';

  const pathArray = path.split('.');
  let obj = object;

  for (let i =0; i < pathArray.length; i += 1) {
    const key = pathArray[i];

    // console.debug(key);
    // array element regexp
    const arrayRegexp = /([a-z_]+)\[(\d+)\]/g;
    const arrKeys = arrayRegexp.exec(key);

    // do we have an array?
    if (arrKeys && arrKeys[1] && arrKeys[2]) {

      const arrName = arrKeys[1];
      const arrIndex = parseInt(arrKeys[2]);
      if (!Array.isArray(obj[arrName])) { obj = ''; break; }
      obj = obj[arrName][arrIndex];
    } else {

      // console.debug('object, and it is...');
      // console.debug(obj[key]);
      if (obj[key] === undefined) { obj = ''; break; }
      obj = obj[key];
    }
  } // every path


  if (obj === null || obj === undefined) return '';
  if (typeof (obj) === 'object') return JSON.stringify(obj);
  return obj;
}


// ==============================================
function loadTriggers(data, cb) {

  common.sheetRead(data, 'trigger', (e, res) => {
    if (e) {
      console.error('[-] error reading trigger sheet');
      console.error(e);
      return cb(e);
    }

    let err = '';
    data.triggers = [];
    res.forEach((item, i) => {
      if (item._json) {
        try {
          const parsed = JSON.parse(item._json);
          data.triggers.push(parsed);
          // console.log(parsed);
        } catch (err2) {
          const errText = `trigger parse @ line ${i+2}: ${err2.message}`;
          console.log(`[-] parse error: ${errText}`);
          console.log(item._json);
          err += errText;
        }
      }
    });

    console.log(`[+] triggers loaded: ${data.triggers.length}`);

    exportTriggers(data, () => {
      console.debug('[+] triggers: export done');
      return cb(err, data.triggers.length);
    });
    return true; // just in case
  });
}

// ==============================================
function exportTriggers(data, cb) {
  fs.writeFile(FILENAME, JSON.stringify(data.triggers), (e) => {
    if (e) console.error(e);
    return cb();
  });
}
// ==============================================
function importTriggers(data, cb) {

  fs.readFile(FILENAME, 'utf8', (e, contents) => {
    if (e) {

      console.debug(`[-] triggers read: ${e.message}`);
      data.triggers = [];
      return cb && cb(null, '0 items');
    }

    try {
      const res = JSON.parse(contents);
      data.triggers = res;
      console.debug(`[+] triggers read: ${res.length} items`);
      return cb && cb(null, `${res.length} items`);
    } catch (err) {
      console.debug(`[+] triggers parse: ${err.message}`);
      return cb && cb(err.message);
    }

  });
}

module.exports.message = processTriggers;
module.exports.loadTriggers = loadTriggers;
module.exports.importTriggers = importTriggers;
