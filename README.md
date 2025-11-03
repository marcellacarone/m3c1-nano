# M3C1 DIFFUSION - IMAGE GENERATOR

Powered by the Nano Banana API + Next.js

This app allows architects and designers to generate consistent AI-based architectural images including alternate views, diagrams, and model studies, from one or more reference images.

Built for creative and technical workflows at M3C1


**Features**

-Custom AI pipeline using Nano Banana API and Gemini

-Image-to-Image consistency for architectural references

-Multiple prompt presets (angles, diagrams, axonometric views, details, etc.)

-Seed control

-Automatic ZIP export of all generated outputs

-Next.js frontend for quick experimentation and visual feedback


**How It Works**

Upload one or more reference images of your project.

Choose from a set of predefined prompts (35mm, 50mm, axo, napkin sketch, diagram, etc.).

Optionally define a global or per-prompt random seed.

Generate images via the Nano Banana API.

Download all results in a single ZIP - filenames include seed + prompt name.


**Set-up**

## Install Node.js

Before starting the project, make sure **Node.js** is installed on your computer.

Download it from the official website https://nodejs.org/

During installation:
- Keep the default options;
- Check **“Add to PATH”** so you can use Node from the terminal.

After installation, verify it by running:

```bash
node -v
npm -v


## git clone and run

```
git clone https://github.com/marcellacarone/m3c1-nano.git
```

```
cd m3c1-nano
```

```
npm install
```

```
npm run dev
```

Then visit http://localhost:3000


**Configuration**

To configure your app, you should have an GEMINI API KEY and follow the steps:

- create a file .env.local in the root folder
- this file should contain your API KEY :
GEMINI_API_KEY=INSERT-YOUR-KEY-HERE


**Authors**

Marcella Carone | @marcellacarone

@m3c1.com.br | São Paulo, Brazil