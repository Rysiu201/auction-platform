import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { attachBidding } from "./services/bidding";
import { startCloseExpiredWorker } from "./services/closeExpired";

const port = Number(process.env.PORT || 4000);
const server = http.createServer(app);

startCloseExpiredWorker(); // <-- DODANE

const io = new Server(server, {
  cors: { origin: true, credentials: true }
});

attachBidding(io);

server.listen(port, () => {
  console.log(`API listening on :${port}`);
});
