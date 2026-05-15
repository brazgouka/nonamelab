# Deployment Guide — GCP Free Tier (Always Free)

## Architecture

| Component | What | Cost |
|---|---|---|
| **e2-micro VM** | Runs everything (Django + Postgres) via Docker Compose | Always free (us-central1 / us-west1 / us-east1 only) |
| **30 GB persistent disk** | VM storage | Always free |
| **Caddy** | Reverse proxy + automatic HTTPS | Free (open source) |
| **DuckDNS** | Free subdomain (`yourname.duckdns.org`) | Always free |

**Total: $0/month.**

The setup is identical to local dev — Docker Compose runs on the VM. Caddy sits in front and handles HTTPS automatically via Let's Encrypt.

> **Limitation:** e2-micro has 1 vCPU (shared) and 1 GB RAM. Fine for personal use.

---

## Step 1 — Create the VM

In the [GCP Console](https://console.cloud.google.com/compute/instances), click **Create Instance** with these settings:

| Field | Value |
|---|---|
| Name | `homelab` |
| Region | `us-central1` (or `us-west1` / `us-east1`) — **must be one of these for free tier** |
| Machine type | `e2-micro` |
| Boot disk | Debian 12, **30 GB standard disk** |
| Firewall | Check **Allow HTTP traffic** and **Allow HTTPS traffic** |

Or via CLI:
```bash
gcloud compute instances create homelab \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --tags=http-server,https-server

# Allow HTTP and HTTPS through the firewall:
gcloud compute firewall-rules create allow-http  --allow tcp:80  --target-tags http-server
gcloud compute firewall-rules create allow-https --allow tcp:443 --target-tags https-server
```

Note the **External IP** of the VM — you'll need it for the domain setup.

---

## Step 2 — Get a free domain (DuckDNS)

1. Go to [duckdns.org](https://www.duckdns.org) and sign in with Google or GitHub
2. Pick a subdomain name (e.g. `myhomelab`) → you get `myhomelab.duckdns.org`
3. Enter your VM's **External IP** in the IP field and click **Update IP**

Your domain now points to your VM. It's instant.

---

## Step 3 — SSH into the VM

```bash
gcloud compute ssh homelab --zone=us-central1-a
```

All remaining steps run inside this SSH session.

---

## Step 4 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker   # apply group change without re-logging in
```

---

## Step 5 — Add swap (prevents out-of-memory during builds)

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Step 6 — Copy the project to the VM

**Option A — from GitHub (recommended):**
```bash
sudo apt install -y git
git clone https://github.com/yourusername/homelab.git
cd homelab
```

**Option B — from your local machine:**
```bash
# Run this on your local machine (not inside the VM):
gcloud compute scp --recurse /path/to/homelab homelab:~ --zone=us-central1-a
```
Then inside the VM: `cd homelab`

---

## Step 7 — Build the frontend

```bash
# Install Node.js:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

cd frontend
npm install
npm run build
cd ..
```

---

## Step 8 — Configure environment

```bash
cp .env.example .env
nano .env
```

Set these values:
```
SECRET_KEY=<generate with: python3 -c "import secrets; print(secrets.token_urlsafe(50))">
APP_PASSWORD=<your login password>
DB_PASSWORD=<strong random password>
ALLOWED_HOSTS=myhomelab.duckdns.org
DJANGO_SETTINGS_MODULE=config.settings.production
```

Leave `DB_NAME`, `DB_USER`, `DB_HOST`, `DB_PORT` as their defaults — the Postgres container handles those.

---

## Step 9 — Start the app

```bash
docker compose up -d --build
```

This builds the image, starts Postgres and Django, and runs migrations. First run takes 3–5 minutes.

Verify it's running:
```bash
docker compose logs -f web
```

You should see gunicorn workers starting. The app is now accessible on port 8000 internally.

---

## Step 10 — Install Caddy (HTTPS reverse proxy)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Configure Caddy to proxy to your app:
```bash
sudo nano /etc/caddy/Caddyfile
```

Replace the entire contents with:
```
myhomelab.duckdns.org {
    reverse_proxy localhost:8000
}
```

Apply the config:
```bash
sudo systemctl reload caddy
```

Caddy automatically obtains and renews a free Let's Encrypt TLS certificate. Within a minute, your app is live at `https://myhomelab.duckdns.org` with a valid HTTPS certificate.

---

## Step 11 — Verify

Open `https://myhomelab.duckdns.org` in your browser. You should see the password login screen.

Check Caddy logs if something doesn't work:
```bash
sudo journalctl -u caddy -f
```

---

## Auto-start on reboot

Docker Compose services already restart automatically (`restart: unless-stopped` in `docker-compose.yml`). Caddy is a systemd service and also auto-starts. Nothing extra needed.

---

## Updating the app

SSH into the VM, then:

```bash
cd homelab

# Pull latest code:
git pull

# Rebuild the frontend if you changed frontend files:
cd frontend && npm run build && cd ..

# Rebuild and restart:
docker compose up -d --build
```

Migrations run automatically on startup (the `docker-compose.yml` web command runs `migrate` before gunicorn).

---

## Useful commands

| Command | What it does |
|---|---|
| `docker compose ps` | Show running containers |
| `docker compose logs -f web` | Stream app logs |
| `docker compose logs -f db` | Stream database logs |
| `docker compose restart web` | Restart the app |
| `docker compose exec db psql -U homelab homelab` | Open a psql shell |
| `docker compose down` | Stop everything |
| `sudo systemctl status caddy` | Check Caddy status |
| `sudo journalctl -u caddy -f` | Stream Caddy logs |

---

## Local development (unchanged)

```bash
cp .env.example .env
# Edit .env — set APP_PASSWORD and other values

docker compose up
```

The app runs at `http://localhost:8000`.
