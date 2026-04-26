function getWebhookURL(url) {
  return "http://localhost:5050";
}

function getID(url_string) {
  try {
    const url = new URL(url_string);
    if (!url.hostname.includes("youtube.com")) return null;
    return url.searchParams.get("v");
  } catch (e) {
    return null;
  }
}

// Update icon with text badge
// status: 'success' = green check, 'error' = red cross, 'default' = no badge
function updateIcon(status) {
  if (status === 'success') {
    chrome.action.setBadgeText({text: "✓"});
    chrome.action.setBadgeBackgroundColor({color: "#4CAF50"});
    console.log("Icon updated: chords available (green ✓)");
  } else if (status === 'error') {
    chrome.action.setBadgeText({text: "✕"});
    chrome.action.setBadgeBackgroundColor({color: "#F44336"});
    console.log("Icon updated: chords not available (red ✕)");
  } else {
    chrome.action.setBadgeText({text: ""});
    console.log("Icon updated: badge cleared");
  }
}

function getImgName(name) {
  var arr = name.split("/")[0].split(":");

  var chord = normalizeChordForImage(arr[0]);

  if (chord[chord.length - 1] == "#")
    chord = chord.slice(0, chord.length - 1) + "s";
  // console.log(name, arr);

  return chord + "_" + arr[1] + ".png";
}

function normalizeChordForImage(chord) {
  if (chord == "A#")
    return "Bb";
  if (chord == "D#")
    return "Eb";
  if (chord == "Db")
    return "C#";
  if (chord == "G#")
    return "Ab";
  if (chord == "Gb")
    return "F#";

  return chord;
}

function generateChordsURL(chords) {
  var x = []
  for (var i = 0; i < chords.length; i++)
    if (chords[i][1] >= 6)
      x.push([chrome.runtime.getURL("chords/" + getImgName(chords[i][0])), chords[i][1]]);
  return x
}

function getUniqueChords(data) {
  data = data.split("\n");

  // UNIQUE ELEMENTS
  var dict = {};
  for (var i = 0; i < data.length; i++) {
    const chord = data[i].split(";")[1];
    if (chord == "N" || chord == undefined) continue;
    if (!(chord in dict))
      dict[chord] = 0;
    dict[chord]++;
  }

  //  SORTING
  var items = Object.keys(dict).map(function (key) {
    return [key, dict[key]];
  });
  items.sort(function (first, second) {
    return second[1] - first[1];
  });

  console.log(items);

  return items;
}

function sendMsg(msg, tabId) {
  chrome.tabs.sendMessage(tabId, msg)
    .then((response) => {
      console.log("Message sent to tab " + tabId + ", response:", response);
    })
    .catch((error) => {
      // Script likely not injected yet or tab closed.
      console.log("Could not send message to tab " + tabId + ": " + error.message);
    });
}

function handleResponse(data, tabId) {
  const summary = data["chord_summary"];
  const chordify_url = data["url"];
  const all_chords = getUniqueChords(data["chords"]);
  const chords = generateChordsURL(all_chords);

  console.log(chords);

  // Update icon to green if chords are available
  if (chords && chords.length > 0) {
    updateIcon('success');
  } else {
    updateIcon('error');
  }

  // Check if injection is disabled
  chrome.storage.local.get(["disableInjection"], function(result) {
    if (result.disableInjection) {
      console.log("Injection disabled, skipping content script message");
      return;
    }
    
    sendMsg({
      message: summary,
      url: chordify_url,
      chord: chords,
      host: "youtube.com"
    }, tabId);
  });
}

async function OnYoutubeLoad(details) {
  console.log("OnYoutubeLoad: ", details);
  const url = details.url;
  const id = getID(url);
  if (!id) return;

  // Reset icon to default when new video loads
  updateIcon('default');

  const chordify_api = "https://chordify.net/song/data/youtube:" + id + "?vocabulary=extended_inversions";
  const webhook = getWebhookURL(url);

  // Try server first, fall back to direct browser request if it fails
  try {
    console.log("Trying server proxy...");
    const response = await fetch(webhook, {
      method: "POST",
      body: chordify_api
    });

    if (response.ok) {
      const text = await response.text();
      console.log("Received Response from server", text);

      if (text === "") {
        updateIcon('error');
        chrome.storage.local.get(["disableInjection"], function(result) {
          if (!result.disableInjection) {
            sendMsg({
              message: "Na",
              url: undefined,
              chord: undefined,
              host: "youtube.com"
            }, details.tabId);
          }
        });
      } else {
        handleResponse(JSON.parse(text), details.tabId);
      }
      return;
    } else {
      console.log("Server returned", response.status, "- falling back to direct request");
    }
  } catch (err) {
    console.log("Server failed, falling back to direct request:", err.message);
  }

  // Fallback: Direct request from browser (Cloudflare won't block legitimate browser traffic)
  try {
    console.log("Trying direct browser request...");
    const response = await fetch(chordify_api, {
      method: "GET",
      headers: {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "referer": "https://chordify.net/"
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Received Response from Chordify (direct)", data);
      handleResponse(data, details.tabId);
    } else {
      console.error("Chordify direct request failed:", response.status);
      updateIcon('error');
      chrome.storage.local.get(["disableInjection"], function(result) {
        if (!result.disableInjection) {
          sendMsg({
            message: "Error: Chordify returned " + response.status,
            url: undefined,
            chord: undefined,
            host: "youtube.com"
          }, details.tabId);
        }
      });
    }
  } catch (err) {
    console.error("Direct fetch failed:", err);
    updateIcon('error');
    chrome.storage.local.get(["disableInjection"], function(result) {
      if (!result.disableInjection) {
        sendMsg({
          message: "Error: " + err.message,
          url: undefined,
          chord: undefined,
          host: "youtube.com"
        }, details.tabId);
      }
    });
  }
}

function handleYoutubeUrlChange(tabId, changeInfo, tabInfo) {
  // Use either the changed URL or the tab's existing URL if it's a complete load
  const url = changeInfo.url || tabInfo.url;
  if (url && (changeInfo.url || changeInfo.status === 'complete')) {
    if (url.includes("youtube.com")) {
      console.log("Tab: " + tabId + " YouTube event: " + (changeInfo.status || "URL change"));
      OnYoutubeLoad({ url: url, tabId: tabId });
    }
  }
}

chrome.tabs.onUpdated.addListener(handleYoutubeUrlChange);

function updateIconStar() {
  chrome.action.setIcon({
    path: {
      19: "icons/star-filled-19.png",
      38: "icons/star-filled-38.png"
    }
  });
}

function updateIconDefault() {
  chrome.action.setIcon({
    path: {
      16: "icons/page-16.png",
      32: "icons/page-32.png",
      48: "icons/page-48.png"
    }
  });
}

function onChordifyLoad(details) {
  console.log("chordify url hit");
  console.log("URL: ", details.url);
  const x = details.url.split("/");
  const name = x[x.length - 1];
  chrome.storage.local.get(null, function (data) {
    if (name in data) {
      console.log("FAV :3");
      updateIconStar();
    } else {
      updateIconDefault();
      console.log("N FAV");
    }
  });
}

chrome.webRequest.onBeforeRequest.addListener(
  onChordifyLoad,
  { urls: ["*://*.chordify.net/chords/*"] }
);

// Re-inject content script on YouTube navigation (SPA handling)
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.url.includes("youtube.com/watch")) {
    console.log("YouTube navigation detected, reloading content script for tab", details.tabId);
    // Execute script again on navigation
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["script.js"]
    }).catch(err => {
      console.log("Could not re-inject script:", err.message);
    });
  }
});

// Listen for icon update requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateIcon") {
    updateIcon(message.status);
    sendResponse({status: "ok"});
  }
  if (message.action === "settingsChanged") {
    console.log("Settings changed:", message);
    sendResponse({status: "ok"});
  }
});
