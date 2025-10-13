import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

const lightTheme = {
  dark: false,
  colors: {
    primary: '#1976D2',
    secondary: '#424242',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    'on-background': '#1F2933',
    'on-surface': '#1F2933',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FB8C00',
    info: '#2196F3',
  },
}

const darkTheme = {
  dark: true,
  colors: {
    primary: '#90CAF9',
    secondary: '#B0BEC5',
    background: '#121212',
    surface: '#1E1E1E',
    'on-background': '#E5E9F0',
    'on-surface': '#E5E9F0',
    success: '#66BB6A',
    error: '#EF5350',
    warning: '#FFA726',
    info: '#29B6F6',
  },
}

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'light',
    variations: {
      colors: ['primary', 'secondary'],
      lighten: 2,
      darken: 2,
    },
    themes: {
      light: lightTheme,
      dark: darkTheme,
    },
  },
})
