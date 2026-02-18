from pathlib import Path
path = Path('backend/src/features/billing/lemonsqueezy.service.ts')
text = path.read_text()
needle = "  await upsertUserFromSubscription({\n    email,\n    subscriptionStatus: normalizedStatus || 'active',\n    subscriptionTier: plan?.metadata?.tier ?? (normalizedStatus === 'active' ? 'unlimited' : 'metered'),\n    lemonSubscriptionId,\n"
if needle not in text:
    raise SystemExit('upsert call not found in lemonsqueezy service')
replacement = "  await upsertUserFromSubscription({\n    email,\n    subscriptionStatus: normalizedStatus || 'active',\n    subscriptionTier: plan?.metadata?.tier ?? (normalizedStatus === 'active' ? 'unlimited' : 'metered'),\n    subscriptionPlanId: planId ?? null,\n    lemonSubscriptionId,\n"
text = text.replace(needle, replacement, 1)
path.write_text(text)
