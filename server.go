package main

import (
	"io/ioutil"
	"net/http"
	"os"
	"os/user"
)

func main() {
	http.HandleFunc("/save", saveSongList)
	http.HandleFunc("/", handleAll)
	http.ListenAndServe(":5000", nil)
}

func handleAll(w http.ResponseWriter, r *http.Request) {
	body, _ := ioutil.ReadAll(r.Body)
	response, _ := http.Get(string(body))
	body2, _ := ioutil.ReadAll(response.Body)
	w.Header().Set("content-type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write(body2)
}

func saveSongList(w http.ResponseWriter, r *http.Request) {
	body, _ := ioutil.ReadAll(r.Body)

	usr, err := user.Current()
	if err != nil {
		panic(err)
	}

	if f, err := os.OpenFile(usr.HomeDir+"/Music/chordify-extension-backup.txt",
		os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
		defer f.Close()
		f.WriteString(string(body) + "\n")
	}

}
