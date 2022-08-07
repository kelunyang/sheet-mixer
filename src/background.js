'use strict'
import _ from 'lodash';
import path from 'path';
import dayjs from 'dayjs';
import { app, protocol, ipcMain, BrowserWindow } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  ipcMain.on("mergeData",async (event, arg)  => {
    try {
      win.webContents.send("mergeStatus", {
        data: "匡列被選取的表格和欄位",
        tick: dayjs().valueOf()
      });
      let columnTOBE = [];
      let tableTOBE = [];
      let valueTOBE = [];
      let exportDB = [];
      let output = [];
      for(let i=0; i<arg.setDB.length; i++) {
        for(let k=0; k<arg.setDB[i].set.length; k++) {
          columnTOBE.push(arg.setDB[i].set[k]);
        }
      }
      columnTOBE = _.uniqBy(columnTOBE, (column) => {
        return column.id;
      });
      for(let i=0; i<columnTOBE.length; i++) {
        let table = _.filter(arg.tableDB, (table) => {
          return table.id === columnTOBE[i].table;
        });
        if(table.length > 0) {
          tableTOBE.push(table[0]);
        }
      }
      tableTOBE = _.uniqBy(tableTOBE, (table) => {
        return table.id;
      });
      win.webContents.send("mergeStatus", {
        data: "鎖定被匡列的資料",
        tick: dayjs().valueOf()
      });
      let mainCells = _.filter(arg.cellDB, (cell) => {
        return cell.table === "main";
      });
      let mainTable = _.filter(arg.tableDB, (table) => {
        return table.id === "main";
      });
      for(let i=0; i<mainTable[0].data.length; i++) {
        let values = [];
        let uidFilter = [];
        for(let k=0; k<mainCells.length; k++) {
          if(mainCells[k].uid === mainTable[0].data[i]) {
            for(let r=0; r<arg.uidDB.length; r++) {
              if(mainCells[k].column === arg.uidDB[r].id) {
                uidFilter.push(mainCells[k]);
              }
            }
          }
        };
        for(let k=0; k<tableTOBE.length; k++) {
          for(let r=0; r<tableTOBE[k].data.length; r++) {
            let uid = "";
            for(let c=0; c<uidFilter.length; c++) {
              if(tableTOBE[k].data[r] === uidFilter[c].value) {
                uid = tableTOBE[k].data[r];
                break;
              }
            }
            if(uid !== "") {
              for(let c=0; c<columnTOBE.length; c++) {
                let cell = _.filter(arg.cellDB, (cell) => {
                  if(cell.table === tableTOBE[k].id) {
                    if(cell.column === columnTOBE[c].id) {
                      if(cell.uid === uid) {
                        return true;
                      }
                    }
                  }
                  return false;
                });
                if(cell.length > 0) {
                  values.push(cell[0]);
                }
              }
            }
          }
        }
        valueTOBE.push(values);
      }
      win.webContents.send("mergeStatus", {
        data: "組合輸出報表",
        tick: dayjs().valueOf()
      });
      for(let k=0; k<valueTOBE.length; k++) {
        let row = {};
        let uid = "";
        if(valueTOBE[k].length > 0) {
          uid = valueTOBE[k][0].uid;
        }
        for(let i=0; i<arg.setDB.length; i++) {
          let value = "";
          let values = [];
          let output = [];
          for(let r=0; r<arg.setDB[i].set.length; r++) {
            let cell = _.filter(valueTOBE[k], (vtb) => {
              return vtb.column === arg.setDB[i].set[r].id;
            })
            if(cell.length > 0) {
              values.push(cell[0]);
            }
          }
          for(let r=0; r<values.length; r++) {
            if(arg.setDB[i].text === "0") {
              if(new RegExp(arg.setDB[i].regexTest).test(values[r].value)) {
                output.push(arg.setDB[i].regexResult);
              } else {
                output.push(values[r].value);
              }
            } else if(arg.setDB[i].text === "1") {
              let str = "";
              if(values[r].value.length > 0) {
                str = values[r].value.slice(0,1);
              }
              if(values[r].value.length > 2) {
                str += arg.setDB[i].replacer.repeat(values[r].value.length - 2);
                str += values[r].value.slice(-1);
              }
              if(values[r].value.length === 2) {
                str += arg.setDB[i].replacer.repeat(values[r].value.length - 1);
              }
              output.push(str);
            } else if(arg.setDB[i].text === "2") {
              let customFunction = Function("x", arg.setDB[i].textFunction);
              output.push(customFunction(values[r].value));
            }
          }
          if(arg.setDB[i].method === "0") {
            if(output.length > 0) {
              value = output[0];
            } else {
              win.webContents.send("mergeStatus", {
                data: "[" + uid + "]在欄位[" + arg.setDB[i].name + "]時資料為空",
                tick: dayjs().valueOf()
              });
            }
          } else if(arg.setDB[i].method === "1") {
            value = _.join(output, arg.setDB[i].mixer);
          } else if(arg.setDB[i].method === "2") {
            value = (_.sumBy(output, (val) => {
              let num = parseFloat(val);
              if(Number.isNaN) {
                win.webContents.send("mergeStatus", {
                  data: "[" + uid + "]在欄位[" + arg.setDB[i].name + "]時遇到不是數字的資料，已轉換為0",
                  tick: dayjs().valueOf()
                });
                return 0;
              } else {
                return num;
              }
            })).toFixed(2);
          } else if(arg.setDB[i].method === "3") {
            value = (_.meanBy(output, (val) => {
              let num = parseFloat(val);
              if(Number.isNaN) {
                win.webContents.send("mergeStatus", {
                  data: "[" + uid + "]在欄位[" + arg.setDB[i].name + "]時遇到不是數字的資料，已轉換為0",
                  tick: dayjs().valueOf()
                });
                return 0;
              } else {
                return num;
              }
            })).toFixed(2);
          } else if(arg.setDB[i].method === "4") {
            let customFunction = Function("x", arg.setDB[i].function);
            value = customFunction(output);
          }
          row[arg.setDB[i].name] = value;
        }
        exportDB.push(row);
      }
      win.webContents.send("mergeStatus", {
        data: "組合完畢！",
        tick: dayjs().valueOf()
      });
      if(arg.grouping) {
        win.webContents.send("mergeStatus", {
          data: "啟動分組",
          tick: dayjs().valueOf()
        });
        let groupColumn = _.filter(arg.setDB, (column) => {
          return column.id === arg.groupingColumn;
        });
        if(groupColumn.length > 0) {
          let columnName = groupColumn[0].name;
          let groups = _.map(_.uniqBy(exportDB, (row) => {
            return row[columnName];
          }), columnName);
          win.webContents.send("mergeStatus", {
            data: "你的資料將拆分成" + groups.length + "個資料表輸出",
            tick: dayjs().valueOf()
          });
          for(let i=0; i<groups.length; i++) {
            output.push({
              name: groups[i].replace(/\/|\\/,''),
              content: _.filter(exportDB, (row) => {
                return row[columnName] === groups[i]
              })
            });
          }
        }
      } else {
        output.push({
          name: "輸出結果",
          content: exportDB
        });
      }
      win.webContents.send("mergeResult", {
        data: output,
        tick: dayjs().valueOf()
      });
      win.webContents.send("mergeStatus", {
        data: "輸出完畢，你可以下載結果了",
        tick: dayjs().valueOf()
      });
    } catch(e) {
      console.dir(e);
      win.webContents.send("mergeStatus", {
        data: "發生錯誤"+e.message,
        tick: dayjs().valueOf()
      });
    }
  });  

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

function columnnameFinder(columnDB, id) {
  let col = _.filter(columnDB, (c) => {
    return c.id === id;
  });
  if(col.length > 0) {
    return col[0].name;
  }
  return ""
}
function tablenameFinder(tableDB, id) {
  let tab = _.filter(tableDB, (t) => {
    return t.id === id;
  });
  if(tab.length > 0) {
    return tab[0].name;
  }
  return ""
}