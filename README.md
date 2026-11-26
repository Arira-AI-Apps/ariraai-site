# ariraai.com

Static site for Arira AI. Every folder is a page (`/about/index.html` serves `/about`).

- Source: the Claude Design canvas "Arira AI — Website Draft v0.1", exported to plain HTML. Edit the canvas, re-export, push.
- Host: `arira-website-1` (i-03fe707e379ec1a59), Golden Hour Code AWS account, Mumbai, fixed IP 65.1.155.222.
- Server: Caddy with automatic HTTPS. Config `/etc/caddy/Caddyfile`, site root `/srv/ariraai-site`. Admin via AWS Session Manager.
- Deploys: the server pulls `main` every 60 seconds (systemd timer `ariraai-deploy.timer`). Push to `main` and it is live in about a minute.
- DNS (GoDaddy): `@` A record → 65.1.155.222, `www` → redirects to ariraai.com.
- Agents: `/llms.txt`, `/for-agents`, `/for-agents/kpis`, `/for-agents/agentflows`, `/agentflows.json`, `/kpis.json`, `/cases.json`, `/sitemap-agents.xml`.
- Visitor logs: `/var/log/caddy/access.log` (JSON, includes user agent).
