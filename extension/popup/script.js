// global variables
var dic = {};

// document.addEventListener('DOMContentLoaded', function() {
initialize();
document.getElementById("add").addEventListener("click", addNewSong);
// });

// fetch the URL of the current tab, add inside the window
function addNewSong() {
    browser.tabs.query({currentWindow: true,active: true}, function(tabs) {
        var url = tabs[0].url;
        var x = url.split("/");
        let name = x[x.length-1];
        if(x.length != 5 || x[2] != 'chordify.net')
            document.getElementById('error-content').classList.remove("hidden");
        else if(!(name in dic) && x[3] == 'chords'){
            dic[name] = url;
            updateStorage();
            addUrlToDom(name, url);
        }else{
            console.log("Duplicate url ", name, url);
            document.getElementById('duplicate-content').classList.remove("hidden");
        }
    });
}

function initialize(){
    browser.storage.local.get(null,function(data){
        document.getElementById("popup-content").innerHTML = "";
        for(let key in data)
            addUrlToDom(key, data[key]);
    });
    console.log("Restoring");
}


function addUrlToDom(key, url){

    var content = document.getElementById("popup-content");

    var newDiv = document.createElement('div');
    newDiv.setAttribute('class', "song button");

    var newLink = document.createElement('a');
    newLink.textContent = key;
    newLink.setAttribute('href',url);
    newLink.setAttribute('target','_blank');
    newLink.setAttribute('rel', 'noopener noreferrer');

    newDiv.appendChild(newLink);
    content.appendChild(newDiv);

    console.log("New element added", url);
}

function updateStorage(){
    browser.storage.local.set(dic);
}
