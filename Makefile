PROJECT=iproov-palms-poc
REGION=europe-west2

NAME=hono-api
REPO=$(REGION)-docker.pkg.dev/$(PROJECT)/palms

VERSION=$(shell jq -r .version "./deno.json")

BRANCH=$(shell git rev-parse --abbrev-ref HEAD)
COMMIT=$(shell git rev-parse --short HEAD)
DATE=$(shell date '+%Y%m%d')
IMAGE_TAG=$(BRANCH)-$(VERSION)-$(COMMIT)-$(DATE)

export __TAG=$(subst /,-,$(IMAGE_TAG))

all:

docker-build:
	docker build $(PLATFORM) -t $(NAME) .

docker-build-x64:
	make docker-build \
	PLATFORM=--platform=linux/amd64

docker-push:
	docker tag $(NAME) $(REPO)/$(NAME):$(TAG)
	docker push $(REPO)/$(NAME):$(TAG)

last-tag:
	@gcloud artifacts docker images list $(REPO)/$(NAME) \
	--include-tags \
	--sort-by "~UPDATE_TIME" \
	--limit 1 \
	--format=json \
	2>/dev/null \
	| jq -r '.[].tags | split(", ")[-1]' 

deploy:
	@echo "last tag $(WHITE)$(shell make last-tag)$(NC)"
	@test -n "$(TAG)" || (echo "TAG is not set"; exit 1)
	@echo "image $(YELLOW)$(REPO)/$(NAME)$(NC)"
	@echo "deploying tag $(YELLOW)$(TAG)$(NC)..."
	@echo "ARE YOU SURE $(WHITE)[Y/N]$(NC)?"
	@read YN && [[ $$YN =~ ^[Yy]$$ ]]
	make deploy-action

deploy-action:
	gcloud run deploy \
	$(NAME) \
	--image $(REPO)/$(NAME):$(TAG) \
	--update-env-vars TAG=$(TAG) \
	--allow-unauthenticated \
	--project $(PROJECT) \
	--region $(REGION)

# Black        0;30     Dark Gray     1;30
# Red          0;31     Light Red     1;31
# Green        0;32     Light Green   1;32
# Brown/Orange 0;33     Yellow        1;33
# Blue         0;34     Light Blue    1;34
# Purple       0;35     Light Purple  1;35
# Cyan         0;36     Light Cyan    1;36
# Light Gray   0;37     White         1;37

WHITE=\033[1;37m
RED=\033[1;31m
YELLOW=\033[1;33m
NC=\033[0m
BEEP=\007
