# Kubernetes Health Probes - Liveness vs Readiness

category: Kubernetes
tags: health-checks, liveness, readiness, probes, k8s, monitoring

## Main Topic 1

Kubernetes uses health probes to automatically detect when containers are alive and ready to serve traffic. This distinction is critical for high-availability and fault-tolerant systems.

### Subtopic A: Types of Probes

* **Liveness Probe** – Determines if a container is still running. If it fails, Kubernetes will restart the container.
* **Readiness Probe** – Determines if a container is ready to accept traffic. If it fails, Kubernetes will remove the pod from the Service endpoints.

### Subtopic B: Why the Difference Matters

* Liveness keeps the container from running in a "zombie" state (e.g. stuck or deadlocked).
* Readiness protects users from hitting an app that is still initializing or temporarily unavailable due to backend issues.

## Main Topic 2

### Example: Liveness Check (Lightweight)

```js
// Lightweight liveness check - ensures app is running
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: Date.now() });
});
```

* This will return 200 as long as the server is up and event loop is alive.
* **It does NOT check whether the app is doing real work or connected to dependencies.**

### Example: Readiness Check (Deeper)

```js
// Readiness check - ensure dependencies are available
app.get('/health/ready', async (req, res) => {
  try {
    await checkDatabaseConnection();
    await checkS3Availability();
    res.status(200).json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'unavailable', error: err.message });
  }
});
```

* This returns 200 only when dependencies (DB, S3, etc.) are reachable.
* Useful to **gate real traffic** until the app is fully operational.

## Key Concepts Summary

* **Liveness Probe** – Keeps the app from getting stuck or dead.
* **Readiness Probe** – Prevents traffic from being routed to an unready pod.
* **Status 200 ≠ healthy** unless it reflects all required services.
* Keep liveness light; readiness can be deep.

### Probe Comparison Summary

| Probe Type    | What It Checks                     | Result if Failing          | Example Use            |
| ------------- | ---------------------------------- | -------------------------- | ---------------------- |
| **Liveness**  | Is the app process running?        | Container is restarted     | Memory leak, deadlock  |
| **Readiness** | Is the app ready to serve traffic? | Pod removed from endpoints | Waiting for DB, warmup |

## Best Practices / Tips

1. **Never include external checks in liveness probes.**
2. **Use readiness probes to delay traffic until app is ready.**
3. **Separate logic clearly** — don’t reuse `/health` for both purposes.
4. **Use different paths and functions** for `/health/live` vs `/health/ready`.
5. Set meaningful initial delays and timeouts based on startup requirements.

