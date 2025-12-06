-- Переименование global_system_prompt → global_text_prompt
-- для единообразия с global_image_prompt

UPDATE system_settings 
SET key = 'global_text_prompt' 
WHERE key = 'global_system_prompt';

