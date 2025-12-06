# Reset Database and Apply All Migrations

This guide shows how to drop the database and apply all migrations from scratch.

⚠️ **WARNING**: This will **DELETE ALL DATA** in your database!

## Method 1: Using Prisma Migrate Reset (Recommended)

This command will:
1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run seed script (if configured)

```bash
cd backend
npx prisma migrate reset --force
```

The `--force` flag skips the confirmation prompt.

## Method 2: Manual Reset

If you want more control:

### Step 1: Drop the database
```bash
# Connect to PostgreSQL and drop the database
psql -U postgres -c "DROP DATABASE IF EXISTS delivery_network;"
```

### Step 2: Create a new database
```bash
psql -U postgres -c "CREATE DATABASE delivery_network;"
```

### Step 3: Apply all migrations
```bash
cd backend
npx prisma migrate deploy
```

### Step 4: Generate Prisma Client
```bash
npx prisma generate
```

## Method 3: Using Prisma Studio (Visual)

1. Open Prisma Studio:
   ```bash
   cd backend
   npx prisma studio
   ```

2. Manually delete all data (not recommended for large databases)

3. Then run migrations:
   ```bash
   npx prisma migrate deploy
   ```

## Verify the Reset

After resetting, verify the database:

```bash
# Check migration status
npx prisma migrate status

# Open Prisma Studio to view data
npx prisma studio

# Or connect directly
psql -U postgres -d delivery_network
```

## Important Notes

- **Backup First**: If you have important data, backup before resetting:
  ```bash
  pg_dump -U postgres delivery_network > backup.sql
  ```

- **Environment Variables**: Make sure `DATABASE_URL` is set correctly in your `.env` file

- **Seed Data**: If you have a seed script, it will run automatically after `prisma migrate reset`

- **Production**: Never run `migrate reset` on production! Use `migrate deploy` instead.

## Troubleshooting

### Error: Database does not exist
- The database will be created automatically by Prisma

### Error: Permission denied
- Make sure your database user has CREATE DATABASE permissions
- Or create the database manually first

### Error: Connection refused
- Check your `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify connection credentials

