import Typography from 'typography'
import Wordpress2016 from 'typography-theme-wordpress-2016'

Wordpress2016.overrideThemeStyles = () => {
  return {
    '.title a:hover': {
      textDecoration: 'underline',
    },
    'a.gatsby-resp-image-link': {
      boxShadow: `none`,
    },
    h1: {
      fontFamily: ['PT Sans', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    },
  }
}

const typography = new Typography({
  ...Wordpress2016,
  headerFontFamily: ['PT Sans', 'Helvetica', 'Arial', 'sans-serif'],
  bodyFontFamily: ['PT Sans', 'Helvetica', 'Arial', 'sans-serif'],
})

// Hot reload typography in development.
if (process.env.NODE_ENV !== `production`) {
  typography.injectStyles()
}

export default typography
export const rhythm = typography.rhythm
export const scale = typography.scale
