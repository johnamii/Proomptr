const { app, globalShortcut, ipcMain, BrowserWindow } = require("electron");
const Store = require('electron-store');
const { checkConfig, getAPIResponse, getStreamedAPIResponse } = require('./openai')
const path = require('path');
const os = require('os')
const platform = os.platform();

const store = new Store({
  defaults: {
    completionOptions: {
      model: "gpt-3.5-turbo",
      max_tokens: 500,
      stream: true,
    },
    system_messages: [
      "You are a friendly assistant.", 
      "Format your responses in Markdown.",
      ''
    ],
    toggleWindowKey: 'Control+Space',
    toggleConvoKey: 'Alt',
  }
});

const initialConvo = [
  { role:"system", content: store.get("system_messages")[0] },
  { role:"system", content: store.get("system_messages")[1]},
  { role:"system", content: store.get("system_messages")[2]},
];
var dynamicConvo = initialConvo.slice();

const vibrancyOptions = {
  theme: 'appearance-based',
  effect: 'acrylic',
  useCustomWindowRefreshMethod: true,
  maximumRefreshRate: 60,
  disableOnBlur: true
}

var mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 70,
    icon: './assets/Freepik-pin-icon.ico',
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    hasShadow: true,
    resizable: true,
    movable: true,
    transparent: platform === 'darwin'
  });

  console.log("Platform:", platform)
  if (platform === 'darwin') {
    mainWindow.setVibrancy('titlebar');
  }
  else if (platform === 'win32') {
    const { setVibrancy } = require("electron-acrylic-window");
    setVibrancy(mainWindow, [vibrancyOptions]);
  }

  mainWindow.setAspectRatio(0);

  console.log("Initializing Proomptr");

  // listener awaits for prompt submission from window
  ipcMain.on('get-prompt', async (event, prompt) => {

    if (!checkConfig()) {
      console.error("Configuration error: API or Org");
      event.sender.send('update-div', 'Improperly configured API key or ORG ID. Both must be set as system variables, and your OpenAI account must have a payment method set up.');
      return;
    }

    // filter out short prompts
    if (prompt.length > 10) {
      console.log("Received prompt");

      dynamicConvo.push({"role": "user", "content": prompt});

      let options = store.get('completionOptions');
      options.messages = dynamicConvo;

      if (options.stream === true) {
        getStreamedAPIResponse(prompt, options, event.sender);
      }
      else {
        getAPIResponse(prompt, options, event.sender);
      }
    }
    else if (prompt === 'longText') {
      console.log("Testing with long response");
      let longText = '';
      for (let i = 0; i < 50; i++) {
        longText += "hello   world   hello   world    hello world   hello   world   hello   world    <br />";
      }
      event.sender.send('update-div', longText, false);
    }
    else {
      console.log("Prompt should be greater than 10 characters");
      event.sender.send('update-div', "Please enter a longer prompt.", false);
    }
  });

  // handle resize of the document
  ipcMain.on('window-resize', (event, arg) => {
    const h1 = mainWindow.getSize()[1];
    mainWindow.setSize(arg[0], arg[1]);
    //console.log(arg[1])

    // center on screen if size too large or difference is large
    if ( arg[1] > 300 || Math.abs(h1-arg[1]) > 150 ) {
      mainWindow.center();
    }
  });

  // clear conversation if reset button clicked
  ipcMain.on('reset-convo', (event, arg) => {
    console.log("Cleaning up conversation")
    dynamicConvo = initialConvo.slice();
  });

  // handle request for current application options, send them to window
  ipcMain.handle('request-options', (event, key) => {
    // return specific data if key specified, else return all data
    var userSettings = key ? store.get(key) : {
      completionOptions: store.get('completionOptions'),
      system_messages: store.get('system_messages'),
      toggleWindowKey: store.get('toggleWindowKey'),
      toggleConvoKey: store.get('toggleConvoKey')
    };
    
    return userSettings;
  });

  // set new options received from window
  ipcMain.on('set-options', (event, settings) => {
    console.log("Saving options")
    store.set("completionOptions", settings.completionOptions);
    store.set('system_messages', settings.system_messages);
    store.set('toggleWindowKey', settings.toggleWindowKey);
    store.set('toggleConvoKey', settings.toggleConvoKey);

    toggleWindowKey = settings.toggleWindowKey;
    registerHotkey();
    initialConvo[0].content = settings.system_messages[0];
    initialConvo[1].content = settings.system_messages[1];
    initialConvo[2].content = settings.system_messages[2];
    dynamicConvo = initialConvo.slice();
  });

  // close program
  ipcMain.on('shutdown', () => {
    console.log("Shutting app down.")
    app.quit();
  });

  mainWindow.loadFile('./src/index.html');
}

// Register a hotkey that can trigger a function when pressed
var toggleWindowKey = store.get("toggleWindowKey");
function registerHotkey() {
  // Use Ctrl+Space as an example
  
  const ret = globalShortcut.register(toggleWindowKey, () => {;
    // Toggle the window visibility
    setTimeout(() => {
      toggleWindow();
    }, 100);
  });

  if (!ret) {
    console.log("Registration failed");
  }
}

// Create the window and register the hotkey when the app is ready
app.whenReady().then(() => {
  createWindow();
  registerHotkey();
});

// Hide the window when it loses focus
app.on("browser-window-blur", () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Quit the app when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Toggle the window visibility
function toggleWindow() {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      // Hide the window if it is visible
      console.log("Proomptr window hidden.");
      mainWindow.hide();
      
    } else {
      // Show the window if it is hidden
      console.log("Proomptr window showing.")
      mainWindow.show();
      setTimeout(() => {
        mainWindow.focus();
      }, 100)
    }
  }
}