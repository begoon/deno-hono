FROM denoland/deno

WORKDIR /app

USER deno

ADD main.ts .

RUN deno cache main.ts

ENV PORT=8000

CMD ["run", "-A", "main.ts"]
