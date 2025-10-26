class TombManager {
    constructor() {
        this.config = null;
        this.currentTomb = null;
        this.isLoading = true;
        this.loadConfig();
    }

    async loadConfig() {
        try {
            console.log('🏺 Loading tomb configuration...');
            const response = await fetch('./tomb.json'); // Change this line to match the correct file name
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.config = await response.json();
            this.currentTomb = this.config.current_tomb;
            this.isLoading = false;
            console.log(`✅ Loaded config for ${Object.keys(this.config.tombs).length} tombs`);
            console.log(`📍 Active tomb: ${this.getCurrentTomb().name}`);
        } catch (error) {
            console.error('❌ Failed to load tomb config:', error);
            // Fallback for development
            this.createDefaultConfig();
        }
    }

    createDefaultConfig() {
        console.log('🔧 Creating default configuration...');
        this.config = {
            tombs: {
                "giza-5110": {
                    "name": "5110",
                    "description": "Early 20th century excavation diaries",
                    "artifacts_file": "artifacts.json",
                    "models_folder": "models/",
                    "last_updated": new Date().toISOString(),
                    "artifact_count": 0,
                    "type_specimens": 0
                }
            },
            current_tomb: "giza-5110"
        };
        this.currentTomb = "giza-5110";
        this.isLoading = false;
    }

    getCurrentTomb() {
        return this.config?.tombs[this.currentTomb];
    }

    async switchTomb(tombId) {
        if (!this.config.tombs[tombId]) {
            throw new Error(`Tomb ${tombId} not found`);
        }
        
        this.currentTomb = tombId;
        this.config.current_tomb = tombId;
        
        console.log(`🔄 Switched to tomb: ${this.getCurrentTomb().name}`);
        return this.getCurrentTomb();
    }

    getArtifactsPath() {
        const tomb = this.getCurrentTomb();
        return `./${tomb.artifacts_file}`;
    }

    getModelPath(artifactId) {
        const tomb = this.getCurrentTomb();
        // Use R2 Public Development URL for production
        // const r2BaseUrl = "https://pub-44de54f146df475189f71baeda65df6b.r2.dev";
        const r2BaseUrl = "https://pub-61fda54bf4184ea5aed0865b2db2bd3b.r2.dev"; // Low-Res
        return `${r2BaseUrl}/${artifactId}.glb`;
    }

    getAvailableTombs() {
        if (!this.config) return [];
        return Object.entries(this.config.tombs).map(([id, tomb]) => ({
            id,
            ...tomb
        }));
    }

    isReady() {
        return !this.isLoading && this.config !== null;
    }
}

// Create global tomb manager instance
window.tombManager = new TombManager();