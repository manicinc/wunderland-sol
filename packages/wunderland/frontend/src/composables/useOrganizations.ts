// File: frontend/src/composables/useOrganizations.ts
import { computed, ref } from 'vue';
import {
  organizationAPI,
  type OrganizationSummaryFE,
  type OrganizationInviteFE,
} from '@/utils/api';

const organizationsState = ref<OrganizationSummaryFE[]>([]);
const isLoadingState = ref(false);
const isReadyState = ref(false);

const replaceOrganization = (summary: OrganizationSummaryFE) => {
  const index = organizationsState.value.findIndex((org) => org.id === summary.id);
  if (index >= 0) {
    organizationsState.value.splice(index, 1, summary);
  } else {
    organizationsState.value.push(summary);
  }
};

const removeOrganizationFromState = (organizationId: string) => {
  const index = organizationsState.value.findIndex((org) => org.id === organizationId);
  if (index >= 0) {
    organizationsState.value.splice(index, 1);
  }
};

export function useOrganizations() {
  const organizations = computed(() => organizationsState.value);
  const isLoading = computed(() => isLoadingState.value);
  const isReady = computed(() => isReadyState.value);

  const loadOrganizations = async (): Promise<void> => {
    if (isLoadingState.value) return;
    isLoadingState.value = true;
    try {
      const { data } = await organizationAPI.list();
      organizationsState.value = data?.organizations ?? [];
    } finally {
      isLoadingState.value = false;
      isReadyState.value = true;
    }
  };

  const createOrganization = async (payload: {
    name: string;
    seatLimit?: number;
    planId?: string;
    slug?: string | null;
  }): Promise<OrganizationSummaryFE> => {
    const { data } = await organizationAPI.create(payload);
    if (data?.organization) {
      replaceOrganization(data.organization);
    }
    return data.organization;
  };

  const updateOrganization = async (
    organizationId: string,
    payload: { name?: string; seatLimit?: number },
  ): Promise<OrganizationSummaryFE> => {
    const { data } = await organizationAPI.update(organizationId, payload);
    if (data?.organization) {
      replaceOrganization(data.organization);
    }
    return data.organization;
  };

  const inviteMember = async (
    organizationId: string,
    payload: { email: string; role?: 'admin' | 'builder' | 'viewer'; expiresAt?: number | null },
  ): Promise<{ organization: OrganizationSummaryFE; invite: OrganizationInviteFE }> => {
    const { data } = await organizationAPI.createInvite(organizationId, payload);
    if (data?.organization) {
      replaceOrganization(data.organization);
    }
    return data;
  };

  const revokeInvite = async (organizationId: string, inviteId: string): Promise<OrganizationSummaryFE> => {
    const { data } = await organizationAPI.revokeInvite(organizationId, inviteId);
    if (data?.organization) {
      replaceOrganization(data.organization);
    }
    return data.organization;
  };

  const updateMember = async (
    organizationId: string,
    memberId: string,
    payload: { role?: 'admin' | 'builder' | 'viewer'; dailyUsageCapUsd?: number | null; seatUnits?: number },
  ): Promise<OrganizationSummaryFE> => {
    const { data } = await organizationAPI.updateMember(organizationId, memberId, payload);
    if (data?.organization) {
      replaceOrganization(data.organization);
    }
    return data.organization;
  };

  const removeMember = async (
    organizationId: string,
    memberId: string,
  ): Promise<OrganizationSummaryFE | null> => {
    const { data } = await organizationAPI.removeMember(organizationId, memberId);
    if (data?.organization) {
      replaceOrganization(data.organization);
      return data.organization;
    }
    removeOrganizationFromState(organizationId);
    return null;
  };

  const acceptInvite = async (token: string): Promise<OrganizationSummaryFE> => {
    const { data } = await organizationAPI.acceptInvite(token);
    if (data?.organization) {
      replaceOrganization(data.organization);
    }
    return data.organization;
  };

  return {
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
    acceptInvite,
  };
}
