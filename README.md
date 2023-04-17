# Proomptr
Your favorite new tool to send proompts to your AI overlords.

This is a lightweight electron application that allows you to have conversation with OpenAI's GPT models without breaking your workflow. On a keypress, a window will appear, ready for your input and will give a rapid response -- all in a minimalistic and user-friendly way.

### Screenshots
<table>   
  <tr>     
    <td><img src="screenshots/prompt.png?raw=true" alt="Prompt" title="Prompt"></td>      
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
* Once you have multiple responses, press `ArrowUp` and `ArrowDown` to navigate your conversation history.
* Hover over the response to see its correlating prompt.
* Press the cleanup button on the prompt view to reset your conversation. For now, you cannot exceed 10 responses.

## Customization

 * More coming soon, including a UI-based options menu.
 * For now you may find a `config.json` file in the user preferences directory (%appdata%/proomptr)
  * There you may change the values:
    * Max tokens, to limit the response length and quality
