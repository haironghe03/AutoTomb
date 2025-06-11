using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[System.Serializable]
public class VRPosition
{
    public float x;
    public float y;
    public float z;
}

[System.Serializable]
public class Artifact
{
    public string artifact_id;
    public VRPosition vr_position;
    public float vr_scale;
    public bool type_specimen;
}

[System.Serializable]
public class ArtifactCollection
{
    public List<Artifact> artifacts;
}

public class ArtifactCloudGenerator : MonoBehaviour
{
    [Header("Configuration")]
    [Tooltip("JSON file containing artifact data")]
    public TextAsset artifactsJsonFile;

    [Tooltip("Default scale for models with vr_scale of 0")]
    public float defaultScale = 1.0f;

    [Header("Visual Settings")]
    [Tooltip("Material to apply to type specimen models")]
    public Material typeSpecimenMaterial;

    [Header("Spawn Point")]
    [Tooltip("Position of the ArtifactCloud game object")]
    public Vector3 spawnPoint = Vector3.zero;

    [Header("Scale Multiplier")]
    [Tooltip("Scale multiplier for all models")]
    public float scaleMultiplier = 10.0f;

    [Header("Rotation Settings")]
    [Tooltip("Rotation speed of individual models")]
    public float modelRotationSpeed = 10.0f;

    [Tooltip("Rotation speed of the entire ArtifactCloud array")]
    public float cloudRotationSpeed = 10.0f;

    private GameObject cloudContainer;

    void Start()
    {
        if (artifactsJsonFile == null)
        {
            Debug.LogError("No JSON file assigned!");
            return;
        }

        cloudContainer = new GameObject("ArtifactCloud");
        cloudContainer.transform.SetParent(transform);
        cloudContainer.transform.localPosition = spawnPoint;

        StartCoroutine(LoadArtifacts());
        StartCoroutine(RotateCloud());
    }

    IEnumerator LoadArtifacts()
    {
        ArtifactCollection collection = JsonUtility.FromJson<ArtifactCollection>(artifactsJsonFile.text);

        if (collection == null || collection.artifacts == null)
        {
            Debug.LogError("Failed to parse JSON data");
            yield break;
        }

        foreach (var artifact in collection.artifacts)
        {
            if (!artifact.type_specimen)
                continue;

            yield return StartCoroutine(LoadModel(artifact));
        }
    }

    IEnumerator LoadModel(Artifact artifact)
    {
        // Load prefab (GLB imported as prefab) based on artifact_id
        string resourcePath = "Models/" + artifact.artifact_id;
        GameObject prefab = Resources.Load<GameObject>(resourcePath);

        if (prefab == null)
        {
            Debug.LogWarning($"Could not find model prefab: {resourcePath}");
            yield break;
        }

        // Instantiate the model
        GameObject modelInstance = Instantiate(prefab, cloudContainer.transform);
        modelInstance.name = artifact.artifact_id;

        // Set position based on JSON data
        modelInstance.transform.localPosition = new Vector3(
            artifact.vr_position.x,
            artifact.vr_position.y,
            artifact.vr_position.z
        );

        // Scale based on vr_scale and scaleMultiplier
        float scale = (artifact.vr_scale > 0 ? artifact.vr_scale : defaultScale) * scaleMultiplier;
        modelInstance.transform.localScale = Vector3.one * scale;

        // Apply special material if provided
        if (typeSpecimenMaterial != null)
        {
            Renderer[] renderers = modelInstance.GetComponentsInChildren<Renderer>();
            foreach (Renderer renderer in renderers)
            {
                renderer.material = typeSpecimenMaterial;
            }
        }

        // Add simple rotation script (optional)
        SlowRotation rotation = modelInstance.AddComponent<SlowRotation>();
        rotation.rotationSpeed = modelRotationSpeed;

        yield return null;
    }

    IEnumerator RotateCloud()
    {
        while (true)
        {
            cloudContainer.transform.Rotate(Vector3.up, cloudRotationSpeed * Time.deltaTime);
            yield return null;
        }
    }
}

// Optional rotation component
public class SlowRotation : MonoBehaviour
{
    public float rotationSpeed = 10.0f;

    void Update()
    {
        transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime);
    }
}
