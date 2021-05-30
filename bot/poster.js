// const async = require('async');
const schedule = require('node-schedule');
const dayjs = require('dayjs');
const config = require('../config');
// const dateparse = require('dayjs/plugin/customParseFormat');
require('useful');

// dayjs.extend(dateparse);

// ==============================================
function sendMessage(data, msg, cb) {

  if (!msg.text && !msg.image && !msg.video) {
    console.log('[-] can\'t send empty message');
    return cb && cb('Empty message');
  }
  if (msg.text && msg.text.length > 4000) {
    console.log('[-] message is too long');
    return cb && cb('Message is too long');
  }
  if ((msg.image || msg.video) && msg.text && msg.text.length > 1000) {
    console.log('[-] caption is too long');
    return cb && cb('Caption is too long');
  }

  const extra = msg.extra || {};
  extra.disable_web_page_preview = msg.preview !== 'TRUE';
  extra.parse_mode = 'HTML';

  // prepare album array, filter empty
  let arrayImages = (msg.image || '').split('\n');
  arrayImages = arrayImages.filter((x) => x.trim() !== '');

  // if (config.debug) console.debug(msg);

  // photo
  if (msg.image && arrayImages.length === 1) {
    if (config.debug) console.log(arrayImages);

    extra.caption = msg.text;
    data.bot.telegram.sendPhoto(msg.chat_id, msg.image, extra)
      .then(() => {
        console.debug(`[+] sendPhoto OK: ${msg.chat_id}`);
        return cb && cb();
      })
      .catch((e) => {
        console.error(`[-] sendPhoto ${msg.chat_id}: ${e.message}`);
        console.error(e);
        return cb && cb(e);
      });

  }

  // photo album
  else if (msg.image && arrayImages.length > 1) {
    if (config.debug) console.log(arrayImages);

    const album = [];
    arrayImages.forEach((img) => {
      album.push({
        type: 'photo',
        media: img,
      });
    });
    if (msg.text) album[0].caption = msg.text;
    // console.log(album);

    data.bot.telegram.sendMediaGroup(msg.chat_id, album)
      .then(() => {
        console.debug(`[+] sendMedia OK: ${msg.chat_id}`);
        return cb && cb();
      })
      .catch((e) => {
        console.error(`[-] sendMedia ${msg.chat_id}: ${e.message}`);
        console.error(e);
        return cb && cb(e);
      });

  }

  // video
  else if (msg.video) {

    extra.caption = msg.text;
    data.bot.telegram.sendVideo(msg.chat_id, msg.video, extra)
      .then(() => {
        console.debug(`[+] sendVideo OK: ${msg.chat_id}`);
        return cb && cb();
      })
      .catch((e) => {
        console.error(`[-] sendVideo ${msg.chat_id}: ${e.message}`);
        console.error(e);
        return cb && cb(e);
      });

  }

  // video_note
  else if (msg.video_note) {

    data.bot.telegram.sendVideoNote(msg.chat_id, msg.video_note, extra)
      .then(() => {
        console.debug(`[+] sendVideoNote OK: ${msg.chat_id}`);
        return cb && cb();
      })
      .catch((e) => {
        console.error(`[-] sendVideoNote ${msg.chat_id}: ${e.message}`);
        console.error(e);
        return cb && cb(e);
      });

  }

  // voice
  else if (msg.voice) {

    data.bot.telegram.sendVoice(msg.chat_id, msg.voice, extra)
      .then(() => {
        console.debug(`[+] sendVoice OK: ${msg.chat_id}`);
        return cb && cb();
      })
      .catch((e) => {
        console.error(`[-] sendVoice ${msg.chat_id}: ${e.message}`);
        console.error(e);
        return cb && cb(e);
      });

  }

  // forward
  else if (msg.type === 'forward' && msg.id) {

    const lines = msg.id.split(':');
    data.bot.telegram.forwardMessage(msg.chat_id, lines[1], lines[0])
      .then(() => {
        console.debug(`[+] forwardMessage OK: ${msg.chat_id}`);
        return cb && cb();
      })
      .catch((e) => {
        console.error(`[-] forwardMessage ${msg.chat_id}: ${e.message}`);
        console.error(e);
        return cb && cb(e);
      });

  }

  // poll
  else if (msg.type === 'poll' && msg.text) {

    const lines = msg.text.trim().split('\n');
    const [question, ...opts] = lines;

    data.bot.telegram.sendPoll(msg.chat_id, question, opts)
      .then(() => {
        console.debug(`[+] sendPoll OK: ${msg.chat_id}`);
        return cb && cb();
      })
      .catch((e) => {
        console.error(`[-] sendPoll ${msg.chat_id}: ${e.message}`);
        console.error(e);
        return cb && cb(e);
      });

  }

  // text only
  else {

    data.bot.telegram.sendMessage(msg.chat_id, msg.text, extra)
      .then(() => {
        console.debug(`[+] sendMessage OK: ${msg.chat_id}`);
        return cb && cb();
      })
      .catch((e) => {
        console.error(`[-] sendMessage ${msg.chat_id}: ${e.message}`);
        console.error(e);
        return cb && cb(e);
      });
  }
}

// ==============================================
function checkSchedule(data, post) {
  console.debug('[·] checking schedule');

  const startDate = dayjs(`${post.date}T${post.time}:00`);
  const diffDays = parseInt(post.every) || 1;
  const realDiff = Math.round(dayjs().diff(startDate, 'hour')/24);
  const remainder = realDiff % diffDays;

  console.debug(`[·] startDate ${startDate.format()}, diffDays ${diffDays}, realDiff ${realDiff}, remainder ${remainder}`);
  if (remainder !== 0) return;

  console.log('[+] JOB time');

  if (post.button && post.link) {
    post.extra = {};
    post.extra.reply_markup = {
      inline_keyboard: [[{
        text: post.button,
        url: post.link
      }]],
    };
  }

  if (post.type && post.id) post[post.type] = post.id;
  // if (config.debug) console.debug(post);

  sendMessage(data, post, (err) => {
    if (err) return;

    const chat = data.chats.find((x) => x.id === post.chat_id);
    if (!chat) {
      console.log(`[!] no chat ${post.chat_id} found`);
      return;
    }

    chat.last = dayjs().format('YYYY-MM-DD HH:mm:ss');
    chat.save()
      .then(() => {
        console.debug('[+] google: chat saved');
      })
      .catch((e) => {
        console.error('[-] google: chat not saved');
        console.error(e);
      });
  });
}

// ==============================================
function cancelSchedules(data) {
  if (data.schedules && data.schedules.length > 0) {
    data.schedules.forEach((job) => {
      job.cancel();
    });
  }
  data.schedules = [];
}

// ==============================================
function setSchedules(data) {

  let cntok = 0;
  const postsActive = data.posts.filter((x) => x.on === 'TRUE');

  // old jobs?
  cancelSchedules(data);

  postsActive.forEach((post) => {
    const postHour = parseInt(post.time.substring(0, 2));
    const postMinute = parseInt(post.time.substring(3, 5));

    if (postHour >= 0 && postHour <= 23 && postMinute >= 0 && postMinute <= 59) {
      const job = schedule.scheduleJob(
        { hour: postHour, minute: postMinute }, () => {
          checkSchedule(data, post);
        }
      );
      data.schedules.push(job);
      console.debug(`[+] job set for ${postHour.toString().padStart(2, '0')}:${postMinute.toString().padStart(2, '0')}`);
      cntok += 1;
    }
  });

  console.log(`[+] schedules: ${cntok} set`);
  return cntok;
}

module.exports.setSchedules = setSchedules;
module.exports.cancelSchedules = cancelSchedules;
module.exports.sendMessage = sendMessage;
