package main

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5"
)

var DB *pgx.Conn

func InitDB() {
	// 🔴 CHANGE THIS DSN TO MATCH YOUR LOCAL POSTGRES SETTINGS
	dsn := "postgres://postgres:postgres@localhost:5432/vulnlab_db?sslmode=disable"

	var err error
	DB, err = pgx.Connect(context.Background(), dsn)
	if err != nil {
		log.Fatal("Failed to connect to Postgres:", err)
	}

	log.Println("Connected to Postgres")
}

func CloseDB() {
	if DB != nil {
		_ = DB.Close(context.Background())
	}
}
