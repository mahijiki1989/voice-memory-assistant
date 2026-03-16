# Voice Memory Assistant PWA

This is a Progressive Web App (PWA) with a "Hold to Talk" voice memory assistant. It features native browser speech recognition, local AI vector embeddings, and RAG-based conversations.

## Architecture
- **Frontend**: HTML5, Vanilla JS, Tailwind CSS
- **Backend**: Node.js, Express
- **AI**: Google Gemini API (`text-embedding-004` and `gemini-2.5-flash`)
- **Memory**: Local JSON Vector Store (`memories.json`) using Cosine Similarity

## Prerequisites
1. You must have [Node.js](https://nodejs.org/) installed on your computer.
2. Get a **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).

## Setup Instructions

1. **Install Dependencies**
   Open your terminal in this directory and run:
   ```bash
   npm install
   ```

2. **Configure Environment**
   Open the `.env` file located in this directory and replace `your_gemini_api_key_here` with your actual Google Gemini API key:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```

3. **Run the Server**
   Start the Node.js server:
   ```bash
   npm start
   ```

4. **Accessing the App Locally**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Testing on a Mobile Phone (PWA)
To test the "Hold to Talk" feature and PWA on your mobile phone, the device needs to be on the same WiFi network and accessed via a secure context (`HTTPS`) for the microphone to work, OR `localhost` (which isn't available easily from the phone). 

The easiest way is using [Ngrok](https://ngrok.com/):
1. Install Ngrok and run:
   ```bash
   ngrok http 3000
   ```
2. Ngrok will give you an `https://...` URL.
3. Open that secure URL on your mobile browser (Safari/Chrome).
4. Tap "Add to Home Screen" to install it as a native PWA app.
5. Tap the Microphone to start storing memories and chatting!

## Important Notes on Web Speech API
- Ensure you have granted Microphone permissions.
- On iOS, `webkitSpeechRecognition` may be restricted inside standalone WKWebViews (PWAs) depending on the iOS version. If so, use it from Safari directly.
