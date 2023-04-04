import { useEffect, useRef, useState } from "react";
import { fetchClient } from "../_client";
import { useRouter } from "next/router";
import Image from "next/image";
import dynamic from "next/dynamic";
import styles from "@/styles/ViewPost.module.css";

const request = fetchClient();

type Post = {
  Post_id: string;
  Created_at: string;
  Lat: any;
  Lon: any;
  Subject: string;
  Description: string;
  Author: string;
};

type Message = {
  Author: string;
  Data: string;
  TimeSent: string;
};

type Cords = {
  lat: string | null;
  lon: string | null;
};

export default function ViewPost() {
  const [id, setId] = useState<string | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [textArea, setTextArea] = useState<string>("");
  const chatEnd = useRef<HTMLDivElement | null>(null);

  const getMessages = () => {
    request
      .get(`messages?id=${id}`)
      .then((res) => {
        console.log(res);
        if (res.status == 200 && res.data !== "") {
          setMessages(res.data);
        }
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    if (id === null) return;
    request
      .get("posts?id=" + id)
      .then((res) => {
        if (res.status === 200) {
          setPost(res.data);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }, [id]);

  useEffect(() => {
    if (id === null) return;
    getMessages();
  }, [id]);

  useEffect(() => {
    if (!router.isReady) return;
    const post_id = router.query["id"];
    if (post_id === undefined || typeof post_id !== "string") return;
    setId(post_id);
  }, [router.isReady]);

  const sendMessage = () => {
    request
      .post(`messages?id=${id}`, textArea)
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
    <div className={styles.main}>
      <div className={styles.post}>
        <div className={styles.metadata}>
          <h4 className={styles.author}>{post?.Author}</h4>
          <h4 className={styles.created_at}>
            {new Date(post === null ? "" : post.Created_at).toLocaleDateString(
              []
            )}
          </h4>
        </div>
        <h1 className={styles.subject}>{post?.Subject}</h1>
        <p className={styles.description}>{post?.Description}</p>
      </div>
      <div className={styles.chatbox}>
        <div className={styles.chat}>
          {messages.map((message, idx) => (
            <div key={idx} className={styles.message}>
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
            <Image
              src={"/icons8-send-50.png"}
              alt="send"
              width={25}
              height={25}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
