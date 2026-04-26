package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// Enable CORS middleware to match FastAPI's CORSMiddleware behavior
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

// Proxy handler matching the / endpoint in server.py
func handleProxy(w http.ResponseWriter, r *http.Request) {
	var url string

	if r.Method == "GET" {
		url = r.URL.Query().Get("url")
	} else if r.Method == "POST" {
		// The extension sends the URL as a plain string in the body
		body, err := io.ReadAll(r.Body)
		if err != nil {
			log.Printf("Error reading body: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read request body"})
			return
		}
		url = string(body)
	}

	if url == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Missing URL"})
		return
	}

	fmt.Printf("Proxying request for: %s\n", url)

	// Create request to Chordify
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// Set headers to mimic a modern browser (mimicking impersonate="chrome120")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	// Use a client with a 30s timeout matching server.py
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error during proxy request: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGatewayTimeout)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	// Handle response
	w.Header().Set("Content-Type", "application/json")
	if resp.StatusCode == http.StatusOK {
		// We can directly stream the response back
		// Note: server.py parses JSON and returns it, io.Copy achieves the same result for JSON
		if _, err := io.Copy(w, resp.Body); err != nil {
			log.Printf("Error copying response: %v", err)
		}
		fmt.Println("Success proxying request")
	} else {
		fmt.Printf("Chordify returned %d\n", resp.StatusCode)
		w.WriteHeader(resp.StatusCode)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Chordify returned %d", resp.StatusCode)})
	}
}

// Save song handler matching the /save endpoint in server.py
func handleSave(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading body: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read request body"})
		return
	}

	url := string(body)
	fmt.Printf("Received song to save: %s\n", url)

	// Save to saved_songs.txt in the current directory, matching server.py
	f, err := os.OpenFile("saved_songs.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("Error opening file: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to open saved_songs.txt"})
		return
	}
	defer f.Close()

	if _, err := f.WriteString(url + "\n"); err != nil {
		log.Printf("Error writing to file: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to write to file"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "saved"})
}

func main() {
	// Register handlers with CORS middleware
	http.HandleFunc("/", enableCORS(handleProxy))
	http.HandleFunc("/save", enableCORS(handleSave))

	port := "5050"
	fmt.Printf("Starting Go server on :%s\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
