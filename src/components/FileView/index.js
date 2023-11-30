import React, { Component } from "react";
import axios from "axios";
import { ProgressBar, Modal, Button } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./style.css";

const TOAST_ERR_TIME = 5000;

class FileView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedFile: null,
      dirFiles: null,
      selectedImageFile: props.selectedImageFile,
      loaded: 0,
      dragAndDrop: false,
      slideCommand: null,
      showSlideCommand: false,
    };
  }

  componentDidMount() {
    this.readDir(true);
  }

  componentDidUpdate(nextProps) {
    if (this.props.subDirectory !== nextProps.subDirectory) {
      this.setState({ subDirectory: nextProps.subDirectory }, () => {
        this.readDir(true);
      });
    }
  }

  checkMimeType = files => {
    let err = [];
    let retval = true;
    const types = this.props.fileTypes;
    [...files].forEach((file, x) => {
      if (types.every(type => files[x].type !== type)) {
        err[x] = files[x].type + " is not a supported format\n";
      }
    });
    for (var z = 0; z < err.length; z++) {
      toast.error(err[z], { autoClose: TOAST_ERR_TIME });
      retval = false;
    }
    return retval;
  };

  maxSelectFile = files => {
    if (
      this.props.limitFileNumber !== 0 &&
      files.length > this.props.limitFileNumber
    ) {
      const msg = `Only ${this.props.limitFileNumber} images can be uploaded at a time`;
      toast.warn(msg, { autoClose: TOAST_ERR_TIME });
      return false;
    }
    return true;
  };

  checkFileSize = files => {
    let size = this.props.fileSizeLimit;
    let err = [];
    let retval = true;
    if (size > 0) {
      for (var x = 0; x < files.length; x++) {
        if (files[x].size > size) {
          err[x] = files[x].type + "is too large, please pick a smaller file\n";
        }
      }
    }
    for (var z = 0; z < err.length; z++) {
      toast.error(err[z], { autoClose: TOAST_ERR_TIME });
      retval = false;
    }
    return retval;
  };

  onChangeFileHandler = (files, cb) => {
    if (
      this.maxSelectFile(files) &&
      this.checkMimeType(files) &&
      this.checkFileSize(files)
    ) {
      this.setState(
        {
          selectedFile: files,
          loaded: 0,
        },
        cb
      );
    } else {
      return false;
    }
    return true;
  };

  onChangeHandler = event => {
    const { files } = event.target;
    const target = event.target;
    this.setState(
      {
        dragAndDrop: false,
      },
      () => {
        if (!this.onChangeFileHandler(files)) {
          target.value = null;
        }
      }
    );
  };

  onClickHandler = () => {
    if (this.state.selectedFile) {
      const data = new FormData();
      for (var x = 0; x < this.state.selectedFile.length; x++) {
        data.append("file", this.state.selectedFile[x]);
      }
      axios
        .post(`${this.props.uploadURL}/${this.props.subDirectory}`, data, {
          onUploadProgress: ProgressEvent => {
            this.setState({
              loaded: (ProgressEvent.loaded / ProgressEvent.total) * 100,
            });
          },
        })
        .then(res => {
          toast.success("upload success");
          this.readDir();
        })
        .catch(err => {
          console.log(err);
          toast.error("upload fail", { autoClose: TOAST_ERR_TIME });
        });
    }
  };

  readDir = reload => {
    axios
      .post(`${this.props.readDirURL}/${this.props.subDirectory}`)
      .then(res => {
        this.setState({
          dirFiles: typeof res.data === "object" ? res.data : [],
          selectedImageFile: reload
            ? res.data.length > 0
              ? res.data[0]
              : null
            : this.state.selectedImageFile,
          selectedFile: null,
        });
      })
      .catch(err => {
        console.log(err);
        toast.error("read file list fail", { autoClose: TOAST_ERR_TIME });
      });
  };

  fileClickHandler = file => {
    return () => {
      if (this.state.selectedImageFile === file) {
        this.setState({
          selectedImageFile: null,
        });
      } else {
        this.setState({
          selectedImageFile: file,
        });
      }
    };
  };

  fileClickDeleteHandler = file => {
    return () => {
      axios
        .post(`${this.props.deleteURL}/${this.props.subDirectory}/${file}`)
        .then(res => {
          this.readDir();
        })
        .catch(err => {
          console.log(err);
          toast.error("delete fail", { autoClose: TOAST_ERR_TIME });
        });
    };
  };

  onClickImage = file => {
    const cmd =
      `/slide/${this.props.pictureURL}/${this.props.subDirectory}/${file}`.replace(
        /\/\//g,
        "/"
      );
    this.setState({
      slideCommand: cmd,
      showSlideCommand: true,
    });
  };

  render() {
    const handleClose = () => {
      this.setState({ showSlideCommand: false });
    };
    const handleInsert = () => {
      if (this.props.onEdit) {
        this.props.onEdit(this.state.slideCommand)
        this.setState({ showSlideCommand: false });
      }
    };
    const handleChange = (e) => {
      this.setState({ slideCommand: e.target.value })
    }
    return (
      <div
        className="fileview box"
        style={{
          ...this.props.styles,
        }}
        onDragOver={e => {
          e.preventDefault();
        }}
        onDragLeave={e => { }}
        onDrop={e => {
          const { files } = e.dataTransfer;
          this.setState(
            {
              dragAndDrop: true,
            },
            () => {
              if (
                !this.onChangeFileHandler(files, () => {
                  this.onClickHandler();
                })
              ) {
                this.setState({
                  selectedFile: null,
                  loaded: 0,
                });
              }
            }
          );
          e.preventDefault();
        }}
      >
        <input
          type="file"
          id="file"
          style={{ display: "none" }}
          multiple
          onChange={this.onChangeHandler}
        />
        <div className="upload-message-box">
          <label
            style={{
              display: "inline-block",
            }}
            htmlFor="file"
          >
            <strong className="upload-label">Upload Image File </strong>
          </label>
          <span style={{ display: "inline" }}>{" or drop files here"}</span>
          <ProgressBar max={100} color="success" value={this.state.loaded} />
          <ToastContainer autoClose={3000} />
          {this.state.selectedFile &&
            this.state.selectedFile.length > 0 &&
            !this.state.dragAndDrop ? (
            <button
              type="button"
              className="btn btn-success btn-block"
              onClick={this.onClickHandler}
            >
              Upload
            </button>
          ) : null}
        </div>
        <div className="thumb-box">
          <div className="thumb-inner">
            {this.state.selectedImageFile ? (
              <a
                href={`${this.props.pictureURL}/${this.props.subDirectory}/${this.state.selectedImageFile}`}
                target="image-detail-window"
              >
                <img
                  className="thumb"
                  alt="selected"
                  src={`${this.props.pictureURL}/${this.props.subDirectory}/${this.state.selectedImageFile}`}
                />
              </a>
            ) : null}
          </div>
        </div>
        <div className="filelist-row">
          <code className="filelist-col">
            {this.state.dirFiles
              ? this.state.dirFiles.map((v, i) => {
                return (
                  <div
                    key={i}
                    className={`filename ${this.state.selectedImageFile === v
                      ? "selectedImage"
                      : ""
                      }`}
                  >
                    <div
                      style={{ display: "inline-block", width: "80%" }}
                      onClick={this.fileClickHandler(v)}
                    >
                      <strong onClick={this.fileClickHandler(v)}>{v}</strong>
                    </div>
                    {this.state.selectedImageFile === v &&
                      this.props.deleteButton ? (
                      <span
                        style={{
                          float: "right",
                          fontSize: 13,
                          marginTop: 3,
                          color: "red",
                          paddingRight: 10,
                        }}
                        onClick={this.fileClickDeleteHandler(v)}
                      >
                        削除
                      </span>
                    ) : null}
                    {this.state.selectedImageFile === v &&
                      !this.props.deleteButton ? (
                      <span
                        style={{
                          float: "right",
                          fontSize: 13,
                          marginTop: 3,
                          color: "#007bff",
                          paddingRight: 10,
                        }}
                        onClick={() => this.onClickImage(v)}
                      >
                        CMD
                      </span>
                    ) : null}
                  </div>
                );
              })
              : null}
          </code>
        </div>
        <Modal show={this.state.showSlideCommand} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>画像表示コマンド</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <textarea style={{ width: "100%" }} value={this.state.slideCommand} onChange={handleChange} />
          </Modal.Body>
          <Modal.Footer>
            {this.props.onEdit ?
              <Button variant="secondary" onClick={handleInsert}>
                挿入
              </Button> : null
            }
            <Button variant="secondary" onClick={handleClose}>
              閉じる
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

FileView.defaultProps = {
  fileTypes: ["image/png", "image/jpeg", "image/gif"],
  uploadURL: "/file/upload/pictures",
  readDirURL: "/file/list/pictures",
  pictureURL: "/images",
  username: "dora-engine",
  deleteURL: "/file/delete/pictures",
  fileSizeLimit: 0,
  limitFileNumber: 0,
  subDirectory: "",
  selectedImageFile: null,
  styles: {},
  deleteButton: true,
  onEdit: null,
};

export default FileView;
