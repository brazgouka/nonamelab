import uuid
from datetime import date, timedelta

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Task, TaskType, PeriodNote, PeriodTodo, Note
from .serializers import TaskSerializer, TaskTypeSerializer, PeriodNoteSerializer, PeriodTodoSerializer, NoteSerializer


def _next_date(current: date, recurrence: str) -> date:
    import calendar as cal
    if recurrence == Task.Recurrence.DAILY:
        return current + timedelta(days=1)
    if recurrence == Task.Recurrence.WEEKLY:
        return current + timedelta(weeks=1)
    if recurrence == Task.Recurrence.MONTHLY:
        month = current.month + 1
        year = current.year + (month - 1) // 12
        month = ((month - 1) % 12) + 1
        day = min(current.day, cal.monthrange(year, month)[1])
        return date(year, month, day)
    if recurrence == Task.Recurrence.YEARLY:
        year = current.year + 1
        day = min(current.day, cal.monthrange(year, current.month)[1])
        return date(year, current.month, day)
    return current


def _generate_recurrence_dates(
    start: date, recurrence: str, end_date: date | None, recurrence_days: list | None = None
) -> list[date]:
    if recurrence == Task.Recurrence.YEARLY:
        limit = end_date or date(start.year + 100, start.month, start.day)
        max_count = 101
    else:
        limit = end_date or date(start.year, 12, 31)
        max_count = 730

    dates = []

    if recurrence == Task.Recurrence.WEEKLY and recurrence_days:
        current = start
        while current <= limit and len(dates) < max_count:
            if current.weekday() in recurrence_days:
                dates.append(current)
            current += timedelta(days=1)
    else:
        current = start
        while current <= limit and len(dates) < max_count:
            dates.append(current)
            current = _next_date(current, recurrence)

    return dates


class TaskTypeViewSet(viewsets.ModelViewSet):
    queryset = TaskType.objects.all()
    serializer_class = TaskTypeSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.filter(deleted_at__isnull=True)
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        recurrence = data.get('recurrence', Task.Recurrence.NONE)

        if recurrence == Task.Recurrence.NONE:
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        series = uuid.uuid4()
        recurrence_days = data.get('recurrence_days') or None
        dates = _generate_recurrence_dates(
            data['date'], recurrence, data.get('recurrence_end_date'), recurrence_days
        )
        instances = Task.objects.bulk_create([
            Task(
                title=data['title'],
                description=data.get('description', ''),
                date=d,
                time=data.get('time'),
                priority=data.get('priority'),
                is_reminder=data.get('is_reminder', False),
                task_type=data.get('task_type'),
                recurrence=recurrence,
                recurrence_days=recurrence_days,
                recurrence_end_date=data.get('recurrence_end_date'),
                series_id=series,
            )
            for d in dates
        ])
        first = instances[0] if instances else None
        return Response(
            TaskSerializer(first).data if first else {},
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        scope = request.query_params.get('scope', 'instance')
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(task, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if scope == 'instance' or not task.series_id:
            serializer.save()
            return Response(serializer.data)

        bulk_fields = {
            k: v for k, v in data.items()
            if k not in ('date', 'completed', 'series_id', 'recurrence', 'recurrence_days', 'recurrence_end_date')
        }
        qs = Task.objects.filter(series_id=task.series_id, deleted_at__isnull=True)
        if scope == 'future':
            qs = qs.filter(date__gte=task.date)
        if bulk_fields:
            qs.update(**bulk_fields)
        task.refresh_from_db()
        return Response(TaskSerializer(task).data)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        scope = request.query_params.get('scope', 'instance')
        now = timezone.now()

        if scope == 'future' and task.series_id:
            Task.objects.filter(
                series_id=task.series_id,
                date__gte=task.date,
                deleted_at__isnull=True,
            ).update(deleted_at=now)
        elif scope == 'all' and task.series_id:
            Task.objects.filter(
                series_id=task.series_id,
                deleted_at__isnull=True,
            ).update(deleted_at=now)
        else:
            task.deleted_at = now
            task.save(update_fields=['deleted_at'])

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        task = self.get_object()
        task.completed = not task.completed
        task.save(update_fields=['completed'])
        return Response(TaskSerializer(task).data)

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        for order, pk in enumerate(request.data.get('ids', [])):
            Task.objects.filter(pk=pk).update(order=order)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PeriodNoteViewSet(viewsets.ModelViewSet):
    serializer_class = PeriodNoteSerializer

    def get_queryset(self):
        qs = PeriodNote.objects.all()
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year:
            qs = qs.filter(year=year)
        if month is not None:
            qs = qs.filter(month=month if month else None)
        return qs

    @action(detail=False, methods=['get', 'put'], url_path='for-period')
    def for_period(self, request):
        year = request.query_params.get('year')
        month = request.query_params.get('month') or None
        week = request.query_params.get('week') or None
        if not year:
            return Response({'detail': 'year required'}, status=status.HTTP_400_BAD_REQUEST)
        note, _ = PeriodNote.objects.get_or_create(
            year=int(year),
            month=int(month) if month else None,
            week=int(week) if week else None,
            defaults={'content': ''},
        )
        if request.method == 'PUT':
            note.content = request.data.get('content', '')
            note.save(update_fields=['content', 'updated_at'])
        return Response(PeriodNoteSerializer(note).data)


class PeriodTodoViewSet(viewsets.ModelViewSet):
    serializer_class = PeriodTodoSerializer

    def get_queryset(self):
        qs = PeriodTodo.objects.all()
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year:
            qs = qs.filter(year=year)
        if month is not None:
            qs = qs.filter(month=int(month) if month else None)
        return qs

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        todo = self.get_object()
        todo.completed = not todo.completed
        todo.save(update_fields=['completed'])
        return Response(PeriodTodoSerializer(todo).data)

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        for order, pk in enumerate(request.data.get('ids', [])):
            PeriodTodo.objects.filter(pk=pk).update(order=order)
        return Response(status=status.HTTP_204_NO_CONTENT)


class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
