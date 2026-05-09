from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0005_task_recurrence_yearly'),
    ]

    operations = [
        migrations.AddField(
            model_name='periodnote',
            name='week',
            field=models.IntegerField(blank=True, db_index=True, null=True),
        ),
        migrations.RemoveConstraint(
            model_name='periodnote',
            name='unique_period_note',
        ),
        migrations.AddConstraint(
            model_name='periodnote',
            constraint=models.UniqueConstraint(fields=['year', 'month', 'week'], name='unique_period_note'),
        ),
    ]
