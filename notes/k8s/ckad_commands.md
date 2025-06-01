# CKAD Commands

## Pods
```bash
kubectl run nginx --image=nginx
kubectl run nginx --image=nginx --dry-run=client -o yaml
kubectl run nginx --image=nginx --restart=Never
kubectl run nginx --image=nginx --rm -it --restart=Never -- /bin/sh
kubectl get pods
kubectl get pods -o wide
kubectl get pods --show-labels
kubectl get pods -l app=nginx
kubectl describe pod nginx
kubectl delete pod nginx
kubectl delete pods --all
kubectl logs nginx
kubectl logs nginx -f
kubectl logs nginx --previous
kubectl exec nginx -- ls
kubectl exec -it nginx -- /bin/sh
kubectl port-forward nginx 8080:80
kubectl cp nginx:/etc/passwd ./passwd
kubectl apply -f pod.yaml
kubectl create -f pod.yaml
kubectl replace -f pod.yaml
kubectl patch pod nginx -p '{"spec":{"containers":[{"name":"nginx","image":"nginx:1.20"}]}}'
```

## Deployments
```bash
kubectl create deployment nginx --image=nginx
kubectl create deployment nginx --image=nginx --dry-run=client -o yaml
kubectl get deployments
kubectl get deploy
kubectl describe deployment nginx
kubectl delete deployment nginx
kubectl scale deployment nginx --replicas=3
kubectl autoscale deployment nginx --min=2 --max=10 --cpu-percent=80
kubectl rollout status deployment nginx
kubectl rollout history deployment nginx
kubectl rollout undo deployment nginx
kubectl rollout undo deployment nginx --to-revision=2
kubectl set image deployment nginx nginx=nginx:1.20
kubectl edit deployment nginx
kubectl expose deployment nginx --port=80 --target-port=80
```

## Services
```bash
kubectl create service clusterip nginx --tcp=80:80
kubectl create service nodeport nginx --tcp=80:80
kubectl create service loadbalancer nginx --tcp=80:80
kubectl expose pod nginx --port=80 --target-port=80
kubectl expose deployment nginx --port=80 --target-port=80 --type=NodePort
kubectl get services
kubectl get svc
kubectl describe service nginx
kubectl delete service nginx
kubectl get endpoints
```

## ConfigMaps
```bash
kubectl create configmap nginx-config --from-literal=key1=value1
kubectl create configmap nginx-config --from-file=config.txt
kubectl create configmap nginx-config --from-file=configs/
kubectl create configmap nginx-config --from-env-file=config.env
kubectl get configmaps
kubectl get cm
kubectl describe configmap nginx-config
kubectl delete configmap nginx-config
```

## Secrets
```bash
kubectl create secret generic nginx-secret --from-literal=username=admin
kubectl create secret generic nginx-secret --from-file=secret.txt
kubectl create secret docker-registry regcred --docker-server=myregistry.com --docker-username=user --docker-password=pass
kubectl create secret tls tls-secret --cert=cert.crt --key=cert.key
kubectl get secrets
kubectl describe secret nginx-secret
kubectl delete secret nginx-secret
```

## Jobs and CronJobs
```bash
kubectl create job nginx-job --image=nginx
kubectl create job nginx-job --image=nginx --dry-run=client -o yaml
kubectl create cronjob nginx-cron --image=nginx --schedule="0 0 * * *"
kubectl create cronjob nginx-cron --image=nginx --schedule="0 0 * * *" --dry-run=client -o yaml
kubectl get jobs
kubectl get cronjobs
kubectl get cj
kubectl describe job nginx-job
kubectl describe cronjob nginx-cron
kubectl delete job nginx-job
kubectl delete cronjob nginx-cron
```

## Namespaces
```bash
kubectl create namespace dev
kubectl get namespaces
kubectl get ns
kubectl describe namespace dev
kubectl delete namespace dev
kubectl config set-context --current --namespace=dev
```

## Resource Management
```bash
kubectl top nodes
kubectl top pods
kubectl get all
kubectl get all -n kube-system
kubectl api-resources
kubectl api-versions
kubectl explain pod
kubectl explain pod.spec
kubectl explain pod.spec.containers
```

## Labels and Annotations
```bash
kubectl label pod nginx env=prod
kubectl label pod nginx env-
kubectl annotate pod nginx description="web server"
kubectl annotate pod nginx description-
kubectl get pods --show-labels
kubectl get pods -l env=prod
kubectl get pods -l 'env in (prod,dev)'
kubectl get pods -l env!=prod
```

## Troubleshooting
```bash
kubectl get events
kubectl get events --sort-by=.metadata.creationTimestamp
kubectl cluster-info
kubectl cluster-info dump
kubectl version
kubectl get componentstatuses
kubectl get cs
```

## Networking
```bash
kubectl get networkpolicies
kubectl get netpol
kubectl describe networkpolicy deny-all
kubectl delete networkpolicy deny-all
```

## Persistent Volumes
```bash
kubectl get persistentvolumes
kubectl get pv
kubectl get persistentvolumeclaims
kubectl get pvc
kubectl describe pv pv-name
kubectl describe pvc pvc-name
kubectl delete pvc pvc-name
```

## Context and Config
```bash
kubectl config view
kubectl config get-contexts
kubectl config current-context
kubectl config use-context context-name
kubectl config set-context context-name --namespace=namespace-name
```

## Output Formats
```bash
kubectl get pods -o json
kubectl get pods -o yaml
kubectl get pods -o wide
kubectl get pods -o name
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'
kubectl get pods --sort-by=.metadata.name
kubectl get pods --sort-by=.metadata.creationTimestamp
```

## Imperative Commands
```bash
kubectl run nginx --image=nginx --port=80 --expose
kubectl run nginx --image=nginx --env="VAR1=value1"
kubectl run nginx --image=nginx --command -- /bin/sh -c "sleep 3600"
kubectl run nginx --image=nginx --requests="cpu=100m,memory=128Mi"
kubectl run nginx --image=nginx --limits="cpu=200m,memory=256Mi"
kubectl run nginx --image=nginx --restart=OnFailure
kubectl run nginx --image=nginx --schedule="0 0 * * *"
```