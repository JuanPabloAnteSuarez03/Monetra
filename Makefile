.PHONY: up up-dev down logs rebuild

up:
	docker compose up -d

up-dev:
	docker compose -f docker-compose.dev.yml up --build

down:
	docker compose down
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose logs -f

rebuild:
	docker compose build --no-cache
