# Official Playwright image: Chromium and all system libraries are already installed.
# Keep the tag in sync with the "playwright" version in package.json.
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
# Real Google Chrome: Ajio and Amazon accept it where they reject the bundled headless Chromium
RUN npx playwright install chrome
COPY server.mjs start.sh ./
# make sure the script has Unix line endings and is executable, whatever the checkout did to it
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

ENV NODE_ENV=production
ENV BROWSER_CHANNEL=chrome
EXPOSE 3001
# start.sh brings up a virtual display (so Chrome can run as a normal, non-headless window) and then node
CMD ["sh", "start.sh"]
