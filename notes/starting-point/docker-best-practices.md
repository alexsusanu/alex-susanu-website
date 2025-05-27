# Docker Best Practices
category: DevOps
tags: docker, containers, devops, security

## Multi-stage builds - Reduce image size and improve security

```dockerfile
FROM node:16 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

## Security Best Practices

### Don't run as root user
- Create non-root user in Dockerfile
- Use USER directive
- Set proper file permissions

### Use specific image tags
- Avoid 'latest' tag in production
- Pin to specific versions
- Use digest references for immutability

### Scan images for vulnerabilities
- Use docker scan or trivy
- Integrate scanning into CI/CD
- Regular base image updates

### Minimize attack surface
- Use distroless or alpine images
- Remove unnecessary packages
- Multi-stage builds to exclude build tools

## Performance Optimization

- Layer caching optimization
- Minimize number of layers
- Use .dockerignore file
- Health checks for containers