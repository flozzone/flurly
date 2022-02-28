[![Publish Docker image](https://github.com/flozzone/flurly/actions/workflows/publish-docker-image.yaml/badge.svg)](https://github.com/flozzone/flurly/actions/workflows/publish-docker-image.yaml)
[![Deployment pipeline](https://github.com/flozzone/flurly/actions/workflows/minikube-test.yaml/badge.svg)](https://github.com/flozzone/flurly/actions/workflows/minikube-test.yaml)

# Flurly

Flurly is based on [NodeJS](https://nodejs.org/en/) and starts a [ExpressJS](https://expressjs.com/de/)
web server providing a few HTTP endpoints to show how this application behaves when run inside a K8s cluster.

## API

The API provided lets us interact with the application in a simple way.

|  Path   | Method |                         Description                             |
|---------|--------|-----------------------------------------------------------------|
| /       | GET    | Welcome response                                                |
| /health | GET    | Returns HTTP 200 status if everything is ok, HTTP 500 otherwise |
| /fail   | POST   | Lets `/health` return HTTP 500                                  |
| /stop   | POST   | Application exits with exit code 0                              |
| /crash  | POST   | Application exits with exit code 1                              |

## Prepare the K8s environment

For this task we will use [Minikube](https://minikube.sigs.k8s.io/docs/start/) which can run a recent
single node Kubernetes cluster on a docker container. It is easy to set-up and provides all the K8s
features we depend on in this task.

```shell
# start minikube k8s cluster
minikube start

# create a separate namespace
kubectl create namespace flurly

# and change the context to it
kubectl config set-context --current --namespace=flurly
```

## Building container image

We can build a docker container image with the following command. But we don't have to since
the current version is available at [Docker Hub](https://hub.docker.com/r/florinzz/flurly). A custom-built
version can be used throughout this example by changing the image path in the configuration file.

```shell
docker build -t flurly
```

## Run Flurly with docker

We will first run the plain container with docker to see if it starts up. The web server listens on
port 3000 on the container, therefore we expose this port to our local machine.

```shell
docker run -d --rm -p 8080:3000 flurly

# stop the running container again
curl -X POST http://localhost:8080/stop
```

## Push our container image

In order to run the previously built container image inside the minikube cluster, we need to first
push it to a registry, from which the image can be pulled. Since this project already pushes
container builds on a public registry, there is no real need for this step, but we will go through
it.

To use a private insecure container registry we need to ensure that it is available at `localhost:5000`,
this registry is usually available as valid insecure (Non SSL) registry.

```shell
# we want to run our own registry inside minikube
minikube addons enable registry

# port forward service to localhost. leave this terminal open
kubectl port-forward -n kube-system service/registry 5000:80
```

We will now re-tag the previously built container to point to out private registry in the minikube
cluster.

```shell
docker tag flurly localhost:5000/flurly:latest
```

and we will push the image to the private registry inside our Minikube K8s cluster 

```shell
docker push localhost:5000/flurly:latest
```

We can now stop the `kubectl port-forward` command from before. 

## Run Flurly on K8s as Pod

The container image should now be available inside the cluster, either in the private registry at
`localhost:5000/flurly:latest` or on the public registry at `florinzz/flurly:latest`. We can now run
a simple a [Pod](https://kubernetes.io/de/docs/concepts/workloads/pods/) to check if the image can be
pulled.

```shell
# start a pod running our application from the private registry or
kubectl run flurly --image=localhost:5000/flurly:latest --port=3000

# or the public registry
kubectl run flurly --image=florinzz/flurly:latest --port=3000
```

We will use the Docker Hub registry in the following steps.

```shell
# port forward the container port to our local host and keep this running
kubectl port-forward pod/flurly 8080:3000
export URL=http://localhost:8080

# query its root path
curl $URL
```

## Basic monitoring in K8s

We have already used monitoring already from the beginning by running the first docker container.
See the `STATUS` column of the `docker ps` output. (`HEALTHCHECK` command in the [Dockerfile](Dockerfile)).
In Kubernetes `readinessProbes` and `livenessProbes` are used to query the application for its current
state (See [Readiness and Liveness probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/))
Our pods are configured in the way that both probes query the `/health` endpoint of our application.

```shell
# show what the app returns at its root path
curl $URL

# check its health state as a probe would do
curl $URL/health

# and its status code
curl -I $URL/health
```

Whereas the following configuration part of the container template is responsible to enable the automatic
probes for liveness to check if the pod is still alive after running a while and readiness to check when
the pod is ready after starting up.

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 2
  periodSeconds: 1
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 2
  periodSeconds: 1
```

To simulate an application crash we can use Flurly's `/crash` endpoint. This immediately exits the
process with a failure status code.

```shell
# we can now let the app crash and exit with 1
curl -X POST $URL/crash

# the pod gets restarted, because the process returned with error
kubectl get pod/flurly

# gracefully stop by returning with 0
curl -X POST $URL/stop

# the pod went into completed state and won't restart when not otherwise configured (See restartPolicy)
kubectl get pod/flurly
```

This shows simple but effective monitoring functionality of Kubernetes. We will later see further
uses of monitoring.

## Run multiple Flurlies and load balance

We will use a [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) resource
to define a pod template which creates 
[ReplicaSets](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/) that manage 
multiple pods of the same application.

```shell
# create the deployment with pod template
kubectl apply -f k8s/deployment.yaml
```

We will now create a K8s [Service](https://kubernetes.io/docs/concepts/services-networking/service/) 
resource to bundle multiple pods together to one `ClusterIP` according to the pods `app=flurly` label.

```shell
# create a load-balancing service for port 3000
kubectl expose deployment flurly --port=3000

# connect to a pod through a service resource
kubectl port-forward service/flurly 8080:3000

export URL=http://localhost:8080

# we can query the pods name
curl $URL

# scale pod count up to 3
kc scale deploy/flurly --replicas=3

# kill a pod
curl -X POST $URL/crash

# and see who responds then
curl $URL

# lets repeat this
for i in {1..100}; do curl $URL; done
```

To evenly distribute load among the available pods within a service, we use the 
[Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/) to do path based routing
and load balancing using the [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
resource to register our service as `flurly.info`.

```shell
# enable the ingress addon of Minikube
minikube addons enable ingress

# create the Ingress resource
kubectl apply -f k8s/ingress.yaml

# this exposes our application at address
export IP=$(kubectl get ing/flurly -o json | jq -r '.status.loadBalancer.ingress[0].ip')

# because contacting the IP directly would return 404
curl http://$IP

# to send correct SNI information we'll add this IP with the hostname to the hosts list
echo "$IP    flurly.info" | sudo tee -a /etc/hosts

# and use the hostname from the Ingress to access the service
export URL=http://flurly.info
````

We are now able to access our application through a load balancer.

```shell
# now we get responses from different pods
for i in {1..100}; do curl $URL; done

# we can let all pods crash
for i in {1..10}; do curl -X POST $URL/crash; done

# until there is no pod left to respond
kubectl get pod

# until a pod restarts and passes the readinessProbe again
curl $URL

# and we can see that the traffic is evenly distributed between the available pods
for i in {1..100}; do curl -s $URL; done | sort | uniq -c
```

## remove everything again

Since we were just working in one namespace and not creating any cluster wide resources, we can remove all
created resources by deleting our namespace.

```shell
kubectl delete namespace flurly
```

## Helm chart

A [Helm](https://helm.sh/) chart is provided to easier deploy this example to a K8s cluster by issuing just one command.

```shell
helm install flurly charts/flurly
```

One can provide template parameters using the command line or separate `values.yaml` files. Uninstalling
is as easy as installing:

```shell
helm uninstall flurly
```