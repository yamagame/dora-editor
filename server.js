const path = require("path");
const fs = require("fs");
const express = require("express");
const makeDir = require("make-dir");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const fileServer = require("./fileServer");
const app = express();
const port = process.env.PORT || 3090;

const DOCS = path.join(__dirname, "scenarios");
const PICT = path.join(__dirname, "pictures");

function scenarioFilePath(username, subdir) {
  if (subdir) {
    return path.join(DOCS, username, subdir);
  }
  return path.join(DOCS, username);
}

function pictureFilePath(req) {
  const { username } = req.session;
  return path.join(DOCS, username);
}

function isValidFilename(filename) {
  if (filename) {
    return (
      path.basename(filename) === filename &&
      path.normalize(filename) === filename
    );
  }
  return false;
}

const isLogined = (redirect = true) => {
  return function (req, res, next) {
    if (req.session.username) {
      return next();
    }
    if (redirect) {
      return res.redirect(`/login`);
    }
    res.sendStatus(403);
  };
};

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(
  cookieSession({
    name: "session",
    secret:
      process.env.SECRET ||
      "HMiOnsibWVzc2FnZSI6IkltUTROVEbGwsInB1ciI6ImNvb2tpZS5leHBlcmltZ",
    maxAge: 24 * 60 * 60 * 1000 * 100 * 365, // 100 years
  })
);

app.use((req, res, next) => {
  console.log(req.url);
  next();
});

app.use("/", express.static("build"));
app.use("/images", express.static(PICT));

app.post("/scenario", isLogined(false), async (req, res) => {
  console.log("scenario", req.body);
  const { action } = req.body;
  const username = req.body.name ? path.basename(req.body.name) : null;
  const filename = req.body.filename ? path.basename(req.body.filename) : null;
  switch (action) {
    case "list":
      await makeDir(path.join(DOCS, username));
      fileServer.readdirFileOnly(path.join(DOCS, username), (err, items) => {
        if (err) console.log(err);
        console.log(items);
        res.send({ status: !err ? "OK" : err.code, items });
      });
      return;
    case "load":
      // シナリオ読み込み
      if (isValidFilename(filename)) {
        await makeDir(path.join(DOCS, username));
        fs.readFile(path.join(DOCS, username, filename), (err, data) => {
          if (err && err.code !== "ENOENT") console.log(err);
          res.send({
            status: !err ? "OK" : err.code,
            text: data ? data.toString() : "",
          });
        });
      } else {
        res.send({ status: "Not found filename" });
      }
      return;
    case "play":
      // シナリオ再生
      return res.sendStatus(200);
    case "save":
      // シナリオ保存
      if (isValidFilename(filename)) {
        await makeDir(path.join(DOCS, username));
        fs.writeFile(
          path.join(DOCS, username, filename),
          req.body.text,
          (err) => {
            if (err) console.log(err);
            res.send({ status: !err ? "OK" : err.code });
          }
        );
      } else {
        res.send({ status: "Not found filename" });
      }
      return;
    case "stop":
      // シナリオ停止
      return res.sendStatus(200);
    case "create":
      // シナリオ作成
      if (isValidFilename(filename)) {
        await makeDir(path.join(DOCS, username));
        fs.open(path.join(DOCS, username, filename), "a", function (err, file) {
          if (err && err.code !== "ENOENT") console.log(err);
          res.send({ status: !err ? "OK" : err.code, filename });
        });
      } else {
        res.send({ status: "Not found filename" });
      }
      return;
    case "remove":
      // シナリオ削除
      await makeDir(path.join(DOCS, username));
      console.log(`unlink ${path.join(DOCS, username, filename)}`);
      fs.unlink(path.join(DOCS, username, filename), function (err) {
        if (err) console.log(err);
        res.send({ status: !err ? "OK" : err.code });
      });
      return;
    default:
      break;
  }
  res.sendStatus(200);
});

app.post("/command", isLogined(false), async (req, res) => {
  console.log("command", req.body);
  res.sendStatus(200);
});

app.post("/access-token", isLogined(false), async (req, res) => {
  console.log("access-token", req.body);
  res.send({ signature: "", user_id: "" });
});

app.get("/autostart", isLogined(false), async (req, res) => {
  console.log("autostart", req.body);
  res.sendStatus(200);
});

app.post("/autostart", isLogined(false), async (req, res) => {
  // シナリオ自動再生設定
  console.log("autostart", req.body);
  res.sendStatus(200);
});

app.post(
  "/file/upload/pictures/:subdir",
  isLogined(false),
  async (req, res) => {
    const PICT = pictureFilePath(req);
    fileServer.upload(req, res, PICT, req.params.subdir);
  }
);

app.post("/file/list/pictures/:subdir", isLogined(false), async (req, res) => {
  const PICT = pictureFilePath(req);
  fileServer.readDir(req, res, PICT, req.params.subdir);
});

app.post(
  "/file/delete/pictures/:subdir/:filename",
  isLogined(false),
  async (req, res) => {
    const PICT = pictureFilePath(req);
    fileServer.deleteFile(
      req,
      res,
      PICT,
      req.params.subdir,
      req.params.filename
    );
  }
);

app.get("/login", (req, res) => {
  res.render(`login`);
});

app.post("/logout", (req, res) => {
  delete req.session.username;
  res.redirect(`/`);
});

app.post("/login", (req, res) => {
  console.log(req.body);
  req.session.username = req.body.username;
  res.redirect("/");
});

app.get("/data/:username/:scenario/:filename", (req, res) => {
  const PICT = scenarioFilePath(req.params.username);
  res.sendFile(path.join(PICT, req.params.scenario, req.params.filename));
});

const server = require("http").Server(app);
const io = require("socket.io")(server);

io.on("connection", function (socket) {
  console.log("connected io", socket.conn.remoteAddress);
  socket.on("online", (payload) => {
    console.log("online", JSON.stringify(payload, null, "  "));
  });
  socket.emit("connect");
  // socket.emit('quiz')
  // socket.emit('scenario_status')
  // socket.emit('scenario_log')
});

server.listen(port, () => {
  console.log(`DoraEditor Server listening at http://localhost:${port}`);
});
