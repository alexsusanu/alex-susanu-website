# CKAD Commands with Explanations

## Pods
```bash
kubectl run nginx --image=nginx
# Creates a pod named nginx with nginx image

kubectl run nginx --image=nginx --dry-run=client -o yaml
# Generates YAML for a pod without creating it

kubectl run nginx --image=nginx --restart=Never
# Creates a pod (not deployment) that won't restart on failure

kubectl run nginx --image=nginx --rm -it --restart=Never -- /bin/sh
# Creates a temporary interactive pod that gets deleted after exit

kubectl get pods
# Lists all pods in current namespace

kubectl get pods -o wide
# Lists pods with additional info like node and IP

kubectl get pods --show-labels
# Lists pods with their labels displayed

kubectl get pods -l app=nginx
# Lists pods filtered by label selector

kubectl describe pod nginx
# Shows detailed information about a specific pod

kubectl delete pod nginx
# Deletes a specific pod

kubectl delete pods --all
# Deletes all pods in current namespace

kubectl logs nginx
# Shows logs from a pod

kubectl logs nginx -f
# Follows/streams logs from a pod in real-time

kubectl logs nginx --previous
# Shows logs from previous container instance

kubectl exec nginx -- ls
# Executes a command inside a pod

kubectl exec -it nginx -- /bin/sh
# Opens interactive shell inside a pod

kubectl port-forward nginx 8080:80
# Forwards local port 8080 to pod port 80

kubectl cp nginx:/etc/passwd ./passwd
# Copies file from pod to local machine

kubectl apply -f pod.yaml
# Creates or updates resources from YAML file

kubectl create -f pod.yaml
# Creates resources from YAML file (fails if exists)

kubectl replace -f pod.yaml
# Replaces existing resource with YAML definition

kubectl patch pod nginx -p '{"spec":{"containers":[{"name":"nginx","image":"nginx:1.20"}]}}'
# Updates specific fields of a pod using JSON patch
```

## Deployments
```bash
kubectl create deployment nginx --image=nginx
# Creates a deployment with specified image

kubectl create deployment nginx --image=nginx --dry-run=client -o yaml
# Generates deployment YAML without creating it

kubectl get deployments
# Lists all deployments in current namespace

kubectl get deploy
# Short form to list deployments

kubectl describe deployment nginx
# Shows detailed information about a deployment

kubectl delete deployment nginx
# Deletes a deployment and its pods

kubectl scale deployment nginx --replicas=3
# Scales deployment to specified number of replicas

kubectl autoscale deployment nginx --min=2 --max=10 --cpu-percent=80
# Creates horizontal pod autoscaler for deployment

kubectl rollout status deployment nginx
# Shows rollout status of deployment

kubectl rollout history deployment nginx
# Shows rollout history of deployment

kubectl rollout undo deployment nginx
# Rolls back deployment to previous revision

kubectl rollout undo deployment nginx --to-revision=2
# Rolls back deployment to specific revision

kubectl set image deployment nginx nginx=nginx:1.20
# Updates container image in deployment

kubectl edit deployment nginx
# Opens deployment in editor for modification

kubectl expose deployment nginx --port=80 --target-port=80
# Creates service to expose deployment
```

## Services
```bash
kubectl create service clusterip nginx --tcp=80:80
# Creates ClusterIP service for internal access

kubectl create service nodeport nginx --tcp=80:80
# Creates NodePort service for external access via node port

kubectl create service loadbalancer nginx --tcp=80:80
# Creates LoadBalancer service for external access via load balancer

kubectl expose pod nginx --port=80 --target-port=80
# Creates service to expose a pod

kubectl expose deployment nginx --port=80 --target-port=80 --type=NodePort
# Creates NodePort service to expose deployment

kubectl get services
# Lists all services in current namespace

kubectl get svc
# Short form to list services

kubectl describe service nginx
# Shows detailed information about a service

kubectl delete service nginx
# Deletes a service

kubectl get endpoints
# Lists all endpoints (backend pods for services)
```

## ConfigMaps
```bash
kubectl create configmap nginx-config --from-literal=key1=value1
# Creates configmap from literal key-value pairs

kubectl create configmap nginx-config --from-file=config.txt
# Creates configmap from a file

kubectl create configmap nginx-config --from-file=configs/
# Creates configmap from all files in directory

kubectl create configmap nginx-config --from-env-file=config.env
# Creates configmap from environment file

kubectl get configmaps
# Lists all configmaps in current namespace

kubectl get cm
# Short form to list configmaps

kubectl describe configmap nginx-config
# Shows detailed information about a configmap

kubectl delete configmap nginx-config
# Deletes a configmap
```

## Secrets
```bash
kubectl create secret generic nginx-secret --from-literal=username=admin
# Creates secret from literal key-value pairs

kubectl create secret generic nginx-secret --from-file=secret.txt
# Creates secret from a file

kubectl create secret docker-registry regcred --docker-server=myregistry.com --docker-username=user --docker-password=pass
# Creates docker registry secret for private images

kubectl create secret tls tls-secret --cert=cert.crt --key=cert.key
# Creates TLS secret from certificate files

kubectl get secrets
# Lists all secrets in current namespace

kubectl describe secret nginx-secret
# Shows detailed information about a secret (values hidden)

kubectl delete secret nginx-secret
# Deletes a secret
```

## Jobs and CronJobs
```bash
kubectl create job nginx-job --image=nginx
# Creates a one-time job

kubectl create job nginx-job --image=nginx --dry-run=client -o yaml
# Generates job YAML without creating it

kubectl create cronjob nginx-cron --image=nginx --schedule="0 0 * * *"
# Creates scheduled job that runs daily at midnight

kubectl create cronjob nginx-cron --image=nginx --schedule="0 0 * * *" --dry-run=client -o yaml
# Generates cronjob YAML without creating it

kubectl get jobs
# Lists all jobs in current namespace

kubectl get cronjobs
# Lists all cronjobs in current namespace

kubectl get cj
# Short form to list cronjobs

kubectl describe job nginx-job
# Shows detailed information about a job

kubectl describe cronjob nginx-cron
# Shows detailed information about a cronjob

kubectl delete job nginx-job
# Deletes a job

kubectl delete cronjob nginx-cron
# Deletes a cronjob
```

## Namespaces
```bash
kubectl create namespace dev
# Creates a new namespace

kubectl get namespaces
# Lists all namespaces in cluster

kubectl get ns
# Short form to list namespaces

kubectl describe namespace dev
# Shows detailed information about a namespace

kubectl delete namespace dev
# Deletes a namespace and all resources in it

kubectl config set-context --current --namespace=dev
# Sets default namespace for current context
```

## Resource Management
```bash
kubectl top nodes
# Shows CPU and memory usage of nodes

kubectl top pods
# Shows CPU and memory usage of pods

kubectl get all
# Lists all common resources in current namespace

kubectl get all -n kube-system
# Lists all resources in kube-system namespace

kubectl api-resources
# Lists all available resource types

kubectl api-versions
# Lists all available API versions

kubectl explain pod
# Shows documentation for pod resource

kubectl explain pod.spec
# Shows documentation for pod spec field

kubectl explain pod.spec.containers
# Shows documentation for containers field in pod spec
```

## Labels and Annotations
```bash
kubectl label pod nginx env=prod
# Adds or updates label on a pod

kubectl label pod nginx env-
# Removes label from a pod

kubectl annotate pod nginx description="web server"
# Adds or updates annotation on a pod

kubectl annotate pod nginx description-
# Removes annotation from a pod

kubectl get pods --show-labels
# Lists pods with all labels displayed

kubectl get pods -l env=prod
# Lists pods with specific label

kubectl get pods -l 'env in (prod,dev)'
# Lists pods with label value in specified set

kubectl get pods -l env!=prod
# Lists pods without specific label value
```

## Troubleshooting
```bash
kubectl get events
# Lists events in current namespace

kubectl get events --sort-by=.metadata.creationTimestamp
# Lists events sorted by creation time

kubectl cluster-info
# Shows cluster endpoint information

kubectl cluster-info dump
# Dumps cluster state for debugging

kubectl version
# Shows kubectl and cluster version

kubectl get componentstatuses
# Shows health of cluster components

kubectl get cs
# Short form to check component status
```

## Networking
```bash
kubectl get networkpolicies
# Lists all network policies in current namespace

kubectl get netpol
# Short form to list network policies

kubectl describe networkpolicy deny-all
# Shows detailed information about a network policy

kubectl delete networkpolicy deny-all
# Deletes a network policy
```

## Persistent Volumes
```bash
kubectl get persistentvolumes
# Lists all persistent volumes in cluster

kubectl get pv
# Short form to list persistent volumes

kubectl get persistentvolumeclaims
# Lists all persistent volume claims in current namespace

kubectl get pvc
# Short form to list persistent volume claims

kubectl describe pv pv-name
# Shows detailed information about a persistent volume

kubectl describe pvc pvc-name
# Shows detailed information about a persistent volume claim

kubectl delete pvc pvc-name
# Deletes a persistent volume claim
```

## Context and Config
```bash
kubectl config view
# Shows current kubectl configuration

kubectl config get-contexts
# Lists all available contexts

kubectl config current-context
# Shows currently active context

kubectl config use-context context-name
# Switches to specified context

kubectl config set-context context-name --namespace=namespace-name
# Sets namespace for a context
```

## Output Formats
```bash
kubectl get pods -o json
# Outputs pods in JSON format

kubectl get pods -o yaml
# Outputs pods in YAML format

kubectl get pods -o wide
# Outputs pods with additional columns

kubectl get pods -o name
# Outputs only pod names

kubectl get pods -o jsonpath='{.items[*].metadata.name}'
# Extracts specific fields using JSONPath

kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'
# Formats JSONPath output with line breaks

kubectl get pods --sort-by=.metadata.name
# Sorts output by pod name

kubectl get pods --sort-by=.metadata.creationTimestamp
# Sorts output by creation timestamp
```

## Imperative Commands
```bash
kubectl run nginx --image=nginx --port=80 --expose
# Creates pod and service in one command

kubectl run nginx --image=nginx --env="VAR1=value1"
# Creates pod with environment variable

kubectl run nginx --image=nginx --command -- /bin/sh -c "sleep 3600"
# Creates pod with custom command

kubectl run nginx --image=nginx --requests="cpu=100m,memory=128Mi"
# Creates pod with resource requests

kubectl run nginx --image=nginx --limits="cpu=200m,memory=256Mi"
# Creates pod with resource limits

kubectl run nginx --image=nginx --restart=OnFailure
# Creates job that restarts on failure

kubectl run nginx --image=nginx --schedule="0 0 * * *"
# Creates cronjob with specified schedule
```