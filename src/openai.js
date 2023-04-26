const { Configuration, OpenAIApi } = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID;
const openAIConfiguration = new Configuration({ organization: OPENAI_ORG_ID, apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(openAIConfiguration);

function checkConfig() {
    return !(!openAIConfiguration.apiKey && !openAIConfiguration.organization);
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
  
    options.messages.push({"role": "assistant", "content": message});
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
            options.messages.push({"role": "assistant", "content": fullMessage});
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

module.exports = {
    checkConfig,
    getAPIResponse,
    getStreamedAPIResponse
};