FROM php:8.3-fpm-alpine
RUN apk add --no-cache git curl libpng-dev libjpeg-turbo-dev freetype-dev libzip-dev zip unzip icu-dev postgresql-dev oniguruma-dev linux-headers $PHPIZE_DEPS
RUN docker-php-ext-configure gd --with-freetype --with-jpeg && docker-php-ext-install -j$(nproc) pdo pdo_pgsql pgsql gd zip intl mbstring opcache bcmath pcntl
RUN pecl install redis && docker-php-ext-enable redis
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN addgroup -g 1000 www && adduser -u 1000 -G www -s /bin/sh -D www
WORKDIR /var/www
USER www
EXPOSE 9000
CMD ["php-fpm"]
