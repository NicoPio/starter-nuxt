// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
  {
    ignores: [
      // Build outputs
      '.output',
      '.nuxt',
      '.nitro',
      '.cache',
      'dist',
      'build',
      // Dependencies
      'node_modules',
      // Coverage
      'coverage',
      // Logs
      '*.log',
      // Misc
      '.DS_Store',
    ],
  }
)
