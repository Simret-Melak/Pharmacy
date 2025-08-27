FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create uploads directory INSIDE the container
RUN mkdir -p /app/uploads && chown node:node /app/uploads

# Expose port
EXPOSE 5001

# Switch to non-root user for security
USER node

# Start the application
CMD ["npm", "start"]