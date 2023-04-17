const { Configuration, OpenAIApi } = require('openai');
const { app, globalShortcut, ipcMain } = require("electron");
const { BrowserWindow } = require("electron-acrylic-window");
const path = require('path');
const Store = require('electron-store');

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
    toggleWindowKey: 'Control+Space',
    toggleConvoKey: 'Alt',
  }
});

const defaultConvo = [
  { role:"system", content: "You are a friendly assistant." },
  { role:"system", content: "Format your messages in HTML, using only <br> or <p>"},
];

var dynamicConvo = defaultConvo.slice();

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
  });

  mainWindow.setAspectRatio(0);

  console.log("Initializing Proomptr");
  
  //mainWindow.hide(); // Hide the window by default 

  // set listener for prompt, callback when triggered.
  ipcMain.on('get-prompt', async (event, prompt) => {

    if (!openAIConfiguration.apiKey || !openAIConfiguration.organization) {
      console.error("Configuration error: API or Org");
      event.sender.send('update-div', 'Improperly configured API key or ORG ID');
      return;
    }

    // when a message is received from the renderer process
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

  ipcMain.on('window-resize', (event, arg) => {
    const h1 = mainWindow.getSize()[1];
    mainWindow.setSize(arg[0], arg[1]);
    //console.log(arg[1])

    if ( arg[1] > 300 || Math.abs(h1-arg[1]) > 100 ) {
      mainWindow.center();
    }
  });

  ipcMain.on('reset-convo', (event, arg) => {
    console.log("Cleaning up conversation")
    dynamicConvo = defaultConvo.slice();
  })

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
  }
}

// Register a hotkey that can trigger a function when pressed
function registerHotkey() {
  // Use Ctrl+Space as an example
  const toggleWindowKey = store.get("toggleWindowKey");
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
    }
  }
}