waitForElementToDisplay(500);
function waitForElementToDisplay(time) {
    if(window.document.getElementById("mm") != undefined) {
        window.document.getElementById("mm").style.opacity = "0";
        console.log("background removed");
    	return;
    }
    else {
        setTimeout(function() {
            waitForElementToDisplay(time);
        }, time);
    }
}

waitForBottom(500);
function waitForBottom(time) {
    if(window.document.getElementsByClassName("dstubn").length > 0 && window.document.getElementsByClassName("dstubn")[0].childNodes.length > 0) {
        window.document.getElementsByClassName("dstubn")[0].childNodes[0].click();
        console.log("bottom ad closed");
    	return;
    }
    else {
        setTimeout(function() {
            waitIconRight(time);
        }, time);
    }
}

waitIconRight(2000);
function waitIconRight(time) {
    if(window.document.getElementById("play-button") != undefined) {
        // await delay(10000);
        var ele = window.document.getElementById("play-button");
        console.log("right-icon");
        ele.click();
    	return;
    }
    else {
        setTimeout(function() {
            waitIconRight(time);
        }, time);
    }
}

// document.getElementsByClassName("dstubn")[0].childNodes[0].click()
console.log("Content script executed.");