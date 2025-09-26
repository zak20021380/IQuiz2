const fetch = require('node-fetch');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeKeyboard(buttons) {
  if (!Array.isArray(buttons)) return [];
  return buttons.map((row) => {
    if (Array.isArray(row)) {
      return row.map((btn) => normalizeButton(btn)).filter(Boolean);
    }
    const normalized = normalizeButton(row);
    return normalized ? [normalized] : [];
  }).filter((row) => row.length > 0);
}

function normalizeButton(button) {
  if (!button) return null;
  if (typeof button === 'object' && button.text) {
    const text = String(button.text);
    const data = button.callback_data != null ? String(button.callback_data) : undefined;
    return { text, ...(data ? { callback_data: data } : {}) };
  }
  return null;
}

function matchTrigger(trigger, data) {
  if (typeof trigger === 'string') {
    return trigger === data;
  }
  if (trigger instanceof RegExp) {
    const match = data.match(trigger);
    return match && match.length ? match : null;
  }
  if (typeof trigger === 'function') {
    try {
      return !!trigger(data);
    } catch (error) {
      return false;
    }
  }
  return false;
}

class TelegramClient {
  constructor(token) {
    if (!token) throw new Error('Telegram bot token is required');
    this.token = token;
    this.apiBase = `https://api.telegram.org/bot${token}`;
  }

  async callApi(method, params = {}) {
    const url = `${this.apiBase}/${method}`;
    const hasBody = params && Object.keys(params).length > 0;
    const response = await fetch(url, {
      method: 'POST',
      headers: hasBody ? { 'content-type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(params) : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Telegram API error ${response.status}: ${text}`);
    }

    const payload = await response.json();
    if (!payload.ok) {
      const description = payload.description || 'unknown';
      throw new Error(`Telegram API responded with error: ${description}`);
    }

    return payload.result;
  }

  sendMessage(chatId, text, extra = {}) {
    const params = { chat_id: chatId, text, ...extra };
    return this.callApi('sendMessage', params);
  }

  answerCallbackQuery(callbackQueryId, extra = {}) {
    const params = { callback_query_id: callbackQueryId, ...extra };
    return this.callApi('answerCallbackQuery', params);
  }

  editMessageText(chatId, messageId, text, extra = {}) {
    const params = { chat_id: chatId, message_id: messageId, text, ...extra };
    return this.callApi('editMessageText', params);
  }

  editMessageReplyMarkup(chatId, messageId, replyMarkup) {
    const params = { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup };
    return this.callApi('editMessageReplyMarkup', params);
  }
}

function createContext(bot, update) {
  const message = update.message || update.edited_message || update.callback_query?.message;
  const from = update.message?.from || update.callback_query?.from || null;
  const chat = message?.chat || null;
  const ctx = {
    update,
    telegram: bot.telegram,
    botInfo: bot.botInfo || null,
    from,
    chat,
    message: update.message || null,
    callbackQuery: update.callback_query || null,
    updateType: update.message ? 'message' : update.callback_query ? 'callback_query' : 'unknown',
    state: {}
  };

  ctx.reply = (text, extra = {}) => {
    if (!ctx.chat) throw new Error('Cannot reply without chat');
    const payload = { ...extra };
    if (payload.reply_markup && payload.reply_markup.inline_keyboard) {
      payload.reply_markup.inline_keyboard = normalizeKeyboard(payload.reply_markup.inline_keyboard);
    }
    return bot.telegram.sendMessage(ctx.chat.id, text, payload);
  };

  ctx.replyWithMarkdown = (text, extra = {}) => ctx.reply(text, { parse_mode: 'Markdown', ...extra });

  ctx.answerCbQuery = (text, extra = {}) => {
    if (!ctx.callbackQuery) return Promise.resolve();
    const payload = { ...extra };
    if (text) payload.text = text;
    return bot.telegram.answerCallbackQuery(ctx.callbackQuery.id, payload);
  };

  ctx.editMessageReplyMarkup = (markup) => {
    const cbMessage = ctx.callbackQuery?.message;
    if (!cbMessage) throw new Error('No message available for editing');
    const replyMarkup = markup?.reply_markup ? markup.reply_markup : markup;
    const normalized = replyMarkup?.inline_keyboard ? {
      inline_keyboard: normalizeKeyboard(replyMarkup.inline_keyboard)
    } : replyMarkup;
    return bot.telegram.editMessageReplyMarkup(cbMessage.chat.id, cbMessage.message_id, normalized || {});
  };

  return ctx;
}

class Telegraf {
  constructor(token, options = {}) {
    if (!token) {
      throw new Error('Telegram bot token is required');
    }

    this.token = token;
    this.options = options || {};
    this.telegram = new TelegramClient(token);
    this.commandHandlers = new Map();
    this.actionHandlers = [];
    this.polling = false;
    this.offset = 0;
    this.launchPromise = null;
    this.errorHandler = null;
  }

  start(handler) {
    return this.command('start', handler);
  }

  command(name, handler) {
    const normalized = String(name).trim().replace(/^\//, '');
    if (!normalized || typeof handler !== 'function') return this;
    this.commandHandlers.set(normalized, handler);
    return this;
  }

  action(trigger, handler) {
    if (!handler || typeof handler !== 'function') return this;
    this.actionHandlers.push({ trigger, handler });
    return this;
  }

  catch(handler) {
    this.errorHandler = handler;
    return this;
  }

  async launch(options = {}) {
    if (this.polling) return this.launchPromise;
    this.polling = true;
    this.offset = 0;

    try {
      this.botInfo = await this.telegram.callApi('getMe');
    } catch (error) {
      this.polling = false;
      throw error;
    }

    const pollingOptions = { timeout: 30, limit: 50, ...(options.polling || {}) };

    const poll = async () => {
      while (this.polling) {
        try {
          const updates = await this.telegram.callApi('getUpdates', {
            offset: this.offset,
            timeout: pollingOptions.timeout,
            limit: pollingOptions.limit,
            allowed_updates: pollingOptions.allowedUpdates
          });

          if (Array.isArray(updates)) {
            for (const update of updates) {
              this.offset = Math.max(this.offset, update.update_id + 1);
              await this.handleUpdate(update);
            }
          }
        } catch (error) {
          if (typeof this.options.logger === 'function') {
            this.options.logger('polling_error', error);
          } else {
            console.error('[telegraf-lite] polling error', error);
          }
          await delay(1000);
        }
      }
    };

    this.launchPromise = poll();
    return this.launchPromise;
  }

  async handleUpdate(update) {
    const ctx = createContext(this, update);

    try {
      if (update.message && typeof update.message.text === 'string') {
        const text = update.message.text.trim();
        if (text.startsWith('/')) {
          const commandEntity = Array.isArray(update.message.entities)
            ? update.message.entities.find((entity) => entity.type === 'bot_command' && entity.offset === 0)
            : null;

          let commandText = text.slice(1).split(/\s+/)[0];
          if (commandEntity) {
            commandText = text.slice(1, commandEntity.length);
          }

          const [rawCommand, mentionedBot] = commandText.split('@');
          const commandName = rawCommand.toLowerCase();
          if (!mentionedBot || !this.botInfo || mentionedBot.toLowerCase() === String(this.botInfo.username || '').toLowerCase()) {
            const handler = this.commandHandlers.get(commandName);
            if (handler) {
              ctx.message = update.message;
              ctx.updateType = 'command';
              ctx.state.commandArgs = text.slice(commandText.length + 1).trim();
              await handler(ctx);
              return;
            }
          }
        }
      }

      if (update.callback_query) {
        const data = update.callback_query.data || '';
        for (const entry of this.actionHandlers) {
          if (!data) continue;
          const matched = matchTrigger(entry.trigger, data);
          if (matched) {
            const ctxWithAction = createContext(this, update);
            ctxWithAction.match = matched === true ? data : matched;
            await entry.handler(ctxWithAction);
            return;
          }
        }
      }
    } catch (error) {
      if (this.errorHandler) {
        await this.errorHandler(error, ctx);
      } else {
        console.error('[telegraf-lite] handler error', error);
      }
    }
  }

  stop(reason = 'stopped') {
    this.polling = false;
    if (typeof this.options.logger === 'function') {
      this.options.logger('stop', reason);
    }
  }
}

const Markup = {
  inlineKeyboard(buttons, options = {}) {
    return {
      reply_markup: {
        inline_keyboard: normalizeKeyboard(buttons),
        ...options
      }
    };
  },
  removeKeyboard() {
    return { reply_markup: { remove_keyboard: true } };
  },
  button: {
    callback(text, data) {
      return { text: String(text), callback_data: String(data) };
    }
  }
};

module.exports = { Telegraf, Markup };
