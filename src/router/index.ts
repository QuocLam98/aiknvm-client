// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import LoginView from '@/views/Login.vue';
import HomeView from '@/views/HomeView.vue';
import DashBoardView from '@/views/DashBoardView.vue';
import Chat from '@/components/Chat.vue';
import Payment from '@/components/Payment.vue';
import ListUser from '@/components/ListUser.vue';
import ListBot from '@/components/ListBot.vue';
import ListChat from '@/components/ListChat.vue';
import ChatBot from '@/components/Chat-bot.vue';
import ChatImage from '@/components/Chat-image.vue';
import About from '@/components/About.vue';
import ChatHistory from '@/components/Chat-history.vue';
import ChatImageHistory from '@/components/Chat-image-history.vue';
import ListPayment from '@/components/ListPayment.vue';
import AuthCallback from '@/components/AuthCallback.vue';
import Account from '@/components/Account.vue';
import ListField from '@/components/List-Field.vue';
import ChatImagePre from '@/components/Chat-image-pre.vue';
import ChatImageHistoryPre from '@/components/Chat-image-history-pre.vue';
import ListProducts from '@/components/ListProducts.vue';
import ProductStoreView from '@/views/ProductStoreView.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', component: HomeView, meta: { public: true } },
  { path: '/login', component: LoginView, meta: { public: true } },
  { path: '/about', component: About, meta: { public: true } },

  { path: '/auth/callback', component: AuthCallback, meta: { public: true } },

  {
    path: '/dashboard',
    component: DashBoardView,
    meta: { requiresAuth: true }, // tất cả child cần token
    children: [
      { path: '', redirect: '/dashboard/chat' },
      { path: 'list-products', component: ListProducts },
      { path: 'chat', component: Chat },
      { path: 'profile', component: Account },
    { path: 'payment', component: Payment },
    { path: 'store-products', component: ProductStoreView },
      { path: 'list-user', component: ListUser },
      { path: 'list-bot', component: ListBot },
      { path: 'list-field', component: ListField },
      { path: 'list-chat', component: ListChat },
      { path: 'chat-bot', component: ChatBot },
      { path: 'chat-image', component: ChatImage },
      { path: 'chat-image-pre', component: ChatImagePre },
      { path: 'chat-history', component: ChatHistory },
      { path: 'chat-image-history', component: ChatImageHistory },
      { path: 'chat-image-history-pre', component: ChatImageHistoryPre },
      { path: 'list-payment', component: ListPayment },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  linkActiveClass: 'linkActiveClass',
  linkExactActiveClass: 'linkExactActiveClass',
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  const inGoogleFlow = sessionStorage.getItem('glogin') === '1';
  const isPublicRoute = Boolean(to.meta?.public);
  const requiresAuth = Boolean(to.meta?.requiresAuth);

  if (isPublicRoute) {
    if (token && (to.path === '/login' || to.path === '/register')) {
      return next('/dashboard');
    }
    return next();
  }

  if (to.path === '/auth/callback' && inGoogleFlow) return next();

  if (requiresAuth) {
    if (token) return next();
    return next('/login');
  }

  return next();
});

export default router;