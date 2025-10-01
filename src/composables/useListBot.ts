import { ref } from 'vue'
import axios from 'axios'


interface Bot {
  _id: string
  name: string
  createdAt: string
  image: string,
  status: number,
  // Priority nhỏ hơn => ưu tiên cao hơn. Nếu không có priority sẽ nằm cuối.
  priority?: string,
}

const bots = ref<Bot[]>([])
const urlServer = import.meta.env.VITE_URL_SERVER
const botDefault = import.meta.env.VITE_DEFAULT_BOT

export const useListBot = () => {
  const loadBots = async () => {
    const response = await axios.get(`${urlServer}/list-bot-chat`)
    const data: Bot[] = response.data || []
    const parsePriority = (p?: string) => {
      if (!p) return Number.MAX_SAFE_INTEGER
      const n = Number(p)
      return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
    }
    bots.value = data
      .filter((bot: Bot) => bot._id !== botDefault)
      .sort((a, b) => {
        return parsePriority(a.priority) - parsePriority(b.priority)
      })
  }
  return {
    bots,
    loadBots
  }
}
