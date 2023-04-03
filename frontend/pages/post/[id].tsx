import { useEffect, useState } from "react";
import { fetchClient } from "../_client";
import { useRouter } from "next/router";
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

export default function ViewPost() {
  const [id, setId] = useState<string | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const router = useRouter();

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
    if (!router.isReady) return;
    const post_id = router.query["id"];
    if (post_id === undefined || typeof post_id !== "string") return;
    setId(post_id);
  }, [router.isReady]);

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
    </div>
  );
}
