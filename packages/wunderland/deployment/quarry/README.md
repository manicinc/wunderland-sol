# Quarry PostgreSQL Database

PostgreSQL database for Quarry sync accounts, billing, and license management.

## Quick Start

```bash
# 1. Create environment file
cp .env.example .env

# 2. Generate secure password and update .env
openssl rand -base64 32

# 3. Start PostgreSQL
docker compose up -d

# 4. Verify
docker compose logs -f postgres
```

## Database Schema

- `sync_accounts` - User accounts (OAuth, Stripe, tiers)
- `sync_devices` - Registered devices per account
- `license_keys` - Lifetime licenses (bcrypt hashed)
- `checkout_sessions` - Temporary session data (24h TTL)

## Connection

### From frame.dev / quarry.space

Add to `.env.production`:

```
DATABASE_URL=postgresql://quarry:PASSWORD@YOUR_LINODE_IP:5432/quarry
```

### SSH Tunnel (for local development)

```bash
ssh -L 5432:localhost:5432 user@your-linode-ip
```

Then use `localhost:5432` as the host.

## Backups

### Via Linode UI

Use Linode's volume snapshot feature for automated backups.

### Manual Backup

```bash
docker exec quarry-postgres pg_dump -U quarry quarry > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
docker exec -i quarry-postgres psql -U quarry quarry < backup.sql
```

## Maintenance

### Cleanup Expired Sessions

```bash
docker exec quarry-postgres psql -U quarry quarry -c "SELECT cleanup_expired_sessions();"
```

### View Device Counts

```sql
SELECT
  a.email,
  a.tier,
  a.device_limit,
  COUNT(d.id) as device_count
FROM sync_accounts a
LEFT JOIN sync_devices d ON a.id = d.account_id
GROUP BY a.id;
```

### View Active Licenses

```sql
SELECT
  email,
  created_at,
  activated_at,
  CASE WHEN revoked_at IS NOT NULL THEN 'revoked'
       WHEN activated_at IS NOT NULL THEN 'active'
       ELSE 'pending' END as status
FROM license_keys
ORDER BY created_at DESC;
```

## Security Notes

- PostgreSQL only binds to `127.0.0.1` (localhost)
- Use SSH tunnel or VPN for remote access
- Never expose port 5432 to public internet
- Rotate passwords periodically
- Keep backups in a secure location
