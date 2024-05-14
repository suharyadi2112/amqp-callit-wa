FROM node:20.10.0-alpine AS feimagewa

WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

COPY package.json /app/package.json
RUN yarn install
COPY . /app
RUN yarn build

# Tahap kedua: Membangun image Nginx
FROM nginx:1.23-alpine

# Salin output build dari tahap pertama ke direktori kerja Nginx
COPY --from=feimagewa /app/dist /usr/share/nginx/html

# Ekspos port 80
EXPOSE 80

# Perintah yang akan dijalankan ketika kontainer dimulai
CMD ["nginx", "-g", "daemon off;"]
