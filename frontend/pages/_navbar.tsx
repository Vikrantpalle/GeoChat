import { useEffect, useRef, useState } from "react";
import styles from "@/styles/Navbar.module.css";
import Image from "next/image";
import { useRouter } from "next/router";
import Link from "next/link";

type Location = {
  name: string;
  lat: number;
  lon: number;
};

export default function Navbar() {
  const [searchList, setSearchList] = useState([]);
  const [username, setUsername] = useState<string | null>("");
  const globalNonce = useRef("");
  const router = useRouter();

  useEffect(() => {
    let name = localStorage.getItem("session-key");
    setUsername(name);
  });

  const searchInputHandler = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let query = e.target.value;
    globalNonce.current = query;
    if (query == "" && query === globalNonce.current) {
      setSearchList([]);
      return;
    }
    try {
      const data = await fetch(
        "http://localhost:5000/api/search/" + query
      ).then((res) => res.json());
      // ensures latest search value
      if (query === globalNonce.current) {
        setSearchList(data);
      }
    } catch (err) {
      if (query === globalNonce.current) {
        setSearchList([]);
      }
      console.log(err);
    }
  };

  const suggestionItemClickHandler = (v: Location) => {
    router.push(`room/${v.lat}/${v.lon}`);
  };

  const Logout = () => {
    localStorage.removeItem("session-key");
    setUsername(null);
  };

  return (
    <div className={styles.navbar}>
      <Link href={"/"} className={styles.logo}>
        ChatApp
      </Link>
      <div className={styles.search}>
        <input
          type="text"
          id="search"
          className={styles.input}
          placeholder="search"
          list="cityname"
          onChange={searchInputHandler}
          onFocus={searchInputHandler}
          onBlur={() => setSearchList([])}
        />
        <div className={styles.suggestions}>
          {searchList.map((v: Location) => (
            <h5
              className={styles.item}
              onMouseDown={(e) => suggestionItemClickHandler(v)}
            >
              {v.name}
            </h5>
          ))}
        </div>
      </div>

      <div tabIndex={0} className={styles.account}>
        <div className={styles.name}>{username}</div>
        <div className={styles.dp}>
          <Image
            src="/brown.png"
            alt="profile picture"
            width={32}
            height={32}
            className={styles.dp}
          />
        </div>
        <div className={styles.settings}>
          <div>settings</div>
          <div onClick={Logout}>logout</div>
        </div>
      </div>
    </div>
  );
}
