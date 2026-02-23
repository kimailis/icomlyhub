# Use the official Node.js image from Docker Hub
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if present) to the working directory
COPY package*.json ./

# Install the app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 5050 to the outside world
EXPOSE 5050

# Start the application when the container runs
CMD ["node", "server.js"]
