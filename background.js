// background.js — MV3 service worker that calls local Flask API

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "PREDICT") return;

  (async () => {
    try {
      const features = msg.features;
      console.log("[bg] sending features to server:", features);

      const resp = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features })
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error("[bg] server HTTP error:", resp.status, text);
        sendResponse({
          ok: false,
          error: "Server HTTP " + resp.status
        });
        return;
      }

      const data = await resp.json();
      console.log("[bg] server response JSON:", data);

      // Expecting { ok: true, score: <prob_fake_between_0_and_1> }
      if (!("score" in data)) {
        sendResponse({
          ok: false,
          error: "Bad response: no score field"
        });
        return;
      }

      sendResponse({ ok: true, score: data.score });
    } catch (e) {
      console.error("[bg] fetch error:", e);
      sendResponse({
        ok: false,
        error: String(e && e.message ? e.message : e)
      });
    }
  })();

  // keep the channel open for async reply
  return true;
});
