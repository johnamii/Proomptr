# Proomptr
Your favorite new tool to send proompts to your AI overlords.

This is a lightweight electron application that allows you to have conversation with OpenAI's GPT models without breaking your workflow. On a keypress, a window will appear over whatever app you're useing, ready for your input and will give a rapid response -- all in a minimalistic and user-friendly way.

At the moment, it's not greatly formatted for large code outputs, at least without a little tweaking of the system messages. Planning to implement that eventually.

### Screenshots
<table>   
  <tr>     
    <td><img src="screenshots/prompt.png?raw=true" alt="Prompt" title="Prompt"></td>      
    <td><img src="screenshots/options.png?raw=true" alt="Options" title="Options"></td>  
  </tr>
  <tr>
    <td><img src="screenshots/response.png?raw=true" alt="Response" title="Response"></td>
    <td><img src="screenshots/prompt+response.png?raw=true" alt="Prompt Response" title="Prompt Response"></td>  
  </tr>
</table>

## Setup

* Define your OpenAI API Key and Organization ID as a local variables on your machine.
  * You must have an OpenAI account, set `OPENAI_API_KEY` and `OPENAI_ORG_ID` to their corresponding values.
  * The API will not work with out this step. You must also have a payment method in order on your account (it's very cheap for personal use).
* Clone this repository, open the project folder in the command line.
* Install dependencies with `npm install`
* (Optionally) Edit the code, test it with `npm start`
* Build the executeable with `npx electron-packager . Proomptr --icon=assets/Freepik-pin-icon.ico --overwrite`
  * Might need to change the platform and arch flags, depending on your system.
  * https://github.com/electron/electron-packager for more details.
* A new folder containing the executable will appear in your project directory.

## Usage

* Press `Control+Space` to toggle the Proomptr window.
  * It will be available in the background even when hidden.
* In window, press `Alt` to change between the prompt and response views.
* Once you have multiple responses, press `ArrowUp` and `ArrowDown` for two uses:
  * On the prompt view, it will show the previous (up to) 3 responses in order for easy repetition/editing of prompts.
  * On the conversation view, it will scroll through current / past messages in the conversation.
* Hover over the response to see its correlating prompt.
* Press the cleanup button on the prompt view to reset your conversation. For now, you cannot exceed 10 responses.

## Customization

 * There is now a built-in options menu that lets you customize the following:
  * `model`: the name of whatever chat model you have access to. 
    * Default is 'gpt-3.5-turbo'. View more at https://platform.openai.com/docs/models/overview
  * `max_tokens`: the maximum number of tokens you want to allow each response. This will affect charge amounts to your OpenAI account.
    * Default is 500, kind of an arbitrary number
  * `stream`: this toggles streamed responses. If off, it will pause and return the whole response. On, it will show the response as it's being produced.
    * Default is true
  * `system_messages(1-3)`: these are messages passed to the chat system that will tailor the way the model responds to your prompts.
    * Defaults are: "You are a friendly assistant.", "Format your messages in HTML, using only </br/> or </p/>"
    * It's recommended to keep one telling it to format for html. More formatting updates coming soon.
  * `toggleWindowKey`: the keybind that will make your window appear/disappear over other apps. Format it to these guidelines of keyboardEvent.key (js)
    * Default is "Control+Space"
  * `toggleConvoKey`: the keybind that switches between the view for your prompts vs. responses.
    * Default is "Alt"
    
 **Alternatively, you may view/edit these values in the `config.json` file in the user preferences directory (%appdata%/proomptr)**
  
