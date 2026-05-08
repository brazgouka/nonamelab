from rest_framework.routers import DefaultRouter
from .api_views import TaskViewSet, TaskTypeViewSet, PeriodNoteViewSet, PeriodTodoViewSet

router = DefaultRouter()
router.register('tasks', TaskViewSet, basename='task')
router.register('task-types', TaskTypeViewSet, basename='tasktype')
router.register('period-notes', PeriodNoteViewSet, basename='periodnote')
router.register('period-todos', PeriodTodoViewSet, basename='periodtodo')

urlpatterns = router.urls
