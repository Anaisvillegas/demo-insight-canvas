# Docker Deployment Guide

This guide explains how to build and deploy the application using Docker for production environments.

## Prerequisites

- Docker installed on your system
- Access to the required environment variables

## Building the Docker Image

1. Make sure you are in the project root directory
2. Build the Docker image with the following command:

```bash
docker build -t open-artifacts:production .
```

You can replace `open-artifacts:production` with your preferred image name and tag.

## Running the Docker Container

Run the Docker container with the required environment variables:

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_value \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_value \
  -e NEXT_PUBLIC_ARTIFACT_RENDERER_URL=your_value \
  -e MEMGRAPH_URI=your_value \
  -e MEMGRAPH_USER=your_value \
  -e MEMGRAPH_PASSWORD=your_value \
  -e NEO4J_URI=your_value \
  -e NEO4J_USERNAME=your_value \
  -e NEO4J_PASSWORD=your_value \
  open-artifacts:production
```

Replace `your_value` with the actual values for your environment.

## Using Environment Files

Alternatively, you can use an environment file to pass the environment variables:

1. Create a `.env.production` file with your environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_value
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_value
NEXT_PUBLIC_ARTIFACT_RENDERER_URL=your_value
MEMGRAPH_URI=your_value
MEMGRAPH_USER=your_value
MEMGRAPH_PASSWORD=your_value
NEO4J_URI=your_value
NEO4J_USERNAME=your_value
NEO4J_PASSWORD=your_value
```

2. Run the Docker container with the environment file:

```bash
docker run -p 3000:3000 --env-file .env.production open-artifacts:production
```

## Deployment with Docker Compose

For more complex deployments, you can use Docker Compose. Create a `docker-compose.yml` file:

```yaml
version: '3'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

## Health Checks

The Dockerfile includes a health check that verifies the application is running correctly. You can check the container's health status with:

```bash
docker ps
```

Look for the "STATUS" column which will show "(healthy)" or "(unhealthy)".

## Production Considerations

- The Dockerfile is configured to run the application as a non-root user for security
- The application runs on port 3000 by default
- The container uses Node.js 20 Alpine as the base image for a small footprint
- The build process uses Next.js standalone output mode for optimal production deployment
