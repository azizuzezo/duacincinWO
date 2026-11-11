package main

import (
	"context"
	"log"
	"net/http"

	"duacincin/server/app"
)

func main() {
	a, err := app.New(context.Background(), app.ServerOptions())
	if err != nil {
		log.Fatalf("%v", err)
	}
	defer a.Close()

	addr := ":" + a.Config.Port
	log.Printf("duacincin-api listening on %s (env=%s)", addr, a.Config.AppEnv)
	if err := http.ListenAndServe(addr, a.Handler); err != nil {
		log.Fatalf("server: %v", err)
	}
}
