from rest_framework import serializers
from .models import Task, TaskType, PeriodNote, PeriodTodo


class TaskTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskType
        fields = ['id', 'name', 'color']


class TaskSerializer(serializers.ModelSerializer):
    task_type_detail = TaskTypeSerializer(source='task_type', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'date', 'time',
            'priority', 'completed', 'task_type', 'task_type_detail',
            'recurrence', 'recurrence_days', 'recurrence_end_date', 'series_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['series_id', 'created_at', 'updated_at']


class PeriodNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodNote
        fields = ['id', 'year', 'month', 'content', 'updated_at']
        read_only_fields = ['updated_at']


class PeriodTodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodTodo
        fields = ['id', 'year', 'month', 'title', 'completed', 'order', 'created_at']
        read_only_fields = ['created_at']
