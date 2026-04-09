FROM node:18-alpine

RUN apk add --no-cache python3 make g++

ARG SHOPIFY_API_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
EXPOSE 3000
WORKDIR /app
COPY web .
RUN npm install
RUN cd frontend && npm install --legacy-peer-deps && npm run build
CMD ["npm", "run", "serve"]
