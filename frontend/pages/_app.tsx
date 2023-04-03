import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "./_navbar";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="root">
      <Navbar />
      <Component {...pageProps} />
    </div>
  );
}
