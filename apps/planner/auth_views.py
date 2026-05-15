import hmac

from django.conf import settings
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login_view(request):
    password = request.data.get('password', '')
    app_password = getattr(settings, 'APP_PASSWORD', '')
    if not app_password:
        return Response({'error': 'APP_PASSWORD not configured on server'}, status=500)
    if hmac.compare_digest(password.encode('utf-8'), app_password.encode('utf-8')):
        request.session['authed'] = True
        request.session.cycle_key()
        return Response({'ok': True})
    return Response({'error': 'Invalid password'}, status=401)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def logout_view(request):
    request.session.flush()
    return Response({'ok': True})


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def me_view(request):
    if request.session.get('authed'):
        return Response({'authenticated': True})
    return Response({'authenticated': False}, status=401)
