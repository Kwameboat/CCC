# Church streaming server (free)

Stream services **inside the church app** — members watch on the website (`/live`) with the
app's own player. No YouTube, Facebook or any other third-party app.

```
OBS / camera encoder / phone app ──RTMP──▶  your server (MediaMTX)  ──HTTPS/HLS──▶  church app player
```

Everything here is free and open source: **MediaMTX** (streaming), **Caddy** (free HTTPS
certificates), running on **Oracle Cloud's Always Free** server.

---

## 1. Create a free Oracle Cloud server (once)

1. Sign up at **cloud.oracle.com** → *Start for free*. Pick a **Home Region** close to your
   members (e.g. a region in Africa or Europe). Oracle asks for a card to verify you; Always
   Free resources are not charged.
2. Menu → **Compute → Instances → Create instance**.
   - **Image:** Canonical Ubuntu 24.04 (or 22.04).
   - **Shape:** *Change shape* → **Ampere (VM.Standard.A1.Flex)**, 2 OCPUs, 12 GB memory
     (well inside the free allowance).
   - **Networking:** keep "Assign a public IPv4 address" ticked.
   - **SSH keys:** *Generate a key pair* and **download the private key**.
   - Create. If Oracle says *out of capacity*, try again later or pick another availability domain.
3. Open the ports in Oracle's network firewall:
   Instance → **Subnet** → **Default Security List** → **Add Ingress Rules**, source `0.0.0.0/0`,
   TCP, destination ports **80**, **443** and **1935** (one rule each, or `80,443,1935`).

> **Keep it free and running:** Oracle may reclaim Always Free servers that stay almost idle for
> a week. Upgrading the account to *Pay As You Go* (still free if you stay within Always Free
> limits) stops that. Set a **budget alert** of $1 in Billing so you are warned if anything
> would ever cost money.

## 2. Install the streaming server

Connect to the server (replace the key file and IP):

```bash
ssh -i ssh-key.key ubuntu@YOUR.SERVER.IP
```

Then:

```bash
git clone https://github.com/Kwameboat/CCC.git
cd CCC/streaming-server
sudo bash setup.sh
```

The script asks for:
- a **broadcast password** (12+ letters/numbers — your media team uses it in OBS), and
- a **web address**: press Enter for a free `xx-xx-xx-xx.sslip.io` address, or type your own
  like `live.yourchurch.org` after pointing its DNS **A record** at the server's IP.

At the end it prints the exact settings for the console and for OBS.

## 3. Connect the church app

Console → **Online Service** → **Streaming server** → enter the *Server web address* and
*Server RTMP address* printed by the script → **Save**.

When you schedule a service, choose **Church streaming server** as the source.

## 4. Broadcast from OBS (or vMix / ATEM / Larix)

OBS → **Settings → Stream**:

| Setting | Value |
|---|---|
| Service | Custom… |
| Server | `rtmp://YOUR-ADDRESS:1935` |
| Stream Key | `live?user=publisher&pass=YOUR-BROADCAST-PASSWORD` |

**Settings → Output** (Advanced): video bitrate **2500–3500 Kbps**, keyframe interval **1 s**,
encoder x264 (or hardware), audio 128 Kbps. **Video:** 1280×720 at 30 fps is a good default.

Start streaming in OBS, then press **Go live** in the console. Members see it on `/live` within
a few seconds.

## Capacity

- Each viewer uses roughly **1–1.5 GB per hour** at 720p.
- Oracle Always Free includes about **10 TB of outgoing data per month** — several thousand
  viewer-hours. Watch usage in Oracle → Billing → Cost analysis if your audience grows.

## Recordings

Every broadcast is saved on the server in `streaming-server/recordings/live/` and deleted after
14 days. Download one with:

```bash
scp -i ssh-key.key -r ubuntu@YOUR.SERVER.IP:CCC/streaming-server/recordings/live ./
```

## Maintenance

```bash
cd ~/CCC/streaming-server
sudo docker compose ps          # is it running?
sudo docker compose logs -f     # live logs
sudo docker compose pull && sudo docker compose up -d   # update
```

Change the broadcast password: edit `pass:` under `user: publisher` in `mediamtx.yml`, then
`sudo docker compose restart mediamtx`.
