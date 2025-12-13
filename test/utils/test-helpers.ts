import type { VueWrapper } from '@testing-library/vue'
import type { UserWithRole } from '~/types/common.types'

/**
 * Utilitaires généraux pour les tests
 */

/**
 * Attend que la prochaine tick de Vue soit terminée
 */
export async function waitForNextTick() {
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Attend qu'une condition soit vraie
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 3000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now()

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
}

/**
 * Mock d'une réponse API réussie
 */
export function mockApiSuccess<T>(data: T) {
  return {
    data,
    error: null,
    status: 200,
  }
}

/**
 * Mock d'une erreur API
 */
export function mockApiError(message: string = 'API Error', statusCode: number = 500) {
  return {
    data: null,
    error: {
      message,
      statusCode,
    },
    status: statusCode,
  }
}

/**
 * Mock de fetch pour les tests
 */
export function mockFetch<T>(response: T, options: { ok?: boolean; status?: number } = {}) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => response,
    text: async () => JSON.stringify(response),
    headers: new Headers(),
  })
}

/**
 * Mock d'une erreur fetch
 */
export function mockFetchError(message: string = 'Network error') {
  global.fetch = vi.fn().mockRejectedValue(new Error(message))
}

/**
 * Crée un mock d'événement H3
 */
export function createMockH3Event(options: {
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: unknown
  user?: UserWithRole | null
} = {}) {
  return {
    node: {
      req: {
        method: options.method ?? 'GET',
        url: options.path ?? '/',
        headers: options.headers ?? {},
      },
      res: {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      },
    },
    context: {
      user: options.user ?? null,
    },
    body: options.body,
  }
}

/**
 * Attend que le composant soit monté
 */
export async function waitForMount(wrapper: VueWrapper<any>) {
  await wrapper.vm.$nextTick()
  await waitForNextTick()
}

/**
 * Simule un délai
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Crée un mock de router
 */
export function createMockRouter() {
  return {
    push: vi.fn().mockResolvedValue(undefined),
    replace: vi.fn().mockResolvedValue(undefined),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    currentRoute: ref({
      path: '/',
      name: 'index',
      params: {},
      query: {},
      meta: {},
    }),
  }
}

/**
 * Mock du composable useRouter
 */
export function mockUseRouter() {
  const router = createMockRouter()

  vi.mock('vue-router', () => ({
    useRouter: () => router,
    useRoute: () => router.currentRoute.value,
  }))

  return router
}

/**
 * Crée des query params pour les tests de pagination
 */
export function createPaginationParams(
  page: number = 1,
  limit: number = 10,
  search: string = ''
) {
  return {
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
  }
}

/**
 * Nettoie tous les mocks
 */
export function clearAllMocks() {
  vi.clearAllMocks()
  vi.resetModules()
  vi.restoreAllMocks()
}

/**
 * Simule une erreur console pour les tests
 */
export function suppressConsoleError() {
  const originalError = console.error
  beforeAll(() => {
    console.error = vi.fn()
  })
  afterAll(() => {
    console.error = originalError
  })
}

/**
 * Attend qu'un élément soit visible
 */
export async function waitForElement(
  wrapper: VueWrapper<any>,
  selector: string,
  timeout: number = 3000
): Promise<void> {
  await waitFor(() => wrapper.find(selector).exists(), timeout)
}

/**
 * Simule un input utilisateur
 */
export async function typeInInput(
  wrapper: VueWrapper<any>,
  selector: string,
  value: string
) {
  const input = wrapper.find(selector)
  await input.setValue(value)
  await wrapper.vm.$nextTick()
}

/**
 * Simule un clic sur un bouton
 */
export async function clickButton(wrapper: VueWrapper<any>, selector: string) {
  const button = wrapper.find(selector)
  await button.trigger('click')
  await wrapper.vm.$nextTick()
}
