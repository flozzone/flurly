[![Publish Docker image](https://github.com/flozzone/flurly/actions/workflows/publish-docker-image.yaml/badge.svg)](https://github.com/flozzone/flurly/actions/workflows/publish-docker-image.yaml)
[![Deployment pipeline](https://github.com/flozzone/flurly/actions/workflows/minikube-test.yaml/badge.svg)](https://github.com/flozzone/flurly/actions/workflows/minikube-test.yaml)

# Flurli

An app to show how to deploy a NodeJS application on K8s.

## Application

[server.js](server.js) is based on the sample at 

https://nodejs.org/en/knowledge/HTTP/servers/how-to-create-a-HTTP-server/

## deploy flurly

```shell
# start minikube k8s cluster
minikube start

kubectl create namespace flurly

# create the deployment with pod template
kubectl apply -f k8s/deployment.yaml

# create a service load-balancing port 3000 all pods with the app: flurly label 
kubectl expose deployment flurly --type=NodePort --port=3000
```

## see it in action

```shell
# minkube (docker) runs a node available on the host at address
kubectl get node/minikube -o json | jq -r '.status.addresses[] | select(.type=="InternalIP") | .address'

# get the cluster URL containing
export URL=$(minikube service flurly --url)

# show what the app returns at its root path
curl $URL

# check its health state
curl $URL/health
```

## let it fail

```shell
# make the app crash
curl -X POST $URL/crash

# check the health state of the failing app
curl $URL/health

# watch the READY status of the running pod
watch kubectl get pod
```

## scale it up

```shell
# scale the deployment up to 3 replicas
kubectl scale --replicas=3 deploy/flurly

# watch the READY status of the running pods
watch kubectl get pod

# check the health state of the pod selected from the load balancer
curl $URL/health
```

## remove everything again

```shell
kubectl delete namespace flurly
```
