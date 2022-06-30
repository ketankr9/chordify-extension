function watchAndExecute(time, func) {
  if(func()){
    return;
  }

  setTimeout(() => watchAndExecute(time, func), time);
}

// Delete top advertisement
watchAndExecute(500, function(){
  if(window.document.getElementById("mm") != undefined) {
    window.document.getElementById("mm").remove();
    console.log("top Ad and background removed");

    if(window.document.getElementById("popup") != undefined){
      window.document.getElementById("popup").remove();
    }
    return true;
  }

  return false;
});

watchAndExecute(500, function(){
  if(window.document.getElementsByClassName("dstubn").length > 0 && window.document.getElementsByClassName("dstubn")[0].childNodes.length > 0) {
    window.document.getElementsByClassName("dstubn")[0].childNodes[0].click();
    console.log("bottom ad closed");
    return true;
  }

  return false;
});

watchAndExecute(2000, function(){
  if(window.document.getElementById("play-button") != undefined) {
    var ele = window.document.getElementById("play-button");
    console.log("right-icon");
    ele.click();
    return true;
  }

  return false;
});

// Choose Ukulele and play
watchAndExecute(2000, function(){
  if(window.document.getElementsByClassName("i1q78294").length == 4) {
    // Choose Ukulele
    window.document.getElementsByClassName("i1q78294")[1].click();

    // play
    window.document.getElementById("play-button").click();

    // close bottom Ad
    if(window.document.getElementsByClassName("icon-close").length >= 1){
      window.document.getElementsByClassName("icon-close")[1].click();
    }

    return true;
  }

  return false;
});

console.log("Content script executed.");
