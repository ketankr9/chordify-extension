function getWebhookURL(url) {
  return "http://localhost:5000";
}

function getID(url_string) {
  const url = new URL(url_string);
  return url.searchParams.get("v");
}

function getImgName(name) {
  var arr = name.split("/")[0].split(":");

  var chord = normalizeChordForImage(arr[0]);

  if (chord[chord.length - 1] == "#")
    chord = chord.slice(0, chord.length - 1) + "s";
  // console.log(name, arr);

  return chord + "_" + arr[1] + ".png";
}

function normalizeChordForImage(chord){
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
      x.push([browser.extension.getURL("chords/" + getImgName(chords[i][0])), chords[i][1]]);
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
  browser.tabs.executeScript(tabId, {
    file: "script.js"
  }).then(result => {
    browser.tabs.sendMessage(tabId, msg);
  });
}

function handleResponse(data, tabId) {
  const summary = data["chord_summary"];
  const chordify_url = data["url"];
  const all_chords = getUniqueChords(data["chords"]);
  const chords = generateChordsURL(all_chords);

  console.log(chords);

  sendMsg({
    message: summary,
    url: chordify_url,
    chord: chords,
    host: "youtube.com"
  }, tabId);
}

function OnYoutubeLoad(details) {
  console.log("DomLoaded: ", details);

  const id = getID(details.url);
  const chordify_api = "https://chordify.net/song/data/youtube:" + id + "?vocabulary=extended_inversions";

  const url = getWebhookURL(details.url);

  var xhr = new XMLHttpRequest();

  xhr.open("POST", url, true);

  xhr.onreadystatechange = function () {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      console.log("Received Response", xhr.response);

      if (xhr.status == 200) {
        if (xhr.response == "")
          sendMsg({
            message: "Na",
            url: undefined,
            chord: undefined,
            host: "youtube.com"
          }, details.tabId);
        else
          handleResponse(JSON.parse(xhr.response), details.tabId);
      } else
        console.log("Is the server working?");
    }
  }

  // console.log(chordify_api);
  xhr.send(chordify_api);
}

function handleYoutubeUrlChange(tabId, changeInfo, tabInfo) {
  if (changeInfo.url) {
    console.log("Tab: " + tabId + " URL changed to " + changeInfo.url);
    OnYoutubeLoad({url: changeInfo.url, tabId: tabId});
  }
}
browser.tabs.onUpdated.addListener(handleYoutubeUrlChange, {urls: ["*://*.youtube.com/*"]});

// function showLove(tabId){
//   sendMsg({
//     message: "love",
//     url: undefined,
//     chord: undefined,
//     host : "chordify.net"
//   }, tabId);
// }

function updateIconStar() {
  browser.browserAction.setIcon({
    path: {
      19: "icons/star-filled-19.png",
      38: "icons/star-filled-38.png"
    }
  });
}

function updateIconDefault() {
  browser.browserAction.setIcon({
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
  browser.storage.local.get(null, function (data) {
    if (name in data) {
      // showLove(details.tabId);
      console.log("FAV :3");
      updateIconStar();
    } else {
      updateIconDefault();
      console.log("N FAV");
    }
  });
}

browser.webRequest.onBeforeRequest.addListener(
  onChordifyLoad,
  { urls: ["*://*.chordify.net/chords/*"] }
);
