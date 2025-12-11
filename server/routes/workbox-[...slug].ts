// Route pour gérer les requêtes de fichiers Workbox
// Retourne un 404 propre au lieu d'un warning Vue Router
export default defineEventHandler(() => {
  throw createError({
    statusCode: 404,
    statusMessage: 'Workbox File Not Found',
    message: 'No Workbox service worker is configured for this application'
  })
})
