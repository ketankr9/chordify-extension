function setIMAGE(ele, image_urls){
  console.log(image_urls);
    for(var i=0;  i < image_urls.length; i++ ){
        let chord = document.createElement("img");
        chord.setAttribute("src", image_urls[i][0]);
        chord.setAttribute("title", image_urls[i][1]);
        chord.style = "margin-bottom: -10px;max-width:10%;";
        ele.appendChild(chord);
    }
}

function setURL(ele, url){
  let urlEle = document.createElement("a");
  urlEle.setAttribute("href", url);
  urlEle.setAttribute("target", "blank");
  urlEle.style = "background-color: #4CAF50;border: none; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px;cursor: pointer;";
  urlEle.innerText = "Chordify.net";
  ele.appendChild(urlEle);
}

function waitForElementToDisplay(selector, time, request) {
    if(document.getElementById(selector) != null) {
        var ele = document.getElementById(selector);
        ele.innerText =  "";
        if(request.message == "Na"){
          ele.innerHTML = "Not Chordified :(";
        }else{
      		setIMAGE(ele, request.chord);
          setURL(ele, request.url);
        }
    		return;
    }
    else {
        setTimeout(function() {
            waitForElementToDisplay(selector, time, request);
        }, time);
    }
}

function handleMessage(request, sender, sendResponse) {
  	waitForElementToDisplay("menu-container", 500, request);
}

browser.runtime.onMessage.addListener(handleMessage);
