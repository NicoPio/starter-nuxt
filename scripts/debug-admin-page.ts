/**
 * Script de débogage pour vérifier les données de la page admin/users
 */

console.log('=== DEBUG ADMIN PAGE ===')
console.log('Date:', new Date().toISOString())

// Test 1: Vérifier les modales
console.log('\n[TEST 1] État des modales')
console.log('editModalOpen devrait être false au chargement')
console.log('deleteDialogOpen devrait être false au chargement')

// Test 2: Vérifier les colonnes du tableau
console.log('\n[TEST 2] Colonnes du tableau')
const columns = [
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'name', header: 'Nom' },
  { accessorKey: 'role', header: 'Rôle' },
  { accessorKey: 'createdAt', header: 'Créé le' },
  { id: 'actions', header: 'Actions', enableSorting: false }
]
console.log('Colonnes définies:', columns)
console.log('Colonne actions:', columns.find(c => 'id' in c && c.id === 'actions'))

// Test 3: Vérifier que UTable supporte les slots custom
console.log('\n[TEST 3] Slots attendus')
console.log('Slots requis pour UTable:')
columns.forEach(col => {
  const key = 'accessorKey' in col ? col.accessorKey : col.id
  console.log(`  - #${key}-data`)
})

console.log('\n[TEST 4] Points de vérification dans le navigateur')
console.log('1. Ouvrir Vue DevTools')
console.log('2. Inspecter le composant AdminUserList')
console.log('3. Vérifier que users.length > 0')
console.log('4. Vérifier que les slots #actions-data sont définis')
console.log('5. Inspecter le DOM pour voir si les boutons sont rendus mais cachés')
