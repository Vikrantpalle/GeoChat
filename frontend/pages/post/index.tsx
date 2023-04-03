import dynamic from "next/dynamic";
import styles from "@/styles/Post.module.css";
import { createContext, useRef, useState } from "react";
import { LeafletMouseEvent } from "leaflet";
import { fetchClient } from "../_client";

export const onMapClickContext = createContext((_: LeafletMouseEvent) => {});
const MapWithNoSSR = dynamic(() => import("./_map"), { ssr: false });
const request = fetchClient();

type FormData = {
  lat: any;
  lon: any;
  subject: string;
  description: string;
};

export default function Post() {
  const [data, setData] = useState<FormData>({
    subject: "",
    description: "",
    lat: 0,
    lon: 0,
  });
  const formRef = useRef<HTMLDivElement>(null);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newData = data;
    newData[e.target.name as keyof FormData] = e.target.value;
    setData(newData);
  };

  const handleSubmit = async () => {
    try {
      const result = await request.post("posts", data);
    } catch (e) {
      console.log(e);
    }
  };

  const handleMapClick = (e: LeafletMouseEvent) => {
    formRef.current?.focus();
    setData({
      ...data,
      lat: e.latlng.lat,
      lon: e.latlng.lng,
    });
  };

  return (
    <div className={styles.main}>
      <div className={styles.post_form} tabIndex={0} ref={formRef}>
        <input
          type="text"
          className={styles.subject}
          placeholder="title"
          name="subject"
          onChange={handleFormChange}
        />
        <textarea
          className={styles.description}
          placeholder="description"
          name="description"
          onChange={handleFormChange}
        />
        <button className={styles.submit} onClick={handleSubmit}>
          Submit
        </button>
      </div>
      <onMapClickContext.Provider value={handleMapClick}>
        <MapWithNoSSR />
      </onMapClickContext.Provider>
    </div>
  );
}
