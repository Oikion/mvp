# Oikion Jobs Monitoring

This directory contains monitoring configurations for the Oikion K8s job system.

## Components

### 1. Prometheus Rules (`prometheus-rules.yaml`)

Recording and alerting rules for job metrics:

**Recording Rules:**
- `oikion_job_success_rate_1h` - Job success rate over the last hour
- `oikion_job_duration_seconds` - Average job duration by type
- `oikion_job_queue_depth` - Number of pending/running jobs

**Alerts:**
- `OikionJobHighFailureRate` - Job failure rate > 20% (warning)
- `OikionJobStuck` - Job running > 30 minutes (warning)
- `OikionJobQueueHigh` - Queue depth > 20 jobs (warning)
- `OikionNoJobActivity` - No new jobs in 6 hours (info)
- `OikionJobOOMKilled` - Container OOM killed (warning)
- `OikionResourceQuotaNearlyExhausted` - Quota > 80% (warning)

### 2. Grafana Dashboard (`grafana-dashboard.json`)

Pre-built dashboard with:
- Active Jobs (stat)
- Jobs Completed (24h) (stat)
- Success Rate (stat)
- Average Job Duration (stat)
- Job Throughput over time (timeseries)
- Job Duration p95 (timeseries)
- Memory Usage by Pod (barchart)
- CPU Usage by Pod (barchart)

## Setup Options

### Option A: DigitalOcean Monitoring (Recommended)

DigitalOcean provides built-in monitoring for DOKS clusters:

1. **Enable Monitoring**
   ```bash
   doctl kubernetes cluster update oikion-jobs --set-current-context
   doctl monitoring alert policy create \
     --compare GreaterThan \
     --type v1/insights/droplet/cpu \
     --value 80 \
     --window 5m \
     --entities cluster:oikion-jobs
   ```

2. **View in DO Console**
   Navigate to: Kubernetes → oikion-jobs → Insights

### Option B: Self-Hosted Prometheus + Grafana

1. **Install using Helm**
   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm repo update

   # Install Prometheus Operator
   helm install prometheus prometheus-community/kube-prometheus-stack \
     --namespace monitoring \
     --create-namespace \
     --set grafana.adminPassword=your-password
   ```

2. **Apply custom rules**
   ```bash
   kubectl apply -f k8s/monitoring/prometheus-rules.yaml
   ```

3. **Import Grafana dashboard**
   - Open Grafana UI
   - Go to Dashboards → Import
   - Upload `grafana-dashboard.json`

### Option C: Datadog / New Relic / Other APM

Configure your APM agent to scrape K8s metrics from the oikion-jobs namespace.

## Key Metrics to Monitor

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Job Success Rate | % of jobs completing successfully | < 80% |
| Job Duration | Time from start to completion | > 30 min (varies by type) |
| Queue Depth | Number of pending jobs | > 20 |
| Memory Usage | Per-pod memory consumption | > 80% of limit |
| CPU Usage | Per-pod CPU consumption | > 80% of limit |

## Structured Logging

Workers output JSON logs for easy parsing:

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

### Log Aggregation with Loki

```bash
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  --set promtail.enabled=true
```

Query logs in Grafana:
```logql
{namespace="oikion-jobs"} |= "error" | json
```

## Runbooks

### High Failure Rate

1. Check logs for specific job: 
   ```bash
   kubectl logs -n oikion-jobs job/<job-name>
   ```
2. Look for common errors (OOM, network, database)
3. Check if specific platform/service is down
4. Consider increasing resources or retries

### Job Stuck

1. Describe the job:
   ```bash
   kubectl describe job -n oikion-jobs <job-name>
   ```
2. Check pod events for scheduling issues
3. Look for deadlocks or infinite loops in logs
4. Consider killing and restarting the job

### Queue Backlog

1. Check if workers are scaling:
   ```bash
   kubectl get nodes
   kubectl describe hpa -n oikion-jobs
   ```
2. Verify cluster autoscaler is working
3. Consider manual node scaling
4. Prioritize urgent jobs with priority field
