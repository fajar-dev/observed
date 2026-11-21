# Observed

Observed provides custom dashboards for **structural health monitoring**. It helps civil engineers, contractors, and building or bridge owners monitor IoT sensor metrics from multiple InfluxDB sources in one application.

Build dashboards with visualization panels, sensor filters, collapsible rows, drag-and-resize layouts, and kiosk mode. Alert rules monitor sensor thresholds and deliver realtime in-app notifications and messages to multiple Telegram destinations. Admin, Editor, and Viewer roles work with access permissions for individual dashboards and alerts.

Observed uses Nuxt, Nuxt UI, Bun, and PostgreSQL for application configuration. Sensor measurements remain in InfluxDB.

## Run with Docker

Install Docker Engine, Docker Compose v2.20+, and OpenSSL, then run from the repository root:

```sh
sh docker/setup.sh
sh docker/compose.sh up -d --build --wait
```

Open **http://localhost:3000/sign-in** and create the first administrator. The stack runs Observed and PostgreSQL. Connect your existing InfluxDB sources after signing in.

## Documentation

Read the **[complete documentation](docs/README.md)** for user, developer, and AI coding agent guides. See the **[Docker guide](docs/installation/docker.md)** for deployment, ports, backups, and recovery.
