import { defineStore } from 'pinia'

export const useBotStore = defineStore('bot', {
  state: () => ({
    selectedBot: null as any, // hoặc kiểu bạn có
  }),
  actions: {
    setBot(bot: any) {
      this.selectedBot = bot
    }
  }
})