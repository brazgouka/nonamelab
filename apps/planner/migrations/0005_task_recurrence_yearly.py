from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0004_periodnote_periodtodo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='recurrence',
            field=models.CharField(
                choices=[
                    ('none', 'None'),
                    ('daily', 'Daily'),
                    ('weekly', 'Weekly'),
                    ('monthly', 'Monthly'),
                    ('yearly', 'Yearly'),
                ],
                default='none',
                max_length=10,
            ),
        ),
    ]
