Write-Host "🚀 Starting Sistem Penjurian GMIM Deployment Script..." -ForegroundColor Cyan

# 1. Supabase Initialization and Link
Write-Host "🔗 Linking to Supabase Project..." -ForegroundColor Yellow
$env:SUPABASE_DB_PASSWORD="Yersolid07_!"
npx supabase link --project-ref rmxockjudzqpffrftzdd --password $env:SUPABASE_DB_PASSWORD

# 2. Git Operations
Write-Host "📦 Pushing code to GitHub..." -ForegroundColor Yellow
git add .
git commit -m "deploy: update UI to grade system & deployment setup"
git push -u origin master

Write-Host "✅ Done! Vercel should now automatically build and deploy your application." -ForegroundColor Green
Write-Host "Note: Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Environment Variables." -ForegroundColor Magenta
