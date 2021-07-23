const dayjs = require('dayjs');
const notify = require('notify');
const config = require('../config');
const data = require('./data');
const poster = require('./poster');

const fin = {};

// ==============================================
async function init(cb) {

  fin.doc = await data.googleOpen(config.doc_finance_id);
  fin.categories = [];
  loadData(cb);
}

// ==============================================
function cmdReload(datas, ctx) {
  console.debug('[+] cmdReload');
  const to = ctx.update.message.chat.id;
  loadData((e, res) => {
    poster.sendMessage(datas, { chat_id: to, text: res });
  });
}

// ==============================================
function loadData(callback) {

  data.googleRead(fin.doc, 'settings', (e, contents) => {
    if (e) {
      console.error(`[-] error reading settings sheet: ${e.message}`);
      console.log(e);
      notify(`#error #ipsy reading settings sheet: ${e.message}`);
      return e.message;
    }

    contents.forEach((item) => {
      if (item.catregex && item.category) {
        fin.categories.push({
          regex: new RegExp(item.catregex, 'i'),
          category: item.category
        });
      }
    });

    console.debug(`[+] categories: ${fin.categories.length}`);
    console.log('[+] finance settings loaded');

    if (callback) callback(null, 'finance settings loaded');
  });
}

// ==============================================
function onMessage(datas, ctx) {
  if (!ctx.update.message && !ctx.update.message.text) return;

  const { text } = ctx.update.message;
  const by = `${ctx.update.message.from.first_name} ${ctx.update.message.from.last_name || ''}`;
  const to = ctx.update.message.chat.id;
  console.log(text);

  addRecord(datas, text, by, to);
}

// ==============================================
async function addRecord(datas, _text, by, to) {

  const text = _text.split('\n')[0];

  const regex = /([\d ]{2,})\W|\W([\d ]{2,})/gi;
  const regexResult = regex.exec(text);
  // if (config.debug) console.debug(regexResult);

  if (!regexResult) {
    poster.sendMessage(datas, { chat_id: to, text: 'сорри, нипанятна' });
    return;
  }

  const rec = new Record();

  const money = getSum(_text);
  rec.sum = money.sum;
  rec.by = by.trim();
  rec.cat = getCategory(_text);
  rec.desc = _text;
  // rec.desc = getDescr(_text);

  console.log(rec);

  try {
    const sheet = fin.doc.sheetsByTitle['finance'];
    await sheet.addRow(rec);

    const msgText = `💰 ${rec.sum}\n📓 ${rec.cat}\n📎 ${rec.desc}`;
    poster.sendMessage(datas, { chat_id: to, text: msgText });
  }
  catch (e) {
    console.error(`[-] error saving finance sheet: ${e.message}`);
    console.log(e);
    notify(`#error #ipsy logsheet save: ${e.message}`);

    poster.sendMessage(datas, { chat_id: to, text: 'ошибка при сохранении, позовите @konser80' });
    return e;
  }


  console.debug('[+] record added');
}

// ==============================================
function getSum(text) {

  // THB
  // let res = testCurrency(/([\d ]{3,}) ?(thb|бат)/gi, fin.rates.thb, 'thb', text);

  // EUR
  // if (!res) res = testCurrency(/([\d ]{3,}) ?(eur|евро)/gi, fin.rates.eur, 'eur', text);

  // USD
  // if (!res) res = testCurrency(/([\d ]{2,}) ?(\$|usd|бакс|доллар)/gi, fin.rates.usd, 'usd', text);
  // if (!res) res = testCurrency(/(\$|usd) ?([\d ]{2,})/g, 73, 'usd', text);

  // BTC
  // if (!res) res = testCurrency(/([\d.]{5,}) ?(btc)/gi, fin.rates.btc, 'btc', text);

  // Default is RUB
  // if (!res)
  const res = testCurrency(/([\d ]{3,})/gi, 1, 'rub', text);

  // console.debug(res);
  // console.debug(`[+] sum: ${res.sum}, curr: ${res.curr}`);
  return res;
}

// ==============================================
function testCurrency(regex, rate, curr, text) {
  const rtest = text.match(regex);
  console.debug(`[?] testing ${curr.toUpperCase()} => ${(rtest !== null)}`);
  if (!rtest) return false;

  // const regRes = regex.exec(text);
  // if (!regRes || !regRes[1] || !regRes[2]) return false;

  const regexAmount = /([\d. ]{2,})/g;
  const regSum = regexAmount.exec(text)[1];
  const iregSum = parseFloat(regSum.replace(/[^\d.]/g, ''));
  const rub = Math.round(iregSum * (rate || 1));

  // console.debug(`[+] regex: ${regSum}, parse: ${iregSum}, conversion: ${rub}`);
  const res = { sum: rub, amount: iregSum, curr };
  console.debug(res);
  return res;
}

// ==============================================
function getCategory(text) {

  let res = 'other';

  const regex = /(?:#)([а-яa-z]+)/i;
  const regRes = regex.exec(text);
  if (regRes && regRes[1]) {
    res = regRes[1].toLowerCase();
    console.debug(`[+] cat inside text: ${res}`);
    return res;
  }

  fin.categories.forEach((cat) => {
    if (text.match(cat.regex)) {
      res = cat.category;
      console.debug(`[+] category regex (${cat.regex}) match: ${res}`);
    }
  });

  return res;
}


// ==============================================
// Objects
function Record() {
  this.date = dayjs().format('YYYY-MM-DD HH:mm:ss');
  this.mon = dayjs().format('YYYY-MM');
  this.by = null;
  this.cat = 'other';
  this.sum = null;
  // this.account = null;
  this.desc = '';
}


module.exports.init = init;
module.exports.tgmessage = onMessage;
module.exports.reload = cmdReload;
