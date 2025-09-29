import './assets/main.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ToastPlugin from 'vue-toast-notification';
// Import one of the available themes
//import 'vue-toast-notification/dist/theme-default.css';
import 'vue-toast-notification/dist/theme-bootstrap.css';
import 'highlight.js/styles/github.css' // hoặc chọn style khác từ highlight.js
import { createHead } from '@vueuse/head'


const app = createApp(App)
const pinia = createPinia()
const head = createHead()

app.use(ToastPlugin)
app.use(router)
app.use(pinia)
app.use(head)

console.log('Client success')
app.mount('#app')
