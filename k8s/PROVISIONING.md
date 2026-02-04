# DigitalOcean Kubernetes (DOKS) Provisioning Guide

This guide covers provisioning the Kubernetes infrastructure for Oikion's background job system.

## Prerequisites

- DigitalOcean account with billing enabled
- `doctl` CLI installed and authenticated
- `kubectl` installed

## 1. Install and Authenticate doctl

```bash
# Install doctl (macOS)
brew install doctl

# Authenticate with your API token
doctl auth init
```

## 2. Create Container Registry

```bash
# Create a basic container registry (includes 500MB storage)
doctl registry create oikion --subscription-tier basic

# Configure Docker to use the registry
doctl registry login
```

## 3. Create Kubernetes Cluster

### Option A: Using doctl CLI

```bash
# Create a 2-node cluster with autoscaling
doctl kubernetes cluster create oikion-jobs \
  --region fra1 \
  --version latest \
  --node-pool "name=worker-pool;size=s-2vcpu-4gb;count=2;auto-scale=true;min-nodes=1;max-nodes=4" \
  --vpc-uuid auto \
  --set-current-context

# Wait for cluster to be ready (takes ~5 minutes)
doctl kubernetes cluster get oikion-jobs
```

### Option B: Using Terraform

Create `k8s/terraform/main.tf`:

```hcl
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

provider "digitalocean" {
  token = var.do_token
}

# Container Registry
resource "digitalocean_container_registry" "oikion" {
  name                   = "oikion"
  subscription_tier_slug = "basic"
  region                 = "fra1"
}

# Kubernetes Cluster
resource "digitalocean_kubernetes_cluster" "oikion_jobs" {
  name    = "oikion-jobs"
  region  = "fra1"
  version = "1.29.1-do.0"
  
  vpc_uuid = digitalocean_vpc.oikion.id

  node_pool {
    name       = "worker-pool"
    size       = "s-2vcpu-4gb"
    node_count = 2
    auto_scale = true
    min_nodes  = 1
    max_nodes  = 4
    
    labels = {
      purpose = "jobs"
    }
  }

  maintenance_policy {
    start_time = "04:00"
    day        = "sunday"
  }
}

# VPC for network isolation
resource "digitalocean_vpc" "oikion" {
  name     = "oikion-vpc"
  region   = "fra1"
  ip_range = "10.10.10.0/24"
}

# Managed Redis (optional but recommended)
resource "digitalocean_database_cluster" "redis" {
  name       = "oikion-redis"
  engine     = "redis"
  version    = "7"
  size       = "db-s-1vcpu-1gb"
  region     = "fra1"
  node_count = 1
  
  private_network_uuid = digitalocean_vpc.oikion.id
}

# Connect registry to cluster
resource "digitalocean_container_registry_docker_credentials" "oikion" {
  registry_name = digitalocean_container_registry.oikion.name
}

# Outputs
output "cluster_id" {
  value = digitalocean_kubernetes_cluster.oikion_jobs.id
}

output "kubeconfig" {
  value     = digitalocean_kubernetes_cluster.oikion_jobs.kube_config[0].raw_config
  sensitive = true
}

output "redis_host" {
  value = digitalocean_database_cluster.redis.host
}

output "redis_port" {
  value = digitalocean_database_cluster.redis.port
}
```

Apply with:

```bash
cd k8s/terraform
terraform init
terraform plan
terraform apply
```

## 4. Configure kubectl

```bash
# Download kubeconfig
doctl kubernetes cluster kubeconfig save oikion-jobs

# Verify connection
kubectl cluster-info
kubectl get nodes
```

## 5. Connect Container Registry to Cluster

```bash
# Grant cluster access to pull images
doctl kubernetes cluster registry add oikion-jobs
```

## 6. Deploy Base Infrastructure

```bash
# Apply namespace and RBAC
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/rbac.yaml

# Verify
kubectl get ns oikion-jobs
kubectl get serviceaccount -n oikion-jobs
```

## 7. Create Secrets

```bash
# Create secrets from environment variables
kubectl create secret generic oikion-secrets \
  --namespace oikion-jobs \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=redis-url="$REDIS_URL" \
  --from-literal=resend-api-key="$RESEND_API_KEY" \
  --from-literal=xe-gr-username="$XE_GR_USERNAME" \
  --from-literal=xe-gr-password="$XE_GR_PASSWORD" \
  --from-literal=xe-gr-authtoken="$XE_GR_AUTHTOKEN" \
  --from-literal=worker-callback-secret="$(openssl rand -hex 32)"

# Create ConfigMap
kubectl create configmap oikion-config \
  --namespace oikion-jobs \
  --from-literal=callback-base-url="https://your-app.vercel.app/api/jobs/callback" \
  --from-literal=log-level="info" \
  --from-literal=xe-gr-base-url="http://import.xe.gr"

# Verify
kubectl get secret oikion-secrets -n oikion-jobs
kubectl get configmap oikion-config -n oikion-jobs
```

## 8. Configure Next.js App

Add these environment variables to your Vercel project:

```bash
# Kubernetes Configuration
K8S_CLUSTER_URL="https://xxx.k8s.fra1.digitaloceanspaces.com"
K8S_SERVICE_ACCOUNT_TOKEN="xxx"  # From ServiceAccount token
K8S_NAMESPACE="oikion-jobs"

# Feature Flag
USE_K8S_JOBS="true"

# Worker Callback Secret (must match K8s secret)
WORKER_CALLBACK_SECRET="xxx"
```

### Getting the ServiceAccount Token

```bash
# Create token for the job-orchestrator ServiceAccount
kubectl create token job-orchestrator \
  --namespace oikion-jobs \
  --duration=8760h
```

## 9. Test the Setup

```bash
# Create a test job manually
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: test-job
  namespace: oikion-jobs
spec:
  template:
    spec:
      containers:
      - name: test
        image: busybox
        command: ["echo", "Hello from K8s!"]
      restartPolicy: Never
EOF

# Check job status
kubectl get jobs -n oikion-jobs
kubectl logs job/test-job -n oikion-jobs

# Clean up
kubectl delete job test-job -n oikion-jobs
```

## Cost Estimate

| Resource | Spec | Monthly Cost |
|----------|------|--------------|
| DOKS Control Plane | Free | $0 |
| Worker Nodes (2x) | s-2vcpu-4gb | $48 |
| Container Registry | Basic (500MB) | $5 |
| Managed Redis | db-s-1vcpu-1gb | $15 |
| **Total** | | **~$68/month** |

### Cost Optimization Tips

1. **Enable autoscaling**: Nodes scale down to 1 during low usage
2. **Use Spot Instances** (coming to DOKS): Up to 60% savings
3. **TTL on jobs**: Jobs auto-delete after 1 hour
4. **Right-size resources**: Monitor and adjust requests/limits

## Troubleshooting

### Job stuck in Pending
```bash
kubectl describe job <job-name> -n oikion-jobs
kubectl describe pod <pod-name> -n oikion-jobs
```

### Image pull errors
```bash
# Verify registry connection
doctl kubernetes cluster registry add oikion-jobs

# Check pull secret
kubectl get secret do-registry -n oikion-jobs -o yaml
```

### Network issues
```bash
# Check network policies
kubectl get networkpolicy -n oikion-jobs

# Test DNS
kubectl run test-dns --image=busybox --rm -it -- nslookup kubernetes.default
```

## Maintenance

### Upgrade cluster version
```bash
doctl kubernetes cluster upgrade oikion-jobs --version latest
```

### Scale node pool
```bash
doctl kubernetes cluster node-pool update oikion-jobs worker-pool \
  --min-nodes 1 --max-nodes 8
```

### View cluster metrics
```bash
kubectl top nodes
kubectl top pods -n oikion-jobs
```
