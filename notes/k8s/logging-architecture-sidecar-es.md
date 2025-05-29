# Logging Architecture with Sidecar and Elasticsearch  
category: Kubernetes  
tags: logging, sidecar, fluent-bit, elasticsearch, emptyDir, volumes  

## Main Topic 1

This setup demonstrates how to use a sidecar pattern to collect logs from an application container and forward them to Elasticsearch. Logs are first written to a shared volume (`emptyDir`) and then exported by Fluent Bit.

### Subtopic A: Sidecar Logging Pattern  
- **Nginx writes logs** to /var/log/nginx, which is mounted to a shared volume.  
- **Fluent Bit reads logs** from the same path using the same shared volume.  
  - This allows decoupling logging from the application.  
  - Fluent Bit can parse and forward logs to external systems like Elasticsearch.

### Subtopic B: Sharing with emptyDir  
- The emptyDir volume is created fresh for each pod and shared between containers.  
- Mounting it at /var/log/nginx in both containers lets them access the same files.  
- This is ephemeral — data is lost when the pod is deleted or restarted.

## Main Topic 2

### Code Example (Pod Spec)  
apiVersion: v1  
kind: Pod  
metadata:  
  name: web-server-with-logging  
spec:  
  containers:  
  - name: web-server  
    image: nginx:1.21  
    ports:  
    - containerPort: 80  
    volumeMounts:  
    - name: shared-logs  
      mountPath: /var/log/nginx  

  - name: log-aggregator  
    image: fluent/fluent-bit:1.8  
    volumeMounts:  
    - name: shared-logs  
      mountPath: /var/log/nginx  
      readOnly: true  
    - name: fluentbit-config  
      mountPath: /fluent-bit/etc  
    env:  
    - name: ELASTICSEARCH_HOST  
      value: "elasticsearch.logging.svc.cluster.local"  

  volumes:  
  - name: shared-logs  
    emptyDir: {}  
  - name: fluentbit-config  
    configMap:  
      name: fluentbit-config  

### Commands (if applicable)  
# Check logs inside the web-server container  
kubectl exec -it web-server-with-logging -c web-server -- tail /var/log/nginx/access.log  

# Logs are forwarded to Elasticsearch via Fluent Bit  

## Key Concepts Summary

- emptyDir – Ephemeral volume shared across containers within a pod  
- Sidecar Container – A helper container (e.g., Fluent Bit) that reads logs  
- Fluent Bit – Lightweight log forwarder to Elasticsearch, etc.  
- Environment Variable (ELASTICSEARCH_HOST) – Tells Fluent Bit where to send logs  
- Elasticsearch – Centralized and persistent log storage  

## Best Practices / Tips

1. Never use emptyDir for long-term storage — it resets on pod restart  
2. Use ConfigMaps for managing Fluent Bit configs  
3. Secure the volume mount — make it read-only for sidecars  
4. Monitor log pipeline health — ensure logs reach Elasticsearch  
5. Scale Fluent Bit separately if needed in larger clusters  

