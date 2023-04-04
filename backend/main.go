package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// uniquely identifies hub
type Location struct {
	Lat float64
	Lon float64
}

type User struct {
	email     string
	issueTime time.Time
}

var db *pgxpool.Pool
var sessions = make(map[string]User, 0)

type Message struct {
	Author   string
	Data     string
	TimeSent time.Time
}

type SignUpData struct {
	Name     string
	Email    string
	Password string
}

type SignInData struct {
	Email    string
	Password string
}

type Room struct {
	Room_id string
	Lat     float64
	Lon     float64
}

type Post struct {
	Lat         float64
	Lon         float64
	Subject     string
	Description string
}

type PostWithId struct {
	Post_id     string
	Created_at  time.Time
	Lat         float64
	Lon         float64
	Subject     string
	Description string
	Author      string
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func cors(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Access-Control-Expose-Headers", "error-code")
}

func Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Access-Control-Expose-Headers", "error-code")
	switch r.Method {
	case "POST":
		var formData SignInData
		err := json.NewDecoder(r.Body).Decode(&formData)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			log.Print(err)
			return
		}

		email := formData.Email
		userPassword := formData.Password
		var password string
		var name string
		err = db.QueryRow(context.Background(), "SELECT name,password FROM users WHERE email = $1", email).Scan(&name, &password)
		if err != nil {
			if err == pgx.ErrNoRows {
				w.Header().Set("error-code", "1")
				w.WriteHeader(http.StatusBadRequest)
			} else {
				log.Println(err)
				w.WriteHeader(http.StatusInternalServerError)
			}
			return
		}
		// TODO: add session key to authorize user
		if userPassword == password {
			// logged in
			uuid, err := uuid.NewRandom()
			if err != nil {
				log.Print(err)
				w.WriteHeader(http.StatusInternalServerError)
				return
			}

			sessionKey := uuid.String()
			sessions[sessionKey] = User{email, time.Now()}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(sessionKey))
		} else {
			// invalid password
			w.Header().Set("error-code", "2")
			w.WriteHeader(http.StatusBadRequest)
		}
	case "OPTIONS":
		w.WriteHeader(http.StatusOK)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func Register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Access-Control-Expose-Headers", "error-code")
	switch r.Method {
	case "POST":
		var formData SignUpData
		json.NewDecoder(r.Body).Decode(&formData)

		name := formData.Name
		email := formData.Email
		password := formData.Password

		_, err := db.Exec(context.Background(), "insert into users(name,email,password) values ($1,$2,$3)", name, email, password)
		if err != nil {
			var pgErr *pgconn.PgError
			//  https://www.postgresql.org/docs/11/errcodes-appendix.html
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				w.Header().Set("error-code", "0")
				w.WriteHeader(http.StatusBadRequest)
			} else {
				log.Println(err)
				w.WriteHeader(http.StatusInternalServerError)
			}
			return
		}
		w.WriteHeader(http.StatusOK)
	case "OPTIONS":
		w.WriteHeader(http.StatusOK)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}

// TODO: More descriptive error handling
func AuthenticateUser(r *http.Request) string {
	sessionKey := r.Header.Get("Authorization")
	if sessionKey == "" {
		return ""
	}

	user, ok := sessions[sessionKey]
	if !ok {
		return ""
	}
	return user.email
}

func CreateRoom(lat float64, lon float64) (int, error) {
	var room_id int
	err := db.QueryRow(context.Background(), "insert into rooms(lat,lon) values ($1,$2) returning room_id", lat, lon).Scan(&room_id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			return 0, err
		}
		return 0, err
	}
	return room_id, nil
}

func MessageHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	switch r.Method {
	case "GET":
		// TODO: error handling
		id := r.URL.Query().Get("id")

		rows, _ := db.Query(context.Background(), "select name,message,created_at from (select * from messages where post_id=$1) p join users on users.user_id = p.author_id order by created_at asc", id)

		message_list := make([]Message, 0)

		for rows.Next() {
			var author string
			var message string
			var created_at time.Time
			err := rows.Scan(&author, &message, &created_at)
			if err != nil {
				log.Print(err)
				continue
			}
			message_list = append(message_list, Message{author, message, created_at.UTC()})
		}

		data, err := json.Marshal(message_list)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write(data)
	case "POST":
		id := r.URL.Query().Get("id")

		data, err := io.ReadAll(r.Body)
		if err != nil {
			log.Print(err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		payload := string(data)
		if err != nil {
			log.Print(err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		email := AuthenticateUser(r)
		if email == "" {
			log.Print("Invalid/Expired session key")
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		var author_id int
		err = db.QueryRow(context.Background(), "select user_id from users where email=$1", email).Scan(&author_id)
		if err != nil {
			if err == pgx.ErrNoRows {
				log.Print("invalid user")
				return
			} else {
				log.Fatal(err)
			}
		}
		var post_id int
		err = db.QueryRow(context.Background(), "select post_id from posts where post_id = $1", id).Scan(&post_id)
		if err != nil {
			if err == pgx.ErrNoRows {
				log.Printf("post id=%s invalid", id)
				return
			} else {
				log.Fatal(err)
			}
		}
		_, err = db.Exec(context.Background(), "INSERT INTO messages(author_id,message,post_id) values ($1,$2,$3)", author_id, payload, post_id)
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) {
				w.WriteHeader(http.StatusBadRequest)
				log.Printf("message insert failed: %v", err)
				return
			} else {
				log.Fatal(err)
			}
		}
		w.WriteHeader(http.StatusOK)
	case "OPTIONS":
		w.WriteHeader(http.StatusOK)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func RoomHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	switch r.Method {
	case "GET":
		lat, err := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
		if err != nil {
			fmt.Println("invalid latitude")
			return
		}
		lon, err := strconv.ParseFloat(r.URL.Query().Get("lon"), 64)
		if err != nil {
			fmt.Println("invalid longitude")
			return
		}

		rows, _ := db.Query(context.Background(), "select room_id,lat,lon from rooms where distance($1,$2,lat,lon) < 10", lat, lon)

		rooms := make([]Room, 0)

		for rows.Next() {
			var room_id string
			var lat float64
			var lon float64
			err := rows.Scan(&room_id, &lat, &lon)
			if err != nil {
				log.Print(err)
				continue
			}
			rooms = append(rooms, Room{room_id, lat, lon})
		}

		data, err := json.Marshal(rooms)
		if err != nil {
			log.Print(err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		w.Write(data)
	case "OPTIONS":
		w.WriteHeader(http.StatusOK)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func PostHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	switch r.Method {
	case "GET":
		id := r.URL.Query().Get("id")
		if id == "" {
			w.WriteHeader(http.StatusBadRequest)
			log.Print("no id in url")
			return
		}

		var post_id string
		var created_at time.Time
		var lat float64
		var lon float64
		var subject string
		var description string
		var name string

		err := db.QueryRow(context.Background(), "select post_id,created_at,lat,lon,subject,description,name from (select * from posts where post_id = $1) post join users on post.author_id = users.user_id;", id).Scan(&post_id, &created_at, &lat, &lon, &subject, &description, &name)
		if err != nil {
			if err == pgx.ErrNoRows {
				log.Print("post does not exist")
				w.WriteHeader(http.StatusBadRequest)
				return
			} else {
				log.Fatal(err)
			}
		}

		data, err := json.Marshal(PostWithId{post_id, created_at, lat, lon, subject, description, name})

		if err != nil {
			log.Print(err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		w.Write(data)
	case "POST":
		email := AuthenticateUser(r)
		if email == "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		var author_id int
		err := db.QueryRow(context.Background(), "select user_id from users where email=$1", email).Scan(&author_id)
		if err != nil {
			if err == pgx.ErrNoRows {
				log.Print("invalid user")
				return
			} else {
				log.Fatal(err)
			}
		}

		var post Post
		data, err := io.ReadAll(r.Body)
		if err != nil {
			log.Print(err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		err = json.Unmarshal(data, &post)
		if err != nil {
			log.Print(err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		_, err = db.Exec(context.Background(), "insert into posts(author_id,lat,lon,subject,description) values ($1,$2,$3,$4,$5)", author_id, post.Lat, post.Lon, post.Subject, post.Description)
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) {
				w.WriteHeader(http.StatusBadRequest)
				log.Printf("message insert failed: %v", err)
				return
			} else {
				log.Fatal(err)
			}
		}

		w.WriteHeader(http.StatusOK)
	case "OPTIONS":
		w.WriteHeader(http.StatusOK)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func SuggestionHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	switch r.Method {
	case "GET":
		lat, err := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
		if err != nil {
			fmt.Println("invalid latitude")
			return
		}
		lon, err := strconv.ParseFloat(r.URL.Query().Get("lon"), 64)
		if err != nil {
			fmt.Println("invalid longitude")
			return
		}

		rows, _ := db.Query(context.Background(), "select post_id,created_at,lat,lon,subject,description,name from posts join users on posts.author_id = users.user_id AND distance($1,$2,lat,lon) < 100000", lat, lon)

		posts := make([]PostWithId, 0)

		for rows.Next() {
			var post_id string
			var created_at time.Time
			var lat float64
			var lon float64
			var subject string
			var description string
			var name string

			err := rows.Scan(&post_id, &created_at, &lat, &lon, &subject, &description, &name)
			if err != nil {
				log.Print(err)
				continue
			}
			posts = append(posts, PostWithId{post_id, created_at, lat, lon, subject, description, name})
		}

		data, err := json.Marshal(posts)
		if err != nil {
			log.Print(err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		w.Write(data)
	case "OPTIONS":
		w.WriteHeader(http.StatusOK)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func main() {

	dbUrl := "postgres://postgres:postgres@localhost:5432/postgres"
	var err error
	db, err = pgxpool.New(context.Background(), dbUrl)
	if err != nil {
		log.Fatal(err)
		return
	}

	defer db.Close()

	targetAPIUrl, err := url.Parse("http://localhost:8000")
	if err != nil {
		log.Print(err)
	}
	proxy := httputil.NewSingleHostReverseProxy(targetAPIUrl)

	proxy.ModifyResponse = func(r *http.Response) error {
		r.Header.Set("Access-Control-Allow-Origin", "*")
		return nil
	}
	http.HandleFunc("/messages", MessageHandler)
	http.HandleFunc("/rooms", RoomHandler)
	http.HandleFunc("/posts", PostHandler)
	http.HandleFunc("/suggestions", SuggestionHandler)
	http.HandleFunc("/register", Register)
	http.HandleFunc("/login", Login)
	http.Handle("/api/search/", proxy)
	if err := http.ListenAndServe(":5000", nil); err != nil {
		fmt.Println(err)
	}
}
