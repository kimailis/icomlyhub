FROM node:20-alpine

WORKDIR /app

# Install build dependencies and mail utilities
RUN apk add --no-cache python3 make g++ sqlite postfix cyrus-sasl

# Initialize postfix
RUN newaliases

# Basic Postfix config for local delivery only (no relayhost, no SASL password)
RUN postconf -e "inet_interfaces = all" && \
    postconf -e "inet_protocols = ipv4" && \
    postconf -e "mydestination = localhost.localdomain, localhost" && \
    postconf -e "mynetworks = 127.0.0.0/8" && \
    postconf -e "smtp_use_tls = yes" && \
    postconf -e "smtp_sasl_auth_enable = no" && \
    postconf -e "smtp_tls_security_level = may" && \
    postconf -e "smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt" && \
    postconf -e "smtp_bind_address = 127.0.0.1" && \
    postconf -e "smtp_port = 10025" && \
    postconf -e "smtpd_banner = \$myhostname ESMTP \$mail_name"

COPY package*.json ./

RUN npm config set registry https://registry.npmjs.org/
RUN npm install

# Install nodemailer-direct-transport as requested by user's example
RUN npm install nodemailer-direct-transport

RUN apk add --no-cache spamassassin

# Create SQLite database directory
RUN mkdir -p /app/data

COPY . .

EXPOSE 2525 3025 587 465

# Start postfix and then the Node.js application
CMD postfix start && npm start
