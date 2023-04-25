const { Configuration, OpenAIApi } = require('openai');
const { app, globalShortcut, ipcMain, BrowserWindow } = require("electron");
const Store = require('electron-store');
const path = require('path');
const os = require('os')
const platform = os.platform();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID;
const openAIConfiguration = new Configuration({ organization: OPENAI_ORG_ID, apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(openAIConfiguration);

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
var toggleWindowKey = store.get("toggleWindowKey");

const defaultConvo = [
  { role:"system", content: store.get("system_messages")[0] },
  { role:"system", content: store.get("system_messages")[1]},
  { role:"system", content: store.get("system_messages")[2]},
];

var dynamicConvo = defaultConvo.slice();

const vibOptions = {
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
    setVibrancy(mainWindow, [vibOptions]);
  }

  mainWindow.setAspectRatio(0);

  console.log("Initializing Proomptr");

  // listener awaits for prompt submission from window
  ipcMain.on('get-prompt', async (event, prompt) => {

    if (!openAIConfiguration.apiKey || !openAIConfiguration.organization) {
      console.error("Configuration error: API or Org");
      event.sender.send('update-div', 'Improperly configured API key or ORG ID');
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
    dynamicConvo = defaultConvo.slice();
  });

  // handle request for current application options, send them to window
  ipcMain.handle('request-options', (event, key) => {
    // return specific data if key specified, else return all data
    var userSettings = key ? store.get(key) : {
      completionOptions: store.get('completionOptions'),
      system_messages: store.get('system_messages'),
      toggleWindowKey: store.get('toggleWindowKey'),
      toggleConvoKey: store.get('toggleConvoKey')
    }
    
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
    defaultConvo[0].content = settings.system_messages[0];
    defaultConvo[1].content = settings.system_messages[1];
    defaultConvo[2].content = settings.system_messages[2];
    dynamicConvo = defaultConvo.slice();
  });

  // close program
  ipcMain.on('shutdown', () => {
    console.log("Shutting app down.")
    app.quit();
  });

  mainWindow.loadFile('./src/index.html');
}

async function getAPIResponse(prompt, options, target) {

  let message;

  // Call the OpenAI API with the prompt
  await openai.createChatCompletion(options)
  .then((response) => {
    message = response.data.choices[0].message.content;
  })
  .catch((error) => {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
    target.send('update-div', error.message, false);
  });

  dynamicConvo.push({"role": "assistant", "content": message});
  //console.log("Response: " + message)
  target.send('update-div', message, false);
}

async function getStreamedAPIResponse(prompt, options, target){
  try {
    console.log("Awaiting response");
    const res = await openai.createChatCompletion(options, {responseType: 'stream'});
    var fullMessage = "";

    target.send('update-div', '[START]', true);
    res.data.on('data', data => {
      const lines = data.toString().split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        const message = line.replace(/^data: /, '');
        if (message === '[DONE]') {
          console.log("Response complete.",);
          dynamicConvo.push({"role": "assistant", "content": fullMessage});
          target.send('update-div', "[DONE]", true);
          return; // Stream finished
        }
        try {
          const parsed = JSON.parse(message);
          let chunk = parsed.choices[0].delta.content;
          if (chunk != undefined) {
            fullMessage += chunk;
            target.send('update-div', chunk, true);
          }
        } catch(error) {
          console.error('Could not JSON parse stream message', message, error);
        }
      }
    });
  } catch {
    console.log("Something went wrong.");
    target.send('update-div', "Error with OpenAI response, please check model, API Key, or ORG ID")
  }
}

// Register a hotkey that can trigger a function when pressed
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