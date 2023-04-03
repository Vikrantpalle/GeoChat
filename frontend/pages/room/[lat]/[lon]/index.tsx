import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "@/styles/Room.module.css";
import bg from "@/public/chat-background.jpg";

type Message = {
  Author: string;
  Data: string;
  TimeSent: string;
};

type Cords = {
  lat: string | null;
  lon: string | null;
};

export default function Room() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [cords, setCords] = useState<Cords>({ lat: null, lon: null });
  const [textArea, setTextArea] = useState<string>("");
  const chatEnd = useRef<HTMLDivElement | null>(null);

  const getMessages = () => {
    axios
      .get(
        "http://localhost:5000/messages?lat=" + cords.lat + "&lon=" + cords.lon
      )
      .then((res) => {
        console.log(res);
        if (res.status == 200 && res.data !== "") {
          setMessages(res.data);
        }
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    if (!router.isReady) return;
    const lat = router.query["lat"];
    const lon = router.query["lon"];
    if (
      lat == undefined ||
      lon == undefined ||
      typeof lat !== "string" ||
      typeof lon !== "string"
    )
      return;
    setCords({ lat, lon });
  }, [router.isReady]);

  useEffect(() => {
    if (cords.lat === null || cords.lon === null) return;
    getMessages();
  }, [cords]);

  useEffect(() => {
    if (cords.lat === null || cords.lon === null) return;
  });

  const sendMessage = () => {
    axios
      .post(
        `http://localhost:5000/messages?lat=${cords.lat}&lon=${cords.lon}`,
        textArea,
        {
          headers: {
            "SESSION-KEY": localStorage.getItem("session-key"),
          },
        }
      )
      .then((res) => {
        if (res.status == 200) {
          getMessages();
        }
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEnd.current?.scrollIntoView();
  };

  return (
    <>
      <div className={styles.main}>
        <div className={styles.info}>
          <h1 className={styles.name}>
            {cords.lat} {cords.lon}
          </h1>
        </div>
        <div
          className={styles.chatbox}
          style={{
            backgroundImage: `url(${bg.src})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "100% 100%",
          }}
        >
          <div className={styles.chat}>
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={[
                  styles.message,
                  idx % 2 ? styles.me : styles.other,
                ].join(" ")}
              >
                <p className={styles.author}>--{message.Author}</p>
                <p className={styles.data}>{message.Data}</p>
                <p className={styles.time_sent}>
                  {new Date(message.TimeSent).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
            ))}
            <div ref={chatEnd}></div>
          </div>
          <div className={styles.inputbox}>
            <textarea
              cols={10}
              wrap="soft"
              maxLength={255}
              placeholder="send message"
              className={styles.input}
              onChange={(e) => setTextArea(e.target.value)}
            />
            <button className={styles.send} onClick={sendMessage}>
              send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
