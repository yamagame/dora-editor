const path = require("path");
const express = require("express");
const fileServer = require("./fileServer");
const app = express();
const port = process.env.PORT || 3090;

const PICT = path.join(__dirname, "pictures");

app.use((req, res, next) => {
  console.log(req.url);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/images", express.static(PICT));

app.post("/scenario", async (req, res) => {
  console.log("scenario", req.body);
  const { action } = req.body;
  switch (action) {
    case "list":
      return res.send({ items: [] });
    case "load":
      // シナリオ読み込み
      return res.send({ text: "hello" });
    case "play":
      // シナリオ再生
      return res.sendStatus(200);
    case "save":
      // シナリオ保存
      return res.sendStatus(200);
    case "stop":
      // シナリオ停止
      return res.sendStatus(200);
    case "create":
      // シナリオ作成
      return res.sendStatus(200);
    case "remove":
      // シナリオ削除
      return res.sendStatus(200);
    default:
      break;
  }
  res.sendStatus(200);
});

app.post("/command", async (req, res) => {
  console.log("command", req.body);
  res.sendStatus(200);
});

app.post("/autostart", async (req, res) => {
  // シナリオ自動再生設定
  console.log("autostart", req.body);
  res.sendStatus(200);
});

app.post("/file/upload/pictures/:subdir", async (req, res) => {
  fileServer.upload(req, res, PICT, req.params.subdir);
});

app.post("/file/readDir/pictures/:subdir", async (req, res) => {
  fileServer.readDir(req, res, PICT, req.params.subdir);
});

app.post("/file/delete/pictures/:subdir/:filename", async (req, res) => {
  fileServer.deleteFile(req, res, PICT, req.params.subdir, req.params.filename);
});

const server = require("http").Server(app);
const io = require("socket.io")(server);

io.on("connection", function (socket) {
  console.log("connected io", socket.conn.remoteAddress);
  socket.on("quiz", (payload) => {
    console.log("quiz", JSON.stringify(payload, null, "  "));
  });
  socket.emit("connect");
  // socket.emit('quiz')
  // socket.emit('scenario_status')
  // socket.emit('scenario_log')
});

server.listen(port, () => {
  console.log(`DoraEditor Server listening at http://localhost:${port}`);
});
