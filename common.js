const { GoogleSpreadsheet } = require('google-spreadsheet');
// const fs = require('fs');
// const dayjs = require('dayjs');
const async = require('async');
const notify = require('notify');
const config = require('./config');

const creds = require(config.access_key);
require('useful');


// =================================================
function loadGoogleData(arr, callback) {
  const data = {};

  async.auto({
    sheetLoad: (cb) => { sheetLoad(cb); },
    getDoc: ['sheetLoad', (res, cb) => { data.doc = res.sheetLoad; cb(); }],
    getSheets: ['getDoc', (res, cb) => loadGoogleSheets(data, arr, cb)],

  }, (e) => {
    if (e) {
      console.error(e);

      const errMsg = e.message || e;
      notify(`#error [ipsyholog2bot] ${errMsg}`);
      return callback && callback(e);
    }

    console.debug('[+] google: load OK');
    return callback && callback(null, data);
  });
}
// =================================================
function loadGoogleSheets(data, arr, cback) {

  async.each(arr, (item, cb) => {
    sheetRead(data, item, (err, res) => {
      if (err) return cb(err);
      data[item] = res;
      // if (item === 'cfg') getVars(data);
      return cb();
    });
  }, (e) => cback(e));
}
// =================================================
function sheetLoad(callback) {
  // console.debug('[·] sheetLoad start');

  const doc = new GoogleSpreadsheet(config.doc_id);
  doc.useServiceAccountAuth(creds)
    .then(() => {

      console.debug('[+] google: authorized');
      doc.loadInfo()
        .then(() => {
          console.debug(`[+] google: opened: ${doc.title}`);
          callback(null, doc);
        })
        .catch((err) => { callback(err); });
    })
    .catch((err) => { callback(err); });
}
// =================================================
function sheetRead(data, title, callback) {

  data.doc.sheetsByTitle[title].getRows()
    .then((rows) => {
      console.debug(`[+] google: read ${title}`);
      callback(null, rows);
      // return;
    })
    .catch((e) => {
      console.log(`[-] google: read ${title} error:`);
      console.error(e);
      callback(e);
      // return;
    });
}


module.exports.loadData = loadGoogleData;
module.exports.sheetRead = sheetRead;
