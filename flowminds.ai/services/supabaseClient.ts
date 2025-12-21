import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihmcugmbmixijvxzjhrt.supabase.co';
const supabaseAnonKey = 'sb_publishable_n5LXjYUnHtvW_AsZvN2J1w_A_gMdzSZ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
