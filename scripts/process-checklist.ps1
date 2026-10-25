Add-Type -AssemblyName System.Drawing

$file = Get-Item "Bi*checklist*.png"
Write-Host "Found file: $($file.FullName)"
$bmp = [System.Drawing.Bitmap]::FromFile($file.FullName)
$w = $bmp.Width
$h = $bmp.Height
Write-Host "Size: $w x $h"
Write-Host "PixelFormat: $($bmp.PixelFormat)"

# Find non-transparent bounds
$minX = $w; $maxX = 0; $minY = $h; $maxY = 0
$hits = 0

for ($y = 0; $y -lt $h; $y += 3) {
    for ($x = 0; $x -lt $w; $x += 3) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.A -gt 15) {
            $hits++
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Non-transparent bounds: X=[$minX, $maxX], Y=[$minY, $maxY]"

# Crop with padding
$pad = 12
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropW = [Math]::Min($w - $cropX, ($maxX - $minX) + ($pad * 2))
$cropH = [Math]::Min($h - $cropY, ($maxY - $minY) + ($pad * 2))

$rect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$cropped = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Make centered square
$sqSize = [Math]::Max($cropped.Width, $cropped.Height)
$sq = New-Object System.Drawing.Bitmap($sqSize, $sqSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($sq)
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$offX = [int](($sqSize - $cropped.Width) / 2)
$offY = [int](($sqSize - $cropped.Height) / 2)
$g.DrawImage($cropped, $offX, $offY, $cropped.Width, $cropped.Height)
$g.Dispose()

$outPath = "public\ielts-3d-checklist.png"
$sq.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved square asset: $outPath ($sqSize x $sqSize)"

# Also copy to artifacts dir
$artPath = "C:\Users\Baquan\.gemini\antigravity-ide\brain\cdd47a47-4895-4dbd-a632-d4aa6269b0b2\ielts-3d-checklist.png"
$sq.Save($artPath, [System.Drawing.Imaging.ImageFormat]::Png)

$sq.Dispose()
$cropped.Dispose()
$bmp.Dispose()
