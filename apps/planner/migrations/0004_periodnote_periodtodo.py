from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0003_task_priority_nullable_recurrence_days'),
    ]

    operations = [
        migrations.CreateModel(
            name='PeriodNote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.IntegerField(db_index=True)),
                ('month', models.IntegerField(blank=True, db_index=True, null=True)),
                ('content', models.TextField(blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'constraints': [
                models.UniqueConstraint(fields=['year', 'month'], name='unique_period_note'),
            ]},
        ),
        migrations.CreateModel(
            name='PeriodTodo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.IntegerField(db_index=True)),
                ('month', models.IntegerField(blank=True, db_index=True, null=True)),
                ('title', models.CharField(max_length=200)),
                ('completed', models.BooleanField(default=False)),
                ('order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['order', 'created_at']},
        ),
    ]
