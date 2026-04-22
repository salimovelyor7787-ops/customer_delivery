# Minutka Telegram Bot

Universal Telegram bot for multiple restaurants.  
It maps each group chat to one `restaurant_id` and sends a Web App button:

`https://www.minut-ka.uz/home/restaurant/{restaurant_id}`

## Commands

- `/setup <restaurant_uuid>` - link current group to restaurant
- `/menu` - send menu button for current group

## Required environment variables

Create `.env` from `.env.example`:

```env
BOT_TOKEN=...
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=...
```

## Install and run

```bash
cd telegram_bot
npm install
npm start
```

## Database

Apply migration:

`supabase/028_telegram_groups.sql`

It creates table:

- `groups.id` (uuid)
- `groups.chat_id` (bigint, unique)
- `groups.restaurant_id` (uuid -> restaurants.id)

## BotFather setup (important)

1. Create bot and get `BOT_TOKEN`.
2. Enable group support:
   - BotFather -> `/setjoingroups` -> `Enable`
3. Disable privacy mode (so commands in groups are visible to bot):
   - BotFather -> `/setprivacy` -> `Disable`

## Why admin rights are needed

Bot can send menu without admin role, but to pin the menu message it must be group admin with pin permission.

If pinning fails, bot gracefully replies:

`Please give admin rights to pin messages`
