# AutoTomb
![autotomb Unity screencap](https://github.com/Cook4986/AutoTomb/blob/main/autotombScreencap.png)
Takes [Digital Giza tomb pages](http://giza.fas.harvard.edu/sites/532/full/) and returns a set of AI (Meshy) generated 3D models corresponding to contemporaneous (i.e., ancient Egyptian) object references mentioned in early 20th century excavation diaries. The notebook also returns a log of all prompts, local outputs, and X,Y,Z coordinates for placing the models in 3D space, including in downstream XR environments. Finally, there's a separate, C# script (ArtifactCloudGenerator.cs) that generates rotating "object clouds" of all tomb models in Unity at runtime. AutoTomb is a targeted fork/refactor of [Longhand](https://github.com/Cook4986/Longhand), which affords humanities researchers the opportuinty to physically navigate opaque text corpora.
## Use
Install dependencies:
  - [selenium](https://www.selenium.dev/documentation/webdriver/getting_started/)
  - [openai](https://platform.openai.com/docs/api-reference/introduction)
  - [umap](https://umap-learn.readthedocs.io/en/latest/)

_Note: There's other common packages in use, which you can see in config codeblock_

In the jupyter notebook, set global variables for Open API and Meshy API keys, local working directory ("BASE_DIR"), and target Digital Giza Tomb ("MAIN_TOMB_URL"). Run notebook. Note: Although these scripts are meant to be run in sequence without interruption, each code block should be modular enough to start at each step (assuming globals are declared). The final codeblock handles embeddings (via OpenAI), dimension reduction (UMAP), and "type specimen" attribution, which seeks to collapse commonly excavated objects (e.g., potsherds) into a single, representative 3D model while scaling that model proportionally based on frequency. 

## Throughput
![autotomb throughput diagram](https://github.com/Cook4986/AutoTomb/blob/main/autotombPipeline.jpg)
## Limitations
  - HUIT API endpoint
  - Runtime
  - Model size (See: “Optimization”, below)
## Samples
Here's my outputs for [Tomb 5110]() ("Western Cemetary"), where excavations began in 1914:

- [Images](https://www.dropbox.com/scl/fo/ed31e0rmdho2n9uamgyi4/AHapCvnLZS9DbbDgF48Q3Yw?rlkey=fsubyf67z0z4uvhq5vg3bwab7&dl=0) (dall-e-3)
- [Models](https://www.dropbox.com/scl/fo/knlh2zzy6ycreje9vcmod/ALbuRnSmyhCfV8LEasw4vmI?rlkey=tzdlxf0w91j7pjsjchtift6r1&dl=0) (meshy 3)
- [JSON](https://www.dropbox.com/scl/fi/91s82i63wm3ab6x9254n9/artifacts.json?rlkey=gdsp0jh62mc7vs403i464j8ec&dl=0) (prompts, paths, coordinates)

Below is a GIF demonstrating how these outputs look, together (and in motion), when viewed in Unity
![autotomb Unity GIF](https://github.com/Cook4986/AutoTomb/blob/main/autotombGif.gif)
## Next Steps
- "Finds" (excavation stills) fork, to compare image- and text-to-3D outputs
- Model set optimization
- XR deployment + user testing
- Interactivity
  - Toggle-able model labels
  - Model "timelines" (based on excavation date)

### Cook 2025 [mncook.net](mncook.net)
