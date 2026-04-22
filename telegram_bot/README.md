# Minutka Telegram Bot

Universal Telegram bot for multiple restaurants.  
It maps each group chat to one `restaurant_id` and sends a Web App button:

`https://www.minut-ka.uz/home/restaurant/{restaurant_id}`

## Commands

- `/start <code>` (private chat) - link Telegram account to restaurant owner
- `/setup` (group, admin only) - choose one of your own restaurants for this group
- `/menu` (group) - send menu Web App button for linked restaurant

## Required environment variables

Create `.env` from `.env.example`:

```env
BOT_TOKEN=...
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

## Install and run

```bash
cd telegram_bot
npm install
npm start
```

## Database

Apply migrations:

`supabase/028_telegram_groups.sql`
`supabase/029_telegram_owner_linking.sql`

They create these tables:

- `groups.id` (uuid)
- `groups.chat_id` (bigint, unique)
- `groups.restaurant_id` (uuid -> restaurants.id)
- `groups.linked_by_owner_id` (uuid -> auth.users.id)
- `telegram_users.telegram_user_id` (bigint unique) -> owner mapping
- `telegram_link_codes.code` (one-time owner linking codes)

## BotFather setup (important)

1. Create bot and get `BOT_TOKEN`.
2. Enable group support:
   - BotFather -> `/setjoingroups` -> `Enable`
3. Disable privacy mode (so commands in groups are visible to bot):
   - BotFather -> `/setprivacy` -> `Disable`

## Secure linking flow

1. In `web_admin` restaurant panel open **Telegram ulash** page and generate a one-time code.
2. Send `/start <code>` to the bot in private chat.
3. Add bot to group and run `/setup` as group admin.
4. Bot shows only restaurants owned by that linked owner and saves selection for the group.

## Why admin rights are needed

Bot can send menu without admin role, but to pin the menu message it must be group admin with pin permission.

If pinning fails, bot gracefully replies:

`Please give admin rights to pin messages`
