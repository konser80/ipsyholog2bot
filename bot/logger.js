const fs = require('fs');
// const config = require('../config');
require('useful');

const filename = './data.json';

function logRequest(ctx, next) {
  // console.debug('some message');
  // console.debug(ctx.from);

  const key = ctx.updateType;
  let s = `<${ctx.updateType}> `;

  if (ctx.chat) s += `[${ctx.chat.id}:${ctx.chat.title}]`;
  if (ctx.from) s += `[${ctx.from.id}:${ctx.from.username}]`;

  if (ctx.update[key] && ctx.update[key].text) s += ` ${ctx.update[key].text}`;
  console.debug(s);

  // console.log('== UPDATE ==');
  // console.log(ctx.update);

  return next();
}

// ==============================================
function addChat(ctx, cb, data) {
  // console.debug(data.chats[0]);
  // if (!data.chats) data.chats = [];

  // we have no chat object - like in polls
  if (!ctx.chat) return cb();

  const _chat = data.chats.find((x) => x.id === ctx.chat.id.toString());

  // console.debug(_chat);
  // console.debug(_chat && _chat.title);

  if (_chat === undefined && ctx.chat.type !== 'private') {
    console.log(`[+] new chat: ${ctx.chat.id} (${ctx.chat.type}), title: ${ctx.chat.title}, username: ${ctx.chat.username}`);

    data.doc.sheetsByTitle.chats.addRow(ctx.chat)
      .then((newrow) => {
        data.chats.push(newrow);
        console.debug('[+] new chat saved to googlesheet');
      })
      .catch((e) => {
        console.error('[-] error saving googlesheet');
        console.error(e);
      });

    // exportData(data);
  }
  return cb();
}

// ==============================================
function exportData(data, cb) {

  fs.writeFile(filename, JSON.stringify(data), (e) => {
    if (e) {
      console.error(`[!] data export: ${e.message}`);
      return cb && cb(e);
    }

    console.debug('[+] data export OK');
    return cb && cb();
  });
}


module.exports.console = logRequest;
module.exports.addChat = addChat;
module.exports.exportData = exportData;
