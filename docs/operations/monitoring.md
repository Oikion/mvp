# Monitoring and Observability

## Application Monitoring

Oikion uses Vercel Analytics for production observability (auto-configured via `GeistdocsProvider`). For the K8s job system, Prometheus + Grafana or DigitalOcean Monitoring is used.

## K8s Job Monitoring

### Prometheus Metrics

**Recording rules** (defined in `k8s/monitoring/prometheus-rules.yaml`):
- `oikion_job_success_rate_1h` — Job success rate over 1 hour
- `oikion_job_duration_seconds` — Average duration by job type
- `oikion_job_queue_depth` — Pending + running jobs

**Alerts:**

| Alert | Threshold | Severity |
|-------|-----------|----------|
| `OikionJobHighFailureRate` | Failure rate > 20% | Warning |
| `OikionJobStuck` | Running > 30 minutes | Warning |
| `OikionJobQueueHigh` | Queue depth > 20 | Warning |
| `OikionNoJobActivity` | No new jobs in 6 hours | Info |
| `OikionJobOOMKilled` | Container OOM killed | Warning |
| `OikionResourceQuotaNearlyExhausted` | Quota > 80% | Warning |

### Key Metrics to Monitor

| Metric | Alert Threshold |
|--------|-----------------|
| Job Success Rate | < 80% |
| Job Duration | > 30 min (varies by type) |
| Queue Depth | > 20 |
| Memory Usage per Pod | > 80% of limit |
| CPU Usage per Pod | > 80% of limit |

### Grafana Dashboard

Import `k8s/monitoring/grafana-dashboard.json` for pre-built panels:
- Active Jobs, Jobs Completed (24h), Success Rate, Average Duration (stat panels)
- Job Throughput over time, Duration p95 (time series)
- Memory and CPU usage by pod (bar charts)

## Setup Options

### Option A: DigitalOcean Monitoring (Recommended for DOKS)

```bash
doctl kubernetes cluster update oikion-jobs --set-current-context
doctl monitoring alert policy create \
  --compare GreaterThan \
  --type v1/insights/droplet/cpu \
  --value 80 \
  --window 5m \
  --entities cluster:oikion-jobs
```

View in DO Console: **Kubernetes → oikion-jobs → Insights**

### Option B: Self-Hosted Prometheus + Grafana

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=your-password

kubectl apply -f k8s/monitoring/prometheus-rules.yaml
```

Then import `k8s/monitoring/grafana-dashboard.json` via Grafana UI.

### Option C: Loki for Log Aggregation

```bash
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  --set promtail.enabled=true
```

Query in Grafana:
```logql
{namespace="oikion-jobs"} |= "error" | json
```

## Structured Logging

Workers emit JSON logs:

```json
{
  "level": "info",
  "time": "2026-01-28T10:15:30.000Z",
  "name": "newsletter-worker",
  "msg": "Progress update",
  "progress": 45,
  "message": "Sent 450/1000 emails",
  "jobId": "clxxx",
  "organizationId": "org_xxx"
}
```

## Runbooks

### High Failure Rate

1. Check job logs: `kubectl logs -n oikion-jobs job/<job-name>`
2. Look for OOM, network errors, or database connectivity issues
3. Check if a downstream service (Resend, Ably, database) is degraded
4. Consider increasing resource limits or retry counts

### Job Stuck (> 30 min)

1. Describe job: `kubectl describe job -n oikion-jobs <job-name>`
2. Check pod events for scheduling issues
3. Look for deadlocks or infinite loops in logs
4. Kill and restart: `kubectl delete job -n oikion-jobs <job-name>`

### Queue Backlog

1. Check autoscaler: `kubectl get nodes && kubectl describe hpa -n oikion-jobs`
2. Verify cluster autoscaler is functioning
3. Consider manual node scaling
4. Prioritize urgent jobs via the `priority` field
