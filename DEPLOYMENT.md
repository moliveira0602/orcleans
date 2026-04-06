# ORCA Lens - Production Deployment Guide

This guide explains how to deploy the ORCA Lens application to a subdomain or any production environment.

## Quick Start

### 1. Build for Production

```bash
cd orcleans
npm run build
```

The built files will be in the `dist/` directory.

### 2. Deploy to Subdomain

Copy the contents of `dist/` to your web server's document root for your subdomain.

**Example for Nginx:**
```bash
# Copy files to your server
scp -r dist/* user@your-server:/var/www/orca.yourdomain.com/html/

# Or deploy via FTP/SFTP
```

### 3. Configure Environment

Before deploying, configure your environment variables:

1. Copy `.env.production` to `.env`
2. Set your Google Places API key:
   ```
   VITE_GOOGLE_API_KEY=your_actual_api_key_here
   ```
3. Set the base path if deploying to a subdirectory:
   ```
   VITE_BASE_PATH=/orca/
   ```

## Server Configuration

### Nginx Configuration

Create a server block for your subdomain:

```nginx
server {
    listen 80;
    server_name orca.yourdomain.com;
    root /var/www/orca.yourdomain.com/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # SPA fallback - all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy for Google Places API (optional - if you want to hide your API key)
    location /proxy/google/ {
        proxy_pass https://maps.googleapis.com/;
        proxy_set_header Host maps.googleapis.com;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Add your API key automatically
        proxy_set_header X-Goog-Api-Key "YOUR_API_KEY_HERE";
    }

    # Proxy for Nominatim (OpenStreetMap)
    location /proxy/nominatim/ {
        proxy_pass https://nominatim.openstreetmap.org/;
        proxy_set_header Host nominatim.openstreetmap.org;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Required by Nominatim
        proxy_set_header Accept-Language "pt-PT,pt;q=0.9,en;q=0.8";
    }
}
```

### Apache Configuration

Create a `.htaccess` file in your deployment directory:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
</IfModule>
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_GOOGLE_API_KEY` | Google Places API key | `AIzaSy...` |
| `VITE_BASE_PATH` | Base path for the app | `/` or `/orca/` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_PRODUCTION` | Enable production mode | `true` |

## API Configuration

### Google Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Places API"
4. Create credentials (API Key)
5. Restrict the key to your domain for security
6. Add the key to your `.env` file

### Rate Limiting

The application includes built-in rate limiting to control API costs:
- Text Search: 10 calls/day
- Place Details: 50 calls/day
- Photos: 30 calls/day
- Total: 80 calls/day

These limits can be adjusted in `src/utils/scanService.ts`:

```typescript
const LIMITS = { textsearch: 10, details: 50, photo: 30, total: 80 };
```

### Caching

The application caches scan results for 7 days to minimize API calls:
- Cache stored in `localStorage`
- Automatic cleanup of expired entries
- Cache hit = 0 API calls

## Security Considerations

1. **API Key Security**: Never commit your API key to version control
2. **Domain Restrictions**: Restrict your Google API key to your domain
3. **HTTPS**: Always use HTTPS in production
4. **CORS**: Configure proper CORS headers if needed

## Troubleshooting

### Build Fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Calls Fail in Production

1. Check browser console for errors
2. Verify API key is set correctly
3. Check if API key has domain restrictions
4. Verify CORS headers are configured

### Map Not Loading

1. Check if Leaflet CSS is loaded
2. Verify map container has height
3. Check browser console for errors

## Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Type check
npm run type-check
```

## Support

For issues or questions:
1. Check browser console for errors
2. Review this documentation
3. Check the GitHub repository for updates