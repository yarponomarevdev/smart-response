# Lead Hero Architecture

## Database Structure

### Tables
- `users` - User profiles (linked to auth.users)
- `forms` - Lead capture forms
- `form_content` - Customizable content for forms (JSONB values)
- `leads` - Captured leads with results

### Row Level Security (RLS) Policies

#### Critical Policy for Anonymous Lead Creation:
**Problem:** Anonymous users creating leads were blocked by RLS because the foreign key constraint `leads_form_id_fkey` requires reading the `forms` table to validate the form exists.

**Solution:** Added `forms_public_read_active` policy to allow anonymous users to read active forms. This enables FK validation without compromising security.

\`\`\`sql
-- Required for anonymous lead creation
CREATE POLICY "forms_public_read_active" 
  ON public.forms 
  FOR SELECT 
  USING (is_active = true);

-- Allows anonymous lead insertion
CREATE POLICY "leads_anonymous_insert" 
  ON public.leads 
  FOR INSERT 
  WITH CHECK (true);
\`\`\`

### User Roles
- **superadmin** (hello@vasilkov.digital) - Manages main form on homepage, unlimited leads
- **admin** - Can create own forms with lead limits (up to 1000)

## Key Design Decisions

1. **Public form reading** - Active forms are publicly readable to enable FK validation
2. **Anonymous lead creation** - Anyone can submit leads without authentication
3. **Form isolation** - Admins can only manage their own forms
4. **Main form protection** - Superadmin's main form (f5fad560-eea2-443c-98e9-1a66447dae86) cannot be deleted
</parameter>
