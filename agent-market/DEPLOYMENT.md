# Vercel Deployment Guide

This guide will help you deploy the Agent Marketplace to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Database**: You'll need a PostgreSQL database (recommended: [Supabase](https://supabase.com) or [PlanetScale](https://planetscale.com))
3. **Stripe Account**: For payment processing (optional for demo)

## Step 1: Prepare Your Database

### Option A: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings > Database
3. Copy the connection string (it looks like: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`)
4. This will be your `DATABASE_URL`

### Option B: PlanetScale
1. Create a new database at [planetscale.com](https://planetscale.com)
2. Get the connection string from the database dashboard
3. This will be your `DATABASE_URL`

## Step 2: Deploy to Vercel

### Method 1: Deploy from GitHub (Recommended)
1. Push your code to a GitHub repository
2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect it's a Next.js project

### Method 2: Deploy with Vercel CLI
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts

## Step 3: Configure Environment Variables

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

```
DATABASE_URL=postgresql://username:password@host:port/database
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-random-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
N8N_API_KEY=your-n8n-api-key (optional)
N8N_BASE_URL=https://your-n8n-instance.com (optional)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Step 4: Set Up Database Schema

After deployment, you need to set up your database:

1. **Option A: Use Vercel CLI**
   ```bash
   vercel env pull .env.local
   npx prisma db push
   npm run db:seed
   ```

2. **Option B: Use Vercel Functions**
   - Create a temporary API route to run the setup
   - Visit the route once to initialize the database
   - Remove the route after setup

## Step 5: Verify Deployment

1. Visit your deployed app URL
2. Check that the health endpoint works: `https://your-app.vercel.app/api/health`
3. Verify agents are loaded (you may need to run the seed script)

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify your `DATABASE_URL` is correct
   - Check that your database allows connections from Vercel's IP ranges
   - Ensure SSL is enabled if required

2. **Build Failures**
   - Check that all environment variables are set
   - Verify Prisma schema is valid
   - Check the build logs in Vercel dashboard

3. **API Route Errors**
   - Check function timeout settings in `vercel.json`
   - Verify database connection in API routes
   - Check server logs in Vercel dashboard

### Environment-Specific Notes

- **Development**: Uses `.env.local` file
- **Production**: Uses Vercel environment variables
- **Preview**: Uses Vercel environment variables (can be different from production)

## Post-Deployment

1. **Set up monitoring**: Consider adding error tracking (Sentry, etc.)
2. **Configure custom domain**: Add your domain in Vercel settings
3. **Set up CI/CD**: Vercel automatically deploys on git push
4. **Database backups**: Set up regular backups of your production database

## Security Checklist

- [ ] All secrets are in environment variables, not in code
- [ ] Database connection uses SSL
- [ ] API routes have proper error handling
- [ ] No sensitive data in client-side code
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented (if needed)

## Performance Optimization

- [ ] Images are optimized (Next.js Image component)
- [ ] API routes are optimized for cold starts
- [ ] Database queries are efficient
- [ ] Static assets are cached properly

## Support

If you encounter issues:
1. Check Vercel's deployment logs
2. Review the troubleshooting section above
3. Check the project's GitHub issues
4. Contact support if needed
