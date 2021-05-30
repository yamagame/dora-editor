import "bootstrap/dist/css/bootstrap.css";
import React from "react";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import ReactDOM from "react-dom";
import {
  initialData,
  sendEntry,
  quizCommand,
  setParams,
  reducers,
  createSocket,
} from "./reducers";
import "./index.css";
import App from "./App";
import registerServiceWorker from "./registerServiceWorker";

const params = {};
let store = createStore(reducers, applyMiddleware(thunk));
store.dispatch(
  initialData(params, (payload) => {
    const socket = createSocket();

    socket.emit("quiz", payload);

    socket.on("connect", () => {
      store.dispatch(sendEntry());
    });

    socket.on("quiz", (msg) => {
      console.log(msg);
      if (msg.action === "entry") {
        delete msg.action;
      }
      if (msg.action === "quiz-shuffle") {
        delete msg.action;
        return;
      }
      if (msg.action === "quiz-start") {
        delete msg.pageNumber;
      }
      store.dispatch(quizCommand(msg));
    });

    socket.on("scenario_status", (payload) => {
      const {
        app: { playing },
      } = store.getState();
      if (playing) {
        if (typeof payload.lineNumber !== "undefined") {
          window.alert(
            `${payload.lineNumber}行目でエラーが発生しました。\n\n${payload.code}\n\n${payload.reason}`
          );
        }
        console.log(playing);
        console.log(payload);
        store.dispatch(setParams({ playing: false }));
      }
    });

    socket.on("scenario_log", (payload) => {
      console.log(
        `${payload.filename} : Line ${payload.lineNumber}\n${payload.message}`
      );
    });
  })
);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
);
registerServiceWorker();
