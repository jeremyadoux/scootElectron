const {app, BrowserWindow, Menu, Tray, MenuItem, shell, ipcMain} = require('electron');
const xml2js = require('xml2js');
const storage = require('electron-json-storage');
const promisedrestclient = require('promised-rest-client')({url : ""});
const promise = require('promise');
const http = require('http');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const storageGroupMailName = "groupMailList";
const storageGroupList = "groupList";
const storageAccountPassword = "accountPassword";
let winAccount = null;
let winFavorite = null;
let tray = null;
let parser = new xml2js.Parser();
let builder = new xml2js.Builder();
let authenticateToken;

app.on('ready', () => {
  executeIntroduction().then(createTray, function() {});
});

ipcMain.on('authentication-message', (event, arg) => {
  getTokenAuthentication(arg.login, arg.password, function(body, err) {
    if(typeof body != 'undefined' && typeof body.authenticate != 'undefined') {
      storage.set(storageAccountPassword, {login: arg.login, password: arg.password}, (error) => {
        if (error) throw error;
      });
      authenticateToken = body.authenticate.body["0"].token["0"].$.key;

      createTray();
    } else {
      event.sender.send('authentication-failed', null);
    }
  });
});

ipcMain.on('load-group-list', (event, arg) => {
  executeIntroduction().then(function() {
    getListGroupUser().then(function(groupList) {
      event.sender.send('group-list-loaded', groupList);
    });
  });
});

function openWindowAccount () {
  if(winAccount != null) {
    winAccount.show();
  } else {
    // Create the browser window.
    winAccount = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    winAccount.loadURL(`file://${__dirname}/account.html`);
    winAccount.openDevTools();
    // Emitted when the window is closed.
    winAccount.on('close', (e) => {
      e.preventDefault();
      winAccount.hide();
    })
  }
}

function openWindowFavorite () {
  if(winFavorite != null) {
    winFavorite.show();
  } else {
    // Create the browser window.
    winFavorite = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    winFavorite.loadURL(`file://${__dirname}/favorite.html`);
    winFavorite.openDevTools();
    // Emitted when the window is closed.
    winFavorite.on('close', (e) => {
      e.preventDefault();
      winFavorite.hide();
    })
  }
}

function getGroupListFavorite() {

}

function createTray() {
  if(tray != null) {
    tray.destroy();
    tray = null;
  }

  getGroupList().then((groupList) => {
    tray = new Tray(__dirname + '\\images\\scout.ico');

    const menu = new Menu();

    Array.from(groupList).forEach(function(group) {
      menu.append(new MenuItem({label: group.name, click() {
        shell.openExternal("mailto:"+ group.mailList.join(";"))
      }}))
    });

    menu.append(new MenuItem({label: "Refresh", click() {
      createTray();
    }}));

    menu.append(new MenuItem({label: "Account", click() {
      openWindowAccount();
    }}));

    menu.append(new MenuItem({label: "Favorite", click() {
      openWindowFavorite();
    }}));

    tray.setToolTip('ScoutApps');
    tray.setContextMenu(menu);
  })
}

function getGroupList(callback) {
  return new promise((resolve, reject) =>  {
    promisedrestclient.get({
      url: 'mailgroups'
    }).then((groupList) => {
      storage.set(storageGroupMailName, groupList, (error) => {
        if (error) throw error;
      });
      resolve(groupList)
    }).catch((err) => {
      storage.get(storageGroupMailName, (error, data) => {
        if (error) throw error;
        resolve(data)
      });
    })
  })
}

function getTokenAuthentication(login, password, callback) {
  let account = {
    authenticate: {
      header: {
        $: {
          login: login,
          password: password,
          timeout: 30
        }
      }
    }
  };

  let xml = builder.buildObject(account);

  let options = {
    host : "vdoc-prod.vdocsuite.com",
    path : '/vdoc/navigation/flow?module=portal&cmd=authenticate',
    method: "POST"
  };

  executeRequest(options, xml, function(e) {
    parser.parseString(e, function (err, result) {
      callback(result, err);
    });
  });
}

function getListGroupUser() {
  return new promise((resolve, reject) => {
    if (typeof authenticateToken != 'undefined') {
      let xmlJson = {
        view: {
          $: {
            'mlns:vw1': 'http://www.axemble.com/vdoc/view'
          },
          header: {
            configuration: {
              param: {
                $: {
                  name: 'maxlevel',
                  value: -1
                }
              }
            },
            definition: {
              $: {
                class: 'com.axemble.vdoc.sdk.interfaces.IOrganization'
              },
              definition: {
                $: {
                  class: 'com.axemble.vdoc.sdk.interfaces.IGroup'
                }
              }
            }
          }
        }
      };

      let xml = builder.buildObject(xmlJson);

      let options = {
        host : "vdoc-prod.vdocsuite.com",
        path : '/vdoc/navigation/flow?module=directory&cmd=view&_AuthenticationKey='+authenticateToken,
        method: "POST"
      };

      executeRequest(options, xml, function(e) {
        parser.parseString(e, function (err, result) {
          storage.set(storageGroupList, result, (error) => {
            if (error) throw error;
          });
          resolve(result)
        });
      });
    } else {
      storage.get(storageGroupList, (error, data) => {
        if (error) throw error;
        resolve(data)
      });
    }
  });
}

function executeRequest(options, body, callback) {
  var req = http.request(options, function(res){
    res.setEncoding('utf8');
    let output='';
    res.on('data',function(chunk){
      output +=chunk;
    });

    res.on('end',function(){
      callback(output);
    });
  });
  req.on('error',function(e){
    callback(e)
  });
  req.write(body);
  req.end();
}

function executeIntroduction() {
  return new promise((resolve, reject) => {
    storage.get(storageAccountPassword, (error, data) => {
      if (error) throw error;
      if (typeof data.login != 'undefined' && data.password != 'undefined') {
        getTokenAuthentication(data.login, data.password, function (body, err) {
          if (typeof body != 'undefined' && typeof body.authenticate != 'undefined') {
            authenticateToken = body.authenticate.body["0"].token["0"].$.key;
            resolve();
          } else {
            openWindowAccount();
            reject()
          }
        });
      } else {
        openWindowAccount();
        reject()
      }
    });
  });
}

/*
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

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
  if (win === null) {
    createWindow()
  }
})
*/
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
