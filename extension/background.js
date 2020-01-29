function generateURL(url){
  return "http://localhost:5000"
  // return "https://chordify.net/song/data/youtube:u5fVUc_sOog?vocabulary=extended_inversions";
}

function getID(url_string){
  const url = new URL(url_string);
  return url.searchParams.get("v");
}

function generateChordsURL(summary){
  var x = []
  for(chord in summary){
    
  }
}

function handleResponse(data){
  const summary = data["chord_summary"];
  const chordify_url = data["url"];
  
  const chords = generateChordsURL(summary);

  function messageTab(tabs) {
    browser.tabs.sendMessage(tabs[0].id, {
      message: summary,
      chord: chords //browser.extension.getURL("chords/C_maj.png")
    });
  }

  function onExecuted(result) {
      var querying = browser.tabs.query({
          active: true,
          currentWindow: true
      });
      querying.then(messageTab);
  }

  let executing = browser.tabs.executeScript({
      file: "script.js"
    });
  executing.then(onExecuted);

}

function OnYoutubeLoad(details){
  console.log("DomLoaded: " + details.url);

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
        handleResponse(JSON.parse(xhr.response));
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