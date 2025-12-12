/**
 * Database connection utility using postgres.js
 */

import postgres from 'postgres'

const config = useRuntimeConfig()

// Create postgres connection
export const sql = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

/**
 * Get database connection for users table operations
 * Returns a DB adapter compatible with the Better Auth interface
 */
export function getUsersDatabase() {
  return {
    query: async (queryString: string, params: unknown[] = []) => {
      const rows = await sql.unsafe(queryString, params as postgres.Parameter[])
      return { rows }
    }
  }
}

export default sql
