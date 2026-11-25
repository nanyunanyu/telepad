import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/primitives.css';
import '@/styles/markdown.css';
import App from '@/App.vue';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
