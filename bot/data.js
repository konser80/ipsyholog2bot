const async = require('async');
const notify = require('notify');
const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const config = require('../config');

const DB_FILENAME = 'db.json';
const db = {};
const doc = {};


// ==============================================
async function googleOpen(docPath) {

  /* eslint global-require: "off" */
  const creds = require(`.${config.access_key}`);

  let _doc;
  try {
    _doc = new GoogleSpreadsheet(docPath);
    await _doc.useServiceAccountAuth(creds);
    console.debug(`[+] google: authorized for ${docPath}`);
    await _doc.loadInfo();
    console.debug(`[+] google: opened ${_doc.title}`);
  }
  catch (e) {
    console.error(`[-] google error: ${e.message}`);
    notify(`#error [bot21] google: ${e.message}`);
    throw new Error(`google error: ${e.message}`);
    // return false;
  }

  return _doc;
}
// ==============================================
async function googleOpenAll(cb) {
  // const { config } = global;
  try {
    doc.main = await googleOpen(config.doc_id);
    // doc.stat = await googleOpen(config.doc_stat_id);
    // doc.hw = await googleOpen(config.doc_hw_id);
  }
  catch (e) {
    return cb(e);
  }
  if (cb) cb();
}
// =================================================
async function googleRead(document, title, cb) {

  let contents;
  try {
    contents = await document.sheetsByTitle[title].getRows();
  }
  catch (e) {
    console.error(`[-] google: read error ${title}: ${e.message}`);
    console.log(e);
    notify(`[-] google: read error ${title}: ${e.message}`);
    if (cb) cb(e);
    return null;
  }

  console.debug(`[+] google: read ${title}`);
  if (cb) cb(null, contents);
  return contents;
}
// =================================================
function googleReadArray(arr, cback) {

  const data = {};
  async.each(arr, (sheet, cb) => {
    googleRead(doc.main, sheet, (err, res) => {
      if (err) { cb(err); return; }
      data[sheet] = res;
      cb();
    });
  }, (err) => {
    if (err) return cback(err);
    cback(null, data);
  });
}


// ==============================================
function dbOpen(cb) {
  // read file
  fs.readFile(DB_FILENAME, 'utf8', (err, contents) => {
    if (err) {
      console.error(`[-] db.open: ${err.message}`);
      // notify(`#error [bot21] db.open: ${err.message}`);
      db.triggers = [];
      console.debug('[+] DB created');
      return cb();
    }

    try {
      const db2 = JSON.parse(contents);
      Object.keys(db2).forEach((key) => {
        db[key] = db2[key];
      });
    }
    catch (e) {
      console.error(`[-] db.open json.parse: ${e.message}`);
      console.log(e);
      notify(`#error [bot21] db.open json.parse: ${e.message}`);
      return cb(e.message);
    }

    // if DB is EMPTY?
    db.triggers = db.triggers || [];

    console.debug(`[+] DB opened, ${dbStat()}`);

    return cb();
  });
}

// ==============================================
function dbSave(cb) {

  fs.writeFile(DB_FILENAME, JSON.stringify(db), (err) => {
    if (err) {
      console.error(`[!] DB save: ${err.message}`);
      notify(`#error [bot21] dbSave: ${err.message}`);
      return cb && cb(err);
    }

    console.debug(`[+] DB save OK: ${DB_FILENAME}, ${dbStat()}`);

    if (cb) cb();
  });
}

// ==============================================
function dbStat() {
  // let res = '';
  // res += `cfg: ${(db.cfg) ? Object.keys(db.cfg).length : null}`;
  // // res += `, msg: ${(db.msg) ? Object.keys(db.msg).length : null}`;
  // res += `, plans: ${db.plans?.length}`;
  // res += `, codes: ${db.codes?.length}`;
  // res += `, text: ${db.text?.length}`;
  // res += `, users: ${db.users?.length}`;
  // res += `, payments: ${db.payments?.length}`;
  const res = `triggers: ${db.triggers?.length}`;

  return res;
}
// ==============================================
function val(x) {
  let res = x;

  if (typeof x === 'string' && x.trim().toLowerCase() === 'true') res = true;
  if (typeof x === 'string' && x.trim().toLowerCase() === 'false') res = false;
  if (typeof x === 'string' && x.trim() === '') res = null;

  // is number?
  if (parseFloat(x).toString() === x) res = parseFloat(x);

  return res;
}


module.exports.db = db;

module.exports.dbOpen = dbOpen;
module.exports.dbSave = dbSave;

module.exports.doc = doc;
module.exports.val = val;
module.exports.googleRead = googleRead;
module.exports.googleOpen = googleOpen;
module.exports.googleOpenAll = googleOpenAll;
