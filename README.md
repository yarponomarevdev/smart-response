# Lead Hero - Lead Generation App

A minimalistic lead-generation web application built with Next.js 16, Supabase, and Tailwind CSS.

## Features

### User Flow
- **URL Submission**: Clean input for website URL entry with validation
- **Loading Animation**: Dynamic loading messages with smooth transitions
- **Score Reveal**: Circular progress indicator showing lead score (1-100)
- **Email Capture**: Collects user email for detailed insights
- **Success Screen**: Confirmation with social sharing options

### Admin Dashboard
- **Authentication**: Secure login with Supabase Auth
- **Leads Management**: View, filter, and delete leads
- **CSV Export**: Download all leads data
- **Content Editor**: Customize all user-facing text dynamically
- **Real-time Updates**: Changes reflect immediately

### Technical Features
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Email Integration**: API route ready for email service integration
- **Responsive Design**: Mobile-first, works on all devices
- **Dark Theme**: Modern dark UI with custom color scheme
- **Type Safe**: Full TypeScript implementation

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)

### Installation

1. Clone the repository and install dependencies:
\`\`\`bash
npm install
\`\`\`

2. The database is already configured with Supabase integration. Run the SQL script to create tables:
   - Go to the Scripts section in your v0 workspace
   - Execute `001_create_tables.sql`

3. Create an admin user in Supabase:
   - Go to your Supabase dashboard
   - Navigate to Authentication > Users
   - Click "Add user" and create an account
   - This will be your admin login

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Email Integration

The app includes a placeholder email API route at `/app/api/send-email/route.ts`. To enable email sending:

### Option 1: Resend (Recommended)
\`\`\`bash
npm install resend
\`\`\`

Add to your environment variables:
\`\`\`
RESEND_API_KEY=your_api_key
\`\`\`

Uncomment the Resend code in the API route.

### Option 2: SendGrid
\`\`\`bash
npm install @sendgrid/mail
\`\`\`

### Option 3: Other Services
The email route can be adapted for any email service (Mailgun, AWS SES, etc.)

## Project Structure

\`\`\`
├── app/
│   ├── api/send-email/          # Email sending endpoint
│   ├── admin/                   # Admin dashboard (protected)
│   ├── auth/login/              # Admin login page
│   └── page.tsx                 # Main user flow
├── components/
│   ├── lead-flow.tsx            # Main flow orchestration
│   ├── url-submission-step.tsx  # Step 1: URL input
│   ├── loading-step.tsx         # Step 2: Loading animation
│   ├── result-step.tsx          # Step 3: Score display
│   ├── email-capture-step.tsx   # Step 4: Email collection
│   ├── success-step.tsx         # Step 5: Confirmation
│   ├── admin-dashboard.tsx      # Admin UI
│   ├── leads-table.tsx          # Leads management
│   └── content-editor.tsx       # Content customization
├── lib/supabase/
│   ├── client.ts                # Browser Supabase client
│   ├── server.ts                # Server Supabase client
│   └── middleware.ts            # Auth middleware
└── scripts/
    └── 001_create_tables.sql    # Database schema
\`\`\`

## Database Schema

### Tables
- **leads**: Stores submitted URLs, emails, scores, and status
- **content**: Dynamic content for all user-facing text

### Security
- Row Level Security (RLS) enabled on all tables
- Public can submit leads (anonymous)
- Only authenticated users can access admin features

## Customization

### Colors
Edit `app/globals.css` to change the color scheme:
- Background: `--color-background`
- Primary accent: `--color-primary`
- Card background: `--color-card`

### Content
Login to `/auth/login` and use the Content tab to customize:
- Hero title and subtitle
- Loading messages
- Result screen text
- Email CTA copy
- Success messages
- Social share text

### Scoring Algorithm
Edit `components/loading-step.tsx` to customize the score generation logic (currently random 70-100 for demo).

## Deployment

### Deploy to Vercel
1. Push your code to GitHub
2. Import project in Vercel
3. Environment variables are automatically synced from Supabase
4. Deploy

### Environment Variables
All required environment variables are provided by the Supabase integration. Optional:
- `NEXT_PUBLIC_SITE_URL`: Your production domain
- `RESEND_API_KEY`: For email integration

## Support

For issues or questions, refer to the documentation:
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
