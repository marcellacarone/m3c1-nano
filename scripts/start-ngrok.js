const { exec, execSync } = require('child_process');

// Configure ngrok authtoken if available
const authtoken = process.env.NGROK_AUTHTOKEN;
if (authtoken && authtoken !== "your_ngrok_authtoken_here") {
  try {
    console.log("Configuring ngrok authtoken...");
    execSync(`npx ngrok config add-authtoken ${authtoken.trim()}`);
    console.log("ngrok authtoken configured successfully.");
  } catch (error) {
    console.error("Failed to configure ngrok authtoken:", error.message);
  }
}

let ngrokCommand = 'npx ngrok http 3000';
const ngrokAppUrl = process.env.PUBLIC_NGROK_APP_URL;

if (ngrokAppUrl && ngrokAppUrl !== 'your_ngrok_app_url_here') {
    let url = ngrokAppUrl.trim();
    if (url.startsWith('"') && url.endsWith('"')) {
        url = url.slice(1, -1);
    }
    ngrokCommand = `npx ngrok http 3000 --url "${url}"`;
}


console.log(`Executing: ${ngrokCommand}`);
const ngrokProcess = exec(ngrokCommand);

ngrokProcess.stdout.pipe(process.stdout);
ngrokProcess.stderr.pipe(process.stderr);
