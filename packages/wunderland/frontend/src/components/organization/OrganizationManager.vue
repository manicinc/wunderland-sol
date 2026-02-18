// File: frontend/src/components/organization/OrganizationManager.vue
<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  PlusIcon,
  UsersIcon,
  ArrowPathIcon,
  ClipboardIcon,
  CheckIcon,
  TrashIcon,
  UserMinusIcon,
} from '@heroicons/vue/24/outline';
import { useOrganizations } from '@/composables/useOrganizations';
import type { OrganizationSummaryFE, OrganizationMemberFE, OrganizationInviteFE } from '@/utils/api';
import { useAuth } from '@/composables/useAuth';
import type { ToastService } from '@/services/services';

type RoleOption = { id: OrganizationMemberFE['role']; label: string };

const { t, locale } = useI18n();
const toast = inject<ToastService>('toast');
const auth = useAuth();
const {
  organizations,
  isLoading,
  isReady,
  loadOrganizations,
  createOrganization,
  updateOrganization,
  inviteMember,
  revokeInvite,
  updateMember,
  removeMember,
} = useOrganizations();

const showCreateForm = ref(false);
const createInProgress = ref(false);
const newOrganizationName = ref('');

const seatLimitInputs = reactive<Record<string, number | ''>>({});
const inviteFormState = reactive<Record<string, { email: string; role: OrganizationMemberFE['role'] }>>({});
const inviteInFlight = ref<string | null>(null);
const updatingOrganizationId = ref<string | null>(null);
const memberActionState = reactive<Record<string, boolean>>({});
const recentlyCopiedInvite = ref<string | null>(null);

const availableRoles = computed<RoleOption[]>(() => [
  { id: 'admin', label: t('organization.roles.admin') },
  { id: 'builder', label: t('organization.roles.builder') },
  { id: 'viewer', label: t('organization.roles.viewer') },
]);

watch(
  organizations,
  (entries) => {
    entries.forEach((org) => {
      seatLimitInputs[org.id] = org.seatLimit;
      if (!inviteFormState[org.id]) {
        inviteFormState[org.id] = { email: '', role: 'builder' };
      }
    });
  },
  { immediate: true },
);

onMounted(() => {
  if (!isReady.value) {
    void loadOrganizations();
  }
});

const handleCreateOrganization = async (): Promise<void> => {
  if (!newOrganizationName.value.trim()) {
    toast?.add({ type: 'warning', title: t('organization.toast.missingNameTitle'), message: t('organization.toast.missingNameMessage') });
    return;
  }
  createInProgress.value = true;
  try {
    const summary = await createOrganization({
      name: newOrganizationName.value.trim(),
    });
    toast?.add({
      type: 'success',
      title: t('organization.toast.createdTitle'),
      message: t('organization.toast.createdMessage', { name: summary.name }),
    });
    newOrganizationName.value = '';
    showCreateForm.value = false;
  } catch (error: any) {
    console.error('[OrganizationManager] Failed to create organization:', error);
    toast?.add({
      type: 'error',
      title: t('organization.toast.createErrorTitle'),
      message: error?.response?.data?.message ?? t('organization.toast.genericError'),
    });
  } finally {
    createInProgress.value = false;
  }
};

const handleSeatLimitBlur = async (organization: OrganizationSummaryFE): Promise<void> => {
  const pendingValue = seatLimitInputs[organization.id];
  if (pendingValue === '' || pendingValue === organization.seatLimit) return;
  const seatLimit = Number(pendingValue);
  if (!Number.isFinite(seatLimit) || seatLimit < 1) {
    seatLimitInputs[organization.id] = organization.seatLimit;
    toast?.add({
      type: 'warning',
      title: t('organization.toast.invalidSeatLimitTitle'),
      message: t('organization.toast.invalidSeatLimitMessage'),
    });
    return;
  }
  updatingOrganizationId.value = organization.id;
  try {
    await updateOrganization(organization.id, { seatLimit });
    toast?.add({
      type: 'success',
      title: t('organization.toast.seatLimitUpdatedTitle'),
      message: t('organization.toast.seatLimitUpdatedMessage', { seatLimit }),
    });
  } catch (error: any) {
    console.error('[OrganizationManager] Failed to update seat limit:', error);
    seatLimitInputs[organization.id] = organization.seatLimit;
    toast?.add({
      type: 'error',
      title: t('organization.toast.seatLimitUpdateErrorTitle'),
      message: error?.response?.data?.message ?? t('organization.toast.genericError'),
    });
  } finally {
    updatingOrganizationId.value = null;
  }
};

const handleRoleChange = async (
  organization: OrganizationSummaryFE,
  member: OrganizationMemberFE,
  role: OrganizationMemberFE['role'],
) => {
  memberActionState[member.id] = true;
  try {
    await updateMember(organization.id, member.id, { role });
    toast?.add({
      type: 'success',
      title: t('organization.toast.roleUpdatedTitle'),
      message: t('organization.toast.roleUpdatedMessage', { email: member.email ?? member.userId, role: t(`organization.roles.${role}`) }),
    });
  } catch (error: any) {
    console.error('[OrganizationManager] Failed to update role:', error);
    toast?.add({
      type: 'error',
      title: t('organization.toast.roleUpdateErrorTitle'),
      message: error?.response?.data?.message ?? t('organization.toast.genericError'),
    });
  } finally {
    memberActionState[member.id] = false;
  }
};

const handleRemoveMember = async (organization: OrganizationSummaryFE, member: OrganizationMemberFE) => {
  const isSelf = member.userId === auth.user.value?.id;
  const confirmed = window.confirm(
    isSelf ? t('organization.confirm.leaveSelf') : t('organization.confirm.removeMember', { email: member.email ?? member.userId }),
  );
  if (!confirmed) return;
  memberActionState[member.id] = true;
  try {
    const result = await removeMember(organization.id, member.id);
    if (!result) {
      toast?.add({
        type: 'info',
        title: t('organization.toast.leftTitle'),
        message: t('organization.toast.leftMessage'),
      });
    } else {
      toast?.add({
        type: 'success',
        title: t('organization.toast.memberRemovedTitle'),
        message: t('organization.toast.memberRemovedMessage', { email: member.email ?? member.userId }),
      });
    }
  } catch (error: any) {
    console.error('[OrganizationManager] Failed to remove member:', error);
    toast?.add({
      type: 'error',
      title: t('organization.toast.memberRemoveErrorTitle'),
      message: error?.response?.data?.message ?? t('organization.toast.genericError'),
    });
  } finally {
    memberActionState[member.id] = false;
  }
};

const handleInvite = async (organization: OrganizationSummaryFE) => {
  const state = inviteFormState[organization.id];
  const email = state.email.trim();
  if (!email) {
    toast?.add({
      type: 'warning',
      title: t('organization.toast.inviteMissingEmailTitle'),
      message: t('organization.toast.inviteMissingEmailMessage'),
    });
    return;
  }
  if (organization.stats.availableSeats <= 0) {
    toast?.add({
      type: 'warning',
      title: t('organization.toast.noSeatsTitle'),
      message: t('organization.toast.noSeatsMessage'),
    });
    return;
  }
  inviteInFlight.value = organization.id;
  try {
    const { invite } = await inviteMember(organization.id, { email, role: state.role });
    inviteFormState[organization.id] = { email: '', role: 'builder' };
    toast?.add({
      type: 'success',
      title: t('organization.toast.inviteCreatedTitle'),
      message: t('organization.toast.inviteCreatedMessage', { email }),
    });
    if (invite?.token) {
      void copyInviteLink(invite);
    }
  } catch (error: any) {
    console.error('[OrganizationManager] Failed to create invite:', error);
    toast?.add({
      type: 'error',
      title: t('organization.toast.inviteErrorTitle'),
      message: error?.response?.data?.message ?? t('organization.toast.genericError'),
    });
  } finally {
    inviteInFlight.value = null;
  }
};

const copyInviteLink = async (invite: OrganizationInviteFE): Promise<void> => {
  if (!invite.token) return;
  try {
    const origin = window.location.origin;
    const currentLocale = locale.value;
    const link = `${origin}/${currentLocale}/invite/${invite.token}`;
    await navigator.clipboard.writeText(link);
    recentlyCopiedInvite.value = invite.id;
    toast?.add({
      type: 'info',
      title: t('organization.toast.inviteCopiedTitle'),
      message: t('organization.toast.inviteCopiedMessage'),
    });
    setTimeout(() => {
      if (recentlyCopiedInvite.value === invite.id) {
        recentlyCopiedInvite.value = null;
      }
    }, 4000);
  } catch (error) {
    console.error('[OrganizationManager] Failed to copy invite link:', error);
    toast?.add({
      type: 'error',
      title: t('organization.toast.inviteCopyErrorTitle'),
      message: t('organization.toast.genericError'),
    });
  }
};

const handleRevokeInvite = async (organization: OrganizationSummaryFE, invite: OrganizationInviteFE) => {
  const confirmed = window.confirm(t('organization.confirm.revokeInvite', { email: invite.email }));
  if (!confirmed) return;
  try {
    await revokeInvite(organization.id, invite.id);
    toast?.add({
      type: 'success',
      title: t('organization.toast.inviteRevokedTitle'),
      message: t('organization.toast.inviteRevokedMessage', { email: invite.email }),
    });
  } catch (error: any) {
    console.error('[OrganizationManager] Failed to revoke invite:', error);
    toast?.add({
      type: 'error',
      title: t('organization.toast.inviteRevokeErrorTitle'),
      message: error?.response?.data?.message ?? t('organization.toast.genericError'),
    });
  }
};

const getActiveMembers = (organization: OrganizationSummaryFE) =>
  organization.members.filter((member) => member.status === 'active');

const getPendingInvites = (organization: OrganizationSummaryFE) =>
  organization.invites.filter((invite) => invite.status === 'pending');
</script>

<template>
  <div class="organization-manager">
    <section v-if="!isReady" class="organization-loading">
      <ArrowPathIcon class="icon-spin" aria-hidden="true" />
      <span>{{ t('organization.loading') }}</span>
    </section>

    <section v-else>
      <div v-if="organizations.length === 0" class="organization-empty">
        <UsersIcon class="icon-lg" aria-hidden="true" />
        <h4>{{ t('organization.emptyTitle') }}</h4>
        <p>{{ t('organization.emptyMessage') }}</p>
        <button class="btn btn-primary" @click="showCreateForm = true" v-if="!showCreateForm">
          <PlusIcon class="icon-sm" aria-hidden="true" />
          <span>{{ t('organization.createButton') }}</span>
        </button>
        <form v-if="showCreateForm" class="organization-create-form" @submit.prevent="handleCreateOrganization">
          <label class="form-label" for="new-organization-name">{{ t('organization.createLabel') }}</label>
          <input
            id="new-organization-name"
            v-model="newOrganizationName"
            class="input"
            type="text"
            :placeholder="t('organization.createPlaceholder')"
            required
            :disabled="createInProgress"
          />
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="createInProgress">
              <ArrowPathIcon v-if="createInProgress" class="icon-spin" aria-hidden="true" />
              <span v-else>{{ t('organization.createSubmit') }}</span>
            </button>
            <button type="button" class="btn btn-tertiary" @click="showCreateForm = false" :disabled="createInProgress">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>

      <div v-else class="organization-list">
        <article v-for="organization in organizations" :key="organization.id" class="organization-card">
          <header class="organization-header">
            <div>
              <h3>{{ organization.name }}</h3>
              <p class="organization-plan">
                {{ t('organization.planLabel', { plan: organization.planId }) }}
              </p>
            </div>
            <div class="organization-seat-budget">
              <label :for="`seat-limit-${organization.id}`">{{ t('organization.seatLimitLabel') }}</label>
              <div class="seat-input-wrap">
                <input
                  :id="`seat-limit-${organization.id}`"
                  class="input seat-input"
                  type="number"
                  min="1"
                  :disabled="!organization.permissions.canManageSeats || updatingOrganizationId === organization.id"
                  v-model="seatLimitInputs[organization.id]"
                  @blur="handleSeatLimitBlur(organization)"
                />
                <ArrowPathIcon
                  v-if="updatingOrganizationId === organization.id"
                  class="icon-spin"
                  aria-hidden="true"
                />
              </div>
              <p class="seat-summary">
                {{ t('organization.seatSummary', {
                  active: organization.stats.activeSeats,
                  pending: organization.stats.pendingInvites,
                  limit: organization.seatLimit
                }) }}
              </p>
            </div>
          </header>

          <section class="organization-members">
            <div class="section-heading">
              <h4>{{ t('organization.membersHeading') }}</h4>
              <p class="section-subheading">
                {{ t('organization.membersDescription') }}
              </p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>{{ t('organization.memberEmail') }}</th>
                  <th>{{ t('organization.memberRole') }}</th>
                  <th>{{ t('organization.memberStatus') }}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in getActiveMembers(organization)" :key="member.id">
                  <td>
                    <span>{{ member.email ?? member.userId }}</span>
                    <span v-if="member.isSelf" class="badge">
                      {{ t('organization.badges.you') }}
                    </span>
                  </td>
                  <td>
                    <template v-if="organization.permissions.canModifyMembers && !member.isSelf">
                      <select
                        class="input"
                        :disabled="memberActionState[member.id]"
                        :value="member.role"
                        @change="handleRoleChange(organization, member, ($event.target as HTMLSelectElement).value as OrganizationMemberFE['role'])"
                      >
                        <option v-for="role in availableRoles" :key="role.id" :value="role.id">
                          {{ role.label }}
                        </option>
                      </select>
                    </template>
                    <template v-else>
                      {{ t(`organization.roles.${member.role}`) }}
                    </template>
                  </td>
                  <td>{{ member.status }}</td>
                  <td class="member-actions">
                    <button
                      class="btn-icon"
                      :title="member.isSelf ? t('organization.actions.leave') : t('organization.actions.remove')"
                      :disabled="memberActionState[member.id]"
                      @click="handleRemoveMember(organization, member)"
                    >
                      <ArrowPathIcon v-if="memberActionState[member.id]" class="icon-spin" aria-hidden="true" />
                      <UserMinusIcon v-else-if="member.isSelf" class="icon-sm" aria-hidden="true" />
                      <TrashIcon v-else class="icon-sm" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section
            v-if="organization.permissions.canInvite"
            class="organization-invites"
          >
            <div class="section-heading">
              <h4>{{ t('organization.inviteHeading') }}</h4>
              <p class="section-subheading">
                {{ t('organization.inviteDescription', { available: organization.stats.availableSeats }) }}
              </p>
            </div>
            <form class="invite-form" @submit.prevent="handleInvite(organization)">
              <input
                v-model="inviteFormState[organization.id].email"
                type="email"
                required
                class="input"
                :placeholder="t('organization.inviteEmailPlaceholder')"
                :disabled="inviteInFlight === organization.id"
              />
              <select
                v-model="inviteFormState[organization.id].role"
                class="input"
                :disabled="inviteInFlight === organization.id"
              >
                <option v-for="role in availableRoles" :key="role.id" :value="role.id">
                  {{ role.label }}
                </option>
              </select>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="inviteInFlight === organization.id || organization.stats.availableSeats <= 0"
              >
                <ArrowPathIcon v-if="inviteInFlight === organization.id" class="icon-spin" aria-hidden="true" />
                <template v-else>
                  <PlusIcon class="icon-sm" aria-hidden="true" />
                  <span>{{ t('organization.inviteSubmit') }}</span>
                </template>
              </button>
            </form>
            <p v-if="organization.stats.availableSeats <= 0" class="seat-warning">
              {{ t('organization.noSeatsAvailable') }}
            </p>
            <div v-if="getPendingInvites(organization).length" class="pending-invites">
              <h5>{{ t('organization.pendingInvitesHeading') }}</h5>
              <ul>
                <li v-for="invite in getPendingInvites(organization)" :key="invite.id">
                  <div class="invite-info">
                    <span>{{ invite.email }}</span>
                    <span class="role">{{ t(`organization.roles.${invite.role}`) }}</span>
                  </div>
                  <div class="invite-actions">
                    <button class="btn-icon" @click="copyInviteLink(invite)">
                      <CheckIcon v-if="recentlyCopiedInvite === invite.id" class="icon-sm" aria-hidden="true" />
                      <ClipboardIcon v-else class="icon-sm" aria-hidden="true" />
                    </button>
                    <button class="btn-icon danger" @click="handleRevokeInvite(organization, invite)">
                      <TrashIcon class="icon-sm" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </section>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.organization-manager {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.organization-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.9);
  font-size: 0.95rem;
}

.organization-empty {
  border: 1px dashed hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.4);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  background: hsla(var(--color-surface-muted-h), var(--color-surface-muted-s), var(--color-surface-muted-l), 0.35);
}

.organization-create-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: min(420px, 100%);
}

.organization-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.organization-card {
  border: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.4);
  border-radius: 1rem;
  padding: 1.5rem;
  background: hsla(var(--color-surface-primary-h), var(--color-surface-primary-s), var(--color-surface-primary-l), 0.65);
  box-shadow: 0 12px 30px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.15);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.organization-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.organization-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
}

.organization-plan {
  font-size: 0.85rem;
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.9);
}

.organization-seat-budget {
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.seat-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.seat-input {
  width: 6rem;
  text-align: right;
}

.seat-summary {
  font-size: 0.85rem;
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.9);
}

.organization-members table {
  width: 100%;
  border-collapse: collapse;
}

.organization-members th,
.organization-members td {
  padding: 0.6rem;
  text-align: left;
  border-bottom: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.2);
}

.organization-members th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.8);
}

.member-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-icon {
  border: none;
  background: none;
  padding: 0.35rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
}

.btn-icon:hover {
  background: hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.2);
}

.btn-icon.danger {
  color: hsl(var(--color-error-h), var(--color-error-s), var(--color-error-l));
}

.section-heading {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.section-heading h4 {
  font-weight: 600;
  font-size: 1rem;
}

.section-subheading {
  font-size: 0.85rem;
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.9);
}

.badge {
  margin-left: 0.5rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: hsla(var(--color-accent-h), var(--color-accent-s), var(--color-accent-l), 0.2);
  color: hsl(var(--color-accent-h), var(--color-accent-s), var(--color-accent-l));
}

.organization-invites .invite-form {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.organization-invites .input {
  min-width: 200px;
}

.seat-warning {
  margin-top: 0.5rem;
  color: hsl(var(--color-error-h), var(--color-error-s), var(--color-error-l));
  font-size: 0.85rem;
}

.pending-invites ul {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pending-invites li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  border-radius: 0.75rem;
  background: hsla(var(--color-surface-muted-h), var(--color-surface-muted-s), var(--color-surface-muted-l), 0.45);
}

.invite-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.invite-info .role {
  font-size: 0.75rem;
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.9);
}

.invite-actions {
  display: flex;
  gap: 0.35rem;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-lg {
  width: 2.5rem;
  height: 2.5rem;
}

.icon-spin {
  width: 1rem;
  height: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
