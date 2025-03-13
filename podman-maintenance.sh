#!/bin/bash
# podman-maintenance.sh

case "$1" in
    start)
        podman-compose -f podman-compose.yaml up -d
        ;;
    stop)
        podman-compose -f podman-compose.yaml down
        ;;
    restart)
        podman-compose -f podman-compose.yaml down
        podman-compose -f podman-compose.yaml up -d
        ;;
    logs)
        podman-compose -f podman-compose.yaml logs -f
        ;;
    start-kube)
        podman play kube podman-kube.yaml
        ;;
    stop-kube)
        podman pod stop quizapp
        podman pod rm quizapp
        ;;
    restart-kube)
        podman pod stop quizapp
        podman pod rm quizapp
        podman play kube podman-kube.yaml
        ;;
    build)
        podman-compose -f podman-compose.yaml build
        ;;
    clean)
        podman-compose -f podman-compose.yaml down
        podman pod stop --all
        podman pod rm --all
        podman container rm -f $(podman container ls -aq) 2>/dev/null || true
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|start-kube|stop-kube|restart-kube|build|clean}"
        exit 1
esac
