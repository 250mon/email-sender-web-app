# Build the React app
FROM node:20-alpine

# Install tzdata
RUN apk add --no-cache tzdata

# Set the TZ environment variable and configure /etc/localtime
ENV TZ=Asia/Seoul
RUN cp /usr/share/zoneinfo/$TZ /etc/localtime \
&& echo $TZ > /etc/timezone

# Set working directory
WORKDIR /frontend_app

# Copy dependency definitions
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the React app for production
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ARG PUBLIC_URL
ENV PUBLIC_URL=${PUBLIC_URL}
RUN npm run build

# Install serve to serve the static files
RUN npm install -g serve

# Expose port 80
EXPOSE 80

# Start serve to serve the build folder with SPA support
CMD ["serve", "-s", "build", "-l", "80", "--single"]