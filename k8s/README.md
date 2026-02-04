# Oikion Kubernetes Configuration

This directory contains Kubernetes manifests for the Oikion job orchestration system.

## Directory Structure

```
k8s/
├── base/           # Core resources (namespace, secrets, RBAC)
│   ├── namespace.yaml
│   ├── secrets.yaml
│   └── rbac.yaml
├── jobs/           # Job templates for each worker type
│   ├── market-intel-job.yaml
│   ├── newsletter-job.yaml
│   ├── portal-job.yaml
│   └── export-job.yaml
└── README.md
```

## Prerequisites

1. **DigitalOcean Kubernetes Cluster** (DOKS)
   - Recommended: 2x s-2vcpu-4gb nodes
   - Enable cluster autoscaler

2. **DigitalOcean Container Registry** (DOCR)
   - Basic plan ($5/month)
   - Configure kubectl with registry credentials

3. **Managed Redis** (optional but recommended)
   - DigitalOcean Managed Redis or self-hosted
   - Used for real-time job progress updates

## Setup Instructions

### 1. Create the namespace and RBAC

```bash
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/rbac.yaml
```

### 2. Create secrets

**Option A: Using kubectl**
```bash
kubectl create secret generic oikion-secrets \
  --namespace oikion-jobs \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=redis-url="$REDIS_URL" \
  --from-literal=resend-api-key="$RESEND_API_KEY" \
  --from-literal=xe-gr-username="$XE_GR_USERNAME" \
  --from-literal=xe-gr-password="$XE_GR_PASSWORD" \
  --from-literal=xe-gr-authtoken="$XE_GR_AUTHTOKEN" \
  --from-literal=worker-callback-secret="$WORKER_CALLBACK_SECRET"
```

**Option B: Using Sealed Secrets** (recommended for GitOps)
```bash
# Install sealed-secrets controller first
kubectl apply -f k8s/base/secrets.yaml | kubeseal --format yaml > k8s/base/sealed-secrets.yaml
kubectl apply -f k8s/base/sealed-secrets.yaml
```

### 3. Create ConfigMap

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: oikion-config
  namespace: oikion-jobs
data:
  callback-base-url: "https://your-domain.com/api/jobs/callback"
  log-level: "info"
  xe-gr-base-url: "http://import.xe.gr"
EOF
```

### 4. Configure image pull secrets (for DOCR)

```bash
doctl registry kubernetes-manifest | kubectl apply -f -
```

## Job Templates

The job templates in `k8s/jobs/` are not applied directly. Instead, they serve as documentation and the Job Orchestrator (in the Next.js app) creates jobs programmatically using the Kubernetes API.

Variables like `${JOB_ID}` are replaced at runtime by the orchestrator.

## Resource Limits

| Job Type | Memory Request | Memory Limit | CPU Request | CPU Limit | Timeout |
|----------|---------------|--------------|-------------|-----------|---------|
| Market Intel | 512Mi | 2Gi | 250m | 1000m | 30 min |
| Newsletter | 256Mi | 512Mi | 100m | 500m | 1 hour |
| Portal Publish | 512Mi | 1Gi | 200m | 500m | 30 min |
| Export | 512Mi | 2Gi | 200m | 1000m | 15 min |

## Monitoring

Jobs can be monitored using:

```bash
# List all jobs
kubectl get jobs -n oikion-jobs

# Watch jobs in real-time
kubectl get jobs -n oikion-jobs -w

# Get job logs
kubectl logs -n oikion-jobs job/mi-scrape-xxx

# Describe a job
kubectl describe job -n oikion-jobs mi-scrape-xxx
```

## Cleanup

Old completed/failed jobs are automatically cleaned up after 1 hour (ttlSecondsAfterFinished).

For manual cleanup:
```bash
# Delete all completed jobs
kubectl delete jobs -n oikion-jobs --field-selector status.successful=1

# Delete all failed jobs
kubectl delete jobs -n oikion-jobs --field-selector status.successful=0
```

## Security Notes

- Jobs run with minimal permissions (no service account by default)
- Network policy restricts inbound traffic
- Secrets are mounted as environment variables (not files)
- Consider using Pod Security Standards for additional hardening
