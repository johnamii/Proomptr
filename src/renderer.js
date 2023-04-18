const docElement = document.documentElement;
const form = document.getElementById('input-container');
const resetConvoButton = document.getElementById('reset-button'); 
const input = document.getElementById('prompt-input');
const submitButton = document.getElementById('submit-button')
const convoContainer = document.getElementById("convo-container");
const dialogueWrapper = document.getElementById("dialogue-wrapper");
const promptTextbox = document.getElementById("prompt-textbox");
const responseTextbox = document.getElementById("response-textbox");
const convoScrollerUp = document.getElementById("convo-scroller-up");
const convoScrollerDown = document.getElementById("convo-scroller-down");
const loadingCircle = document.getElementById("loading-circle");
const optionsButton = document.getElementById("options-button");
const shutdownButton = document.getElementById("shutdown-button")
const promptContainer = document.getElementById("prompt-container");
const optionsMenu = document.getElementById('options-menu');
//is there a better way than to declare a bunch of consts?
resetConvoButton.style.opacity = '0.3';
var toggleConvoKey = 'Alt';

async function initSettings(){
    toggleConvoKey = await window.electronAPI.requestOptions('toggleConvoKey');
    console.log("Toggle convo with " + toggleConvoKey)
}
initSettings();

input.focus();

var convoText = [];
var convoIndex = 0;

var flipper = true;
function flipContainers(){
    console.log("Flipping view");
    flipper = !flipper;

    if (!flipper) {
        //console.log("Viewing Convo. Index = ", convoIndex);
        convoScrollerUp.style.opacity = convoIndex == 0 ? "0.25" : "1";
        convoScrollerDown.style.opacity = (convoIndex == convoText.length - 1) ? "0.25" : "1";
    }

    form.style.display = flipper ? "flex" : "none";
    convoContainer.style.display = flipper ? "none" : "flex";

    flipper && input.focus();
}

var optionsOpen = false;
async function flipOptionsMenu(){
    console.log("Toggling options menu");
    optionsOpen = !optionsOpen;

    if (optionsOpen) {
        const data = await window.electronAPI.requestOptions();
        let textInputs = form.getElementsByClassName('options-text-input');
        let boolInput = form.getElementsByClassName('options-bool-input');
        textInputs[0].value = data.completionOptions.model ?? '';
        textInputs[1].value = data.completionOptions.max_tokens ?? '';
        boolInput[0].checked = data.completionOptions.stream ?? true;
        textInputs[2].value = data.system_messages[0] ?? '';
        textInputs[3].value = data.system_messages[1] ?? '';
        textInputs[4].value = data.system_messages[2] ?? '';
        textInputs[5].value = data.toggleWindowKey ?? '';
        textInputs[6].value = data.toggleConvoKey ?? '';
    }
    
    optionsMenu.style.display = optionsOpen ? 'flex' : 'none';
    promptContainer.style.display = optionsOpen ? 'none' : 'flex';
    shutdownButton.style.display = optionsOpen ? 'flex' : 'none';
}

optionsMenu.addEventListener('submit', (event) => {
    //var formData = new FormData(event.target)
    let elements = event.target.elements;
    
    const newSettings = {
        completionOptions: {
            model: elements.item(0).value,
            max_tokens: Number(elements.item(1).value),
            stream: elements.item(2).checked
        },
        system_messages: [
            elements.item(3).value,
            elements.item(4).value,
            elements.item(5).value
        ],
        toggleWindowKey: elements.item(6).value,
        toggleConvoKey: elements.item(7).value
    }

    initSettings();

    flipOptionsMenu();

    window.electronAPI.setOptions(newSettings);
})

function submitPrompt(){
    let prompt = input.value; // get the value of the input element

    console.log("Submitting current prompt")

    form.style.opacity = 0.5;
    input.disabled = true;
    loadingCircle.style.display = 'block';

    resetConvoButton.style.opacity = '1';
    
    if (convoText.length <= 10) {
        window.electronAPI.send(prompt); // send the value to the main process

        convoText.push({prompt: prompt, response: ''});
        convoIndex = convoText.length - 1;
        promptTextbox.innerHTML = convoText[convoIndex].prompt;
    }   
    else {
        console.log("Conversation too long. Please reset.")
    }
    
    input.value = "";
}

submitButton.addEventListener('click', (event) => submitPrompt);

function handleReception(value){
    console.log("Renderer receieved new message");

    form.style.opacity = 1;
    loadingCircle.style.display = 'none';
    input.disabled = false;

    console.log("Conversation expanded");

    convoText[convoText.length - 1].response = value;
    responseTextbox.innerHTML = convoText[convoText.length - 1].response;
    scrollToEnd();

    flipContainers();
}

function handleStreamedReception(value){
    if (value == "[START]") {
        console.log("Printing streamed response");
        scrollToEnd()
        flipContainers();
        return false;
    }
    else if (value == "[DONE]") {
        console.log("Stream update finished");
        input.disabled = false;
        loadingCircle.style.display = 'none';
        form.style.opacity = 1;
        return true;
    }
    
    convoText[convoIndex].response = convoText[convoIndex].response.concat(value);

    responseTextbox.innerHTML = convoText[convoIndex].response;
}


window.electronAPI.receive((event, value, stream) => {
    stream ? handleStreamedReception(value) : handleReception(value);
    //handleStreamedReception(value);
});

function scrollConvoUp(){
    console.log("Moving back in conversation");
    convoIndex--;
    promptTextbox.innerHTML = convoText[convoIndex].prompt;
    responseTextbox.innerHTML = convoText[convoIndex].response;

    dialogueWrapper.style.animation = 'slide-down 0.33s forwards';
    setTimeout(() => {
        dialogueWrapper.style.animation = 'none';
    }, 330);

    convoScrollerUp.style.opacity = convoIndex === 0 && "0.25";
    convoScrollerDown.style.opacity = "1.0"
}

function scrollConvoDown(toEnd){
    console.log("Moving forward in conversation");
    convoIndex = convoIndex + 1;
    promptTextbox.innerHTML = convoText[convoIndex].prompt;
    responseTextbox.innerHTML = convoText[convoIndex].response;

    dialogueWrapper.style.animation = 'slide-up 0.33s forwards';
    setTimeout(() => {
        dialogueWrapper.style.animation = 'none';
    }, 330);

    convoScrollerDown.style.opacity = convoIndex === convoText.length - 1 && "0.25";
    convoScrollerUp.style.opacity = !toEnd && "1.0";
}

function scrollToEnd(){
    convoIndex = convoText.length - 1;
    promptTextbox.innerHTML = convoText[convoIndex].prompt;
    responseTextbox.innerHTML = convoText[convoIndex].response;
}

resetConvoButton.addEventListener('click', (event) => {
    convoText = [];
    convoIndex = 0;
    promptTextbox.innerHTML = '';
    responseTextbox.innerHTML = '';
    resetConvoButton.style.opacity = 0.3;
    window.electronAPI.resetConvo(true);
})

document.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        submitPrompt();
    }
    if (event.key === toggleConvoKey && convoText.length !== 0) {
        flipContainers();
    }
    if (event.key === "ArrowDown" && !flipper && convoIndex < convoText.length - 1) {
        scrollConvoDown();
    }
    else if (event.key === "ArrowUp" && !flipper && convoIndex > 0) {
        scrollConvoUp();
    }
});

optionsButton.addEventListener('click', () => {
    flipOptionsMenu();
});

shutdownButton.addEventListener('click', () => {
    window.electronAPI.shutdown();
});

dialogueWrapper.addEventListener("mouseover", () => {
    promptTextbox.style.display = "block";
});

dialogueWrapper.addEventListener("mouseout", () => {
    promptTextbox.style.display = "none";
});

const resizeObserver = new ResizeObserver((entries) => {

    window.electronAPI.resize([document.body.clientWidth, document.body.clientHeight]) 
    //console.log("Window height resized to " + document.body.clientHeight);
});

resizeObserver.observe(docElement);
