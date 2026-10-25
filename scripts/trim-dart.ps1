Add-Type -AssemblyName System.Drawing

$file = Get-Item "Bi*phi ti*u*.png"
$bmp = [System.Drawing.Bitmap]::FromFile($file.FullName)
$w = $bmp.Width
$h = $bmp.Height

$minX = $w; $maxX = 0; $minY = $h; $maxY = 0;
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
Write-Host "Hits: $hits"

# Add padding
$pad = 10
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropW = [Math]::Min($w - $cropX, ($maxX - $minX) + ($pad * 2))
$cropH = [Math]::Min($h - $cropY, ($maxY - $minY) + ($pad * 2))

$rect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$trimmed = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$trimmed.Save("public\ielts-3d-target-dart.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved public\ielts-3d-target-dart.png ($cropW x $cropH)"

$trimmed.Dispose()
$bmp.Dispose()
