from django.http import JsonResponse


class RequireAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/') and not request.path.startswith('/api/auth/'):
            if not request.session.get('authed'):
                return JsonResponse({'error': 'Authentication required'}, status=401)
        return self.get_response(request)
