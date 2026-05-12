Add-Type -AssemblyName System.Drawing
$conversions = @(
    @("C:\Users\ncrk\.gemini\antigravity\brain\6552dba8-2aa0-49d8-9f06-f09bf086e225\icon_1776164728377.png", "assets\icon.png"),
    @("C:\Users\ncrk\.gemini\antigravity\brain\6552dba8-2aa0-49d8-9f06-f09bf086e225\splash_1776164749956.png", "assets\splash.png"),
    @("C:\Users\ncrk\.gemini\antigravity\brain\6552dba8-2aa0-49d8-9f06-f09bf086e225\adaptive_icon_1776164770949.png", "assets\adaptive-icon.png")
)

foreach ($conv in $conversions) {
    $src = $conv[0]
    $dest = $conv[1]
    Write-Host "Converting $src to $dest"
    
    if (Test-Path $src) {
        $img = [System.Drawing.Image]::FromFile($src)
        $img.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
        Write-Host "Success: $dest"
    } else {
        Write-Warning "Source not found: $src"
    }
}
