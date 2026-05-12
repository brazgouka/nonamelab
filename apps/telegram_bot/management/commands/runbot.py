import asyncio

from django.core.management.base import BaseCommand

from apps.telegram_bot.bot import build_application


class Command(BaseCommand):
    help = 'Start the Telegram bot in polling mode'

    def handle(self, *args, **options):
        self.stdout.write('Starting Telegram bot...')
        asyncio.set_event_loop(asyncio.new_event_loop())
        app = build_application()
        app.run_polling(drop_pending_updates=True)
