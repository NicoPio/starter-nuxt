<script setup lang="ts">
import { z } from 'zod'

const { t } = useContentI18n()
const { profile, updateProfile, loading } = useUser()

// Zod validation schema
const profileSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().optional()
})

// Form state
const state = reactive({
  full_name: profile.value?.full_name || '',
  avatar_url: profile.value?.avatar_url || ''
})

// Watch profile changes to update form
watch(profile, (newProfile) => {
  if (newProfile) {
    state.full_name = newProfile.full_name || ''
    state.avatar_url = newProfile.avatar_url || ''
  }
})

// Validate function for UForm
const validate = (state: any) => {
  const errors = []
  const result = profileSchema.safeParse(state)

  if (!result.success) {
    result.error.issues.forEach(issue => {
      errors.push({
        path: issue.path.join('.'),
        message: t(`profile.validation.${issue.message}`)
      })
    })
  }

  return errors
}

const onSubmit = async () => {
  const updates: any = {}

  if (state.full_name && state.full_name !== profile.value?.full_name) {
    updates.full_name = state.full_name
  }

  if (state.avatar_url && state.avatar_url !== profile.value?.avatar_url) {
    updates.avatar_url = state.avatar_url
  }

  if (Object.keys(updates).length === 0) {
    return // No changes
  }

  await updateProfile(updates)
}
</script>

<template>
  <UForm :state="state" :validate="validate" @submit="onSubmit" class="space-y-4">
    <UFormField :label="t('profile.fullName')" name="full_name">
      <UInput
        v-model="state.full_name"
        type="text"
        :placeholder="t('profile.fullNamePlaceholder')"
        size="lg"
      />
    </UFormField>

    <UFormField :label="t('profile.avatarUrl')" name="avatar_url">
      <UInput
        v-model="state.avatar_url"
        type="url"
        :placeholder="t('profile.avatarUrlPlaceholder')"
        size="lg"
      />
      <template #hint>
        <span class="text-xs text-gray-500">
          {{ t('profile.avatarUrlHint') }}
        </span>
      </template>
    </UFormField>

    <div v-if="state.avatar_url" class="flex items-center gap-4">
      <img
        :src="state.avatar_url"
        :alt="t('profile.avatarPreview')"
        class="h-16 w-16 rounded-full object-cover"
      />
      <span class="text-sm text-gray-600 dark:text-gray-400">
        {{ t('profile.avatarPreview') }}
      </span>
    </div>

    <div class="flex items-center justify-between pt-4">
      <div class="text-sm text-gray-600 dark:text-gray-400">
        <p>{{ t('profile.email') }}: <strong>{{ profile?.email }}</strong></p>
        <p>{{ t('profile.role') }}: <strong>{{ profile?.role }}</strong></p>
      </div>

      <UButton
        type="submit"
        :loading="loading"
        :disabled="loading"
        color="primary"
        size="lg"
      >
        {{ t('profile.save') }}
      </UButton>
    </div>
  </UForm>
</template>
