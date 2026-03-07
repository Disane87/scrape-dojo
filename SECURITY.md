# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Scrape Dojo, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please use one of the following methods:

1. **GitHub Security Advisories** (preferred): [Report a vulnerability](https://github.com/Disane87/scrape-dojo/security/advisories/new)
2. **Email**: Contact the maintainer directly via GitHub profile

### What to include

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)

### What to expect

- **Acknowledgment** within 48 hours
- **Status update** within 7 days
- **Fix timeline** depends on severity:
  - Critical: Patch within 48 hours
  - High: Patch within 7 days
  - Medium/Low: Patch in next release

### Scope

The following are in scope:

- Authentication bypass (JWT, OIDC, API keys)
- Secret/credential exposure
- Remote code execution
- SQL injection
- Cross-site scripting (XSS) in the UI
- Server-side request forgery (SSRF)
- Privilege escalation

### Out of Scope

- Vulnerabilities in dependencies (please report upstream)
- Issues requiring physical access
- Social engineering attacks
- Denial of service (DoS) attacks

## Security Best Practices for Users

- Always set a strong `SCRAPE_DOJO_ENCRYPTION_KEY` and `SCRAPE_DOJO_AUTH_JWT_SECRET`
- Never expose the application to the public internet without authentication enabled
- Keep your Docker images up to date
- Use HTTPS when deploying in production
