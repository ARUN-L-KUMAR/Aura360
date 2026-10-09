# Aura360 scraper service

Opens shopping product pages (Amazon, Flipkart, Myntra, Meesho, Ajio) in a real Chromium browser and returns the
rendered HTML. The Aura360 app parses it into name, brand, price and photos. It runs on your own server, so shops see
your connection's IP (a home connection is far less likely to be blocked than a cloud server).

## Run it on the server laptop

```bash
cd scraper-service
cp .env.example .env
# put a random secret in SCRAPER_SERVICE_KEY:
echo "SCRAPER_SERVICE_KEY=$(openssl rand -hex 32)" > .env
docker compose up -d --build

curl http://127.0.0.1:3001/health        # {"ok":true,...}
```

Test a real render (replace KEY and the link):

```bash
curl -s -X POST http://127.0.0.1:3001/render \
  -H "Content-Type: application/json" -H "x-api-key: KEY" \
  -d '{"url":"https://amzn.in/d/0aRyMZcy"}' | head -c 400
```

## Connect the Aura360 app

Add to the app's `.env.local`:

```
SCRAPER_SERVICE_URL=http://localhost:3001        # app on the same laptop
SCRAPER_SERVICE_KEY=<same value as in scraper-service/.env>
```

If the app is deployed somewhere else (Vercel, VPS), the laptop must be reachable from the internet, see below, and
`SCRAPER_SERVICE_URL` becomes `https://scraper.makefans.online`.

## Expose it with Cloudflare Tunnel (only if the app is not on the same laptop)

No router ports and no static IP needed; also works on mobile data.

1. Put `makefans.online` on Cloudflare (nameservers) if it is not already.
2. Cloudflare Zero Trust, Networks, Tunnels, Create tunnel (Cloudflared). Copy the tunnel token.
3. In the tunnel, add a public hostname: `scraper.makefans.online` pointing to `http://scraper:3001`.
4. Add `CLOUDFLARE_TUNNEL_TOKEN=<token>` to `scraper-service/.env`, then:

```bash
docker compose --profile tunnel up -d
```

The service rejects every request without the `x-api-key` header, only fetches the five shopping sites, and refuses
to follow redirects to other hosts.

## Notes

- The laptop must be on and online. If it is off, the app falls back to a plain fetch and then ScraperAPI (if
  `SCRAPER_API_KEY` is set), otherwise the user fills the form manually.
- `MAX_CONCURRENT` (default 2) limits parallel browser pages.
- Keep the `playwright` version in `package.json` equal to the image tag in the `Dockerfile`.
