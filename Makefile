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

last-tags:
	./gcp.ts last-tags \
	europe-west2-docker.pkg.dev/iproov-palms-poc/palms/hono-api

describe:
	./gcp.ts describe hono-api -p iproov-palms-poc -r europe-west2

deploy:
	./gcp.ts deploy hono-api \
	europe-west2-docker.pkg.dev/iproov-palms-poc/palms/hono-api \
	-p iproov-palms-poc -r europe-west2
