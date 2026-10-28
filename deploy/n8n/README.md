# n8n self-hosted deployment for Radar Promo Brasil

This deployment keeps n8n separate from the Radar application. It uses Docker Compose, a durable named volume, Caddy-managed HTTPS, and the São Paulo timezone. It does not deploy the Radar app or configure external credentials/workflows.

## Important: no cloud can be promised free without checking the account

A VM's free tier can still require a billing account, eligible region/shape, quotas, and compliance with changing provider terms. Google Cloud may require billing activation even when intended usage is within its Always Free allowance. Do not continue if the console requires a payment method you cannot or do not want to provide. This directory prepares the software deployment; it cannot create a cloud VM or authorize billing on your behalf.

The previous Oracle Cloud route was rejected. If Google Cloud cannot be activated without an unacceptable billing step, stop before provisioning and choose another host rather than accidentally incurring charges. Free app hosts that sleep or erase local storage are not suitable for this always-on n8n setup.

## Requirements

- A Linux VM with Docker Engine and Docker Compose v2 installed.
- A stable public IP and a DNS name with an A record pointing to that IP.
- Inbound TCP 80 and 443 for Caddy/HTTPS; SSH 22 restricted to your IP.
- No inbound public access to TCP 5678. n8n is only exposed on the private Docker network.
- Sufficient VM memory/disk for n8n and workflow history. Keep the installation small and monitor usage.

## First deployment

1. Copy this directory to the VM.
2. Copy .env.example to .env and set N8N_HOST, ACME_EMAIL, and a unique random N8N_ENCRYPTION_KEY. Do not put real secrets in Git.
3. Pin N8N_IMAGE_TAG to a tested release before production. Review n8n release notes before upgrades.
4. Confirm DNS resolves to the VM and ports 80/443 are reachable.
5. Run:
   ```bash
   chmod 600 .env
   docker compose config
   docker compose pull
   docker compose up -d
   docker compose ps
   docker compose logs --tail=100 caddy n8n
   ```
6. Open https://$N8N_HOST, create the n8n owner account, enable MFA if available, and store recovery details securely.
7. Verify HTTPS and that http://PUBLIC_IP:5678 is not reachable from the internet.
8. Configure the Radar-to-n8n secret only after confirming the exact webhook contract in the deployed Radar. Never guess an endpoint or disable HMAC to make a test pass.

## Free-tier guardrails

- Configure a cloud budget alert even if the target spend is zero; alerts do not themselves stop billing.
- Verify the VM shape, region, disk type/size, public IPv4 charges, egress, and all attached resources against the provider's current free-tier terms.
- Do not add paid databases, load balancers, snapshots, static IPs, or managed services without reviewing their price.
- Keep a manual shutdown/cleanup checklist for any trial resources that are no longer needed.

## Persistence, backup, and upgrades

- n8n's home directory is stored in the named Docker volume radar_n8n_data.
- Back up n8n's data and securely preserve the matching .env/encryption key separately. Without the same encryption key, saved credentials cannot be decrypted.
- Before an upgrade, create a backup and record the current image tag. Upgrade deliberately; do not use unattended major-version upgrades.
- Do not publish backup archives or the production .env to GitHub or a public storage bucket.
- Monitor disk usage, container restarts, HTTPS renewal, failed executions, and last successful execution of each workflow.

## Connect to Radar

The Radar repository documents a signed n8n integration using HMAC, a timestamp window, per-account key derivation, and idempotent eventId handling. Implement/import a workflow only after the currently deployed API route, payload schema, signature canonicalization, and expected response have been confirmed. Keep one authoritative publisher: do not schedule an n8n publisher alongside an equivalent Radar publisher unless a single-writer/lock strategy is proven.

## Completion checklist

- [ ] VM and all resources verified within provider free-tier limits.
- [ ] DNS, HTTPS, owner account, and MFA secured.
- [ ] Port 5678 not exposed publicly.
- [ ] Durable volume confirmed after a controlled container restart.
- [ ] Backup and restoration test completed.
- [ ] Exact Radar webhook contract confirmed.
- [ ] Test workflow receives authenticated response and repeated event IDs are idempotent.
- [ ] Telegram delivery tested only in an authorized test destination.
- [ ] Alerts and recovery behavior tested.
