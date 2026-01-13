# M3C1 DIFFUSION - IMAGE GENERATOR

![alt text](M3C1_app.jpg)

Powered by the Nano Banana API + Next.js - UPDATED TO RUN NANO BANANA PRO (gemini-3-pro-image-preview)

This app allows architects and designers to generate consistent AI-based architectural images including alternate views, diagrams and model studies, from one or more reference images.

Built for creative workflows at M3C1


## Features

- Custom AI pipeline using Nano Banana API + Gemini multimodal models

- Image-to-Image consistency for architectural references

- Multiple prompt presets (angles, diagrams, axonometric views, details, etc.)

- Seed control (deterministic outcomes are in test) 

- Automatic ZIP export of all generated outputs

- Next.js frontend for quick experimentation and visual feedback

- Copy paste images for quick imput 

- Delete images from input

- Editting of prompts

- Logging and image generation reporting

- Lightbox for generated image gallery

## Getting Started

This guide will help you get the project up and running on your local machine for development and testing purposes.

### Prerequisites

- **Node.js:** Make sure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/). The recommended version is v22.21.0 or later.
- **Git:** You'll need Git to clone the repository. You can download it from [git-scm.com](https://git-scm.com/downloads).
- **Docker (Optional):** If you want to run the application using Docker, you'll need to have Docker installed. You can download it from [docker.com](https://www.docker.com/products/docker-desktop).

### Configuration

Before you can run the application, you need to set up your environment variables.

1.  **Create the environment file:**
    In the root of the project, you'll find a file named `.env.local.example`. Make a copy of this file and rename it to `.env.local`.

2.  **Set your API Keys:**
    Open the `.env.local` file and you will see the following variables:

    ```
    GEMINI_API_KEY="your_gemini_api_key_here"
    NGROK_AUTHTOKEN="your_ngrok_authtoken_here"
    PUBLIC_NGROK_APP_URL="your_ngrok_app_url_here"
    ```

    -   `GEMINI_API_KEY`: Your Gemini API key. You can get this from [Google AI Studio](https://aistudio.google.com/api-keys). You must have a paid Gemini API key associated with a Google Cloud project with billing set up.
    -   `NGROK_AUTHTOKEN`: Your ngrok authtoken. You can get this from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken). This is required to expose the application to the internet.
    -   `PUBLIC_NGROK_APP_URL`: The public URL for your ngrok app. This will be provided when ngrok starts.

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/marcellacarone/m3c1-nano.git
    cd m3c1-nano
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the application:**
    You can either use the npm script or the provided batch file:
    ```bash
    npm run dev
    ```
    or
    ```bash
    run-local.bat
    ```
    This will start the Next.js development server and ngrok concurrently. The application will be available at `http://localhost:3000`.

### Docker Deployment

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone https://github.com/marcellacarone/m3c1-nano.git
    cd m3c1-nano
    ```

2.  **Run the Docker script:**
    ```bash
    run-docker.bat
    ```
    This script will:
    - Build the Docker image for the application.
    - Stop and remove any existing container with the same name.
    - Run a new container in detached mode.

3.  **Find the public URL:**
    The application running inside the Docker container will be exposed to the internet via ngrok. To find the public URL, you need to check the container's logs:
    ```bash
    docker logs -f m3c1-nano-container
    ```
    Look for a line that contains the ngrok URL.

## Authors

Marcella Carone | @marcellacarone

@m3c1.com.br | São Paulo, Brazil

Ionuț Anton | @ionut_anton

 | Bucharest, Romania