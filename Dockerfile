FROM denoland/deno

WORKDIR /app

USER deno

ARG TAG=dev

ADD main.tsx .
ADD stream.js .
ADD deno.json .
ADD deno.lock .

RUN deno cache main.ts

ENV TAG=$TAG
ENV PORT=8000

CMD ["run", "-A", "main.ts"]
