from django.contrib import admin
from django.urls import path, include
from django.views.decorators.csrf import ensure_csrf_cookie
from django.shortcuts import render
from apps.planner.auth_views import login_view, logout_view, me_view


@ensure_csrf_cookie
def spa_view(request, path=''):
    return render(request, 'index.html')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', login_view),
    path('api/auth/logout/', logout_view),
    path('api/auth/me/', me_view),
    path('api/', include('apps.planner.api_urls')),
    path('', spa_view, name='spa'),
    path('<path:path>', spa_view, name='spa-catchall'),
]
