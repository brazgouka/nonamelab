from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0002_tasktype_task_deleted_at_task_recurrence_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='priority',
            field=models.CharField(
                blank=True,
                choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')],
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='task',
            name='recurrence_days',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
