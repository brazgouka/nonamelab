from django.contrib import admin

from .models import Task, TaskType


@admin.register(TaskType)
class TaskTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'color']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'date', 'time', 'priority', 'completed', 'task_type', 'deleted_at']
    list_filter = ['priority', 'completed', 'task_type', 'recurrence']
    search_fields = ['title', 'description']
    date_hierarchy = 'date'
    readonly_fields = ['series_id', 'deleted_at', 'created_at', 'updated_at']
