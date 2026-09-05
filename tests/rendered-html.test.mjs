import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the scroll tunnel experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Void Atlas — Navigate Deep Space<\/title>/i);
  assert.match(html, /class="tunnel-experience"/i);
  assert.match(html, /src="\/tunnel-source\.mp4\?v=2"/i);
  assert.match(html, /WE TURN THE UNKNOWN INTO A MAP/);
  assert.match(html, /EVERY SIGNAL/);
  assert.match(html, /A DIRECTION/);
  assert.match(html, /<form\b[^>]*class="cosmic-feedback"/);
  assert.match(html, /name="email"/);
  assert.match(html, /name="message"/);
  assert.doesNotMatch(html, /SCROLL TO ENTER|vpn-background|codex-preview/i);
});

test("includes the active video in source and production output", async () => {
  const [sourceVideo, builtVideo] = await Promise.all([
    readFile(new URL("public/tunnel-source.mp4", projectRoot)),
    readFile(new URL("dist/client/tunnel-source.mp4", projectRoot)),
  ]);

  assert.equal(sourceVideo.toString("ascii", 4, 8), "ftyp");
  assert.ok(sourceVideo.length > 0);
  assert.deepEqual(builtVideo, sourceVideo);
  await access(new URL("dist/client/favicon.svg", projectRoot));
});
