function setImage(selector, image_url){
    let chord = document.createElement("img");
    chord.setAttribute("src", image_url);
    // chord.style.height = "100vh";
    // chord.className = "beastify-image";
    document.getElementById(selector).innerText =  "";
    document.getElementById(selector).appendChild(chord);
}

function waitForElementToDisplay(selector, time, request) {
    if(document.getElementById(selector) != null) {
        var ele = document.getElementById(selector);
		console.log("elem", request);
		setImage(selector, request.chord);
		return;
    }
    else {
        setTimeout(function() {
            waitForElementToDisplay(selector, time, request);
        }, time);
    }
}

function handleMessage(request, sender, sendResponse) {
	const message = request.replacement;
	// console.log("Received", message);
  	waitForElementToDisplay("menu-container", 5000, request);
}

browser.runtime.onMessage.addListener(handleMessage);