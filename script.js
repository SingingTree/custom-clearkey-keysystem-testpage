/**
 * Key id for the encryption key (base64)
 */
const keyId = "ASNFZ4mrze8BI0VniavN7w";

/**
 * Encryption key (base64)
 */
const key = "_ty6mHZUMhD-3LqYdlQyEA";

/**
 * Map from key ids to actual keys. This is used when generating licenses
 */
let keyMap = new Map();
keyMap.set(keyId, key);

/**
 * Helper that returns a promise once an event is observed on target.
 * @param target the target that will be listened on for the event.
 * @param name the name of the event to listen for.
 * @returns a promise that will be resolved once the event listener triggers.
 */
async function once(target, name) {
  return new Promise((r) => target.addEventListener(name, r, { once: true }));
}

/**
 * Appends `message` to the log textarea on the page.
 */
function log(message) {
  let textArea = document.getElementById("log");

  textArea.value += message;
  textArea.value += "\n";
}

async function setupEme() {
  let mediaElement = document.getElementById("mediaElement");
  // Clear any previous media keys in case we're setting up EME again.
  mediaElement.setMediaKeys(null);

  let keySystemConfig = {
    initDataTypes: ["webm"],
    videoCapabilities: [{ contentType: 'video/webm;codecs="vp9"' }],
  };
  let config = [keySystemConfig];

  let keySystem = document.getElementById("keysystem").value;
  if (!keySystem) {
    // Default to vanilla clearkey.
    keySystem = "org.w3.clearkey";
  }

  let keySystemAccess = await navigator.requestMediaKeySystemAccess(
    keySystem,
    config
  );
  let mediaKeys = await keySystemAccess.createMediaKeys();
  await mediaElement.setMediaKeys(mediaKeys);

  mediaElement.onencrypted = async (encryptedEvent) => {
    let session = mediaElement.mediaKeys.createSession();
    session.onmessage = (messageEvent) => {
      let request = JSON.parse(new TextDecoder().decode(messageEvent.message));

      log(`Got message ${JSON.stringify(request)}`);

      let keys = [];
      for (const keyId of request.kids) {
        let key = keyMap.get(keyId);

        if (key) {
          keys.push({
            kty: "oct",
            kid: keyId,
            k: key,
          });
        }
      }

      let license = new TextEncoder().encode(
        JSON.stringify({
          keys,
          type: request.type || "temporary",
        })
      );

      let session = messageEvent.target;
      session.update(license).catch((error) => {
        log(error);
      });
    };

    session.onkeystatuseschange = async (_keystatuseschange) => {
      function bytesToHex(bytes) {
        return [...new Uint8Array(bytes)]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
      }
      for (let [keyId, status] of session.keyStatuses) {
        log(`${bytesToHex(keyId)} : ${status}`);
      }
    };

    try {
      await session.generateRequest(
        encryptedEvent.initDataType,
        encryptedEvent.initData
      );
    } catch (error) {
      log(error);
    }
  };
}

async function setupMediaSource() {
  let mediaElement = document.getElementById("mediaElement");

  let mediaSource = new MediaSource();
  mediaElement.src = URL.createObjectURL(mediaSource);
  await once(mediaSource, "sourceopen");
  const sourceBuffer = mediaSource.addSourceBuffer("video/webm");
  const videoFile = "big-buck-bunny-trailer-video-cenc.webm";
  let fetchResponse = await fetch(videoFile);
  sourceBuffer.appendBuffer(await fetchResponse.arrayBuffer());
  await once(sourceBuffer, "updateend");
  mediaSource.endOfStream();
  await once(mediaSource, "sourceended");
}

async function setupMedia() {
  let mediaElement = document.getElementById("mediaElement");
  mediaElement.addEventListener("error", (e) => {
    log("mediaElement error handler: Got error!: " + e);
  });

  setupEme();
  setupMediaSource();
}

/**
 * Programmatically setup our event handlers and get the page ready.
 */
function setupPage() {
  let requestAccessButton = document.getElementById("requestAccess");
  requestAccessButton.onclick = setupMedia;
  setupMedia();
}
