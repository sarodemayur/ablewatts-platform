BASE_PATH=$(PWD)
COMPOSE_FILE=./services/docker-compose.yml
COMPOSE_FILE_staging = ./services/staging/docker-compose-staging.yml

NAME=ablewatts-admin-development
NAME_staging=ablewatts-admin-staging

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
	@BASE_PATH=$(BASE_PATH) docker compose -f $(COMPOSE_FILE_staging) -p $(NAME_staging) up -d --build

delete:
	@echo
	@echo "🏭Building & 🚀Deploying development services"
	@echo
	docker compose --env-file services/.env -f services/docker-compose.yml down -v

delete-staging:
	@echo
	@echo "🏭Building & 🚀Deploying staging services"
	@echo
	@BASE_PATH=$(BASE_PATH) docker compose -f $(COMPOSE_FILE_staging) -p $(NAME_staging) down

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
	@$(MAKE) --no-print-directory delete-staging
	@$(MAKE) --no-print-directory decrypt-envs-staging
	@$(MAKE) --no-print-directory create-env-stage stage=staging
	@echo "✅ Staging deployed. DB migrate + seed run inside the backend container on boot."

logs-staging:
	@BASE_PATH=$(BASE_PATH) docker compose -f $(COMPOSE_FILE_staging) -p $(NAME_staging) logs -f

seed-staging:
	@BASE_PATH=$(BASE_PATH) docker compose -f $(COMPOSE_FILE_staging) -p $(NAME_staging) exec backend pnpm exec tsx src/db/seed.ts