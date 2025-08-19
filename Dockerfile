FROM node:20-alpine

WORKDIR /app

# Install TypeScript globally first
RUN npm install -g typescript
RUN npm install tsc

# Copy package files
COPY package*.json ./

# Install project dependencies
RUN npm install

COPY . .


# Use global tsc
RUN tsc

EXPOSE 3000

CMD ["node", "dist/index.js"]
# Just keep the container alive with a shell
# CMD ["sh"]