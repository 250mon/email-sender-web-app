# Stage 1: Build the React app
FROM node:20-alpine as build

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
RUN npm run build

# Stage 2: Serve the build with Nginx
FROM nginx:stable-alpine

# Copy the build output from the previous stage to Nginx's html folder
COPY --from=build /frontend_app/build /usr/share/nginx/html

# Copy a custom Nginx configuration
#COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
