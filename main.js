const {app, BrowserWindow, Menu, Tray, MenuItem, shell, ipcMain, clipboard, dialog } = require('electron');
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
const storageFavoriteGroup = "favoriteGroup";
let winAccount = null;
let winFavorite = null;
let tray = null;
let parser = new xml2js.Parser();
let builder = new xml2js.Builder();
let authenticateToken;

let obj = {};
let doubleClick = 0;
let currentTimeout;

app.on('ready', () => {
  createTray();
  executeIntroduction().then( function() {});
});

ipcMain.on('authentication-message', (event, arg) => {
  getTokenAuthentication(arg.login, arg.password).then(function(body, err) {
    if(typeof body != 'undefined' && typeof body.authenticate != 'undefined') {
      storage.set(storageAccountPassword, {login: arg.login, password: arg.password}, (error) => {
        if (error) throw error;
      });
      authenticateToken = body.authenticate.body["0"].token["0"].$.key;

      createTray();
      winAccount.hide();
    } else {
      event.sender.send('authentication-failed', null);
    }
  }, function(e) {
    event.sender.send('authentication-failed', null);
  });
});

ipcMain.on('load-group-list', (event, arg) => {
  executeIntroduction().then(function() {
    getListGroupUser().then(function(groupList) {
      addFavoriteOnGroupList(groupList).then(function(data) {
        event.sender.send('group-list-loaded', data);
      })
    });
  }, function(e) {
    storage.get(storageGroupList, (error, data) => {
      if (error) throw error;
      addFavoriteOnGroupList(data).then(function(data) {
        event.sender.send('group-list-loaded', data);
      })
    });
  });
});

ipcMain.on('save-group-favorite', (event, arg) => {
  storage.set(storageFavoriteGroup, arg, (error) => {
    if (error) throw error;
    createTray();
    winFavorite.hide();
  });
});

ipcMain.on('test-ail-list', (event, arg) => {
  event.sender.send('plop', obj);
});

function addFavoriteOnGroupList(groupList) {
  return new promise((resolve, reject) => {
    storage.get(storageFavoriteGroup, (error, data) => {
      if (error) throw error;
      for (var i in groupList.view.body["0"].organization["0"].group) {
        for (var j in data) {
          if (groupList.view.body["0"].organization["0"].group[i].$.id == data[j].$.id) {
            groupList.view.body["0"].organization["0"].group[i].favorite = data[j].favorite;
          }
        }
      }

      resolve(groupList);
    });
  });
}

function openWindowAccount () {
  if(winAccount != null) {
    winAccount.show();
  } else {
    // Create the browser window.
    winAccount = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    winAccount.loadURL(`file://${__dirname}/account.html`);
    //winAccount.openDevTools();
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
    //winFavorite.openDevTools();
    // Emitted when the window is closed.
    winFavorite.on('close', (e) => {
      e.preventDefault();
      winFavorite.hide();
    })
  }
}

/*

 <?xml version="1.0" encoding="UTF-8"?>
 <view xmlns:vw1="http://www.axemble.com/vdoc/view">
   <header>
     <configuration>
      <param name="maxlevel" value="-1" />
     </configuration>
     <scopes>
      <group protocol-uri="uri://vdoc/group/143" />
     </scopes>
     <definition class="com.axemble.vdoc.sdk.interfaces.IGroup" >
        <definition class="com.axemble.vdoc.sdk.interfaces.IUser" />
     </definition>
   </header>
 </view>

 */
function getGroupMailList(idGroup) {
  return new promise((resolve, reject) => {
    storage.get(storageAccountPassword, (error, data) => {
      if (error) throw error;
      if (typeof data.login != 'undefined' && data.password != 'undefined') {
        getTokenAuthentication(data.login, data.password).then(function (body, err) {
          if (typeof body != 'undefined' && typeof body.authenticate != 'undefined') {
            authenticateToken = body.authenticate.body["0"].token["0"].$.key;

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
                  scopes: {
                    group: {
                      $: {
                        "protocol-uri": "uri://vdoc/group/"+idGroup
                      }
                    }
                  },
                  definition: {
                    $: {
                      class: 'com.axemble.vdoc.sdk.interfaces.IGroup'
                    },
                    definition: {
                      $: {
                        class: 'com.axemble.vdoc.sdk.interfaces.IUser'
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

            executeRequest(options, xml).then(function(e) {
              parser.parseString(e, function (err, result) {
                storage.get(storageFavoriteGroup, (error, groupList) => {
                  Array.from(groupList).forEach(function(group) {
                    if(group.$.id == idGroup) {
                      let mailList = [];
                      for(var i in result.view.body[0].user) {
                        mailList.push(result.view.body[0].user[i].$.email);
                      }

                      group.mailList = mailList;
                      storage.set(storageFavoriteGroup, groupList, (error) => {
                        if (error) throw error;

                        resolve(group.mailList);
                      });
                    }
                  });
                });
              });
            });
          } else {
            storage.get(storageFavoriteGroup, (error, groupList) => {
              Array.from(groupList).forEach(function(group) {
                if(group.$.id == idGroup) {
                  if(typeof group.mailList != 'undefined' && group.mailList.length > 0) {
                    resolve(group.mailList);
                  } else {
                    reject();
                    openWindowAccount();
                  }
                }
              });
            });
          }
        }, function(e) {
          storage.get(storageFavoriteGroup, (error, groupList) => {
            Array.from(groupList).forEach(function(group) {
              if(group.$.id == idGroup) {
                if(typeof group.mailList != 'undefined' && group.mailList.length > 0) {
                  resolve(group.mailList);
                } else {
                  reject();
                  openWindowAccount();
                }
              }
            });
          });
        });
      } else {
        storage.get(storageFavoriteGroup, (error, groupList) => {
          Array.from(groupList).forEach(function(group) {
            if(group.$.id == idGroup) {
              if(typeof group.mailList != 'undefined' && group.mailList.length > 0) {
                resolve(group.mailList);
              } else {
                reject();
                openWindowAccount();
              }
            }
          });
        });
      }
    });
  });
}

function createTray() {
  if(tray != null) {
    tray.destroy();
    tray = null;
  }

  storage.get(storageFavoriteGroup, (error, groupList) => {
    tray = new Tray(__dirname + '\\images\\scout.ico');

    const menu = new Menu();

    Array.from(groupList).forEach(function(group) {
      if(group.favorite) {
        menu.append(new MenuItem({
          label: group.$.label, click(menuItem, browserWindows, event) {
            //menuItem.commandId
            getGroupMailList(group.$.id).then(function (mailList) {
              if(event.ctrlKey) {
                clipboard.writeText(mailList.join(";"));
              } else {
                shell.openExternal("mailto:" + mailList.join(";"));
              }
            });
          }
        }))
      }
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
  });
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

function getTokenAuthentication(login, password) {
  return new promise((resolve, reject) => {
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
      host: "vdoc-prod.vdocsuite.com",
      path: '/vdoc/navigation/flow?module=portal&cmd=authenticate',
      method: "POST"
    };

    executeRequest(options, xml).then(function (e) {
      parser.parseString(e, function (err, result) {
        resolve(result, err);
      });
    }, function(e) {
      reject(e);
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

      executeRequest(options, xml).then(function(e) {
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

function executeRequest(options, body) {
  return new promise((resolve, reject) => {
    var req = http.request(options, function (res) {
      res.setEncoding('utf8');
      let output = '';
      res.on('data', function (chunk) {
        output += chunk;
      });

      res.on('end', function () {
        resolve(output);
      });
    });
    req.on('error', function (e) {
      reject(e)
    });
    req.write(body);
    req.end();
  });
}

function executeIntroduction() {
  return new promise((resolve, reject) => {
    storage.get(storageAccountPassword, (error, data) => {
      if (error) throw error;
      if (typeof data.login != 'undefined' && data.password != 'undefined') {
        getTokenAuthentication(data.login, data.password).then(function (body, err) {
          if (typeof body != 'undefined' && typeof body.authenticate != 'undefined') {
            authenticateToken = body.authenticate.body["0"].token["0"].$.key;
            resolve();
          } else {
            openWindowAccount();
            reject()
          }
        }, function(e) {
          reject(e);
        });
      } else {
        openWindowAccount();
        reject()
      }
    });
  });
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
