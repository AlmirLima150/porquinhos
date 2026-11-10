FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
ENV DB_PATH=/data/porquinhos.db

# Cria diretório persistente para o SQLite
RUN mkdir -p /data

COPY package.json server.js index.html index_1.html ./
COPY css ./css
COPY js ./js

VOLUME ["/data"]

EXPOSE 3000

CMD ["node", "server.js"]
