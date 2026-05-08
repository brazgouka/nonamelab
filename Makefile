.PHONY: run migrate makemigrations shell superuser build up down logs frontend-install frontend-dev frontend-build

PYTHON := $(shell command -v .venv/bin/python3 2>/dev/null || echo python3)
MANAGE := DJANGO_SETTINGS_MODULE=config.settings.local $(PYTHON) manage.py

run:
	$(MANAGE) runserver

migrate:
	$(MANAGE) migrate

makemigrations:
	$(MANAGE) makemigrations

shell:
	$(MANAGE) shell

superuser:
	$(MANAGE) createsuperuser

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f web

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build
