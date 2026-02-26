import app from "./app.js";
import connectDB from "./config/db.js";
import { PORT } from "./config/env.js";

connectDB();
app.listen(PORT, () => {
  console.log("Server running");
});
