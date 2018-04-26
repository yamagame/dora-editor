import React, { Component }  from 'react';
import { connect } from 'react-redux'
import Button from './components/Button';
import Column from './components/Column';
import AceEditor from 'react-ace';
import {
  playSpeech,
  stopSpeech,
  playScenario,
  stopScenario,
  save,
  load,
  list,
  changeLayout,
  setParams,
} from './reducers'
import './App.css';

import 'brace/mode/plain_text';
import './libs/example_mode';
import 'brace/theme/monokai';

function buttonValue(v, height, host) {
  if (typeof v !== 'object') {
    return <p> { v } </p>;
  }
  if (v.image) {
    return <div style={{ marginTop: 10, }} ><img alt="icon" style={{ margin: 'auto', padding: 0, pointerEvents: 'none', }} height={height-4} src={(host) ? host+v.image : v.image} /></div>
  }
  return <p> { v.value } </p>;
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: "",
      row: 0,
      width: window.innerWidth,
      height: window.innerHeight,
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
        this.saveTimeout = null;
      });
    }, 1000);
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
    return this.renderEditor({})
  }

  renderEditor() {
    return (
      <div>
        <input type="button" value="すべて再生" onClick={this.playAll}/>
        <input type="button" value="選択範囲を再生" onClick={this.playRange}/>
        <input type="button" value="停止" onClick={this.stop}/>
        <select value={this.props.filename} onChange={(event) => {
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
        {/* <input type="button" value="デバッグ" onClick={this.debug}/> */}
        <div style={{ display: 'inline', float: 'right' }}>
          <p style={{ display: 'inline', fontSize: 12}}> { this.props.name } </p>
          <input style={{ display: 'inline',}} type="button" value="名前の変更" onClick={this.rename}/>
        </div>
        <AceEditor
          ref={ r => this.editor = r }
          mode="example"
          theme="monokai"
          value={this.state.value}
          width="100" //{this.props.width}
          height={(this.props.height-40)+"px"}
          onChange={this.onChange}
          showPrintMargin={false}
          fontSize={18}
          onCursorChange={this.onCursorChange}
          name="UNIQUE_ID_OF_DIV"
          editorProps={{$blockScrolling: Infinity}}
        />
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
                  <Button onClick={this.startQuiz}>
                    {
                      buttonValue("スタート", this.props.fontSize*4)
                    }
                  </Button>
                </div>
              </div>
              <p style={{
                flex: 1,
                fontSize: this.props.fontSize*0.4,
              }}>
                名前を選択してスタートボタンをクリックしてね！
              </p>
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
  } ),
  dispatch => ( {
    playSpeech: (text, callback) => dispatch( playSpeech(text, callback) ),
    stopSpeech: (text, callback) => dispatch( stopSpeech(text, callback) ),
    playScenario: (text, range, callback) => dispatch( playScenario(text, range, callback) ),
    stopScenario: (callback) => dispatch( stopScenario(callback) ),
    save: (text, callback) => dispatch( save(text, callback) ),
    load: (callback) => dispatch( load(callback) ),
    list: (callback) => dispatch( list(callback) ),
    onLayout: (size) => dispatch( changeLayout(size) ),
    setParams: (payload, callback) => dispatch( setParams(payload, callback) ),
  })
)(App);
