#!/bin/sh
# Starts a virtual display for Chrome, then the scraper.
#
# We deliberately avoid `xvfb-run`: inside a container it waits for a SIGUSR1 from Xvfb that never
# arrives when it is the first process, so `node` is never started. Waiting for the display's
# socket works everywhere.

DISPLAY_NUM=99
export DISPLAY=":${DISPLAY_NUM}"

# a restarted container keeps its filesystem, so clear a stale lock from the previous run
rm -f "/tmp/.X${DISPLAY_NUM}-lock" "/tmp/.X11-unix/X${DISPLAY_NUM}"

Xvfb "$DISPLAY" -screen 0 1366x768x24 -nolisten tcp >/dev/null 2>&1 &

# wait up to ~10s for the display socket
i=0
while [ ! -S "/tmp/.X11-unix/X${DISPLAY_NUM}" ] && [ "$i" -lt 100 ]; do
  i=$((i + 1))
  sleep 0.1
done

if [ ! -S "/tmp/.X11-unix/X${DISPLAY_NUM}" ]; then
  echo "[start] WARNING: virtual display did not start; Chrome will not be able to open a window" >&2
fi

exec node server.mjs
