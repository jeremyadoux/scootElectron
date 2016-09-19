const {app, BrowserWindow, Menu, Tray, MenuItem, shell, ipcMain} = require('electron')
const storage = require('electron-json-storage')
const promisedrestclient = require('promised-rest-client')({url : ""});
const promise = require('promise');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const storageGroupMailName = "groupMailList"
let winAccount = null
let winFavorite = null
let tray = null

app.on('ready', () => {
  createTray()
})

ipcMain.on('asynchronous-message', (event, arg) => {
  console.log(arg)  // prints "ping"
  event.sender.send('asynchronous-reply', 'pong')
})

function openWindowAccount () {
  if(winAccount != null) {
    winAccount.show()
  } else {
    // Create the browser window.
    winAccount = new BrowserWindow({width: 800, height: 600})

    // and load the index.html of the app.
    winAccount.loadURL(`file://${__dirname}/account.html`)
    winAccount.openDevTools();
    // Emitted when the window is closed.
    winAccount.on('close', (e) => {
      e.preventDefault()
      winAccount.hide()
    })
  }
}

function openWindowFavorite () {
  if(winFavorite != null) {
    winFavorite.show()
  } else {
    // Create the browser window.
    winFavorite = new BrowserWindow({width: 800, height: 600})

    // and load the index.html of the app.
    winFavorite.loadURL(`file://${__dirname}/favorite.html`)
    winFavorite.openDevTools();
    // Emitted when the window is closed.
    winFavorite.on('close', (e) => {
      e.preventDefault()
      winFavorite.hide()
    })
  }
}

function createTray() {
  if(tray != null) {
    tray.destroy()
    tray = null
  }

  getGroupList().then((groupList) => {
    tray = new Tray(__dirname + '\\images\\scout.ico')

    const menu = new Menu()

    Array.from(groupList).forEach(function(group) {
      menu.append(new MenuItem({label: group.name, click() {
        shell.openExternal("mailto:"+ group.mailList.join(";"))
      }}))
    })

    menu.append(new MenuItem({label: "Refresh", click() {
      createTray()
    }}))

    menu.append(new MenuItem({label: "Account", click() {
      openWindowAccount()
    }}))

    menu.append(new MenuItem({label: "Favorite", click() {
      openWindowFavorite()
    }}))

    tray.setToolTip('ScoutApps')
    tray.setContextMenu(menu)
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
