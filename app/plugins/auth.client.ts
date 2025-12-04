export default defineNuxtPlugin(async () => {
  const { session } = useAuth()

  // Wait for better-auth to load the session
  // This prevents race conditions in middlewares
  await new Promise<void>((resolve) => {
    // If session is already defined (not pending), resolve immediately
    if (session.value !== undefined) {
      resolve()
      return
    }

    // Otherwise, watch for session to be loaded
    const unwatch = watch(
      () => session.value,
      (newSession) => {
        if (newSession !== undefined) {
          unwatch()
          resolve()
        }
      },
      { immediate: true }
    )

    // Safety timeout: resolve after 3 seconds even if session hasn't loaded
    setTimeout(() => {
      unwatch()
      resolve()
    }, 3000)
  })
})
