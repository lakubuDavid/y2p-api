FROM oven/bun:1 

WORKDIR /app

COPY dist ./

# Install dependencies
RUN bun install --frozen-lockfile

# Expose port 80
EXPOSE 3000:80

