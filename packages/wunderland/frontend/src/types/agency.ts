export interface AgencySeatFE {
  roleId: string;
  gmiInstanceId: string;
  personaId: string;
  metadata?: Record<string, unknown>;
}

export interface AgencySnapshotFE {
  agencyId: string;
  workflowId: string;
  conversationId?: string;
  seats: AgencySeatFE[];
  metadata?: Record<string, unknown>;
  updatedAt: number;
}

export interface AgencyUpdateEventDetail {
  agency: AgencySnapshotFE;
}

