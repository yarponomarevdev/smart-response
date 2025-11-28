# Environment Variables Setup Guide

This app requires the following environment variables to work correctly:

## Required Environment Variables

### 1. OpenAI API Key
\`\`\`
OPENAI_API_KEY=your_openai_api_key_here
\`\`\`
Get your API key from: https://platform.openai.com/api-keys

### 2. Resend API Key (for email sending)
\`\`\`
RESEND_API_KEY=your_resend_api_key_here
\`\`\`
Get your API key from: https://resend.com/api-keys

### 3. Site URL (optional, for email links)
\`\`\`
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
\`\`\`

## How to Add Environment Variables

### Option 1: Add via Vercel Dashboard (Recommended)
1. Go to your Vercel project dashboard
2. Click on "Settings"
3. Click on "Environment Variables"
4. Add each variable with its value
5. Redeploy your project

### Option 2: Add via Supabase Dashboard (Alternative)
If you want to store secrets in Supabase:
1. Go to your Supabase project
2. Click on "Project Settings" → "API"
3. Scroll down to "Project API keys"
4. You can use Supabase secrets management

### Option 3: Local Development
Create a `.env.local` file in the root of your project:
\`\`\`
OPENAI_API_KEY=your_key_here
RESEND_API_KEY=your_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
\`\`\`

## Verifying Setup

After adding the environment variables:
1. Restart your development server (if running locally)
2. Redeploy on Vercel (if deployed)
3. Test the OpenAI generation by submitting a URL
4. Test email sending by entering your email

## Troubleshooting

- **OpenAI Error**: Make sure OPENAI_API_KEY is set correctly
- **Email Error**: Make sure RESEND_API_KEY is set correctly
- **Variables not working**: Redeploy your app after adding env vars
