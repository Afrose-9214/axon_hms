# === STAGE 1: Build the Vite/React Frontend ===
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# === STAGE 2: Set up the Node.js Backend ===
FROM node:20-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
# Install only production dependencies to keep the container lightweight
RUN npm install --only=production 
COPY backend/ ./

# === STAGE 3: Bring them together ===
# Copy the compiled React files from Stage 1 into the backend's public folder
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose port 5000 (the port your Node backend runs on)
EXPOSE 5000

# The command to start your live app inside AWS
CMD ["node", "server.js"]