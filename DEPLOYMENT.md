# Free Deployment Guide

This app can be deployed as one Node web service because `backend/server.js` serves both the API and the files in `frontend/`.

## Recommended Free Stack

- Web app: Render free web service
- Database: Aiven free MySQL

Render's free web service can run the Express backend and serve the frontend. Aiven currently offers an always-free MySQL service with 1 GB storage, which matches this project better than free Postgres-only hosts.

## 1. Create The Free MySQL Database

1. Create an Aiven account.
2. Create a free MySQL service.
3. Copy the connection values:
   - host
   - port
   - user
   - password
   - database name

Import the schema from `backend/exam_system.sql` into the Aiven database. If you use the Aiven console, open the SQL editor and run the SQL file contents.

## 2. Deploy The Web App On Render

1. Push this repository to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. If creating manually, use:
   - Root directory: `backend`
   - Runtime: Node.js
   - Build command: `npm install`
   - Start command: `node server.js`
   - Plan: Free
4. Add these environment variables:
   - `NODE_ENV=production`
   - `MYSQL_HOST=<Aiven host>`
   - `MYSQL_PORT=<Aiven port>`
   - `MYSQL_USER=<Aiven user>`
   - `MYSQL_PASSWORD=<Aiven password>`
   - `MYSQL_DATABASE=<Aiven database>`
   - `JWT_SECRET=<long random secret>`
   - `ADMIN_USERNAME=<admin username>`
   - `ADMIN_PASSWORD=<strong admin password>`

Do not set `PORT` manually in Render. Render provides it automatically, and `backend/server.js` uses `process.env.PORT || 3000`.

The MySQL connection is configured for Aiven SSL with `ssl: { rejectUnauthorized: false }`.

After deploy, open:

- Public site: `https://<your-render-app>.onrender.com/public/index.html`
- Admin login: `https://<your-render-app>.onrender.com/admin/login.html`
- API status: `https://<your-render-app>.onrender.com/api/status`

## Important Free Hosting Limitation

Uploaded PDFs are stored in `backend/uploads`. On free Render web services, local disk storage is not a safe permanent file store. Existing PDFs committed with the repo can be served, but PDFs uploaded through the admin after deployment may disappear after redeploys or restarts.

For a production-like free setup, move uploaded files to a cloud storage provider and store the file URL in MySQL.
