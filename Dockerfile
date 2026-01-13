# Use the official Node.js 20 image.
FROM node:20-slim

# Set the working directory in the container.
WORKDIR /app

# Copy package.json and package-lock.json to the working directory.
COPY package*.json ./

# Install dependencies.
# This will install devDependencies too, which we need for 'concurrently'
RUN npm install

# Copy the rest of the application code to the working directory.
COPY . .

# Expose port 3000.
EXPOSE 3000

# Command to run the application in development mode.
CMD ["npm", "run", "dev"]
