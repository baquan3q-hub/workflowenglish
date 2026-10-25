Add-Type -AssemblyName System.Drawing

$file = Get-Item "B*ng ki*m b*ng b*y*.png"
$bmp = [System.Drawing.Bitmap]::FromFile($file.FullName)
$w = $bmp.Width
$h = $bmp.Height

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
Write-Host "Foreground width: $($maxX - $minX), height: $($maxY - $minY)"

# Add padding
$pad = 12
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropW = [Math]::Min($w - $cropX, ($maxX - $minX) + ($pad * 2))
$cropH = [Math]::Min($h - $cropY, ($maxY - $minY) + ($pad * 2))

$rect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$cropped = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Make centered square
$sqSize = [Math]::Max($cropW, $cropH)
$sq = New-Object System.Drawing.Bitmap($sqSize, $sqSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($sq)
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$offX = [int](($sqSize - $cropW) / 2)
$offY = [int](($sqSize - $cropH) / 2)
$g.DrawImage($cropped, $offX, $offY, $cropW, $cropH)
$g.Dispose()

# Save as public/ielts-3d-checklist-pen.png AND overwrite public/ielts-3d-checklist.png
$out1 = "public\ielts-3d-checklist-pen.png"
$out2 = "public\ielts-3d-checklist.png"
$sq.Save($out1, [System.Drawing.Imaging.ImageFormat]::Png)
$sq.Save($out2, [System.Drawing.Imaging.ImageFormat]::Png)

# Also save to artifact directory for embedding in walkthrough
$artPath = "C:\Users\Baquan\.gemini\antigravity-ide\brain\cdd47a47-4895-4dbd-a632-d4aa6269b0b2\ielts-3d-checklist-pen.png"
$sq.Save($artPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Successfully saved $out1 and $out2 ($sqSize x $sqSize)"

$sq.Dispose()
$cropped.Dispose()
$bmp.Dispose()
