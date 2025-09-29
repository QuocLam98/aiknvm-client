import { ref } from 'vue'
import axios from 'axios'


interface Bot {
  _id: string
  name: string
  createdAt: string
  image: string,
  status: number,
}

const bots = ref<Bot[]>([])
const urlServer = import.meta.env.VITE_URL_SERVER
const botDefault = import.meta.env.VITE_DEFAULT_BOT

export const useListBot = () => {
  const loadBots = async () => {
    const response = await axios.get(`${urlServer}/list-bot-chat`);
    bots.value = response.data.filter((bot: Bot) => bot._id !== botDefault);
  }
  return {
    bots,
    loadBots
  }
}
