.PHONY: help up down restart logs build ps test test-backend test-frontend lint clean

help:
	@echo "DeployStack - Development Commands"
	@echo "----------------------------------"
	@echo "make up            - Start all services with Docker Compose"
	@echo "make down          - Stop all running containers"
	@echo "make restart       - Restart containers"
	@echo "make logs          - Tail container logs"
	@echo "make build         - Rebuild container images"
	@echo "make ps            - Check status of containers"
	@echo "make test          - Run backend and frontend tests"
	@echo "make test-backend  - Run backend pytest suite"
	@echo "make test-frontend - Run frontend tests/build"
	@echo "make lint          - Run linters on backend and frontend"
	@echo "make clean         - Clean temp files, coverage, and caches"

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

build:
	docker compose build

ps:
	docker compose ps

test: test-backend test-frontend

test-backend:
	cd application/backend && pytest -v

test-frontend:
	cd application/frontend && npm run build

lint:
	cd application/backend && ruff check .
	cd application/frontend && npm run lint

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
