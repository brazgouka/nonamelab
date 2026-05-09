from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0006_periodnote_week'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='is_reminder',
            field=models.BooleanField(default=False),
        ),
    ]
