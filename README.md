# AutoTomb
![autotomb Unity screencap](https://github.com/Cook4986/AutoTomb/blob/main/autotombScreencap.png)
Takes [Digital Giza tomb pages](http://giza.fas.harvard.edu/sites/532/full/) and returns a set of AI generated 3D models corresponding to contemporaneous (i.e., ancient Egyptian) object references mentioned in early 20th century excavation diaries. The notebook also returns a log of all prompts, local outputs, and X,Y,Z coordinates for placing the models in 3D space, including in downstream XR environments. Finally, there's a separate, C# script (ArtifactCloudGenerator.cs) that generates rotating "object clouds" of all tomb models in Unity at runtime. AutoTomb is a targeted fork/refactor of [Longhand](https://github.com/Cook4986/Longhand), which affords humanities researchers the opportuinty to physically navigate text.
## Use
Install dependencies:
  - [selenium](https://www.selenium.dev/documentation/webdriver/getting_started/)
  - [openai](https://platform.openai.com/docs/api-reference/introduction)
  - [umap](https://umap-learn.readthedocs.io/en/latest/)

_Note: There's other common packages in use, which you can see in config codeblock_

In the jupyter notebook, set global variables for OpenAI API and Meshy API keys, local working directory ("BASE_DIR"), and target Digital Giza Tomb ("MAIN_TOMB_URL"). Run notebook. Note: Although these scripts are meant to be run in sequence without interruption, each code block should be modular enough to start again at each step (assuming globals are set). The final codeblock handles embeddings (via OpenAI), dimension reduction (UMAP), and "type specimen" attribution, which seeks to collapse commonly excavated objects (e.g., potsherds) into a single, representative 3D model while scaling that model proportionally based on term frequency. 

## Throughput
![autotomb throughput diagram](https://github.com/Cook4986/AutoTomb/blob/main/autotombPipeline.jpg)
## Limitations
  - AutoTomb was built to leverage [the HUIT API portal](https://portal.apis.huit.harvard.edu/), so you may need to rewrite portions of the notebook to make direct use of OpenAI endpoints. 
  - [The text-to-3D step](https://docs.meshy.ai/en/api/image-to-3d) is a bottlneck, requiring 300-500 seconds per model (and associated textures) on average, which means realtime visualization isn't possible. 
  - Although you can threshold the poly count with the Meshy API, complete model sets associated with a single tomb can weigh many gigabytes, which will challenge real-time rendering.
## Samples
Here's my outputs for [Tomb 5110](http://giza.fas.harvard.edu/sites/532/full/) ("Western Cemetary"), where excavations began in 1914:

- [Images](https://www.dropbox.com/scl/fo/ed31e0rmdho2n9uamgyi4/AHapCvnLZS9DbbDgF48Q3Yw?rlkey=fsubyf67z0z4uvhq5vg3bwab7&dl=0) (dall-e-3)
- [Models](https://www.dropbox.com/scl/fo/knlh2zzy6ycreje9vcmod/ALbuRnSmyhCfV8LEasw4vmI?rlkey=tzdlxf0w91j7pjsjchtift6r1&dl=0) (meshy 3)
- [JSON](https://www.dropbox.com/scl/fi/91s82i63wm3ab6x9254n9/artifacts.json?rlkey=gdsp0jh62mc7vs403i464j8ec&dl=0) (prompts, paths, coordinates)

Here's a GIF demonstrating these outputs together, in motion,  viewed in Unity
![autotomb Unity GIF](https://github.com/Cook4986/AutoTomb/blob/main/autotombGif.gif)
## Next Steps
- "Finds" ([excavation stills]((http://giza.fas.harvard.edu/sites/532/full/#objects))) fork, to compare image- and text-to-3D outputs
- Model set optimization (See: "Limitations", above)
- XR deployment + user testing
- Interactivity
  - Toggle-able model labels for comprehension
  - Model "timelines" (based on excavation date)

#### Cook 2025 [mncook.net](https://www.mncook.net/)
