import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

export const config = {
  botToken: required("BOT_TOKEN"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  appBaseUrl: "https://www.minut-ka.uz",
};
