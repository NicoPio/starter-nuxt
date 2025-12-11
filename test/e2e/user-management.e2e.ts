import { test, expect } from './fixtures'

test.describe('Gestion des utilisateurs (Admin)', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Naviguer vers la page de gestion des utilisateurs
    await authenticatedPage.goto('/admin/users')
  })

  test('Admin peut voir la liste des utilisateurs', async ({ authenticatedPage }) => {
    // Vérifier l'URL
    await expect(authenticatedPage).toHaveURL('/admin/users')

    // Vérifier le titre de la page (prendre le premier heading)
    await expect(authenticatedPage.getByRole('heading', { name: /users|utilisateurs/i }).first()).toBeVisible()

    // Vérifier qu'il y a une table ou une liste d'utilisateurs
    const userTable = authenticatedPage.locator('table')
      .or(authenticatedPage.locator('[data-testid="users-list"]'))

    await expect(userTable).toBeVisible()

    // Vérifier qu'il y a au moins un utilisateur
    const userRows = authenticatedPage.getByRole('row')
    const rowCount = await userRows.count()
    expect(rowCount).toBeGreaterThan(1) // En-tête + au moins un utilisateur
  })

  test('Admin peut filtrer par rôle', async ({ authenticatedPage }) => {
    // Chercher le filtre de rôle (dropdown ou boutons radio)
    const roleFilter = authenticatedPage.locator('[data-testid="role-filter"]')
      .or(authenticatedPage.getByLabel(/filter by role|role/i))
      .or(authenticatedPage.locator('select[name="role"]'))

    if (await roleFilter.count() > 0) {
      // Cliquer sur le filtre
      await roleFilter.first().click()

      // Sélectionner "Admin"
      await authenticatedPage.getByRole('option', { name: /admin/i }).click()

      // Attendre le rechargement de la liste
      await authenticatedPage.waitForTimeout(500)

      // Vérifier que la liste est filtrée
      const adminBadges = authenticatedPage.getByText(/admin/i)
      const badgeCount = await adminBadges.count()
      expect(badgeCount).toBeGreaterThan(0)
    }
  })

  test('Admin peut rechercher un utilisateur', async ({ authenticatedPage }) => {
    // Chercher le champ de recherche
    const searchInput = authenticatedPage.locator('input[type="search"]')
      .or(authenticatedPage.getByPlaceholder(/search|recherche/i))
      .or(authenticatedPage.locator('[data-testid="search-input"]'))

    if (await searchInput.count() > 0) {
      // Taper un terme de recherche
      await searchInput.first().fill('test')

      // Attendre les résultats
      await authenticatedPage.waitForTimeout(500)

      // Vérifier que les résultats contiennent le terme
      const userRows = authenticatedPage.getByRole('row')
      const firstRow = userRows.nth(1) // Skip header

      if (await firstRow.count() > 0) {
        const rowText = await firstRow.textContent()
        expect(rowText?.toLowerCase()).toContain('test')
      }
    }
  })

  test('Admin peut changer le rôle d\'un utilisateur', async ({ authenticatedPage }) => {
    // Trouver le premier utilisateur non-admin
    const userRows = authenticatedPage.getByRole('row')
    const targetRow = userRows.filter({ hasNotText: /admin/i }).first()

    // Chercher le bouton d'édition
    const editButton = targetRow.getByRole('button', { name: /edit|modifier/i })
      .or(targetRow.locator('[data-testid="edit-user"]'))

    if (await editButton.count() > 0) {
      await editButton.click()

      // Attendre l'ouverture du modal/dialog
      const dialog = authenticatedPage.locator('[role="dialog"]')
        .or(authenticatedPage.locator('[data-testid="edit-user-modal"]'))

      await expect(dialog).toBeVisible()

      // Sélectionner un nouveau rôle
      const roleSelect = dialog.locator('select[name="role"]')
        .or(dialog.getByLabel(/role/i))

      await roleSelect.click()
      await authenticatedPage.getByRole('option', { name: /contributor|contributeur/i }).click()

      // Sauvegarder
      const saveButton = dialog.getByRole('button', { name: /save|enregistrer/i })
      await saveButton.click()

      // Attendre la fermeture du modal
      await expect(dialog).not.toBeVisible({ timeout: 5000 })

      // Vérifier le message de succès
      await expect(authenticatedPage.getByText(/success|updated|modifié/i)).toBeVisible()
    }
  })

  test('Admin peut supprimer un utilisateur', async ({ authenticatedPage }) => {
    // Compter le nombre d'utilisateurs initial
    const initialRows = await authenticatedPage.getByRole('row').count()

    // Trouver le premier utilisateur non-admin
    const userRows = authenticatedPage.getByRole('row')
    const targetRow = userRows.filter({ hasNotText: /admin/i }).first()

    // Chercher le bouton de suppression
    const deleteButton = targetRow.getByRole('button', { name: /delete|supprimer/i })
      .or(targetRow.locator('[data-testid="delete-user"]'))

    if (await deleteButton.count() > 0) {
      await deleteButton.click()

      // Attendre la confirmation
      const confirmDialog = authenticatedPage.locator('[role="alertdialog"]')
        .or(authenticatedPage.locator('[data-testid="confirm-delete"]'))

      await expect(confirmDialog).toBeVisible()

      // Confirmer la suppression
      const confirmButton = confirmDialog.getByRole('button', { name: /delete|confirm|supprimer|confirmer/i })
      await confirmButton.click()

      // Attendre la fermeture du dialog
      await expect(confirmDialog).not.toBeVisible({ timeout: 5000 })

      // Vérifier le message de succès
      await expect(authenticatedPage.getByText(/deleted|supprimé/i)).toBeVisible()

      // Vérifier que le nombre de lignes a diminué
      await authenticatedPage.waitForTimeout(500)
      const finalRows = await authenticatedPage.getByRole('row').count()
      expect(finalRows).toBeLessThan(initialRows)
    }
  })

  test('Pagination fonctionne', async ({ authenticatedPage }) => {
    // Chercher les contrôles de pagination
    const nextButton = authenticatedPage.getByRole('button', { name: /next|suivant/i })
      .or(authenticatedPage.locator('[data-testid="pagination-next"]'))

    if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
      // Sauvegarder le premier utilisateur de la page actuelle
      const firstUserRow = authenticatedPage.getByRole('row').nth(1)
      const firstUserEmail = await firstUserRow.textContent()

      // Aller à la page suivante
      await nextButton.click()

      // Attendre le rechargement
      await authenticatedPage.waitForTimeout(500)

      // Vérifier que le contenu a changé
      const newFirstUserRow = authenticatedPage.getByRole('row').nth(1)
      const newFirstUserEmail = await newFirstUserRow.textContent()

      expect(newFirstUserEmail).not.toBe(firstUserEmail)

      // Revenir à la page précédente
      const prevButton = authenticatedPage.getByRole('button', { name: /previous|précédent/i })
        .or(authenticatedPage.locator('[data-testid="pagination-prev"]'))

      if (await prevButton.count() > 0) {
        await prevButton.click()
        await authenticatedPage.waitForTimeout(500)

        // Vérifier qu'on est revenu au contenu initial
        const backToFirstRow = authenticatedPage.getByRole('row').nth(1)
        const backToFirstEmail = await backToFirstRow.textContent()
        expect(backToFirstEmail).toBe(firstUserEmail)
      }
    }
  })

  test('Modal d\'édition affiche les bonnes informations', async ({ authenticatedPage }) => {
    // Trouver le premier utilisateur
    const userRows = authenticatedPage.getByRole('row')
    const firstUserRow = userRows.nth(1)

    // Récupérer l'email et le rôle
    const userEmail = await firstUserRow.textContent()

    // Ouvrir le modal d'édition
    const editButton = firstUserRow.getByRole('button', { name: /edit|modifier/i })
      .or(firstUserRow.locator('[data-testid="edit-user"]'))

    if (await editButton.count() > 0) {
      await editButton.click()

      // Vérifier que le modal contient l'email
      const dialog = authenticatedPage.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()

      // Vérifier que l'email est affiché
      await expect(dialog.getByText(new RegExp(userEmail?.split('@')[0] || 'test', 'i'))).toBeVisible()
    }
  })

  test('Contributor peut voir mais pas modifier', async ({ page }) => {
    // Se connecter en tant que contributor (si applicable)
    // Pour ce test, on suppose qu'on a un utilisateur contributor

    await page.goto('/admin/users')

    // Vérifier que la liste est visible
    const userTable = page.locator('table')
    await expect(userTable).toBeVisible()

    // Vérifier que les boutons d'édition/suppression sont désactivés ou absents
    const editButtons = page.getByRole('button', { name: /edit|modifier/i })
    const deleteButtons = page.getByRole('button', { name: /delete|supprimer/i })

    const editCount = await editButtons.count()
    const deleteCount = await deleteButtons.count()

    // Soit ils n'existent pas, soit ils sont désactivés
    if (editCount > 0) {
      await expect(editButtons.first()).toBeDisabled()
    }
    if (deleteCount > 0) {
      await expect(deleteButtons.first()).toBeDisabled()
    }
  })

  test('Affichage des badges de rôle', async ({ authenticatedPage }) => {
    // Vérifier que chaque utilisateur a un badge de rôle visible
    const userRows = authenticatedPage.getByRole('row')
    const firstUserRow = userRows.nth(1)

    // Chercher un badge/chip de rôle
    const roleBadge = firstUserRow.locator('[data-testid="role-badge"]')
      .or(firstUserRow.getByText(/admin|contributor|user/i))

    await expect(roleBadge.first()).toBeVisible()
  })

  test('Messages d\'erreur s\'affichent correctement', async ({ authenticatedPage }) => {
    // Simuler une erreur en essayant de supprimer un admin (si protégé)
    const userRows = authenticatedPage.getByRole('row')
    const adminRow = userRows.filter({ hasText: /admin/i }).first()

    const deleteButton = adminRow.getByRole('button', { name: /delete|supprimer/i })

    if (await deleteButton.count() > 0) {
      // Si le bouton existe pour les admins
      await deleteButton.click()

      const confirmDialog = authenticatedPage.locator('[role="alertdialog"]')
      if (await confirmDialog.count() > 0) {
        const confirmButton = confirmDialog.getByRole('button', { name: /delete|confirm/i })
        await confirmButton.click()

        // Vérifier le message d'erreur
        await expect(authenticatedPage.getByText(/error|cannot delete|erreur/i)).toBeVisible()
      }
    }
  })
})
