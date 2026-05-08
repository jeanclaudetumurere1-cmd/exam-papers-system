# Render Deployment

1. Push this repository to GitHub.
2. Create a new Render Web Service from the repository.
3. Set Root Directory to `backend`.
4. Set Build Command to `npm install`.
5. Set Start Command to `npm start`.
6. Add these Render environment variables:

```env
NODE_ENV=production
PORT=10000
MYSQL_HOST=your-aiven-mysql-host
MYSQL_PORT=your-aiven-mysql-port
MYSQL_USER=your-aiven-mysql-user
MYSQL_PASSWORD=your-aiven-mysql-password
MYSQL_DATABASE=your-aiven-mysql-database
MYSQL_SSL=true
MYSQL_SSL_REJECT_UNAUTHORIZED=false
CLIENT_ORIGIN=https://your-frontend-domain.example
```

For strict SSL certificate verification, download the Aiven CA certificate and set it as `MYSQL_SSL_CA_CERT` in Render. Use newline escapes (`\n`) if you paste it as one line, then set `MYSQL_SSL_REJECT_UNAUTHORIZED=true`.

7. Deploy the service.
8. Check `/health`, `/tables`, and `/exam_papers`.

Never commit `.env` files or real database passwords. Add the real Aiven credentials only in Render's Environment settings.
