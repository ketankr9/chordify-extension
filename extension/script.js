// Prevent multiple injections
if (window.chordifyExtensionLoaded) {
  console.log("Chordify extension already loaded, skipping...");
} else {
  window.chordifyExtensionLoaded = true;

  // Chord display container ID
  const CHORD_CONTAINER_ID = "chordify-extension-chords";

  // Create the chord display container
  function createChordContainer() {
    // Check if already exists
    if (document.getElementById(CHORD_CONTAINER_ID)) {
      return document.getElementById(CHORD_CONTAINER_ID);
    }

    // Create container
    const container = document.createElement("div");
    container.id = CHORD_CONTAINER_ID;
    container.style.cssText = `
      margin: 16px 24px;
      padding: 16px;
      background: #f8f8f8;
      border-radius: 12px;
    `;

    // Title
    const title = document.createElement("h3");
    title.textContent = "🎸 Chords";
    title.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #0f0f0f;
    `;
    container.appendChild(title);

    // Chord images grid
    const chordGrid = document.createElement("div");
    chordGrid.id = CHORD_CONTAINER_ID + "-grid";
    chordGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 12px;
      justify-items: center;
    `;
    container.appendChild(chordGrid);

    // Chordify link
    const linkContainer = document.createElement("div");
    linkContainer.style.cssText = `
      margin-top: 12px;
      text-align: center;
    `;
    const link = document.createElement("a");
    link.textContent = "View on Chordify.net";
    link.target = "_blank";
    link.style.cssText = `
      color: #065fd4;
      text-decoration: none;
      font-size: 14px;
    `;
    linkContainer.appendChild(link);
    container.appendChild(linkContainer);

    return container;
  }

  function setChordImages(gridEle, imageUrls, chordifyUrl) {
    console.log("Setting chord images:", imageUrls);
    gridEle.innerHTML = ""; // Clear existing

    for (let i = 0; i < imageUrls.length; i++) {
      const chord = document.createElement("img");
      chord.setAttribute("src", imageUrls[i][0]);
      chord.setAttribute("title", imageUrls[i][1]);
      chord.style.cssText = `
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      `;
      gridEle.appendChild(chord);
    }

    // Update the link
    const container = gridEle.parentElement;
    const link = container.querySelector("a");
    if (link && chordifyUrl) {
      link.href = chordifyUrl;
    }
  }

  function injectChords(request) {
    const container = createChordContainer();
    const grid = document.getElementById(CHORD_CONTAINER_ID + "-grid");

    if (request.message == "Na") {
      grid.innerHTML = '<p style="color: #666; font-size: 14px;">No chords available :(</p>';
    } else {
      setChordImages(grid, request.chord, request.url);
      // Notify background script to update icon to green
      try {
        chrome.runtime.sendMessage({action: "updateIcon", status: "success"});
      } catch (e) {
        // Ignore if background not ready
      }
    }

    // Inject after top-row if not already injected
    if (!document.getElementById(CHORD_CONTAINER_ID)) {
      const topRow = document.getElementById("top-row");
      if (topRow) {
        topRow.after(container);
        console.log("Chords injected successfully after #top-row");
      } else {
        console.log("#top-row not found, retrying...");
        setTimeout(() => injectChords(request), 500);
      }
    }
  }

  function handleMessage(request, sender, sendResponse) {
    console.log("=== CHORDIFY MESSAGE RECEIVED ===");
    console.log("Request URL:", request.url);
    console.log("Request message:", request.message);
    console.log("Chords data:", request.chord);
    console.log("Current page URL:", window.location.href);
    console.log("#top-row exists:", !!document.getElementById("top-row"));
    console.log("Primary-inner exists:", !!document.querySelector("#primary-inner"));

    // First check if top-row exists
    const topRow = document.getElementById("top-row");
    if (topRow) {
      console.log("Injecting chords immediately...");
      injectChords(request);
    } else {
      console.log("#top-row not found, waiting for it to load...");
      // Wait for top-row to load
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds
      const checkInterval = setInterval(() => {
        attempts++;
        const topRowNow = document.getElementById("top-row");
        console.log(`Attempt ${attempts}/${maxAttempts}: #top-row exists:`, !!topRowNow);
        if (topRowNow) {
          clearInterval(checkInterval);
          console.log("Injecting chords after waiting...");
          injectChords(request);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.log("Max attempts reached, #top-row not found");
          // Fallback: try primary-inner
          const primaryInner = document.querySelector("#primary-inner");
          if (primaryInner) {
            console.log("Fallback: injecting into #primary-inner");
            injectChords(request);
          }
        }
      }, 500);
    }

    // If no chords, reset icon to error
    if (request.message == "Na") {
      try {
        chrome.runtime.sendMessage({action: "updateIcon", status: "error"});
      } catch (e) {
        // Ignore if background not ready
      }
    }

    // Send response to indicate message was received
    sendResponse({status: "received"});
    return true; // Keep the message channel open for async response
  }

  chrome.runtime.onMessage.addListener(handleMessage);

  console.log("Chordify content script loaded.");
}
