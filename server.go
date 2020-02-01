package main

import (
	"net/http"
	"io/ioutil"
)

func main() {
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