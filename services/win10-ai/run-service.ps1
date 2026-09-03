$ErrorActionPreference = "Stop"
$serviceRoot = "C:\ProgramData\SkauTreg\DocumentAI"
$ollamaExecutable = "C:\Users\kao\AppData\Local\Programs\Ollama\ollama.exe"
$nodeExecutable = "C:\Program Files\nodejs\node.exe"
$env:OLLAMA_MODELS = "C:\Users\kao\.ollama\models"
$env:OLLAMA_NUM_PARALLEL = "1"
$env:OLLAMA_MAX_LOADED_MODELS = "1"
$env:OLLAMA_KEEP_ALIVE = "20m"

try {
    Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri "http://127.0.0.1:11434/api/version" | Out-Null
} catch {
    Start-Process -FilePath $ollamaExecutable -ArgumentList "serve" -WindowStyle Hidden
}

$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    try {
        Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri "http://127.0.0.1:11434/api/version" | Out-Null
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $ready) { throw "Ollama did not become ready." }

$env:WIN10_AI_TOKEN = (Get-Content -Raw -LiteralPath "$serviceRoot\secret.txt").Trim()
$env:PORT = "8791"
$env:HOST = "127.0.0.1"
$env:OLLAMA_URL = "http://127.0.0.1:11434"
$env:OLLAMA_MODEL = "qwen2.5:1.5b"
$env:AI_CONCURRENCY = "1"

& $nodeExecutable "$serviceRoot\server.mjs" *>> "$serviceRoot\gateway.log"
