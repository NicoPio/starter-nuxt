import { z } from 'zod'

// Schéma pour UserRole
export const UserRoleSchema = z.enum(['Admin', 'Contributor', 'User'])

// Schéma pour les query params de la liste d'utilisateurs
export const UserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: UserRoleSchema.optional(),
  search: z.string().max(100).optional()
})

// Schéma pour la mise à jour de rôle
export const UpdateRoleSchema = z.object({
  role: UserRoleSchema
})

// Schéma pour la suppression d'utilisateur (validation de l'ID)
export const DeleteUserSchema = z.object({
  userId: z.string().uuid()
})

// Type inféré pour les query params
export type UserListQuery = z.infer<typeof UserListQuerySchema>

// Type inféré pour la mise à jour de rôle
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>
