const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    send: (prompt) => ipcRenderer.send('get-prompt', prompt),
    receive: (callback) => {
        ipcRenderer.on('update-div', callback);
    },
    resetConvo: (params) => ipcRenderer.send('reset-convo', params),
    resize: (params) => ipcRenderer.send('window-resize', params)
});