// Route pour gérer les requêtes de service worker
// Retourne un 404 propre au lieu d'un warning Vue Router
export default defineEventHandler(() => {
  throw createError({
    statusCode: 404,
    statusMessage: 'Service Worker Not Found',
    message: 'No service worker is configured for this application'
  })
})
