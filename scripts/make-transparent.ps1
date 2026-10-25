Add-Type -AssemblyName System.Drawing

function Remove-NearWhiteBg {
    param([string]$inPath, [string]$outPath, [int]$threshold = 238)
    $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $inPath).Path)
    $out = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $c = $bmp.GetPixel($x, $y)
            # Check if near corner color / background
            $brightness = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
            $diff = [Math]::Max([Math]::Abs($c.R - $c.G), [Math]::Max([Math]::Abs($c.R - $c.B), [Math]::Abs($c.G - $c.B)))

            # If pixel is very close to white/light grayish pastel background
            if ($brightness -gt $threshold -and $diff -lt 25) {
                # Smooth alpha falloff
                $alpha = [int]([Math]::Max(0, (255 - $brightness) * (255 / (255 - $threshold))))
                $alpha = [Math]::Min(255, [Math]::Max(0, $alpha))
                $newColor = [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B)
                $out.SetPixel($x, $y, $newColor)
            } else {
                $out.SetPixel($x, $y, $c)
            }
        }
    }

    $out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    $bmp.Dispose()
    Write-Host "Processed transparent icon: $outPath"
}

Remove-NearWhiteBg -inPath "public\ielts-card-aa-icon.png" -outPath "public\ielts-card-aa-icon-trans.png" -threshold 232
Remove-NearWhiteBg -inPath "public\ielts-card-band-badge.png" -outPath "public\ielts-card-band-badge-trans.png" -threshold 236
