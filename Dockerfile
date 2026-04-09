FROM node:18-alpine

RUN apk add --no-cache python3 make g++

ARG SHOPIFY_API_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
EXPOSE 3000
WORKDIR /app
COPY web .
RUN npm install
CMD ["npm", "run", "serve"]
