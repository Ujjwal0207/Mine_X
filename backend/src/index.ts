import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import appRouter from "./app";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const INSTANCE_ID = process.env.INSTANCE_ID || "write-1";

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use(appRouter);

app.listen(PORT, () => {
  console.log(`Write Service [${INSTANCE_ID}] → http://localhost:${PORT}`);
  console.log(`Role: write-heavy (auth, post creation, cache invalidation)`);
});
