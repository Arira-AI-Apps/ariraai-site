# ariraai.com

Static site for Arira AI. Every folder is a page (`/about/index.html` serves `/about`).

- Source: the Claude Design canvas "Arira AI — Website Draft v0.1", exported to plain HTML.
- Host: `arira-website-1` (AWS Mumbai, Golden Hour Code account), fixed IP 65.1.155.222.
- Server: Caddy with automatic HTTPS (Let's Encrypt). Config in `deploy/Caddyfile`.
- Deploys: the server pulls `main` every 2 minutes (`deploy/deploy.sh`). Push to `main` and it goes live.
- DNS (GoDaddy): `@` A record → 65.1.155.222, `www` CNAME → ariraai.com.
- Agents: `/llms.txt`, `/for-agents/*`, `/agentflows.json`, `/kpis.json`, `/cases.json`, `/sitemap-agents.xml`.
- Visitor logs: `/var/log/caddy/ariraai-access.log` (JSON, includes user agent).

First-time server setup: `curl -fsSL https://raw.githubusercontent.com/Arira-AI-Apps/ariraai-site/main/deploy/setup.sh | sudo bash`
