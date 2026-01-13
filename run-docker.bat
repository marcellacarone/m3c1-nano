@echo off
REM This script builds and runs the Docker container for the M3C1-Nano application.
REM The container will start the Next.js app and expose it via ngrok.

REM Load environment variables from .env.local file
if exist .env.local (
    for /f "usebackq tokens=1,* delims==" %%a in (".env.local") do (
        if "%%a"=="NGROK_AUTHTOKEN" set NGROK_AUTHTOKEN=%%b
        if "%%a"=="PUBLIC_NGROK_APP_URL" set PUBLIC_NGROK_APP_URL=%%b
        if "%%a"=="GEMINI_API_KEY" set GEMINI_API_KEY=%%b
    )
)

if not defined NGROK_AUTHTOKEN (
    echo NGROK_AUTHTOKEN is not set in .env.local file.
    set /p NGROK_AUTHTOKEN="Please enter your ngrok authtoken: "
)

if "%NGROK_AUTHTOKEN%"=="YOUR_AUTHTOKEN_HERE" (
    echo Please replace YOUR_AUTHTOKEN_HERE in .env.local with your actual ngrok authtoken.
    set /p NGROK_AUTHTOKEN="Please enter your ngrok authtoken: "
)

if not defined GEMINI_API_KEY (
    echo GEMINI_API_KEY is not set in .env.local file.
    set /p GEMINI_API_KEY="Please enter your Gemini API key: "
)

if "%GEMINI_API_KEY%"=="your_gemini_api_key_here" (
    echo Please replace your_gemini_api_key_here in .env.local with your actual Gemini API key.
    set /p GEMINI_API_KEY="Please enter your Gemini API key: "
)


REM Set the name of the Docker image and container.
set IMAGE_NAME=m3c1-nano
set CONTAINER_NAME=m3c1-nano-container

echo "Building the Docker image..."
docker build --no-cache -t %IMAGE_NAME% .

echo "Stopping and removing any existing container..."
docker stop %CONTAINER_NAME% >nul 2>&1
docker rm %CONTAINER_NAME% >nul 2>&1

echo "Running the Docker container..."
docker run -d -p 3000:3000 --name %CONTAINER_NAME% -e NGROK_AUTHTOKEN=%NGROK_AUTHTOKEN% -e PUBLIC_NGROK_APP_URL=%PUBLIC_NGROK_APP_URL% -e GEMINI_API_KEY=%GEMINI_API_KEY% %IMAGE_NAME%

echo "The application is running inside the container."
echo "Check the container logs for the public ngrok URL."
echo "You can check the container logs for more details:"
echo "docker logs -f %CONTAINER_NAME%