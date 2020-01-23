function generateURL(url){
  return "http://localhost:5000"
  // return "https://chordify.net/song/data/youtube:u5fVUc_sOog?vocabulary=extended_inversions";
}

function getID(url_string){
  const url = new URL(url_string);
  return url.searchParams.get("v");
}

function getImgName(name){
    var arr = name.split(":");

    if(arr[0] == "A#")
      arr[0] = "Bb";
    else if(arr[0] == "D#")
      arr[0] = "Eb";
    else if(arr[0] == "Db")
      arr[0] = "C#";
    else if(arr[0] == "G#")
      arr[0] = "Ab";

    left = arr[0];
    if(arr[0][arr[0].length-1] == "#")
      left = arr[0].slice(0, arr[0].length-1) + "s";
    // console.log(name, arr);
    return left + "_" + arr[1] + ".png";
}

function generateChordsURL(chords){
  var x = []
  for(var i=0; i<chords.length; i++)
    if(chords[i][1] >= 6)
      x.push([browser.extension.getURL("chords/" + getImgName(chords[i][0])), chords[i][1]]);
  return x
}

function getUniqueChords(data){
    data = data.split("\n");

    // UNIQUE ELEMENTS
    var dict = {};
    for(var i=0; i<data.length; i++){
        const chord = data[i].split(";")[1];
        if(chord == "N" || chord == undefined)    continue;
        if(!(chord in dict))
            dict[chord] = 0;
        dict[chord]++;
    }

    //  SORTING
    var items = Object.keys(dict).map(function(key) {
      return [key, dict[key]];
    });
    items.sort(function(first, second) {
      return second[1] - first[1];
    });

    console.log(items);

    return items;
}

function sendMsg(msg, tabId){
  browser.tabs.executeScript(tabId, {
    file: "script.js"
  }).then(result => {
    browser.tabs.sendMessage(tabId, msg);
  });
}

function handleResponse(data, tabId){
  const summary = data["chord_summary"];
  const chordify_url = data["url"];
  const all_chords = getUniqueChords(data["chords"]);
  const chords = generateChordsURL(all_chords);
  sendMsg({
    message: summary,
    url: chordify_url,
    chord: chords
  }, tabId);
}

function OnYoutubeLoad(details){
  console.log("DomLoaded: ",details.url, details.tabId);

  const id = getID(details.url);
  const chordify_api = "https://chordify.net/song/data/youtube:" + id + "?vocabulary=extended_inversions";

  const url = generateURL(details.url);

  var xhr = new XMLHttpRequest();

  xhr.open("POST", url, true);

  xhr.onreadystatechange = function() {
    if(xhr.readyState == XMLHttpRequest.DONE){
      console.log("DONE", xhr.status);
      if(xhr.status == 200){
        // console.log("Received Response", xhr.response);
        if(xhr.response == "")
          sendMsg({
            message: "Na",
            url: undefined,
            chord: undefined
          }, details.tabId);
        else
          handleResponse(JSON.parse(xhr.response), details.tabId);
      }else
        console.log("Is the server working?");
    }
  }

  // console.log(chordify_api);
  xhr.send(chordify_api);
}

browser.webRequest.onBeforeRequest.addListener(
  OnYoutubeLoad,
  {urls: ["*://*.youtube.com/watch*"]}
);
