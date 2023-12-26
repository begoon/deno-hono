FROM denoland/deno

WORKDIR /app

USER deno

ARG TAG=dev

ADD main.ts .

RUN deno cache main.ts

ENV TAG=$TAG
ENV PORT=8000

CMD ["run", "-A", "main.ts"]
