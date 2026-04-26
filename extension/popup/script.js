// global variables

document.addEventListener('DOMContentLoaded', function() {
    loadChordsForCurrentVideo();
});

// Load chords for the current YouTube video
function loadChordsForCurrentVideo() {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        if (!tabs[0] || !tabs[0].url) return;
        
        const url = tabs[0].url;
        const videoId = extractYouTubeId(url);
        
        if (!videoId) {
            showNoChords("Not a YouTube video");
            return;
        }
        
        showLoading();
        fetchChords(videoId);
    });
}

function extractYouTubeId(url) {
    try {
        const urlObj = new URL(url);
        if (!urlObj.hostname.includes("youtube.com")) return null;
        return urlObj.searchParams.get("v");
    } catch (e) {
        return null;
    }
}

function showLoading() {
    document.getElementById("chord-section").classList.add("hidden");
    document.getElementById("no-chords-section").classList.add("hidden");
    document.getElementById("loading-section").classList.remove("hidden");
}

function showNoChords(message) {
    document.getElementById("chord-section").classList.add("hidden");
    document.getElementById("loading-section").classList.add("hidden");
    document.getElementById("no-chords-section").classList.remove("hidden");
    if (message) {
        document.getElementById("no-chords-section").querySelector("p").textContent = message;
    }
}

function showChords(data, videoId) {
    document.getElementById("loading-section").classList.add("hidden");
    document.getElementById("no-chords-section").classList.add("hidden");
    
    const chordSection = document.getElementById("chord-section");
    const chordGrid = document.getElementById("chord-grid");
    const chordTitle = document.getElementById("chord-title");
    const chordifyLink = document.getElementById("chordify-link");
    
    // Update title
    chordTitle.textContent = "🎸 " + (data.title || "Chords");
    
    // Update link - Use data.url or construct from videoId
    chordifyLink.href = data.url || `https://chordify.net/chords/youtube:${videoId}`;
    
    // Parse chords
    const allChords = getUniqueChords(data.chords);
    const chordImages = generateChordsURL(allChords);
    
    // Clear grid
    chordGrid.innerHTML = "";
    
    // Add chord images
    chordImages.forEach(function(chordData) {
        const chordItem = document.createElement("div");
        chordItem.className = "chord-item";
        
        const img = document.createElement("img");
        img.src = chordData[0];
        img.alt = chordData[1];
        img.style.maxWidth = "60px";
        
        const label = document.createElement("span");
        label.textContent = chordData[1];
        
        chordItem.appendChild(img);
        chordItem.appendChild(label);
        chordGrid.appendChild(chordItem);
    });
    
    chordSection.classList.remove("hidden");
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

    return items;
}

function normalizeChordForImage(chord) {
    if (chord == "A#") return "Bb";
    if (chord == "D#") return "Eb";
    if (chord == "Db") return "C#";
    if (chord == "G#") return "Ab";
    if (chord == "Gb") return "F#";
    return chord;
}

function getImgName(name) {
    var arr = name.split("/")[0].split(":");
    var chord = normalizeChordForImage(arr[0]);
    if (chord[chord.length - 1] == "#")
        chord = chord.slice(0, chord.length - 1) + "s";
    return chord + "_" + arr[1] + ".png";
}

function generateChordsURL(chords) {
    var x = []
    for (var i = 0; i < chords.length; i++)
        if (chords[i][1] >= 6)
            x.push([chrome.runtime.getURL("chords/" + getImgName(chords[i][0])), chords[i][1]]);
    return x
}

async function fetchChords(videoId) {
    const chordifyApi = "https://chordify.net/song/data/youtube:" + videoId + "?vocabulary=extended_inversions";
    
    // Try direct browser request first (won't be blocked by Cloudflare)
    try {
        const response = await fetch(chordifyApi, {
            method: "GET",
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "referer": "https://chordify.net/"
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Chords fetched successfully:", data);
            showChords(data, videoId);
            // Notify background script to update icon
            try {
                await chrome.runtime.sendMessage({action: "updateIcon", status: "success"});
            } catch (e) {
                // Background script may not be ready, ignore
                console.log("Could not send icon update message");
            }
        } else {
            console.info("Chordify returned:", response.status);
            showNoChords("No chords available for this video");
            try {
                await chrome.runtime.sendMessage({action: "updateIcon", status: "error"});
            } catch (e) {
                console.log("Could not send icon update message");
            }
        }
    } catch (err) {
        console.error("Fetch failed:", err);
        showNoChords("Error loading chords");
        try {
            await chrome.runtime.sendMessage({action: "updateIcon", status: "error"});
        } catch (e) {
            console.log("Could not send icon update message");
        }
    }
}
