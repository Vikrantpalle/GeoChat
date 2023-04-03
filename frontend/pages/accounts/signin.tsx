import Navbar from "../_navbar";
import styles from "@/styles/Signup.module.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Errors } from "@/types/constants";

type FormData = {
  email: string;
  password: string;
};

export default function Signin() {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });

  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("session-key") !== null) {
      console.log(localStorage.getItem("session-key"));
      // redirect to home if already signed in
      router.push("/");
    }
  });

  const formChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFormData = formData;
    newFormData[e.target.id as keyof FormData] = e.target.value;
    setFormData(newFormData);
  };

  const submitFormData = (e: any) => {
    axios
      .post("http://localhost:5000/login", formData)
      .then((res) => {
        if (res.status == 200) {
          localStorage.setItem("session-key", res.data);
          router.push("/");
        }
      }) // res.status == 200
      .catch((err) => {
        switch (err.response?.headers["error-code"]) {
          case Errors.INVALID_EMAIL:
            console.log("invalid email");
            break;
          case Errors.WRONG_PASSWORD:
            console.log("wrong password");
            break;
        }
      });
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.signup}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            onChange={formChangeHandler}
            className={styles.item}
          />
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            onChange={formChangeHandler}
            className={styles.item}
          />

          <button onClick={submitFormData} className={styles.submit}>
            signup
          </button>
        </div>
      </div>
    </>
  );
}
