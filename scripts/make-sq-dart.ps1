Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path "public\ielts-3d-target-dart.png").Path)
$size = [Math]::Max($src.Width, $src.Height)
$sq = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($sq)
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$offsetX = [int](($size - $src.Width) / 2)
$offsetY = [int](($size - $src.Height) / 2)
$g.DrawImage($src, $offsetX, $offsetY, $src.Width, $src.Height)
$g.Dispose()

$sq.Save("public\ielts-3d-target-dart-sq.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Created centered square version: $($size) x $($size)"

# Also copy to artifact directory for visual preview
$artPath = "C:\Users\Baquan\.gemini\antigravity-ide\brain\cdd47a47-4895-4dbd-a632-d4aa6269b0b2\ielts-3d-target-dart.png"
$sq.Save($artPath, [System.Drawing.Imaging.ImageFormat]::Png)

$sq.Dispose()
$src.Dispose()
