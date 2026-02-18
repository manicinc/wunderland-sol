import type { Database as BetterSqliteDatabase } from 'better-sqlite3';

type StatementParams = Record<string, any> | any[] | undefined;

interface InMemoryTables {
  appUsers: Map<string, Record<string, any>>;
  appMeta: Map<string, string>;
  loginEvents: Array<Record<string, any>>;
  globalAccessLogs: Array<Record<string, any>>;
  lemonsqueezyEvents: Map<string, Record<string, any>>;
  checkoutSessions: Map<string, Record<string, any>>;
  organizations: Map<string, Record<string, any>>;
  organizationMembers: Map<string, Record<string, any>>;
  organizationInvites: Map<string, Record<string, any>>;
}

const createTables = (): InMemoryTables => ({
  appUsers: new Map(),
  appMeta: new Map(),
  loginEvents: [],
  globalAccessLogs: [],
  lemonsqueezyEvents: new Map(),
  checkoutSessions: new Map(),
  organizations: new Map(),
  organizationMembers: new Map(),
  organizationInvites: new Map(),
});

const asArray = (params: StatementParams): any[] => {
  if (Array.isArray(params)) {
    return params;
  }
  if (params === undefined || params === null) {
    return [];
  }
  return [params];
};

const ensureObject = (params: StatementParams): Record<string, any> => {
  if (!params) {
    return {};
  }
  if (Array.isArray(params)) {
    throw new Error('Named parameters expected but array provided in in-memory database stub.');
  }
  return params;
};

class InMemoryStatement {
  private readonly normalizedSql: string;

  constructor(private readonly db: InMemoryDatabase, private readonly sql: string) {
    this.normalizedSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();
  }

  public run(params?: StatementParams): { changes: number } {
    return this.db.handleRun(this.normalizedSql, this.sql, params ?? {});
  }

  public get(...params: any[]): any {
    return this.db.handleGet(this.normalizedSql, this.sql, params);
  }

  public all(...params: any[]): any[] {
    return this.db.handleAll(this.normalizedSql, this.sql, params);
  }
}

export class InMemoryDatabase {
  public readonly tables: InMemoryTables = createTables();

  constructor(private readonly logger: Console = console) {}

  public prepare(sql: string): InMemoryStatement {
    return new InMemoryStatement(this, sql);
  }

  public exec(sql: string): this {
    // No-op: schema statements are ignored in the in-memory stub.
    if (sql && sql.trim()) {
      this.logger?.debug?.('[InMemoryDatabase] Ignoring exec SQL:', sql.slice(0, 60));
    }
    return this;
  }

  public close(): this {
    this.logger?.info?.('[InMemoryDatabase] Closed stub database.');
    return this;
  }

  public handleRun(normalizedSql: string, originalSql: string, params: StatementParams): { changes: number } {
    const sql = normalizedSql;

    if (sql.includes('INSERT INTO APP_USERS')) {
      const named = ensureObject(params);
      const row = { ...named };
      this.tables.appUsers.set(String(named.id), row);
      return { changes: 1 };
    }

    if (sql.includes('UPDATE APP_USERS')) {
      const named = ensureObject(params);
      const existing = this.tables.appUsers.get(String(named.user_id ?? named.id));
      if (existing) {
        Object.entries(named).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            existing[key] = value;
          } else if (key === 'metadata' && value === null) {
            existing[key] = null;
          }
        });
        existing.updated_at = named.updated_at ?? existing.updated_at;
        this.tables.appUsers.set(String(existing.id), existing);
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (sql.includes('INSERT INTO LOGIN_EVENTS')) {
      const named = ensureObject(params);
      this.tables.loginEvents.push({ ...named });
      return { changes: 1 };
    }

    if (sql.includes('INSERT INTO GLOBAL_ACCESS_LOGS')) {
      const named = ensureObject(params);
      this.tables.globalAccessLogs.push({ ...named });
      return { changes: 1 };
    }

    if (sql.includes('INSERT OR REPLACE INTO LEMONSQUEEZY_EVENTS')) {
      const named = ensureObject(params);
      this.tables.lemonsqueezyEvents.set(String(named.id), { ...named });
      return { changes: 1 };
    }

    if (sql.includes('INSERT INTO CHECKOUT_SESSIONS')) {
      const named = ensureObject(params);
      const row = { ...named, status: 'created' };
      this.tables.checkoutSessions.set(String(named.id), row);
      return { changes: 1 };
    }

    if (sql.includes('UPDATE CHECKOUT_SESSIONS')) {
      const named = ensureObject(params);
      const existing = this.tables.checkoutSessions.get(String(named.id));
      if (existing) {
        Object.assign(existing, {
          status: named.status ?? existing.status,
          lemon_checkout_id: named.lemon_checkout_id ?? existing.lemon_checkout_id ?? null,
          lemon_subscription_id: named.lemon_subscription_id ?? existing.lemon_subscription_id ?? null,
          lemon_customer_id: named.lemon_customer_id ?? existing.lemon_customer_id ?? null,
          updated_at: named.updated_at ?? existing.updated_at,
        });
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (sql.includes('INSERT INTO ORGANIZATIONS')) {
      const named = ensureObject(params);
      const row = { ...named };
      this.tables.organizations.set(String(named.id), row);
      return { changes: 1 };
    }

    if (sql.includes('UPDATE ORGANIZATIONS')) {
      const named = ensureObject(params);
      const existing = this.tables.organizations.get(String(named.id));
      if (existing) {
        if (named.name !== null && named.name !== undefined) existing.name = named.name;
        if (named.slug !== undefined) existing.slug = named.slug ?? null;
        if (named.seat_limit !== null && named.seat_limit !== undefined) existing.seat_limit = named.seat_limit;
        if (named.plan_id !== undefined) existing.plan_id = named.plan_id ?? existing.plan_id;
        existing.updated_at = named.updated_at ?? existing.updated_at;
        this.tables.organizations.set(String(existing.id), existing);
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (sql.includes('INSERT INTO ORGANIZATION_MEMBERS')) {
      const named = ensureObject(params);
      const row = { ...named };
      this.tables.organizationMembers.set(String(named.id), row);
      return { changes: 1 };
    }

    if (sql.includes('UPDATE ORGANIZATION_MEMBERS')) {
      const named = ensureObject(params);
      const existing = this.tables.organizationMembers.get(String(named.id));
      if (existing) {
        if (named.role !== null && named.role !== undefined) existing.role = named.role;
        if (named.status !== null && named.status !== undefined) existing.status = named.status;
        if (named.seat_units !== null && named.seat_units !== undefined) existing.seat_units = named.seat_units;
        if (named.has_daily_cap === 1) {
          existing.daily_usage_cap_usd = named.daily_usage_cap_usd ?? null;
        }
        existing.updated_at = named.updated_at ?? existing.updated_at;
        this.tables.organizationMembers.set(String(existing.id), existing);
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (sql.includes('DELETE FROM ORGANIZATION_MEMBERS')) {
      const args = asArray(params);
      const id = String(args[0]);
      const existed = this.tables.organizationMembers.delete(id);
      return { changes: existed ? 1 : 0 };
    }

    if (sql.includes('INSERT INTO ORGANIZATION_INVITES')) {
      const named = ensureObject(params);
      const row = { ...named, status: named.status ?? 'pending' };
      this.tables.organizationInvites.set(String(named.id), row);
      return { changes: 1 };
    }

    if (sql.includes('UPDATE ORGANIZATION_INVITES')) {
      const named = ensureObject(params);
      const existing = this.tables.organizationInvites.get(String(named.id));
      if (existing) {
        Object.assign(existing, {
          status: named.status ?? existing.status,
          expires_at: named.expires_at ?? existing.expires_at ?? null,
          accepted_at: named.accepted_at ?? existing.accepted_at ?? null,
          revoked_at: named.revoked_at ?? existing.revoked_at ?? null,
        });
        this.tables.organizationInvites.set(String(existing.id), existing);
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    this.logger?.warn?.('[InMemoryDatabase] Unhandled run SQL:', originalSql);
    return { changes: 0 };
  }

  public handleGet(normalizedSql: string, originalSql: string, params: any[]): any {
    const sql = normalizedSql;

    if (sql.startsWith('SELECT * FROM APP_USERS WHERE EMAIL')) {
      const email = params[0];
      for (const row of this.tables.appUsers.values()) {
        if (row.email === email) {
          return { ...row };
        }
      }
      return undefined;
    }

    if (sql.startsWith('SELECT * FROM APP_USERS WHERE ID')) {
      const id = String(params[0]);
      return this.tables.appUsers.get(id) ?? undefined;
    }

    if (sql.includes('FROM APP_USERS WHERE SUPABASE_USER_ID')) {
      const supabaseId = params[0];
      for (const row of this.tables.appUsers.values()) {
        if (row.supabase_user_id === supabaseId) {
          return { ...row };
        }
      }
      return undefined;
    }

    if (sql.includes('SELECT COUNT(1) AS COUNT FROM LOGIN_EVENTS')) {
      const ip = params[0];
      const since = params[1];
      const count = this.tables.loginEvents.filter(
        (entry) =>
          entry.ip_address === ip &&
          entry.created_at >= since &&
          typeof entry.mode === 'string' &&
          entry.mode.toLowerCase().startsWith('global'),
      ).length;
      return { count };
    }

    if (sql.includes('SELECT * FROM CHECKOUT_SESSIONS WHERE ID')) {
      const id = String(params[0]);
      return this.tables.checkoutSessions.get(id) ?? undefined;
    }

    if (sql.includes('SELECT * FROM CHECKOUT_SESSIONS WHERE LEMON_CHECKOUT_ID')) {
      const checkoutId = params[0];
      for (const row of this.tables.checkoutSessions.values()) {
        if (row.lemon_checkout_id === checkoutId) {
          return { ...row };
        }
      }
      return undefined;
    }

    if (sql.startsWith('SELECT * FROM ORGANIZATIONS WHERE ID')) {
      const id = String(params[0]);
      return this.tables.organizations.get(id) ?? undefined;
    }

    if (sql.includes('SELECT M.*, U.EMAIL AS USER_EMAIL FROM ORGANIZATION_MEMBERS')) {
      const [arg1, arg2] = params;
      if (sql.includes('WHERE M.ID = ?')) {
        const record = this.tables.organizationMembers.get(String(arg1));
        if (!record) return undefined;
        return this.attachMemberUserEmail(record);
      }
      if (sql.includes('WHERE M.ORGANIZATION_ID = ? AND M.USER_ID = ?')) {
        const organizationId = String(arg1);
        const userId = String(arg2);
        for (const row of this.tables.organizationMembers.values()) {
          if (row.organization_id === organizationId && row.user_id === userId) {
            return this.attachMemberUserEmail(row);
          }
        }
        return undefined;
      }
    }

    if (sql.includes('SELECT COALESCE(SUM(SEAT_UNITS), 0) AS TOTAL FROM ORGANIZATION_MEMBERS')) {
      const organizationId = String(params[0]);
      const total = Array.from(this.tables.organizationMembers.values())
        .filter((row) => row.organization_id === organizationId && row.status === 'active')
        .reduce((sum, row) => sum + (row.seat_units ?? 0), 0);
      return { total };
    }

    if (sql.includes('SELECT COUNT(1) AS TOTAL FROM ORGANIZATION_MEMBERS')) {
      const organizationId = String(params[0]);
      const total = Array.from(this.tables.organizationMembers.values()).filter(
        (row) => row.organization_id === organizationId && row.status === 'active' && row.role === 'admin',
      ).length;
      return { total };
    }

    if (sql.startsWith('SELECT * FROM ORGANIZATION_INVITES WHERE ID')) {
      const id = String(params[0]);
      return this.tables.organizationInvites.get(id) ?? undefined;
    }

    if (sql.startsWith('SELECT * FROM ORGANIZATION_INVITES WHERE TOKEN')) {
      const token = String(params[0]);
      for (const row of this.tables.organizationInvites.values()) {
        if (row.token === token) {
          return { ...row };
        }
      }
      return undefined;
    }

    if (sql.includes('WHERE ORGANIZATION_ID = ? AND LOWER(EMAIL) = LOWER(?)')) {
      const [orgId, email] = params;
      const lowered = String(email).toLowerCase();
      for (const row of this.tables.organizationInvites.values()) {
        if (row.organization_id === String(orgId) && String(row.email).toLowerCase() === lowered && row.status === 'pending') {
          return { ...row };
        }
      }
      return undefined;
    }

    if (sql.includes('SELECT COUNT(1) AS TOTAL FROM ORGANIZATION_INVITES')) {
      const [orgId] = params;
      const total = Array.from(this.tables.organizationInvites.values()).filter(
        (row) => row.organization_id === String(orgId) && row.status === 'pending',
      ).length;
      return { total };
    }

    this.logger?.warn?.('[InMemoryDatabase] Unhandled get SQL:', originalSql);
    return undefined;
  }

  public handleAll(normalizedSql: string, originalSql: string, params: any[]): any[] {
    const sql = normalizedSql;

    if (sql.includes('FROM ORGANIZATIONS O INNER JOIN ORGANIZATION_MEMBERS M')) {
      const userId = String(params[0]);
      const rows: Record<string, any>[] = [];
      for (const member of this.tables.organizationMembers.values()) {
        if (member.user_id !== userId) continue;
        const org = this.tables.organizations.get(String(member.organization_id));
        if (!org) continue;
        rows.push({
          ...org,
          member_id: member.id,
          member_role: member.role,
          member_status: member.status,
          member_seat_units: member.seat_units ?? 1,
          member_daily_usage_cap_usd: member.daily_usage_cap_usd ?? null,
          member_created_at: member.created_at,
          member_updated_at: member.updated_at,
        });
      }
      rows.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      return rows;
    }

    if (sql.includes('SELECT M.*, U.EMAIL AS USER_EMAIL FROM ORGANIZATION_MEMBERS')) {
      const organizationId = String(params[0]);
      const rows = Array.from(this.tables.organizationMembers.values())
        .filter((row) => row.organization_id === organizationId)
        .map((row) => this.attachMemberUserEmail(row));
      rows.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
      return rows;
    }

    if (sql.startsWith('SELECT * FROM ORGANIZATION_INVITES WHERE ORGANIZATION_ID')) {
      const organizationId = String(params[0]);
      const rows = Array.from(this.tables.organizationInvites.values()).filter(
        (row) => row.organization_id === organizationId,
      );
      rows.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      return rows;
    }

    this.logger?.warn?.('[InMemoryDatabase] Unhandled all SQL:', originalSql);
    return [];
  }

  private attachMemberUserEmail(row: Record<string, any>): Record<string, any> {
    const user = this.tables.appUsers.get(String(row.user_id));
    return {
      ...row,
      user_email: user?.email ?? null,
    };
  }
}

export const createInMemoryDatabase = (): BetterSqliteDatabase =>
  (new InMemoryDatabase() as unknown as BetterSqliteDatabase);
