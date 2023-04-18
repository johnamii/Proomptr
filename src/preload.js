const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    send: (prompt) => ipcRenderer.send('get-prompt', prompt),
    receive: (callback) => {
        ipcRenderer.on('update-div', callback);
    },
    resetConvo: (params) => ipcRenderer.send('reset-convo', params),
    resize: (params) => ipcRenderer.send('window-resize', params),
    requestOptions: (key) => ipcRenderer.invoke('request-options', key),
    setOptions: (settings) => ipcRenderer.send('set-options', settings),
    shutdown: () => ipcRenderer.send('shutdown')
});

contextBridge.exposeInMainWorld('require', require);