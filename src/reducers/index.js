import { combineReducers } from "redux";
import Play from "./speech";
import "whatwg-fetch";
import io from "socket.io-client";

//const Dora = require('dora');

export const fontSize = (payload) => {
  var size = payload.width < payload.height ? payload.width : payload.height;
  return parseInt((size * 0.6) / 10, 10);
};

const AsyncStorage = {
  getItem: function (key, defaultValue) {
    const value = localStorage.getItem(key);
    return value !== null ? JSON.parse(value).data : defaultValue;
  },
  setItem: function (key, value) {
    localStorage.setItem(key, JSON.stringify({ data: value }));
  },
};

var socket = null;

export const types = {
  DELETE: "DELETE",
  PARAMS: "PARAMS",
  LAYOUT: "LAYOUT",
};

const algorithmPlay = new Play();
//const dora = new Dora();

const initialState = {
  name: "",
  filename: "",
  clientId: "",
  members: [],
  loading: false,
  saving: false,
  fontSize: fontSize({
    width: window.innerWidth,
    height: window.innerHeight,
  }),
};

const setValues = (state = initialState, action) => {
  if (action.type === types.DELETE) {
    const r = { ...state };
    Object.keys(action.payload).forEach((key) => {
      delete r[key];
    });
    return r;
  }
  if (action.type === types.PARAMS) {
    return {
      ...state,
      ...action.payload,
    };
  }
  if (action.type === types.LAYOUT) {
    return {
      ...state,
      ...action.payload,
    };
  }
  return state;
};

export const reducers = combineReducers({
  app: setValues,
});

export const initialData = (params, callback) => async (dispatch, getState) => {
  const payload = {
    ...initialState,
    ...params,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  let signature = null;
  let user_id = null;
  payload.fontSize = fontSize(payload);
  await Promise.all(
    Object.keys(initialState).map(async (key) => {
      payload[key] = await AsyncStorage.getItem(key, payload[key]);
    })
  );
  try {
    {
      const response = await fetch("/access-token", {
        method: "POST",
      });
      if (response.ok) {
        let data = await response.json();
        signature = data.signature;
        user_id = data.user_id;
        dispatch({
          type: types.PARAMS,
          payload: {
            user_id,
            signature,
          },
        });
      }
    }
    if (payload.name) {
      {
        const response = await fetch("/scenario", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "list",
            name: payload.name,
          }),
        });
        let data = await response.json();
        if (data && data.items) {
          payload.items = data.items;
        }
      }
      {
        const response = await fetch("/scenario", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "load",
            name: payload.name,
            filename: payload.filename,
          }),
        });
        let data = await response.json();
        if (data.status === "ENOENT") {
          if (payload.items.length > 0) {
            payload.filename = payload.items[0];
          } else {
            payload.filename = "empty.txt";
          }
        } else if (data && data.text) {
          payload.text = data.text;
        }
      }
      if (typeof payload.text === "undefined") {
        const response = await fetch("/scenario", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "load",
            name: payload.name,
            filename: payload.filename,
          }),
        });
        let data = await response.json();
        if (data.status === "ENOENT") {
          if (payload.items.length > 0) {
            payload.filename = payload.items[0];
          } else {
            payload.filename = "empty.txt";
          }
        } else if (data && data.text) {
          payload.text = data.text;
        }
      }
    }
    dispatch({
      type: types.PARAMS,
      payload,
    });
    {
      const payload_ = {
        name: payload.name,
        clientId: payload.clientId,
        time: new Date(),
        user_id,
        signature,
      };
      callback(payload_);
    }
  } catch (err) {
    console.log(err);
    console.log(payload);
  }
};

export const createSocket = () => {
  socket = io();
  return socket;
};

export const playSpeech = (message, callback) => async (dispatch, getState) => {
  const node = {
    log: () => {},
  };
  const msg = {
    robotHost: socket,
  };
  const params = {
    message,
    algorithm: "",
  };
  if (message.trim() === "") {
    if (callback) callback(null, null);
  } else {
    algorithmPlay.request(node, msg, params, function (err, res) {
      if (callback) callback(err, res);
    });
  }
};

export const stopSpeech = (callback) => async (dispatch, getState) => {
  const node = {
    log: () => {},
  };
  algorithmPlay.stop(node, socket, function (err, res) {
    if (callback) callback(err, res);
  });
};

export const playScenario =
  (filename, range, callback) => async (dispatch, getState) => {
    const { name } = getState().app;
    await fetch("/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "scenario",
        action: "play",
        name,
        filename,
        range,
      }),
    });
    if (callback) callback(null);
  };

export const stopScenario = (callback) => async (dispatch, getState) => {
  await fetch("/command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "scenario",
      action: "stop",
    }),
  });
  if (callback) callback(null);
};

export const save = (message, callback) => async (dispatch, getState) => {
  const { name, filename } = getState().app;
  dispatch({
    type: types.PARAMS,
    payload: {
      saving: true,
    },
  });
  const response = await fetch("/scenario", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "save",
      name,
      text: message,
      filename,
    }),
  });
  dispatch({
    type: types.PARAMS,
    payload: {
      saving: false,
    },
  });
  if (response.ok) {
    try {
      let data = await response.json();
      if (callback) callback(data);
      return;
    } catch (err) {}
  }
  if (callback) callback({ status: "Err" });
};

export const create = (filename, callback) => async (dispatch, getState) => {
  const { name } = getState().app;
  const response = await fetch("/scenario", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "create",
      name,
      filename,
    }),
  });
  if (response.ok) {
    try {
      let data = await response.json();
      if (callback) callback(data);
      return;
    } catch (err) {}
  }
  if (callback) callback({ status: "Err" });
};

export const remove = (filename, callback) => async (dispatch, getState) => {
  const { name } = getState().app;
  const response = await fetch("/scenario", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "remove",
      name,
      filename,
    }),
  });
  if (response.ok) {
    try {
      let data = await response.json();
      if (callback) callback(data);
      return;
    } catch (err) {}
  }
  if (callback) callback({ status: "Err" });
};

export const clearText = () => async (dispatch, getState) => {
  dispatch({
    type: types.DELETE,
    payload: {
      text: true,
    },
  });
};

export const load = (callback) => async (dispatch, getState) => {
  const payload = {};
  const { name, filename } = getState().app;
  dispatch({
    type: types.PARAMS,
    payload: {
      loading: true,
    },
  });
  const response = await fetch("/scenario", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "load",
      name,
      filename,
    }),
  });
  if (response.ok) {
    try {
      let data = await response.json();
      if (data && typeof data.text !== "undefined") {
        payload.text = data.text;
      } else {
        payload.text = "";
      }
      payload.loading = false;
      dispatch({
        type: types.PARAMS,
        payload,
      });
      if (callback) callback(data);
      return;
    } catch (err) {}
  }
  if (callback) callback({ status: "Err" });
};

export const list = (callback) => async (dispatch, getState) => {
  const payload = {};
  const { name } = getState().app;
  const response = await fetch("/scenario", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "list",
      name,
    }),
  });
  if (response.ok) {
    try {
      let data = await response.json();
      if (data && data.items) {
        payload.items = data.items;
      }
      dispatch({
        type: types.PARAMS,
        payload,
      });
      if (callback) callback(data);
      return;
    } catch (err) {
      if (callback) callback({ items: [] });
    }
  }
  if (callback) callback({ status: "Err" });
};

export const changeLayout = (payload) => async (dispatch, getState) => {
  dispatch({
    type: types.LAYOUT,
    payload: {
      ...payload,
      fontSize: fontSize(payload),
    },
  });
};

export const setParams = (payload, callback) => async (dispatch, getState) => {
  await Promise.all(
    Object.keys(payload).map(async (key) => {
      await AsyncStorage.setItem(key, payload[key]);
    })
  );
  dispatch({
    type: types.PARAMS,
    payload,
  });
  if (callback) callback();
};

export const sendEntry = (callback) => async (dispatch, getState) => {
  const {
    app: { name, clientId, user_id, signature },
  } = getState();
  const payload = {
    name,
    clientId,
    time: new Date(),
    user_id,
    signature,
  };
  socket.emit("quiz", payload);
  dispatch({
    type: types.PARAMS,
    payload: {},
  });
  if (callback) callback();
};

export const quizCommand =
  (payload, callback) => async (dispatch, getState) => {
    const {
      app: { name },
    } = getState();
    payload = ((obj) => {
      const t = {};
      [
        "type",
        "action",
        "time",
        "pages",
        "sideImage",
        "choices",
        "fontScale",
        "question",
        "answers",
        "messages",
        "links",
        "entry",
        "title",
        "photo",
        "name",
        "pageNumber",
        "quizAnswers",
        "quizId",
        "quizStartTime",
        "sheet",
        "members",
      ].forEach((key) => {
        if (typeof obj[key] !== "undefined") {
          t[key] = obj[key];
        }
      });
      return t;
    })(payload);
    if (!payload.name || payload.name === name) {
      await Promise.all(
        Object.keys(payload).map(async (key) => {
          await AsyncStorage.setItem(key, payload[key]);
        })
      );
      dispatch({
        type: types.PARAMS,
        payload,
      });
    }
    if (callback) callback();
  };

export const loadAutostart = (callback) => async (dispatch, getState) => {
  const response = await fetch("/autostart", {
    method: "GET",
  });
  if (response.ok) {
    try {
      let data = await response.json();
      console.log(data);
      dispatch({
        type: types.PARAMS,
        payload: {
          autostart: data,
        },
      });
      if (callback) callback(data);
      return;
    } catch (err) {}
  }
  if (callback) callback();
};

export const saveAutostart =
  (payload, callback) => async (dispatch, getState) => {
    await fetch("/autostart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ autostart: payload }),
    });
    if (callback) callback();
  };

export const login = (username, callback) => async (dispatch, getState) => {
  const response = await fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });
  const result = () => {
    if (response.ok) {
      if (response.status === 200) return true;
    }
    return false;
  };
  if (callback) callback(result());
};

export const logout = (callback) => async (dispatch, getState) => {
  const response = await fetch("/logout", {
    method: "POST",
  });
  const result = () => {
    if (response.ok) {
      if (response.status === 200) return true;
    }
    return false;
  };
  if (callback) callback(result());
};
