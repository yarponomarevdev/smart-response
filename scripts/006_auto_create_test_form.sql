-- Function to auto-create test form for new admins
create or replace function public.handle_new_admin_form()
returns trigger as $$
declare
  new_form_id uuid;
begin
  -- Only create form for regular admins, not superadmin
  if new.role = 'admin' then
    -- Create form
    insert into public.forms (owner_id, name, is_active, lead_limit, lead_count)
    values (new.id, 'My Lead Generation Form', true, 20, 0)
    returning id into new_form_id;
    
    -- Insert default test content
    insert into public.form_content (form_id, key, value) values
      (new_form_id, 'url_submission_title', '{"text": "Discover Your Lead Score"}'),
      (new_form_id, 'url_submission_subtitle', '{"text": "Enter your website URL to get a personalized lead score"}'),
      (new_form_id, 'url_submission_button', '{"text": "Get Recommendations"}'),
      (new_form_id, 'url_submission_note', '{"text": "No credit card required • Takes less than 30 seconds"}'),
      (new_form_id, 'loading_messages', '{"messages": ["Analyzing your website...", "Checking best practices...", "Calculating lead score...", "Generating recommendations..."]}'),
      (new_form_id, 'result_title', '{"text": "Your Results Are Ready!"}'),
      (new_form_id, 'result_subtitle', '{"text": "We have generated personalized recommendations for your business"}'),
      (new_form_id, 'email_title', '{"text": "Get Your Full Report"}'),
      (new_form_id, 'email_subtitle', '{"text": "Enter your email to receive the complete analysis"}'),
      (new_form_id, 'email_placeholder', '{"text": "your@email.com"}'),
      (new_form_id, 'email_button', '{"text": "Send Report"}'),
      (new_form_id, 'success_title', '{"text": "Check Your Email!"}'),
      (new_form_id, 'success_subtitle', '{"text": "We have sent your personalized recommendations to your email"}'),
      (new_form_id, 'success_share_text', '{"text": "Share this tool with your friends"}'),
      (new_form_id, 'ai_system_prompt', '{"text": "You are a professional business consultant analyzing websites. Provide clear, actionable recommendations based on the URL provided. Focus on lead generation opportunities, user experience improvements, and conversion optimization. Keep your response concise and professional without any markdown formatting. Use plain text only."}'),
      (new_form_id, 'ai_result_format', '{"format": "text"}');
  elsif new.role = 'superadmin' then
    -- Create main form for superadmin (no form_id means it is the main form)
    insert into public.forms (owner_id, name, is_active, lead_limit, lead_count)
    values (new.id, 'Main Lead Hero Form', true, 999999, 0)
    returning id into new_form_id;
    
    -- Insert default content for main form
    insert into public.form_content (form_id, key, value) values
      (new_form_id, 'url_submission_title', '{"text": "Discover Your Lead Score"}'),
      (new_form_id, 'url_submission_subtitle', '{"text": "Enter your website URL to get a personalized lead score"}'),
      (new_form_id, 'url_submission_button', '{"text": "Get Recommendations"}'),
      (new_form_id, 'url_submission_note', '{"text": "No credit card required • Takes less than 30 seconds"}'),
      (new_form_id, 'loading_messages', '{"messages": ["Analyzing your website...", "Checking best practices...", "Calculating lead score...", "Generating recommendations..."]}'),
      (new_form_id, 'result_title', '{"text": "Your Results Are Ready!"}'),
      (new_form_id, 'result_subtitle', '{"text": "We have generated personalized recommendations for your business"}'),
      (new_form_id, 'email_title', '{"text": "Get Your Full Report"}'),
      (new_form_id, 'email_subtitle', '{"text": "Enter your email to receive the complete analysis"}'),
      (new_form_id, 'email_placeholder', '{"text": "your@email.com"}'),
      (new_form_id, 'email_button', '{"text": "Send Report"}'),
      (new_form_id, 'success_title', '{"text": "Check Your Email!"}'),
      (new_form_id, 'success_subtitle', '{"text": "We have sent your personalized recommendations to your email"}'),
      (new_form_id, 'success_share_text', '{"text": "Share this tool with your friends"}'),
      (new_form_id, 'ai_system_prompt', '{"text": "You are a professional business consultant analyzing websites. Provide clear, actionable recommendations based on the URL provided. Focus on lead generation opportunities, user experience improvements, and conversion optimization. Keep your response concise and professional without any markdown formatting. Use plain text only."}'),
      (new_form_id, 'ai_result_format', '{"format": "text"}');
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create test form for new users
drop trigger if exists on_user_created_form on public.users;
create trigger on_user_created_form
  after insert on public.users
  for each row execute procedure public.handle_new_admin_form();
