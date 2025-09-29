import { ref } from 'vue'
import axios from 'axios'

interface HistoryChat {
  _id: string,
  name: string,
  bot: string
}


const historyChat = ref<HistoryChat[]>([])
const urlServer = import.meta.env.VITE_URL_SERVER

export const useHistoryChat = () => {
  const loadHistoryChat = async () => {
    const token = localStorage.getItem('token')

    if (!token) return

    const response = await axios.post(`${urlServer}/history-chat`, {
      token
    })
    historyChat.value = response.data
  }
  return {
    historyChat,
    loadHistoryChat
  }
}
