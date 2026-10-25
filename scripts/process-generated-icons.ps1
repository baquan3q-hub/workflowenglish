Add-Type -AssemblyName System.Drawing

function Convert-WhiteToTransparent {
    param([string]$inPath, [string]$outPath, [int]$threshold = 245)
    $src = [System.Drawing.Bitmap]::FromFile($inPath)
    $w = $src.Width
    $h = $src.Height
    $out = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $c = $src.GetPixel($x, $y)
            $minVal = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
            $maxVal = [Math]::Max($c.R, [Math]::Max($c.G, $c.B))
            $saturation = $maxVal - $minVal

            # If pixel is very close to pure white with almost no saturation
            if ($minVal -ge $threshold -and $saturation -lt 15) {
                # Smooth alpha falloff from threshold to 255
                $factor = (255.0 - $minVal) / (255.0 - $threshold)
                $alpha = [int]([Math]::Round($factor * 255.0))
                $alpha = [Math]::Max(0, [Math]::Min(255, $alpha))
                $newColor = [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B)
                $out.SetPixel($x, $y, $newColor)
            } else {
                $out.SetPixel($x, $y, $c)
            }
        }
    }

    $out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    $src.Dispose()
    Write-Host "Saved transparent PNG: $outPath ($w x $h)"
}

$writingSrc = "C:\Users\Baquan\.gemini\antigravity-ide\brain\cdd47a47-4895-4dbd-a632-d4aa6269b0b2\ielts_writing_3d_1792942054357.jpg"
$bandSrc = "C:\Users\Baquan\.gemini\antigravity-ide\brain\cdd47a47-4895-4dbd-a632-d4aa6269b0b2\ielts_band_3d_1792942071475.jpg"

Convert-WhiteToTransparent -inPath $writingSrc -outPath "public\ielts-3d-writing-key.png" -threshold 242
Convert-WhiteToTransparent -inPath $bandSrc -outPath "public\ielts-3d-band-badge.png" -threshold 245
