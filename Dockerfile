FROM oven/bun
WORKDIR /web

COPY . .
RUN bun install
WORKDIR /web/apps/main/
RUN bun run build

CMD ["bun", "start"]
EXPOSE 8082
