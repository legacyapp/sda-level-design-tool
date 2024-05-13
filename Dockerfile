FROM node:18-alpine3.18 as builder
WORKDIR /app
COPY package.json ./
RUN npm install
RUN export PATH="/app/node_modules/.bin:$PATH"
COPY . ./
RUN /app/node_modules/.bin/webpack
#CMD ["/app/node_modules/.bin/webpack"]


FROM nginx:alpine AS frontend
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/pose_data /usr/share/nginx/html/pose_data
EXPOSE 80


# FROM node:16 as build

# WORKDIR /usr/src/app

# COPY package.json yarn.lock ./
# RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn install

# COPY . .
# RUN --mount=type=cache,target=./node_modules/.cache/webpack yarn build

# FROM nginx:alpine
# COPY --from=build /usr/src/app/dist /usr/share/nginx/html
# EXPOSE 80