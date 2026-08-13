#!/bin/bash

echo "🚀 Starting BUMOTIK GMIM Deployment Script..."

# Ensure environment variables are set
export SUPABASE_DB_PASSWORD="Yersolid07_!"

# 1. Supabase Initialization and Link
echo "🔗 Linking to Supabase Project..."
npx supabase link --project-ref rmxockjudzqpffrftzdd --password "$SUPABASE_DB_PASSWORD"

# 2. Push Database Migrations (Optional, uncomment if you use supabase db push)
# echo "🗄️ Pushing Database Migrations..."
# npx supabase db push

# 3. Git Operations
echo "📦 Pushing code to GitHub..."
git add .
git commit -m "deploy: update UI to grade system & deployment setup"
git push -u origin master

echo "✅ Done! Vercel should now automatically build and deploy your application."
echo "Note: Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Environment Variables."
