from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0008_note'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='order',
            field=models.PositiveIntegerField(default=0, db_index=True),
        ),
        migrations.AlterModelOptions(
            name='task',
            options={'ordering': ['date', 'order', 'time', 'priority', 'title']},
        ),
    ]
