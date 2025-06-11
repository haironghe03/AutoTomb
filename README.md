# AutoTomb
![autotomb Unity screencap](https://github.com/Cook4986/AutoTomb/blob/main/autotombScreencap.png)
Takes [Digital Giza tomb pages](http://giza.fas.harvard.edu/sites/532/full/) and returns a set of AI (Meshy) generated 3D models corresponding to contemporaneous (i.e., ancient Egyptian) object references mentioned in early 20th century excavation diaries. The notebook also returns a log of all prompts, local outputs, and X,Y,Z coordinates for placing the model set in 3D space, including in downstream XR environments. Finally, there's a separate, C# script (ArtifactCloudGenerator.cs) that generates rotating "object clouds" of all tomb models at Unity at runtime. AutoTomb is a targeted fork/refactor of [Longhand](https://github.com/Cook4986/Longhand), which was designed to help humanities researchers navigate and comprehend opaque text corpora by exposing them to the benefits of immersive visualization like depth cues and embodiment. 
## Setup
### Dependencies
  - [selenium](https://www.selenium.dev/documentation/webdriver/getting_started/)
  - [openai](https://platform.openai.com/docs/api-reference/introduction)
  - [umap](https://umap-learn.readthedocs.io/en/latest/)

_Note: There's other common packages in use, which you can see in config codeblock_
### Use
In the jupyter notebook, set global variables for Open API and Meshy API keys, local working directory ("BASE_DIR"), and target Digital Giza Tomb ("MAIN_TOMB_URL"). Run notebook. Note: Although these scripts are meant to be run in sequence without interruption,  each code block should be modular enough to pick up the pipeline at each step (assuming globals are declared). The final codeblock handles embeddings (via OpenAI), dimension reduction (UMAP), and "type specimen" attribution, which seeks to collapse commonly excavated objects (e.g., potsherds) into single, representative 3D models while scaling that model proportionally based on the frequency of appearance. 

## Throughput
![autotomb throughput diagram](https://github.com/Cook4986/AutoTomb/blob/main/autotombPipeline.jpg)
## Limitations
  ⁃	HUIT API endpoint
	⁃	Runtime
	⁃	Model size (See: “Optimization”, below)
## Samples
Here's my outputs for [Tomb 5110](http://giza.fas.harvard.edu/sites/532/full/) ("Western Cemetary"), where initial excavations took place in 1914 on the Giza Plateu:
  -
  -
  -
  Below is a GIF demonstrating how these outputs look, together (and in motion), when viewed in Unity
![autotomb Unity GIF](https://github.com/Cook4986/AutoTomb/blob/main/autotombGif.gif)
## Next Steps

### Cook 2025 [mncook.net](mncook.net)
