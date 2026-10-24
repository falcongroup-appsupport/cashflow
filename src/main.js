import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'
import App from './App.vue'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#174EA6',
          secondary: '#475569',
          background: '#F5F7FB',
          surface: '#FFFFFF',
          success: '#15803D',
          error: '#B91C1C',
        },
      },
    },
  },
})

createApp(App).use(vuetify).mount('#app')
