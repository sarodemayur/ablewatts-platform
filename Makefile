BASE_PATH=$(PWD)
COMPOSE_FILE=./services/docker-compose.yml
COMPOSE_FILE_staging = ./services/staging/docker-compose-staging.yml

NAME=ablewatts-admin-development
NAME_staging=ablewatts-admin-staging

# services/.env is written by `create-env-stage` and supplies POSTGRES_*, VITE_API_BASE_URL,
# HTTP_PORT/HTTPS_PORT to the staging compose file.
COMPOSE_STAGING = docker compose --env-file ./services/.env -f $(COMPOSE_FILE_staging) -p $(NAME_staging)

all: 
	@echo 
	@echo "please specify the command 👊"
	@echo

encrypt-envs:
	@echo "🚀 Encrypting ENVS 🚀"
	@chmod +x ./scripts/encrypt-envs.sh
	@./scripts/encrypt-envs.sh .env.development $(PASSPHRASE_DEVELOPMENT) development
	@./scripts/encrypt-envs.sh .env.staging $(PASSPHRASE_STAGING) staging
	@./scripts/encrypt-envs.sh .env.production $(PASSPHRASE_PRODUCTION) production

decrypt-envs:
	@echo "🚀 Decrypting ENVS 🚀"
	@chmod +x ./scripts/decrypt-envs.sh
	@./scripts/decrypt-envs.sh .env.development $(PASSPHRASE_DEVELOPMENT) development
	@./scripts/decrypt-envs.sh .env.staging $(PASSPHRASE_STAGING) staging
	@./scripts/decrypt-envs.sh .env.production $(PASSPHRASE_PRODUCTION) production

create-env-stage:
	@echo
	@echo "🚀Moving secrets of $(stage) to .env"
	@echo
	@chmod +x ./scripts/create-env.sh
	@./scripts/create-env.sh "$(PWD)" "$(stage)"

deploy:
	@echo
	@echo "🏭Building & 🚀Deploying development services"
	@echo
	docker compose --env-file services/.env -f services/docker-compose.yml up -d

deploy-staging:
	@echo
	@echo "🏭Building & 🚀Deploying staging services"
	@echo
	@BASE_PATH=$(BASE_PATH) $(COMPOSE_STAGING) up -d --build

delete:
	@echo
	@echo "🏭Building & 🚀Deploying development services"
	@echo
	docker compose --env-file services/.env -f services/docker-compose.yml down -v

delete-staging:
	@echo
	@echo "🗑️  Stopping staging services (volumes kept)"
	@echo
	@BASE_PATH=$(BASE_PATH) $(COMPOSE_STAGING) down

recreate:
	@echo
	@echo "🚀  Recreating $(stage) services"
	@echo "🗑️  Deleting $(stage) services"
	@$(MAKE) --no-print-directory delete
	@$(MAKE) --no-print-directory decrypt-envs
	@$(MAKE) --no-print-directory create-env-stage
	@echo
	@$(MAKE) --no-print-directory deploy
	pnpm run db:generate
	pnpm run db:migrate
	pnpm run db:seed
	@echo "✅ $(stage) services recreated successfully"

decrypt-envs-staging:
	@echo "🔓 Decrypting staging ENVs"
	@chmod +x ./scripts/decrypt-envs.sh
	@./scripts/decrypt-envs.sh .env.staging $(PASSPHRASE_STAGING) staging

recreate-staging:
	@echo
	@echo "🚀  Deploying staging services"
	@echo
	@# Envs first: `down` needs services/.env for --env-file, so it can't run before this.
	@$(MAKE) --no-print-directory decrypt-envs-staging
	@$(MAKE) --no-print-directory create-env-stage stage=staging
	@$(MAKE) --no-print-directory delete-staging
	@$(MAKE) --no-print-directory deploy-staging
	@echo "✅ Staging deployed. DB migrate + seed run inside the backend container on boot."

build-staging:
	@echo
	@echo "🏭Building staging images (no restart)"
	@echo
	@BASE_PATH=$(BASE_PATH) $(COMPOSE_STAGING) build

ps-staging:
	@BASE_PATH=$(BASE_PATH) $(COMPOSE_STAGING) ps

logs-staging:
	@BASE_PATH=$(BASE_PATH) $(COMPOSE_STAGING) logs -f

migrate-staging:
	@BASE_PATH=$(BASE_PATH) $(COMPOSE_STAGING) exec backend pnpm exec prisma migrate deploy

seed-staging:
	@BASE_PATH=$(BASE_PATH) $(COMPOSE_STAGING) exec backend pnpm exec tsx prisma/seed.ts

# Wipes the staging database and uploads as well as the containers.
destroy-staging:
	@echo
	@echo "💣 Deleting staging services AND volumes (database + uploads)"
	@echo
	@BASE_PATH=$(BASE_PATH) $(COMPOSE_STAGING) down -v