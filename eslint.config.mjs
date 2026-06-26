// @ts-check
import prettierConfig from 'eslint-config-prettier'
import tailwindcss from 'eslint-plugin-tailwindcss'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ...tailwindcss.configs.recommended,
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.vue'],
    settings: {
      tailwindcss: {
        cssConfigPath: 'app/assets/css/main.css'
      }
    },
    rules: {
      'tailwindcss/no-custom-classname': 'off'
    }
  },
  prettierConfig
  // Your custom configs here
)
