import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import 'gridstack/dist/gridstack.min.css'
import './style.css'

createApp(App).use(vuetify).mount('#app')
