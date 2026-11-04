# --- Build ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# --- Runtime : nginx sert l'application et relaie /api vers le backend ---
FROM nginx:1.29-alpine
ENV BACKEND_URL=http://host.docker.internal:8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/show-marker-front/browser /usr/share/nginx/html
EXPOSE 80
