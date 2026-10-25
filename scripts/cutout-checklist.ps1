Add-Type -AssemblyName System.Drawing

$file = Get-Item "Bi*checklist*.png"
$bmp = [System.Drawing.Bitmap]::FromFile($file.FullName)
$w = $bmp.Width
$h = $bmp.Height

$minX = $w; $maxX = 0; $minY = $h; $maxY = 0
$hits = 0

for ($y = 0; $y -lt $h; $y += 3) {
    for ($x = 0; $x -lt $w; $x += 3) {
        $c = $bmp.GetPixel($x, $y)
        $diff = [Math]::Max([Math]::Abs($c.R - $c.G), [Math]::Max([Math]::Abs($c.R - $c.B), [Math]::Abs($c.G - $c.B)))
        $bright = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
        # Non-background if saturated or significantly darker than background
        if ($diff -gt 12 -or $bright -lt 225) {
            $hits++
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Foreground bounding box: X=[$minX, $maxX], Y=[$minY, $maxY]"
Write-Host "Foreground width: $($maxX - $minX), height: $($maxY - $minY)"

# Add padding
$pad = 20
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropW = [Math]::Min($w - $cropX, ($maxX - $minX) + ($pad * 2))
$cropH = [Math]::Min($h - $cropY, ($maxY - $minY) + ($pad * 2))

# Crop and convert near-white/light gray background to transparent alpha
$outBmp = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $cropH; $y++) {
    for ($x = 0; $x -lt $cropW; $x++) {
        $c = $bmp.GetPixel($cropX + $x, $cropY + $y)
        $diff = [Math]::Max([Math]::Abs($c.R - $c.G), [Math]::Max([Math]::Abs($c.R - $c.B), [Math]::Abs($c.G - $c.B)))
        $minVal = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))

        # Check if background: low saturation and high brightness
        if ($minVal -ge 232 -and $diff -lt 15) {
            # Smooth falloff
            $factor = (255.0 - $minVal) / (255.0 - 232.0)
            $alpha = [int]([Math]::Round($factor * 255.0))
            $alpha = [Math]::Max(0, [Math]::Min(255, $alpha))
            $outBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B))
        } else {
            $outBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
        }
    }
}

# Now make centered square
$sqSize = [Math]::Max($cropW, $cropH)
$sq = New-Object System.Drawing.Bitmap($sqSize, $sqSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($sq)
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$offX = [int](($sqSize - $cropW) / 2)
$offY = [int](($sqSize - $cropH) / 2)
$g.DrawImage($outBmp, $offX, $offY, $cropW, $cropH)
$g.Dispose()

$sq.Save("public\ielts-3d-checklist.png", [System.Drawing.Imaging.ImageFormat]::Png)
$sq.Save("C:\Users\Baquan\.gemini\antigravity-ide\brain\cdd47a47-4895-4dbd-a632-d4aa6269b0b2\ielts-3d-checklist.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Successfully saved public\ielts-3d-checklist.png ($sqSize x $sqSize)"

$sq.Dispose()
$outBmp.Dispose()
$bmp.Dispose()
