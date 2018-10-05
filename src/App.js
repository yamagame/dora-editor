import React, { Component }  from 'react';
import { connect } from 'react-redux'
import StartButton from './components/Button';
import Column from './components/Column';
import AceEditor from 'react-ace';
import {
  playSpeech,
  stopSpeech,
  playScenario,
  stopScenario,
  save,
  create,
  load,
  list,
  remove,
  changeLayout,
  setParams,
} from './reducers'
import './App.css';
import ReactTable from "react-table";
import 'react-table/react-table.css'
import {
  Col,
  Modal,
  Button,
  ControlLabel,
} from 'react-bootstrap';

import 'brace/mode/plain_text';
import './libs/senario_editor_mode';
import 'brace/theme/monokai';
import 'brace/theme/chrome';

function buttonValue(v, height, host) {
  if (typeof v !== 'object') {
    return <p> { v } </p>;
  }
  if (v.image) {
    return <div style={{ marginTop: 10, }} >
      <img
        alt="icon"
        style={{
          margin: 'auto',
          padding: 0,
          pointerEvents: 'none',
        }}
        height={height-4}
        src={(host) ? host+v.image : v.image}
      />
    </div>
  }
  return <p> { v.value } </p>;
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      log_value: '',
      row: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      show_selector: false,
      selectedFilename: null,
      show_create_file: false,
      show_delete_file: false,
      show_log_editor: false,
      new_filename: '',
    }
    this.saveTimeout = null;
  }

  // box() {
  //   return {
  //     offsetWidth: this.container.offsetWidth,
  //     offsetHeight: this.container.offsetHeight,
  //   }
  // }

  onResize = () => {
    this.props.onLayout({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    //this.props.onUpdate(this.box());
  }

  componentDidMount() {
    //this.props.onUpdate(this.box());
    window.addEventListener('resize', this.onResize, false);
  }
  
  componentWillUnmount() {
    //this.props.onUpdate(null);
    window.removeEventListener('resize', this.onResize);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.text !== this.props.text) {
      this.setState({
        value: nextProps.text,
      });
    }
  }

  onChange = (newValue) => {
    this.setState({
      value: newValue,
    });
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.props.save(this.state.value, (err) => {
        if (err.status !== 'OK') {
          window.alert('ファイルの保存に失敗しました');
        }
        this.saveTimeout = null;
      });
    }, 1000);
  }

  onLogChange = (newValue) => {
    this.setState({
      log_value: newValue,
    });
  }

  onCursorChange = (selection, event) => {
    const srow = selection.getRange().start.row;
    const erow = selection.getRange().end.row;
    this.setState({
      startRow: srow,
      endRow: erow,
      row: selection.getSelectionLead().row,
    });
  }

  debug = () => {
  }

  play = (range) => {
    // this.props.playScenario(this.state.value, range, (err, msg) => {
    //   if (err) {
    //     window.alert(`${err.info.lineNumber}行目でエラーが発生しました。\n\n${err.info.code}\n\n${err.info.reason}`);
    //   }
    //   console.log(msg);
    //   console.log('END');
    // });
    this.props.setParams({ playing: true });
    this.props.playScenario(this.props.filename, range);
  }

  playAll = () => {
    this.play({});
  }

  playRange = () => {
    if (this.state.startRow == this.state.endRow) {
      this.play({ start: this.state.startRow });
    } else {
      this.play({ start: this.state.startRow, end: this.state.startRow+Math.max(1, this.state.endRow-this.state.startRow) });
    }
  }

  stop = () => {
    this.props.stopScenario();
    this.props.setParams({ playing: false });
  }

  _play = (scenario) => {
    const s = scenario.map( (v,i) => {
      if (v === '' && i > 0) {
        return ':1s';
      }
      return v;
    }).join('\n').replace(/(\/\*[^*]*\*\/)|(\/\/.*)/g, '//').trim()
    this.props.playSpeech(s);
  }

  _playAll = () => {
    this.play(this.state.value.split('\n'));
  }

  _playRange = () => {
    if (this.state.startRow == this.state.endRow) {
      this.play(this.state.value.trim().split('\n').slice(this.state.startRow));
    } else {
      this.play(this.state.value.trim().split('\n').slice(this.state.startRow, this.state.startRow+Math.max(1, this.state.endRow-this.state.startRow)));
    }
  }

  _stop = () => {
    this.props.stopSpeech();
  }

  rename = () => {
    this.setState({
      changeName: true,
    }, () => {
      this.entryName.value = this.props.name;
    });
  }

  startQuiz = () => {
    if (this.entryName.value.trim() !== '') {
      this.props.setParams({ name: this.entryName.value.trim(), filename: '最初のファイル.txt' }, () => {
        this.setState({
          changeName: false,
        }, () => {
          this.props.list(() => {
            this.props.load();
          });
        });
      });
    }
  }

  render() {
    if (typeof this.props.name === 'undefined' || this.props.name === '' || this.props.name.length <= 1 || this.state.changeName) {
      return this.renderTitle({});
    }
    if (this.state.show_selector) {
      return this.renderSelector();
    }
    return this.renderEditor();
  }

  renderSelector() {
    return (
      <div style={{ fontSize: 12, }} >
        <div style={{ borderBottom: 'solid 1px gray', }}>
          <input style={{ marginLeft: 10, marginRight: 10, }} type="button" value="すべて再生" onClick={this.playAll}/>
          <input type="button" value="新規作成" onClick={() => {
            this.setState({
              show_create_file: true,
              new_filename: '',
            });
          }}/>
          <input style={{ marginRight: 10, }} type="button" value="削除" onClick={() => {
            this.setState({
              show_delete_file: true,
            });
          }}/>
          <select  style={{ marginLeft: 10, height: 23,}} value={this.props.filename} onChange={(event) => {
            this.props.setParams({ filename: event.target.value }, () => {
              this.props.load();
            });
          }}>
            {
              (this.props.items) ? this.props.items.map( (p, i) => {
                return <option key={i} value={p}> {p} </option>
              }) : null
            }
          </select>
          <input type="button" value="編集" onClick={() => {
            this.setState({
              show_selector: false,
            });
          }}/>
          {
            (this.props.loading) ? <span style={{ color: 'blue', fontSize: 12, paddingLeft: 5, paddingRight: 5, }}> {`読み込み中... : ${this.props.filename}`} </span> : null
          }
          {
            (this.props.saving) ? <span style={{ color: 'blue', fontSize: 12, paddingLeft: 5, paddingRight: 5, }}> {`保存中... : ${this.props.filename}`} </span> : null
          }
          <div style={{ display: 'inline', float: 'right' }}>
            <p style={{ display: 'inline', fontSize: 12}}> { this.props.name } </p>
            <input style={{ display: 'inline', }} disabled type="button" value="名前の変更" onClick={this.rename}/>
          </div>
        </div>
        <ReactTable
          style={{
            fontSize: 12,
            width: (this.props.width-2),
            height: (this.props.height-40)+"px",
          }}
          data={this.props.items.map( v => {
            return {
              filename: v,
            }
          })}
          columns={[{
            accessor: 'filename',
            Header: 'ファイル名',
            Cell: (props) => {
              return <div> { props.value } </div>
            },
          }]}
          getTrProps={(state, rowInfo) => {
            return {
              onClick: () => {
                this.props.setParams({ filename: rowInfo.original.filename }, () => {
                  this.props.load((err) => {
                    if (err.status !== 'OK') {
                      window.alert('ファイルの読み込みに失敗しました');
                    }
                  });
                })
              },
              style: {
                backgroundColor: `${(rowInfo && rowInfo.original.filename === this.props.filename) ? 'lightgreen' : 'inherit'}`,
              },
            }
          }}
          className="-striped -highlight"
          defaultSorted={[
            {
              id: "filename",
              desc: false,
            }
          ]}
          defaultPageSize={100}
        />
        <Modal
          show={this.state.show_create_file}
          size="lg"
          onHide={() => {
            this.setState({
              show_create_file: false,
            });
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              新規ファイルの作成
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <label>ファイル名:</label>
            <input
              type="text"
              style={{ width: '100%', }}
              value={this.state.new_filename}
              onChange={ (e) => {
                this.setState({
                  new_filename: e.target.value,
                })
              }}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => {
              this.setState({
                show_create_file: false,
              });
            }}>キャンセル</Button>
            <Button onClick={() => {
              this.setState({
                show_create_file: false,
              }, () => {
                this.props.create(this.state.new_filename, (res) => {
                  if (res.status !== 'OK' || typeof res.filename === 'undefined' ) {
                    window.alert('ファイルの保存に失敗しました');
                    return;
                  }
                  this.props.setParams({ filename: res.filename }, () => {
                    this.props.list((res) => {
                      if (res.status !== 'OK') {
                        window.alert('リストの読み込みに失敗しました');
                        return;
                      }
                      this.props.load((res) => {
                        if (res.status !== 'OK') {
                          window.alert('ファイルの読み込みに失敗しました');
                          return;
                        }
                        this.setState({
                          show_selector: false,
                        });
                      });
                    })
                  })
                });
              });
            }}>作成</Button>
          </Modal.Footer>
        </Modal>
        <Modal
          show={this.state.show_delete_file}
          size="lg"
          onHide={() => {
            this.setState({
              show_delete_file: false,
            });
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              ファイルの削除
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p style={{ fontSize: 16, marginBottom: 10, }} > ファイルを削除しますか？ </p>
            <p style={{ color: 'red', fontSize: 16, marginBottom: 10, }} > { this.props.filename } </p>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => {
              this.setState({
                show_delete_file: false,
              });
            }}>キャンセル</Button>
            <Button onClick={() => {
              this.setState({
                show_delete_file: false,
              }, () => {
                this.props.remove(this.props.filename, (res) => {
                  if (res.status !== 'OK') {
                    window.alert('ファイルの削除に失敗しました');
                    return;
                  }
                  this.props.list((res) => {
                    if (res.status !== 'OK') {
                      window.alert('リストの読み込みに失敗しました');
                      return;
                    }
                  })
                });
              });
            }}>削除</Button>
          </Modal.Footer>
        </Modal>
      </div>
    )
  }

  renderEditor() {
    return (
      <div style={{ fontSize: 12, }} >
        <div style={{ borderBottom: 'solid 1px gray', }}>
          <input style={{ marginLeft: 10, marginRight: 10, }} type="button" value="すべて再生" onClick={this.playAll}/>
          <input type="button" value="選択範囲を再生" onClick={this.playRange}/>
          <input type="button" value="停止" onClick={this.stop}/>
          <select  style={{ marginLeft: 10, height: 23,}} value={this.props.filename} onChange={(event) => {
            this.props.setParams({ filename: event.target.value }, () => {
              this.props.load();
            });
          }}>
            {
              (this.props.items) ? this.props.items.map( (p, i) => {
                return <option key={i} value={p}> {p} </option>
              }) : null
            }
          </select>
          <input type="button" value="一覧" onClick={() => {
            this.setState({
              show_selector: true,
            });
          }}/>
          {/* <input type="button" value="ログ" onClick={() => {
            this.setState({
              show_log_editor: !(this.state.show_log_editor),
            });
          }}/> */}
          {
            (this.props.loading) ? <span style={{ color: 'blue', fontSize: 12, paddingLeft: 5, paddingRight: 5, }}> {`読み込み中... : ${this.props.filename}`} </span> : null
          }
          {
            (this.props.saving) ? <span style={{ color: 'blue', fontSize: 12, paddingLeft: 5, paddingRight: 5, }}> {`保存中... : ${this.props.filename}`} </span> : null
          }
          {/* <input type="button" value="デバッグ" onClick={this.debug}/> */}
          <div style={{ display: 'inline', float: 'right' }}>
            <p style={{ display: 'inline', fontSize: 12 }}> { this.props.name } </p>
            <input style={{ display: 'inline',}} type="button" value="名前の変更" onClick={this.rename}/>
          </div>
        </div>
        {
          <AceEditor
            ref={ r => this.editor = r }
            style={{ display: 'inline-block', }}
            mode="senario_editor"
            theme="monokai"
            value={this.state.value}
            width={(this.state.show_log_editor)?"50%":"100%"}
            height={(this.props.height-40)+"px"}
            onChange={this.onChange}
            showPrintMargin={false}
            fontSize={18}
            onCursorChange={this.onCursorChange}
            name="senario_editor"
            editorProps={{$blockScrolling: Infinity}}
          />
        }
        {
          (this.state.show_log_editor) ? <AceEditor
            ref={ r => this.log_editor = r }
            mode="text"
            theme="chrome"
            value={this.state.log_value}
            width="50%"
            height={(this.props.height-40)+"px"}
            onChange={this.onLogChange}
            fontSize={18}
            name="log_editor"
            style={{ display: 'inline-block', }}
          /> : null
        }
      </div>
    )
  }

  renderTitle() {
    return (
      <div className="App">
        <Column style={{ height: '100%', }}>
          <div style={{ margin: 'auto', width: '100%', }}>
            <div style={{ marginBottom: 100, }}>
              <p style={{
                overflow: 'hidden',
                fontSize: this.props.fontSize,
                textAlign: 'middle',
                margin: 8,
                flex: 1,
              }}> おしゃべりロボエディタ </p>
              <div style={{ fontSize: this.props.fontSize*0.5, flex: 1, margin: 30, marginBottom: 0 }}>
                <label> あなたの名前： </label>
                <input ref={ d => this.entryName = d } type="text" className="Name-Input"/>
              </div>
              <select name="members" style={{
                appearance: 'none',
                marginLeft: 100,
                marginBottom: 30,
                border: '1px solid #999',
                //background: '#eee',
                width: '25%',
                height: 32,
              }} onChange={(event) => {
                if (event.target.value !== '-') {
                  this.entryName.value = event.target.value;
                }
              }}>
                {
                  (this.props.members) ? this.props.members.map( p => {
                    return <option value={p}> {p} </option>
                  }) : null
                }
              </select>
              <div style={{
                flex: 1,
                width: '30%',
                margin: 'auto',
              }}>
                <div>
                  <StartButton onClick={this.startQuiz}>
                    {
                      buttonValue("スタート", this.props.fontSize*4)
                    }
                  </StartButton>
                </div>
                <div>
                  <form method="GET" action="/logout/editor">
                    <input className="logoutButton" type="submit" value="logout" />
                  </form>
                </div>
              </div>
            </div>
          </div>
        </Column>
      </div>
    )
  }
}

App.defaultProps = {
  width: window.innerWidth,
  height: window.innerHeight,
  fontSize: 16,
}

export default connect(
  state => ( {
    name: state.app.name,
    text: state.app.text,
    fontSize: state.app.fontSize,
    width: state.app.width,
    height: state.app.height,
    members: state.app.members,
    items: (!state.app.items || state.app.items.length <= 0) ? ['最初のファイル.txt'] : state.app.items,
    filename: state.app.filename,
    loading: state.app.loading,
    saving: state.app.saving,
  } ),
  dispatch => ( {
    playSpeech: (text, callback) => dispatch( playSpeech(text, callback) ),
    stopSpeech: (text, callback) => dispatch( stopSpeech(text, callback) ),
    playScenario: (text, range, callback) => dispatch( playScenario(text, range, callback) ),
    stopScenario: (callback) => dispatch( stopScenario(callback) ),
    save: (text, callback) => dispatch( save(text, callback) ),
    create: (filename, callback) => dispatch( create(filename, callback) ),
    remove: (filename, callback) => dispatch( remove(filename, callback) ),
    load: (callback) => dispatch( load(callback) ),
    list: (callback) => dispatch( list(callback) ),
    onLayout: (size) => dispatch( changeLayout(size) ),
    setParams: (payload, callback) => dispatch( setParams(payload, callback) ),
  })
)(App);
