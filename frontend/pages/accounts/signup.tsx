import Navbar from "../_navbar";
import styles from "@/styles/Signup.module.css";
import { useState } from "react";
import axios from "axios";
import { Errors } from "@/types/constants";

type FormData = {
  username: string;
  email: string;
  password: string;
};

export default function Signup() {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
  });

  const formChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFormData = formData;
    newFormData[e.target.id as keyof FormData] = e.target.value;
    setFormData(newFormData);
  };

  const submitFormData = (e: any) => {
    axios
      .post("http://localhost:5000/register", formData)
      .then((res) => console.log(res.headers)) // res.status == 200
      .catch((err) => {
        switch (err.response.headers["error-code"]) {
          case Errors.EMAIL_EXISTS:
            console.log("email already exists");
        }
      });
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.signup}>
          <label htmlFor="username">Name</label>
          <input
            type="text"
            id="username"
            onChange={formChangeHandler}
            className={styles.item}
          />
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
