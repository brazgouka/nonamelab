import uuid

from django.db import models


class TaskType(models.Model):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#3b82f6')

    def __str__(self):
        return self.name


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'

    class Recurrence(models.TextChoices):
        NONE = 'none', 'None'
        DAILY = 'daily', 'Daily'
        WEEKLY = 'weekly', 'Weekly'
        MONTHLY = 'monthly', 'Monthly'

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateField(db_index=True)
    time = models.TimeField(null=True, blank=True)
    priority = models.CharField(
        max_length=10, choices=Priority.choices, null=True, blank=True
    )
    completed = models.BooleanField(default=False)
    task_type = models.ForeignKey(
        TaskType, null=True, blank=True, on_delete=models.SET_NULL, related_name='tasks'
    )
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    series_id = models.UUIDField(null=True, blank=True, db_index=True)
    recurrence = models.CharField(
        max_length=10, choices=Recurrence.choices, default=Recurrence.NONE
    )
    recurrence_end_date = models.DateField(null=True, blank=True)
    recurrence_days = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'time', 'priority', 'title']

    def __str__(self):
        return f'{self.title} ({self.date})'


class PeriodNote(models.Model):
    year = models.IntegerField(db_index=True)
    month = models.IntegerField(null=True, blank=True, db_index=True)
    content = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['year', 'month'], name='unique_period_note')
        ]

    def __str__(self):
        return f'Note {self.year}-{self.month:02d}' if self.month else f'Note {self.year}'


class PeriodTodo(models.Model):
    year = models.IntegerField(db_index=True)
    month = models.IntegerField(null=True, blank=True, db_index=True)
    title = models.CharField(max_length=200)
    completed = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.title
