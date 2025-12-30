# Authentication System

Scrape Dojo uses a modern, state-of-the-art authentication system with JWT tokens and optional OIDC/SSO support.

## Features

- 🔐 **JWT-based Authentication** - Secure access and refresh tokens
- 🌐 **OIDC/SSO Support** - Integrate with Keycloak, Auth0, Google, Azure AD, etc.
- 👤 **User Management** - Role-based access control (User/Admin)
- 🔑 **API Key Support** - For headless/service access
- 🛡️ **PKCE Flow** - Secure OAuth2 code exchange
- 📱 **MFA/TOTP** - Two-factor authentication with device tracking
- 🖥️ **Trusted Devices** - MFA only required for unknown devices

## Quick Start

### 1. Initial Setup

On first run, the system requires an admin user to be created:

```bash
# Check if setup is required
curl http://localhost:3000/auth/setup-required

# Create initial admin
curl -X POST http://localhost:3000/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword123",
    "displayName": "Administrator"
  }'
```

### 2. Login

```bash
# Login with email/password
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword123"
  }'

# Response:
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

### 3. Using the Token

```bash
# Access protected endpoints
curl http://localhost:3000/scrapes \
  -H "Authorization: Bearer eyJhbG..."
```

### 4. Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbG..."
  }'
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/register` | Register new user |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/setup-required` | Check if initial setup needed |
| POST | `/auth/setup` | Create initial admin |
| GET | `/auth/oidc/config` | Get OIDC provider info |
| GET | `/auth/oidc/login` | Initiate OIDC login |
| GET | `/auth/oidc/callback` | OIDC callback (internal) |

### Protected Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/logout` | Logout (invalidate refresh token) |
| POST | `/auth/change-password` | Change password |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/users/:id` | Get user by ID |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Deactivate user |

## Configuration

### Environment Variables

```env
# Enable/disable authentication
SCRAPE_DOJO_AUTH_ENABLED=true

# JWT Configuration
SCRAPE_DOJO_AUTH_JWT_SECRET=your-secret-key-min-32-chars
SCRAPE_DOJO_AUTH_REFRESH_TOKEN_SECRET=your-refresh-secret-min-32-chars
SCRAPE_DOJO_AUTH_ACCESS_TOKEN_EXPIRY=15m
SCRAPE_DOJO_AUTH_REFRESH_TOKEN_EXPIRY=7d

# Optional API Key
SCRAPE_DOJO_AUTH_API_KEY=your-api-key

# OIDC Configuration
SCRAPE_DOJO_AUTH_OIDC_ENABLED=false
SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL=https://your-provider.com
SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID=your-client-id
SCRAPE_DOJO_AUTH_OIDC_CLIENT_SECRET=your-client-secret
SCRAPE_DOJO_AUTH_OIDC_REDIRECT_URI=http://localhost:3000/auth/oidc/callback
SCRAPE_DOJO_AUTH_OIDC_SCOPES=openid profile email
SCRAPE_DOJO_AUTH_OIDC_PROVIDER_NAME=SSO Login
```

### Generating Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## OIDC Integration

### Keycloak

1. Create a new client in Keycloak
2. Set Access Type to "confidential"
3. Add redirect URI: `http://localhost:3000/auth/oidc/callback`
4. Copy Client ID and Secret

```env
SCRAPE_DOJO_AUTH_OIDC_ENABLED=true
SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL=https://keycloak.example.com/realms/your-realm
SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID=scrape-dojo
SCRAPE_DOJO_AUTH_OIDC_CLIENT_SECRET=your-keycloak-secret
SCRAPE_DOJO_AUTH_OIDC_PROVIDER_NAME=Keycloak
```

### Auth0

1. Create a new application in Auth0
2. Set Application Type to "Regular Web Application"
3. Add callback URL: `http://localhost:3000/auth/oidc/callback`

```env
SCRAPE_DOJO_AUTH_OIDC_ENABLED=true
SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL=https://your-tenant.auth0.com
SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID=your-auth0-client-id
SCRAPE_DOJO_AUTH_OIDC_CLIENT_SECRET=your-auth0-secret
SCRAPE_DOJO_AUTH_OIDC_PROVIDER_NAME=Auth0
```

### Google

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Add authorized redirect URI: `http://localhost:3000/auth/oidc/callback`

```env
SCRAPE_DOJO_AUTH_OIDC_ENABLED=true
SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL=https://accounts.google.com
SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
SCRAPE_DOJO_AUTH_OIDC_CLIENT_SECRET=your-google-secret
SCRAPE_DOJO_AUTH_OIDC_PROVIDER_NAME=Google
```

### Azure AD

1. Register an application in Azure AD
2. Add redirect URI: `http://localhost:3000/auth/oidc/callback`
3. Create a client secret

```env
AUTH_OIDC_ENABLED=true
AUTH_OIDC_ISSUER_URL=https://login.microsoftonline.com/{tenant-id}/v2.0
AUTH_OIDC_CLIENT_ID=your-azure-client-id
AUTH_OIDC_CLIENT_SECRET=your-azure-secret
AUTH_OIDC_PROVIDER_NAME=Azure AD
```

## API Key Authentication

For service-to-service or headless access:

```bash
# Set API key in environment
AUTH_API_KEY=my-secure-api-key

# Use in requests
curl http://localhost:3000/scrapes \
  -H "X-API-Key: my-secure-api-key"
```

## Disabling Authentication

For development or trusted environments:

```env
AUTH_ENABLED=false
```

⚠️ **Warning**: Never disable authentication in production!

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Standard user | Access own scrapes and data |
| `admin` | Administrator | Full access, user management |

## Security Best Practices

1. **Use strong secrets** - Generate random 32+ character secrets
2. **Use HTTPS** - Always use TLS in production
3. **Rotate secrets** - Regularly rotate JWT secrets
4. **Short token expiry** - Keep access tokens short-lived (15m default)
5. **Secure cookies** - If using cookies, set `HttpOnly`, `Secure`, `SameSite`
6. **Enable MFA** - Require two-factor authentication for sensitive environments
7. **Monitor devices** - Review and remove trusted devices regularly

## Trusted Device Management

When MFA is enabled, the system tracks trusted devices to provide a better user experience:

### How It Works

1. **First Login** - User logs in and completes MFA verification
2. **Device Fingerprinting** - System generates a unique device fingerprint based on:
   - User-Agent (browser/OS information)
   - IP address
   - Screen resolution
   - Timezone
   - Browser capabilities
3. **Device Trusted** - After successful MFA, the device is marked as trusted
4. **Subsequent Logins** - On trusted devices, MFA is skipped automatically
5. **New Device** - If fingerprint doesn't match, MFA is required again

### Device Fingerprint Components

The device fingerprint is generated from:
- User-Agent string
- IP address (from `X-Forwarded-For` header or socket)
- Client-side browser properties (screen resolution, timezone, etc.)

### Managing Trusted Devices

Users can view and remove trusted devices through their profile settings:

```bash
# List trusted devices (requires authentication)
curl http://localhost:3000/users/me/devices \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Remove a trusted device
curl -X DELETE http://localhost:3000/users/me/devices/{deviceId} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Security Considerations

- Devices are identified by a hash of their fingerprint for privacy
- IP address changes don't invalidate trust (only fingerprint hash matters)
- Clearing browser data or changing browsers will require MFA again
- Admins can clear all trusted devices for a user if compromise is suspected

## Frontend Integration

### Login Flow

```typescript
// 1. Login
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { accessToken, refreshToken, expiresIn } = await response.json();

// 2. Store tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// 3. Use token in requests
fetch('/scrapes', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### OIDC Flow

```typescript
// 1. Redirect to OIDC login
window.location.href = '/auth/oidc/login?redirect=/dashboard';

// 2. Handle callback (tokens in URL params)
const params = new URLSearchParams(window.location.search);
const accessToken = params.get('access_token');
const refreshToken = params.get('refresh_token');
```

### Token Refresh

```typescript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  if (response.ok) {
    const tokens = await response.json();
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    return tokens.accessToken;
  }
  
  // Refresh failed - redirect to login
  window.location.href = '/auth/login';
}
```
