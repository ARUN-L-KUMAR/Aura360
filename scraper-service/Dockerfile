# Official Playwright image: Chromium and all system libraries are already installed.
# Keep the tag in sync with the "playwright" version in package.json.
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
# Real Google Chrome: Ajio and Amazon accept it where they reject the bundled headless Chromium
RUN npx playwright install chrome
COPY server.mjs ./

ENV NODE_ENV=production
ENV BROWSER_CHANNEL=chrome
EXPOSE 3001
# xvfb-run gives Chrome a virtual display so it can run as a normal (non-headless) window
CMD ["xvfb-run", "-a", "--server-args=-screen 0 1366x768x24", "node", "server.mjs"]
