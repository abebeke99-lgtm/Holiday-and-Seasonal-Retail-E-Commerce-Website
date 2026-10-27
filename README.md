# SeasonMart

SeasonMart is a Nuxt 4/Vue 3 storefront with Nitro API routes and a MySQL 8 persistence layer using Prisma. The starter project contained only the Nuxt welcome page; the storefront and server features have been built on that starter without MongoDB.

## Local setup (Windows/XAMPP)

Use Node.js 24.15 or later in the Node 24 line (Nuxt's declared engine range), along with npm.

1. Start XAMPP Control Panel and click **Start** beside MySQL. Nuxt runs independently; Apache is not required.

   ```powershell
   Start-Process C:\xamppbe\xampp-control.exe
   Test-NetConnection 127.0.0.1 -Port 3306
   ```

2. Create the database only if it does not exist, using the XAMPP MySQL client. `-p` prompts locally; it does not put a password in shell history:

   ```sql
   CREATE DATABASE IF NOT EXISTS seasonmart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'seasonmart_user'@'127.0.0.1' IDENTIFIED BY 'choose-a-local-password';
   GRANT ALL PRIVILEGES ON seasonmart.* TO 'seasonmart_user'@'127.0.0.1';
   ```

   Run the SQL from phpMyAdmin, or:

   ```powershell
   & C:\xamppbe\mysql\bin\mysql.exe -u root -p -h 127.0.0.1 -P 3306 -e "CREATE DATABASE IF NOT EXISTS seasonmart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

   Use a strong local application-user password in your own SQL client; do not commit it. If the application user already exists, do not re-run `CREATE USER`; grant its access only if needed.

3. Create `.env` only if absent, then edit it locally to set `DATABASE_URL` and `NUXT_SESSION_PASSWORD`. The command does not overwrite an existing `.env`:

   ```powershell
   Set-Location C:\xamppbe\htdocs\Holiday-and-Seasonal-Retail-E-Commerce-Website
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   notepad .env
   ```

   Generate a session secret locally and put it in `.env`; this does not print the secret:

   ```powershell
   $bytes = [byte[]]::new(48)
   [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
   $sessionSecret = [Convert]::ToBase64String($bytes)
   Set-Clipboard $sessionSecret
   ```

   Paste the clipboard value into the local, ignored `.env` as `NUXT_SESSION_PASSWORD`. Set `DATABASE_URL` to `mysql://seasonmart_user:YOUR_PASSWORD@127.0.0.1:3306/seasonmart`; URL-encode special characters in the password.

4. Install packages and apply the version-controlled migration:

   ```powershell
   npm ci
   npm run db:generate
   npx prisma validate
   npx prisma migrate status
   npm run db:migrate
   ```

   `db:migrate` uses `prisma migrate deploy`; it does not drop/recreate the database. Review the migration status and back up any existing database before applying migrations. Do not use `db:migrate:dev` against production or a database containing data you cannot restore.

5. Optionally seed the built-in seasonal categories and create/promote an administrator. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the ignored `.env` (minimum 12 characters) before running:

   ```powershell
   npm run db:seed
   ```

   Seeded categories use idempotent upserts. Admin creation is skipped unless both variables are set. The password is hashed with bcrypt; no default credentials are provided.

6. Run tests and start Nuxt:

   ```powershell
   npm test
   npm run dev
   ```

   Open `http://localhost:3000`. `GET /api/health` checks MySQL and returns HTTP 503 when it is unavailable.

## Implemented features

- Relational MySQL schema and initial Prisma migration for accounts, roles, catalog, categories, collections, campaigns, carts, wishlists, orders, inventory, addresses, payments, and audit logs.
- Password-hashed customer registration, login/logout, database-checked role authorization, and encrypted HTTP-only SameSite session cookies.
- Searchable/paginated products, category and collection browsing, current campaign display, persistent customer cart/wishlist and order history.
- Administrator dashboard with live MySQL metrics, responsive navigation, paginated/searchable user management, supported Customer/Store Manager/Administrator roles, account activation controls, bcrypt-hashed account creation, and protection against removing the last active Administrator. The additive `20261027000000_admin_user_management` migration adds the Store Manager role and account status.
- Provider-neutral checkout: totals are calculated from database decimal prices; stock is atomically decremented within a transaction, movements are recorded, and repeated idempotency keys do not create duplicate orders. The app does not collect card details or claim to charge payment.
- Admin catalog/category/collection/campaign maintenance, inventory adjustments, orders, and audit log endpoints and dashboard.

## Configuration and limitations

- `.env.example` contains placeholders only. `.env`, database dumps, and private keys are ignored.
- New users are customers. Only an operator with database access or the opt-in seed flow can grant administrator role.
- User administration is Administrator-only. Store Manager accounts are represented in the role schema and dashboard, but granular Store Manager access to operational APIs is not yet implemented; those APIs remain Administrator-only.
- This repository began as a minimal Nuxt starter, so it had no existing products, business rules, database records, or MongoDB data to migrate. No sample products or mock runtime data are bundled.
- Address capture/shipping integration, payment-provider integration, refunds, order status changes, email delivery, and automated MongoDB export/import are not implemented. Checkout creates a pending-payment order only.
- Apply migrations and test against a dedicated local/test MySQL database. No migration or seed was run against a live database as part of this work.
