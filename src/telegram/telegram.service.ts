import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private botToken: string;
  private baseUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.baseUrl = process.env.TELEGRAM_API_URL;
  }

  async sendTelegramNotification(chatId: string, message: string) {
    const url = `${this.baseUrl}/bot${this.botToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: message,
    };
    try {
      await axios.post(url, payload);
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  }

  async getChatIds() {
    const url = `${this.baseUrl}/bot${this.botToken}/getUpdates`;
    try {
      const response = await axios.get(url);
      const updates = response.data.result;
      const chatDetails = new Map();
      updates.forEach((update) => {
        if (update.message) {
          const chatId = update.message.chat.id;
          const chatName =
            update.message.chat.title ||
            update.message.chat.username ||
            `${update.message.chat.first_name} ${update.message.chat.last_name}`;
          chatDetails.set(chatId, chatName);
        }
      });
      chatDetails.forEach((name, id) => {
        console.log(`Chat Name: ${name}, Chat ID: ${id}`);
      });
    } catch (error) {
      console.error('Error getting updates:', error);
    }
  }
}
