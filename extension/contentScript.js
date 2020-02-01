// waitForElementToDisplay(500);
function waitForElementToDisplay(time) {
    if(window.document.getElementsByClassName("icon-love").length > 0) {
        var ele = window.document.getElementsByClassName("icon-love")[0];
        // e.removeAttribute("onclick");
        // console.log("e", ele);
    	return;
    }
    else {
        setTimeout(function() {
            waitForElementToDisplay(time);
        }, time);
    }
}


// waitIconRight(500);
function waitIconRight(time) {
    if(window.document.getElementById("play-button") != undefined) {
        await delay(10000);
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