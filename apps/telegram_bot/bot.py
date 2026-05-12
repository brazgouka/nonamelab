"""Telegram bot handlers for the homelab planner."""
import logging
from datetime import date

from asgiref.sync import sync_to_async
from django.conf import settings
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, PrefixHandler

from apps.planner.models import PeriodNote, Task

logger = logging.getLogger(__name__)


def _allowed(update: Update) -> bool:
    allowed = getattr(settings, 'TELEGRAM_ALLOWED_USER_IDS', [])
    if not allowed:
        return True
    return update.effective_user.id in allowed


def _fmt_task(task: Task) -> str:
    icon = '✅' if task.completed else '◻️'
    time_str = f'`{task.time.strftime("%H:%M")}` ' if task.time else ''
    title = f'~{task.title}~' if task.completed else task.title
    return f'{icon} {time_str}{title} /d{task.id}'


@sync_to_async
def _get_today_tasks(today):
    return list(
        Task.objects.filter(date=today, deleted_at__isnull=True).order_by('time', 'priority', 'title')
    )


@sync_to_async
def _create_task(title, today):
    return Task.objects.create(title=title, date=today)


@sync_to_async
def _toggle_task(task_id):
    try:
        task = Task.objects.get(pk=task_id, deleted_at__isnull=True)
    except Task.DoesNotExist:
        return None
    task.completed = not task.completed
    task.save(update_fields=['completed'])
    return task


@sync_to_async
def _get_or_create_week_note(year, week):
    note, _ = PeriodNote.objects.get_or_create(
        year=year, month=None, week=week, defaults={'content': ''}
    )
    return note


@sync_to_async
def _append_week_note(year, week, text):
    note, _ = PeriodNote.objects.get_or_create(
        year=year, month=None, week=week, defaults={'content': ''}
    )
    note.content = (note.content.rstrip() + '\n' + text).lstrip()
    note.save(update_fields=['content', 'updated_at'])
    return note


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _allowed(update):
        return
    text = (
        '*Homelab Planner Bot*\n\n'
        '/today — today\'s task list\n'
        '/add <text> — add task for today\n'
        '/done <id> — toggle task complete/incomplete\n'
        '/week — this week\'s notes\n'
        '/note <text> — append text to this week\'s notes\n'
        '/help — this message'
    )
    await update.message.reply_text(text, parse_mode='Markdown')


async def cmd_today(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _allowed(update):
        return
    today = date.today()
    tasks = await _get_today_tasks(today)
    day_str = today.strftime('%A, %d %B %Y')
    if not tasks:
        await update.message.reply_text(f'📅 *{day_str}*\n\nNo tasks today.', parse_mode='Markdown')
        return
    pending = [t for t in tasks if not t.completed]
    done = [t for t in tasks if t.completed]
    lines = [f'📅 *{day_str}*']
    if pending:
        lines.append(f'\n*Pending — {len(pending)}*')
        lines += [_fmt_task(t) for t in pending]
    if done:
        lines.append(f'\n*Done — {len(done)}*')
        lines += [_fmt_task(t) for t in done]
    await update.message.reply_text('\n'.join(lines), parse_mode='Markdown')


async def cmd_add(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _allowed(update):
        return
    text = ' '.join(context.args).strip()
    if not text:
        await update.message.reply_text('Usage: /add <task title>')
        return
    task = await _create_task(text, date.today())
    await update.message.reply_text(f'Added: [{task.id}] {task.title}')


async def cmd_done(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _allowed(update):
        return
    # supports both /done 42 and /d42 (inline shortcut from task list)
    cmd = update.message.text.split()[0].lstrip('/')
    inline_id = cmd[1:] if cmd.startswith('d') and cmd[1:].isdigit() else None
    raw = inline_id or (context.args[0] if context.args else None)
    if not raw:
        await update.message.reply_text('Usage: /done <task_id>')
        return
    try:
        task_id = int(raw)
    except ValueError:
        await update.message.reply_text('Task ID must be a number.')
        return
    task = await _toggle_task(task_id)
    if task is None:
        await update.message.reply_text(f'Task {task_id} not found.')
        return
    status = '✅ completed' if task.completed else '⬜ uncompleted'
    await update.message.reply_text(f'Task [{task.id}] {task.title} marked as {status}.')


async def cmd_week(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _allowed(update):
        return
    today = date.today()
    year, week, _ = today.isocalendar()
    note = await _get_or_create_week_note(year, week)
    content = note.content.strip() or '_No notes yet._'
    await update.message.reply_text(
        f'*Week {week} / {year} notes*\n\n{content}', parse_mode='Markdown'
    )


async def cmd_note(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _allowed(update):
        return
    text = ' '.join(context.args).strip()
    if not text:
        await update.message.reply_text('Usage: /note <text to append>')
        return
    today = date.today()
    year, week, _ = today.isocalendar()
    note = await _append_week_note(year, week, text)
    await update.message.reply_text(f'Added to week {week} notes.')


def build_application() -> Application:
    token = settings.TELEGRAM_BOT_TOKEN
    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler('help', cmd_help))
    app.add_handler(CommandHandler('start', cmd_help))
    app.add_handler(CommandHandler('today', cmd_today))
    app.add_handler(CommandHandler('add', cmd_add))
    app.add_handler(CommandHandler('done', cmd_done))
    app.add_handler(PrefixHandler('/', 'd', cmd_done))
    app.add_handler(CommandHandler('week', cmd_week))
    app.add_handler(CommandHandler('note', cmd_note))
    return app
