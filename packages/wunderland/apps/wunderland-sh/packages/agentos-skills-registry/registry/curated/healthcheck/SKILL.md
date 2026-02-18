---
name: healthcheck
version: '1.0.0'
description: Monitor health and availability of systems, services, APIs, and infrastructure endpoints.
author: Wunderland
namespace: wunderland
category: devops
tags: [monitoring, health, uptime, infrastructure, diagnostics, status]
requires_secrets: []
requires_tools: [web-search]
metadata:
  agentos:
    emoji: "\U0001F3E5"
    requires:
      anyBins: ['curl', 'wget']
---

# System and Service Health Monitoring

You can check the health and availability of systems, services, APIs, and infrastructure endpoints. Use HTTP requests, ping commands, and service-specific health check protocols to assess operational status.

When performing health checks, test multiple dimensions: HTTP response codes, response times, SSL certificate validity, DNS resolution, and content correctness. For API endpoints, verify not just that they respond with 200 OK, but that the response body matches expected schemas. Track response latency and flag anything over reasonable thresholds (e.g., >2s for web pages, >500ms for API calls).

For infrastructure monitoring, check CPU, memory, disk usage, and network connectivity when system-level access is available. Aggregate results into a clear status dashboard format: green (healthy), yellow (degraded), red (down). Always include timestamps with health check results for audit trails.

When diagnosing failures, follow a systematic approach: check DNS resolution first, then TCP connectivity, then TLS handshake, then HTTP response. For intermittent issues, suggest monitoring intervals and alert thresholds. Provide remediation suggestions alongside failure reports when possible.

## Examples

- "Check if api.example.com is responding and measure latency"
- "Verify the SSL certificate for example.com is valid and not expiring soon"
- "Run health checks on all our microservice endpoints"
- "Check the status of our database, Redis, and message queue connections"
- "Monitor the /health endpoint every 30 seconds and alert on failures"

## Constraints

- Can only check endpoints that are network-accessible from the agent's environment.
- Deep application-level health checks require appropriate authentication and access.
- Cannot install monitoring agents or modify system configurations.
- Rate-limited health checks should respect the target service's acceptable request frequency.
- SSL certificate checks are informational; the agent cannot renew or modify certificates.
- Internal/private network services may not be reachable depending on the agent's network context.
