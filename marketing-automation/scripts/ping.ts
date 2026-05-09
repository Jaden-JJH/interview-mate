import { pingInstagram } from "../lib/instagram.js";
import { pingThreads } from "../lib/threads.js";

const t = await pingThreads();
console.log("Threads :", t);

const i = await pingInstagram();
console.log("Instagram:", i);
